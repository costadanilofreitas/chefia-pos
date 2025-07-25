from typing import Dict, List, Optional, Any, Union
from datetime import datetime
import uuid
import logging

from src.core.events.event_bus import get_event_bus, Event, EventType
from src.sat.services.sat_service import get_sat_service


# Definir tipos de eventos SAT
class SATEventType(EventType):
    SAT_EMIT_REQUESTED = "sat.emit_requested"
    SAT_EMIT_COMPLETED = "sat.emit_completed"
    SAT_EMIT_FAILED = "sat.emit_failed"
    SAT_CANCEL_REQUESTED = "sat.cancel_requested"
    SAT_CANCEL_COMPLETED = "sat.cancel_completed"
    SAT_CANCEL_FAILED = "sat.cancel_failed"
    SAT_STATUS_CHANGED = "sat.status_changed"


class SATEventPublisher:
    """Publicador de eventos SAT."""
    
    def __init__(self):
        self.event_bus = get_event_bus()
    
    async def publish_emit_requested(self, order_id: str, terminal_id: str) -> None:
        """Publica evento de solicitação de emissão de CF-e."""
        event = Event(
            id=str(uuid.uuid4()),
            type=SATEventType.SAT_EMIT_REQUESTED,
            timestamp=datetime.now().isoformat(),
            data={
                "order_id": order_id,
                "terminal_id": terminal_id
            }
        )
        await self.event_bus.publish(event)
    
    async def publish_emit_completed(self, order_id: str, terminal_id: str, cfe_id: str) -> None:
        """Publica evento de emissão de CF-e concluída."""
        event = Event(
            id=str(uuid.uuid4()),
            type=SATEventType.SAT_EMIT_COMPLETED,
            timestamp=datetime.now().isoformat(),
            data={
                "order_id": order_id,
                "terminal_id": terminal_id,
                "cfe_id": cfe_id
            }
        )
        await self.event_bus.publish(event)
    
    async def publish_emit_failed(self, order_id: str, terminal_id: str, error: str) -> None:
        """Publica evento de falha na emissão de CF-e."""
        event = Event(
            id=str(uuid.uuid4()),
            type=SATEventType.SAT_EMIT_FAILED,
            timestamp=datetime.now().isoformat(),
            data={
                "order_id": order_id,
                "terminal_id": terminal_id,
                "error": error
            }
        )
        await self.event_bus.publish(event)
    
    async def publish_cancel_requested(self, cfe_id: str, reason: str) -> None:
        """Publica evento de solicitação de cancelamento de CF-e."""
        event = Event(
            id=str(uuid.uuid4()),
            type=SATEventType.SAT_CANCEL_REQUESTED,
            timestamp=datetime.now().isoformat(),
            data={
                "cfe_id": cfe_id,
                "reason": reason
            }
        )
        await self.event_bus.publish(event)
    
    async def publish_cancel_completed(self, cfe_id: str) -> None:
        """Publica evento de cancelamento de CF-e concluído."""
        event = Event(
            id=str(uuid.uuid4()),
            type=SATEventType.SAT_CANCEL_COMPLETED,
            timestamp=datetime.now().isoformat(),
            data={
                "cfe_id": cfe_id
            }
        )
        await self.event_bus.publish(event)
    
    async def publish_cancel_failed(self, cfe_id: str, error: str) -> None:
        """Publica evento de falha no cancelamento de CF-e."""
        event = Event(
            id=str(uuid.uuid4()),
            type=SATEventType.SAT_CANCEL_FAILED,
            timestamp=datetime.now().isoformat(),
            data={
                "cfe_id": cfe_id,
                "error": error
            }
        )
        await self.event_bus.publish(event)
    
    async def publish_status_changed(self, terminal_id: str, status: str) -> None:
        """Publica evento de mudança de status do SAT."""
        event = Event(
            id=str(uuid.uuid4()),
            type=SATEventType.SAT_STATUS_CHANGED,
            timestamp=datetime.now().isoformat(),
            data={
                "terminal_id": terminal_id,
                "status": status
            }
        )
        await self.event_bus.publish(event)


class SATEventHandler:
    """Manipulador de eventos SAT."""
    
    def __init__(self):
        self.event_bus = get_event_bus()
        self.sat_service = get_sat_service()
        self.publisher = SATEventPublisher()
        
        # Registrar handlers
        self._register_handlers()
    
    def _register_handlers(self) -> None:
        """Registra handlers para eventos relevantes."""
        # Ouvir eventos de finalização de pedido para emitir CF-e
        self.event_bus.subscribe("order.finalized", self.handle_order_finalized)
        
        # Ouvir eventos de cancelamento de pedido para cancelar CF-e
        self.event_bus.subscribe("order.canceled", self.handle_order_canceled)
    
    async def handle_order_finalized(self, event: Event) -> None:
        """Manipula evento de finalização de pedido."""
        try:
            data = event.data
            order_id = data.get("order_id")
            terminal_id = data.get("terminal_id")
            
            if not order_id or not terminal_id:
                logging.warning("Evento de finalização de pedido sem order_id ou terminal_id")
                return
            
            # Verificar se o SAT está habilitado para este terminal
            is_enabled = await self.sat_service.is_enabled(terminal_id)
            if not is_enabled:
                logging.info(f"SAT não habilitado para o terminal {terminal_id}, ignorando emissão de CF-e")
                return
            
            # Publicar evento de solicitação de emissão
            await self.publisher.publish_emit_requested(order_id, terminal_id)
            
            # Obter dados do pedido (em uma implementação real, seria do banco de dados)
            # Aqui estamos usando dados simulados para fins de demonstração
            order_data = data.get("order_data", {})
            if not order_data:
                logging.warning(f"Dados do pedido {order_id} não encontrados")
                await self.publisher.publish_emit_failed(order_id, terminal_id, "Dados do pedido não encontrados")
                return
            
            # Emitir CF-e
            response = await self.sat_service.emit_cfe(order_data, terminal_id)
            
            if response.success:
                # Publicar evento de emissão concluída
                await self.publisher.publish_emit_completed(
                    order_id, 
                    terminal_id, 
                    response.cfe.id if response.cfe else ""
                )
            else:
                # Publicar evento de falha na emissão
                await self.publisher.publish_emit_failed(
                    order_id,
                    terminal_id,
                    response.message
                )
        except Exception as e:
            logging.error(f"Erro ao processar evento de finalização de pedido: {str(e)}")
            # Tentar publicar evento de falha, se possível
            try:
                await self.publisher.publish_emit_failed(
                    event.data.get("order_id", "unknown"),
                    event.data.get("terminal_id", "unknown"),
                    str(e)
                )
            except:
                pass
    
    async def handle_order_canceled(self, event: Event) -> None:
        """Manipula evento de cancelamento de pedido."""
        try:
            data = event.data
            order_id = data.get("order_id")
            terminal_id = data.get("terminal_id")
            
            if not order_id or not terminal_id:
                logging.warning("Evento de cancelamento de pedido sem order_id ou terminal_id")
                return
            
            # Verificar se o SAT está habilitado para este terminal
            is_enabled = await self.sat_service.is_enabled(terminal_id)
            if not is_enabled:
                logging.info(f"SAT não habilitado para o terminal {terminal_id}, ignorando cancelamento de CF-e")
                return
            
            # Buscar CF-e associado ao pedido (em uma implementação real, seria do banco de dados)
            # Aqui estamos usando um ID simulado para fins de demonstração
            cfe_id = f"cfe_{order_id}"
            
            # Publicar evento de solicitação de cancelamento
            reason = data.get("reason", "Cancelamento de pedido")
            await self.publisher.publish_cancel_requested(cfe_id, reason)
            
            # Cancelar CF-e
            response = await self.sat_service.cancel_cfe(cfe_id, reason, terminal_id)
            
            if response.success:
                # Publicar evento de cancelamento concluído
                await self.publisher.publish_cancel_completed(cfe_id)
            else:
                # Publicar evento de falha no cancelamento
                await self.publisher.publish_cancel_failed(cfe_id, response.message)
        except Exception as e:
            logging.error(f"Erro ao processar evento de cancelamento de pedido: {str(e)}")
            # Tentar publicar evento de falha, se possível
            try:
                cfe_id = f"cfe_{event.data.get('order_id', 'unknown')}"
                await self.publisher.publish_cancel_failed(cfe_id, str(e))
            except:
                pass


# Singleton para o publicador de eventos SAT
_sat_event_publisher_instance = None

def get_sat_event_publisher() -> SATEventPublisher:
    """Retorna a instância singleton do publicador de eventos SAT."""
    global _sat_event_publisher_instance
    if _sat_event_publisher_instance is None:
        _sat_event_publisher_instance = SATEventPublisher()
    return _sat_event_publisher_instance


# Singleton para o manipulador de eventos SAT
_sat_event_handler_instance = None

def get_sat_event_handler() -> SATEventHandler:
    """Retorna a instância singleton do manipulador de eventos SAT."""
    global _sat_event_handler_instance
    if _sat_event_handler_instance is None:
        _sat_event_handler_instance = SATEventHandler()
    return _sat_event_handler_instance


# Inicializar manipulador de eventos
def initialize_sat_events():
    """Inicializa o sistema de eventos SAT."""
    get_sat_event_handler()
