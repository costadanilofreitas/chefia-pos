from src.order.services.order_service import order_service as original_order_service
from src.sat.events.sat_events import get_sat_event_publisher
from src.sat.services.sat_service import get_sat_service


# Estender o serviço de pedidos para integrar com SAT
class OrderServiceWithSAT:
    """Extensão do serviço de pedidos com integração SAT."""

    def __init__(self, original_service):
        self.original_service = original_service
        self.sat_service = get_sat_service()
        self.sat_event_publisher = get_sat_event_publisher()

    async def __getattr__(self, name):
        """Delega métodos não implementados para o serviço original."""
        return getattr(self.original_service, name)

    async def finalize_order(self, order_id: str, payment_method: str):
        """Finaliza um pedido com integração opcional com SAT."""
        # Chamar o método original para finalizar o pedido
        order = await self.original_service.finalize_order(order_id, payment_method)

        if not order:
            return None

        # Extrair terminal_id do pedido (em uma implementação real, seria do pedido)
        # Aqui estamos usando um terminal_id fixo para fins de demonstração
        terminal_id = "1"

        # Verificar se o SAT está habilitado para este terminal
        is_enabled = await self.sat_service.is_enabled(terminal_id)

        if is_enabled:
            # Converter o pedido para o formato esperado pelo SAT
            order_data = {
                "id": order.id,
                "total": order.total,
                "discount": order.discount or 0,
                "service_fee": order.service_fee or 0,
                "items": [
                    {
                        "product_id": item.product_id,
                        "name": item.name,
                        "quantity": item.quantity,
                        "unit": "UN",
                        "price": item.price,
                        "total": item.total,
                    }
                    for item in order.items
                ],
                "payment": {"method": payment_method, "amount": order.total},
            }

            # Adicionar informações do cliente, se disponíveis
            if hasattr(order, "customer") and order.customer:
                order_data["customer"] = {
                    "document": getattr(order.customer, "document", ""),
                    "name": getattr(order.customer, "name", ""),
                }

            # Publicar evento para emissão de CF-e
            await self.sat_event_publisher.publish_emit_requested(order.id, terminal_id)

            # Emitir CF-e diretamente (alternativa ao fluxo baseado em eventos)
            # response = await self.sat_service.emit_cfe(order_data, terminal_id)

            # Adicionar informação de que o pedido foi enviado para emissão fiscal
            order.fiscal_note_requested = True

        return order


# Substituir o serviço original pelo estendido
order_service = OrderServiceWithSAT(original_order_service)
