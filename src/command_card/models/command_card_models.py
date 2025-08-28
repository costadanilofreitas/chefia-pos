"""
Command Card System Models
Models for managing restaurant command cards (comandas)
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, validator


class CommandCardStatus(Enum):
    """Status of command card"""
    AVAILABLE = "AVAILABLE"      # Available for use
    IN_USE = "IN_USE"           # Currently in use
    BLOCKED = "BLOCKED"         # Temporarily blocked
    LOST = "LOST"               # Marked as lost
    DAMAGED = "DAMAGED"         # Damaged/unusable
    RESERVED = "RESERVED"       # Reserved for special use


class CommandCardType(Enum):
    """Type of command card"""
    PHYSICAL = "PHYSICAL"       # Physical card with barcode/QR
    DIGITAL = "DIGITAL"         # Digital card (app-based)
    NFC = "NFC"                 # NFC card
    RFID = "RFID"              # RFID card
    PRINTED = "PRINTED"         # Printed paper command


class PaymentResponsibility(Enum):
    """Who is responsible for payment"""
    INDIVIDUAL = "INDIVIDUAL"   # Each person pays their items
    TABLE = "TABLE"            # Table pays together
    SPLIT_EQUAL = "SPLIT_EQUAL" # Split equally
    HOST = "HOST"              # One person pays all
    CUSTOM = "CUSTOM"          # Custom split


class CommandCardBase(BaseModel):
    """Base command card model"""
    card_number: str = Field(..., min_length=1, max_length=50)
    card_type: CommandCardType = CommandCardType.PHYSICAL
    barcode: Optional[str] = Field(None, max_length=100)
    qr_code: Optional[str] = Field(None, max_length=200)
    nfc_tag: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=200)

    @validator('card_number')
    def validate_card_number(cls, v):
        # Remove spaces and validate format
        cleaned = v.strip().upper()
        if not cleaned:
            raise ValueError('Card number cannot be empty')
        return cleaned


class CommandCardCreate(CommandCardBase):
    """Model for creating command card"""
    initial_status: CommandCardStatus = CommandCardStatus.AVAILABLE
    metadata: Optional[Dict[str, Any]] = None


class CommandCardUpdate(BaseModel):
    """Model for updating command card"""
    status: Optional[CommandCardStatus] = None
    description: Optional[str] = Field(None, max_length=200)
    barcode: Optional[str] = Field(None, max_length=100)
    qr_code: Optional[str] = Field(None, max_length=200)
    nfc_tag: Optional[str] = Field(None, max_length=100)
    metadata: Optional[Dict[str, Any]] = None


class CommandCard(CommandCardBase):
    """Complete command card model"""
    id: UUID
    status: CommandCardStatus

    # Usage tracking
    times_used: int = 0
    last_used_at: Optional[datetime] = None
    last_used_by: Optional[UUID] = None

    # Current assignment
    current_session_id: Optional[UUID] = None
    assigned_table_id: Optional[UUID] = None
    assigned_customer_id: Optional[UUID] = None

    # History
    created_at: datetime
    updated_at: datetime
    created_by: UUID

    # Store association
    store_id: str

    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    version: int = 1

    @property
    def is_available(self) -> bool:
        """Check if card is available for use"""
        return self.status == CommandCardStatus.AVAILABLE

    @property
    def is_in_use(self) -> bool:
        """Check if card is currently in use"""
        return self.status == CommandCardStatus.IN_USE

    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


class CommandSessionBase(BaseModel):
    """Base command session model"""
    card_id: UUID
    customer_name: Optional[str] = Field(None, max_length=100)
    customer_phone: Optional[str] = Field(None, max_length=20)
    customer_id: Optional[UUID] = None
    table_id: Optional[UUID] = None
    waiter_id: Optional[UUID] = None
    people_count: int = Field(default=1, ge=1, le=50)
    payment_responsibility: PaymentResponsibility = PaymentResponsibility.INDIVIDUAL
    notes: Optional[str] = Field(None, max_length=500)


class CommandSessionCreate(CommandSessionBase):
    """Model for creating command session"""
    initial_credit: Optional[float] = Field(None, ge=0)
    credit_limit: Optional[float] = Field(None, ge=0)
    require_authorization: bool = False
    authorized_by: Optional[UUID] = None


class CommandSessionUpdate(BaseModel):
    """Model for updating command session"""
    customer_name: Optional[str] = Field(None, max_length=100)
    customer_phone: Optional[str] = Field(None, max_length=20)
    table_id: Optional[UUID] = None
    waiter_id: Optional[UUID] = None
    people_count: Optional[int] = Field(None, ge=1, le=50)
    payment_responsibility: Optional[PaymentResponsibility] = None
    notes: Optional[str] = Field(None, max_length=500)
    credit_limit: Optional[float] = Field(None, ge=0)


class CommandSessionStatus(Enum):
    """Status of command session"""
    ACTIVE = "ACTIVE"           # Session is active
    SUSPENDED = "SUSPENDED"     # Temporarily suspended
    CLOSED = "CLOSED"          # Closed, awaiting payment
    PAID = "PAID"              # Paid and completed
    CANCELLED = "CANCELLED"    # Cancelled


class CommandSession(CommandSessionBase):
    """Complete command session model"""
    id: UUID
    status: CommandSessionStatus

    # Financial
    total_amount: float = 0.0
    paid_amount: float = 0.0
    credit_amount: float = 0.0
    credit_limit: Optional[float] = None
    discount_amount: float = 0.0
    service_charge: float = 0.0

    # Orders
    order_ids: List[UUID] = Field(default_factory=list)
    item_count: int = 0

    # Timing
    started_at: datetime
    suspended_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None

    # Authorization
    require_authorization: bool = False
    authorized_by: Optional[UUID] = None
    authorization_timestamp: Optional[datetime] = None

    # Store
    store_id: str
    terminal_id: str

    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    version: int = 1

    @property
    def balance_due(self) -> float:
        """Calculate balance due"""
        return max(0, self.total_amount - self.paid_amount - self.credit_amount)

    @property
    def is_paid(self) -> bool:
        """Check if fully paid"""
        return self.balance_due <= 0

    @property
    def duration_minutes(self) -> Optional[int]:
        """Calculate session duration"""
        if not self.closed_at:
            end = datetime.now()
        else:
            end = self.closed_at
        delta = end - self.started_at
        return int(delta.total_seconds() / 60)

    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


class CommandItem(BaseModel):
    """Item added to command card"""
    id: UUID
    session_id: UUID
    card_id: UUID

    # Product info
    product_id: UUID
    product_name: str
    product_code: str
    quantity: int = 1
    unit_price: float
    total_price: float

    # Discounts
    discount_amount: float = 0.0
    discount_percentage: float = 0.0

    # Status
    status: str  # PENDING, CONFIRMED, PREPARING, READY, DELIVERED, CANCELLED

    # Who added
    added_by: UUID
    added_at: datetime
    terminal_id: str

    # Delivery
    delivered_at: Optional[datetime] = None
    delivered_by: Optional[UUID] = None

    # Cancellation
    cancelled_at: Optional[datetime] = None
    cancelled_by: Optional[UUID] = None
    cancellation_reason: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


class CommandTransfer(BaseModel):
    """Transfer command between cards/tables"""
    id: UUID
    from_card_id: UUID
    to_card_id: UUID
    from_session_id: UUID
    to_session_id: Optional[UUID] = None

    # What to transfer
    transfer_all: bool = True
    item_ids: Optional[List[UUID]] = None
    amount: Optional[float] = None

    # Authorization
    authorized_by: UUID
    reason: Optional[str] = None

    # Timing
    requested_at: datetime
    completed_at: Optional[datetime] = None

    # Status
    status: str  # PENDING, COMPLETED, FAILED, CANCELLED
    error_message: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


class CommandStatistics(BaseModel):
    """Statistics for command cards"""
    # Card statistics
    total_cards: int
    available_cards: int
    in_use_cards: int
    lost_cards: int
    damaged_cards: int

    # Usage statistics
    total_sessions_today: int
    active_sessions: int
    average_session_duration: float  # minutes
    average_session_value: float

    # Financial
    total_revenue_today: float
    pending_payments: float
    average_items_per_session: float

    # Performance
    card_turnover_rate: float  # sessions per card per day
    peak_usage_hour: Optional[int] = None
    busiest_day: Optional[str] = None

    # Top metrics
    most_used_cards: List[Dict[str, Any]] = Field(default_factory=list)
    highest_value_sessions: List[Dict[str, Any]] = Field(default_factory=list)


class CommandConfiguration(BaseModel):
    """Configuration for command card system"""
    # General settings
    enabled: bool = True
    require_deposit: bool = False
    deposit_amount: float = 0.0

    # Card settings
    auto_generate_numbers: bool = True
    number_prefix: str = "CMD"
    number_length: int = 6
    allow_duplicate_active: bool = False

    # Session settings
    auto_close_after_hours: int = 8
    require_customer_info: bool = False
    require_table_assignment: bool = False
    allow_credit: bool = False
    default_credit_limit: float = 0.0

    # Security
    require_authorization_above: Optional[float] = None
    require_manager_for_transfer: bool = True
    require_pin_for_payment: bool = False

    # Integration
    sync_with_table_system: bool = True
    sync_with_queue_system: bool = True
    print_receipt_on_close: bool = True

    # Notifications
    notify_on_high_balance: bool = True
    high_balance_threshold: float = 500.0
    notify_on_long_session: bool = True
    long_session_hours: int = 4
