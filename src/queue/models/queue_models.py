"""
Queue Management Models
Modelos para o sistema de gerenciamento de filas de mesas
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, validator


class PartySize(Enum):
    """Categorias de tamanho do grupo"""
    SMALL = "SMALL"      # 1-2 pessoas
    MEDIUM = "MEDIUM"    # 3-4 pessoas
    LARGE = "LARGE"      # 5-6 pessoas
    XLARGE = "XLARGE"    # 7+ pessoas


class QueueStatus(Enum):
    """Status da entrada na fila"""
    WAITING = "WAITING"
    NOTIFIED = "NOTIFIED"
    SEATED = "SEATED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


class NotificationMethod(Enum):
    """Métodos de notificação disponíveis"""
    SMS = "SMS"
    WHATSAPP = "WHATSAPP"
    ANNOUNCEMENT = "ANNOUNCEMENT"
    NONE = "NONE"


class NotificationStatus(Enum):
    """Status da notificação"""
    PENDING = "PENDING"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"


class QueueEntryBase(BaseModel):
    """Base para entrada na fila"""
    customer_name: str = Field(..., min_length=1, max_length=100)
    customer_phone: str = Field(..., min_length=10, max_length=20)
    party_size: int = Field(..., ge=1, le=20)
    table_preferences: Optional[List[str]] = Field(default_factory=list)
    notification_method: NotificationMethod = NotificationMethod.SMS
    notes: Optional[str] = Field(None, max_length=500)

    @validator('customer_phone')
    def validate_phone(cls, v):
        # Remove caracteres não numéricos
        cleaned = ''.join(filter(str.isdigit, v))
        if len(cleaned) < 10 or len(cleaned) > 15:
            raise ValueError('Phone number must be between 10-15 digits')
        return cleaned

    @validator('party_size')
    def validate_party_size(cls, v):
        if v <= 0:
            raise ValueError('Party size must be at least 1')
        if v > 20:
            raise ValueError('Party size cannot exceed 20')
        return v


class QueueEntryCreate(QueueEntryBase):
    """Modelo para criar entrada na fila"""
    customer_id: Optional[UUID] = None
    estimated_wait_minutes: Optional[int] = None


class QueueEntryUpdate(BaseModel):
    """Modelo para atualizar entrada na fila"""
    customer_name: Optional[str] = Field(None, min_length=1, max_length=100)
    party_size: Optional[int] = Field(None, ge=1, le=20)
    table_preferences: Optional[List[str]] = None
    notification_method: Optional[NotificationMethod] = None
    notes: Optional[str] = Field(None, max_length=500)
    status: Optional[QueueStatus] = None


class QueueEntry(QueueEntryBase):
    """Modelo completo de entrada na fila"""
    id: UUID
    customer_id: Optional[UUID] = None
    status: QueueStatus = QueueStatus.WAITING
    position_in_queue: int
    party_size_category: PartySize

    # Timing
    check_in_time: datetime
    estimated_wait_minutes: Optional[int] = None
    notification_time: Optional[datetime] = None
    seated_time: Optional[datetime] = None

    # Assignment
    assigned_table_id: Optional[UUID] = None
    assigned_by: Optional[UUID] = None

    # Metadata
    store_id: str
    created_at: datetime
    updated_at: datetime
    version: int = 1

    @property
    def actual_wait_minutes(self) -> Optional[int]:
        """Calcula o tempo real de espera"""
        if self.seated_time:
            delta = self.seated_time - self.check_in_time
            return int(delta.total_seconds() / 60)
        return None

    @property
    def is_waiting(self) -> bool:
        """Verifica se ainda está esperando"""
        return self.status == QueueStatus.WAITING

    def get_party_size_category(self) -> PartySize:
        """Determina a categoria do tamanho do grupo"""
        if self.party_size <= 2:
            return PartySize.SMALL
        elif self.party_size <= 4:
            return PartySize.MEDIUM
        elif self.party_size <= 6:
            return PartySize.LARGE
        else:
            return PartySize.XLARGE

    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


class QueueNotification(BaseModel):
    """Modelo para notificações da fila"""
    id: UUID
    queue_entry_id: UUID
    notification_type: NotificationMethod
    status: NotificationStatus
    message: str
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    created_at: datetime

    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


class QueueAnalytics(BaseModel):
    """Modelo para analytics da fila"""
    id: UUID
    queue_entry_id: UUID
    actual_wait_minutes: Optional[int]
    estimated_wait_minutes: Optional[int]
    accuracy_percentage: Optional[float]
    table_id: Optional[UUID]
    party_size: int
    day_of_week: int
    hour_of_day: int
    created_at: datetime

    @property
    def prediction_error(self) -> Optional[int]:
        """Calcula o erro de previsão em minutos"""
        if self.actual_wait_minutes and self.estimated_wait_minutes:
            return abs(self.actual_wait_minutes - self.estimated_wait_minutes)
        return None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


class WaitTimeEstimate(BaseModel):
    """Modelo para estimativa de tempo de espera"""
    party_size: int
    estimated_minutes: int
    confidence_level: float  # 0.0 a 1.0
    factors: Dict[str, Any]  # Fatores considerados na estimativa

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class QueueStatistics(BaseModel):
    """Estatísticas da fila"""
    total_in_queue: int
    average_wait_time: float
    longest_wait: Optional[int]
    parties_by_size: Dict[str, int]
    estimated_total_clear_time: int
    no_show_rate: float
    accuracy_last_24h: Optional[float]

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class TableSuggestion(BaseModel):
    """Sugestão de mesa para um grupo"""
    table_id: UUID
    table_number: int
    score: float  # 0.0 a 1.0
    reasons: List[str]
    estimated_availability: Optional[datetime]
    requires_combination: bool = False
    combined_tables: Optional[List[UUID]] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


class QueuePosition(BaseModel):
    """Posição na fila para cliente"""
    position: int
    total_ahead: int
    estimated_wait_minutes: int
    status: QueueStatus
    last_updated: datetime

    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
