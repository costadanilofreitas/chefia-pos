from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4


class MenuOrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY = "ready"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class MenuOrderItem(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    menu_item_id: UUID
    quantity: int = 1
    notes: Optional[str] = None
    options: List[UUID] = []
    variant_id: Optional[UUID] = None
    unit_price: float
    total_price: float


class MenuOrder(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    restaurant_id: UUID
    menu_id: UUID
    table_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    items: List[MenuOrderItem] = []
    status: MenuOrderStatus = MenuOrderStatus.PENDING
    total_amount: float
    payment_method: Optional[str] = None
    payment_status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class MenuOrderPayment(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    order_id: UUID
    amount: float
    method: str
    status: str = "pending"
    transaction_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = {}
