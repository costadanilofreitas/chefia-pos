import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from src.core.events.event_bus import Event, EventBus, EventType


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


class InventoryEventPublisher:
    """Publisher for inventory events."""

    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus

    def _create_event(self, event_subtype: str, data: Dict[str, Any]) -> Event:
        """Helper to create inventory events."""
        return Event(
            event_type=EventType.SYSTEM_CONFIG_CHANGED,  # Using generic event type
            data=data,
            metadata={"source": "inventory", "event_subtype": event_subtype},
        )

    async def publish_item_created(self, item_id: uuid.UUID, item_data: Dict[str, Any]):
        """Publishes an item created event."""
        event = self._create_event(
            InventoryEventType.ITEM_CREATED,
            {"item_id": str(item_id), "item": item_data, "action": "item_created"},
        )
        await self.event_bus.publish(event)

    async def publish_item_updated(self, item_id: uuid.UUID, item_data: Dict[str, Any]):
        """Publishes an item updated event."""
        event = self._create_event(
            InventoryEventType.ITEM_UPDATED,
            {"item_id": str(item_id), "item": item_data, "action": "item_updated"},
        )
        await self.event_bus.publish(event)

    async def publish_item_deleted(self, item_id: uuid.UUID):
        """Publishes an item deleted event."""
        event = self._create_event(
            InventoryEventType.ITEM_DELETED,
            {"item_id": str(item_id), "action": "item_deleted"},
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
        event = self._create_event(
            InventoryEventType.STOCK_UPDATED,
            {
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
        event = self._create_event(
            InventoryEventType.TRANSACTION_CREATED,
            {
                "transaction_id": str(transaction_id),
                "transaction": transaction_data,
            },
        )
        await self.event_bus.publish(event)

    async def publish_transaction_approved(
        self, transaction_id: uuid.UUID, transaction_data: Dict[str, Any]
    ):
        """Publishes a transaction approved event."""
        event = self._create_event(
            InventoryEventType.TRANSACTION_APPROVED,
            {
                "transaction_id": str(transaction_id),
                "transaction": transaction_data,
            },
        )
        await self.event_bus.publish(event)

    async def publish_transaction_rejected(
        self, transaction_id: uuid.UUID, transaction_data: Dict[str, Any]
    ):
        """Publishes a transaction rejected event."""
        event = self._create_event(
            InventoryEventType.TRANSACTION_REJECTED,
            {
                "transaction_id": str(transaction_id),
                "transaction": transaction_data,
            },
        )
        await self.event_bus.publish(event)

    async def publish_loss_reported(
        self, loss_id: uuid.UUID, loss_data: Dict[str, Any]
    ):
        """Publishes a loss reported event."""
        event = self._create_event(
            InventoryEventType.LOSS_REPORTED,
            {"loss_id": str(loss_id), "loss": loss_data},
        )
        await self.event_bus.publish(event)

    async def publish_loss_approved(
        self, loss_id: uuid.UUID, loss_data: Dict[str, Any]
    ):
        """Publishes a loss approved event."""
        event = self._create_event(
            InventoryEventType.LOSS_APPROVED,
            {"loss_id": str(loss_id), "loss": loss_data},
        )
        await self.event_bus.publish(event)

    async def publish_loss_rejected(
        self, loss_id: uuid.UUID, loss_data: Dict[str, Any]
    ):
        """Publishes a loss rejected event."""
        event = self._create_event(
            InventoryEventType.LOSS_REJECTED,
            {"loss_id": str(loss_id), "loss": loss_data},
        )
        await self.event_bus.publish(event)

    async def publish_count_created(
        self, count_id: uuid.UUID, count_data: Dict[str, Any]
    ):
        """Publishes a count created event."""
        event = self._create_event(
            InventoryEventType.COUNT_CREATED,
            {"count_id": str(count_id), "count": count_data},
        )
        await self.event_bus.publish(event)

    async def publish_count_submitted(
        self, count_id: uuid.UUID, count_data: Dict[str, Any]
    ):
        """Publishes a count submitted event."""
        event = self._create_event(
            InventoryEventType.COUNT_SUBMITTED,
            {"count_id": str(count_id), "count": count_data},
        )
        await self.event_bus.publish(event)

    async def publish_count_approved(
        self, count_id: uuid.UUID, count_data: Dict[str, Any]
    ):
        """Publishes a count approved event."""
        event = self._create_event(
            InventoryEventType.COUNT_APPROVED,
            {"count_id": str(count_id), "count": count_data},
        )
        await self.event_bus.publish(event)

    async def publish_count_rejected(
        self, count_id: uuid.UUID, count_data: Dict[str, Any]
    ):
        """Publishes a count rejected event."""
        event = self._create_event(
            InventoryEventType.COUNT_REJECTED,
            {"count_id": str(count_id), "count": count_data},
        )
        await self.event_bus.publish(event)

    async def publish_low_stock_alert(
        self, item_id: uuid.UUID, current_stock: float, reorder_point: float
    ):
        """Publishes a low stock alert event."""
        event = self._create_event(
            InventoryEventType.LOW_STOCK_ALERT,
            {
                "item_id": str(item_id),
                "current_stock": current_stock,
                "reorder_point": reorder_point,
            },
        )
        await self.event_bus.publish(event)