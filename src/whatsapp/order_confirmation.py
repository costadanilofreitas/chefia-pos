"""
Módulo de confirmação de pedidos para WhatsApp.

Este módulo implementa a lógica de confirmação de pedidos configurável,
notificações de status e reembolso automático para pedidos não confirmados.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, Optional

# Configuração de logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class OrderConfirmationMode(str, Enum):
    """Modos de confirmação de pedidos."""

    AUTOMATIC = "automatic"
    MANUAL = "manual"


class OrderStatus(str, Enum):
    """Status de pedidos."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY = "ready"
    DELIVERING = "delivering"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentStatus(str, Enum):
    """Status de pagamentos."""

    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"
    REFUND_PENDING = "refund_pending"


class WhatsAppOrderConfirmation:
    """Classe para gerenciamento de confirmação de pedidos via WhatsApp."""

    def __init__(
        self,
        default_confirmation_mode: OrderConfirmationMode = OrderConfirmationMode.MANUAL,
        confirmation_timeout_minutes: int = 15,
        payment_integration=None,
        sqs_integration=None,
    ):
        """
        Inicializa o gerenciador de confirmação de pedidos.

        Args:
            default_confirmation_mode: Modo de confirmação padrão
            confirmation_timeout_minutes: Tempo limite para confirmação manual em minutos
            payment_integration: Integração de pagamento (opcional)
            sqs_integration: Integração SQS (opcional)
        """
        self.default_confirmation_mode = default_confirmation_mode
        self.confirmation_timeout_minutes = confirmation_timeout_minutes
        self.payment_integration = payment_integration
        self.sqs_integration = sqs_integration

        # Armazenamento em memória (em produção seria um banco de dados)
        self.orders: Dict[str, Dict[str, Any]] = {}
        self.restaurant_settings: Dict[str, Dict[str, Any]] = {}

        logger.info(
            f"Gerenciador de confirmação de pedidos inicializado com modo padrão: {default_confirmation_mode}"
        )

    def set_restaurant_confirmation_mode(
        self, restaurant_id: str, mode: OrderConfirmationMode
    ) -> None:
        """
        Define o modo de confirmação para um restaurante específico.

        Args:
            restaurant_id: ID do restaurante
            mode: Modo de confirmação
        """
        if restaurant_id not in self.restaurant_settings:
            self.restaurant_settings[restaurant_id] = {}

        self.restaurant_settings[restaurant_id]["confirmation_mode"] = mode
        logger.info(
            f"Modo de confirmação para restaurante {restaurant_id} definido como: {mode}"
        )

    def get_restaurant_confirmation_mode(
        self, restaurant_id: str
    ) -> OrderConfirmationMode:
        """
        Obtém o modo de confirmação para um restaurante específico.

        Args:
            restaurant_id: ID do restaurante

        Returns:
            OrderConfirmationMode: Modo de confirmação
        """
        if (
            restaurant_id in self.restaurant_settings
            and "confirmation_mode" in self.restaurant_settings[restaurant_id]
        ):
            return self.restaurant_settings[restaurant_id]["confirmation_mode"]
        return self.default_confirmation_mode

    async def register_order(
        self,
        order_id: str,
        restaurant_id: str,
        customer_id: str,
        payment_id: Optional[str] = None,
        order_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Registra um novo pedido para confirmação.

        Args:
            order_id: ID do pedido
            restaurant_id: ID do restaurante
            customer_id: ID do cliente
            payment_id: ID do pagamento (opcional)
            order_data: Dados adicionais do pedido (opcional)

        Returns:
            Dict[str, Any]: Dados do pedido registrado
        """
        # Obter modo de confirmação do restaurante
        confirmation_mode = self.get_restaurant_confirmation_mode(restaurant_id)

        # Criar registro do pedido
        order = {
            "id": order_id,
            "restaurant_id": restaurant_id,
            "customer_id": customer_id,
            "payment_id": payment_id,
            "status": OrderStatus.PENDING,
            "payment_status": PaymentStatus.PENDING if payment_id else None,
            "confirmation_mode": confirmation_mode,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "confirmation_deadline": (
                datetime.now() + timedelta(minutes=self.confirmation_timeout_minutes)
            ).isoformat(),
            "data": order_data or {},
        }

        # Armazenar pedido
        self.orders[order_id] = order

        # Se modo automático, confirmar imediatamente
        if confirmation_mode == OrderConfirmationMode.AUTOMATIC:
            await self.confirm_order(order_id)
        else:
            # Se modo manual, enviar para fila SQS para notificar restaurante
            if self.sqs_integration:
                await self.sqs_integration.send_message_to_pos(
                    {
                        "type": "new_order",
                        "order_id": order_id,
                        "restaurant_id": restaurant_id,
                        "requires_confirmation": True,
                        "confirmation_deadline": order["confirmation_deadline"],
                    }
                )

            # Iniciar timer para verificação de timeout
            asyncio.create_task(self._check_confirmation_timeout(order_id))

        logger.info(
            f"Pedido {order_id} registrado para confirmação no modo: {confirmation_mode}"
        )
        return order

    async def confirm_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        """
        Confirma um pedido.

        Args:
            order_id: ID do pedido

        Returns:
            Dict[str, Any]: Dados do pedido atualizado
        """
        if order_id not in self.orders:
            logger.error(f"Pedido {order_id} não encontrado para confirmação")
            return None

        order = self.orders[order_id]

        # Atualizar status do pedido
        order["status"] = OrderStatus.CONFIRMED
        order["updated_at"] = datetime.now().isoformat()

        # Enviar notificação para cliente via SQS
        if self.sqs_integration:
            await self.sqs_integration.send_message_to_pos(
                {
                    "type": "order_status_update",
                    "order_id": order_id,
                    "customer_id": order["customer_id"],
                    "status": OrderStatus.CONFIRMED,
                    "restaurant_id": order["restaurant_id"],
                }
            )

        logger.info(f"Pedido {order_id} confirmado com sucesso")
        return order

    async def cancel_order(self, order_id: str, reason: str = None) -> Optional[Dict[str, Any]]:
        """
        Cancela um pedido e inicia reembolso se necessário.

        Args:
            order_id: ID do pedido
            reason: Motivo do cancelamento (opcional)

        Returns:
            Dict[str, Any]: Dados do pedido atualizado
        """
        if order_id not in self.orders:
            logger.error(f"Pedido {order_id} não encontrado para cancelamento")
            return None

        order = self.orders[order_id]

        # Atualizar status do pedido
        order["status"] = OrderStatus.CANCELLED
        order["updated_at"] = datetime.now().isoformat()
        order["cancellation_reason"] = reason

        # Se tiver pagamento, iniciar reembolso
        if (
            order["payment_id"]
            and order["payment_status"] == PaymentStatus.PAID
            and self.payment_integration
        ):
            # Atualizar status do pagamento
            order["payment_status"] = PaymentStatus.REFUND_PENDING

            # Iniciar reembolso
            refund_result = await self.payment_integration.refund_payment(
                order["payment_id"],
                description=f"Reembolso automático - Pedido {order_id} cancelado"
                + (f": {reason}" if reason else ""),
            )

            if refund_result.get("success"):
                order["payment_status"] = PaymentStatus.REFUNDED
                order["refund_id"] = refund_result.get("refund", {}).get("id")
                logger.info(
                    f"Reembolso iniciado para pedido {order_id}: {order['refund_id']}"
                )
            else:
                logger.error(
                    f"Erro ao iniciar reembolso para pedido {order_id}: {refund_result.get('error')}"
                )

        # Enviar notificação para cliente via SQS
        if self.sqs_integration:
            await self.sqs_integration.send_message_to_pos(
                {
                    "type": "order_status_update",
                    "order_id": order_id,
                    "customer_id": order["customer_id"],
                    "status": OrderStatus.CANCELLED,
                    "restaurant_id": order["restaurant_id"],
                    "reason": reason,
                }
            )

        logger.info(f"Pedido {order_id} cancelado: {reason}")
        return order

    async def update_order_status(
        self, order_id: str, status: OrderStatus
    ) -> Optional[Dict[str, Any]]:
        """
        Atualiza o status de um pedido e envia notificação.

        Args:
            order_id: ID do pedido
            status: Novo status

        Returns:
            Dict[str, Any]: Dados do pedido atualizado
        """
        if order_id not in self.orders:
            logger.error(f"Pedido {order_id} não encontrado para atualização")
            return None

        order = self.orders[order_id]

        # Atualizar status do pedido
        order["status"] = status
        order["updated_at"] = datetime.now().isoformat()

        # Enviar notificação para cliente via SQS
        if self.sqs_integration:
            await self.sqs_integration.send_message_to_pos(
                {
                    "type": "order_status_update",
                    "order_id": order_id,
                    "customer_id": order["customer_id"],
                    "status": status,
                    "restaurant_id": order["restaurant_id"],
                }
            )

        logger.info(f"Status do pedido {order_id} atualizado para: {status}")
        return order

    async def update_payment_status(
        self, order_id: str, payment_status: PaymentStatus
    ) -> Optional[Dict[str, Any]]:
        """
        Atualiza o status de pagamento de um pedido.

        Args:
            order_id: ID do pedido
            payment_status: Novo status de pagamento

        Returns:
            Dict[str, Any]: Dados do pedido atualizado
        """
        if order_id not in self.orders:
            logger.error(
                f"Pedido {order_id} não encontrado para atualização de pagamento"
            )
            return None

        order = self.orders[order_id]

        # Atualizar status do pagamento
        order["payment_status"] = payment_status
        order["updated_at"] = datetime.now().isoformat()

        # Se pagamento confirmado e modo automático, confirmar pedido
        if (
            payment_status == PaymentStatus.PAID
            and order["confirmation_mode"] == OrderConfirmationMode.AUTOMATIC
        ):
            await self.confirm_order(order_id)

        logger.info(
            f"Status de pagamento do pedido {order_id} atualizado para: {payment_status}"
        )
        return order

    async def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtém os dados de um pedido.

        Args:
            order_id: ID do pedido

        Returns:
            Dict[str, Any]: Dados do pedido
        """
        if order_id not in self.orders:
            logger.error(f"Pedido {order_id} não encontrado")
            return None

        return self.orders[order_id]

    async def _check_confirmation_timeout(self, order_id: str) -> None:
        """
        Verifica timeout de confirmação para pedidos manuais.

        Args:
            order_id: ID do pedido
        """
        # Aguardar até o prazo de confirmação
        await asyncio.sleep(self.confirmation_timeout_minutes * 60)

        # Verificar se o pedido ainda existe e está pendente
        if (
            order_id in self.orders
            and self.orders[order_id]["status"] == OrderStatus.PENDING
        ):
            logger.warning(f"Timeout de confirmação para pedido {order_id}")

            # Cancelar pedido automaticamente
            await self.cancel_order(order_id, "Timeout de confirmação")

    async def generate_order_notification(
        self, order_id: str, status: OrderStatus = None
    ) -> Optional[Dict[str, Any]]:
        """
        Gera uma notificação para o cliente sobre o status do pedido.

        Args:
            order_id: ID do pedido
            status: Status específico para notificação (opcional)

        Returns:
            Dict[str, Any]: Dados da notificação
        """
        if order_id not in self.orders:
            logger.error(f"Pedido {order_id} não encontrado para notificação")
            return None

        order = self.orders[order_id]
        current_status = status or order["status"]

        # Mapear status para mensagens amigáveis
        status_messages = {
            OrderStatus.PENDING: "Seu pedido foi recebido e está aguardando confirmação.",
            OrderStatus.CONFIRMED: "Seu pedido foi confirmado e será preparado em breve.",
            OrderStatus.PREPARING: "Seu pedido está sendo preparado.",
            OrderStatus.READY: "Seu pedido está pronto para retirada ou entrega.",
            OrderStatus.DELIVERING: "Seu pedido está a caminho.",
            OrderStatus.DELIVERED: "Seu pedido foi entregue. Bom apetite!",
            OrderStatus.CANCELLED: f"Seu pedido foi cancelado. {order.get('cancellation_reason', '')}",
            OrderStatus.REFUNDED: "Seu pedido foi cancelado e o valor foi reembolsado.",
        }

        # Criar notificação
        notification = {
            "id": str(uuid.uuid4()),
            "order_id": order_id,
            "customer_id": order["customer_id"],
            "status": current_status,
            "message": status_messages.get(
                current_status, "Atualização no status do seu pedido."
            ),
            "created_at": datetime.now().isoformat(),
        }

        logger.info(f"Notificação gerada para pedido {order_id}: {current_status}")
        return notification
