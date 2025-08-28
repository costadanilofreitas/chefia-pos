"""
SQLAlchemy database models for Queue Management system
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

from src.queue.models.queue_models import (
    NotificationMethod,
    NotificationStatus,
    PartySize,
    QueueStatus,
)

Base = declarative_base()


class QueueEntryDB(Base):
    """Database model for queue entries"""

    __tablename__ = "queue_entries"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    customer_name = Column(String(100), nullable=False)
    customer_phone = Column(String(20), nullable=False)
    customer_id = Column(PostgresUUID(as_uuid=True))
    party_size = Column(Integer, nullable=False)
    party_size_category = Column(Enum(PartySize), nullable=False)
    
    # Status and position
    status = Column(Enum(QueueStatus), default=QueueStatus.WAITING, nullable=False)
    position_in_queue = Column(Integer, nullable=False)
    
    # Preferences
    table_preferences = Column(JSON, default=[])
    notification_method = Column(Enum(NotificationMethod), default=NotificationMethod.SMS)
    notes = Column(Text)
    
    # Timing
    check_in_time = Column(DateTime, nullable=False, server_default=func.now())
    estimated_wait_minutes = Column(Integer)
    notification_time = Column(DateTime)
    seated_time = Column(DateTime)
    cancelled_time = Column(DateTime)
    no_show_time = Column(DateTime)
    
    # Assignment
    assigned_table_id = Column(PostgresUUID(as_uuid=True))
    assigned_by = Column(PostgresUUID(as_uuid=True))
    
    # Store
    store_id = Column(String(50), nullable=False)
    terminal_id = Column(String(50))
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    created_by = Column(PostgresUUID(as_uuid=True))
    
    # Metadata
    metadata_json = Column(JSON, default={})
    version = Column(Integer, default=1)
    
    # Relationships
    notifications = relationship("QueueNotificationDB", back_populates="queue_entry")
    analytics = relationship("QueueAnalyticsDB", back_populates="queue_entry")
    
    def __repr__(self):
        return f"<QueueEntry(name={self.customer_name}, status={self.status}, position={self.position_in_queue})>"


class QueueNotificationDB(Base):
    """Database model for queue notifications"""

    __tablename__ = "queue_notifications"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    queue_entry_id = Column(PostgresUUID(as_uuid=True), ForeignKey("queue_entries.id"), nullable=False)
    
    # Notification details
    notification_type = Column(Enum(NotificationMethod), nullable=False)
    status = Column(Enum(NotificationStatus), default=NotificationStatus.PENDING, nullable=False)
    message = Column(Text, nullable=False)
    
    # Delivery tracking
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    read_at = Column(DateTime)
    error_message = Column(String(500))
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Provider info
    provider_message_id = Column(String(100))  # External ID from SMS/WhatsApp provider
    provider_status = Column(String(50))
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Metadata
    metadata_json = Column(JSON, default={})
    
    # Relationships
    queue_entry = relationship("QueueEntryDB", back_populates="notifications")
    
    def __repr__(self):
        return f"<QueueNotification(type={self.notification_type}, status={self.status})>"


class QueueAnalyticsDB(Base):
    """Database model for queue analytics"""

    __tablename__ = "queue_analytics"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    queue_entry_id = Column(PostgresUUID(as_uuid=True), ForeignKey("queue_entries.id"), nullable=False)
    
    # Wait time metrics
    actual_wait_minutes = Column(Integer)
    estimated_wait_minutes = Column(Integer)
    accuracy_percentage = Column(Float)
    prediction_error_minutes = Column(Integer)
    
    # Context data
    table_id = Column(PostgresUUID(as_uuid=True))
    party_size = Column(Integer, nullable=False)
    party_size_category = Column(Enum(PartySize))
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    hour_of_day = Column(Integer, nullable=False)  # 0-23
    
    # Performance metrics
    position_changes = Column(Integer, default=0)  # Number of position updates
    notification_response_minutes = Column(Integer)  # Time from notification to arrival
    
    # Store context
    total_parties_waiting = Column(Integer)
    available_tables_count = Column(Integer)
    weather_condition = Column(String(50))  # Optional weather data
    special_event = Column(String(100))  # If there was a special event
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    store_id = Column(String(50), nullable=False)
    
    # Relationships
    queue_entry = relationship("QueueEntryDB", back_populates="analytics")
    
    def __repr__(self):
        return f"<QueueAnalytics(wait={self.actual_wait_minutes}min, accuracy={self.accuracy_percentage}%)>"


class QueueConfigurationDB(Base):
    """Database model for queue configuration per store"""

    __tablename__ = "queue_configurations"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    store_id = Column(String(50), nullable=False, unique=True)
    
    # Queue settings
    enabled = Column(Integer, default=1)  # Boolean as integer for compatibility
    max_party_size = Column(Integer, default=20)
    min_party_size = Column(Integer, default=1)
    allow_duplicate_phones = Column(Integer, default=0)  # Boolean as integer
    
    # Wait time estimation
    use_ml_predictions = Column(Integer, default=0)  # Boolean as integer
    default_wait_multiplier = Column(Float, default=1.0)  # Adjust estimates up/down
    small_party_minutes = Column(Integer, default=15)  # Base wait for 1-2 people
    medium_party_minutes = Column(Integer, default=20)  # Base wait for 3-4 people
    large_party_minutes = Column(Integer, default=25)  # Base wait for 5-6 people
    xlarge_party_minutes = Column(Integer, default=30)  # Base wait for 7+ people
    
    # Notification settings
    auto_notify_when_ready = Column(Integer, default=1)  # Boolean as integer
    notification_advance_minutes = Column(Integer, default=5)  # Notify X minutes before
    max_notification_retries = Column(Integer, default=3)
    sms_template = Column(Text)
    whatsapp_template = Column(Text)
    
    # No-show handling
    no_show_grace_minutes = Column(Integer, default=10)
    auto_cancel_no_show = Column(Integer, default=1)  # Boolean as integer
    blacklist_after_no_shows = Column(Integer, default=3)  # Number of no-shows
    
    # Display settings
    show_estimated_time = Column(Integer, default=1)  # Boolean as integer
    show_position = Column(Integer, default=1)  # Boolean as integer
    public_display_enabled = Column(Integer, default=0)  # Boolean as integer
    
    # Integration settings
    sync_with_reservations = Column(Integer, default=1)  # Boolean as integer
    prefer_queue_over_walkin = Column(Integer, default=1)  # Boolean as integer
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<QueueConfiguration(store={self.store_id})>"


class QueueHistoryDB(Base):
    """Database model for queue history tracking"""

    __tablename__ = "queue_history"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    queue_entry_id = Column(PostgresUUID(as_uuid=True), nullable=False)
    
    # Snapshot data
    customer_name = Column(String(100), nullable=False)
    customer_phone = Column(String(20), nullable=False)
    party_size = Column(Integer, nullable=False)
    status = Column(Enum(QueueStatus), nullable=False)
    
    # Timing
    check_in_time = Column(DateTime, nullable=False)
    seated_time = Column(DateTime)
    total_wait_minutes = Column(Integer)
    
    # Assignment
    table_id = Column(PostgresUUID(as_uuid=True))
    table_number = Column(Integer)
    
    # Result
    outcome = Column(String(50))  # SEATED, NO_SHOW, CANCELLED, etc.
    
    # Store
    store_id = Column(String(50), nullable=False)
    date = Column(DateTime, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Metadata
    metadata_json = Column(JSON, default={})
    
    def __repr__(self):
        return f"<QueueHistory(customer={self.customer_name}, date={self.date})>"


class QueueBlacklistDB(Base):
    """Database model for managing no-show blacklist"""

    __tablename__ = "queue_blacklist"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    customer_phone = Column(String(20), nullable=False)
    customer_name = Column(String(100))
    
    # Tracking
    no_show_count = Column(Integer, default=0)
    last_no_show_date = Column(DateTime)
    blacklisted = Column(Integer, default=0)  # Boolean as integer
    blacklisted_until = Column(DateTime)
    
    # History
    total_visits = Column(Integer, default=0)
    successful_visits = Column(Integer, default=0)
    
    # Store
    store_id = Column(String(50), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Notes
    notes = Column(Text)
    
    def __repr__(self):
        return f"<QueueBlacklist(phone={self.customer_phone}, no_shows={self.no_show_count})>"