from typing import Dict, Any
import json
import uuid
from datetime import datetime

from src.remote_orders.models.remote_order_models import (
    RemoteOrder,
    RemoteOrderStatus,
    RemotePlatform,
    RemotePlatformConfig,
    RemoteOrderItem,
    RemoteOrderCustomer,
    RemoteOrderPayment,
)


class IFoodAdapter:
    """Adaptador para integração com a plataforma iFood."""

    async def convert_to_remote_order(
        self, order_data: Dict[str, Any], config: RemotePlatformConfig
    ) -> RemoteOrder:
        """Converte dados do iFood para o formato interno de pedido remoto."""
        try:
            # Extrair dados básicos do pedido
            external_id = order_data.get("id")
            if not external_id:
                raise ValueError("ID do pedido iFood não encontrado")

            # Extrair itens
            items_data = order_data.get("items", [])
            items = []
            for item_data in items_data:
                item = RemoteOrderItem(
                    id=str(uuid.uuid4()),  # ID interno temporário
                    external_id=item_data.get("id"),
                    name=item_data.get("name"),
                    quantity=item_data.get("quantity", 1),
                    unit_price=float(item_data.get("unitPrice", 0)),
                    total_price=float(item_data.get("totalPrice", 0)),
                    notes=item_data.get("notes"),
                    customizations=[c for c in item_data.get("options", [])],
                )
                items.append(item)

            # Extrair dados do cliente
            customer_data = order_data.get("customer", {})
            customer = RemoteOrderCustomer(
                name=customer_data.get("name", "Cliente iFood"),
                phone=customer_data.get("phone"),
                email=customer_data.get("email"),
                document=customer_data.get("documentNumber"),
                address=order_data.get("deliveryAddress"),
            )

            # Extrair dados de pagamento
            payment_data = (
                order_data.get("payments", [{}])[0]
                if order_data.get("payments")
                else {}
            )
            payment = RemoteOrderPayment(
                method=payment_data.get("method", "ONLINE"),
                status=payment_data.get("status", "PAID"),
                total=float(order_data.get("totalPrice", 0)),
                prepaid=payment_data.get("prepaid", True),
            )

            # Criar pedido remoto
            remote_order = RemoteOrder(
                id=str(uuid.uuid4()),
                platform=RemotePlatform.IFOOD,
                external_order_id=external_id,
                status=RemoteOrderStatus.PENDING,
                items=items,
                customer=customer,
                payment=payment,
                subtotal=float(order_data.get("subTotal", 0)),
                delivery_fee=float(order_data.get("deliveryFee", 0)),
                discount=float(order_data.get("discount", 0)),
                total=float(order_data.get("totalPrice", 0)),
                notes=order_data.get("notes"),
                scheduled_for=(
                    datetime.fromisoformat(order_data.get("scheduledFor"))
                    if order_data.get("scheduledFor")
                    else None
                ),
                raw_data=order_data,
            )

            return remote_order

        except Exception as e:
            # Registrar erro detalhado
            print(f"Erro ao converter pedido iFood: {str(e)}")
            print(f"Dados do pedido: {json.dumps(order_data, indent=2)}")
            raise ValueError(f"Erro ao converter pedido iFood: {str(e)}")

    async def update_order_status(
        self, remote_order: RemoteOrder, config: RemotePlatformConfig
    ) -> bool:
        """Atualiza o status de um pedido no iFood."""
        # Mapear status interno para status do iFood
        ifood_status_mapping = {
            RemoteOrderStatus.ACCEPTED: "CONFIRMED",
            RemoteOrderStatus.PREPARING: "PREPARING",
            RemoteOrderStatus.READY: "READY_FOR_PICKUP",
            RemoteOrderStatus.DELIVERING: "DISPATCHED",
            RemoteOrderStatus.DELIVERED: "CONCLUDED",
            RemoteOrderStatus.CANCELLED: "CANCELLED",
        }

        ifood_status = ifood_status_mapping.get(remote_order.status)
        if not ifood_status:
            print(f"Status {remote_order.status} não mapeável para iFood")
            return False

        # Em uma implementação real, aqui faria a chamada para a API do iFood
        # Exemplo:
        # async with aiohttp.ClientSession() as session:
        #     headers = {
        #         "Authorization": f"Bearer {config.api_key}",
        #         "Content-Type": "application/json"
        #     }
        #     data = {
        #         "status": ifood_status
        #     }
        #     url = f"https://merchant-api.ifood.com.br/order/{remote_order.external_order_id}/status"
        #     async with session.patch(url, headers=headers, json=data) as response:
        #         if response.status != 200:
        #             error_text = await response.text()
        #             raise ValueError(f"Erro ao atualizar status no iFood: {error_text}")
        #         return True

        # Para fins de simulação, apenas logamos a ação
        print(
            f"[SIMULAÇÃO] Atualizando status do pedido {remote_order.external_order_id} para {ifood_status} no iFood"
        )
        return True

    async def authenticate(self, config: RemotePlatformConfig) -> str:
        """Autentica com a API do iFood e retorna token de acesso."""
        # Em uma implementação real, aqui faria a autenticação com a API do iFood
        # Exemplo:
        # async with aiohttp.ClientSession() as session:
        #     headers = {
        #         "Content-Type": "application/x-www-form-urlencoded"
        #     }
        #     data = {
        #         "client_id": config.api_key,
        #         "client_secret": config.api_secret,
        #         "grant_type": "client_credentials"
        #     }
        #     url = "https://merchant-api.ifood.com.br/oauth/token"
        #     async with session.post(url, headers=headers, data=data) as response:
        #         if response.status != 200:
        #             error_text = await response.text()
        #             raise ValueError(f"Erro ao autenticar com iFood: {error_text}")
        #         response_data = await response.json()
        #         return response_data.get("access_token")

        # Para fins de simulação, retornamos um token fictício
        return "simulated_ifood_token"

    async def verify_webhook_signature(
        self, signature: str, payload: str, config: RemotePlatformConfig
    ) -> bool:
        """Verifica a assinatura de um webhook do iFood."""
        # Em uma implementação real, verificaria a assinatura do webhook
        # Exemplo:
        # import hmac
        # import hashlib
        #
        # expected_signature = hmac.new(
        #     config.api_secret.encode(),
        #     payload.encode(),
        #     hashlib.sha256
        # ).hexdigest()
        #
        # return hmac.compare_digest(signature, expected_signature)

        # Para fins de simulação, sempre retornamos True
        return True
