"""Database models for supplier module."""

import enum

from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class PurchaseOrderStatusEnum(str, enum.Enum):
    """Enum for purchase order status."""

    DRAFT = "draft"
    SENT = "sent"
    CONFIRMED = "confirmed"
    PARTIALLY_RECEIVED = "partially_received"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class SupplierDB(Base):
    """Database model for suppliers."""

    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=False), primary_key=True)
    name = Column(String(255), nullable=False, index=True)
    trading_name = Column(String(255), nullable=True)
    document = Column(String(20), nullable=False, unique=True, index=True)
    document_type = Column(String(10), nullable=False, default="CNPJ")

    # Address as JSON
    address = Column(JSON, nullable=False)

    # Contacts as JSON array
    contacts = Column(JSON, nullable=True, default=list)

    # Payment terms as JSON array
    payment_terms = Column(JSON, nullable=True, default=list)

    website = Column(String(255), nullable=True)
    category = Column(String(100), nullable=True, index=True)
    rating = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    purchase_orders = relationship("PurchaseOrderDB", back_populates="supplier")
    supplier_products = relationship("SupplierProductDB", back_populates="supplier")


class SupplierProductDB(Base):
    """Database model for supplier products."""

    __tablename__ = "supplier_products"

    id = Column(UUID(as_uuid=False), primary_key=True)
    supplier_id = Column(
        UUID(as_uuid=False), ForeignKey("suppliers.id"), nullable=False, index=True
    )
    product_id = Column(String(255), nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    supplier_code = Column(String(100), nullable=True)
    unit_price = Column(Float, nullable=False)
    min_order_quantity = Column(Integer, nullable=False, default=1)
    lead_time_days = Column(Integer, nullable=False, default=7)
    is_preferred = Column(Boolean, nullable=False, default=False)
    last_purchase_date = Column(DateTime(timezone=True), nullable=True)
    last_purchase_price = Column(Float, nullable=True)

    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    supplier = relationship("SupplierDB", back_populates="supplier_products")


class PurchaseOrderDB(Base):
    """Database model for purchase orders."""

    __tablename__ = "purchase_orders"

    id = Column(UUID(as_uuid=False), primary_key=True)
    supplier_id = Column(
        UUID(as_uuid=False), ForeignKey("suppliers.id"), nullable=False, index=True
    )
    supplier_name = Column(String(255), nullable=False)
    order_number = Column(String(100), nullable=False, unique=True, index=True)
    status: Column = Column(
        Enum(PurchaseOrderStatusEnum),
        nullable=False,
        default=PurchaseOrderStatusEnum.DRAFT,
        index=True,
    )

    # Items as JSON array
    items = Column(JSON, nullable=False, default=list)

    total_amount = Column(Float, nullable=False)
    expected_delivery_date = Column(DateTime(timezone=True), nullable=True)
    payment_term_days = Column(Integer, nullable=False, default=30)
    notes = Column(Text, nullable=True)

    created_by = Column(String(255), nullable=False)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    sent_at = Column(DateTime(timezone=True), nullable=True)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    received_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    supplier = relationship("SupplierDB", back_populates="purchase_orders")
