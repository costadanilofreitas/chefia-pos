import logging
from typing import Any, Dict, Optional, cast

import aiohttp

from src.remote_orders.models.remote_order_models import (
    RemoteOrder,
    RemoteOrderCustomer,
    RemoteOrderDelivery,
    RemoteOrderItem,
    RemoteOrderPayment,
    RemoteOrderStatus,
    RemotePlatform,
)

logger = logging.getLogger(__name__)


class RappiAdapter:
    """Adaptador para integração com a API do Rappi."""

    def __init__(self, config: Dict[str, Any]):
        """
        Inicializa o adaptador com as configurações necessárias.

        Args:
            config: Dicionário com as configurações da integração Rappi
        """
        self.api_key = config.get("api_key")
        self.api_secret = config.get("api_secret")
        self.restaurant_id = config.get("restaurant_id")
        self.store_id = config.get("store_id")
        self.base_url = "https://api.rappi.com/api/v1"
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        """Inicializa a sessão HTTP."""
        headers: Dict[str, str] = {
            "Content-Type": "application/json"
        }
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        if self.api_secret:
            headers["X-API-Secret"] = self.api_secret
        
        self.session = aiohttp.ClientSession(headers=headers)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Fecha a sessão HTTP."""
        if self.session:
            await self.session.close()
            self.session = None

    async def convert_to_remote_order(self, rappi_order: Dict[str, Any]) -> RemoteOrder:
        """
        Converte um pedido do formato Rappi para o formato interno RemoteOrder.

        Args:
            rappi_order: Pedido no formato da API Rappi

        Returns:
            RemoteOrder: Pedido no formato interno
        """
        # Extrair informações do cliente
        customer_data = rappi_order.get("customer", {})
        customer = RemoteOrderCustomer(
            id=customer_data.get("id", ""),
            name=customer_data.get("name", ""),
            email=customer_data.get("email", ""),
            phone=customer_data.get("phone", ""),
            address=customer_data.get("address", {}),
        )

        # Extrair itens do pedido
        items_data = rappi_order.get("items", [])
        items = []
        for item_data in items_data:
            item = RemoteOrderItem(
                id=item_data.get("id", ""),
                name=item_data.get("name", ""),
                quantity=item_data.get("quantity", 1),
                unit_price=item_data.get("unitPrice", 0.0),
                total_price=item_data.get("totalPrice", 0.0),
                notes=item_data.get("notes", ""),
                options=item_data.get("options", []),
            )
            items.append(item)

        # Extrair informações de pagamento
        payment_data = rappi_order.get("payment", {})
        payment = RemoteOrderPayment(
            method=payment_data.get("method", ""),
            status=payment_data.get("status", ""),
            total=payment_data.get("total", 0.0),
            currency=payment_data.get("currency", "BRL"),
            online=payment_data.get("online", False),
        )

        # Extrair informações de entrega
        delivery_data = rappi_order.get("delivery", {})
        delivery = RemoteOrderDelivery(
            address=delivery_data.get("address", {}),
            fee=delivery_data.get("fee", 0.0),
            estimated_time=delivery_data.get("estimatedTime", 0),
            instructions=delivery_data.get("notes", ""),
        )

        # Criar o pedido remoto
        remote_order = RemoteOrder(
            id=f"rappi_{rappi_order.get('id', '')}",
            platform=RemotePlatform.RAPPI,
            external_order_id=rappi_order.get("id", ""),
            status=RemoteOrderStatus.PENDING,
            items=items,
            customer=customer,
            payment=payment,
            subtotal=rappi_order.get("subtotal", 0.0),
            total=rappi_order.get("totalAmount", 0.0),
            raw_data=rappi_order,
            delivery=delivery.dict() if delivery else None,
        )

        return remote_order

    async def convert_status_to_rappi(self, status: RemoteOrderStatus) -> str:
        """
        Converte um status interno para o formato da API Rappi.

        Args:
            status: Status interno do pedido

        Returns:
            str: Status no formato da API Rappi
        """
        status_mapping = {
            RemoteOrderStatus.PENDING: "PENDING",
            RemoteOrderStatus.CONFIRMED: "CONFIRMED",
            RemoteOrderStatus.REJECTED: "REJECTED",
            RemoteOrderStatus.PREPARING: "PREPARING",
            RemoteOrderStatus.READY: "READY",
            RemoteOrderStatus.DELIVERING: "DELIVERING",
            RemoteOrderStatus.DELIVERED: "DELIVERED",
            RemoteOrderStatus.CANCELLED: "CANCELLED",
        }

        return status_mapping.get(status, "PENDING")

    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """
        Obtém os detalhes de um pedido da API Rappi.

        Args:
            order_id: ID do pedido no Rappi

        Returns:
            Dict: Detalhes do pedido
        """
        if not self.session:
            raise ValueError("Session not initialized. Use 'async with' context.")

        url = f"{self.base_url}/orders/{order_id}"

        async with self.session.get(url) as response:
            if response.status != 200:
                error_text = await response.text()
                logger.error(f"Error getting order from Rappi: {error_text}")
                raise Exception(f"Failed to get order from Rappi: {response.status}")

            return await response.json()

    async def update_order_status(
        self, order_id: str, status: RemoteOrderStatus
    ) -> bool:
        """
        Atualiza o status de um pedido na API Rappi.

        Args:
            order_id: ID do pedido no Rappi
            status: Novo status do pedido

        Returns:
            bool: True se a atualização foi bem-sucedida
        """
        if not self.session:
            raise ValueError("Session not initialized. Use 'async with' context.")

        rappi_status = await self.convert_status_to_rappi(status)
        url = f"{self.base_url}/orders/{order_id}/status"

        payload = {"status": rappi_status}

        async with self.session.put(url, json=payload) as response:
            if response.status != 200:
                error_text = await response.text()
                logger.error(f"Error updating order status in Rappi: {error_text}")
                return False

            return True

    async def reject_order(self, order_id: str, reason: str) -> bool:
        """
        Rejeita um pedido na API Rappi.

        Args:
            order_id: ID do pedido no Rappi
            reason: Motivo da rejeição

        Returns:
            bool: True se a rejeição foi bem-sucedida
        """
        if not self.session:
            raise ValueError("Session not initialized. Use 'async with' context.")

        url = f"{self.base_url}/orders/{order_id}/reject"

        payload = {"reason": reason}

        async with self.session.post(url, json=payload) as response:
            if response.status != 200:
                error_text = await response.text()
                logger.error(f"Error rejecting order in Rappi: {error_text}")
                return False

            return True

    async def process_webhook(
        self, webhook_data: Dict[str, Any]
    ) -> Optional[RemoteOrder]:
        """
        Processa dados recebidos via webhook do Rappi.

        Args:
            webhook_data: Dados recebidos no webhook

        Returns:
            Optional[RemoteOrder]: Pedido processado ou None se não for um pedido
        """
        event_type = webhook_data.get("eventType")

        if event_type == "ORDER_CREATED":
            order_data = webhook_data.get("order", {})
            return await self.convert_to_remote_order(order_data)
        elif event_type == "ORDER_STATUS_UPDATED":
            # Processar atualização de status
            logger.info(f"Received status update from Rappi: {webhook_data}")
            return None
        elif event_type == "ORDER_CANCELLED":
            # Processar cancelamento
            logger.info(f"Received cancellation from Rappi: {webhook_data}")
            return None

        logger.warning(f"Unknown event type from Rappi: {event_type}")
        return None

    async def request_refund(
        self, order_id: str, reason: str, amount: Optional[float] = None
    ) -> bool:
        """
        Solicita reembolso para um pedido na API Rappi.

        Args:
            order_id: ID do pedido no Rappi
            reason: Motivo do reembolso
            amount: Valor a ser reembolsado (opcional, se não informado, reembolsa o valor total)

        Returns:
            bool: True se a solicitação foi bem-sucedida
        """
        if not self.session:
            raise ValueError("Session not initialized. Use 'async with' context.")

        url = f"{self.base_url}/orders/{order_id}/refund"

        payload: Dict[str, Any] = {"reason": reason}

        if amount is not None:
            payload["amount"] = amount

        async with self.session.post(url, json=payload) as response:
            if response.status != 200:
                error_text = await response.text()
                logger.error(f"Error requesting refund in Rappi: {error_text}")
                return False

            return True

    async def get_restaurant_menu(self) -> Dict[str, Any]:
        """
        Obtém o cardápio do restaurante na API Rappi.

        Returns:
            Dict: Cardápio do restaurante
        """
        if not self.session:
            raise ValueError("Session not initialized. Use 'async with' context.")

        url = f"{self.base_url}/restaurants/{self.restaurant_id}/menu"

        async with self.session.get(url) as response:
            if response.status != 200:
                error_text = await response.text()
                logger.error(f"Error getting restaurant menu from Rappi: {error_text}")
                raise Exception(
                    f"Failed to get restaurant menu from Rappi: {response.status}"
                )

            return await response.json()

    async def update_product_availability(
        self, product_id: str, available: bool
    ) -> bool:
        """
        Atualiza a disponibilidade de um produto na API Rappi.

        Args:
            product_id: ID do produto no Rappi
            available: True se o produto está disponível, False caso contrário

        Returns:
            bool: True se a atualização foi bem-sucedida
        """
        if not self.session:
            raise ValueError("Session not initialized. Use 'async with' context.")

        url = f"{self.base_url}/restaurants/{self.restaurant_id}/products/{product_id}/availability"

        payload = {"available": available}

        async with self.session.put(url, json=payload) as response:
            if response.status != 200:
                error_text = await response.text()
                logger.error(
                    f"Error updating product availability in Rappi: {error_text}"
                )
                return False

            return True

    async def notify_customer(self, order_id: str, message: str) -> bool:
        """
        Envia uma notificação para o cliente via API Rappi.

        Args:
            order_id: ID do pedido no Rappi
            message: Mensagem a ser enviada

        Returns:
            bool: True se a notificação foi enviada com sucesso
        """
        if not self.session:
            raise ValueError("Session not initialized. Use 'async with' context.")

        url = f"{self.base_url}/orders/{order_id}/notify"

        payload = {"message": message}

        async with self.session.post(url, json=payload) as response:
            if response.status != 200:
                error_text = await response.text()
                logger.error(
                    f"Error sending notification to customer via Rappi: {error_text}"
                )
                return False

            return True

    async def validate_webhook_signature(self, signature: str, payload: str) -> bool:
        """
        Valida a assinatura de um webhook do Rappi.

        Args:
            signature: Assinatura recebida no cabeçalho do webhook
            payload: Conteúdo do webhook em formato string

        Returns:
            bool: True se a assinatura é válida
        """
        import hashlib
        import hmac

        if not self.api_secret:
            return False

        expected_signature = hmac.new(
            self.api_secret.encode(), payload.encode(), hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(signature, expected_signature)
