"""
Módulo principal do chatbot WhatsApp com integração completa.

Este módulo integra todos os componentes do chatbot WhatsApp:
- Processamento de mensagens via Twilio
- Integração SQS para comunicação event-based
- Integração de pagamentos via Asaas
- Confirmação de pedidos configurável
- IA generativa via Amazon Bedrock (Claude)
"""

import asyncio
import logging
import os
from typing import Any, Dict

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request, Response

from .ai_integration import WhatsAppAIIntegration
from .chatbot_service import WhatsAppChatbotService
from .order_confirmation import (
    OrderConfirmationMode,
    OrderStatus,
    WhatsAppOrderConfirmation,
)
from .payment_integration import WhatsAppPaymentIntegration
from .sqs.sqs_integration import WhatsAppSQSIntegration
from .twilio_integration import TwilioWhatsAppIntegration

# Configuração de logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class WhatsAppIntegratedChatbot:
    """Classe principal do chatbot WhatsApp com todas as integrações."""

    def __init__(self):
        """Inicializa o chatbot WhatsApp integrado."""
        # Carregar configurações do ambiente
        self.twilio_account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
        self.twilio_auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "")
        self.twilio_whatsapp_number = os.environ.get("TWILIO_WHATSAPP_NUMBER", "")

        # Inicializar integrações
        self.twilio_integration = TwilioWhatsAppIntegration(
            account_sid=self.twilio_account_sid,
            auth_token=self.twilio_auth_token,
            whatsapp_number=self.twilio_whatsapp_number,
        )

        self.sqs_integration = WhatsAppSQSIntegration()

        self.payment_integration = WhatsAppPaymentIntegration()

        self.order_confirmation = WhatsAppOrderConfirmation(
            default_confirmation_mode=OrderConfirmationMode.MANUAL,
            confirmation_timeout_minutes=15,
            payment_integration=self.payment_integration,
            sqs_integration=self.sqs_integration,
        )

        self.ai_integration = WhatsAppAIIntegration()

        self.chatbot_service = WhatsAppChatbotService()

        # Iniciar processamento de mensagens em background
        self.running = True
        self.background_task = asyncio.create_task(self._process_sqs_messages())

        logger.info("Chatbot WhatsApp integrado inicializado com sucesso")

    async def process_webhook(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa webhook do Twilio para mensagens recebidas.

        Args:
            request_data: Dados da requisição do webhook

        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        try:
            # Parsear mensagem recebida
            message_data = self.twilio_integration.parse_incoming_message(request_data)

            # Enviar mensagem para SQS (comunicação event-based)
            await self.sqs_integration.send_message_to_pos(
                {"type": "incoming_message", "message": message_data}
            )

            # Processar mensagem com o chatbot
            response = await self.chatbot_service.process_incoming_message(message_data)

            # Enriquecer resposta com IA se necessário
            if response.get("type") == "text" and "ai_enhance" in request_data:
                original_text = response.get("text", "")
                enhanced_text = await self.ai_integration.generate_response(
                    f"Melhore esta resposta para um cliente de restaurante: '{original_text}'",
                    system_prompt="Você é um assistente amigável de restaurante. Seja cordial, claro e conciso.",
                )
                response["text"] = enhanced_text

            # Verificar se é uma ação de pagamento
            if "payment" in response.get("action", ""):
                await self._handle_payment_action(response, message_data)

            # Verificar se é uma ação de pedido
            if "order" in response.get("action", ""):
                await self._handle_order_action(response, message_data)

            return response

        except Exception as e:
            logger.error(f"Erro ao processar webhook: {str(e)}", exc_info=True)
            return {
                "type": "text",
                "text": "Desculpe, tivemos um problema ao processar sua mensagem. Por favor, tente novamente mais tarde.",
            }

    async def send_message(
        self, to: str, message_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Envia mensagem via Twilio.

        Args:
            to: Número de telefone do destinatário
            message_data: Dados da mensagem a ser enviada

        Returns:
            Dict[str, Any]: Resposta da API do Twilio
        """
        try:
            message_type = message_data.get("type", "text")

            if message_type == "text":
                return self.twilio_integration.send_message(
                    to, message_data.get("text", "")
                )

            elif message_type == "template":
                return self.twilio_integration.send_template_message(
                    to,
                    message_data.get("template_name", ""),
                    message_data.get("language", "pt_BR"),
                    message_data.get("components", []),
                )

            elif message_type == "interactive_buttons":
                return self.twilio_integration.send_interactive_message(
                    to, message_data.get("body", ""), message_data.get("options", [])
                )

            elif message_type == "interactive_list":
                return self.twilio_integration.send_list_message(
                    to,
                    message_data.get("body", ""),
                    message_data.get("button_text", "Ver opções"),
                    message_data.get("sections", []),
                )

            elif message_type == "image":
                return self.twilio_integration.send_image(
                    to,
                    message_data.get("image_url", ""),
                    message_data.get("caption", ""),
                )

            else:
                logger.error(f"Tipo de mensagem não suportado: {message_type}")
                return {
                    "success": False,
                    "error": f"Tipo de mensagem não suportado: {message_type}",
                }

        except Exception as e:
            logger.error(f"Erro ao enviar mensagem: {str(e)}")
            return {"success": False, "error": str(e)}

    async def send_order_notification(
        self, phone: str, order_id: str, status: OrderStatus
    ) -> Dict[str, Any]:
        """
        Envia notificação sobre status de pedido.

        Args:
            phone: Número de telefone do cliente
            order_id: ID do pedido
            status: Status do pedido

        Returns:
            Dict[str, Any]: Resposta da API do Twilio
        """
        try:
            # Gerar notificação
            notification = await self.order_confirmation.generate_order_notification(
                order_id, status
            )

            if not notification:
                logger.error(
                    f"Não foi possível gerar notificação para pedido {order_id}"
                )
                return {"success": False, "error": "Não foi possível gerar notificação"}

            # Enviar mensagem
            return self.twilio_integration.send_message(
                phone, notification.get("message", "")
            )

        except Exception as e:
            logger.error(f"Erro ao enviar notificação de pedido: {str(e)}")
            return {"success": False, "error": str(e)}

    async def send_marketing_campaign(
        self,
        customer_data: Dict[str, Any],
        campaign_type: str,
        restaurant_data: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Envia campanha de marketing personalizada.

        Args:
            customer_data: Dados do cliente
            campaign_type: Tipo de campanha
            restaurant_data: Dados do restaurante (opcional)

        Returns:
            Dict[str, Any]: Resposta da API do Twilio
        """
        try:
            # Gerar mensagem personalizada
            message = await self.ai_integration.generate_campaign_message(
                customer_data, campaign_type, restaurant_data
            )

            # Enviar mensagem
            phone = customer_data.get("phone")
            if not phone:
                logger.error("Número de telefone não fornecido para campanha")
                return {"success": False, "error": "Número de telefone não fornecido"}

            return self.twilio_integration.send_message(phone, message)

        except Exception as e:
            logger.error(f"Erro ao enviar campanha de marketing: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _handle_payment_action(
        self, response: Dict[str, Any], message_data: Dict[str, Any]
    ) -> None:
        """
        Processa ação de pagamento.

        Args:
            response: Resposta do chatbot
            message_data: Dados da mensagem recebida
        """
        action = response.get("action", "")

        if action == "payment_create_pix":
            # Extrair dados do pedido
            order_id = response.get("order_id")
            customer_id = response.get("customer_id")
            value = response.get("value")
            description = response.get("description", f"Pedido #{order_id}")

            # Buscar cliente no Asaas ou criar novo
            customer_result = await self.payment_integration.find_customer_by_phone(
                message_data.get("from_number")
            )

            if not customer_result.get("success"):
                logger.error(f"Erro ao buscar cliente: {customer_result.get('error')}")
                return

            asaas_customer_id = None

            if customer_result.get("found"):
                asaas_customer_id = customer_result.get("customer", {}).get("id")
            else:
                # Criar novo cliente
                customer_data = {
                    "name": response.get("customer_name", "Cliente WhatsApp"),
                    "mobilePhone": message_data.get("from_number"),
                    "externalReference": customer_id,
                }

                create_result = await self.payment_integration.create_customer(
                    customer_data
                )

                if not create_result.get("success"):
                    logger.error(f"Erro ao criar cliente: {create_result.get('error')}")
                    return

                asaas_customer_id = create_result.get("customer", {}).get("id")

            # Criar pagamento PIX
            payment_result = await self.payment_integration.create_pix_payment(
                asaas_customer_id, value, description, order_id
            )

            if not payment_result.get("success"):
                logger.error(
                    f"Erro ao criar pagamento PIX: {payment_result.get('error')}"
                )
                return

            # Registrar pedido para confirmação
            await self.order_confirmation.register_order(
                order_id,
                response.get("restaurant_id"),
                customer_id,
                payment_result.get("payment", {}).get("id"),
                response.get("order_data"),
            )

            # Adicionar código PIX à resposta
            response["pix_code"] = payment_result.get("pix_code")
            response["pix_copy_paste"] = payment_result.get("pix_copy_paste")

    async def _handle_order_action(
        self, response: Dict[str, Any], message_data: Dict[str, Any]
    ) -> None:
        """
        Processa ação de pedido.

        Args:
            response: Resposta do chatbot
            message_data: Dados da mensagem recebida
        """
        action = response.get("action", "")

        if action == "order_confirm":
            # Confirmar pedido
            order_id = response.get("order_id")
            await self.order_confirmation.confirm_order(order_id)

        elif action == "order_cancel":
            # Cancelar pedido
            order_id = response.get("order_id")
            reason = response.get("reason", "Cancelado pelo cliente")
            await self.order_confirmation.cancel_order(order_id, reason)

        elif action == "order_status_update":
            # Atualizar status do pedido
            order_id = response.get("order_id")
            status = response.get("status")
            await self.order_confirmation.update_order_status(order_id, status)

    async def _process_sqs_messages(self) -> None:
        """Processa mensagens da fila SQS em background."""
        while self.running:
            try:
                # Receber mensagens da fila
                messages = await self.sqs_integration.receive_messages_from_pos(
                    max_messages=10, wait_time_seconds=20
                )

                for message in messages:
                    try:
                        # Processar mensagem
                        message_type = message.get("type")

                        if message_type == "order_status_update":
                            # Notificar cliente sobre atualização de status
                            order_id = message.get("order_id")
                            message.get("customer_id")
                            status = message.get("status")

                            # Obter número de telefone do cliente (em produção seria do banco de dados)
                            # Aqui estamos simulando com o contexto da mensagem
                            customer_phone = message.get("customer_phone")

                            if customer_phone:
                                await self.send_order_notification(
                                    customer_phone, order_id, status
                                )

                        elif message_type == "marketing_campaign":
                            # Enviar campanha de marketing
                            customer_data = message.get("customer_data")
                            campaign_type = message.get("campaign_type")
                            restaurant_data = message.get("restaurant_data")

                            await self.send_marketing_campaign(
                                customer_data, campaign_type, restaurant_data
                            )

                        # Excluir mensagem processada
                        await self.sqs_integration.delete_message(
                            message.get("receipt_handle")
                        )

                    except Exception as e:
                        logger.error(f"Erro ao processar mensagem SQS: {str(e)}")

            except Exception as e:
                logger.error(f"Erro no processamento de mensagens SQS: {str(e)}")

            # Aguardar antes da próxima verificação
            await asyncio.sleep(1)

    async def shutdown(self) -> None:
        """Encerra o chatbot e suas tarefas em background."""
        self.running = False
        if self.background_task:
            self.background_task.cancel()
            try:
                await self.background_task
            except asyncio.CancelledError:
                pass
        logger.info("Chatbot WhatsApp encerrado")


# Criar aplicação FastAPI para endpoints do chatbot
app = FastAPI(title="WhatsApp Chatbot API")

# Instância global do chatbot
chatbot = WhatsAppIntegratedChatbot()


@app.post("/webhook")
async def webhook(request: Request, background_tasks: BackgroundTasks):
    """Endpoint para webhook do Twilio."""
    try:
        # Obter dados da requisição
        form_data = await request.form()
        request_data = dict(form_data)

        # Processar webhook em background para responder rapidamente
        background_tasks.add_task(chatbot.process_webhook, request_data)

        # Responder com TwiML vazio para evitar resposta automática do Twilio
        return Response(
            content="<?xml version='1.0' encoding='UTF-8'?><Response></Response>",
            media_type="application/xml",
        )

    except Exception as e:
        logger.error(f"Erro no endpoint de webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/send")
async def send_message(data: Dict[str, Any]):
    """Endpoint para enviar mensagem via API."""
    try:
        # Validar dados
        if "to" not in data or "message" not in data:
            raise HTTPException(
                status_code=400, detail="Campos 'to' e 'message' são obrigatórios"
            )

        # Enviar mensagem
        result = await chatbot.send_message(data["to"], data["message"])

        if not result.get("success", False):
            raise HTTPException(
                status_code=500, detail=result.get("error", "Erro ao enviar mensagem")
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no endpoint de envio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/campaign")
async def send_campaign(data: Dict[str, Any]):
    """Endpoint para enviar campanha de marketing."""
    try:
        # Validar dados
        if "customer_data" not in data or "campaign_type" not in data:
            raise HTTPException(
                status_code=400,
                detail="Campos 'customer_data' e 'campaign_type' são obrigatórios",
            )

        # Enviar campanha
        result = await chatbot.send_marketing_campaign(
            data["customer_data"], data["campaign_type"], data.get("restaurant_data")
        )

        if not result.get("success", False):
            raise HTTPException(
                status_code=500, detail=result.get("error", "Erro ao enviar campanha")
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no endpoint de campanha: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.on_event("shutdown")
async def shutdown_event():
    """Evento de encerramento da aplicação."""
    await chatbot.shutdown()
