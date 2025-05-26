from typing import Dict, Any, Optional
from src.core.events.event_bus import Event, EventType, EventHandler, get_event_bus
from src.kds.models.kds_models import KDSOrder, KDSOrderItem, KDSOrderStatus
from datetime import datetime
import json
import asyncio
from enum import Enum # Import Enum

# Definição de novos tipos de eventos para o KDS
# Enums cannot inherit from other Enums in Python
# Define KDSEventType as a separate Enum
class KDSEventType(str, Enum):
    """Tipos de eventos específicos do KDS."""
    KDS_ORDER_RECEIVED = "kds.order_received"
    KDS_ORDER_STATUS_CHANGED = "kds.order_status_changed"
    KDS_ITEM_STATUS_CHANGED = "kds.item_status_changed"
    KDS_SESSION_CREATED = "kds.session_created"
    KDS_SESSION_UPDATED = "kds.session_updated"
    KDS_STATS_UPDATED = "kds.stats_updated"

class OrderEventHandler(EventHandler):
    """Handler para eventos de pedidos."""
    
    def __init__(self, kds_service):
        self.kds_service = kds_service
    
    async def handle(self, event: Event) -> None:
        """Processa eventos de pedidos."""
        # Use the base EventType for comparison
        if event.type == EventType.ORDER_CREATED:
            # Converter o pedido para o formato KDS
            await self.kds_service.process_new_order(event.data)
        
        elif event.type == EventType.ORDER_UPDATED:
            # Atualizar o pedido no KDS
            await self.kds_service.update_order_from_event(event.data)
        
        elif event.type == EventType.ORDER_CANCELLED:
            # Cancelar o pedido no KDS
            await self.kds_service.cancel_order(event.data["order_id"])
        
        elif event.type == EventType.ORDER_STATUS_CHANGED:
            # Atualizar o status do pedido no KDS
            await self.kds_service.update_order_status_from_event(
                event.data["order_id"], 
                event.data["status"]
            )

class KDSEventPublisher:
    """Publicador de eventos do KDS."""
    
    def __init__(self):
        self.event_bus = get_event_bus()
    
    async def publish_order_received(self, kds_order: KDSOrder) -> None:
        """Publica evento de pedido recebido no KDS."""
        event = Event(
            event_type=KDSEventType.KDS_ORDER_RECEIVED, # Use KDSEventType here
            data=kds_order.dict()
        )
        await self.event_bus.publish(event)
    
    async def publish_order_status_changed(
        self, 
        order_id: str, 
        status: KDSOrderStatus,
        previous_status: Optional[KDSOrderStatus] = None
    ) -> None:
        """Publica evento de mudança de status de pedido no KDS."""
        event = Event(
            event_type=KDSEventType.KDS_ORDER_STATUS_CHANGED, # Use KDSEventType here
            data={
                "order_id": order_id,
                "status": status,
                "previous_status": previous_status,
                "timestamp": datetime.now().isoformat()
            }
        )
        await self.event_bus.publish(event)
    
    async def publish_item_status_changed(
        self, 
        order_id: str,
        item_id: str,
        status: KDSOrderStatus,
        previous_status: Optional[KDSOrderStatus] = None
    ) -> None:
        """Publica evento de mudança de status de item no KDS."""
        event = Event(
            event_type=KDSEventType.KDS_ITEM_STATUS_CHANGED, # Use KDSEventType here
            data={
                "order_id": order_id,
                "item_id": item_id,
                "status": status,
                "previous_status": previous_status,
                "timestamp": datetime.now().isoformat()
            }
        )
        await self.event_bus.publish(event)
    
    async def publish_session_created(self, session_data: Dict[str, Any]) -> None:
        """Publica evento de criação de sessão do KDS."""
        event = Event(
            event_type=KDSEventType.KDS_SESSION_CREATED, # Use KDSEventType here
            data=session_data
        )
        await self.event_bus.publish(event)
    
    async def publish_session_updated(self, session_data: Dict[str, Any]) -> None:
        """Publica evento de atualização de sessão do KDS."""
        event = Event(
            event_type=KDSEventType.KDS_SESSION_UPDATED, # Use KDSEventType here
            data=session_data
        )
        await self.event_bus.publish(event)
    
    async def publish_stats_updated(self, stats_data: Dict[str, Any]) -> None:
        """Publica evento de atualização de estatísticas do KDS."""
        event = Event(
            event_type=KDSEventType.KDS_STATS_UPDATED, # Use KDSEventType here
            data=stats_data
        )
        await self.event_bus.publish(event)

# Função para obter o publicador de eventos do KDS
_kds_event_publisher = None

def get_kds_event_publisher() -> KDSEventPublisher:
    """Retorna a instância singleton do publicador de eventos do KDS."""
    global _kds_event_publisher
    if _kds_event_publisher is None:
        _kds_event_publisher = KDSEventPublisher()
    return _kds_event_publisher

