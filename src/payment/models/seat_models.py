from pydantic import BaseModel, Field, validator
from typing import List, Optional
from enum import Enum
from datetime import datetime
import uuid


class SeatStatus(str, Enum):
    """Status do assento."""

    AVAILABLE = "available"
    OCCUPIED = "occupied"
    RESERVED = "reserved"


class Seat(BaseModel):
    """Modelo para representar um assento em uma mesa."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    table_id: str
    number: int
    name: Optional[str] = None
    status: SeatStatus = SeatStatus.AVAILABLE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SeatOrderItem(BaseModel):
    """Associação entre um item de pedido e um assento."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_item_id: str
    seat_id: str
    quantity: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @validator("quantity")
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError("Quantity must be greater than 0")
        return v


class SeatPayment(BaseModel):
    """Associação entre um pagamento e um assento."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payment_id: str
    seat_id: str
    amount: float
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @validator("amount")
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("Amount must be greater than 0")
        return v


class SeatGroup(BaseModel):
    """Grupo de assentos para pagamento conjunto."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    seat_ids: List[str]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @validator("seat_ids")
    def validate_seats(cls, v):
        if not v:
            raise ValueError("At least one seat must be provided")
        return v


# DTOs para API
class SeatCreate(BaseModel):
    """DTO para criação de um assento."""

    table_id: str
    number: int
    name: Optional[str] = None
    status: SeatStatus = SeatStatus.AVAILABLE


class SeatUpdate(BaseModel):
    """DTO para atualização de um assento."""

    name: Optional[str] = None
    status: Optional[SeatStatus] = None


class SeatOrderItemCreate(BaseModel):
    """DTO para associação de item a um assento."""

    order_item_id: str
    seat_id: str
    quantity: int = 1


class SeatPaymentCreate(BaseModel):
    """DTO para associação de pagamento a um assento."""

    payment_id: str
    seat_id: str
    amount: float


class SeatGroupCreate(BaseModel):
    """DTO para criação de um grupo de assentos."""

    name: str
    seat_ids: List[str]


class SeatBillSplitRequest(BaseModel):
    """Requisição para divisão de conta por assentos."""

    session_id: str
    seat_ids: List[str]
    include_shared_items: bool = True
