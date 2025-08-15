# Delivery module database models for PostgreSQL

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
class DeliveryOrderStatusEnum(str, enum.Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    PREPARING = "preparing"
    READY_FOR_PICKUP = "ready_for_pickup"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    FAILED = "failed"


class CourierStatusEnum(str, enum.Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"
    ON_BREAK = "on_break"


class CourierTypeEnum(str, enum.Enum):
    EMPLOYEE = "employee"
    FREELANCER = "freelancer"
    PARTNER = "partner"


class RouteStatusEnum(str, enum.Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TrackingEventTypeEnum(str, enum.Enum):
    ORDER_CREATED = "order_created"
    ORDER_ASSIGNED = "order_assigned"
    PREPARING = "preparing"
    READY_FOR_PICKUP = "ready_for_pickup"
    IN_TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    FAILED = "failed"
    LOCATION_UPDATE = "location_update"


class DeliveryOrderDB(Base):
    """Database model for delivery orders."""

    __tablename__ = "delivery_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    order_id = Column(String, nullable=False, index=True)  # Reference to main order
    customer_id = Column(String, nullable=False, index=True)  # Reference to customer
    address_id = Column(String, nullable=False)  # Reference to delivery address
    courier_id = Column(
        UUID(as_uuid=True),
        ForeignKey("delivery_couriers.id"),
        nullable=True,
        index=True,
    )

    # Delivery details
    delivery_fee = Column(Float, nullable=False, default=0.0)
    estimated_delivery_time = Column(DateTime, nullable=True)
    actual_delivery_time = Column(DateTime, nullable=True)
    delivery_notes = Column(Text)

    # Status and tracking
    status = Column(
        SqlEnum(DeliveryOrderStatusEnum),
        nullable=False,
        default=DeliveryOrderStatusEnum.PENDING,
        index=True,
    )
    tracking_code = Column(String, nullable=False, unique=True, index=True)
    priority = Column(Integer, default=0, index=True)  # Higher number = higher priority

    # Payment information
    payment_on_delivery = Column(Boolean, default=False)
    payment_amount = Column(Float, nullable=True)  # Amount to collect on delivery
    payment_method = Column(String, nullable=True)  # cash, card, etc.

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    courier = relationship("DeliveryCourierDB", back_populates="delivery_orders")
    tracking_events = relationship(
        "DeliveryTrackingDB",
        back_populates="delivery_order",
        cascade="all, delete-orphan",
    )


class DeliveryCourierDB(Base):
    """Database model for delivery couriers."""

    __tablename__ = "delivery_couriers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    employee_id = Column(
        String, nullable=True, index=True
    )  # Reference to employee if internal

    # Personal information
    name = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=False, index=True)
    email = Column(String, nullable=True, index=True)

    # Vehicle information
    vehicle_type = Column(String, nullable=False)  # motorcycle, bicycle, car, etc.
    vehicle_plate = Column(String, nullable=True)

    # Status and availability
    status = Column(
        SqlEnum(CourierStatusEnum),
        nullable=False,
        default=CourierStatusEnum.OFFLINE,
        index=True,
    )
    courier_type = Column(
        SqlEnum(CourierTypeEnum), nullable=False, default=CourierTypeEnum.EMPLOYEE
    )
    is_active = Column(Boolean, default=True, index=True)

    # Capacity and performance
    max_deliveries = Column(Integer, default=1)  # Maximum concurrent deliveries
    current_deliveries = Column(Integer, default=0)
    current_location = Column(JSON)  # {"lat": float, "lng": float}

    # Additional information
    notes = Column(Text)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    last_seen = Column(DateTime, nullable=True)

    # Relationships
    delivery_orders = relationship("DeliveryOrderDB", back_populates="courier")
    routes = relationship("DeliveryRouteDB", back_populates="courier")


class DeliveryZoneDB(Base):
    """Database model for delivery zones."""

    __tablename__ = "delivery_zones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text)

    # Pricing
    base_fee = Column(Float, nullable=False, default=0.0)
    additional_fee_per_km = Column(Float, nullable=True)
    min_order_value = Column(Float, nullable=True)  # Minimum order value for delivery

    # Delivery time estimates (in minutes)
    min_delivery_time = Column(Integer, nullable=False, default=30)
    max_delivery_time = Column(Integer, nullable=False, default=60)

    # Geographic boundaries (polygon coordinates)
    polygon = Column(JSON)  # Array of {"lat": float, "lng": float}

    # Status
    is_active = Column(Boolean, default=True, index=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class DeliveryRouteDB(Base):
    """Database model for delivery routes."""

    __tablename__ = "delivery_routes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    courier_id = Column(
        UUID(as_uuid=True),
        ForeignKey("delivery_couriers.id"),
        nullable=True,
        index=True,
    )

    # Route details
    name = Column(String, nullable=True)
    status = Column(
        SqlEnum(RouteStatusEnum),
        nullable=False,
        default=RouteStatusEnum.PLANNING,
        index=True,
    )
    orders = Column(JSON)  # Array of delivery order IDs

    # Timing
    estimated_start_time = Column(DateTime, nullable=True)
    estimated_end_time = Column(DateTime, nullable=True)
    actual_start_time = Column(DateTime, nullable=True)
    actual_end_time = Column(DateTime, nullable=True)

    # Optimization metrics
    total_distance = Column(Float, nullable=True)  # in kilometers
    total_duration = Column(Integer, nullable=True)  # in minutes
    optimization_score = Column(Float, nullable=True)  # 0.0 to 1.0

    # Route waypoints
    waypoints = Column(JSON)  # Array of {"lat": float, "lng": float, "order_id": str}

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    courier = relationship("DeliveryCourierDB", back_populates="routes")


class DeliveryTrackingDB(Base):
    """Database model for delivery tracking events."""

    __tablename__ = "delivery_tracking"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    delivery_order_id = Column(
        UUID(as_uuid=True), ForeignKey("delivery_orders.id"), nullable=False, index=True
    )

    # Event details
    event_type = Column(SqlEnum(TrackingEventTypeEnum), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    location = Column(JSON)  # {"lat": float, "lng": float}
    notes = Column(Text)

    # Event metadata
    created_by = Column(String, nullable=True)  # User/system that created the event
    source = Column(
        String, default="system"
    )  # system, courier_app, customer_service, etc.
    metadata = Column(JSON)  # Additional event-specific data

    # Relationship
    delivery_order = relationship("DeliveryOrderDB", back_populates="tracking_events")


class GoogleMapsCache(Base):
    """Database model for Google Maps API response cache."""

    __tablename__ = "google_maps_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    cache_key = Column(
        String, nullable=False, unique=True, index=True
    )  # Hash of request params
    request_type = Column(
        String, nullable=False, index=True
    )  # geocode, directions, distance_matrix, etc.
    request_params = Column(JSON)  # Original request parameters
    response_data = Column(JSON)  # Cached API response

    # Cache management
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    hit_count = Column(Integer, default=0)  # How many times this cache entry was used
    last_accessed = Column(DateTime, default=datetime.utcnow, nullable=False)


class DeliveryPerformanceLogDB(Base):
    """Database model for tracking delivery performance metrics."""

    __tablename__ = "delivery_performance_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    delivery_order_id = Column(
        UUID(as_uuid=True), ForeignKey("delivery_orders.id"), nullable=False, index=True
    )
    courier_id = Column(
        UUID(as_uuid=True),
        ForeignKey("delivery_couriers.id"),
        nullable=True,
        index=True,
    )

    # Performance metrics
    preparation_time = Column(Integer, nullable=True)  # Minutes from order to ready
    pickup_time = Column(Integer, nullable=True)  # Minutes from ready to pickup
    delivery_time = Column(Integer, nullable=True)  # Minutes from pickup to delivery
    total_time = Column(Integer, nullable=True)  # Total minutes from order to delivery

    # Distances
    distance_to_pickup = Column(Float, nullable=True)  # km
    distance_to_delivery = Column(Float, nullable=True)  # km
    total_distance = Column(Float, nullable=True)  # km

    # Quality metrics
    was_on_time = Column(Boolean, nullable=True)
    minutes_early_late = Column(
        Integer, nullable=True
    )  # Positive = late, Negative = early
    customer_rating = Column(Integer, nullable=True)  # 1-5 stars
    customer_feedback = Column(Text, nullable=True)

    # Issues and exceptions
    had_issues = Column(Boolean, default=False)
    issue_type = Column(
        String, nullable=True
    )  # traffic, weather, customer_unavailable, etc.
    issue_description = Column(Text, nullable=True)
    resolution_time = Column(Integer, nullable=True)  # Minutes to resolve issue

    # Timestamps
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    delivery_order = relationship("DeliveryOrderDB")
    courier = relationship("DeliveryCourierDB")
