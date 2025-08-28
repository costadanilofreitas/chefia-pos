"""
SQLAlchemy database models for Reservation System
"""

from datetime import date, datetime, time
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

from src.reservation.models.reservation_models import (
    RecurrenceType,
    ReservationSource,
    ReservationStatus,
    TablePreference,
)

Base = declarative_base()


class ReservationDB(Base):
    """Database model for reservations"""

    __tablename__ = "reservations"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Customer information
    customer_name = Column(String(100), nullable=False)
    customer_phone = Column(String(20), nullable=False)
    customer_email = Column(String(100))
    customer_id = Column(PostgresUUID(as_uuid=True))
    
    # Reservation details
    party_size = Column(Integer, nullable=False)
    reservation_date = Column(Date, nullable=False)
    reservation_time = Column(Time, nullable=False)
    duration_minutes = Column(Integer, default=120)
    
    # Preferences
    table_preferences = Column(JSON, default=[])
    special_requests = Column(Text)
    dietary_restrictions = Column(JSON)
    celebration_type = Column(String(100))
    
    # Status
    source = Column(Enum(ReservationSource), default=ReservationSource.PHONE)
    status = Column(Enum(ReservationStatus), default=ReservationStatus.PENDING)
    confirmation_code = Column(String(20), unique=True, nullable=False)
    
    # Timing
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    confirmed_at = Column(DateTime)
    arrived_at = Column(DateTime)
    seated_at = Column(DateTime)
    completed_at = Column(DateTime)
    cancelled_at = Column(DateTime)
    cancellation_reason = Column(String(200))
    
    # Assignments
    assigned_tables = Column(JSON, default=[])  # List of table IDs
    assigned_by = Column(PostgresUUID(as_uuid=True))
    queue_entry_id = Column(PostgresUUID(as_uuid=True))  # If entered queue
    
    # Financial
    deposit_amount = Column(Float)
    deposit_paid = Column(Boolean, default=False)
    deposit_paid_at = Column(DateTime)
    deposit_refunded = Column(Boolean, default=False)
    deposit_refunded_at = Column(DateTime)
    deposit_transaction_id = Column(String(100))
    
    # Notifications
    notification_sent = Column(Boolean, default=False)
    notification_sent_at = Column(DateTime)
    reminder_sent = Column(Boolean, default=False)
    reminder_sent_at = Column(DateTime)
    notification_advance_minutes = Column(Integer, default=60)
    
    # Recurrence
    recurrence = Column(Enum(RecurrenceType), default=RecurrenceType.NONE)
    recurrence_parent_id = Column(PostgresUUID(as_uuid=True))
    recurrence_end_date = Column(Date)
    
    # Store
    store_id = Column(String(50), nullable=False)
    created_by = Column(PostgresUUID(as_uuid=True))
    
    # Metadata
    metadata_json = Column(JSON, default={})
    version = Column(Integer, default=1)
    
    # Relationships
    tables = relationship("ReservationTableDB", back_populates="reservation")
    history = relationship("ReservationHistoryDB", back_populates="reservation")
    notes = relationship("ReservationNoteDB", back_populates="reservation")
    
    __table_args__ = (
        UniqueConstraint("store_id", "confirmation_code", name="_store_confirmation_uc"),
    )
    
    def __repr__(self):
        return f"<Reservation(name={self.customer_name}, date={self.reservation_date}, status={self.status})>"


class ReservationTableDB(Base):
    """Database model for reservation-table assignments"""

    __tablename__ = "reservation_tables"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    reservation_id = Column(PostgresUUID(as_uuid=True), ForeignKey("reservations.id"), nullable=False)
    table_id = Column(PostgresUUID(as_uuid=True), nullable=False)
    table_number = Column(Integer)
    
    # Assignment details
    assigned_at = Column(DateTime, nullable=False, server_default=func.now())
    assigned_by = Column(PostgresUUID(as_uuid=True))
    released_at = Column(DateTime)
    
    # Status
    is_primary = Column(Boolean, default=True)  # Primary vs additional table
    is_combined = Column(Boolean, default=False)  # Part of combined tables
    combination_group = Column(String(50))  # Group ID for combined tables
    
    # Relationships
    reservation = relationship("ReservationDB", back_populates="tables")
    
    def __repr__(self):
        return f"<ReservationTable(reservation={self.reservation_id}, table={self.table_number})>"


class ReservationHistoryDB(Base):
    """Database model for reservation history/audit log"""

    __tablename__ = "reservation_history"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    reservation_id = Column(PostgresUUID(as_uuid=True), ForeignKey("reservations.id"), nullable=False)
    
    # Action details
    action = Column(String(50), nullable=False)  # CREATED, CONFIRMED, CANCELLED, etc.
    old_status = Column(Enum(ReservationStatus))
    new_status = Column(Enum(ReservationStatus))
    
    # Change tracking
    changed_fields = Column(JSON)  # Which fields were modified
    old_values = Column(JSON)  # Previous values
    new_values = Column(JSON)  # New values
    
    # Who and when
    performed_by = Column(PostgresUUID(as_uuid=True))
    performed_at = Column(DateTime, nullable=False, server_default=func.now())
    reason = Column(String(200))
    
    # Context
    ip_address = Column(String(45))
    user_agent = Column(String(200))
    
    # Relationships
    reservation = relationship("ReservationDB", back_populates="history")
    
    def __repr__(self):
        return f"<ReservationHistory(reservation={self.reservation_id}, action={self.action})>"


class ReservationNoteDB(Base):
    """Database model for reservation notes"""

    __tablename__ = "reservation_notes"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    reservation_id = Column(PostgresUUID(as_uuid=True), ForeignKey("reservations.id"), nullable=False)
    
    # Note content
    note = Column(Text, nullable=False)
    note_type = Column(String(50))  # GENERAL, DIETARY, SPECIAL_REQUEST, etc.
    is_internal = Column(Boolean, default=True)  # Internal vs customer-visible
    
    # Created by
    created_by = Column(PostgresUUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Updated
    updated_at = Column(DateTime)
    updated_by = Column(PostgresUUID(as_uuid=True))
    
    # Relationships
    reservation = relationship("ReservationDB", back_populates="notes")
    
    def __repr__(self):
        return f"<ReservationNote(reservation={self.reservation_id}, type={self.note_type})>"


class BlockedSlotDB(Base):
    """Database model for blocked reservation slots"""

    __tablename__ = "blocked_slots"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Blocking period
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    
    # Reason and scope
    reason = Column(String(200), nullable=False)
    block_type = Column(String(50))  # MAINTENANCE, PRIVATE_EVENT, HOLIDAY, etc.
    tables_affected = Column(JSON)  # None = all tables, or list of table IDs
    
    # Recurrence
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String(50))  # WEEKLY, MONTHLY, etc.
    recurrence_end_date = Column(Date)
    
    # Store
    store_id = Column(String(50), nullable=False)
    
    # Created by
    created_by = Column(PostgresUUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Active status
    is_active = Column(Boolean, default=True)
    deactivated_at = Column(DateTime)
    deactivated_by = Column(PostgresUUID(as_uuid=True))
    
    def __repr__(self):
        return f"<BlockedSlot(date={self.date}, time={self.start_time}-{self.end_time})>"


class ReservationConfigurationDB(Base):
    """Database model for reservation system configuration"""

    __tablename__ = "reservation_configurations"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    store_id = Column(String(50), nullable=False, unique=True)
    
    # General settings
    enabled = Column(Boolean, default=True)
    
    # Timing
    min_advance_hours = Column(Integer, default=1)  # Minimum advance booking
    max_advance_days = Column(Integer, default=30)  # Maximum days in future
    default_duration_minutes = Column(Integer, default=120)
    slot_duration_minutes = Column(Integer, default=15)  # Time slot intervals
    buffer_between_reservations = Column(Integer, default=0)
    
    # Capacity
    max_reservations_per_slot = Column(Integer, default=10)
    max_party_size = Column(Integer, default=20)
    min_party_size = Column(Integer, default=1)
    overbooking_percentage = Column(Float, default=0.1)  # 10% overbooking
    
    # Confirmation
    require_confirmation = Column(Boolean, default=True)
    auto_confirm_regular_customers = Column(Boolean, default=True)
    confirmation_deadline_hours = Column(Integer, default=24)
    
    # Deposit
    require_deposit = Column(Boolean, default=False)
    deposit_amount = Column(Float, default=50.0)
    deposit_percentage = Column(Float, default=0.0)
    deposit_refund_hours = Column(Integer, default=24)
    deposit_minimum_party_size = Column(Integer, default=6)  # Require deposit for parties >= this size
    
    # Notifications
    send_confirmation_sms = Column(Boolean, default=True)
    send_confirmation_email = Column(Boolean, default=True)
    send_reminder = Column(Boolean, default=True)
    reminder_advance_minutes = Column(Integer, default=60)
    sms_template = Column(Text)
    email_template = Column(Text)
    
    # No-show handling
    no_show_grace_minutes = Column(Integer, default=15)
    blacklist_after_no_shows = Column(Integer, default=3)
    no_show_penalty_amount = Column(Float, default=0.0)
    
    # Operating hours (stored as JSON)
    operating_hours = Column(JSON, default={})
    
    # Special dates (stored as JSON)
    special_dates = Column(JSON, default={})  # Holidays, special events, etc.
    
    # Integration
    sync_with_queue = Column(Boolean, default=True)
    sync_with_tables = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<ReservationConfiguration(store={self.store_id})>"


class ReservationBlacklistDB(Base):
    """Database model for managing reservation blacklist"""

    __tablename__ = "reservation_blacklist"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Customer identification
    customer_phone = Column(String(20), nullable=False)
    customer_email = Column(String(100))
    customer_name = Column(String(100))
    
    # Tracking
    no_show_count = Column(Integer, default=0)
    cancellation_count = Column(Integer, default=0)
    total_reservations = Column(Integer, default=0)
    successful_visits = Column(Integer, default=0)
    
    # Blacklist status
    is_blacklisted = Column(Boolean, default=False)
    blacklisted_at = Column(DateTime)
    blacklisted_until = Column(DateTime)
    blacklist_reason = Column(String(200))
    
    # Last incidents
    last_no_show_date = Column(DateTime)
    last_cancellation_date = Column(DateTime)
    
    # Store
    store_id = Column(String(50), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Notes
    notes = Column(Text)
    
    __table_args__ = (
        UniqueConstraint("store_id", "customer_phone", name="_store_phone_blacklist_uc"),
    )
    
    def __repr__(self):
        return f"<ReservationBlacklist(phone={self.customer_phone}, no_shows={self.no_show_count})>"


class ReservationStatsDB(Base):
    """Database model for reservation statistics (denormalized for performance)"""

    __tablename__ = "reservation_stats"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    store_id = Column(String(50), nullable=False)
    date = Column(Date, nullable=False)
    
    # Daily counts
    total_reservations = Column(Integer, default=0)
    confirmed_reservations = Column(Integer, default=0)
    pending_reservations = Column(Integer, default=0)
    cancelled_reservations = Column(Integer, default=0)
    no_show_reservations = Column(Integer, default=0)
    completed_reservations = Column(Integer, default=0)
    
    # Party sizes
    total_guests = Column(Integer, default=0)
    average_party_size = Column(Float)
    max_party_size = Column(Integer)
    
    # Times
    peak_hour = Column(Integer)  # Hour with most reservations
    average_duration_minutes = Column(Float)
    
    # Financial
    total_deposits = Column(Float, default=0.0)
    refunded_deposits = Column(Float, default=0.0)
    forfeited_deposits = Column(Float, default=0.0)
    
    # Performance
    no_show_rate = Column(Float)
    cancellation_rate = Column(Float)
    confirmation_rate = Column(Float)
    table_utilization_rate = Column(Float)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint("store_id", "date", name="_store_date_stats_uc"),
    )
    
    def __repr__(self):
        return f"<ReservationStats(store={self.store_id}, date={self.date})>"