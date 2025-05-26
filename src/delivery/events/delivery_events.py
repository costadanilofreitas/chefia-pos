from typing import Dict, Any, Optional
from datetime import datetime

from src.core.events.event_bus import EventHandler, Event, EventType, get_event_bus
from src.delivery.services.delivery_service import delivery_service
from src.delivery.models.delivery_models import DeliveryOrderStatus


class OrderCreatedHandler(EventHandler):
    """Handler para eventos de criação de pedido."""
    
    async def handle(self, event: Event) -> None:
        """Processa evento de criação de pedido."""
        if event.type == EventType.ORDER_CREATED:
            # Verificar se o pedido é para delivery
            order_data = event.data.get("order", {})
            if order_data.get("delivery", False):
                # Criar um pedido de delivery
                try:
                    await delivery_service.create_delivery_order(
                        order_id=order_data.get("id"),
                        customer_id=order_data.get("customer_id"),
                        address_id=order_data.get("delivery_address_id"),
                        delivery_fee=order_data.get("delivery_fee", 0),
                        delivery_notes=order_data.get("delivery_notes"),
                        payment_on_delivery=order_data.get("payment_on_delivery", False),
                        payment_amount=order_data.get("payment_amount"),
                        payment_method=order_data.get("payment_method")
                    )
                except Exception as e:
                    print(f"Erro ao criar pedido de delivery: {str(e)}")


class OrderStatusChangedHandler(EventHandler):
    """Handler para eventos de mudança de status de pedido."""
    
    async def handle(self, event: Event) -> None:
        """Processa evento de mudança de status de pedido."""
        if event.type == EventType.ORDER_STATUS_CHANGED:
            order_id = event.data.get("order_id")
            new_status = event.data.get("new_status")
            
            # Mapear status do pedido para status de delivery
            status_mapping = {
                "preparing": DeliveryOrderStatus.PREPARING,
                "ready": DeliveryOrderStatus.READY_FOR_PICKUP,
                "completed": DeliveryOrderStatus.DELIVERED,
                "cancelled": DeliveryOrderStatus.CANCELLED
            }
            
            if order_id and new_status in status_mapping:
                # Buscar pedidos de delivery associados a este pedido
                try:
                    delivery_orders = await delivery_service.list_delivery_orders()
                    for delivery_order in delivery_orders:
                        if delivery_order.order_id == order_id:
                            # Atualizar status do pedido de delivery
                            await delivery_service.update_order_status(
                                delivery_order_id=delivery_order.id,
                                status=status_mapping[new_status],
                                notes=f"Status atualizado automaticamente de {new_status}"
                            )
                except Exception as e:
                    print(f"Erro ao atualizar status do pedido de delivery: {str(e)}")


class DeliveryOrderStatusChangedHandler(EventHandler):
    """Handler para eventos de mudança de status de pedido de delivery."""
    
    async def handle(self, event: Event) -> None:
        """Processa evento de mudança de status de pedido de delivery."""
        if event.type == EventType.ORDER_STATUS_CHANGED and event.data.get("source") == "delivery_service":
            delivery_order_id = event.data.get("delivery_order_id")
            new_status = event.data.get("new_status")
            
            # Aqui seria implementada a lógica para notificar outros módulos
            # sobre a mudança de status do pedido de delivery
            
            # Por exemplo, se o pedido foi entregue, notificar o módulo de contas
            # para registrar o pagamento (se foi pago na entrega)
            if new_status == DeliveryOrderStatus.DELIVERED.value:
                delivery_order = await delivery_service.get_delivery_order(delivery_order_id)
                if delivery_order and delivery_order.payment_on_delivery:
                    # Aqui seria chamado o serviço de contas para registrar o pagamento
                    # accounts_service.register_payment(...)
                    pass


# Função para registrar os handlers no barramento de eventos
async def register_delivery_event_handlers():
    """Registra os handlers de eventos relacionados a delivery."""
    event_bus = get_event_bus()
    
    # Registrar handlers
    await event_bus.subscribe(EventType.ORDER_CREATED, OrderCreatedHandler())
    await event_bus.subscribe(EventType.ORDER_STATUS_CHANGED, OrderStatusChangedHandler())
    await event_bus.subscribe(EventType.ORDER_STATUS_CHANGED, DeliveryOrderStatusChangedHandler())
