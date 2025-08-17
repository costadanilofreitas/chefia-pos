from typing import Any, Dict

from src.core.events.event_bus import Event, EventHandler, EventType


class PaymentEventHandler(EventHandler):
    """Manipulador de eventos de pagamento."""

    async def handle(self, event: Event) -> bool:
        """Manipula eventos relacionados a pagamentos."""
        if event.event_type == EventType.PAYMENT_CREATED:
            await self._handle_payment_created(event.data)
        elif event.event_type == EventType.PAYMENT_STATUS_CHANGED:
            await self._handle_payment_status_changed(event.data)
        return True

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
            await event_bus.publish(
                Event(
                    event_type=EventType.PAYMENT_CONFIRMED,
                    data={"payment_id": payment_id, "order_id": order_id},
                )
            )

        # Se o pagamento falhou, publicar evento específico
        elif status in ["failed", "cancelled"]:
            from src.core.events.event_bus import get_event_bus

            event_bus = get_event_bus()
            await event_bus.publish(
                Event(
                    event_type=EventType.PAYMENT_FAILED,
                    data={
                        "payment_id": payment_id,
                        "order_id": order_id,
                        "reason": "Pagamento cancelado ou falhou",
                    },
                )
            )

