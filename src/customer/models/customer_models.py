# /home/ubuntu/pos-modern/src/customer/models/customer_models.py

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid

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
