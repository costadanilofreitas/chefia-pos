# /home/ubuntu/pos-modern/src/stock/models/stock_models.py

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
import uuid


class StockItemBase(BaseModel):
    """Base model for stock items (products or ingredients)."""

    name: str = Field(..., description="Name of the stock item")
    unit: str = Field(..., description="Unit of measurement (e.g., kg, unit, L)")
    low_stock_threshold: Optional[float] = Field(
        None, description="Threshold below which stock is considered low"
    )
    # Link to product/ingredient ID if applicable - needs refinement based on Product module
    product_id: Optional[uuid.UUID] = Field(
        None, description="Optional link to the Product ID"
    )
    ingredient_id: Optional[uuid.UUID] = Field(
        None,
        description="Optional link to an Ingredient ID if using component-based stock",
    )


class StockItemCreate(StockItemBase):
    """Model for creating a new stock item."""

    initial_quantity: float = Field(
        0.0, description="Initial quantity when creating the item"
    )


class StockItem(StockItemBase):
    """Model representing a stock item with its ID and current quantity."""

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4, description="Unique identifier for the stock item"
    )
    current_quantity: float = Field(..., description="Current quantity in stock")
    last_updated: datetime = Field(
        default_factory=datetime.utcnow, description="Timestamp of the last update"
    )

    class Config:
        orm_mode = True  # Or from_attributes = True for Pydantic v2


class StockMovementBase(BaseModel):
    """Base model for stock movements."""

    stock_item_id: uuid.UUID = Field(
        ..., description="ID of the stock item being moved"
    )
    quantity: float = Field(
        ...,
        description="Quantity being moved (positive for entry, negative for exit/adjustment)",
    )
    movement_type: Literal["entry", "exit", "adjustment", "sale"] = Field(
        ..., description="Type of stock movement"
    )
    reason: Optional[str] = Field(
        None, description="Reason for the movement (e.g., purchase, waste, sale ID)"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Timestamp of the movement"
    )


class StockMovementCreate(StockMovementBase):
    """Model for creating a new stock movement record."""

    pass


class StockMovement(StockMovementBase):
    """Model representing a recorded stock movement."""

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        description="Unique identifier for the stock movement",
    )

    class Config:
        orm_mode = True  # Or from_attributes = True for Pydantic v2


class StockLevel(BaseModel):
    """Model representing the current level of a stock item."""

    stock_item_id: uuid.UUID
    name: str
    current_quantity: float
    unit: str
    low_stock_threshold: Optional[float]
    is_low: bool = Field(
        False, description="Indicates if the current quantity is below the threshold"
    )


class StockReport(BaseModel):
    """Model for stock reports."""

    report_type: Literal["current_levels", "low_stock", "movement_history"]
    data: List[StockLevel] | List[StockMovement]  # Depending on report_type
    generated_at: datetime = Field(default_factory=datetime.utcnow)
