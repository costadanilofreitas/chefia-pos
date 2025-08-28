"""
Reservation System Models
Modelos para o sistema de reserva de mesas
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, date, time
from enum import Enum
from pydantic import BaseModel, Field, validator
from uuid import UUID


class ReservationStatus(Enum):
    """Status da reserva"""
    PENDING = "PENDING"          # Aguardando confirmação
    CONFIRMED = "CONFIRMED"      # Confirmada
    ARRIVED = "ARRIVED"          # Cliente chegou
    SEATED = "SEATED"            # Cliente sentado
    COMPLETED = "COMPLETED"      # Finalizada
    CANCELLED = "CANCELLED"      # Cancelada
    NO_SHOW = "NO_SHOW"         # Não compareceu


class ReservationSource(Enum):
    """Origem da reserva"""
    PHONE = "PHONE"              # Telefone
    WEBSITE = "WEBSITE"          # Site
    WHATSAPP = "WHATSAPP"        # WhatsApp
    WALK_IN = "WALK_IN"          # Presencial
    PARTNER = "PARTNER"          # Parceiro (iFood, etc)


class RecurrenceType(Enum):
    """Tipo de recorrência"""
    NONE = "NONE"
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"


class TablePreference(Enum):
    """Preferências de mesa"""
    WINDOW = "WINDOW"            # Janela
    QUIET = "QUIET"              # Área silenciosa
    OUTDOOR = "OUTDOOR"          # Área externa
    INDOOR = "INDOOR"            # Área interna
    PRIVATE = "PRIVATE"          # Privativo
    BAR = "BAR"                  # Balcão
    HIGHCHAIR = "HIGHCHAIR"      # Cadeira alta (criança)
    WHEELCHAIR = "WHEELCHAIR"    # Acessível


class ReservationBase(BaseModel):
    """Base para reserva"""
    customer_name: str = Field(..., min_length=1, max_length=100)
    customer_phone: str = Field(..., min_length=10, max_length=20)
    customer_email: Optional[str] = Field(None, max_length=100)
    party_size: int = Field(..., ge=1, le=20)
    reservation_date: date
    reservation_time: time
    duration_minutes: int = Field(default=120, ge=30, le=300)  # 30min a 5h
    table_preferences: List[TablePreference] = Field(default_factory=list)
    special_requests: Optional[str] = Field(None, max_length=500)
    dietary_restrictions: Optional[List[str]] = None
    celebration_type: Optional[str] = None  # Aniversário, etc
    
    @validator('customer_phone')
    def validate_phone(cls, v):
        cleaned = ''.join(filter(str.isdigit, v))
        if len(cleaned) < 10 or len(cleaned) > 15:
            raise ValueError('Phone number must be between 10-15 digits')
        return cleaned
    
    @validator('customer_email')
    def validate_email(cls, v):
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v


class ReservationCreate(ReservationBase):
    """Modelo para criar reserva"""
    customer_id: Optional[UUID] = None
    source: ReservationSource = ReservationSource.PHONE
    deposit_amount: Optional[float] = Field(None, ge=0)
    recurrence: RecurrenceType = RecurrenceType.NONE
    recurrence_end_date: Optional[date] = None
    notification_advance_minutes: int = Field(default=60, ge=0, le=1440)
    auto_confirm: bool = False
    assigned_tables: Optional[List[UUID]] = None  # Pré-atribuir mesas


class ReservationUpdate(BaseModel):
    """Modelo para atualizar reserva"""
    customer_name: Optional[str] = Field(None, min_length=1, max_length=100)
    customer_phone: Optional[str] = Field(None, min_length=10, max_length=20)
    customer_email: Optional[str] = Field(None, max_length=100)
    party_size: Optional[int] = Field(None, ge=1, le=20)
    reservation_date: Optional[date] = None
    reservation_time: Optional[time] = None
    duration_minutes: Optional[int] = Field(None, ge=30, le=300)
    table_preferences: Optional[List[TablePreference]] = None
    special_requests: Optional[str] = Field(None, max_length=500)
    status: Optional[ReservationStatus] = None
    assigned_tables: Optional[List[UUID]] = None


class Reservation(ReservationBase):
    """Modelo completo de reserva"""
    id: UUID
    customer_id: Optional[UUID] = None
    source: ReservationSource
    status: ReservationStatus
    confirmation_code: str  # Código único para confirmação
    
    # Timing
    created_at: datetime
    updated_at: datetime
    confirmed_at: Optional[datetime] = None
    arrived_at: Optional[datetime] = None
    seated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    
    # Atribuições
    assigned_tables: List[UUID] = Field(default_factory=list)
    assigned_by: Optional[UUID] = None
    queue_entry_id: Optional[UUID] = None  # Se entrou na fila
    
    # Financeiro
    deposit_amount: Optional[float] = None
    deposit_paid: bool = False
    deposit_refunded: bool = False
    
    # Notificações
    notification_sent: bool = False
    notification_sent_at: Optional[datetime] = None
    reminder_sent: bool = False
    reminder_sent_at: Optional[datetime] = None
    
    # Recorrência
    recurrence: RecurrenceType = RecurrenceType.NONE
    recurrence_parent_id: Optional[UUID] = None  # ID da reserva pai
    recurrence_end_date: Optional[date] = None
    
    # Metadata
    store_id: str
    version: int = 1
    
    @property
    def reservation_datetime(self) -> datetime:
        """Combina data e hora da reserva"""
        return datetime.combine(self.reservation_date, self.reservation_time)
    
    @property
    def is_today(self) -> bool:
        """Verifica se a reserva é para hoje"""
        return self.reservation_date == date.today()
    
    @property
    def is_past(self) -> bool:
        """Verifica se a reserva já passou"""
        return self.reservation_datetime < datetime.now()
    
    @property
    def is_active(self) -> bool:
        """Verifica se a reserva está ativa"""
        return self.status in [ReservationStatus.CONFIRMED, ReservationStatus.ARRIVED]
    
    @property
    def minutes_until(self) -> Optional[int]:
        """Minutos até a reserva"""
        if self.is_past:
            return None
        delta = self.reservation_datetime - datetime.now()
        return int(delta.total_seconds() / 60)
    
    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat(),
            time: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


class ReservationSlot(BaseModel):
    """Slot de tempo para reserva"""
    date: date
    time: time
    available_tables: int
    total_tables: int
    is_available: bool
    min_party_size: int
    max_party_size: int
    
    class Config:
        json_encoders = {
            date: lambda v: v.isoformat(),
            time: lambda v: v.isoformat()
        }


class ReservationAvailability(BaseModel):
    """Disponibilidade para reservas"""
    date: date
    slots: List[ReservationSlot]
    fully_booked: bool
    special_events: Optional[List[str]] = None
    restrictions: Optional[Dict[str, Any]] = None
    
    class Config:
        json_encoders = {
            date: lambda v: v.isoformat()
        }


class ReservationStatistics(BaseModel):
    """Estatísticas de reservas"""
    total_reservations: int
    confirmed: int
    pending: int
    no_shows: int
    cancelled: int
    
    # Taxas
    no_show_rate: float
    cancellation_rate: float
    confirmation_rate: float
    
    # Por período
    today: int
    this_week: int
    this_month: int
    
    # Médias
    average_party_size: float
    average_duration_minutes: float
    peak_hours: List[int]  # Horas com mais reservas
    popular_days: List[str]  # Dias da semana mais populares
    
    # Financeiro
    total_deposits: float
    pending_deposits: float
    refunded_deposits: float


class TableAllocation(BaseModel):
    """Alocação de mesa para reserva"""
    reservation_id: UUID
    table_ids: List[UUID]
    table_numbers: List[int]
    combined: bool  # Se são mesas combinadas
    score: float  # Score de adequação (0-1)
    reasons: List[str]
    
    class Config:
        json_encoders = {
            UUID: lambda v: str(v)
        }


class BlockedSlot(BaseModel):
    """Slot bloqueado para reservas"""
    id: UUID
    date: date
    start_time: time
    end_time: time
    reason: str
    tables_affected: Optional[List[UUID]] = None  # None = todas
    created_by: UUID
    created_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat(),
            time: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


class ReservationSettings(BaseModel):
    """Configurações do sistema de reservas"""
    enabled: bool = True
    
    # Horários
    min_advance_hours: int = 1  # Mínimo de antecedência
    max_advance_days: int = 30  # Máximo de dias no futuro
    default_duration_minutes: int = 120
    
    # Capacidade
    max_reservations_per_slot: int = 10
    max_party_size: int = 20
    min_party_size: int = 1
    overbooking_percentage: float = 0.1  # 10% overbooking
    
    # Confirmação
    require_confirmation: bool = True
    auto_confirm_regular_customers: bool = True
    confirmation_deadline_hours: int = 24
    
    # Depósito
    require_deposit: bool = False
    deposit_amount: float = 50.0
    deposit_percentage: float = 0.0  # Ou percentual do valor estimado
    deposit_refund_hours: int = 24  # Antecedência para cancelar com reembolso
    
    # Notificações
    send_confirmation_sms: bool = True
    send_confirmation_email: bool = True
    send_reminder: bool = True
    reminder_advance_minutes: int = 60
    
    # No-show
    no_show_grace_minutes: int = 15
    blacklist_after_no_shows: int = 3  # Bloquear após X no-shows
    
    # Horários de funcionamento
    operating_hours: Dict[str, Dict[str, str]] = Field(
        default_factory=lambda: {
            "monday": {"open": "11:00", "close": "23:00"},
            "tuesday": {"open": "11:00", "close": "23:00"},
            "wednesday": {"open": "11:00", "close": "23:00"},
            "thursday": {"open": "11:00", "close": "23:00"},
            "friday": {"open": "11:00", "close": "00:00"},
            "saturday": {"open": "11:00", "close": "00:00"},
            "sunday": {"open": "11:00", "close": "22:00"}
        }
    )
    
    # Slots de tempo
    slot_duration_minutes: int = 15  # Intervalos de 15 minutos
    buffer_between_reservations: int = 0  # Minutos entre reservas