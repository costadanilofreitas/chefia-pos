"""
Módulo de integração com webhooks do iFood.

Este módulo implementa o processamento de webhooks do iFood,
incluindo verificação de assinatura, processamento de eventos
e integração com o sistema de pedidos.
"""

import os
import json
import logging
from typing import Dict, Any, Callable
from fastapi import Request, BackgroundTasks, Header

from .api_client import IFoodAPIClient
from ...models.remote_order_models import RemoteOrderStatus

# Configuração de logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class IFoodWebhookHandler:
    """Manipulador de webhooks do iFood."""

    def __init__(
        self,
        api_client: IFoodAPIClient = None,
        webhook_secret: str = None,
        order_confirmation_handler: Callable = None,
        notification_handler: Callable = None,
    ):
        """
        Inicializa o manipulador de webhooks do iFood.

        Args:
            api_client: Cliente da API do iFood (opcional)
            webhook_secret: Segredo para verificação de webhooks (opcional, padrão do ambiente)
            order_confirmation_handler: Função para processar confirmações de pedidos (opcional)
            notification_handler: Função para enviar notificações (opcional)
        """
        # Configurações
        self.webhook_secret = webhook_secret or os.environ.get("IFOOD_WEBHOOK_SECRET")

        # Cliente da API
        self.api_client = api_client or IFoodAPIClient()

        # Handlers
        self.order_confirmation_handler = order_confirmation_handler
        self.notification_handler = notification_handler

        # Mapeamento de status
        self.status_mapping = {
            "PLACED": RemoteOrderStatus.PENDING,
            "CONFIRMED": RemoteOrderStatus.ACCEPTED,
            "READY_TO_PICKUP": RemoteOrderStatus.READY,
            "DISPATCHED": RemoteOrderStatus.DELIVERING,
            "CONCLUDED": RemoteOrderStatus.DELIVERED,
            "CANCELLED": RemoteOrderStatus.CANCELLED,
        }

        logger.info("Manipulador de webhooks do iFood inicializado")

    async def process_webhook(
        self,
        request: Request,
        x_ifood_signature: str = Header(None),
        background_tasks: BackgroundTasks = None,
    ) -> Dict[str, Any]:
        """
        Processa um webhook do iFood.

        Args:
            request: Requisição HTTP
            x_ifood_signature: Assinatura do webhook
            background_tasks: Tarefas em background

        Returns:
            Dict[str, Any]: Resultado do processamento
        """
        try:
            # Ler corpo da requisição
            body = await request.body()
            payload = body.decode("utf-8")

            # Verificar assinatura
            if x_ifood_signature and self.webhook_secret:
                is_valid = await self.api_client.verify_webhook_signature(
                    x_ifood_signature, payload
                )
                if not is_valid:
                    logger.error("Assinatura de webhook inválida")
                    return {"success": False, "error": "Assinatura inválida"}

            # Parsear payload
            data = json.loads(payload)

            # Processar em background se disponível
            if background_tasks:
                background_tasks.add_task(self._process_webhook_data, data)
                return {
                    "success": True,
                    "message": "Webhook recebido e será processado em background",
                }
            else:
                # Processar imediatamente
                return await self._process_webhook_data(data)

        except json.JSONDecodeError:
            logger.error("Erro ao decodificar payload do webhook")
            return {"success": False, "error": "Payload inválido"}
        except Exception as e:
            logger.error(f"Erro ao processar webhook: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _process_webhook_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa os dados de um webhook do iFood.

        Args:
            data: Dados do webhook

        Returns:
            Dict[str, Any]: Resultado do processamento
        """
        try:
            # Identificar tipo de evento
            event_type = data.get("eventType")

            if not event_type:
                logger.error("Tipo de evento não encontrado no webhook")
                return {"success": False, "error": "Tipo de evento não encontrado"}

            logger.info(f"Processando webhook do tipo {event_type}")

            # Processar com base no tipo de evento
            if event_type == "ORDER_PLACED":
                # Novo pedido
                return await self._handle_order_placed(data)

            elif event_type == "ORDER_STATUS_CHANGED":
                # Mudança de status
                return await self._handle_status_changed(data)

            elif event_type == "ORDER_CANCELLED":
                # Pedido cancelado
                return await self._handle_order_cancelled(data)

            elif event_type == "INTEGRATION_EVENT":
                # Evento de integração
                return await self._handle_integration_event(data)

            else:
                logger.warning(f"Tipo de evento desconhecido: {event_type}")
                return {"success": True, "message": f"Evento {event_type} ignorado"}

        except Exception as e:
            logger.error(f"Erro ao processar dados do webhook: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _handle_order_placed(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa evento de novo pedido.

        Args:
            data: Dados do evento

        Returns:
            Dict[str, Any]: Resultado do processamento
        """
        try:
            # Extrair dados do pedido
            order_data = data.get("order", {})
            order_id = order_data.get("id")

            if not order_id:
                logger.error("ID do pedido não encontrado no evento ORDER_PLACED")
                return {"success": False, "error": "ID do pedido não encontrado"}

            logger.info(f"Novo pedido recebido: {order_id}")

            # Obter detalhes completos do pedido
            order_result = await self.api_client.get_order_details(order_id)

            if not order_result.get("success"):
                logger.error(
                    f"Erro ao obter detalhes do pedido {order_id}: {order_result.get('error')}"
                )
                return order_result

            complete_order_data = order_result.get("order")

            # Chamar handler de confirmação se disponível
            if self.order_confirmation_handler:
                confirmation_result = await self.order_confirmation_handler(
                    complete_order_data
                )

                # Se confirmação automática, atualizar status no iFood
                if confirmation_result.get("auto_confirmed", False):
                    await self.api_client.update_order_status(order_id, "CONFIRMED")

            # Enviar notificação se handler disponível
            if self.notification_handler:
                await self.notification_handler(
                    "new_order",
                    {
                        "order_id": order_id,
                        "customer": complete_order_data.get("customer", {}),
                        "total": complete_order_data.get("totalPrice"),
                    },
                )

            return {
                "success": True,
                "order_id": order_id,
                "message": "Pedido processado com sucesso",
            }

        except Exception as e:
            logger.error(f"Erro ao processar novo pedido: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _handle_status_changed(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa evento de mudança de status.

        Args:
            data: Dados do evento

        Returns:
            Dict[str, Any]: Resultado do processamento
        """
        try:
            # Extrair dados do evento
            order_id = data.get("orderId")
            new_status = data.get("status")

            if not order_id or not new_status:
                logger.error("Dados incompletos no evento ORDER_STATUS_CHANGED")
                return {"success": False, "error": "Dados incompletos"}

            logger.info(f"Mudança de status do pedido {order_id} para {new_status}")

            # Mapear status para formato interno
            internal_status = self.status_mapping.get(
                new_status, RemoteOrderStatus.PENDING
            )

            # Enviar notificação se handler disponível
            if self.notification_handler:
                await self.notification_handler(
                    "status_changed",
                    {
                        "order_id": order_id,
                        "status": new_status,
                        "internal_status": internal_status,
                    },
                )

            return {
                "success": True,
                "order_id": order_id,
                "status": new_status,
                "internal_status": internal_status,
                "message": "Status atualizado com sucesso",
            }

        except Exception as e:
            logger.error(f"Erro ao processar mudança de status: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _handle_order_cancelled(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa evento de cancelamento de pedido.

        Args:
            data: Dados do evento

        Returns:
            Dict[str, Any]: Resultado do processamento
        """
        try:
            # Extrair dados do evento
            order_id = data.get("orderId")
            reason = data.get("cancellationCode", "")
            details = data.get("details", "Cancelado pelo iFood")

            if not order_id:
                logger.error("ID do pedido não encontrado no evento ORDER_CANCELLED")
                return {"success": False, "error": "ID do pedido não encontrado"}

            logger.info(f"Pedido {order_id} cancelado: {details}")

            # Enviar notificação se handler disponível
            if self.notification_handler:
                await self.notification_handler(
                    "order_cancelled",
                    {
                        "order_id": order_id,
                        "reason": details,
                        "cancellation_code": reason,
                    },
                )

            return {
                "success": True,
                "order_id": order_id,
                "reason": details,
                "message": "Cancelamento processado com sucesso",
            }

        except Exception as e:
            logger.error(f"Erro ao processar cancelamento: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _handle_integration_event(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa evento de integração.

        Args:
            data: Dados do evento

        Returns:
            Dict[str, Any]: Resultado do processamento
        """
        try:
            # Extrair dados do evento
            event_code = data.get("code")
            metadata = data.get("metadata", {})

            if not event_code:
                logger.error(
                    "Código do evento não encontrado no evento INTEGRATION_EVENT"
                )
                return {"success": False, "error": "Código do evento não encontrado"}

            logger.info(f"Evento de integração recebido: {event_code}")

            # Processar com base no código do evento
            if event_code == "CONNECTIVITY_TEST":
                # Teste de conectividade
                return {
                    "success": True,
                    "message": "Teste de conectividade bem-sucedido",
                }

            # Outros tipos de eventos de integração
            return {
                "success": True,
                "event_code": event_code,
                "message": "Evento de integração processado",
            }

        except Exception as e:
            logger.error(f"Erro ao processar evento de integração: {str(e)}")
            return {"success": False, "error": str(e)}
