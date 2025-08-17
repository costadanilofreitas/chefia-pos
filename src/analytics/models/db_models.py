# Analytics module database models for PostgreSQL

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
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
class ChartTypeEnum(str, enum.Enum):
    BAR = "bar"
    LINE = "line"
    PIE = "pie"
    AREA = "area"
    SCATTER = "scatter"
    HEATMAP = "heatmap"
    TABLE = "table"
    GAUGE = "gauge"
    CARD = "card"
    FUNNEL = "funnel"


class DataSourceTypeEnum(str, enum.Enum):
    SALES = "sales"
    INVENTORY = "inventory"
    CUSTOMERS = "customers"
    ORDERS = "orders"
    DELIVERY = "delivery"
    EMPLOYEES = "employees"
    TABLES = "tables"
    KIOSK = "kiosk"
    COSTS = "costs"
    PRODUCTS = "products"
    FEEDBACK = "feedback"


class FilterOperatorEnum(str, enum.Enum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    GREATER_THAN_OR_EQUALS = "greater_than_or_equals"
    LESS_THAN_OR_EQUALS = "less_than_or_equals"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"
    BETWEEN = "between"
    IN = "in"
    NOT_IN = "not_in"
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"


class DashboardDB(Base):
    """Database model for dashboards."""

    __tablename__ = "analytics_dashboards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Basic dashboard information
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    owner_id = Column(String, nullable=False, index=True)  # Reference to user
    restaurant_id = Column(
        String, nullable=False, index=True
    )  # Reference to restaurant

    # Dashboard properties
    is_template = Column(Boolean, default=False, index=True)
    is_public = Column(Boolean, default=False, index=True)
    is_favorite = Column(Boolean, default=False, index=True)
    category = Column(String, nullable=True, index=True)
    tags = Column(JSON, nullable=True)  # Array of tags

    # Layout and structure
    layout = Column(JSON, nullable=False)  # Dashboard layout configuration
    items = Column(JSON, nullable=False, default=list)  # Dashboard items
    filters = Column(JSON, nullable=True)  # Global dashboard filters

    # Permissions and sharing
    permissions = Column(JSON, nullable=True)  # Permission settings

    # Usage statistics
    view_count = Column(Integer, default=0, index=True)
    last_viewed_at = Column(DateTime, nullable=True, index=True)
    thumbnail_url = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    shares = relationship(
        "DashboardShareDB", back_populates="dashboard", cascade="all, delete-orphan"
    )
    alerts = relationship(
        "DashboardAlertDB", back_populates="dashboard", cascade="all, delete-orphan"
    )
    exports = relationship(
        "DashboardExportDB", back_populates="dashboard", cascade="all, delete-orphan"
    )
    reports = relationship(
        "ScheduledReportDB", back_populates="dashboard", cascade="all, delete-orphan"
    )


class DashboardShareDB(Base):
    """Database model for dashboard shares."""

    __tablename__ = "dashboard_shares"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    dashboard_id = Column(
        UUID(as_uuid=True),
        ForeignKey("analytics_dashboards.id"),
        nullable=False,
        index=True,
    )

    # Share targets
    user_id = Column(String, nullable=True, index=True)  # Reference to specific user
    role_id = Column(String, nullable=True, index=True)  # Reference to role
    email = Column(String, nullable=True, index=True)  # Email for external sharing

    # Share configuration
    permission = Column(String, nullable=False, default="view")  # view, edit, manage
    is_active = Column(Boolean, default=True, index=True)

    # Expiration
    expires_at = Column(DateTime, nullable=True, index=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_by = Column(
        String, nullable=False, index=True
    )  # Reference to user who shared

    # Relationship
    dashboard = relationship("DashboardDB", back_populates="shares")


class ChartConfigurationDB(Base):
    """Database model for chart configurations."""

    __tablename__ = "chart_configurations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    dashboard_id = Column(
        UUID(as_uuid=True),
        ForeignKey("analytics_dashboards.id"),
        nullable=True,
        index=True,
    )

    # Chart identification
    name = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    subtitle = Column(String, nullable=True)
    description = Column(Text, nullable=True)

    # Chart configuration
    chart_type: Column = Column(SqlEnum(ChartTypeEnum), nullable=False, index=True)
    data_source: Column = Column(SqlEnum(DataSourceTypeEnum), nullable=False, index=True)

    # Chart structure (stored as JSON)
    series = Column(JSON, nullable=False)  # Chart series configuration
    axes = Column(JSON, nullable=True)  # Axes configuration
    filters = Column(JSON, nullable=True)  # Chart-specific filters
    options = Column(JSON, nullable=True)  # Additional chart options

    # Display properties
    height = Column(Integer, default=300)
    width = Column(Integer, nullable=True)
    is_responsive = Column(Boolean, default=True)

    # Behavior
    refresh_interval = Column(Integer, nullable=True)  # Seconds
    drill_down_enabled = Column(Boolean, default=False)
    drill_down_config = Column(JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class DashboardAlertDB(Base):
    """Database model for dashboard alerts."""

    __tablename__ = "dashboard_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    dashboard_id = Column(
        UUID(as_uuid=True),
        ForeignKey("analytics_dashboards.id"),
        nullable=False,
        index=True,
    )
    chart_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chart_configurations.id"),
        nullable=True,
        index=True,
    )

    # Alert identification
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Alert conditions
    metric = Column(String, nullable=False, index=True)  # Field being monitored
    condition: Column = Column(SqlEnum(FilterOperatorEnum), nullable=False)
    threshold = Column(Float, nullable=False)  # Threshold value

    # Alert frequency
    frequency = Column(
        String, nullable=False, default="realtime", index=True
    )  # realtime, hourly, daily, weekly

    # Notification settings
    notification_channels = Column(
        JSON, nullable=False
    )  # Array of channels: email, sms, push, webhook
    recipients = Column(JSON, nullable=True)  # Array of recipient addresses
    webhook_url = Column(String, nullable=True)
    message_template = Column(Text, nullable=True)

    # Status and statistics
    is_active = Column(Boolean, default=True, index=True)
    trigger_count = Column(Integer, default=0)
    last_triggered_at = Column(DateTime, nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    created_by = Column(String, nullable=False, index=True)

    # Relationship
    dashboard = relationship("DashboardDB", back_populates="alerts")


class DashboardExportDB(Base):
    """Database model for dashboard exports."""

    __tablename__ = "dashboard_exports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    dashboard_id = Column(
        UUID(as_uuid=True),
        ForeignKey("analytics_dashboards.id"),
        nullable=False,
        index=True,
    )

    # Export configuration
    format = Column(String, nullable=False, index=True)  # pdf, excel, csv, image
    filters = Column(JSON, nullable=True)  # Filters applied during export

    # Export status
    status = Column(
        String, nullable=False, default="pending", index=True
    )  # pending, processing, completed, failed
    file_url = Column(String, nullable=True)  # URL of the generated file
    error_message = Column(Text, nullable=True)

    # File metadata
    file_size = Column(Integer, nullable=True)  # Size in bytes
    filename = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_by = Column(String, nullable=False, index=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationship
    dashboard = relationship("DashboardDB", back_populates="exports")


class ScheduledReportDB(Base):
    """Database model for scheduled reports."""

    __tablename__ = "scheduled_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    dashboard_id = Column(
        UUID(as_uuid=True),
        ForeignKey("analytics_dashboards.id"),
        nullable=False,
        index=True,
    )

    # Report identification
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Report configuration
    format = Column(String, nullable=False, index=True)  # pdf, excel, csv
    schedule = Column(String, nullable=False)  # Cron expression
    filters = Column(JSON, nullable=True)  # Filters applied to report

    # Email settings
    recipients = Column(JSON, nullable=False)  # Array of email addresses
    subject = Column(String, nullable=False)
    message = Column(Text, nullable=True)

    # Status
    is_active = Column(Boolean, default=True, index=True)

    # Execution tracking
    last_run_at = Column(DateTime, nullable=True, index=True)
    last_run_status = Column(String, nullable=True)  # success, failed, running
    next_run_at = Column(DateTime, nullable=True, index=True)
    run_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    created_by = Column(String, nullable=False, index=True)

    # Relationship
    dashboard = relationship("DashboardDB", back_populates="reports")


class DataSourceConfigDB(Base):
    """Database model for data source configurations."""

    __tablename__ = "data_source_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    restaurant_id = Column(
        String, nullable=False, index=True
    )  # Reference to restaurant

    # Data source identification
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    data_source_type: Column = Column(SqlEnum(DataSourceTypeEnum), nullable=False, index=True)

    # Connection configuration
    connection_string = Column(String, nullable=True)
    query = Column(Text, nullable=True)  # SQL query or similar
    parameters = Column(JSON, nullable=True)  # Query parameters

    # Refresh settings
    refresh_interval = Column(Integer, nullable=True)  # Seconds
    last_refreshed_at = Column(DateTime, nullable=True, index=True)

    # Metadata
    metadata = Column(JSON, nullable=True)  # Field definitions, etc.

    # Status
    is_active = Column(Boolean, default=True, index=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    created_by = Column(String, nullable=False, index=True)


class UserDashboardPreferenceDB(Base):
    """Database model for user dashboard preferences."""

    __tablename__ = "user_dashboard_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(
        String, nullable=False, unique=True, index=True
    )  # Reference to user

    # Dashboard preferences
    default_dashboard_id = Column(
        UUID(as_uuid=True), ForeignKey("analytics_dashboards.id"), nullable=True
    )
    favorite_dashboards = Column(JSON, nullable=True)  # Array of dashboard IDs

    # Display preferences
    theme = Column(String, default="light")  # light, dark
    refresh_interval = Column(Integer, nullable=True)  # Default refresh interval

    # Notification preferences
    notifications_enabled = Column(Boolean, default=True)
    email_reports_enabled = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class DashboardViewLogDB(Base):
    """Database model for tracking dashboard views."""

    __tablename__ = "dashboard_view_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    dashboard_id = Column(
        UUID(as_uuid=True),
        ForeignKey("analytics_dashboards.id"),
        nullable=False,
        index=True,
    )

    # View details
    user_id = Column(
        String, nullable=True, index=True
    )  # Reference to user (null for anonymous)
    session_id = Column(String, nullable=True, index=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    # View duration
    viewed_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    duration_seconds = Column(Integer, nullable=True)  # How long they viewed it

    # Context
    referrer = Column(String, nullable=True)  # How they got to the dashboard
    filters_applied = Column(JSON, nullable=True)  # Filters that were active
