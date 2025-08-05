from typing import Dict, Any
from enum import Enum

from src.core.events.event_bus import Event, EventHandler, EventType

class PaymentEventType(str, Enum):
    """Tipos de eventos relacionados a pagamentos."""
    PAYMENT_CREATED = "payment_created"
    PAYMENT_STATUS_CHANGED = "payment_status_changed"
    PAYMENT_CONFIRMED = "payment_confirmed"
    PAYMENT_FAILED = "payment_failed"

class PaymentEventHandler(EventHandler):
    """Manipulador de eventos de pagamento."""
    
    async def handle_event(self, event: Event) -> None:
        """Manipula eventos relacionados a pagamentos."""
        if event.event_type == EventType.PAYMENT_CREATED:
            await self._handle_payment_created(event.data)
        elif event.event_type == EventType.PAYMENT_STATUS_CHANGED:
            await self._handle_payment_status_changed(event.data)
    
    async def _handle_payment_created(self, data: Dict[str, Any]) -> None:
        """Manipula evento de criação de pagamento."""
        # Aqui poderia enviar notificações adicionais, atualizar estatísticas, etc.
        print(f"Pagamento criado: {data.get('id')}")
    
    async def _handle_payment_status_changed(self, data: Dict[str, Any]) -> None:
        """Manipula evento de mudança de status de pagamento."""
        payment_id = data.get("payment_id")
        status = data.get("status")
        order_id = data.get("order_id")
        
        print(f"Status do pagamento {payment_id} alterado para {status}")
        
        # Se o pagamento foi confirmado, publicar evento específico
        if status in ["confirmed", "received"]:
            from src.core.events.event_bus import get_event_bus
            event_bus = get_event_bus()
            await event_bus.publish(Event(
                event_type=EventType.PAYMENT_CONFIRMED,
                data={
                    "payment_id": payment_id,
                    "order_id": order_id
                }
            ))
        
        # Se o pagamento falhou, publicar evento específico
        elif status in ["failed", "cancelled"]:
            from src.core.events.event_bus import get_event_bus
            event_bus = get_event_bus()
            await event_bus.publish(Event(
                event_type=EventType.PAYMENT_FAILED,
                data={
                    "payment_id": payment_id,
                    "order_id": order_id,
                    "reason": "Pagamento cancelado ou falhou"
                }
            ))

# Registrar manipulador de eventos
def register_payment_event_handlers():
    """Registra manipuladores de eventos de pagamento."""
    from src.core.events.event_bus import get_event_bus
    event_bus = get_event_bus()
    
    # Adicionar EventType.PAYMENT_CREATED e EventType.PAYMENT_STATUS_CHANGED ao EventType
    if not hasattr(EventType, "PAYMENT_CREATED"):
        EventType.PAYMENT_CREATED = "payment_created"
    
    if not hasattr(EventType, "PAYMENT_STATUS_CHANGED"):
        EventType.PAYMENT_STATUS_CHANGED = "payment_status_changed"
    
    if not hasattr(EventType, "PAYMENT_CONFIRMED"):
        EventType.PAYMENT_CONFIRMED = "payment_confirmed"
    
    if not hasattr(EventType, "PAYMENT_FAILED"):
        EventType.PAYMENT_FAILED = "payment_failed"
    
    # Registrar manipulador
    handler = PaymentEventHandler()
    event_bus.register_handler(EventType.PAYMENT_CREATED, handler)
    event_bus.register_handler(EventType.PAYMENT_STATUS_CHANGED, handler)
