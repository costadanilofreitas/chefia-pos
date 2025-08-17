from datetime import datetime
from typing import Any, Dict, Optional

from src.core.events.event_bus import Event, EventHandler, EventType, get_event_bus
from src.waiter.models.waiter_models import WaiterOrder, WaiterOrderStatus

# Definição de tipos de eventos como strings para o módulo de garçom
WAITER_ORDER_CREATED = "waiter.order_created"
WAITER_ORDER_UPDATED = "waiter.order_updated"
WAITER_ORDER_SENT = "waiter.order_sent"
WAITER_ORDER_CANCELLED = "waiter.order_cancelled"
WAITER_SESSION_CREATED = "waiter.session_created"
WAITER_SESSION_UPDATED = "waiter.session_updated"
WAITER_TABLE_UPDATED = "waiter.table_updated"
WAITER_SYNC_REQUESTED = "waiter.sync_requested"
WAITER_SYNC_COMPLETED = "waiter.sync_completed"

# Eventos do KDS que o módulo Garçom escuta
KDS_ORDER_STATUS_CHANGED = "kds.order_status_changed"


class KDSEventHandler(EventHandler):
    """Handler para eventos do KDS."""

    def __init__(self, waiter_service):
        self.waiter_service = waiter_service

    async def handle(self, event: Event) -> bool:
        """Processa eventos do KDS."""
        if event.event_type == EventType.KDS_ORDERS_UPDATED:
            # Atualizar o status do pedido no módulo de garçom
            order_id = event.data["order_id"]
            new_status = event.data["status"]

            # Mapear status do KDS para status do garçom
            waiter_status = None
            if new_status == "preparing":
                waiter_status = WaiterOrderStatus.PREPARING
            elif new_status == "ready":
                waiter_status = WaiterOrderStatus.READY
            elif new_status == "delivered":
                waiter_status = WaiterOrderStatus.DELIVERED
            elif new_status == "cancelled":
                waiter_status = WaiterOrderStatus.CANCELLED

            if waiter_status:
                await self.waiter_service.update_order_status_from_event(
                    order_id, waiter_status
                )
        return True


class OrderEventHandler(EventHandler):
    """Handler para eventos de pedidos."""

    def __init__(self, waiter_service):
        self.waiter_service = waiter_service

    async def handle(self, event: Event) -> bool:
        """Processa eventos de pedidos."""
        # Use event_type attribute instead of type
        if event.event_type == EventType.ORDER_UPDATED:
            # Atualizar o pedido no módulo de garçom
            await self.waiter_service.update_order_from_event(event.data)
        return True


class WaiterEventPublisher:
    """Publicador de eventos do módulo de garçom."""

    def __init__(self):
        self.event_bus = get_event_bus()

    async def publish_order_created(self, waiter_order: WaiterOrder) -> None:
        """Publica evento de pedido criado no módulo de garçom."""
        event = Event(
            event_type=EventType.ORDER_CREATED,
            data=waiter_order.dict(),
            metadata={"source": "waiter", "event_subtype": WAITER_ORDER_CREATED}
        )
        await self.event_bus.publish(event)

    async def publish_order_updated(
        self, order_id: str, updates: Dict[str, Any]
    ) -> None:
        """Publica evento de pedido atualizado no módulo de garçom."""
        event = Event(
            event_type=EventType.ORDER_UPDATED,
            metadata={"source": "waiter", "event_subtype": WAITER_ORDER_UPDATED},
            data={
                "order_id": order_id,
                "updates": updates,
                "timestamp": datetime.now().isoformat(),
            },
        )
        await self.event_bus.publish(event)

    async def publish_order_sent(self, waiter_order: WaiterOrder) -> None:
        """Publica evento de pedido enviado para a cozinha."""
        event = Event(
            event_type=EventType.ORDER_STATUS_CHANGED,
            data=waiter_order.dict(),
            metadata={"source": "waiter", "event_subtype": WAITER_ORDER_SENT}
        )
        await self.event_bus.publish(event)

    async def publish_order_cancelled(
        self, order_id: str, reason: Optional[str] = None
    ) -> None:
        """Publica evento de pedido cancelado."""
        event = Event(
            event_type=EventType.ORDER_CANCELLED,
            metadata={"source": "waiter", "event_subtype": WAITER_ORDER_CANCELLED},
            data={
                "order_id": order_id,
                "reason": reason,
                "timestamp": datetime.now().isoformat(),
            },
        )
        await self.event_bus.publish(event)

    async def publish_session_created(self, session_data: Dict[str, Any]) -> None:
        """Publica evento de criação de sessão do garçom."""
        event = Event(
            event_type=EventType.SYSTEM_CONFIG_CHANGED,
            data=session_data,
            metadata={"source": "waiter", "event_subtype": WAITER_SESSION_CREATED}
        )
        await self.event_bus.publish(event)

    async def publish_session_updated(self, session_data: Dict[str, Any]) -> None:
        """Publica evento de atualização de sessão do garçom."""
        event = Event(
            event_type=EventType.SYSTEM_CONFIG_CHANGED,
            data=session_data,
            metadata={"source": "waiter", "event_subtype": WAITER_SESSION_UPDATED}
        )
        await self.event_bus.publish(event)

    async def publish_table_updated(self, table_data: Dict[str, Any]) -> None:
        """Publica evento de atualização de mesa."""
        event = Event(
            event_type=EventType.SYSTEM_CONFIG_CHANGED,
            data=table_data,
            metadata={"source": "waiter", "event_subtype": WAITER_TABLE_UPDATED}
        )
        await self.event_bus.publish(event)

    async def publish_sync_requested(self, device_id: str) -> None:
        """Publica evento de solicitação de sincronização."""
        event = Event(
            event_type=EventType.SYSTEM_CONFIG_CHANGED,
            metadata={"source": "waiter", "event_subtype": WAITER_SYNC_REQUESTED},
            data={"device_id": device_id, "timestamp": datetime.now().isoformat()},
        )
        await self.event_bus.publish(event)

    async def publish_sync_completed(
        self, device_id: str, sync_stats: Dict[str, Any]
    ) -> None:
        """Publica evento de sincronização concluída."""
        event = Event(
            event_type=EventType.SYSTEM_CONFIG_CHANGED,
            metadata={"source": "waiter", "event_subtype": WAITER_SYNC_COMPLETED},
            data={
                "device_id": device_id,
                "sync_stats": sync_stats,
                "timestamp": datetime.now().isoformat(),
            },
        )
        await self.event_bus.publish(event)


# Função para obter o publicador de eventos do módulo de garçom
_waiter_event_publisher = None


def get_waiter_event_publisher() -> WaiterEventPublisher:
    """Retorna a instância singleton do publicador de eventos do módulo de garçom."""
    global _waiter_event_publisher
    if _waiter_event_publisher is None:
        _waiter_event_publisher = WaiterEventPublisher()
    return _waiter_event_publisher
