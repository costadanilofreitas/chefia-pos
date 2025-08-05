from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid
from enum import Enum


# === Category Model ===
class Category(BaseModel):
    """Model for inventory categories."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str
    description: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# === Unit of Measure Models ===
class UnitType(str, Enum):
    """Enum for unit of measure types."""

    UNIT = "unit"  # Individual units (e.g., each, piece)
    WEIGHT = "weight"  # Weight-based (e.g., kg, g)
    VOLUME = "volume"  # Volume-based (e.g., l, ml)
    LENGTH = "length"  # Length-based (e.g., m, cm)
    TIME = "time"  # Time-based (e.g., hour, minute)


class UnitOfMeasure(BaseModel):
    """Model for units of measure."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str  # e.g., "kilogram", "liter", "piece"
    abbreviation: str  # e.g., "kg", "l", "pc"
    type: UnitType
    conversion_factor: float = 1.0  # For conversions within the same type


# === Inventory Item Models ===
class InventoryItemBase(BaseModel):
    """Base model for inventory items."""

    name: str
    description: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    unit_of_measure_id: uuid.UUID
    minimum_stock: float = 0
    reorder_point: float = 0
    maximum_stock: Optional[float] = None
    is_active: bool = True


class InventoryItemCreate(InventoryItemBase):
    """Model for creating a new inventory item."""

    initial_stock: float = 0
    cost_per_unit: float = 0


class InventoryItem(InventoryItemBase):
    """Model representing an inventory item in the system."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    current_stock: float = 0
    cost_per_unit: float = 0
    value: float = 0  # current_stock * cost_per_unit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_stock_update: Optional[datetime] = None

    class Config:
        orm_mode = True


class InventoryItemUpdate(BaseModel):
    """Model for updating inventory item details."""

    name: Optional[str] = None
    description: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    unit_of_measure_id: Optional[uuid.UUID] = None
    minimum_stock: Optional[float] = None
    reorder_point: Optional[float] = None
    maximum_stock: Optional[float] = None
    cost_per_unit: Optional[float] = None
    is_active: Optional[bool] = None


# === Inventory Transaction Models ===
class TransactionType(str, Enum):
    """Enum for inventory transaction types."""

    PURCHASE = "purchase"  # Stock added from purchase
    SALE = "sale"  # Stock removed from sale
    ADJUSTMENT = "adjustment"  # Manual adjustment
    TRANSFER = "transfer"  # Transfer between locations
    RETURN = "return"  # Return to inventory
    LOSS = "loss"  # Loss/waste/spoilage
    PRODUCTION = "production"  # Used in production
    INITIAL = "initial"  # Initial stock setup


class TransactionStatus(str, Enum):
    """Enum for inventory transaction statuses."""

    PENDING = "pending"  # Awaiting approval
    APPROVED = "approved"  # Approved and processed
    REJECTED = "rejected"  # Rejected
    CANCELLED = "cancelled"  # Cancelled


class InventoryTransactionBase(BaseModel):
    """Base model for inventory transactions."""

    item_id: uuid.UUID
    quantity: float
    transaction_type: TransactionType
    reference_id: Optional[uuid.UUID] = None  # Order ID, Purchase ID, etc.
    reference_type: Optional[str] = None  # "order", "purchase", etc.
    notes: Optional[str] = None
    unit_cost: Optional[float] = None  # Cost at time of transaction


class InventoryTransactionCreate(InventoryTransactionBase):
    """Model for creating a new inventory transaction."""

    pass


class InventoryTransaction(InventoryTransactionBase):
    """Model representing an inventory transaction in the system."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    previous_stock: float
    new_stock: float
    value_change: float  # quantity * unit_cost
    status: TransactionStatus = TransactionStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    approved_by: Optional[uuid.UUID] = None
    approved_at: Optional[datetime] = None

    class Config:
        orm_mode = True


# === Inventory Loss Models ===
class LossReason(str, Enum):
    """Enum for inventory loss reasons."""

    SPOILAGE = "spoilage"  # Food spoilage
    BREAKAGE = "breakage"  # Physical damage
    THEFT = "theft"  # Theft
    EXPIRATION = "expiration"  # Expired items
    QUALITY_ISSUE = "quality"  # Quality issues
    COOKING_ERROR = "cooking"  # Cooking errors
    OTHER = "other"  # Other reasons


class InventoryLossBase(BaseModel):
    """Base model for inventory losses."""

    item_id: uuid.UUID
    quantity: float
    reason: LossReason
    notes: Optional[str] = None
    reported_by: uuid.UUID


class InventoryLossCreate(InventoryLossBase):
    """Model for creating a new inventory loss record."""

    pass


class InventoryLoss(InventoryLossBase):
    """Model representing an inventory loss in the system."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    transaction_id: Optional[uuid.UUID] = None  # Link to inventory transaction
    financial_entry_id: Optional[uuid.UUID] = None  # Link to financial entry
    value: float  # quantity * cost_per_unit at time of loss
    status: TransactionStatus = TransactionStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    approved_by: Optional[uuid.UUID] = None
    approved_at: Optional[datetime] = None

    class Config:
        orm_mode = True


# === Inventory Count Models ===
class InventoryCountStatus(str, Enum):
    """Enum for inventory count statuses."""

    DRAFT = "draft"  # In progress
    SUBMITTED = "submitted"  # Submitted for review
    APPROVED = "approved"  # Approved and processed
    REJECTED = "rejected"  # Rejected


class InventoryCountItemBase(BaseModel):
    """Base model for inventory count items."""

    item_id: uuid.UUID
    expected_quantity: float
    actual_quantity: float
    notes: Optional[str] = None


class InventoryCountItem(InventoryCountItemBase):
    """Model representing an item in an inventory count."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    variance: float  # actual_quantity - expected_quantity
    variance_percentage: float  # (variance / expected_quantity) * 100
    value_variance: float  # variance * cost_per_unit

    class Config:
        orm_mode = True


class InventoryCountBase(BaseModel):
    """Base model for inventory counts."""

    name: str
    description: Optional[str] = None
    count_date: datetime
    notes: Optional[str] = None
    counted_by: uuid.UUID


class InventoryCountCreate(InventoryCountBase):
    """Model for creating a new inventory count."""

    items: List[InventoryCountItemBase]


class InventoryCount(InventoryCountBase):
    """Model representing an inventory count in the system."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    items: List[InventoryCountItem] = []
    total_variance: float = 0
    total_value_variance: float = 0
    status: InventoryCountStatus = InventoryCountStatus.DRAFT
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    approved_by: Optional[uuid.UUID] = None
    approved_at: Optional[datetime] = None

    class Config:
        orm_mode = True


# === Financial Integration Models ===
class FinancialEntryType(str, Enum):
    """Enum for financial entry types related to inventory."""

    INVENTORY_PURCHASE = "inventory_purchase"
    INVENTORY_LOSS = "inventory_loss"
    INVENTORY_ADJUSTMENT = "inventory_adjustment"
    INVENTORY_VALUATION = "inventory_valuation"


class FinancialEntry(BaseModel):
    """Model for financial entries related to inventory."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    entry_type: FinancialEntryType
    reference_id: uuid.UUID  # Transaction ID, Loss ID, etc.
    reference_type: str  # "transaction", "loss", etc.
    amount: float
    description: str
    account_id: uuid.UUID  # Financial account ID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    posted_at: Optional[datetime] = None
    is_posted: bool = False

    class Config:
        orm_mode = True
