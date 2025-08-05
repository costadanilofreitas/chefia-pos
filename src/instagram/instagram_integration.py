"""
Módulo de integração com Instagram Direct.

Este módulo implementa a integração com a API do Instagram Direct,
permitindo envio e recebimento de mensagens, interações básicas,
e processamento de webhooks.
"""

import os
import logging
import hmac
import hashlib
import requests
from typing import Dict, Any, List

from ...core.messaging import BasePlatformIntegration, MessageType

# Configuração de logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class InstagramDirectIntegration(BasePlatformIntegration):
    """Classe para integração com Instagram Direct."""
    
    def __init__(self, 
                 access_token: str = None, 
                 app_secret: str = None,
                 verify_token: str = None):
        """
        Inicializa a integração com Instagram Direct.
        
        Args:
            access_token: Token de acesso da conta comercial (opcional, padrão do ambiente)
            app_secret: Segredo do aplicativo para verificação de assinatura (opcional, padrão do ambiente)
            verify_token: Token de verificação para webhooks (opcional, padrão do ambiente)
        """
        # Configurações da API
        self.access_token = access_token or os.environ.get('INSTAGRAM_ACCESS_TOKEN')
        self.app_secret = app_secret or os.environ.get('INSTAGRAM_APP_SECRET')
        self.verify_token = verify_token or os.environ.get('INSTAGRAM_VERIFY_TOKEN')
        
        # URL base da API (Instagram usa a mesma Graph API do Facebook)
        self.api_url = "https://graph.facebook.com/v18.0/me/messages"
        
        # Validar configurações
        if not self.access_token:
            logger.warning("Token de acesso não configurado. A integração não funcionará corretamente.")
        
        logger.info("Integração com Instagram Direct inicializada")
    
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
            payload = {
                "recipient": {"id": to},
                "message": {"text": text}
            }
            
            # Enviar mensagem
            response = self._make_api_request(payload)
            
            logger.info(f"Mensagem enviada para {to}: {text[:50]}...")
            return {
                "success": True,
                "message_id": response.get("message_id"),
                "recipient_id": response.get("recipient_id")
            }
            
        except Exception as e:
            logger.error(f"Erro ao enviar mensagem: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_image(self, to: str, image_url: str, caption: str = None) -> Dict[str, Any]:
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
                        "payload": {
                            "url": image_url,
                            "is_reusable": True
                        }
                    }
                }
            }
            
            # Adicionar legenda se fornecida
            if caption:
                # No Instagram Direct, não é possível adicionar legenda diretamente à imagem
                # Enviamos a imagem e depois a legenda como mensagem separada
                response = self._make_api_request(payload)
                
                # Enviar legenda como mensagem separada
                caption_payload = {
                    "recipient": {"id": to},
                    "message": {"text": caption}
                }
                caption_response = self._make_api_request(caption_payload)
                
                logger.info(f"Imagem com legenda enviada para {to}")
                return {
                    "success": True,
                    "message_id": response.get("message_id"),
                    "caption_message_id": caption_response.get("message_id"),
                    "recipient_id": response.get("recipient_id")
                }
            else:
                # Enviar apenas a imagem
                response = self._make_api_request(payload)
                
                logger.info(f"Imagem enviada para {to}")
                return {
                    "success": True,
                    "message_id": response.get("message_id"),
                    "recipient_id": response.get("recipient_id")
                }
            
        except Exception as e:
            logger.error(f"Erro ao enviar imagem: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_interactive_message(self, to: str, body: str, options: List[Dict[str, str]]) -> Dict[str, Any]:
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
            # Instagram Direct tem suporte limitado a botões interativos
            # Vamos usar quick replies que são mais compatíveis
            
            # Converter opções para formato de quick replies
            quick_replies = []
            for option in options:
                quick_replies.append({
                    "content_type": "text",
                    "title": option.get("title", ""),
                    "payload": option.get("id", "")
                })
            
            # Limitar a 13 quick replies (limite do Instagram)
            quick_replies = quick_replies[:13]
            
            # Preparar payload
            payload = {
                "recipient": {"id": to},
                "message": {
                    "text": body,
                    "quick_replies": quick_replies
                }
            }
            
            # Enviar mensagem
            response = self._make_api_request(payload)
            
            logger.info(f"Mensagem interativa enviada para {to}")
            return {
                "success": True,
                "message_id": response.get("message_id"),
                "recipient_id": response.get("recipient_id")
            }
            
        except Exception as e:
            logger.error(f"Erro ao enviar mensagem interativa: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_carousel(self, to: str, elements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Envia carrossel de imagens.
        
        Args:
            to: ID do destinatário
            elements: Lista de elementos do carrossel
            
        Returns:
            Dict[str, Any]: Resultado do envio
        """
        try:
            # Instagram Direct tem suporte limitado a carrosséis
            # Vamos enviar como imagens individuais em sequência
            
            responses = []
            for element in elements:
                # Preparar payload para cada imagem
                image_payload = {
                    "recipient": {"id": to},
                    "message": {
                        "attachment": {
                            "type": "image",
                            "payload": {
                                "url": element.get("image_url", ""),
                                "is_reusable": True
                            }
                        }
                    }
                }
                
                # Enviar imagem
                image_response = self._make_api_request(image_payload)
                responses.append(image_response)
                
                # Enviar título/descrição como mensagem separada
                if element.get("title") or element.get("subtitle"):
                    text = f"{element.get('title', '')}"
                    if element.get("subtitle"):
                        text += f"\n{element.get('subtitle', '')}"
                    
                    text_payload = {
                        "recipient": {"id": to},
                        "message": {"text": text}
                    }
                    text_response = self._make_api_request(text_payload)
                    responses.append(text_response)
            
            logger.info(f"Carrossel enviado para {to} ({len(elements)} elementos)")
            return {
                "success": True,
                "message_ids": [r.get("message_id") for r in responses if "message_id" in r],
                "recipient_id": to
            }
            
        except Exception as e:
            logger.error(f"Erro ao enviar carrossel: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_quick_replies(self, to: str, text: str, quick_replies: List[Dict[str, str]]) -> Dict[str, Any]:
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
            # Converter quick replies para formato do Instagram
            formatted_quick_replies = []
            for qr in quick_replies:
                formatted_quick_replies.append({
                    "content_type": "text",
                    "title": qr.get("title", ""),
                    "payload": qr.get("payload", "")
                })
            
            # Limitar a 13 quick replies (limite do Instagram)
            formatted_quick_replies = formatted_quick_replies[:13]
            
            # Preparar payload
            payload = {
                "recipient": {"id": to},
                "message": {
                    "text": text,
                    "quick_replies": formatted_quick_replies
                }
            }
            
            # Enviar mensagem
            response = self._make_api_request(payload)
            
            logger.info(f"Mensagem com quick replies enviada para {to}")
            return {
                "success": True,
                "message_id": response.get("message_id"),
                "recipient_id": response.get("recipient_id")
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
                        "platform": "instagram"
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
                            "platform": "instagram"
                        }
                    
                    # Outros tipos de anexos
                    return {
                        "type": attachments[0].get("type", "unknown"),
                        "from_id": sender_id,
                        "to_id": recipient_id,
                        "url": attachments[0].get("payload", {}).get("url", ""),
                        "timestamp": timestamp,
                        "platform": "instagram"
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
                        "platform": "instagram"
                    }
            
            # Mensagem não reconhecida
            return {
                "type": "unknown",
                "from_id": sender_id,
                "to_id": recipient_id,
                "timestamp": timestamp,
                "platform": "instagram",
                "raw_data": messaging
            }
            
        except Exception as e:
            logger.error(f"Erro ao processar mensagem recebida: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "raw_data": data,
                "platform": "instagram"
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
            logger.warning("App secret não configurado, pulando verificação de assinatura")
            return True
        
        try:
            # Extrair hash da assinatura
            expected_signature = 'sha1=' + hmac.new(
                self.app_secret.encode('utf-8'),
                payload.encode('utf-8'),
                hashlib.sha1
            ).hexdigest()
            
            # Comparar assinaturas
            if hmac.compare_digest(signature, expected_signature):
                return True
            else:
                logger.warning(f"Assinatura inválida: {signature} != {expected_signature}")
                return False
                
        except Exception as e:
            logger.error(f"Erro ao verificar assinatura: {str(e)}")
            return False
    
    def _make_api_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Faz requisição para a API do Instagram.
        
        Args:
            payload: Dados a serem enviados
            
        Returns:
            Dict[str, Any]: Resposta da API
        """
        params = {"access_token": self.access_token}
        headers = {"Content-Type": "application/json"}
        
        response = requests.post(
            self.api_url,
            params=params,
            headers=headers,
            json=payload
        )
        
        # Verificar resposta
        if response.status_code != 200:
            logger.error(f"Erro na API do Instagram: {response.status_code}, {response.text}")
            raise Exception(f"Erro na API do Instagram: {response.status_code}, {response.text}")
        
        return response.json()
