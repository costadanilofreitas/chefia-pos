"""
SQLAlchemy models for business_day module - PostgreSQL integration.
"""

from uuid import uuid4

from sqlalchemy import DECIMAL, JSON, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class BusinessDay(Base):
    """SQLAlchemy model for business_days table."""

    __tablename__ = "business_days"
    __table_args__ = {"schema": "pos_modern"}

    business_day_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    client_id = Column(String(50), nullable=False)
    store_id = Column(String(50), nullable=False)
    date = Column(String(10), nullable=False)  # YYYY-MM-DD format
    status = Column(String(20), nullable=False)  # open, closed
    opened_by = Column(UUID(as_uuid=True), nullable=False)
    closed_by = Column(UUID(as_uuid=True), nullable=True)
    opened_at = Column(DateTime(timezone=True), nullable=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    total_sales: Column = Column(DECIMAL(10, 2), default=0.0, nullable=False)
    total_orders = Column(Integer, default=0, nullable=False)
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


class BusinessDayOperation(Base):
    """SQLAlchemy model for business day operations."""

    __tablename__ = "business_day_operations"
    __table_args__ = {"schema": "pos_modern"}

    operation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    business_day_id = Column(UUID(as_uuid=True), nullable=False)
    operation_type = Column(String(20), nullable=False)  # open, close, update
    operator_id = Column(UUID(as_uuid=True), nullable=False)
    amount: Column = Column(DECIMAL(10, 2), nullable=True)
    notes = Column(Text, nullable=True)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
