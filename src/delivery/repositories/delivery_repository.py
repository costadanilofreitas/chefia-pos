# Delivery repository for database operations

import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, desc
from sqlalchemy.orm import Session, joinedload

from ..models.db_models import (
    CourierStatusEnum,
    CourierTypeEnum,
    DeliveryCourierDB,
    DeliveryOrderDB,
    DeliveryOrderStatusEnum,
    DeliveryPerformanceLogDB,
    DeliveryRouteDB,
    DeliveryTrackingDB,
    DeliveryZoneDB,
    GoogleMapsCache,
    RouteStatusEnum,
    TrackingEventTypeEnum,
)


class DeliveryRepository:
    """Repository for delivery-related database operations."""

    def __init__(self, db: Session):
        self.db = db

    # Delivery Order operations
    def create_delivery_order(
        self,
        order_id: str,
        customer_id: str,
        address_id: str,
        delivery_fee: float,
        tracking_code: str,
        **kwargs,
    ) -> DeliveryOrderDB:
        """Create a new delivery order."""

        db_order = DeliveryOrderDB(
            order_id=order_id,
            customer_id=customer_id,
            address_id=address_id,
            delivery_fee=delivery_fee,
            tracking_code=tracking_code,
            **kwargs,
        )

        self.db.add(db_order)
        self.db.commit()
        self.db.refresh(db_order)
        return db_order

    def get_delivery_order_by_id(
        self, delivery_order_id: uuid.UUID
    ) -> Optional[DeliveryOrderDB]:
        """Get delivery order by ID with tracking events."""
        return (
            self.db.query(DeliveryOrderDB)
            .options(
                joinedload(DeliveryOrderDB.courier),
                joinedload(DeliveryOrderDB.tracking_events),
            )
            .filter(DeliveryOrderDB.id == delivery_order_id)
            .first()
        )

    def get_delivery_order_by_tracking(
        self, tracking_code: str
    ) -> Optional[DeliveryOrderDB]:
        """Get delivery order by tracking code."""
        return (
            self.db.query(DeliveryOrderDB)
            .options(
                joinedload(DeliveryOrderDB.courier),
                joinedload(DeliveryOrderDB.tracking_events),
            )
            .filter(DeliveryOrderDB.tracking_code == tracking_code)
            .first()
        )

    def get_delivery_order_by_order_id(
        self, order_id: str
    ) -> Optional[DeliveryOrderDB]:
        """Get delivery order by main order ID."""
        return (
            self.db.query(DeliveryOrderDB)
            .options(
                joinedload(DeliveryOrderDB.courier),
                joinedload(DeliveryOrderDB.tracking_events),
            )
            .filter(DeliveryOrderDB.order_id == order_id)
            .first()
        )

    def list_delivery_orders(
        self,
        status: Optional[DeliveryOrderStatusEnum] = None,
        courier_id: Optional[uuid.UUID] = None,
        customer_id: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[DeliveryOrderDB]:
        """List delivery orders with filters."""

        query = self.db.query(DeliveryOrderDB).options(
            joinedload(DeliveryOrderDB.courier)
        )

        if status:
            query = query.filter(DeliveryOrderDB.status == status)

        if courier_id:
            query = query.filter(DeliveryOrderDB.courier_id == courier_id)

        if customer_id:
            query = query.filter(DeliveryOrderDB.customer_id == customer_id)

        if from_date:
            query = query.filter(DeliveryOrderDB.created_at >= from_date)

        if to_date:
            query = query.filter(DeliveryOrderDB.created_at <= to_date)

        return (
            query.order_by(desc(DeliveryOrderDB.priority), DeliveryOrderDB.created_at)
            .offset(offset)
            .limit(limit)
            .all()
        )

    def update_delivery_order(
        self, delivery_order_id: uuid.UUID, updates: Dict[str, Any]
    ) -> Optional[DeliveryOrderDB]:
        """Update delivery order."""

        db_order = (
            self.db.query(DeliveryOrderDB)
            .filter(DeliveryOrderDB.id == delivery_order_id)
            .first()
        )

        if not db_order:
            return None

        for field, value in updates.items():
            if hasattr(db_order, field):
                setattr(db_order, field, value)

        db_order.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_order)
        return db_order

    def assign_courier(
        self, delivery_order_id: uuid.UUID, courier_id: uuid.UUID
    ) -> Optional[DeliveryOrderDB]:
        """Assign courier to delivery order."""

        return self.update_delivery_order(
            delivery_order_id,
            {"courier_id": courier_id, "status": DeliveryOrderStatusEnum.ASSIGNED},
        )

    def update_order_status(
        self, delivery_order_id: uuid.UUID, status: DeliveryOrderStatusEnum
    ) -> Optional[DeliveryOrderDB]:
        """Update delivery order status."""

        updates = {"status": status}

        # Set actual delivery time if delivered
        if status == DeliveryOrderStatusEnum.DELIVERED:
            updates["actual_delivery_time"] = datetime.utcnow()

        return self.update_delivery_order(delivery_order_id, updates)

    # Courier operations
    def create_courier(
        self,
        name: str,
        phone: str,
        vehicle_type: str,
        courier_type: CourierTypeEnum,
        **kwargs,
    ) -> DeliveryCourierDB:
        """Create a new courier."""

        db_courier = DeliveryCourierDB(
            name=name,
            phone=phone,
            vehicle_type=vehicle_type,
            courier_type=courier_type,
            **kwargs,
        )

        self.db.add(db_courier)
        self.db.commit()
        self.db.refresh(db_courier)
        return db_courier

    def get_courier_by_id(self, courier_id: uuid.UUID) -> Optional[DeliveryCourierDB]:
        """Get courier by ID."""
        return (
            self.db.query(DeliveryCourierDB)
            .filter(DeliveryCourierDB.id == courier_id)
            .first()
        )

    def list_couriers(
        self,
        status: Optional[CourierStatusEnum] = None,
        courier_type: Optional[CourierTypeEnum] = None,
        is_active: bool = True,
    ) -> List[DeliveryCourierDB]:
        """List couriers with filters."""

        query = self.db.query(DeliveryCourierDB)

        if status:
            query = query.filter(DeliveryCourierDB.status == status)

        if courier_type:
            query = query.filter(DeliveryCourierDB.courier_type == courier_type)

        if is_active:
            query = query.filter(DeliveryCourierDB.is_active)

        return query.order_by(DeliveryCourierDB.name).all()

    def update_courier(
        self, courier_id: uuid.UUID, updates: Dict[str, Any]
    ) -> Optional[DeliveryCourierDB]:
        """Update courier."""

        db_courier = (
            self.db.query(DeliveryCourierDB)
            .filter(DeliveryCourierDB.id == courier_id)
            .first()
        )

        if not db_courier:
            return None

        for field, value in updates.items():
            if hasattr(db_courier, field):
                setattr(db_courier, field, value)

        db_courier.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_courier)
        return db_courier

    def update_courier_status(
        self, courier_id: uuid.UUID, status: CourierStatusEnum
    ) -> Optional[DeliveryCourierDB]:
        """Update courier status."""

        updates = {"status": status, "last_seen": datetime.utcnow()}

        # Handle delivery count logic
        if status == CourierStatusEnum.BUSY:
            # This should be called when assigning a new delivery
            # We'll increment current_deliveries in the service layer
            pass
        elif status == CourierStatusEnum.AVAILABLE:
            # Reset current deliveries when becoming available
            updates["current_deliveries"] = 0

        return self.update_courier(courier_id, updates)

    def update_courier_location(
        self, courier_id: uuid.UUID, location: Dict[str, float]
    ) -> Optional[DeliveryCourierDB]:
        """Update courier location."""

        return self.update_courier(
            courier_id, {"current_location": location, "last_seen": datetime.utcnow()}
        )

    def get_available_couriers(
        self, max_deliveries: Optional[int] = None
    ) -> List[DeliveryCourierDB]:
        """Get available couriers."""

        query = self.db.query(DeliveryCourierDB).filter(
            and_(
                DeliveryCourierDB.status == CourierStatusEnum.AVAILABLE,
                DeliveryCourierDB.is_active,
            )
        )

        if max_deliveries:
            query = query.filter(
                DeliveryCourierDB.current_deliveries < DeliveryCourierDB.max_deliveries
            )

        return query.order_by(DeliveryCourierDB.current_deliveries).all()

    # Delivery Zone operations
    def create_zone(
        self,
        name: str,
        base_fee: float,
        min_delivery_time: int,
        max_delivery_time: int,
        polygon: List[Dict[str, float]],
        **kwargs,
    ) -> DeliveryZoneDB:
        """Create a new delivery zone."""

        db_zone = DeliveryZoneDB(
            name=name,
            base_fee=base_fee,
            min_delivery_time=min_delivery_time,
            max_delivery_time=max_delivery_time,
            polygon=polygon,
            **kwargs,
        )

        self.db.add(db_zone)
        self.db.commit()
        self.db.refresh(db_zone)
        return db_zone

    def get_zone_by_id(self, zone_id: uuid.UUID) -> Optional[DeliveryZoneDB]:
        """Get zone by ID."""
        return (
            self.db.query(DeliveryZoneDB).filter(DeliveryZoneDB.id == zone_id).first()
        )

    def list_zones(self, is_active: bool = True) -> List[DeliveryZoneDB]:
        """List delivery zones."""

        query = self.db.query(DeliveryZoneDB)

        if is_active:
            query = query.filter(DeliveryZoneDB.is_active)

        return query.order_by(DeliveryZoneDB.name).all()

    def update_zone(
        self, zone_id: uuid.UUID, updates: Dict[str, Any]
    ) -> Optional[DeliveryZoneDB]:
        """Update delivery zone."""

        db_zone = (
            self.db.query(DeliveryZoneDB).filter(DeliveryZoneDB.id == zone_id).first()
        )

        if not db_zone:
            return None

        for field, value in updates.items():
            if hasattr(db_zone, field):
                setattr(db_zone, field, value)

        db_zone.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_zone)
        return db_zone

    # Route operations
    def create_route(
        self, orders: List[str], courier_id: Optional[uuid.UUID] = None, **kwargs
    ) -> DeliveryRouteDB:
        """Create a new delivery route."""

        db_route = DeliveryRouteDB(orders=orders, courier_id=courier_id, **kwargs)

        self.db.add(db_route)
        self.db.commit()
        self.db.refresh(db_route)
        return db_route

    def get_route_by_id(self, route_id: uuid.UUID) -> Optional[DeliveryRouteDB]:
        """Get route by ID."""
        return (
            self.db.query(DeliveryRouteDB)
            .options(joinedload(DeliveryRouteDB.courier))
            .filter(DeliveryRouteDB.id == route_id)
            .first()
        )

    def list_routes(
        self,
        status: Optional[RouteStatusEnum] = None,
        courier_id: Optional[uuid.UUID] = None,
    ) -> List[DeliveryRouteDB]:
        """List delivery routes."""

        query = self.db.query(DeliveryRouteDB).options(
            joinedload(DeliveryRouteDB.courier)
        )

        if status:
            query = query.filter(DeliveryRouteDB.status == status)

        if courier_id:
            query = query.filter(DeliveryRouteDB.courier_id == courier_id)

        return query.order_by(desc(DeliveryRouteDB.created_at)).all()

    def update_route(
        self, route_id: uuid.UUID, updates: Dict[str, Any]
    ) -> Optional[DeliveryRouteDB]:
        """Update delivery route."""

        db_route = (
            self.db.query(DeliveryRouteDB)
            .filter(DeliveryRouteDB.id == route_id)
            .first()
        )

        if not db_route:
            return None

        for field, value in updates.items():
            if hasattr(db_route, field):
                setattr(db_route, field, value)

        db_route.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_route)
        return db_route

    # Tracking operations
    def create_tracking_event(
        self,
        delivery_order_id: uuid.UUID,
        event_type: TrackingEventTypeEnum,
        timestamp: Optional[datetime] = None,
        **kwargs,
    ) -> DeliveryTrackingDB:
        """Create a tracking event."""

        db_tracking = DeliveryTrackingDB(
            delivery_order_id=delivery_order_id,
            event_type=event_type,
            timestamp=timestamp or datetime.utcnow(),
            **kwargs,
        )

        self.db.add(db_tracking)
        self.db.commit()
        self.db.refresh(db_tracking)
        return db_tracking

    def get_tracking_history(
        self, delivery_order_id: uuid.UUID
    ) -> List[DeliveryTrackingDB]:
        """Get tracking history for a delivery order."""

        return (
            self.db.query(DeliveryTrackingDB)
            .filter(DeliveryTrackingDB.delivery_order_id == delivery_order_id)
            .order_by(DeliveryTrackingDB.timestamp)
            .all()
        )

    # Google Maps Cache operations
    def get_maps_cache(self, cache_key: str) -> Optional[GoogleMapsCache]:
        """Get cached Google Maps response."""

        now = datetime.utcnow()
        cache_entry = (
            self.db.query(GoogleMapsCache)
            .filter(
                and_(
                    GoogleMapsCache.cache_key == cache_key,
                    GoogleMapsCache.expires_at > now,
                )
            )
            .first()
        )

        if cache_entry:
            # Update access statistics
            cache_entry.hit_count += 1
            cache_entry.last_accessed = now
            self.db.commit()

        return cache_entry

    def set_maps_cache(
        self,
        cache_key: str,
        request_type: str,
        request_params: Dict[str, Any],
        response_data: Dict[str, Any],
        ttl_hours: int = 24,
    ) -> GoogleMapsCache:
        """Set Google Maps cache entry."""

        expires_at = datetime.utcnow() + timedelta(hours=ttl_hours)

        # Check if entry already exists
        existing = (
            self.db.query(GoogleMapsCache)
            .filter(GoogleMapsCache.cache_key == cache_key)
            .first()
        )

        if existing:
            # Update existing entry
            existing.response_data = response_data
            existing.expires_at = expires_at
            existing.last_accessed = datetime.utcnow()
            db_cache = existing
        else:
            # Create new entry
            db_cache = GoogleMapsCache(
                cache_key=cache_key,
                request_type=request_type,
                request_params=request_params,
                response_data=response_data,
                expires_at=expires_at,
            )
            self.db.add(db_cache)

        self.db.commit()
        self.db.refresh(db_cache)
        return db_cache

    def cleanup_expired_cache(self) -> int:
        """Clean up expired cache entries."""

        now = datetime.utcnow()
        deleted_count = (
            self.db.query(GoogleMapsCache)
            .filter(GoogleMapsCache.expires_at <= now)
            .delete()
        )

        self.db.commit()
        return deleted_count

    # Performance tracking
    def create_performance_log(
        self,
        delivery_order_id: uuid.UUID,
        courier_id: Optional[uuid.UUID] = None,
        **metrics,
    ) -> DeliveryPerformanceLogDB:
        """Create performance log entry."""

        db_log = DeliveryPerformanceLogDB(
            delivery_order_id=delivery_order_id, courier_id=courier_id, **metrics
        )

        self.db.add(db_log)
        self.db.commit()
        self.db.refresh(db_log)
        return db_log

    def get_courier_performance_stats(
        self,
        courier_id: uuid.UUID,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Get courier performance statistics."""

        query = self.db.query(DeliveryPerformanceLogDB).filter(
            DeliveryPerformanceLogDB.courier_id == courier_id
        )

        if from_date:
            query = query.filter(DeliveryPerformanceLogDB.recorded_at >= from_date)

        if to_date:
            query = query.filter(DeliveryPerformanceLogDB.recorded_at <= to_date)

        logs = query.all()

        if not logs:
            return {
                "total_deliveries": 0,
                "on_time_deliveries": 0,
                "late_deliveries": 0,
                "average_delivery_time": 0,
                "customer_rating": 0,
                "total_distance": 0,
            }

        total_deliveries = len(logs)
        on_time_deliveries = sum(1 for log in logs if log.was_on_time)
        late_deliveries = total_deliveries - on_time_deliveries

        # Calculate averages (excluding None values)
        delivery_times = [log.total_time for log in logs if log.total_time is not None]
        average_delivery_time = (
            sum(delivery_times) / len(delivery_times) if delivery_times else 0
        )

        ratings = [
            log.customer_rating for log in logs if log.customer_rating is not None
        ]
        customer_rating = sum(ratings) / len(ratings) if ratings else 0

        distances = [
            log.total_distance for log in logs if log.total_distance is not None
        ]
        total_distance = sum(distances) if distances else 0

        return {
            "total_deliveries": total_deliveries,
            "on_time_deliveries": on_time_deliveries,
            "late_deliveries": late_deliveries,
            "average_delivery_time": round(average_delivery_time, 1),
            "customer_rating": round(customer_rating, 1),
            "total_distance": round(total_distance, 1),
        }
