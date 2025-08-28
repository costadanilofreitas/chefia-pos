"""
Audit Logger System
Sistema de logs de auditoria para rastrear mudanças sincronizadas entre terminais
"""

import asyncio
import json
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional


class AuditAction(Enum):
    """Tipos de ações auditadas"""
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    VIEW = "VIEW"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    SYNC = "SYNC"
    CONFLICT = "CONFLICT"
    LOCK_ACQUIRE = "LOCK_ACQUIRE"
    LOCK_RELEASE = "LOCK_RELEASE"
    PAYMENT = "PAYMENT"
    REFUND = "REFUND"
    CASH_OPEN = "CASH_OPEN"
    CASH_CLOSE = "CASH_CLOSE"
    WITHDRAWAL = "WITHDRAWAL"


class AuditSeverity(Enum):
    """Níveis de severidade para auditoria"""
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


@dataclass
class AuditEntry:
    """Entrada de log de auditoria"""
    timestamp: str
    action: str
    entity_type: str
    entity_id: Optional[str]
    user_id: str
    terminal_id: str
    severity: str
    description: str
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    sync_status: Optional[str] = None
    conflict_resolution: Optional[str] = None
    ip_address: Optional[str] = None
    session_id: Optional[str] = None


class AuditLogger:
    """
    Logger de auditoria para rastrear todas as mudanças no sistema
    """

    def __init__(self, log_dir: str = "/var/log/pos-modern/audit"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # Arquivo de log atual
        self.current_log_file = self._get_log_file_path()

        # Buffer para logs em memória
        self.buffer: List[AuditEntry] = []
        self.buffer_size = 100
        self.flush_interval = 10  # segundos

        # Configurações de retenção
        self.retention_days = 90  # Manter logs por 90 dias
        self.max_file_size_mb = 100  # Rotacionar após 100MB

        # Iniciar flush automático
        self._start_auto_flush()

    def _get_log_file_path(self, date: Optional[datetime] = None) -> Path:
        """Gera o caminho do arquivo de log para uma data"""
        if date is None:
            date = datetime.utcnow()

        filename = f"audit_{date.strftime('%Y%m%d')}.jsonl"
        return self.log_dir / filename

    async def log(
        self,
        action: AuditAction,
        entity_type: str,
        entity_id: Optional[str] = None,
        user_id: str = "system",
        terminal_id: str = "unknown",
        description: str = "",
        old_value: Optional[Dict[str, Any]] = None,
        new_value: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        severity: AuditSeverity = AuditSeverity.INFO,
        sync_status: Optional[str] = None,
        conflict_resolution: Optional[str] = None,
        ip_address: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> None:
        """
        Registra uma entrada de auditoria
        """
        entry = AuditEntry(
            timestamp=datetime.utcnow().isoformat(),
            action=action.value,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            terminal_id=terminal_id,
            severity=severity.value,
            description=description,
            old_value=self._sanitize_sensitive_data(old_value) if old_value else None,
            new_value=self._sanitize_sensitive_data(new_value) if new_value else None,
            metadata=metadata,
            sync_status=sync_status,
            conflict_resolution=conflict_resolution,
            ip_address=ip_address,
            session_id=session_id
        )

        # Adicionar ao buffer
        self.buffer.append(entry)

        # Se buffer cheio, fazer flush
        if len(self.buffer) >= self.buffer_size:
            await self.flush()

        # Log crítico deve ser gravado imediatamente
        if severity == AuditSeverity.CRITICAL:
            await self.flush()

    async def log_sync_event(
        self,
        action: str,
        entity_type: str,
        entity_id: str,
        from_terminal: str,
        to_terminals: List[str],
        user_id: str,
        success: bool = True,
        error: Optional[str] = None
    ) -> None:
        """
        Registra evento de sincronização entre terminais
        """
        await self.log(
            action=AuditAction.SYNC,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            terminal_id=from_terminal,
            description=f"Sync {action} from {from_terminal} to {len(to_terminals)} terminals",
            metadata={
                "from_terminal": from_terminal,
                "to_terminals": to_terminals,
                "sync_action": action,
                "success": success,
                "error": error
            },
            severity=AuditSeverity.INFO if success else AuditSeverity.ERROR,
            sync_status="SUCCESS" if success else "FAILED"
        )

    async def log_conflict(
        self,
        entity_type: str,
        entity_id: str,
        terminal_1: str,
        terminal_2: str,
        user_1: str,
        user_2: str,
        resolution: str,
        winner: str
    ) -> None:
        """
        Registra conflito de sincronização
        """
        await self.log(
            action=AuditAction.CONFLICT,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=f"{user_1},{user_2}",
            terminal_id=f"{terminal_1},{terminal_2}",
            description=f"Conflict between {terminal_1} and {terminal_2}",
            metadata={
                "terminal_1": terminal_1,
                "terminal_2": terminal_2,
                "user_1": user_1,
                "user_2": user_2,
                "winner": winner
            },
            severity=AuditSeverity.WARNING,
            conflict_resolution=resolution
        )

    async def log_payment(
        self,
        order_id: str,
        payment_method: str,
        amount: float,
        user_id: str,
        terminal_id: str,
        success: bool = True,
        error: Optional[str] = None
    ) -> None:
        """
        Registra operação de pagamento
        """
        await self.log(
            action=AuditAction.PAYMENT,
            entity_type="payment",
            entity_id=order_id,
            user_id=user_id,
            terminal_id=terminal_id,
            description=f"Payment {payment_method}: R$ {amount:.2f}",
            metadata={
                "payment_method": payment_method,
                "amount": amount,
                "success": success,
                "error": error
            },
            severity=AuditSeverity.INFO if success else AuditSeverity.ERROR
        )

    async def log_cashier_operation(
        self,
        operation: str,
        cashier_id: str,
        user_id: str,
        terminal_id: str,
        amount: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Registra operação do caixa
        """
        action_map = {
            "open": AuditAction.CASH_OPEN,
            "close": AuditAction.CASH_CLOSE,
            "withdrawal": AuditAction.WITHDRAWAL
        }

        action = action_map.get(operation, AuditAction.UPDATE)

        await self.log(
            action=action,
            entity_type="cashier",
            entity_id=cashier_id,
            user_id=user_id,
            terminal_id=terminal_id,
            description=f"Cashier {operation}" + (f": R$ {amount:.2f}" if amount else ""),
            metadata=metadata,
            severity=AuditSeverity.INFO
        )

    def _sanitize_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Remove dados sensíveis antes de logar
        """
        if not data:
            return data

        sanitized = data.copy()
        sensitive_fields = [
            'password', 'senha', 'token', 'api_key', 'secret',
            'card_number', 'cvv', 'cpf', 'rg', 'credit_card'
        ]

        for field in sensitive_fields:
            if field in sanitized:
                sanitized[field] = "***REDACTED***"

        return sanitized

    async def flush(self) -> None:
        """
        Grava buffer em disco
        """
        if not self.buffer:
            return

        try:
            # Verificar rotação de arquivo
            await self._rotate_if_needed()

            # Gravar entries no arquivo
            with open(self.current_log_file, 'a', encoding='utf-8') as f:
                for entry in self.buffer:
                    json_line = json.dumps(asdict(entry), ensure_ascii=False)
                    f.write(json_line + '\n')

            # Limpar buffer
            self.buffer.clear()

        except Exception as e:
            print(f"Error flushing audit log: {e}")

    async def _rotate_if_needed(self) -> None:
        """
        Rotaciona arquivo se necessário
        """
        if not self.current_log_file.exists():
            return

        # Verificar tamanho
        file_size_mb = self.current_log_file.stat().st_size / (1024 * 1024)

        if file_size_mb >= self.max_file_size_mb:
            # Renomear arquivo atual
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            rotated_file = self.log_dir / f"audit_{timestamp}_rotated.jsonl"
            self.current_log_file.rename(rotated_file)

            # Criar novo arquivo
            self.current_log_file = self._get_log_file_path()

    async def cleanup_old_logs(self) -> None:
        """
        Remove logs antigos baseado na política de retenção
        """
        cutoff_date = datetime.utcnow() - timedelta(days=self.retention_days)

        for log_file in self.log_dir.glob("audit_*.jsonl"):
            # Extrair data do nome do arquivo
            try:
                date_str = log_file.stem.split('_')[1]
                if len(date_str) == 8:  # YYYYMMDD
                    file_date = datetime.strptime(date_str, '%Y%m%d')
                    if file_date < cutoff_date:
                        log_file.unlink()
                        print(f"Removed old audit log: {log_file}")
            except (IndexError, ValueError):
                continue

    def _start_auto_flush(self) -> None:
        """
        Inicia flush automático em background
        """
        async def auto_flush():
            while True:
                await asyncio.sleep(self.flush_interval)
                await self.flush()

        # Criar task em background
        try:
            loop = asyncio.get_event_loop()
            loop.create_task(auto_flush())
        except RuntimeError:
            # Se não há loop, ignorar auto-flush
            pass

    async def search_logs(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        user_id: Optional[str] = None,
        terminal_id: Optional[str] = None,
        action: Optional[AuditAction] = None,
        limit: int = 100
    ) -> List[AuditEntry]:
        """
        Busca logs com filtros
        """
        results: List[AuditEntry] = []

        # Determinar arquivos para buscar
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=7)
        if not end_date:
            end_date = datetime.utcnow()

        current_date = start_date
        while current_date <= end_date:
            log_file = self._get_log_file_path(current_date)

            if log_file.exists():
                with open(log_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        if len(results) >= limit:
                            break

                        try:
                            entry_dict = json.loads(line)

                            # Aplicar filtros
                            if entity_type and entry_dict.get('entity_type') != entity_type:
                                continue
                            if entity_id and entry_dict.get('entity_id') != entity_id:
                                continue
                            if user_id and entry_dict.get('user_id') != user_id:
                                continue
                            if terminal_id and entry_dict.get('terminal_id') != terminal_id:
                                continue
                            if action and entry_dict.get('action') != action.value:
                                continue

                            # Converter para AuditEntry
                            entry = AuditEntry(**entry_dict)
                            results.append(entry)

                        except (json.JSONDecodeError, TypeError):
                            continue

            current_date += timedelta(days=1)

        return results

    async def get_statistics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Obtém estatísticas dos logs
        """
        logs = await self.search_logs(start_date, end_date, limit=10000)

        stats: Dict[str, Any] = {
            "total_entries": len(logs),
            "by_action": {},
            "by_entity": {},
            "by_terminal": {},
            "by_user": {},
            "by_severity": {},
            "conflicts": 0,
            "sync_failures": 0
        }

        for log in logs:
            # Por ação
            by_action = stats["by_action"]
            if isinstance(by_action, dict):
                by_action[log.action] = by_action.get(log.action, 0) + 1

            # Por entidade
            by_entity = stats["by_entity"]
            if isinstance(by_entity, dict):
                by_entity[log.entity_type] = by_entity.get(log.entity_type, 0) + 1

            # Por terminal
            by_terminal = stats["by_terminal"]
            if isinstance(by_terminal, dict):
                by_terminal[log.terminal_id] = by_terminal.get(log.terminal_id, 0) + 1

            # Por usuário
            by_user = stats["by_user"]
            if isinstance(by_user, dict):
                by_user[log.user_id] = by_user.get(log.user_id, 0) + 1

            # Por severidade
            by_severity = stats["by_severity"]
            if isinstance(by_severity, dict):
                by_severity[log.severity] = by_severity.get(log.severity, 0) + 1

            # Conflitos
            if log.action == AuditAction.CONFLICT.value:
                if isinstance(stats["conflicts"], int):
                    stats["conflicts"] += 1

            # Falhas de sync
            if log.sync_status == "FAILED":
                if isinstance(stats["sync_failures"], int):
                    stats["sync_failures"] += 1

        return stats


# Singleton instance
audit_logger = AuditLogger()
