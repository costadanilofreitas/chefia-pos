"""
Queue Management Service
Serviço principal para gerenciamento de filas de mesas
"""

import asyncio
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID, uuid4
import statistics

from fastapi import HTTPException, status

from src.queue.models.queue_models import (
    QueueEntry, QueueEntryCreate, QueueEntryUpdate,
    QueueStatus, PartySize, NotificationMethod,
    QueueNotification, NotificationStatus,
    WaitTimeEstimate, QueueStatistics, 
    TableSuggestion, QueuePosition
)
from src.queue.services.notification_service import NotificationService
from src.core.optimistic_lock import optimistic_lock_manager
from src.realtime.websocket_sync import notify_data_change
from src.audit.audit_logger import audit_logger, AuditAction

logger = logging.getLogger(__name__)


class QueueService:
    """Serviço de gerenciamento de filas de mesas"""
    
    def __init__(self):
        # In-memory storage (substituir por DB em produção)
        self.queue_entries: Dict[str, QueueEntry] = {}
        self.queue_order: List[str] = []  # Ordem da fila
        self.analytics_data: List[Dict] = []
        
        # Services
        self.notification_service = NotificationService()
        
        # Configuration
        self.no_show_timeout_minutes = 15
        self.notification_advance_minutes = 5
        self.average_dining_time_minutes = 60
        
    async def add_to_queue(
        self, 
        entry_data: QueueEntryCreate,
        store_id: str,
        user_id: str,
        terminal_id: str
    ) -> QueueEntry:
        """Adiciona cliente à fila de espera"""
        try:
            # Verificar duplicatas (mesmo telefone esperando)
            for entry_id in self.queue_order:
                entry = self.queue_entries.get(entry_id)
                if entry and entry.customer_phone == entry_data.customer_phone:
                    if entry.status == QueueStatus.WAITING:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail="Customer already in queue"
                        )
            
            # Criar entrada
            entry_id = str(uuid4())
            position = len(self.queue_order) + 1
            
            # Estimar tempo de espera
            wait_estimate = await self.estimate_wait_time(
                entry_data.party_size,
                store_id
            )
            
            entry = QueueEntry(
                id=UUID(entry_id),
                customer_name=entry_data.customer_name,
                customer_phone=entry_data.customer_phone,
                customer_id=entry_data.customer_id,
                party_size=entry_data.party_size,
                party_size_category=self._get_party_size_category(entry_data.party_size),
                status=QueueStatus.WAITING,
                position_in_queue=position,
                table_preferences=entry_data.table_preferences or [],
                notification_method=entry_data.notification_method,
                notes=entry_data.notes,
                check_in_time=datetime.utcnow(),
                estimated_wait_minutes=wait_estimate.estimated_minutes,
                store_id=store_id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            # Armazenar
            self.queue_entries[entry_id] = entry
            self.queue_order.append(entry_id)
            
            # Notificar outros terminais
            await notify_data_change(
                entity="queue",
                entity_id=entry_id,
                action="create",
                data=entry.dict(),
                user_id=user_id
            )
            
            # Registrar no audit log
            await audit_logger.log(
                action=AuditAction.CREATE,
                entity_type="queue_entry",
                entity_id=entry_id,
                user_id=user_id,
                terminal_id=terminal_id,
                description=f"Added {entry.customer_name} to queue (party of {entry.party_size})",
                new_value=entry.dict()
            )
            
            logger.info(f"Added {entry.customer_name} to queue at position {position}")
            return entry
            
        except Exception as e:
            logger.error(f"Error adding to queue: {e}")
            raise
    
    async def update_queue_entry(
        self,
        entry_id: str,
        update_data: QueueEntryUpdate,
        user_id: str,
        terminal_id: str
    ) -> QueueEntry:
        """Atualiza entrada na fila"""
        entry = self.queue_entries.get(entry_id)
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Queue entry not found"
            )
        
        # Verificar lock otimista
        optimistic_lock_manager.validate_version(
            entity_type="queue",
            entity_id=entry_id,
            client_version=entry.version,
            current_version=entry.version,
            user_id=user_id
        )
        
        # Salvar valores antigos para audit
        old_value = entry.dict()
        
        # Atualizar campos
        update_dict = update_data.dict(exclude_unset=True)
        for field, value in update_dict.items():
            if hasattr(entry, field):
                setattr(entry, field, value)
        
        entry.updated_at = datetime.utcnow()
        entry.version += 1
        
        # Notificar mudanças
        await notify_data_change(
            entity="queue",
            entity_id=entry_id,
            action="update",
            data=entry.dict(),
            user_id=user_id
        )
        
        # Audit log
        await audit_logger.log(
            action=AuditAction.UPDATE,
            entity_type="queue_entry",
            entity_id=entry_id,
            user_id=user_id,
            terminal_id=terminal_id,
            description=f"Updated queue entry for {entry.customer_name}",
            old_value=old_value,
            new_value=entry.dict()
        )
        
        return entry
    
    async def notify_customer(
        self,
        entry_id: str,
        user_id: str,
        terminal_id: str
    ) -> QueueNotification:
        """Notifica cliente que mesa está pronta"""
        entry = self.queue_entries.get(entry_id)
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Queue entry not found"
            )
        
        # Criar mensagem
        message = f"Olá {entry.customer_name}! Sua mesa está pronta. Por favor, dirija-se ao balcão."
        
        # Enviar notificação
        notification = await self.notification_service.send_notification(
            queue_entry_id=entry_id,
            method=entry.notification_method,
            phone=entry.customer_phone,
            message=message
        )
        
        # Atualizar status
        entry.status = QueueStatus.NOTIFIED
        entry.notification_time = datetime.utcnow()
        entry.updated_at = datetime.utcnow()
        
        # Notificar outros terminais
        await notify_data_change(
            entity="queue",
            entity_id=entry_id,
            action="update",
            data=entry.dict(),
            user_id=user_id
        )
        
        # Iniciar timer para no-show
        asyncio.create_task(
            self._check_no_show(entry_id, self.no_show_timeout_minutes)
        )
        
        # Audit log
        await audit_logger.log(
            action=AuditAction.UPDATE,
            entity_type="queue_notification",
            entity_id=entry_id,
            user_id=user_id,
            terminal_id=terminal_id,
            description=f"Notified {entry.customer_name} via {entry.notification_method}",
            metadata={"notification_id": str(notification.id)}
        )
        
        logger.info(f"Notified {entry.customer_name} via {entry.notification_method}")
        return notification
    
    async def seat_customer(
        self,
        entry_id: str,
        table_id: str,
        user_id: str,
        terminal_id: str
    ) -> QueueEntry:
        """Marca cliente como sentado"""
        entry = self.queue_entries.get(entry_id)
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Queue entry not found"
            )
        
        # Atualizar entrada
        entry.status = QueueStatus.SEATED
        entry.seated_time = datetime.utcnow()
        entry.assigned_table_id = UUID(table_id)
        entry.assigned_by = UUID(user_id)
        entry.updated_at = datetime.utcnow()
        
        # Remover da fila
        if entry_id in self.queue_order:
            self.queue_order.remove(entry_id)
            await self._recalculate_positions()
        
        # Registrar analytics
        await self._record_analytics(entry)
        
        # Notificar mudanças
        await notify_data_change(
            entity="queue",
            entity_id=entry_id,
            action="update",
            data=entry.dict(),
            user_id=user_id
        )
        
        # Audit log
        await audit_logger.log(
            action=AuditAction.UPDATE,
            entity_type="queue_entry",
            entity_id=entry_id,
            user_id=user_id,
            terminal_id=terminal_id,
            description=f"Seated {entry.customer_name} at table {table_id}",
            metadata={
                "actual_wait_minutes": entry.actual_wait_minutes,
                "estimated_wait_minutes": entry.estimated_wait_minutes
            }
        )
        
        logger.info(f"Seated {entry.customer_name} at table {table_id}")
        return entry
    
    async def mark_no_show(
        self,
        entry_id: str,
        user_id: str = "system",
        terminal_id: str = "system"
    ) -> QueueEntry:
        """Marca cliente como no-show"""
        entry = self.queue_entries.get(entry_id)
        if not entry:
            return None
        
        # Atualizar status
        entry.status = QueueStatus.NO_SHOW
        entry.updated_at = datetime.utcnow()
        
        # Remover da fila
        if entry_id in self.queue_order:
            self.queue_order.remove(entry_id)
            await self._recalculate_positions()
        
        # Notificar mudanças
        await notify_data_change(
            entity="queue",
            entity_id=entry_id,
            action="update",
            data=entry.dict(),
            user_id=user_id
        )
        
        # Audit log
        await audit_logger.log(
            action=AuditAction.UPDATE,
            entity_type="queue_entry",
            entity_id=entry_id,
            user_id=user_id,
            terminal_id=terminal_id,
            description=f"Marked {entry.customer_name} as no-show",
            metadata={
                "notification_time": entry.notification_time.isoformat() if entry.notification_time else None,
                "timeout_minutes": self.no_show_timeout_minutes
            }
        )
        
        logger.info(f"Marked {entry.customer_name} as no-show")
        return entry
    
    async def cancel_entry(
        self,
        entry_id: str,
        reason: Optional[str],
        user_id: str,
        terminal_id: str
    ) -> QueueEntry:
        """Cancela entrada na fila"""
        entry = self.queue_entries.get(entry_id)
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Queue entry not found"
            )
        
        # Atualizar status
        entry.status = QueueStatus.CANCELLED
        entry.notes = f"{entry.notes}\nCancelled: {reason}" if reason else entry.notes
        entry.updated_at = datetime.utcnow()
        
        # Remover da fila
        if entry_id in self.queue_order:
            self.queue_order.remove(entry_id)
            await self._recalculate_positions()
        
        # Notificar mudanças
        await notify_data_change(
            entity="queue",
            entity_id=entry_id,
            action="update",
            data=entry.dict(),
            user_id=user_id
        )
        
        # Audit log
        await audit_logger.log(
            action=AuditAction.UPDATE,
            entity_type="queue_entry",
            entity_id=entry_id,
            user_id=user_id,
            terminal_id=terminal_id,
            description=f"Cancelled queue entry for {entry.customer_name}",
            metadata={"reason": reason}
        )
        
        return entry
    
    async def get_queue_list(
        self,
        store_id: str,
        status_filter: Optional[QueueStatus] = None
    ) -> List[QueueEntry]:
        """Lista entradas na fila"""
        entries = []
        
        # Filtrar por status se especificado
        for entry_id in self.queue_order:
            entry = self.queue_entries.get(entry_id)
            if entry and entry.store_id == store_id:
                if not status_filter or entry.status == status_filter:
                    entries.append(entry)
        
        return entries
    
    async def get_position(self, entry_id: str) -> QueuePosition:
        """Obtém posição atual na fila"""
        entry = self.queue_entries.get(entry_id)
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Queue entry not found"
            )
        
        # Calcular posição
        position = 0
        for idx, queue_id in enumerate(self.queue_order):
            if queue_id == entry_id:
                position = idx + 1
                break
        
        # Estimar tempo atualizado
        wait_estimate = await self.estimate_wait_time(
            entry.party_size,
            entry.store_id
        )
        
        return QueuePosition(
            position=position,
            total_ahead=position - 1 if position > 0 else 0,
            estimated_wait_minutes=wait_estimate.estimated_minutes,
            status=entry.status,
            last_updated=datetime.utcnow()
        )
    
    async def estimate_wait_time(
        self,
        party_size: int,
        store_id: str
    ) -> WaitTimeEstimate:
        """Estima tempo de espera baseado em histórico"""
        # Análise simplificada (melhorar com ML em produção)
        base_time = 15  # Tempo base por mesa
        
        # Fator do tamanho do grupo
        size_factor = 1.0
        if party_size > 4:
            size_factor = 1.3
        elif party_size > 6:
            size_factor = 1.5
        
        # Pessoas na frente
        queue_size = len(self.queue_order)
        
        # Estimativa
        estimated_minutes = int(base_time * queue_size * size_factor)
        
        # Se temos dados históricos, usar média
        if self.analytics_data:
            recent_waits = [
                d['actual_wait_minutes'] 
                for d in self.analytics_data[-20:]
                if d.get('actual_wait_minutes')
            ]
            if recent_waits:
                avg_wait = statistics.mean(recent_waits)
                estimated_minutes = int((estimated_minutes + avg_wait) / 2)
        
        return WaitTimeEstimate(
            party_size=party_size,
            estimated_minutes=max(5, estimated_minutes),  # Mínimo 5 minutos
            confidence_level=0.7 if self.analytics_data else 0.4,
            factors={
                "queue_size": queue_size,
                "party_size": party_size,
                "size_factor": size_factor,
                "historical_data": len(self.analytics_data) > 0
            }
        )
    
    async def get_statistics(self, store_id: str) -> QueueStatistics:
        """Obtém estatísticas da fila"""
        # Calcular estatísticas
        total_waiting = len([
            e for e in self.queue_entries.values()
            if e.status == QueueStatus.WAITING and e.store_id == store_id
        ])
        
        # Tempos de espera
        wait_times = []
        for entry in self.queue_entries.values():
            if entry.actual_wait_minutes:
                wait_times.append(entry.actual_wait_minutes)
        
        avg_wait = statistics.mean(wait_times) if wait_times else 0
        longest_wait = max(wait_times) if wait_times else None
        
        # Distribuição por tamanho
        parties_by_size = {
            PartySize.SMALL.value: 0,
            PartySize.MEDIUM.value: 0,
            PartySize.LARGE.value: 0,
            PartySize.XLARGE.value: 0
        }
        
        for entry in self.queue_entries.values():
            if entry.status == QueueStatus.WAITING:
                parties_by_size[entry.party_size_category.value] += 1
        
        # Taxa de no-show
        total_notified = len([
            e for e in self.queue_entries.values()
            if e.status in [QueueStatus.NOTIFIED, QueueStatus.SEATED, QueueStatus.NO_SHOW]
        ])
        no_shows = len([
            e for e in self.queue_entries.values()
            if e.status == QueueStatus.NO_SHOW
        ])
        no_show_rate = (no_shows / total_notified) if total_notified > 0 else 0
        
        # Acurácia das previsões
        accuracy = None
        if self.analytics_data:
            errors = []
            for data in self.analytics_data[-50:]:
                if data.get('actual_wait_minutes') and data.get('estimated_wait_minutes'):
                    actual = data['actual_wait_minutes']
                    estimated = data['estimated_wait_minutes']
                    error_pct = abs(actual - estimated) / actual if actual > 0 else 0
                    errors.append(1 - error_pct)
            
            if errors:
                accuracy = statistics.mean(errors) * 100
        
        return QueueStatistics(
            total_in_queue=total_waiting,
            average_wait_time=avg_wait,
            longest_wait=longest_wait,
            parties_by_size=parties_by_size,
            estimated_total_clear_time=int(avg_wait * total_waiting) if avg_wait > 0 else 0,
            no_show_rate=no_show_rate,
            accuracy_last_24h=accuracy
        )
    
    async def suggest_tables(
        self,
        entry_id: str,
        available_tables: List[Dict]
    ) -> List[TableSuggestion]:
        """Sugere melhores mesas para um grupo"""
        entry = self.queue_entries.get(entry_id)
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Queue entry not found"
            )
        
        suggestions = []
        
        for table in available_tables:
            score = 0.0
            reasons = []
            
            # Verificar capacidade
            if table['seats'] >= entry.party_size:
                score += 0.5
                reasons.append("Capacidade adequada")
                
                # Bonus para tamanho exato
                if table['seats'] == entry.party_size:
                    score += 0.3
                    reasons.append("Tamanho perfeito")
            else:
                continue  # Mesa pequena demais
            
            # Verificar preferências
            if entry.table_preferences:
                for pref in entry.table_preferences:
                    if pref in table.get('features', []):
                        score += 0.1
                        reasons.append(f"Preferência atendida: {pref}")
            
            # Criar sugestão
            suggestions.append(TableSuggestion(
                table_id=UUID(table['id']),
                table_number=table['number'],
                score=min(1.0, score),
                reasons=reasons,
                estimated_availability=None,
                requires_combination=False
            ))
        
        # Ordenar por score
        suggestions.sort(key=lambda x: x.score, reverse=True)
        
        return suggestions[:5]  # Top 5 sugestões
    
    # Métodos privados
    
    def _get_party_size_category(self, size: int) -> PartySize:
        """Determina categoria do tamanho do grupo"""
        if size <= 2:
            return PartySize.SMALL
        elif size <= 4:
            return PartySize.MEDIUM
        elif size <= 6:
            return PartySize.LARGE
        else:
            return PartySize.XLARGE
    
    async def _recalculate_positions(self):
        """Recalcula posições na fila"""
        for idx, entry_id in enumerate(self.queue_order):
            entry = self.queue_entries.get(entry_id)
            if entry:
                entry.position_in_queue = idx + 1
                entry.updated_at = datetime.utcnow()
        
        # Notificar mudança de posições
        await notify_data_change(
            entity="queue",
            entity_id="positions",
            action="update",
            data={"queue_order": self.queue_order},
            user_id="system"
        )
    
    async def _check_no_show(self, entry_id: str, timeout_minutes: int):
        """Verifica no-show após timeout"""
        await asyncio.sleep(timeout_minutes * 60)
        
        entry = self.queue_entries.get(entry_id)
        if entry and entry.status == QueueStatus.NOTIFIED:
            await self.mark_no_show(entry_id)
    
    async def _record_analytics(self, entry: QueueEntry):
        """Registra dados para analytics"""
        self.analytics_data.append({
            'queue_entry_id': str(entry.id),
            'actual_wait_minutes': entry.actual_wait_minutes,
            'estimated_wait_minutes': entry.estimated_wait_minutes,
            'party_size': entry.party_size,
            'day_of_week': entry.check_in_time.weekday(),
            'hour_of_day': entry.check_in_time.hour,
            'created_at': datetime.utcnow()
        })
        
        # Manter apenas últimos 1000 registros em memória
        if len(self.analytics_data) > 1000:
            self.analytics_data = self.analytics_data[-1000:]


# Singleton instance
queue_service = QueueService()