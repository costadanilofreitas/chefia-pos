import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import Depends
from sqlalchemy.orm import Session

from ...core.database.connection import get_db_session
from ...core.events.event_bus import Event, get_event_bus
from ..models.db_models import (
    CourierStatusEnum,
    CourierTypeEnum,
    DeliveryCourierDB,
    DeliveryOrderDB,
    DeliveryOrderStatusEnum,
    DeliveryZoneDB,
    TrackingEventTypeEnum,
)
from ..models.delivery_models import (
    CourierStatus,
    CourierType,
    DeliveryCourier,
    DeliveryOrder,
    DeliveryOrderStatus,
    DeliveryTracking,
    DeliveryZone,
    TrackingEventType,
)
from ..repositories.delivery_repository import DeliveryRepository


class DeliveryDBService:
    """Database-backed delivery service."""

    def __init__(self, db: Session = Depends(get_db_session)):
        self.repository = DeliveryRepository(db)
        self.event_bus = get_event_bus()

    def _convert_db_to_pydantic_order(self, db_order: DeliveryOrderDB) -> DeliveryOrder:
        """Convert database model to Pydantic model."""

        tracking_events = []
        if db_order.tracking_events:
            for event in db_order.tracking_events:
                tracking_events.append(
                    DeliveryTracking(
                        id=str(event.id),
                        delivery_order_id=str(event.delivery_order_id),
                        event_type=TrackingEventType(event.event_type.value),
                        timestamp=event.timestamp,
                        location=event.location,
                        notes=event.notes,
                        created_by=event.created_by or "system",
                    )
                )

        return DeliveryOrder(
            id=str(db_order.id),
            order_id=str(db_order.order_id) if db_order.order_id else "",
            customer_id=str(db_order.customer_id) if db_order.customer_id else "",
            address_id=str(db_order.address_id) if db_order.address_id else "",
            courier_id=str(db_order.courier_id) if db_order.courier_id else None,
            delivery_fee=float(db_order.delivery_fee) if db_order.delivery_fee else 0.0,
            estimated_delivery_time=db_order.estimated_delivery_time,  # type: ignore
            actual_delivery_time=db_order.actual_delivery_time,  # type: ignore
            delivery_notes=(
                str(db_order.delivery_notes) if db_order.delivery_notes else None
            ),
            status=DeliveryOrderStatus(db_order.status.value),
            tracking_code=str(db_order.tracking_code) if db_order.tracking_code else "",
            priority=int(db_order.priority) if db_order.priority else 0,
            payment_on_delivery=(
                bool(db_order.payment_on_delivery)
                if db_order.payment_on_delivery is not None
                else False
            ),
            payment_amount=(
                float(db_order.payment_amount) if db_order.payment_amount else None
            ),
            payment_method=(
                str(db_order.payment_method) if db_order.payment_method else None
            ),
            created_at=db_order.created_at,  # type: ignore
            updated_at=db_order.updated_at,  # type: ignore
        )

    def _convert_db_to_pydantic_courier(
        self, db_courier: DeliveryCourierDB
    ) -> DeliveryCourier:
        """Convert database courier model to Pydantic model."""

        return DeliveryCourier(
            id=str(db_courier.id),
            employee_id=str(db_courier.employee_id) if db_courier.employee_id else None,
            name=str(db_courier.name) if db_courier.name else "",
            phone=str(db_courier.phone) if db_courier.phone else "",
            email=str(db_courier.email) if db_courier.email else None,
            vehicle_type=(
                str(db_courier.vehicle_type) if db_courier.vehicle_type else ""
            ),
            vehicle_plate=(
                str(db_courier.vehicle_plate) if db_courier.vehicle_plate else None
            ),
            status=CourierStatus(db_courier.status.value),
            courier_type=CourierType(db_courier.courier_type.value),
            is_active=(
                bool(db_courier.is_active) if db_courier.is_active is not None else True
            ),
            max_deliveries=(
                int(db_courier.max_deliveries) if db_courier.max_deliveries else 1
            ),
            current_deliveries=(
                int(db_courier.current_deliveries)
                if db_courier.current_deliveries
                else 0
            ),
            current_location=(
                db_courier.current_location
                if isinstance(db_courier.current_location, dict)
                else None
            ),
            notes=str(db_courier.notes) if db_courier.notes else None,
            created_at=db_courier.created_at,  # type: ignore
            updated_at=db_courier.updated_at,  # type: ignore
        )

    def _convert_db_to_pydantic_zone(self, db_zone: DeliveryZoneDB) -> DeliveryZone:
        """Convert database zone model to Pydantic model."""

        return DeliveryZone(
            id=str(db_zone.id),
            name=str(db_zone.name) if db_zone.name else "",
            description=str(db_zone.description) if db_zone.description else None,
            base_fee=float(db_zone.base_fee) if db_zone.base_fee else 0.0,
            additional_fee_per_km=(
                float(db_zone.additional_fee_per_km)
                if db_zone.additional_fee_per_km
                else None
            ),
            min_order_value=(
                float(db_zone.min_order_value) if db_zone.min_order_value else None
            ),
            min_delivery_time=(
                int(db_zone.min_delivery_time) if db_zone.min_delivery_time else 30
            ),
            max_delivery_time=(
                int(db_zone.max_delivery_time) if db_zone.max_delivery_time else 60
            ),
            polygon=db_zone.polygon if isinstance(db_zone.polygon, list) else [],
            is_active=(
                bool(db_zone.is_active) if db_zone.is_active is not None else True
            ),
            created_at=db_zone.created_at,  # type: ignore
            updated_at=db_zone.updated_at,  # type: ignore
        )

    async def create_delivery_order(
        self,
        order_id: str,
        customer_id: str,
        address_id: str,
        delivery_fee: float,
        delivery_notes: Optional[str] = None,
        payment_on_delivery: bool = False,
        payment_amount: Optional[float] = None,
        payment_method: Optional[str] = None,
        priority: int = 0,
    ) -> DeliveryOrder:
        """Creates a new delivery order."""

        now = datetime.utcnow()

        # Estimate delivery time (simplified)
        estimated_delivery_time = now + timedelta(minutes=30)

        # Generate tracking code
        tracking_code = f"DEL-{uuid.uuid4().hex[:8].upper()}"

        db_order = self.repository.create_delivery_order(
            order_id=order_id,
            customer_id=customer_id,
            address_id=address_id,
            delivery_fee=delivery_fee,
            tracking_code=tracking_code,
            estimated_delivery_time=estimated_delivery_time,
            delivery_notes=delivery_notes,
            payment_on_delivery=payment_on_delivery,
            payment_amount=payment_amount,
            payment_method=payment_method,
            priority=priority,
        )

        # Create tracking event
        await self.create_tracking_event(
            delivery_order_id=db_order.id,  # type: ignore
            event_type=TrackingEventType.ORDER_CREATED,
            notes="Pedido de delivery criado",
        )

        # Publish event
        from ...core.events.event_bus import EventType

        await self.event_bus.publish(
            Event(
                event_type=EventType.DELIVERY_ORDER_CREATED,
                data={
                    "delivery_order_id": str(db_order.id),
                    "order_id": order_id,
                    "customer_id": customer_id,
                    "tracking_code": tracking_code,
                    "source": "delivery_service",
                },
                metadata={"module": "delivery"},
            ),
        )

        return self._convert_db_to_pydantic_order(db_order)

    async def assign_courier(
        self, delivery_order_id: str, courier_id: str
    ) -> DeliveryOrder:
        """Assigns a courier to a delivery order."""

        order_uuid = uuid.UUID(delivery_order_id)
        courier_uuid = uuid.UUID(courier_id)

        # Verify courier exists and is available
        db_courier = self.repository.get_courier_by_id(courier_uuid)
        if not db_courier:
            raise ValueError(f"Entregador {courier_id} não encontrado")

        if db_courier.status != CourierStatusEnum.AVAILABLE:
            raise ValueError(f"Entregador {courier_id} não está disponível")

        # Assign courier to order
        db_order = self.repository.assign_courier(order_uuid, courier_uuid)
        if not db_order:
            raise ValueError(f"Pedido de delivery {delivery_order_id} não encontrado")

        # Update courier status
        self.repository.update_courier_status(courier_uuid, CourierStatusEnum.BUSY)

        # Create tracking event
        await self.create_tracking_event(
            delivery_order_id=order_uuid,
            event_type=TrackingEventType.ORDER_ASSIGNED,
            notes=f"Pedido atribuído ao entregador {db_courier.name}",
        )

        # Publish event
        from ...core.events.event_bus import EventType

        await self.event_bus.publish(
            Event(
                event_type=EventType.ORDER_STATUS_CHANGED,
                data={
                    "delivery_order_id": delivery_order_id,
                    "status": "assigned",
                    "courier_id": courier_id,
                    "source": "delivery_service",
                },
                metadata={"module": "delivery"},
            ),
        )

        return self._convert_db_to_pydantic_order(db_order)

    async def update_order_status(
        self,
        delivery_order_id: str,
        status: DeliveryOrderStatus,
        notes: Optional[str] = None,
    ) -> DeliveryOrder:
        """Updates the status of a delivery order."""

        order_uuid = uuid.UUID(delivery_order_id)
        status_enum = DeliveryOrderStatusEnum(status.value)

        # Get current order
        db_order = self.repository.get_delivery_order_by_id(order_uuid)
        if not db_order:
            raise ValueError(f"Pedido de delivery {delivery_order_id} não encontrado")

        old_status = db_order.status

        # Update order status
        updated_order = self.repository.update_order_status(order_uuid, status_enum)
        if not updated_order:
            raise ValueError(f"Falha ao atualizar status do pedido {delivery_order_id}")
        db_order = updated_order

        # Create appropriate tracking events and handle status-specific logic
        if status == DeliveryOrderStatus.READY_FOR_PICKUP:
            await self.create_tracking_event(
                delivery_order_id=order_uuid,
                event_type=TrackingEventType.READY_FOR_PICKUP,
                notes=notes or "Pedido pronto para coleta",
            )

        elif status == DeliveryOrderStatus.IN_TRANSIT:
            await self.create_tracking_event(
                delivery_order_id=order_uuid,
                event_type=TrackingEventType.IN_TRANSIT,
                notes=notes or "Pedido em trânsito",
            )

        elif status == DeliveryOrderStatus.DELIVERED:
            await self.create_tracking_event(
                delivery_order_id=order_uuid,
                event_type=TrackingEventType.DELIVERED,
                notes=notes or "Pedido entregue",
            )

            # Update courier status if assigned
            if db_order and db_order.courier_id:
                await self.update_courier_after_delivery(str(db_order.courier_id))

        elif status == DeliveryOrderStatus.CANCELLED:
            await self.create_tracking_event(
                delivery_order_id=order_uuid,
                event_type=TrackingEventType.CANCELLED,
                notes=notes or "Pedido cancelado",
            )

            # Update courier status if assigned
            if db_order and db_order.courier_id:
                await self.update_courier_after_delivery(str(db_order.courier_id))

        # Publish event
        from ...core.events.event_bus import EventType

        await self.event_bus.publish(
            Event(
                event_type=EventType.ORDER_STATUS_CHANGED,
                data={
                    "delivery_order_id": delivery_order_id,
                    "old_status": old_status.value,
                    "new_status": status.value,
                    "notes": notes,
                    "source": "delivery_service",
                },
                metadata={"module": "delivery"},
            ),
        )

        return self._convert_db_to_pydantic_order(db_order)

    async def get_delivery_order(
        self, delivery_order_id: str
    ) -> Optional[DeliveryOrder]:
        """Gets a delivery order by ID."""

        order_uuid = uuid.UUID(delivery_order_id)
        db_order = self.repository.get_delivery_order_by_id(order_uuid)

        if not db_order:
            return None

        return self._convert_db_to_pydantic_order(db_order)

    async def get_delivery_order_by_tracking(
        self, tracking_code: str
    ) -> Optional[DeliveryOrder]:
        """Gets a delivery order by tracking code."""

        db_order = self.repository.get_delivery_order_by_tracking(tracking_code)

        if not db_order:
            return None

        return self._convert_db_to_pydantic_order(db_order)

    async def list_delivery_orders(
        self,
        status: Optional[DeliveryOrderStatus] = None,
        courier_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[DeliveryOrder]:
        """Lists delivery orders with filters."""

        status_enum = DeliveryOrderStatusEnum(status.value) if status else None
        courier_uuid = uuid.UUID(courier_id) if courier_id else None

        db_orders = self.repository.list_delivery_orders(
            status=status_enum,
            courier_id=courier_uuid,
            customer_id=customer_id,
            from_date=from_date,
            to_date=to_date,
            limit=limit,
            offset=offset,
        )

        return [self._convert_db_to_pydantic_order(order) for order in db_orders]

    async def calculate_delivery_fee(
        self, address_id: str, order_value: float
    ) -> float:
        """Calculates delivery fee for an address."""

        # Get delivery zone for the address
        zone = await self.get_zone_for_address(address_id)

        if not zone:
            # Address outside delivery zones
            return 0.0

        # Calculate base fee
        fee = zone.base_fee

        # Apply additional rules
        if zone.min_order_value and order_value < zone.min_order_value:
            # Additional fee for orders below minimum value
            fee += 5.0

        # Calculate distance (simplified)
        distance = 5.0  # km

        # Add per-km fee if configured
        if zone.additional_fee_per_km:
            fee += distance * zone.additional_fee_per_km

        return round(fee, 2)

    async def estimate_delivery_time(self, address_id: str) -> int:
        """Estimates delivery time in minutes."""

        # Get delivery zone for the address
        zone = await self.get_zone_for_address(address_id)

        if not zone:
            # Address outside delivery zones
            return 60  # Default time

        # Calculate average time
        avg_time = (zone.min_delivery_time + zone.max_delivery_time) // 2

        # Add preparation time (15 minutes)
        total_time = avg_time + 15

        return total_time

    async def create_tracking_event(
        self,
        delivery_order_id: uuid.UUID,
        event_type: TrackingEventType,
        location: Optional[Dict[str, float]] = None,
        notes: Optional[str] = None,
    ) -> DeliveryTracking:
        """Creates a tracking event."""

        event_type_enum = TrackingEventTypeEnum(event_type.value)

        db_tracking = self.repository.create_tracking_event(
            delivery_order_id=delivery_order_id,
            event_type=event_type_enum,
            location=location,
            notes=notes,
            created_by="system",
        )

        return DeliveryTracking(
            id=str(db_tracking.id),
            delivery_order_id=str(db_tracking.delivery_order_id),
            event_type=event_type,
            timestamp=db_tracking.timestamp,  # type: ignore
            location=db_tracking.location,  # type: ignore
            notes=db_tracking.notes,  # type: ignore
            created_by=db_tracking.created_by or "system",  # type: ignore
        )

    async def get_tracking_history(
        self, delivery_order_id: str
    ) -> List[DeliveryTracking]:
        """Gets tracking history for a delivery order."""

        order_uuid = uuid.UUID(delivery_order_id)
        db_events = self.repository.get_tracking_history(order_uuid)

        tracking_events = []
        for event in db_events:
            tracking_events.append(
                DeliveryTracking(
                    id=str(event.id),
                    delivery_order_id=str(event.delivery_order_id),
                    event_type=TrackingEventType(event.event_type.value),
                    timestamp=event.timestamp,  # type: ignore
                    location=event.location,  # type: ignore
                    notes=event.notes,  # type: ignore
                    created_by=event.created_by or "system",  # type: ignore
                )
            )

        return tracking_events

    # Courier management methods
    async def create_courier(
        self,
        name: str,
        phone: str,
        vehicle_type: str,
        courier_type: CourierType,
        employee_id: Optional[str] = None,
        email: Optional[str] = None,
        vehicle_plate: Optional[str] = None,
        max_deliveries: int = 1,
        notes: Optional[str] = None,
    ) -> DeliveryCourier:
        """Creates a new courier."""

        courier_type_enum = CourierTypeEnum(courier_type.value)

        db_courier = self.repository.create_courier(
            name=name,
            phone=phone,
            vehicle_type=vehicle_type,
            courier_type=courier_type_enum,
            employee_id=employee_id,
            email=email,
            vehicle_plate=vehicle_plate,
            max_deliveries=max_deliveries,
            notes=notes,
        )

        # Publish event
        from ...core.events.event_bus import EventType

        await self.event_bus.publish(
            Event(
                event_type=EventType.DELIVERY_COURIER_UPDATED,
                data={
                    "courier_id": str(db_courier.id),
                    "name": name,
                    "courier_type": courier_type.value,
                    "action": "created",
                    "source": "courier_service",
                },
                metadata={"module": "delivery"},
            ),
        )

        return self._convert_db_to_pydantic_courier(db_courier)

    async def get_courier(self, courier_id: str) -> Optional[DeliveryCourier]:
        """Gets a courier by ID."""

        courier_uuid = uuid.UUID(courier_id)
        db_courier = self.repository.get_courier_by_id(courier_uuid)

        if not db_courier:
            return None

        return self._convert_db_to_pydantic_courier(db_courier)

    async def list_couriers(
        self,
        status: Optional[CourierStatus] = None,
        courier_type: Optional[CourierType] = None,
        is_active: bool = True,
    ) -> List[DeliveryCourier]:
        """Lists couriers with filters."""

        status_enum = CourierStatusEnum(status.value) if status else None
        type_enum = CourierTypeEnum(courier_type.value) if courier_type else None

        db_couriers = self.repository.list_couriers(
            status=status_enum, courier_type=type_enum, is_active=is_active
        )

        return [
            self._convert_db_to_pydantic_courier(courier) for courier in db_couriers
        ]

    async def update_courier_after_delivery(self, courier_id: str) -> DeliveryCourier:
        """Updates courier status after delivery completion."""

        courier_uuid = uuid.UUID(courier_id)
        db_courier = self.repository.get_courier_by_id(courier_uuid)

        if not db_courier:
            raise ValueError(f"Entregador {courier_id} não encontrado")

        # Decrement current deliveries
        current_deliveries = int(db_courier.current_deliveries) if db_courier.current_deliveries else 0  # type: ignore
        new_count = max(0, current_deliveries - 1)

        updates: Dict[str, Any] = {"current_deliveries": new_count}

        # If no more deliveries, set status to available
        if new_count == 0:
            updates["status"] = CourierStatusEnum.AVAILABLE

        updated_courier = self.repository.update_courier(courier_uuid, updates)

        if not updated_courier:
            raise ValueError(f"Falha ao atualizar entregador {courier_id}")

        # Publish event
        from ...core.events.event_bus import EventType

        await self.event_bus.publish(
            Event(
                event_type=EventType.DELIVERY_COURIER_UPDATED,
                data={
                    "courier_id": courier_id,
                    "status": updated_courier.status.value,
                    "current_deliveries": int(updated_courier.current_deliveries) if updated_courier.current_deliveries else 0,  # type: ignore
                    "action": "status_changed",
                    "source": "courier_service",
                },
                metadata={"module": "delivery"},
            ),
        )

        return self._convert_db_to_pydantic_courier(updated_courier)

    # Zone management methods
    async def get_zone_for_address(self, address_id: str) -> Optional[DeliveryZone]:
        """Gets the delivery zone for an address."""

        # In a real system, we would use geospatial functions to check
        # if the address is within any zone polygon
        # For now, return the first active zone as simulation

        db_zones = self.repository.list_zones(is_active=True)

        if db_zones:
            return self._convert_db_to_pydantic_zone(db_zones[0])

        return None

    async def get_courier_performance(
        self,
        courier_id: str,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Gets courier performance metrics."""

        courier_uuid = uuid.UUID(courier_id)
        return self.repository.get_courier_performance_stats(
            courier_uuid, from_date, to_date
        )


# Dependency function to get the service
def get_delivery_service(db: Session = Depends(get_db_session)) -> DeliveryDBService:
    """Get DeliveryDBService instance with database session."""
    return DeliveryDBService(db)
