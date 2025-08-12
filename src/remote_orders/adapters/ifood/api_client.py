"""
Módulo de integração com a API do iFood.

Este módulo implementa a integração completa com a API do iFood,
incluindo gerenciamento de pedidos, eventos, webhooks e notificações.
"""

import os
import json
import logging
import hmac
import hashlib
import requests
import asyncio
from typing import Dict, Any, List
from datetime import datetime

from .auth_manager import IFoodAuthManager
from ...models.remote_order_models import (
    RemoteOrder,
    RemoteOrderStatus,
    RemotePlatform,
    RemotePlatformConfig,
    RemoteOrderItem,
    RemoteOrderCustomer,
    RemoteOrderPayment,
)

# Configuração de logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class IFoodAPIClient:
    """Cliente para integração com a API do iFood."""

    def __init__(
        self,
        auth_manager: IFoodAuthManager = None,
        merchant_id: str = None,
        webhook_secret: str = None,
    ):
        """
        Inicializa o cliente da API do iFood.

        Args:
            auth_manager: Gerenciador de autenticação (opcional)
            merchant_id: ID do estabelecimento no iFood (opcional, padrão do ambiente)
            webhook_secret: Segredo para verificação de webhooks (opcional, padrão do ambiente)
        """
        # Configurações da API
        self.merchant_id = merchant_id or os.environ.get("IFOOD_MERCHANT_ID")
        self.webhook_secret = webhook_secret or os.environ.get("IFOOD_WEBHOOK_SECRET")

        # Gerenciador de autenticação
        self.auth_manager = auth_manager or IFoodAuthManager()

        # URL base da API
        self.base_url = "https://merchant-api.ifood.com.br"

        # Validar configurações
        if not self.merchant_id:
            logger.warning(
                "ID do estabelecimento no iFood não configurado. A integração não funcionará corretamente."
            )

        logger.info("Cliente da API do iFood inicializado")

    async def get_events(self, limit: int = 100) -> Dict[str, Any]:
        """
        Obtém eventos pendentes do iFood.

        Args:
            limit: Limite de eventos a serem retornados

        Returns:
            Dict[str, Any]: Eventos pendentes
        """
        try:
            # Obter cabeçalhos de autenticação
            headers = await self.auth_manager.get_auth_headers()

            # Fazer requisição para obter eventos
            response = requests.get(
                f"{self.base_url}/v1.0/events:polling?limit={limit}", headers=headers
            )

            # Verificar resposta
            response.raise_for_status()
            events = response.json()

            logger.info(f"Obtidos {len(events)} eventos do iFood")
            return {"success": True, "events": events}

        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao obter eventos do iFood: {str(e)}")
            error_response = None
            try:
                error_response = e.response.json() if hasattr(e, "response") else None
            except:
                pass

            return {"success": False, "error": str(e), "error_response": error_response}

    async def acknowledge_events(self, event_ids: List[str]) -> Dict[str, Any]:
        """
        Confirma o processamento de eventos do iFood.

        Args:
            event_ids: Lista de IDs de eventos a serem confirmados

        Returns:
            Dict[str, Any]: Resultado da confirmação
        """
        if not event_ids:
            logger.warning("Nenhum ID de evento fornecido para confirmação")
            return {"success": True, "message": "Nenhum evento para confirmar"}

        try:
            # Obter cabeçalhos de autenticação
            headers = await self.auth_manager.get_auth_headers()

            # Fazer requisição para confirmar eventos
            response = requests.post(
                f"{self.base_url}/v1.0/events/acknowledgment",
                headers=headers,
                json=event_ids,
            )

            # Verificar resposta
            response.raise_for_status()

            logger.info(f"Confirmados {len(event_ids)} eventos do iFood")
            return {"success": True, "acknowledged_count": len(event_ids)}

        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao confirmar eventos do iFood: {str(e)}")
            error_response = None
            try:
                error_response = e.response.json() if hasattr(e, "response") else None
            except:
                pass

            return {"success": False, "error": str(e), "error_response": error_response}

    async def get_order_details(self, order_id: str) -> Dict[str, Any]:
        """
        Obtém detalhes de um pedido do iFood.

        Args:
            order_id: ID do pedido no iFood

        Returns:
            Dict[str, Any]: Detalhes do pedido
        """
        try:
            # Obter cabeçalhos de autenticação
            headers = await self.auth_manager.get_auth_headers()

            # Fazer requisição para obter detalhes do pedido
            response = requests.get(
                f"{self.base_url}/v1.0/orders/{order_id}", headers=headers
            )

            # Verificar resposta
            response.raise_for_status()
            order = response.json()

            logger.info(f"Obtidos detalhes do pedido {order_id} do iFood")
            return {"success": True, "order": order}

        except requests.exceptions.RequestException as e:
            logger.error(
                f"Erro ao obter detalhes do pedido {order_id} do iFood: {str(e)}"
            )
            error_response = None
            try:
                error_response = e.response.json() if hasattr(e, "response") else None
            except:
                pass

            return {"success": False, "error": str(e), "error_response": error_response}

    async def update_order_status(
        self, order_id: str, status: str, reason: str = None
    ) -> Dict[str, Any]:
        """
        Atualiza o status de um pedido no iFood.

        Args:
            order_id: ID do pedido no iFood
            status: Novo status do pedido
            reason: Motivo da atualização (opcional, obrigatório para cancelamentos)

        Returns:
            Dict[str, Any]: Resultado da atualização
        """
        # Validar status
        valid_statuses = [
            "CONFIRMED",
            "READY_TO_PICKUP",
            "DISPATCHED",
            "CONCLUDED",
            "CANCELLED",
        ]

        if status not in valid_statuses:
            logger.error(f"Status inválido para atualização: {status}")
            return {
                "success": False,
                "error": f"Status inválido. Deve ser um dos seguintes: {', '.join(valid_statuses)}",
            }

        # Verificar se é cancelamento e tem motivo
        if status == "CANCELLED" and not reason:
            logger.error("Motivo obrigatório para cancelamento de pedido")
            return {
                "success": False,
                "error": "Motivo obrigatório para cancelamento de pedido",
            }

        try:
            # Obter cabeçalhos de autenticação
            headers = await self.auth_manager.get_auth_headers()

            # Preparar dados para atualização
            data = {"status": status}
            if reason:
                data["cancellationCode"] = "501"  # Código genérico
                data["details"] = reason

            # Fazer requisição para atualizar status
            response = requests.post(
                f"{self.base_url}/v1.0/orders/{order_id}/statuses",
                headers=headers,
                json=data,
            )

            # Verificar resposta
            response.raise_for_status()

            logger.info(
                f"Status do pedido {order_id} atualizado para {status} no iFood"
            )
            return {"success": True, "order_id": order_id, "status": status}

        except requests.exceptions.RequestException as e:
            logger.error(
                f"Erro ao atualizar status do pedido {order_id} no iFood: {str(e)}"
            )
            error_response = None
            try:
                error_response = e.response.json() if hasattr(e, "response") else None
            except:
                pass

            return {"success": False, "error": str(e), "error_response": error_response}

    async def verify_webhook_signature(self, signature: str, payload: str) -> bool:
        """
        Verifica a assinatura de um webhook do iFood.

        Args:
            signature: Assinatura do webhook
            payload: Conteúdo do webhook

        Returns:
            bool: True se a assinatura for válida, False caso contrário
        """
        if not self.webhook_secret:
            logger.warning("Segredo de webhook não configurado, pulando verificação")
            return True

        try:
            # Calcular assinatura esperada
            expected_signature = hmac.new(
                self.webhook_secret.encode(), payload.encode(), hashlib.sha256
            ).hexdigest()

            # Comparar assinaturas
            is_valid = hmac.compare_digest(signature, expected_signature)

            if not is_valid:
                logger.warning(
                    f"Assinatura de webhook inválida: {signature} != {expected_signature}"
                )

            return is_valid

        except Exception as e:
            logger.error(f"Erro ao verificar assinatura de webhook: {str(e)}")
            return False

    async def convert_to_remote_order(
        self, order_data: Dict[str, Any], config: RemotePlatformConfig
    ) -> RemoteOrder:
        """
        Converte dados do iFood para o formato interno de pedido remoto.

        Args:
            order_data: Dados do pedido do iFood
            config: Configuração da plataforma

        Returns:
            RemoteOrder: Pedido remoto convertido
        """
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
            logger.error(f"Erro ao converter pedido iFood: {str(e)}")
            logger.error(f"Dados do pedido: {json.dumps(order_data, indent=2)}")
            raise ValueError(f"Erro ao converter pedido iFood: {str(e)}")

    async def process_events(self, callback=None) -> Dict[str, Any]:
        """
        Processa eventos pendentes do iFood.

        Args:
            callback: Função de callback para processar eventos (opcional)

        Returns:
            Dict[str, Any]: Resultado do processamento
        """
        # Obter eventos pendentes
        events_result = await self.get_events()

        if not events_result.get("success"):
            logger.error(f"Erro ao obter eventos: {events_result.get('error')}")
            return events_result

        events = events_result.get("events", [])
        if not events:
            logger.info("Nenhum evento pendente para processar")
            return {"success": True, "processed_count": 0}

        # IDs de eventos processados
        processed_event_ids = []

        # Processar cada evento
        for event in events:
            try:
                event_id = event.get("id")
                event_type = event.get("code")

                logger.info(f"Processando evento {event_id} do tipo {event_type}")

                # Processar com base no tipo de evento
                if event_type == "PLACED":
                    # Novo pedido
                    order_id = event.get("orderId")

                    # Obter detalhes do pedido
                    order_result = await self.get_order_details(order_id)

                    if order_result.get("success"):
                        order_data = order_result.get("order")

                        # Chamar callback se fornecido
                        if callback:
                            await callback("new_order", order_data)
                    else:
                        logger.error(
                            f"Erro ao obter detalhes do pedido {order_id}: {order_result.get('error')}"
                        )

                elif event_type == "CANCELLED":
                    # Pedido cancelado
                    order_id = event.get("orderId")

                    # Chamar callback se fornecido
                    if callback:
                        await callback("order_cancelled", {"order_id": order_id})

                elif event_type == "INTEGRATION":
                    # Evento de integração
                    integration_code = event.get("metadata", {}).get("code")

                    # Chamar callback se fornecido
                    if callback:
                        await callback("integration", event.get("metadata", {}))

                # Adicionar ID do evento processado
                processed_event_ids.append(event_id)

            except Exception as e:
                logger.error(f"Erro ao processar evento: {str(e)}")

        # Confirmar eventos processados
        if processed_event_ids:
            ack_result = await self.acknowledge_events(processed_event_ids)

            if not ack_result.get("success"):
                logger.error(f"Erro ao confirmar eventos: {ack_result.get('error')}")

        return {
            "success": True,
            "processed_count": len(processed_event_ids),
            "total_count": len(events),
        }

    async def start_event_polling(
        self, callback=None, interval_seconds: int = 60
    ) -> None:
        """
        Inicia polling de eventos do iFood em background.

        Args:
            callback: Função de callback para processar eventos
            interval_seconds: Intervalo entre verificações em segundos
        """
        logger.info(
            f"Iniciando polling de eventos do iFood a cada {interval_seconds} segundos"
        )

        while True:
            try:
                # Processar eventos
                await self.process_events(callback)

            except Exception as e:
                logger.error(f"Erro no polling de eventos: {str(e)}")

            # Aguardar próxima verificação
            await asyncio.sleep(interval_seconds)
