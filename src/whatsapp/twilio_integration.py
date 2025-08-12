"""
Módulo de integração com Twilio para WhatsApp.

Este módulo gerencia a comunicação com a API do Twilio para enviar e receber
mensagens via WhatsApp, incluindo suporte a comboboxes e mídia.
"""

import json
import logging
from typing import Dict, List, Any
from datetime import datetime
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from twilio.twiml.messaging_response import MessagingResponse

# Configuração de logging
logger = logging.getLogger(__name__)


class TwilioWhatsAppIntegration:
    """Classe para integração com a API do Twilio para WhatsApp."""

    def __init__(self, account_sid: str, auth_token: str, whatsapp_number: str):
        """
        Inicializa a integração com o Twilio.

        Args:
            account_sid: SID da conta Twilio
            auth_token: Token de autenticação Twilio
            whatsapp_number: Número de WhatsApp do Twilio (com prefixo whatsapp:)
        """
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.whatsapp_number = whatsapp_number
        if not self.whatsapp_number.startswith("whatsapp:"):
            self.whatsapp_number = f"whatsapp:{self.whatsapp_number}"

        try:
            self.client = Client(account_sid, auth_token)
            logger.info("Twilio client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Twilio client: {str(e)}")
            raise

    def send_message(self, to: str, body: str) -> Dict[str, Any]:
        """
        Envia uma mensagem de texto simples via WhatsApp.

        Args:
            to: Número de telefone do destinatário
            body: Conteúdo da mensagem

        Returns:
            Resposta da API do Twilio
        """
        if not to.startswith("whatsapp:"):
            to = f"whatsapp:{to}"

        try:
            message = self.client.messages.create(
                from_=self.whatsapp_number, body=body, to=to
            )
            logger.info(f"Message sent successfully to {to}, SID: {message.sid}")
            return {
                "success": True,
                "message_sid": message.sid,
                "status": message.status,
            }
        except TwilioRestException as e:
            logger.error(f"Failed to send message to {to}: {str(e)}")
            return {"success": False, "error": str(e), "code": e.code}

    def send_template_message(
        self,
        to: str,
        template_name: str,
        language: str = "pt_BR",
        components: List[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Envia uma mensagem de template aprovada pelo WhatsApp.

        Args:
            to: Número de telefone do destinatário
            template_name: Nome do template aprovado
            language: Código do idioma do template
            components: Componentes do template (parâmetros)

        Returns:
            Resposta da API do Twilio
        """
        if not to.startswith("whatsapp:"):
            to = f"whatsapp:{to}"

        try:
            message = self.client.messages.create(
                from_=self.whatsapp_number,
                body="",
                to=to,
                content_sid=template_name,
                content_variables=json.dumps(components) if components else None,
            )
            logger.info(
                f"Template message sent successfully to {to}, SID: {message.sid}"
            )
            return {
                "success": True,
                "message_sid": message.sid,
                "status": message.status,
            }
        except TwilioRestException as e:
            logger.error(f"Failed to send template message to {to}: {str(e)}")
            return {"success": False, "error": str(e), "code": e.code}

    def send_interactive_message(
        self, to: str, body: str, options: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Envia uma mensagem interativa com botões/opções.

        Args:
            to: Número de telefone do destinatário
            body: Texto principal da mensagem
            options: Lista de opções como dicionários {id, title}

        Returns:
            Resposta da API do Twilio
        """
        if not to.startswith("whatsapp:"):
            to = f"whatsapp:{to}"

        # Construir a mensagem interativa no formato esperado pelo Twilio
        interactive_content = {
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body},
                "action": {
                    "buttons": [
                        {
                            "type": "reply",
                            "reply": {"id": opt["id"], "title": opt["title"]},
                        }
                        for opt in options[:3]  # WhatsApp permite no máximo 3 botões
                    ]
                },
            },
        }

        try:
            message = self.client.messages.create(
                from_=self.whatsapp_number,
                to=to,
                content_type="application/json",
                content_sid=None,
                body=json.dumps(interactive_content),
            )
            logger.info(
                f"Interactive message sent successfully to {to}, SID: {message.sid}"
            )
            return {
                "success": True,
                "message_sid": message.sid,
                "status": message.status,
            }
        except TwilioRestException as e:
            logger.error(f"Failed to send interactive message to {to}: {str(e)}")
            return {"success": False, "error": str(e), "code": e.code}

    def send_list_message(
        self, to: str, body: str, button_text: str, sections: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Envia uma mensagem com lista de opções (combobox).

        Args:
            to: Número de telefone do destinatário
            body: Texto principal da mensagem
            button_text: Texto do botão que abre a lista
            sections: Seções da lista com opções

        Returns:
            Resposta da API do Twilio
        """
        if not to.startswith("whatsapp:"):
            to = f"whatsapp:{to}"

        # Construir a mensagem de lista no formato esperado pelo Twilio
        list_content = {
            "type": "interactive",
            "interactive": {
                "type": "list",
                "body": {"text": body},
                "action": {"button": button_text, "sections": sections},
            },
        }

        try:
            message = self.client.messages.create(
                from_=self.whatsapp_number,
                to=to,
                content_type="application/json",
                content_sid=None,
                body=json.dumps(list_content),
            )
            logger.info(f"List message sent successfully to {to}, SID: {message.sid}")
            return {
                "success": True,
                "message_sid": message.sid,
                "status": message.status,
            }
        except TwilioRestException as e:
            logger.error(f"Failed to send list message to {to}: {str(e)}")
            return {"success": False, "error": str(e), "code": e.code}

    def send_image(
        self, to: str, image_url: str, caption: str = None
    ) -> Dict[str, Any]:
        """
        Envia uma imagem via WhatsApp.

        Args:
            to: Número de telefone do destinatário
            image_url: URL da imagem a ser enviada
            caption: Legenda opcional para a imagem

        Returns:
            Resposta da API do Twilio
        """
        if not to.startswith("whatsapp:"):
            to = f"whatsapp:{to}"

        try:
            message = self.client.messages.create(
                from_=self.whatsapp_number, to=to, media_url=[image_url], body=caption
            )
            logger.info(f"Image sent successfully to {to}, SID: {message.sid}")
            return {
                "success": True,
                "message_sid": message.sid,
                "status": message.status,
            }
        except TwilioRestException as e:
            logger.error(f"Failed to send image to {to}: {str(e)}")
            return {"success": False, "error": str(e), "code": e.code}

    def parse_incoming_message(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analisa uma mensagem recebida do webhook do Twilio.

        Args:
            request_data: Dados da requisição do webhook

        Returns:
            Dicionário com informações da mensagem
        """
        try:
            # Extrair informações básicas da mensagem
            message_data = {
                "message_sid": request_data.get("MessageSid", ""),
                "from_number": request_data.get("From", "").replace("whatsapp:", ""),
                "to_number": request_data.get("To", "").replace("whatsapp:", ""),
                "body": request_data.get("Body", ""),
                "num_media": int(request_data.get("NumMedia", 0)),
                "timestamp": datetime.now().isoformat(),
                "media_urls": [],
                "interactive_response": None,
                "location": None,
            }

            # Processar mídia, se houver
            for i in range(message_data["num_media"]):
                media_url = request_data.get(f"MediaUrl{i}", "")
                media_type = request_data.get(f"MediaContentType{i}", "")
                if media_url:
                    message_data["media_urls"].append(
                        {"url": media_url, "type": media_type}
                    )

            # Processar resposta interativa, se houver
            if "ButtonPayload" in request_data:
                message_data["interactive_response"] = {
                    "type": "button",
                    "payload": request_data.get("ButtonPayload", ""),
                }
            elif "ListPayload" in request_data:
                message_data["interactive_response"] = {
                    "type": "list",
                    "payload": request_data.get("ListPayload", ""),
                }

            # Processar localização, se houver
            if "Latitude" in request_data and "Longitude" in request_data:
                message_data["location"] = {
                    "latitude": request_data.get("Latitude", ""),
                    "longitude": request_data.get("Longitude", ""),
                }

            logger.info(f"Parsed incoming message from {message_data['from_number']}")
            return message_data

        except Exception as e:
            logger.error(f"Error parsing incoming message: {str(e)}")
            return {"error": str(e), "raw_data": request_data}

    def create_webhook_response(self, messages: List[Dict[str, Any]]) -> str:
        """
        Cria uma resposta para o webhook do Twilio.

        Args:
            messages: Lista de mensagens a serem enviadas como resposta

        Returns:
            Resposta TwiML formatada
        """
        response = MessagingResponse()

        for msg in messages:
            if msg.get("type") == "text":
                response.message(msg.get("body", ""))
            elif msg.get("type") == "media":
                message = response.message(msg.get("caption", ""))
                message.media(msg.get("url", ""))

        return str(response)
