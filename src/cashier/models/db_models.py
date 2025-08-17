"""
SQLAlchemy models for cashier module - PostgreSQL integration.
"""

from uuid import uuid4

from sqlalchemy import DECIMAL, JSON, Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class Cashier(Base):
    """SQLAlchemy model for cashiers table."""

    __tablename__ = "cashiers"
    __table_args__ = {"schema": "pos_modern"}

    cashier_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    client_id = Column(String(50), nullable=False)
    store_id = Column(String(50), nullable=False)
    terminal_id = Column(String(50), nullable=False)
    business_day_id = Column(UUID(as_uuid=True), nullable=False)
    status = Column(String(20), nullable=False)  # open, closed
    current_operator_id = Column(UUID(as_uuid=True), nullable=True)
    opening_balance: Column = Column(DECIMAL(10, 2), default=0.0, nullable=False)
    current_balance: Column = Column(DECIMAL(10, 2), default=0.0, nullable=False)
    expected_balance: Column = Column(DECIMAL(10, 2), default=0.0, nullable=False)
    physical_cash_amount: Column = Column(DECIMAL(10, 2), nullable=True)
    cash_difference: Column = Column(DECIMAL(10, 2), nullable=True)
    opened_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
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


class CashierOperation(Base):
    """SQLAlchemy model for cashier operations."""

    __tablename__ = "cashier_operations"
    __table_args__ = {"schema": "pos_modern"}

    operation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    cashier_id = Column(UUID(as_uuid=True), nullable=False)
    operation_type = Column(
        String(20), nullable=False
    )  # opening, closing, withdrawal, deposit, sale, refund
    amount: Column = Column(DECIMAL(10, 2), nullable=False)
    operator_id = Column(UUID(as_uuid=True), nullable=False)
    payment_method = Column(
        String(20), nullable=True
    )  # cash, credit_card, debit_card, pix, voucher, ifood
    related_entity_id = Column(
        UUID(as_uuid=True), nullable=True
    )  # order_id, payment_id, etc.
    balance_before: Column = Column(DECIMAL(10, 2), nullable=False)
    balance_after: Column = Column(DECIMAL(10, 2), nullable=False)
    notes = Column(Text, nullable=True)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class CashierWithdrawal(Base):
    """SQLAlchemy model for cashier withdrawals (rupturas)."""

    __tablename__ = "cashier_withdrawals"
    __table_args__ = {"schema": "pos_modern"}

    withdrawal_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    cashier_id = Column(UUID(as_uuid=True), nullable=False)
    operation_id = Column(UUID(as_uuid=True), nullable=False)
    amount: Column = Column(DECIMAL(10, 2), nullable=False)
    operator_id = Column(UUID(as_uuid=True), nullable=False)
    authorized_by = Column(UUID(as_uuid=True), nullable=True)
    reason = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
