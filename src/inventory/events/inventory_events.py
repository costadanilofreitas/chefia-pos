from typing import Dict, Any, Optional
from enum import Enum
from datetime import datetime
import uuid

from src.core.events.event_bus import EventBus, Event


class InventoryEventType(str, Enum):
    """Enum for inventory event types."""

    ITEM_CREATED = "item_created"
    ITEM_UPDATED = "item_updated"
    ITEM_DELETED = "item_deleted"
    STOCK_UPDATED = "stock_updated"
    TRANSACTION_CREATED = "transaction_created"
    TRANSACTION_APPROVED = "transaction_approved"
    TRANSACTION_REJECTED = "transaction_rejected"
    LOSS_REPORTED = "loss_reported"
    LOSS_APPROVED = "loss_approved"
    LOSS_REJECTED = "loss_rejected"
    COUNT_CREATED = "count_created"
    COUNT_SUBMITTED = "count_submitted"
    COUNT_APPROVED = "count_approved"
    COUNT_REJECTED = "count_rejected"
    LOW_STOCK_ALERT = "low_stock_alert"


class InventoryEvent(Event):
    """Base class for inventory events."""

    def __init__(
        self,
        event_type: InventoryEventType,
        data: Dict[str, Any],
        timestamp: Optional[datetime] = None,
    ):
        super().__init__(
            source="inventory",
            event_type=event_type,
            data=data,
            timestamp=timestamp or datetime.utcnow(),
        )


class InventoryEventPublisher:
    """Publisher for inventory events."""

    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus

    async def publish_item_created(self, item_id: uuid.UUID, item_data: Dict[str, Any]):
        """Publishes an item created event."""
        event = InventoryEvent(
            event_type=InventoryEventType.ITEM_CREATED,
            data={"item_id": str(item_id), "item": item_data},
        )
        await self.event_bus.publish(event)

    async def publish_item_updated(self, item_id: uuid.UUID, item_data: Dict[str, Any]):
        """Publishes an item updated event."""
        event = InventoryEvent(
            event_type=InventoryEventType.ITEM_UPDATED,
            data={"item_id": str(item_id), "item": item_data},
        )
        await self.event_bus.publish(event)

    async def publish_item_deleted(self, item_id: uuid.UUID):
        """Publishes an item deleted event."""
        event = InventoryEvent(
            event_type=InventoryEventType.ITEM_DELETED, data={"item_id": str(item_id)}
        )
        await self.event_bus.publish(event)

    async def publish_stock_updated(
        self,
        item_id: uuid.UUID,
        previous_stock: float,
        new_stock: float,
        transaction_id: Optional[uuid.UUID] = None,
    ):
        """Publishes a stock updated event."""
        event = InventoryEvent(
            event_type=InventoryEventType.STOCK_UPDATED,
            data={
                "item_id": str(item_id),
                "previous_stock": previous_stock,
                "new_stock": new_stock,
                "transaction_id": str(transaction_id) if transaction_id else None,
            },
        )
        await self.event_bus.publish(event)

    async def publish_transaction_created(
        self, transaction_id: uuid.UUID, transaction_data: Dict[str, Any]
    ):
        """Publishes a transaction created event."""
        event = InventoryEvent(
            event_type=InventoryEventType.TRANSACTION_CREATED,
            data={
                "transaction_id": str(transaction_id),
                "transaction": transaction_data,
            },
        )
        await self.event_bus.publish(event)

    async def publish_transaction_approved(
        self, transaction_id: uuid.UUID, transaction_data: Dict[str, Any]
    ):
        """Publishes a transaction approved event."""
        event = InventoryEvent(
            event_type=InventoryEventType.TRANSACTION_APPROVED,
            data={
                "transaction_id": str(transaction_id),
                "transaction": transaction_data,
            },
        )
        await self.event_bus.publish(event)

    async def publish_transaction_rejected(
        self, transaction_id: uuid.UUID, transaction_data: Dict[str, Any]
    ):
        """Publishes a transaction rejected event."""
        event = InventoryEvent(
            event_type=InventoryEventType.TRANSACTION_REJECTED,
            data={
                "transaction_id": str(transaction_id),
                "transaction": transaction_data,
            },
        )
        await self.event_bus.publish(event)

    async def publish_loss_reported(
        self, loss_id: uuid.UUID, loss_data: Dict[str, Any]
    ):
        """Publishes a loss reported event."""
        event = InventoryEvent(
            event_type=InventoryEventType.LOSS_REPORTED,
            data={"loss_id": str(loss_id), "loss": loss_data},
        )
        await self.event_bus.publish(event)

    async def publish_loss_approved(
        self, loss_id: uuid.UUID, loss_data: Dict[str, Any]
    ):
        """Publishes a loss approved event."""
        event = InventoryEvent(
            event_type=InventoryEventType.LOSS_APPROVED,
            data={"loss_id": str(loss_id), "loss": loss_data},
        )
        await self.event_bus.publish(event)

    async def publish_loss_rejected(
        self, loss_id: uuid.UUID, loss_data: Dict[str, Any]
    ):
        """Publishes a loss rejected event."""
        event = InventoryEvent(
            event_type=InventoryEventType.LOSS_REJECTED,
            data={"loss_id": str(loss_id), "loss": loss_data},
        )
        await self.event_bus.publish(event)

    async def publish_count_created(
        self, count_id: uuid.UUID, count_data: Dict[str, Any]
    ):
        """Publishes a count created event."""
        event = InventoryEvent(
            event_type=InventoryEventType.COUNT_CREATED,
            data={"count_id": str(count_id), "count": count_data},
        )
        await self.event_bus.publish(event)

    async def publish_count_submitted(
        self, count_id: uuid.UUID, count_data: Dict[str, Any]
    ):
        """Publishes a count submitted event."""
        event = InventoryEvent(
            event_type=InventoryEventType.COUNT_SUBMITTED,
            data={"count_id": str(count_id), "count": count_data},
        )
        await self.event_bus.publish(event)

    async def publish_count_approved(
        self, count_id: uuid.UUID, count_data: Dict[str, Any]
    ):
        """Publishes a count approved event."""
        event = InventoryEvent(
            event_type=InventoryEventType.COUNT_APPROVED,
            data={"count_id": str(count_id), "count": count_data},
        )
        await self.event_bus.publish(event)

    async def publish_count_rejected(
        self, count_id: uuid.UUID, count_data: Dict[str, Any]
    ):
        """Publishes a count rejected event."""
        event = InventoryEvent(
            event_type=InventoryEventType.COUNT_REJECTED,
            data={"count_id": str(count_id), "count": count_data},
        )
        await self.event_bus.publish(event)

    async def publish_low_stock_alert(
        self, item_id: uuid.UUID, current_stock: float, reorder_point: float
    ):
        """Publishes a low stock alert event."""
        event = InventoryEvent(
            event_type=InventoryEventType.LOW_STOCK_ALERT,
            data={
                "item_id": str(item_id),
                "current_stock": current_stock,
                "reorder_point": reorder_point,
            },
        )
        await self.event_bus.publish(event)
