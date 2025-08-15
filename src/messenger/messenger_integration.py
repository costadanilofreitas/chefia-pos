"""
Módulo de integração com Facebook Messenger.

Este módulo implementa a integração com a API do Facebook Messenger,
permitindo envio e recebimento de mensagens, templates interativos,
e processamento de webhooks.
"""

import hashlib
import hmac
import logging
import os
from typing import Any, Dict, List

import requests

from ...core.messaging import BasePlatformIntegration, MessageType

# Configuração de logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class MessengerIntegration(BasePlatformIntegration):
    """Classe para integração com Facebook Messenger."""

    def __init__(
        self,
        page_access_token: str = None,
        app_secret: str = None,
        verify_token: str = None,
    ):
        """
        Inicializa a integração com Facebook Messenger.

        Args:
            page_access_token: Token de acesso da página (opcional, padrão do ambiente)
            app_secret: Segredo do aplicativo para verificação de assinatura (opcional, padrão do ambiente)
            verify_token: Token de verificação para webhooks (opcional, padrão do ambiente)
        """
        # Configurações da API
        self.page_access_token = page_access_token or os.environ.get(
            "MESSENGER_PAGE_ACCESS_TOKEN"
        )
        self.app_secret = app_secret or os.environ.get("MESSENGER_APP_SECRET")
        self.verify_token = verify_token or os.environ.get("MESSENGER_VERIFY_TOKEN")

        # URL base da API
        self.api_url = "https://graph.facebook.com/v18.0/me/messages"

        # Validar configurações
        if not self.page_access_token:
            logger.warning(
                "Token de acesso da página não configurado. A integração não funcionará corretamente."
            )

        logger.info("Integração com Facebook Messenger inicializada")

    async def send_message(self, to: str, text: str) -> Dict[str, Any]:
        """
        Envia mensagem de texto.

        Args:
            to: ID do destinatário
            text: Texto da mensagem

        Returns:
            Dict[str, Any]: Resultado do envio
        """
        try:
            # Preparar payload
            payload = {"recipient": {"id": to}, "message": {"text": text}}

            # Enviar mensagem
            response = self._make_api_request(payload)

            logger.info(f"Mensagem enviada para {to}: {text[:50]}...")
            return {
                "success": True,
                "message_id": response.get("message_id"),
                "recipient_id": response.get("recipient_id"),
            }

        except Exception as e:
            logger.error(f"Erro ao enviar mensagem: {str(e)}")
            return {"success": False, "error": str(e)}

    async def send_image(
        self, to: str, image_url: str, caption: str = None
    ) -> Dict[str, Any]:
        """
        Envia imagem.

        Args:
            to: ID do destinatário
            image_url: URL da imagem
            caption: Legenda (opcional)

        Returns:
            Dict[str, Any]: Resultado do envio
        """
        try:
            # Preparar payload
            payload = {
                "recipient": {"id": to},
                "message": {
                    "attachment": {
                        "type": "image",
                        "payload": {"url": image_url, "is_reusable": True},
                    }
                },
            }

            # Adicionar legenda se fornecida
            if caption:
                # No Messenger, não é possível adicionar legenda diretamente à imagem
                # Enviamos a imagem e depois a legenda como mensagem separada
                response = self._make_api_request(payload)

                # Enviar legenda como mensagem separada
                caption_payload = {
                    "recipient": {"id": to},
                    "message": {"text": caption},
                }
                caption_response = self._make_api_request(caption_payload)

                logger.info(f"Imagem com legenda enviada para {to}")
                return {
                    "success": True,
                    "message_id": response.get("message_id"),
                    "caption_message_id": caption_response.get("message_id"),
                    "recipient_id": response.get("recipient_id"),
                }
            else:
                # Enviar apenas a imagem
                response = self._make_api_request(payload)

                logger.info(f"Imagem enviada para {to}")
                return {
                    "success": True,
                    "message_id": response.get("message_id"),
                    "recipient_id": response.get("recipient_id"),
                }

        except Exception as e:
            logger.error(f"Erro ao enviar imagem: {str(e)}")
            return {"success": False, "error": str(e)}

    async def send_interactive_message(
        self, to: str, body: str, options: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Envia mensagem interativa com botões.

        Args:
            to: ID do destinatário
            body: Texto principal
            options: Lista de opções (botões)

        Returns:
            Dict[str, Any]: Resultado do envio
        """
        try:
            # Converter opções para formato do Messenger
            buttons = []
            for option in options:
                buttons.append(
                    {
                        "type": "postback",
                        "title": option.get("title", ""),
                        "payload": option.get("id", ""),
                    }
                )

            # Limitar a 3 botões (limite do Messenger)
            buttons = buttons[:3]

            # Preparar payload
            payload = {
                "recipient": {"id": to},
                "message": {
                    "attachment": {
                        "type": "template",
                        "payload": {
                            "template_type": "button",
                            "text": body,
                            "buttons": buttons,
                        },
                    }
                },
            }

            # Enviar mensagem
            response = self._make_api_request(payload)

            logger.info(f"Mensagem interativa enviada para {to}")
            return {
                "success": True,
                "message_id": response.get("message_id"),
                "recipient_id": response.get("recipient_id"),
            }

        except Exception as e:
            logger.error(f"Erro ao enviar mensagem interativa: {str(e)}")
            return {"success": False, "error": str(e)}

    async def send_generic_template(
        self, to: str, elements: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Envia template genérico (carrossel).

        Args:
            to: ID do destinatário
            elements: Lista de elementos do carrossel

        Returns:
            Dict[str, Any]: Resultado do envio
        """
        try:
            # Limitar a 10 elementos (limite do Messenger)
            elements = elements[:10]

            # Preparar payload
            payload = {
                "recipient": {"id": to},
                "message": {
                    "attachment": {
                        "type": "template",
                        "payload": {"template_type": "generic", "elements": elements},
                    }
                },
            }

            # Enviar mensagem
            response = self._make_api_request(payload)

            logger.info(f"Template genérico enviado para {to}")
            return {
                "success": True,
                "message_id": response.get("message_id"),
                "recipient_id": response.get("recipient_id"),
            }

        except Exception as e:
            logger.error(f"Erro ao enviar template genérico: {str(e)}")
            return {"success": False, "error": str(e)}

    async def send_quick_replies(
        self, to: str, text: str, quick_replies: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Envia mensagem com quick replies.

        Args:
            to: ID do destinatário
            text: Texto principal
            quick_replies: Lista de quick replies

        Returns:
            Dict[str, Any]: Resultado do envio
        """
        try:
            # Converter quick replies para formato do Messenger
            formatted_quick_replies = []
            for qr in quick_replies:
                formatted_quick_replies.append(
                    {
                        "content_type": "text",
                        "title": qr.get("title", ""),
                        "payload": qr.get("payload", ""),
                    }
                )

            # Limitar a 13 quick replies (limite do Messenger)
            formatted_quick_replies = formatted_quick_replies[:13]

            # Preparar payload
            payload = {
                "recipient": {"id": to},
                "message": {"text": text, "quick_replies": formatted_quick_replies},
            }

            # Enviar mensagem
            response = self._make_api_request(payload)

            logger.info(f"Mensagem com quick replies enviada para {to}")
            return {
                "success": True,
                "message_id": response.get("message_id"),
                "recipient_id": response.get("recipient_id"),
            }

        except Exception as e:
            logger.error(f"Erro ao enviar quick replies: {str(e)}")
            return {"success": False, "error": str(e)}

    async def parse_incoming_message(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa mensagem recebida.

        Args:
            data: Dados da mensagem recebida

        Returns:
            Dict[str, Any]: Mensagem processada
        """
        try:
            # Extrair dados da mensagem
            entry = data.get("entry", [{}])[0]
            messaging = entry.get("messaging", [{}])[0]

            sender_id = messaging.get("sender", {}).get("id")
            recipient_id = messaging.get("recipient", {}).get("id")
            timestamp = messaging.get("timestamp")

            # Verificar tipo de mensagem
            if "message" in messaging:
                message = messaging.get("message", {})

                # Verificar se é uma mensagem de texto
                if "text" in message:
                    return {
                        "type": MessageType.TEXT,
                        "from_id": sender_id,
                        "to_id": recipient_id,
                        "text": message.get("text", ""),
                        "timestamp": timestamp,
                        "platform": "messenger",
                    }

                # Verificar se é uma mensagem com anexo
                elif "attachments" in message:
                    attachments = message.get("attachments", [])

                    if attachments and attachments[0].get("type") == "image":
                        return {
                            "type": MessageType.IMAGE,
                            "from_id": sender_id,
                            "to_id": recipient_id,
                            "url": attachments[0].get("payload", {}).get("url", ""),
                            "timestamp": timestamp,
                            "platform": "messenger",
                        }

                    # Outros tipos de anexos
                    return {
                        "type": attachments[0].get("type", "unknown"),
                        "from_id": sender_id,
                        "to_id": recipient_id,
                        "url": attachments[0].get("payload", {}).get("url", ""),
                        "timestamp": timestamp,
                        "platform": "messenger",
                    }

                # Verificar se é uma resposta rápida
                elif "quick_reply" in message:
                    return {
                        "type": "quick_reply",
                        "from_id": sender_id,
                        "to_id": recipient_id,
                        "payload": message.get("quick_reply", {}).get("payload", ""),
                        "text": message.get("text", ""),
                        "timestamp": timestamp,
                        "platform": "messenger",
                    }

            # Verificar se é um postback
            elif "postback" in messaging:
                postback = messaging.get("postback", {})

                return {
                    "type": "postback",
                    "from_id": sender_id,
                    "to_id": recipient_id,
                    "payload": postback.get("payload", ""),
                    "title": postback.get("title", ""),
                    "timestamp": timestamp,
                    "platform": "messenger",
                }

            # Mensagem não reconhecida
            return {
                "type": "unknown",
                "from_id": sender_id,
                "to_id": recipient_id,
                "timestamp": timestamp,
                "platform": "messenger",
                "raw_data": messaging,
            }

        except Exception as e:
            logger.error(f"Erro ao processar mensagem recebida: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "raw_data": data,
                "platform": "messenger",
            }

    def verify_webhook(self, mode: str, token: str) -> bool:
        """
        Verifica token de webhook para configuração inicial.

        Args:
            mode: Modo de verificação
            token: Token a ser verificado

        Returns:
            bool: True se o token for válido, False caso contrário
        """
        if mode == "subscribe" and token == self.verify_token:
            logger.info("Webhook verificado com sucesso")
            return True
        else:
            logger.warning(f"Falha na verificação do webhook: {mode}, {token}")
            return False

    def verify_signature(self, signature: str, payload: str) -> bool:
        """
        Verifica assinatura de webhook.

        Args:
            signature: Assinatura do webhook
            payload: Conteúdo do webhook

        Returns:
            bool: True se a assinatura for válida, False caso contrário
        """
        if not self.app_secret:
            logger.warning(
                "App secret não configurado, pulando verificação de assinatura"
            )
            return True

        try:
            # Extrair hash da assinatura
            expected_signature = (
                "sha1="
                + hmac.new(
                    self.app_secret.encode("utf-8"),
                    payload.encode("utf-8"),
                    hashlib.sha1,
                ).hexdigest()
            )

            # Comparar assinaturas
            if hmac.compare_digest(signature, expected_signature):
                return True
            else:
                logger.warning(
                    f"Assinatura inválida: {signature} != {expected_signature}"
                )
                return False

        except Exception as e:
            logger.error(f"Erro ao verificar assinatura: {str(e)}")
            return False

    def _make_api_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Faz requisição para a API do Messenger.

        Args:
            payload: Dados a serem enviados

        Returns:
            Dict[str, Any]: Resposta da API
        """
        params = {"access_token": self.page_access_token}
        headers = {"Content-Type": "application/json"}

        response = requests.post(
            self.api_url, params=params, headers=headers, json=payload
        )

        # Verificar resposta
        if response.status_code != 200:
            logger.error(
                f"Erro na API do Messenger: {response.status_code}, {response.text}"
            )
            raise Exception(
                f"Erro na API do Messenger: {response.status_code}, {response.text}"
            )

        return response.json()
