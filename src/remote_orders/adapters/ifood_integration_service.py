"""
Módulo de integração completa do iFood com o sistema POS.

Este módulo implementa a integração completa do iFood com o sistema POS,
incluindo processamento de pedidos, confirmação, notificações e reembolsos.
"""

import os
import logging
import asyncio
import uuid
from typing import Dict, Any
from datetime import datetime
from fastapi import Request, BackgroundTasks, Header

from .ifood.auth_manager import IFoodAuthManager
from .ifood.api_client import IFoodAPIClient
from .ifood.webhook_handler import IFoodWebhookHandler
from ..models.remote_order_models import (
    RemoteOrderStatus,
    RemotePlatform,
    RemotePlatformConfig,
)

# Configuração de logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class IFoodIntegrationService:
    """Serviço de integração completa com iFood."""

    def __init__(
        self,
        config: RemotePlatformConfig = None,
        order_service=None,
        notification_service=None,
        payment_service=None,
    ):
        """
        Inicializa o serviço de integração com iFood.

        Args:
            config: Configuração da plataforma (opcional)
            order_service: Serviço de pedidos (opcional)
            notification_service: Serviço de notificações (opcional)
            payment_service: Serviço de pagamentos (opcional)
        """
        # Configurações
        self.config = config or self._load_default_config()

        # Serviços
        self.order_service = order_service
        self.notification_service = notification_service
        self.payment_service = payment_service

        # Componentes de integração
        self.auth_manager = IFoodAuthManager(
            client_id=self.config.api_key,
            client_secret=self.config.api_secret,
            merchant_id=self.config.merchant_id,
        )

        self.api_client = IFoodAPIClient(
            auth_manager=self.auth_manager,
            merchant_id=self.config.merchant_id,
            webhook_secret=self.config.webhook_secret,
        )

        self.webhook_handler = IFoodWebhookHandler(
            api_client=self.api_client,
            webhook_secret=self.config.webhook_secret,
            order_confirmation_handler=self._handle_order_confirmation,
            notification_handler=self._handle_notification,
        )

        # Configurações de confirmação
        self.auto_confirm_orders = self.config.settings.get(
            "auto_confirm_orders", False
        )
        self.confirmation_timeout_minutes = self.config.settings.get(
            "confirmation_timeout_minutes", 15
        )

        # Armazenamento em memória (em produção seria um banco de dados)
        self.orders: Dict[str, Dict[str, Any]] = {}
        self.confirmation_timers: Dict[str, asyncio.Task] = {}

        # Iniciar polling de eventos em background
        self.running = True
        self.background_task = asyncio.create_task(self._start_event_polling())

        logger.info("Serviço de integração com iFood inicializado")

    def _load_default_config(self) -> RemotePlatformConfig:
        """
        Carrega configuração padrão da plataforma.

        Returns:
            RemotePlatformConfig: Configuração padrão
        """
        return RemotePlatformConfig(
            platform=RemotePlatform.IFOOD,
            api_key=os.environ.get("IFOOD_CLIENT_ID", ""),
            api_secret=os.environ.get("IFOOD_CLIENT_SECRET", ""),
            merchant_id=os.environ.get("IFOOD_MERCHANT_ID", ""),
            webhook_secret=os.environ.get("IFOOD_WEBHOOK_SECRET", ""),
            webhook_url=os.environ.get("IFOOD_WEBHOOK_URL", ""),
            settings={
                "auto_confirm_orders": os.environ.get(
                    "IFOOD_AUTO_CONFIRM", "false"
                ).lower()
                == "true",
                "confirmation_timeout_minutes": int(
                    os.environ.get("IFOOD_CONFIRMATION_TIMEOUT", "15")
                ),
            },
        )

    async def process_webhook(
        self,
        request: Request,
        x_ifood_signature: str = Header(None),
        background_tasks: BackgroundTasks = None,
    ) -> Dict[str, Any]:
        """
        Processa webhook do iFood.

        Args:
            request: Requisição HTTP
            x_ifood_signature: Assinatura do webhook
            background_tasks: Tarefas em background

        Returns:
            Dict[str, Any]: Resultado do processamento
        """
        return await self.webhook_handler.process_webhook(
            request, x_ifood_signature, background_tasks
        )

    async def confirm_order(self, order_id: str) -> Dict[str, Any]:
        """
        Confirma um pedido do iFood.

        Args:
            order_id: ID do pedido

        Returns:
            Dict[str, Any]: Resultado da confirmação
        """
        try:
            # Verificar se o pedido existe
            if order_id not in self.orders:
                logger.error(f"Pedido {order_id} não encontrado para confirmação")
                return {"success": False, "error": "Pedido não encontrado"}

            order = self.orders[order_id]

            # Verificar se o pedido já foi confirmado
            if order.get("status") != RemoteOrderStatus.PENDING:
                logger.warning(
                    f"Pedido {order_id} já foi processado, status atual: {order.get('status')}"
                )
                return {
                    "success": True,
                    "message": "Pedido já processado",
                    "status": order.get("status"),
                }

            # Atualizar status no iFood
            ifood_order_id = order.get("external_order_id")
            update_result = await self.api_client.update_order_status(
                ifood_order_id, "CONFIRMED"
            )

            if not update_result.get("success"):
                logger.error(
                    f"Erro ao confirmar pedido {order_id} no iFood: {update_result.get('error')}"
                )
                return update_result

            # Atualizar status interno
            order["status"] = RemoteOrderStatus.ACCEPTED
            order["updated_at"] = datetime.now().isoformat()

            # Cancelar timer de confirmação se existir
            if order_id in self.confirmation_timers:
                self.confirmation_timers[order_id].cancel()
                del self.confirmation_timers[order_id]

            # Enviar notificação
            if self.notification_service:
                await self.notification_service.send_order_notification(
                    order.get("customer", {}).get("phone"),
                    order_id,
                    RemoteOrderStatus.ACCEPTED,
                )

            logger.info(f"Pedido {order_id} confirmado com sucesso")
            return {
                "success": True,
                "order_id": order_id,
                "status": RemoteOrderStatus.ACCEPTED,
                "message": "Pedido confirmado com sucesso",
            }

        except Exception as e:
            logger.error(f"Erro ao confirmar pedido {order_id}: {str(e)}")
            return {"success": False, "error": str(e)}

    async def cancel_order(
        self, order_id: str, reason: str = "Cancelado pelo restaurante"
    ) -> Dict[str, Any]:
        """
        Cancela um pedido do iFood.

        Args:
            order_id: ID do pedido
            reason: Motivo do cancelamento

        Returns:
            Dict[str, Any]: Resultado do cancelamento
        """
        try:
            # Verificar se o pedido existe
            if order_id not in self.orders:
                logger.error(f"Pedido {order_id} não encontrado para cancelamento")
                return {"success": False, "error": "Pedido não encontrado"}

            order = self.orders[order_id]

            # Verificar se o pedido já foi cancelado
            if order.get("status") == RemoteOrderStatus.CANCELLED:
                logger.warning(f"Pedido {order_id} já foi cancelado")
                return {"success": True, "message": "Pedido já cancelado"}

            # Atualizar status no iFood
            ifood_order_id = order.get("external_order_id")
            update_result = await self.api_client.update_order_status(
                ifood_order_id, "CANCELLED", reason
            )

            if not update_result.get("success"):
                logger.error(
                    f"Erro ao cancelar pedido {order_id} no iFood: {update_result.get('error')}"
                )
                return update_result

            # Atualizar status interno
            order["status"] = RemoteOrderStatus.CANCELLED
            order["updated_at"] = datetime.now().isoformat()
            order["cancellation_reason"] = reason

            # Cancelar timer de confirmação se existir
            if order_id in self.confirmation_timers:
                self.confirmation_timers[order_id].cancel()
                del self.confirmation_timers[order_id]

            # Processar reembolso se necessário
            if order.get("payment", {}).get("prepaid", False) and self.payment_service:
                await self._process_refund(order_id, reason)

            # Enviar notificação
            if self.notification_service:
                await self.notification_service.send_order_notification(
                    order.get("customer", {}).get("phone"),
                    order_id,
                    RemoteOrderStatus.CANCELLED,
                )

            logger.info(f"Pedido {order_id} cancelado: {reason}")
            return {
                "success": True,
                "order_id": order_id,
                "status": RemoteOrderStatus.CANCELLED,
                "message": "Pedido cancelado com sucesso",
            }

        except Exception as e:
            logger.error(f"Erro ao cancelar pedido {order_id}: {str(e)}")
            return {"success": False, "error": str(e)}

    async def update_order_status(
        self, order_id: str, status: RemoteOrderStatus
    ) -> Dict[str, Any]:
        """
        Atualiza o status de um pedido do iFood.

        Args:
            order_id: ID do pedido
            status: Novo status

        Returns:
            Dict[str, Any]: Resultado da atualização
        """
        try:
            # Verificar se o pedido existe
            if order_id not in self.orders:
                logger.error(f"Pedido {order_id} não encontrado para atualização")
                return {"success": False, "error": "Pedido não encontrado"}

            order = self.orders[order_id]

            # Mapear status interno para status do iFood
            status_mapping = {
                RemoteOrderStatus.ACCEPTED: "CONFIRMED",
                RemoteOrderStatus.PREPARING: "CONFIRMED",
                RemoteOrderStatus.READY: "READY_TO_PICKUP",
                RemoteOrderStatus.DELIVERING: "DISPATCHED",
                RemoteOrderStatus.DELIVERED: "CONCLUDED",
                RemoteOrderStatus.CANCELLED: "CANCELLED",
            }

            ifood_status = status_mapping.get(status)
            if not ifood_status:
                logger.error(f"Status {status} não mapeável para iFood")
                return {"success": False, "error": f"Status {status} não suportado"}

            # Atualizar status no iFood
            ifood_order_id = order.get("external_order_id")
            update_result = await self.api_client.update_order_status(
                ifood_order_id, ifood_status
            )

            if not update_result.get("success"):
                logger.error(
                    f"Erro ao atualizar status do pedido {order_id} no iFood: {update_result.get('error')}"
                )
                return update_result

            # Atualizar status interno
            order["status"] = status
            order["updated_at"] = datetime.now().isoformat()

            # Enviar notificação
            if self.notification_service:
                await self.notification_service.send_order_notification(
                    order.get("customer", {}).get("phone"), order_id, status
                )

            logger.info(f"Status do pedido {order_id} atualizado para {status}")
            return {
                "success": True,
                "order_id": order_id,
                "status": status,
                "message": "Status atualizado com sucesso",
            }

        except Exception as e:
            logger.error(f"Erro ao atualizar status do pedido {order_id}: {str(e)}")
            return {"success": False, "error": str(e)}

    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """
        Obtém os dados de um pedido.

        Args:
            order_id: ID do pedido

        Returns:
            Dict[str, Any]: Dados do pedido
        """
        if order_id not in self.orders:
            logger.error(f"Pedido {order_id} não encontrado")
            return {"success": False, "error": "Pedido não encontrado"}

        return {"success": True, "order": self.orders[order_id]}

    async def _handle_order_confirmation(
        self, order_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Processa confirmação de pedido.

        Args:
            order_data: Dados do pedido

        Returns:
            Dict[str, Any]: Resultado do processamento
        """
        try:
            # Converter para formato interno
            remote_order = await self.api_client.convert_to_remote_order(
                order_data, self.config
            )

            # Gerar ID interno
            order_id = str(uuid.uuid4())
            remote_order.id = order_id

            # Armazenar pedido
            self.orders[order_id] = remote_order.dict()

            # Verificar se deve confirmar automaticamente
            auto_confirm = self.auto_confirm_orders

            if auto_confirm:
                # Confirmar pedido automaticamente
                await self.confirm_order(order_id)
            else:
                # Iniciar timer para confirmação
                self.confirmation_timers[order_id] = asyncio.create_task(
                    self._confirmation_timeout(order_id)
                )

                # Notificar sistema de pedidos
                if self.order_service:
                    await self.order_service.notify_new_order(remote_order)

            logger.info(
                f"Pedido {order_id} registrado para confirmação (auto: {auto_confirm})"
            )
            return {
                "success": True,
                "order_id": order_id,
                "auto_confirmed": auto_confirm,
            }

        except Exception as e:
            logger.error(f"Erro ao processar confirmação de pedido: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _handle_notification(
        self, event_type: str, data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Processa notificação de evento.

        Args:
            event_type: Tipo de evento
            data: Dados do evento

        Returns:
            Dict[str, Any]: Resultado do processamento
        """
        try:
            # Processar com base no tipo de evento
            if event_type == "new_order":
                # Novo pedido
                order_id = data.get("order_id")
                customer = data.get("customer", {})

                # Enviar notificação
                if self.notification_service and customer.get("phone"):
                    await self.notification_service.send_message(
                        customer.get("phone"),
                        f"Novo pedido recebido! Seu pedido #{order_id} está sendo processado.",
                    )

            elif event_type == "status_changed":
                # Mudança de status
                order_id = data.get("order_id")
                status = data.get("status")
                internal_status = data.get("internal_status")

                # Atualizar status interno
                if order_id in self.orders:
                    self.orders[order_id]["status"] = internal_status
                    self.orders[order_id]["updated_at"] = datetime.now().isoformat()

                # Enviar notificação
                if self.notification_service and order_id in self.orders:
                    customer_phone = (
                        self.orders[order_id].get("customer", {}).get("phone")
                    )
                    if customer_phone:
                        await self.notification_service.send_order_notification(
                            customer_phone, order_id, internal_status
                        )

            elif event_type == "order_cancelled":
                # Pedido cancelado
                order_id = data.get("order_id")
                reason = data.get("reason", "Cancelado pelo iFood")

                # Atualizar status interno
                if order_id in self.orders:
                    self.orders[order_id]["status"] = RemoteOrderStatus.CANCELLED
                    self.orders[order_id]["updated_at"] = datetime.now().isoformat()
                    self.orders[order_id]["cancellation_reason"] = reason

                    # Processar reembolso se necessário
                    if (
                        self.orders[order_id].get("payment", {}).get("prepaid", False)
                        and self.payment_service
                    ):
                        await self._process_refund(order_id, reason)

                # Enviar notificação
                if self.notification_service and order_id in self.orders:
                    customer_phone = (
                        self.orders[order_id].get("customer", {}).get("phone")
                    )
                    if customer_phone:
                        await self.notification_service.send_order_notification(
                            customer_phone, order_id, RemoteOrderStatus.CANCELLED
                        )

            return {"success": True, "event_type": event_type}

        except Exception as e:
            logger.error(f"Erro ao processar notificação: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _confirmation_timeout(self, order_id: str) -> None:
        """
        Processa timeout de confirmação de pedido.

        Args:
            order_id: ID do pedido
        """
        try:
            # Aguardar tempo de confirmação
            await asyncio.sleep(self.confirmation_timeout_minutes * 60)

            # Verificar se o pedido ainda existe e está pendente
            if (
                order_id in self.orders
                and self.orders[order_id]["status"] == RemoteOrderStatus.PENDING
            ):
                logger.warning(f"Timeout de confirmação para pedido {order_id}")

                # Cancelar pedido automaticamente
                await self.cancel_order(order_id, "Timeout de confirmação")

        except asyncio.CancelledError:
            # Timer cancelado, ignorar
            pass
        except Exception as e:
            logger.error(f"Erro no timer de confirmação do pedido {order_id}: {str(e)}")

    async def _process_refund(self, order_id: str, reason: str) -> Dict[str, Any]:
        """
        Processa reembolso de pedido.

        Args:
            order_id: ID do pedido
            reason: Motivo do reembolso

        Returns:
            Dict[str, Any]: Resultado do reembolso
        """
        try:
            # Verificar se o pedido existe
            if order_id not in self.orders:
                logger.error(f"Pedido {order_id} não encontrado para reembolso")
                return {"success": False, "error": "Pedido não encontrado"}

            order = self.orders[order_id]

            # Verificar se o pagamento foi antecipado
            if not order.get("payment", {}).get("prepaid", False):
                logger.info(f"Pedido {order_id} não requer reembolso (não pré-pago)")
                return {"success": True, "message": "Pedido não requer reembolso"}

            # Processar reembolso
            if self.payment_service:
                payment_id = order.get("payment", {}).get("id")
                if not payment_id:
                    logger.error(
                        f"ID de pagamento não encontrado para pedido {order_id}"
                    )
                    return {"success": False, "error": "ID de pagamento não encontrado"}

                refund_result = await self.payment_service.refund_payment(
                    payment_id,
                    description=f"Reembolso automático - Pedido {order_id} cancelado: {reason}",
                )

                if refund_result.get("success"):
                    # Atualizar dados do pedido
                    order["payment"]["status"] = "REFUNDED"
                    order["payment"]["refund_id"] = refund_result.get("refund", {}).get(
                        "id"
                    )
                    order["updated_at"] = datetime.now().isoformat()

                    logger.info(f"Reembolso processado para pedido {order_id}")
                    return {
                        "success": True,
                        "order_id": order_id,
                        "refund_id": order["payment"]["refund_id"],
                        "message": "Reembolso processado com sucesso",
                    }
                else:
                    logger.error(
                        f"Erro ao processar reembolso para pedido {order_id}: {refund_result.get('error')}"
                    )
                    return refund_result
            else:
                logger.warning(
                    f"Serviço de pagamento não disponível para reembolso do pedido {order_id}"
                )
                return {
                    "success": False,
                    "error": "Serviço de pagamento não disponível",
                }

        except Exception as e:
            logger.error(
                f"Erro ao processar reembolso para pedido {order_id}: {str(e)}"
            )
            return {"success": False, "error": str(e)}

    async def _start_event_polling(self) -> None:
        """Inicia polling de eventos do iFood em background."""
        logger.info("Iniciando polling de eventos do iFood")

        while self.running:
            try:
                # Processar eventos
                await self.api_client.process_events(self._handle_event_callback)

            except Exception as e:
                logger.error(f"Erro no polling de eventos: {str(e)}")

            # Aguardar próxima verificação (60 segundos)
            await asyncio.sleep(60)

    async def _handle_event_callback(
        self, event_type: str, data: Dict[str, Any]
    ) -> None:
        """
        Callback para processamento de eventos do iFood.

        Args:
            event_type: Tipo de evento
            data: Dados do evento
        """
        try:
            # Processar com base no tipo de evento
            if event_type == "new_order":
                # Novo pedido
                await self._handle_order_confirmation(data)

            elif event_type == "order_cancelled":
                # Pedido cancelado
                order_id = data.get("order_id")

                # Buscar pedido interno correspondente
                internal_order_id = None
                for id, order in self.orders.items():
                    if order.get("external_order_id") == order_id:
                        internal_order_id = id
                        break

                if internal_order_id:
                    # Atualizar status interno
                    self.orders[internal_order_id][
                        "status"
                    ] = RemoteOrderStatus.CANCELLED
                    self.orders[internal_order_id][
                        "updated_at"
                    ] = datetime.now().isoformat()
                    self.orders[internal_order_id][
                        "cancellation_reason"
                    ] = "Cancelado pelo iFood"

                    # Processar reembolso se necessário
                    if (
                        self.orders[internal_order_id]
                        .get("payment", {})
                        .get("prepaid", False)
                        and self.payment_service
                    ):
                        await self._process_refund(
                            internal_order_id, "Cancelado pelo iFood"
                        )

                    # Enviar notificação
                    if self.notification_service:
                        customer_phone = (
                            self.orders[internal_order_id]
                            .get("customer", {})
                            .get("phone")
                        )
                        if customer_phone:
                            await self.notification_service.send_order_notification(
                                customer_phone,
                                internal_order_id,
                                RemoteOrderStatus.CANCELLED,
                            )

            elif event_type == "integration":
                # Evento de integração
                logger.info(f"Evento de integração recebido: {data}")

        except Exception as e:
            logger.error(f"Erro no callback de evento: {str(e)}")

    async def shutdown(self) -> None:
        """Encerra o serviço e suas tarefas em background."""
        self.running = False
        if self.background_task:
            self.background_task.cancel()
            try:
                await self.background_task
            except asyncio.CancelledError:
                pass
        logger.info("Serviço de integração com iFood encerrado")
