# Customer module database models for PostgreSQL

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
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ...core.database.connection import Base


class CustomerDB(Base):
    """Database model for customers."""

    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False, index=True)
    phone = Column(String, index=True)
    email = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_updated = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    addresses = relationship(
        "AddressDB", back_populates="customer", cascade="all, delete-orphan"
    )
    loyalty = relationship(
        "LoyaltyDB",
        back_populates="customer",
        uselist=False,
        cascade="all, delete-orphan",
    )
    purchase_history = relationship(
        "PurchaseHistoryDB", back_populates="customer", cascade="all, delete-orphan"
    )
    points_redemptions = relationship(
        "PointsRedemptionDB", back_populates="customer", cascade="all, delete-orphan"
    )


class AddressDB(Base):
    """Database model for customer addresses."""

    __tablename__ = "customer_addresses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    street = Column(String, nullable=False)
    number = Column(String)
    complement = Column(String)
    neighborhood = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    zip_code = Column(String, nullable=False)
    is_primary = Column(Boolean, default=False)

    # Relationship
    customer = relationship("CustomerDB", back_populates="addresses")


class LoyaltyDB(Base):
    """Database model for customer loyalty information."""

    __tablename__ = "customer_loyalty"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    customer_id = Column(
        UUID(as_uuid=True), ForeignKey("customers.id"), unique=True, nullable=False
    )
    points = Column(Integer, default=0, nullable=False)
    level = Column(String)  # Bronze, Silver, Gold, Platinum
    last_updated = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationship
    customer = relationship("CustomerDB", back_populates="loyalty")


class PurchaseHistoryDB(Base):
    """Database model for customer purchase history."""

    __tablename__ = "customer_purchase_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    order_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    purchase_date = Column(DateTime, nullable=False, index=True)
    total_amount = Column(Float, nullable=False)
    items_summary = Column(Text)

    # Relationship
    customer = relationship("CustomerDB", back_populates="purchase_history")


class PointsRedemptionDB(Base):
    """Database model for loyalty points redemptions."""

    __tablename__ = "customer_points_redemptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    order_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    points_redeemed = Column(Integer, nullable=False)
    discount_amount = Column(Float, nullable=False)
    redeemed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    customer = relationship("CustomerDB", back_populates="points_redemptions")
