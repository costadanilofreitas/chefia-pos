# Updating the Order model to support coupon and points redemption

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
import uuid
from enum import Enum

# Existing models (assuming these are already defined)
class OrderItemCustomization(BaseModel):
    name: str
    price_adjustment: float = 0.0

class OrderItemSection(BaseModel):
    section_id: str
    product_id: str

class OrderStatus(str, Enum):
    PENDING = "PENDING"
    PREPARING = "PREPARING"
    READY = "READY"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    DELIVERING = "DELIVERING"  # Added for remote orders integration

class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    REFUNDED = "REFUNDED"
    CANCELLED = "CANCELLED"

class PaymentMethod(str, Enum):
    CASH = "CASH"
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"
    PIX = "PIX"
    OTHER = "OTHER"

class OrderType(str, Enum):
    DINE_IN = "DINE_IN"
    TAKEOUT = "TAKEOUT"
    DELIVERY = "DELIVERY"

# Updated Order models with coupon and points redemption support
class OrderItemBase(BaseModel):
    product_id: str
    quantity: int = 1
    customizations: List[OrderItemCustomization] = []
    sections: List[OrderItemSection] = []
    notes: Optional[str] = None

class OrderItemCreate(OrderItemBase):
    pass

class OrderItem(OrderItemBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    product_name: str
    product_type: str
    unit_price: float
    total_price: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class OrderItemUpdate(BaseModel):
    quantity: Optional[int] = None
    customizations: Optional[List[OrderItemCustomization]] = None
    notes: Optional[str] = None

class OrderBase(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    cashier_id: Optional[str] = None
    table_number: Optional[int] = None
    order_type: OrderType = OrderType.DINE_IN
    notes: Optional[str] = None

class OrderCreate(OrderBase):
    items: List[OrderItemCreate] = []

class Order(OrderBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    status: OrderStatus = OrderStatus.PENDING
    payment_status: PaymentStatus = PaymentStatus.PENDING
    payment_method: Optional[PaymentMethod] = None
    items: List[OrderItem] = []
    subtotal: float = 0.0
    tax: float = 0.0
    discount: float = 0.0
    total: float = 0.0
    
    # New fields for coupon and points redemption
    applied_coupon_code: Optional[str] = None
    coupon_discount: float = 0.0
    points_redeemed: Optional[int] = None
    points_discount: float = 0.0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    payment_status: Optional[PaymentStatus] = None
    payment_method: Optional[PaymentMethod] = None
    tax: Optional[float] = None
    discount: Optional[float] = None
    notes: Optional[str] = None
    
    # New fields for coupon and points redemption
    applied_coupon_code: Optional[str] = None
    coupon_discount: Optional[float] = None
    points_redeemed: Optional[int] = None
    points_discount: Optional[float] = None

# New models for applying discounts during order finalization
class ApplyCouponRequest(BaseModel):
    coupon_code: str
    
class ApplyPointsRequest(BaseModel):
    points_to_redeem: int

class DiscountResponse(BaseModel):
    subtotal: float
    coupon_discount: float = 0.0
    points_discount: float = 0.0
    total_discount: float
    tax: float
    total: float
    applied_coupon_code: Optional[str] = None
    points_redeemed: Optional[int] = None
    remaining_points: Optional[int] = None
