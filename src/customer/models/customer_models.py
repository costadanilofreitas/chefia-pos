# /home/ubuntu/pos-modern/src/customer/models/customer_models.py

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Literal
from datetime import datetime, date
import uuid
from enum import Enum

# === Address Model ===
class Address(BaseModel):
    """Model for customer addresses."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    street: str
    number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: str
    city: str
    state: str
    zip_code: str
    is_primary: bool = False

# === Loyalty Model ===
class Loyalty(BaseModel):
    """Model for customer loyalty information."""
    points: int = 0
    level: Optional[str] = None # e.g., Bronze, Silver, Gold
    last_updated: datetime = Field(default_factory=datetime.utcnow)

# === Purchase History Model ===
class PurchaseHistoryEntry(BaseModel):
    """Model for a single purchase entry in customer history."""
    order_id: uuid.UUID # Link to the Order ID
    purchase_date: datetime
    total_amount: float
    items_summary: Optional[str] = None # e.g., "2x Burger, 1x Fries"

# === Coupon Models ===
class CouponType(str, Enum):
    """Enum for coupon discount types."""
    PERCENTAGE = "percentage"  # Percentage discount (e.g., 10% off)
    FIXED = "fixed"            # Fixed amount discount (e.g., R$10 off)

class CouponScope(str, Enum):
    """Enum for coupon application scope."""
    ORDER = "order"            # Applies to entire order
    PRODUCT = "product"        # Applies to specific product(s)

class CouponBase(BaseModel):
    """Base model for coupon data."""
    code: str = Field(..., description="Unique coupon code")
    description: str = Field(..., description="Description of the coupon")
    discount_type: CouponType = Field(..., description="Type of discount (percentage or fixed)")
    discount_value: float = Field(..., description="Value of the discount (percentage or fixed amount)")
    scope: CouponScope = Field(..., description="Scope of the coupon (order or product)")
    product_id: Optional[uuid.UUID] = Field(None, description="Product ID if scope is PRODUCT")
    min_order_value: Optional[float] = Field(None, description="Minimum order value required")
    max_discount: Optional[float] = Field(None, description="Maximum discount amount (for percentage discounts)")
    valid_from: date = Field(..., description="Start date of validity")
    valid_until: Optional[date] = Field(None, description="End date of validity (None = no expiration)")
    max_uses: Optional[int] = Field(None, description="Maximum number of uses (None = unlimited)")
    is_active: bool = Field(True, description="Whether the coupon is active")

class CouponCreate(CouponBase):
    """Model for creating a new coupon."""
    pass

class Coupon(CouponBase):
    """Model representing a coupon in the system."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, description="Unique identifier for the coupon")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    uses_count: int = Field(0, description="Number of times the coupon has been used")
    
    class Config:
        orm_mode = True # Or from_attributes = True for Pydantic v2

class CouponUpdate(BaseModel):
    """Model for updating coupon details."""
    description: Optional[str] = None
    discount_value: Optional[float] = None
    min_order_value: Optional[float] = None
    max_discount: Optional[float] = None
    valid_until: Optional[date] = None
    max_uses: Optional[int] = None
    is_active: Optional[bool] = None

class CouponRedemption(BaseModel):
    """Model for recording a coupon redemption."""
    coupon_id: uuid.UUID
    order_id: uuid.UUID
    customer_id: Optional[uuid.UUID] = None
    discount_amount: float
    redeemed_at: datetime = Field(default_factory=datetime.utcnow)

# === Points Redemption Model ===
class PointsRedemption(BaseModel):
    """Model for recording a loyalty points redemption."""
    customer_id: uuid.UUID
    order_id: uuid.UUID
    points_redeemed: int
    discount_amount: float
    redeemed_at: datetime = Field(default_factory=datetime.utcnow)

# === Customer Model ===
class CustomerBase(BaseModel):
    """Base model for customer data."""
    name: str = Field(..., description="Full name of the customer")
    phone: Optional[str] = Field(None, description="Primary phone number")
    email: Optional[EmailStr] = Field(None, description="Primary email address")

class CustomerCreate(CustomerBase):
    """Model for creating a new customer."""
    addresses: Optional[List[Address]] = []

class Customer(CustomerBase):
    """Model representing a customer in the system."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, description="Unique identifier for the customer")
    addresses: List[Address] = []
    loyalty: Loyalty = Field(default_factory=Loyalty)
    purchase_history: List[PurchaseHistoryEntry] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_updated: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        orm_mode = True # Or from_attributes = True for Pydantic v2

class CustomerUpdate(BaseModel):
    """Model for updating customer details (excluding loyalty/history)."""
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    # Addresses are managed via separate endpoints
