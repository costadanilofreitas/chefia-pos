from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
import uuid
from enum import Enum

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
        from_attributes = True

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

