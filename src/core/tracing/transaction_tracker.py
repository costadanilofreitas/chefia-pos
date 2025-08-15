import hashlib
import time
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional


class TransactionType(str, Enum):
    ORDER = "ORD"
    PAYMENT = "PAY"
    INVENTORY = "INV"
    CUSTOMER = "CUS"
    DELIVERY = "DEL"
    KITCHEN = "KDS"
    WAITER = "WAI"
    SYSTEM = "SYS"


class TransactionOrigin(str, Enum):
    POS = "POS"
    KDS = "KDS"
    APP = "APP"
    WEB = "WEB"
    TERM = "TERM"  # Terminal de pagamento
    API = "API"
    SYS = "SYS"


class EventType(str, Enum):
    CREATED = "created"
    UPDATED = "updated"
    PROCESSED = "processed"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"
    ERROR = "error"
    INFO = "info"
    WARNING = "warning"


class TransactionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"


class TransactionEvent:
    def __init__(
        self,
        transaction_id: str,
        event_type: EventType,
        module: str,
        status: TransactionStatus,
        data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.id = str(uuid.uuid4())
        self.transaction_id = transaction_id
        self.timestamp = datetime.utcnow()
        self.event_type = event_type
        self.module = module
        self.status = status
        self.data = data or {}
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "transaction_id": self.transaction_id,
            "timestamp": self.timestamp.isoformat(),
            "event_type": self.event_type,
            "module": self.module,
            "status": self.status,
            "data": self.data,
            "metadata": self.metadata,
        }


class TransactionTracker:
    def __init__(self, event_logger=None):
        self.event_logger = event_logger

    def generate_transaction_id(
        self,
        transaction_type: TransactionType,
        origin: TransactionOrigin,
        sequence: Optional[int] = None,
    ) -> str:
        """
        Gera um ID único para uma transação seguindo o formato:
        [TIPO]-[ORIGEM]-[TIMESTAMP]-[SEQUENCIAL]-[CHECKSUM]
        """
        # Timestamp UTC em formato compacto (YYMMDDHHmmss)
        timestamp = datetime.utcnow().strftime("%y%m%d%H%M%S")

        # Número sequencial (com padding de zeros)
        if sequence is None:
            sequence = int(time.time() * 1000) % 10000
        seq_str = f"{sequence:04d}"

        # Base do ID sem checksum
        base_id = f"{transaction_type.value}-{origin.value}-{timestamp}-{seq_str}"

        # Gerar checksum (últimos 4 caracteres do hash MD5)
        checksum = hashlib.md5(base_id.encode()).hexdigest()[-4:].upper()

        # ID completo
        transaction_id = f"{base_id}-{checksum}"

        return transaction_id

    def validate_transaction_id(self, transaction_id: str) -> bool:
        """
        Valida se um ID de transação está no formato correto e se o checksum é válido.
        """
        try:
            # Verificar formato
            parts = transaction_id.split("-")
            if len(parts) != 5:
                return False

            # Extrair componentes
            tx_type, origin, timestamp, sequence, checksum = parts

            # Validar tipo de transação
            if tx_type not in [t.value for t in TransactionType]:
                return False

            # Validar origem
            if origin not in [o.value for o in TransactionOrigin]:
                return False

            # Validar timestamp (formato e valor razoável)
            if len(timestamp) != 12:
                return False

            # Validar sequência
            if len(sequence) != 4 or not sequence.isdigit():
                return False

            # Validar checksum
            base_id = f"{tx_type}-{origin}-{timestamp}-{sequence}"
            expected_checksum = hashlib.md5(base_id.encode()).hexdigest()[-4:].upper()

            return checksum == expected_checksum

        except Exception:
            return False

    def start_transaction(
        self,
        transaction_type: TransactionType,
        origin: TransactionOrigin,
        module: str,
        data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Inicia uma nova transação, gerando um ID único e registrando o evento inicial.
        """
        # Gerar ID único
        transaction_id = self.generate_transaction_id(transaction_type, origin)

        # Registrar evento de criação
        if self.event_logger:
            event = TransactionEvent(
                transaction_id=transaction_id,
                event_type=EventType.CREATED,
                module=module,
                status=TransactionStatus.PENDING,
                data=data,
                metadata=metadata,
            )
            self.event_logger.log_event(event)

        return transaction_id

    def update_transaction(
        self,
        transaction_id: str,
        event_type: EventType,
        module: str,
        status: TransactionStatus,
        data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Atualiza uma transação existente, registrando um novo evento.
        """
        # Validar ID da transação
        if not self.validate_transaction_id(transaction_id):
            return False

        # Registrar evento de atualização
        if self.event_logger:
            event = TransactionEvent(
                transaction_id=transaction_id,
                event_type=event_type,
                module=module,
                status=status,
                data=data,
                metadata=metadata,
            )
            self.event_logger.log_event(event)

        return True

    def complete_transaction(
        self,
        transaction_id: str,
        module: str,
        success: bool,
        data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Finaliza uma transação, registrando o evento de conclusão.
        """
        # Validar ID da transação
        if not self.validate_transaction_id(transaction_id):
            return False

        # Determinar tipo de evento e status com base no sucesso
        event_type = EventType.COMPLETED if success else EventType.FAILED
        status = TransactionStatus.COMPLETED if success else TransactionStatus.FAILED

        # Registrar evento de conclusão
        if self.event_logger:
            event = TransactionEvent(
                transaction_id=transaction_id,
                event_type=event_type,
                module=module,
                status=status,
                data=data,
                metadata=metadata,
            )
            self.event_logger.log_event(event)

        return True
