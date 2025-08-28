"""
SQLAlchemy models for order module - PostgreSQL integration.
"""

from uuid import uuid4

from sqlalchemy import (
    DECIMAL,
    JSON,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import func
from src.core.optimistic_lock import OptimisticLockMixin


class Base(DeclarativeBase):
    pass


class Order(Base, OptimisticLockMixin):
    """SQLAlchemy model for orders table with optimistic locking."""

    __tablename__ = "orders"
    __table_args__ = {"schema": "pos_modern"}

    order_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    client_id = Column(String(50), nullable=False)
    store_id = Column(String(50), nullable=False)
    order_number = Column(String(20), nullable=False)
    status = Column(
        String(20), nullable=False
    )  # pending, confirmed, preparing, ready, delivered, cancelled
    order_type = Column(
        String(20), default="dine_in", nullable=False
    )  # dine_in, takeout, delivery
    customer_id = Column(UUID(as_uuid=True), nullable=True)
    waiter_id = Column(UUID(as_uuid=True), nullable=True)
    table_id = Column(UUID(as_uuid=True), nullable=True)
    business_day_id = Column(UUID(as_uuid=True), nullable=True)
    cashier_id = Column(UUID(as_uuid=True), nullable=True)
    subtotal: Column = Column(DECIMAL(10, 2), nullable=False)
    tax: Column = Column(DECIMAL(10, 2), default=0.0, nullable=False)
    discount: Column = Column(DECIMAL(10, 2), default=0.0, nullable=False)
    service_fee: Column = Column(DECIMAL(10, 2), default=0.0, nullable=False)
    delivery_fee: Column = Column(DECIMAL(10, 2), default=0.0, nullable=False)
    total: Column = Column(DECIMAL(10, 2), nullable=False)
    payment_status = Column(
        String(20), default="pending", nullable=False
    )  # pending, paid, partial, refunded
    payment_method = Column(
        String(20), nullable=True
    )  # cash, credit_card, debit_card, pix, voucher
    notes = Column(Text, nullable=True)
    delivery_address = Column(JSON, nullable=True)
    estimated_preparation_time = Column(Integer, nullable=True)  # minutes
    preparation_started_at = Column(DateTime(timezone=True), nullable=True)
    ready_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class OrderItem(Base):
    """SQLAlchemy model for order_items table."""

    __tablename__ = "order_items"
    __table_args__ = {"schema": "pos_modern"}

    item_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pos_modern.orders.order_id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id = Column(UUID(as_uuid=True), nullable=False)
    product_name = Column(String(100), nullable=False)  # snapshot for consistency
    quantity: Column = Column(DECIMAL(10, 3), nullable=False)
    unit_price: Column = Column(DECIMAL(10, 2), nullable=False)
    subtotal: Column = Column(DECIMAL(10, 2), nullable=False)
    status = Column(
        String(20), default="pending", nullable=False
    )  # pending, preparing, ready, delivered, cancelled
    notes = Column(Text, nullable=True)
    customizations = Column(JSON, nullable=True)  # options, modifications, etc.
    preparation_time = Column(Integer, nullable=True)  # minutes
    preparation_started_at = Column(DateTime(timezone=True), nullable=True)
    ready_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class OrderDiscount(Base):
    """SQLAlchemy model for order discounts."""

    __tablename__ = "order_discounts"
    __table_args__ = {"schema": "pos_modern"}

    discount_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pos_modern.orders.order_id", ondelete="CASCADE"),
        nullable=False,
    )
    discount_type = Column(
        String(20), nullable=False
    )  # coupon, points, percentage, fixed
    discount_code = Column(String(50), nullable=True)
    discount_amount: Column = Column(DECIMAL(10, 2), nullable=False)
    discount_percentage: Column = Column(DECIMAL(5, 2), nullable=True)
    description = Column(String(255), nullable=True)
    applied_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class OrderPayment(Base):
    """SQLAlchemy model for order payments."""

    __tablename__ = "order_payments"
    __table_args__ = {"schema": "pos_modern"}

    payment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pos_modern.orders.order_id", ondelete="CASCADE"),
        nullable=False,
    )
    payment_method = Column(
        String(20), nullable=False
    )  # cash, credit_card, debit_card, pix, voucher
    amount: Column = Column(DECIMAL(10, 2), nullable=False)
    status = Column(
        String(20), default="pending", nullable=False
    )  # pending, completed, failed, refunded
    transaction_id = Column(String(100), nullable=True)
    provider_payment_id = Column(String(100), nullable=True)
    processed_by = Column(UUID(as_uuid=True), nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class OrderHistory(Base):
    """SQLAlchemy model for order status history."""

    __tablename__ = "order_history"
    __table_args__ = {"schema": "pos_modern"}

    history_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pos_modern.orders.order_id", ondelete="CASCADE"),
        nullable=False,
    )
    previous_status = Column(String(20), nullable=True)
    new_status = Column(String(20), nullable=False)
    changed_by = Column(UUID(as_uuid=True), nullable=False)
    reason = Column(Text, nullable=True)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
