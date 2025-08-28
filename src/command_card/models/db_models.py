"""
SQLAlchemy database models for Command Card system
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

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
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

from src.command_card.models.command_card_models import (
    CommandCardStatus,
    CommandCardType,
    CommandSessionStatus,
    PaymentResponsibility,
)

Base = declarative_base()


class CommandCardDB(Base):
    """Database model for command cards"""

    __tablename__ = "command_cards"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    card_number = Column(String(50), nullable=False)
    card_type = Column(Enum(CommandCardType), default=CommandCardType.PHYSICAL)
    barcode = Column(String(100))
    qr_code = Column(String(200))
    nfc_tag = Column(String(100))
    description = Column(String(200))
    status = Column(Enum(CommandCardStatus), default=CommandCardStatus.AVAILABLE)

    # Usage tracking
    times_used = Column(Integer, default=0)
    last_used_at = Column(DateTime)
    last_used_by = Column(PostgresUUID(as_uuid=True))

    # Current assignment
    current_session_id = Column(PostgresUUID(as_uuid=True))
    assigned_table_id = Column(PostgresUUID(as_uuid=True))
    assigned_customer_id = Column(PostgresUUID(as_uuid=True))

    # Timestamps
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    created_by = Column(PostgresUUID(as_uuid=True), nullable=False)

    # Store association
    store_id = Column(String(50), nullable=False)

    # Metadata
    metadata_json = Column(JSON, default={})
    version = Column(Integer, default=1)

    # Relationships
    sessions = relationship("CommandSessionDB", back_populates="card")
    items = relationship("CommandItemDB", back_populates="card")

    __table_args__ = (
        UniqueConstraint("store_id", "card_number", name="_store_card_number_uc"),
    )

    def __repr__(self):
        return f"<CommandCard(number={self.card_number}, status={self.status})>"


class CommandSessionDB(Base):
    """Database model for command sessions"""

    __tablename__ = "command_sessions"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    card_id = Column(PostgresUUID(as_uuid=True), ForeignKey("command_cards.id"), nullable=False)
    status = Column(Enum(CommandSessionStatus), default=CommandSessionStatus.ACTIVE)

    # Customer information
    customer_name = Column(String(100))
    customer_phone = Column(String(20))
    customer_id = Column(PostgresUUID(as_uuid=True))
    table_id = Column(PostgresUUID(as_uuid=True))
    waiter_id = Column(PostgresUUID(as_uuid=True))
    people_count = Column(Integer, default=1)
    payment_responsibility = Column(Enum(PaymentResponsibility))
    notes = Column(Text)

    # Financial
    total_amount = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    credit_amount = Column(Float, default=0.0)
    credit_limit = Column(Float)
    discount_amount = Column(Float, default=0.0)
    service_charge = Column(Float, default=0.0)

    # Orders tracking
    item_count = Column(Integer, default=0)

    # Timing
    started_at = Column(DateTime, nullable=False, server_default=func.now())
    suspended_at = Column(DateTime)
    closed_at = Column(DateTime)
    paid_at = Column(DateTime)

    # Authorization
    require_authorization = Column(Boolean, default=False)
    authorized_by = Column(PostgresUUID(as_uuid=True))
    authorization_timestamp = Column(DateTime)

    # Store and terminal
    store_id = Column(String(50), nullable=False)
    terminal_id = Column(String(50), nullable=False)

    # Metadata
    metadata_json = Column(JSON, default={})
    version = Column(Integer, default=1)

    # Relationships
    card = relationship("CommandCardDB", back_populates="sessions")
    items = relationship("CommandItemDB", back_populates="session")
    transfers_from = relationship("CommandTransferDB", 
                                 foreign_keys="CommandTransferDB.from_session_id",
                                 back_populates="from_session")
    transfers_to = relationship("CommandTransferDB",
                               foreign_keys="CommandTransferDB.to_session_id",
                               back_populates="to_session")

    def __repr__(self):
        return f"<CommandSession(id={self.id}, status={self.status})>"


class CommandItemDB(Base):
    """Database model for command items"""

    __tablename__ = "command_items"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id = Column(PostgresUUID(as_uuid=True), ForeignKey("command_sessions.id"), nullable=False)
    card_id = Column(PostgresUUID(as_uuid=True), ForeignKey("command_cards.id"), nullable=False)

    # Product info
    product_id = Column(PostgresUUID(as_uuid=True), nullable=False)
    product_name = Column(String(200), nullable=False)
    product_code = Column(String(50), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)

    # Discounts
    discount_amount = Column(Float, default=0.0)
    discount_percentage = Column(Float, default=0.0)

    # Status
    status = Column(String(50), nullable=False)  # PENDING, CONFIRMED, PREPARING, etc.

    # Who added
    added_by = Column(PostgresUUID(as_uuid=True), nullable=False)
    added_at = Column(DateTime, nullable=False, server_default=func.now())
    terminal_id = Column(String(50), nullable=False)

    # Delivery
    delivered_at = Column(DateTime)
    delivered_by = Column(PostgresUUID(as_uuid=True))

    # Cancellation
    cancelled_at = Column(DateTime)
    cancelled_by = Column(PostgresUUID(as_uuid=True))
    cancellation_reason = Column(String(200))

    # Relationships
    session = relationship("CommandSessionDB", back_populates="items")
    card = relationship("CommandCardDB", back_populates="items")

    def __repr__(self):
        return f"<CommandItem(product={self.product_name}, qty={self.quantity})>"


class CommandTransferDB(Base):
    """Database model for command transfers"""

    __tablename__ = "command_transfers"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    from_card_id = Column(PostgresUUID(as_uuid=True), nullable=False)
    to_card_id = Column(PostgresUUID(as_uuid=True), nullable=False)
    from_session_id = Column(PostgresUUID(as_uuid=True), ForeignKey("command_sessions.id"), nullable=False)
    to_session_id = Column(PostgresUUID(as_uuid=True), ForeignKey("command_sessions.id"))

    # What to transfer
    transfer_all = Column(Boolean, default=True)
    amount = Column(Float)

    # Authorization
    authorized_by = Column(PostgresUUID(as_uuid=True), nullable=False)
    reason = Column(String(200))

    # Timing
    requested_at = Column(DateTime, nullable=False, server_default=func.now())
    completed_at = Column(DateTime)

    # Status
    status = Column(String(50), nullable=False)  # PENDING, COMPLETED, FAILED, CANCELLED
    error_message = Column(String(500))

    # Relationships
    from_session = relationship("CommandSessionDB", 
                               foreign_keys=[from_session_id],
                               back_populates="transfers_from")
    to_session = relationship("CommandSessionDB",
                             foreign_keys=[to_session_id],
                             back_populates="transfers_to")

    def __repr__(self):
        return f"<CommandTransfer(from={self.from_card_id}, to={self.to_card_id})>"


class CommandConfigurationDB(Base):
    """Database model for command card configuration"""

    __tablename__ = "command_configurations"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    store_id = Column(String(50), nullable=False, unique=True)

    # General settings
    enabled = Column(Boolean, default=True)
    require_deposit = Column(Boolean, default=False)
    deposit_amount = Column(Float, default=0.0)

    # Card settings
    auto_generate_numbers = Column(Boolean, default=True)
    number_prefix = Column(String(10), default="CMD")
    number_length = Column(Integer, default=6)
    allow_duplicate_active = Column(Boolean, default=False)

    # Session settings
    auto_close_after_hours = Column(Integer, default=8)
    require_customer_info = Column(Boolean, default=False)
    require_table_assignment = Column(Boolean, default=False)
    allow_credit = Column(Boolean, default=False)
    default_credit_limit = Column(Float, default=0.0)

    # Security
    require_authorization_above = Column(Float)
    require_manager_for_transfer = Column(Boolean, default=True)
    require_pin_for_payment = Column(Boolean, default=False)

    # Integration
    sync_with_table_system = Column(Boolean, default=True)
    sync_with_queue_system = Column(Boolean, default=True)
    print_receipt_on_close = Column(Boolean, default=True)

    # Notifications
    notify_on_high_balance = Column(Boolean, default=True)
    high_balance_threshold = Column(Float, default=500.0)
    notify_on_long_session = Column(Boolean, default=True)
    long_session_hours = Column(Integer, default=4)

    # Timestamps
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<CommandConfiguration(store={self.store_id})>"