from typing import Dict, Any, Optional, List
from enum import Enum
from datetime import datetime
import json
import uuid

from src.core.events.event_bus import get_event_bus, Event, EventType
from src.remote_orders.models.remote_order_models import RemoteOrderStatus, RemotePlatform

class RemoteOrderEventType(str, Enum):
    """Tipos de eventos relacionados a pedidos remotos."""
    REMOTE_ORDER_RECEIVED = "remote_order_received"
    REMOTE_ORDER_ACCEPTED = "remote_order_accepted"
    REMOTE_ORDER_REJECTED = "remote_order_rejected"
    REMOTE_ORDER_STATUS_CHANGED = "remote_order_status_changed"
    REMOTE_ORDER_ERROR = "remote_order_error"

class RemoteOrderEventPublisher:
    """Publicador de eventos relacionados a pedidos remotos."""
    
    def __init__(self):
        self.event_bus = get_event_bus()
    
    async def publish_order_received(self, order_id: str, platform: RemotePlatform, external_id: str) -> None:
        """Publica evento de pedido remoto recebido."""
        await self.event_bus.publish(Event(
            event_type=EventType.REMOTE_ORDER_RECEIVED,
            data={
                "order_id": order_id,
                "platform": platform,
                "external_id": external_id,
                "timestamp": datetime.now().isoformat()
            }
        ))
    
    async def publish_order_accepted(self, order_id: str, internal_order_id: str) -> None:
        """Publica evento de pedido remoto aceito."""
        await self.event_bus.publish(Event(
            event_type=EventType.REMOTE_ORDER_ACCEPTED,
            data={
                "order_id": order_id,
                "internal_order_id": internal_order_id,
                "timestamp": datetime.now().isoformat()
            }
        ))
    
    async def publish_order_rejected(self, order_id: str, reason: str) -> None:
        """Publica evento de pedido remoto rejeitado."""
        await self.event_bus.publish(Event(
            event_type=EventType.REMOTE_ORDER_REJECTED,
            data={
                "order_id": order_id,
                "reason": reason,
                "timestamp": datetime.now().isoformat()
            }
        ))
    
    async def publish_status_changed(self, order_id: str, old_status: RemoteOrderStatus, new_status: RemoteOrderStatus) -> None:
        """Publica evento de mudança de status de pedido remoto."""
        await self.event_bus.publish(Event(
            event_type=EventType.REMOTE_ORDER_STATUS_CHANGED,
            data={
                "order_id": order_id,
                "old_status": old_status,
                "new_status": new_status,
                "timestamp": datetime.now().isoformat()
            }
        ))
    
    async def publish_error(self, platform: RemotePlatform, error: str, details: Dict[str, Any] = None) -> None:
        """Publica evento de erro em pedido remoto."""
        await self.event_bus.publish(Event(
            event_type=EventType.REMOTE_ORDER_ERROR,
            data={
                "platform": platform,
                "error": error,
                "details": details or {},
                "timestamp": datetime.now().isoformat()
            }
        ))

# Instância singleton do publicador de eventos
remote_order_event_publisher = RemoteOrderEventPublisher()

def get_remote_order_event_publisher() -> RemoteOrderEventPublisher:
    """Retorna a instância singleton do publicador de eventos."""
    return remote_order_event_publisher
