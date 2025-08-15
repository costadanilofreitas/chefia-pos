# Stock module database models for PostgreSQL

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy import Enum as SqlEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ...core.database.connection import Base


# Enums
class MovementTypeEnum(str, enum.Enum):
    ENTRY = "entry"  # Stock incoming (purchases, returns)
    EXIT = "exit"  # Stock outgoing (usage, waste)
    ADJUSTMENT = "adjustment"  # Manual stock adjustments
    SALE = "sale"  # Stock reduction due to sales


class StockItemDB(Base):
    """Database model for stock items."""

    __tablename__ = "stock_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Basic item information
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    unit = Column(String, nullable=False)  # kg, unit, L, etc.

    # References to other entities
    product_id = Column(
        String, nullable=True, index=True
    )  # Reference to product if applicable
    ingredient_id = Column(
        String, nullable=True, index=True
    )  # Reference to ingredient if applicable
    supplier_id = Column(String, nullable=True, index=True)  # Reference to supplier
    category_id = Column(String, nullable=True, index=True)  # Reference to category

    # Quantity tracking
    current_quantity = Column(Float, nullable=False, default=0.0, index=True)
    reserved_quantity = Column(
        Float, nullable=False, default=0.0
    )  # Quantity reserved for orders
    available_quantity = Column(
        Float, nullable=False, default=0.0
    )  # current - reserved

    # Stock management
    low_stock_threshold = Column(Float, nullable=True)
    reorder_point = Column(Float, nullable=True)
    max_stock_level = Column(Float, nullable=True)

    # Cost tracking
    unit_cost = Column(Float, nullable=True)  # Cost per unit
    total_value = Column(Float, nullable=True)  # current_quantity * unit_cost

    # Location and storage
    storage_location = Column(String, nullable=True)
    barcode = Column(String, nullable=True, unique=True, index=True)
    sku = Column(String, nullable=True, unique=True, index=True)  # Stock Keeping Unit

    # Expiration tracking
    has_expiration = Column(Boolean, default=False)
    days_until_expiration = Column(
        Integer, nullable=True
    )  # Average days until expiration

    # Status
    is_active = Column(Boolean, default=True, index=True)
    is_tracked = Column(Boolean, default=True)  # Whether to track this item's stock

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    last_updated = Column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )  # Last stock update

    # Relationships
    movements = relationship(
        "StockMovementDB", back_populates="stock_item", cascade="all, delete-orphan"
    )
    batches = relationship(
        "StockBatchDB", back_populates="stock_item", cascade="all, delete-orphan"
    )


class StockMovementDB(Base):
    """Database model for stock movements."""

    __tablename__ = "stock_movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    stock_item_id = Column(
        UUID(as_uuid=True), ForeignKey("stock_items.id"), nullable=False, index=True
    )

    # Movement details
    quantity = Column(
        Float, nullable=False
    )  # Positive for entry, negative for exit/adjustment
    movement_type = Column(SqlEnum(MovementTypeEnum), nullable=False, index=True)
    reason = Column(String, nullable=True)
    description = Column(Text, nullable=True)

    # Before/after quantities for audit trail
    quantity_before = Column(Float, nullable=False)
    quantity_after = Column(Float, nullable=False)

    # Cost information
    unit_cost = Column(Float, nullable=True)  # Cost per unit for this movement
    total_cost = Column(Float, nullable=True)  # quantity * unit_cost

    # References to related entities
    order_id = Column(
        String, nullable=True, index=True
    )  # Reference to order if related
    purchase_id = Column(
        String, nullable=True, index=True
    )  # Reference to purchase if related
    batch_id = Column(
        UUID(as_uuid=True), ForeignKey("stock_batches.id"), nullable=True, index=True
    )

    # User and location tracking
    created_by = Column(String, nullable=True, index=True)  # User who made the movement
    location = Column(String, nullable=True)  # Where the movement occurred

    # Document references
    document_number = Column(String, nullable=True)  # Invoice, receipt number, etc.
    document_type = Column(String, nullable=True)  # Type of document

    # Timestamps
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationship
    stock_item = relationship("StockItemDB", back_populates="movements")
    batch = relationship("StockBatchDB", back_populates="movements")


class StockBatchDB(Base):
    """Database model for stock batches (for expiration tracking)."""

    __tablename__ = "stock_batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    stock_item_id = Column(
        UUID(as_uuid=True), ForeignKey("stock_items.id"), nullable=False, index=True
    )

    # Batch identification
    batch_number = Column(String, nullable=False, index=True)
    lot_number = Column(String, nullable=True)

    # Quantities
    initial_quantity = Column(Float, nullable=False)
    current_quantity = Column(Float, nullable=False)
    reserved_quantity = Column(Float, nullable=False, default=0.0)

    # Cost information
    unit_cost = Column(Float, nullable=True)
    total_cost = Column(Float, nullable=True)

    # Dates
    manufactured_date = Column(DateTime, nullable=True)
    expiration_date = Column(DateTime, nullable=True, index=True)
    received_date = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Status
    is_active = Column(Boolean, default=True, index=True)
    is_expired = Column(Boolean, default=False, index=True)

    # Supplier information
    supplier_id = Column(String, nullable=True, index=True)
    supplier_batch_number = Column(String, nullable=True)

    # Document references
    purchase_document = Column(String, nullable=True)
    quality_certificate = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    stock_item = relationship("StockItemDB", back_populates="batches")
    movements = relationship("StockMovementDB", back_populates="batch")


class StockAdjustmentDB(Base):
    """Database model for stock adjustments (cycle counts, corrections)."""

    __tablename__ = "stock_adjustments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Adjustment details
    adjustment_number = Column(String, nullable=False, unique=True, index=True)
    adjustment_type = Column(
        String, nullable=False, index=True
    )  # cycle_count, correction, write_off
    status = Column(
        String, nullable=False, default="pending", index=True
    )  # pending, approved, completed

    # Date range
    adjustment_date = Column(
        DateTime, nullable=False, default=datetime.utcnow, index=True
    )
    completed_date = Column(DateTime, nullable=True)

    # User tracking
    created_by = Column(String, nullable=False, index=True)
    approved_by = Column(String, nullable=True, index=True)

    # Notes and reasons
    reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    # Summary
    items_count = Column(Integer, default=0)
    total_variance_cost = Column(Float, default=0.0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    adjustment_items = relationship(
        "StockAdjustmentItemDB",
        back_populates="adjustment",
        cascade="all, delete-orphan",
    )


class StockAdjustmentItemDB(Base):
    """Database model for individual items in stock adjustments."""

    __tablename__ = "stock_adjustment_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    adjustment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("stock_adjustments.id"),
        nullable=False,
        index=True,
    )
    stock_item_id = Column(
        UUID(as_uuid=True), ForeignKey("stock_items.id"), nullable=False, index=True
    )

    # Quantities
    system_quantity = Column(Float, nullable=False)  # What the system shows
    physical_quantity = Column(Float, nullable=False)  # What was actually counted
    variance_quantity = Column(Float, nullable=False)  # physical - system

    # Cost impact
    unit_cost = Column(Float, nullable=True)
    variance_cost = Column(Float, nullable=True)  # variance_quantity * unit_cost

    # Status
    status = Column(
        String, nullable=False, default="pending"
    )  # pending, approved, applied

    # Notes
    notes = Column(Text, nullable=True)

    # Timestamps
    counted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    adjustment = relationship("StockAdjustmentDB", back_populates="adjustment_items")


class StockAlertDB(Base):
    """Database model for stock alerts and notifications."""

    __tablename__ = "stock_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    stock_item_id = Column(
        UUID(as_uuid=True), ForeignKey("stock_items.id"), nullable=False, index=True
    )

    # Alert details
    alert_type = Column(
        String, nullable=False, index=True
    )  # low_stock, out_of_stock, expiring, expired
    severity = Column(
        String, nullable=False, default="medium", index=True
    )  # low, medium, high, critical

    # Alert data
    current_quantity = Column(Float, nullable=False)
    threshold_quantity = Column(Float, nullable=True)

    # Status
    is_active = Column(Boolean, default=True, index=True)
    is_acknowledged = Column(Boolean, default=False, index=True)

    # User tracking
    acknowledged_by = Column(String, nullable=True, index=True)
    acknowledged_at = Column(DateTime, nullable=True)

    # Message and action
    message = Column(Text, nullable=True)
    suggested_action = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    resolved_at = Column(DateTime, nullable=True)


class StockReportDB(Base):
    """Database model for stock reports."""

    __tablename__ = "stock_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Report details
    report_name = Column(String, nullable=False, index=True)
    report_type = Column(
        String, nullable=False, index=True
    )  # current_levels, low_stock, movement_history, valuation

    # Parameters
    parameters = Column(Text, nullable=True)  # JSON string of report parameters

    # Status
    status = Column(
        String, nullable=False, default="generating", index=True
    )  # generating, completed, failed

    # Results
    file_path = Column(String, nullable=True)  # Path to generated report file
    file_format = Column(String, nullable=True)  # pdf, excel, csv
    record_count = Column(Integer, nullable=True)  # Number of records in report

    # User tracking
    generated_by = Column(String, nullable=False, index=True)

    # Date range
    date_from = Column(DateTime, nullable=True)
    date_to = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    completed_at = Column(DateTime, nullable=True)
