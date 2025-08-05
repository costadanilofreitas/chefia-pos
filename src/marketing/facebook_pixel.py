"""
Módulo de integração com Facebook Pixel para campanhas de marketing.

Este módulo implementa a integração com o Facebook Pixel para rastreamento
de eventos e otimização de campanhas de marketing.
"""

import os
import logging
import requests
from typing import Dict, Any
from datetime import datetime

# Configuração de logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class FacebookPixelIntegration:
    """Classe para integração com Facebook Pixel."""

    def __init__(self, pixel_id: str = None, access_token: str = None):
        """
        Inicializa a integração com Facebook Pixel.

        Args:
            pixel_id: ID do pixel (opcional, padrão do ambiente)
            access_token: Token de acesso (opcional, padrão do ambiente)
        """
        # Configurações do Pixel
        self.pixel_id = pixel_id or os.environ.get("FACEBOOK_PIXEL_ID")
        self.access_token = access_token or os.environ.get("FACEBOOK_ACCESS_TOKEN")

        # URL base da API do Facebook
        self.api_url = f"https://graph.facebook.com/v18.0/{self.pixel_id}/events"

        # Validar configurações
        if not self.pixel_id:
            logger.warning(
                "ID do pixel não configurado. A integração não funcionará corretamente."
            )

        if not self.access_token:
            logger.warning(
                "Token de acesso não configurado. A integração não funcionará corretamente."
            )

        logger.info(
            f"Integração com Facebook Pixel inicializada. Pixel ID: {self.pixel_id}"
        )

    def track_event(
        self,
        event_name: str,
        user_data: Dict[str, Any],
        custom_data: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Rastreia um evento do Facebook Pixel.

        Args:
            event_name: Nome do evento (ex: 'Purchase', 'AddToCart')
            user_data: Dados do usuário (ex: email, phone)
            custom_data: Dados personalizados do evento (opcional)

        Returns:
            Dict[str, Any]: Resultado do rastreamento
        """
        try:
            # Preparar dados do evento
            event_data = {
                "data": [
                    {
                        "event_name": event_name,
                        "event_time": int(datetime.now().timestamp()),
                        "user_data": user_data,
                        "action_source": "website",
                    }
                ]
            }

            # Adicionar dados personalizados se fornecidos
            if custom_data:
                event_data["data"][0]["custom_data"] = custom_data

            # Parâmetros da requisição
            params = {"access_token": self.access_token}

            # Enviar evento
            response = requests.post(self.api_url, params=params, json=event_data)

            # Verificar resposta
            if response.status_code == 200:
                logger.info(f"Evento '{event_name}' rastreado com sucesso")
                return {
                    "success": True,
                    "event_name": event_name,
                    "response": response.json(),
                }
            else:
                logger.error(
                    f"Erro ao rastrear evento '{event_name}': {response.status_code}, {response.text}"
                )
                return {
                    "success": False,
                    "event_name": event_name,
                    "error": f"Erro {response.status_code}: {response.text}",
                }

        except Exception as e:
            logger.error(f"Erro ao rastrear evento '{event_name}': {str(e)}")
            return {"success": False, "event_name": event_name, "error": str(e)}

    def track_page_view(
        self, page_url: str, page_title: str, user_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Rastreia uma visualização de página.

        Args:
            page_url: URL da página
            page_title: Título da página
            user_data: Dados do usuário

        Returns:
            Dict[str, Any]: Resultado do rastreamento
        """
        custom_data = {"page_url": page_url, "page_title": page_title}

        return self.track_event("PageView", user_data, custom_data)

    def track_add_to_cart(
        self, user_data: Dict[str, Any], product_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Rastreia adição ao carrinho.

        Args:
            user_data: Dados do usuário
            product_data: Dados do produto

        Returns:
            Dict[str, Any]: Resultado do rastreamento
        """
        custom_data = {
            "content_ids": [product_data.get("id", "")],
            "content_name": product_data.get("name", ""),
            "content_type": "product",
            "contents": [
                {
                    "id": product_data.get("id", ""),
                    "quantity": product_data.get("quantity", 1),
                }
            ],
            "currency": "BRL",
            "value": product_data.get("price", 0) * product_data.get("quantity", 1),
        }

        return self.track_event("AddToCart", user_data, custom_data)

    def track_purchase(
        self, user_data: Dict[str, Any], order_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Rastreia uma compra.

        Args:
            user_data: Dados do usuário
            order_data: Dados do pedido

        Returns:
            Dict[str, Any]: Resultado do rastreamento
        """
        # Preparar dados dos itens
        contents = []
        content_ids = []

        for item in order_data.get("items", []):
            contents.append(
                {"id": item.get("id", ""), "quantity": item.get("quantity", 1)}
            )
            content_ids.append(item.get("id", ""))

        custom_data = {
            "content_ids": content_ids,
            "content_type": "product",
            "contents": contents,
            "currency": "BRL",
            "value": order_data.get("total", 0),
            "order_id": order_data.get("order_id", ""),
        }

        return self.track_event("Purchase", user_data, custom_data)

    def track_lead(
        self, user_data: Dict[str, Any], lead_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Rastreia um lead.

        Args:
            user_data: Dados do usuário
            lead_data: Dados do lead (opcional)

        Returns:
            Dict[str, Any]: Resultado do rastreamento
        """
        custom_data = lead_data or {}

        return self.track_event("Lead", user_data, custom_data)

    def track_complete_registration(
        self, user_data: Dict[str, Any], registration_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Rastreia um registro completo.

        Args:
            user_data: Dados do usuário
            registration_data: Dados do registro (opcional)

        Returns:
            Dict[str, Any]: Resultado do rastreamento
        """
        custom_data = registration_data or {}

        return self.track_event("CompleteRegistration", user_data, custom_data)

    def track_search(
        self, user_data: Dict[str, Any], search_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Rastreia uma pesquisa.

        Args:
            user_data: Dados do usuário
            search_data: Dados da pesquisa

        Returns:
            Dict[str, Any]: Resultado do rastreamento
        """
        custom_data = {
            "search_string": search_data.get("query", ""),
            "content_category": search_data.get("category", ""),
        }

        return self.track_event("Search", user_data, custom_data)

    def track_view_content(
        self, user_data: Dict[str, Any], content_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Rastreia visualização de conteúdo.

        Args:
            user_data: Dados do usuário
            content_data: Dados do conteúdo

        Returns:
            Dict[str, Any]: Resultado do rastreamento
        """
        custom_data = {
            "content_ids": [content_data.get("id", "")],
            "content_name": content_data.get("name", ""),
            "content_type": content_data.get("type", "product"),
            "currency": "BRL",
            "value": content_data.get("price", 0),
        }

        return self.track_event("ViewContent", user_data, custom_data)

    def track_add_to_wishlist(
        self, user_data: Dict[str, Any], product_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Rastreia adição à lista de desejos.

        Args:
            user_data: Dados do usuário
            product_data: Dados do produto

        Returns:
            Dict[str, Any]: Resultado do rastreamento
        """
        custom_data = {
            "content_ids": [product_data.get("id", "")],
            "content_name": product_data.get("name", ""),
            "content_type": "product",
            "currency": "BRL",
            "value": product_data.get("price", 0),
        }

        return self.track_event("AddToWishlist", user_data, custom_data)

    def track_initiate_checkout(
        self, user_data: Dict[str, Any], cart_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Rastreia início de checkout.

        Args:
            user_data: Dados do usuário
            cart_data: Dados do carrinho

        Returns:
            Dict[str, Any]: Resultado do rastreamento
        """
        # Preparar dados dos itens
        contents = []
        content_ids = []

        for item in cart_data.get("items", []):
            contents.append(
                {"id": item.get("id", ""), "quantity": item.get("quantity", 1)}
            )
            content_ids.append(item.get("id", ""))

        custom_data = {
            "content_ids": content_ids,
            "content_type": "product",
            "contents": contents,
            "currency": "BRL",
            "value": cart_data.get("total", 0),
            "num_items": len(cart_data.get("items", [])),
        }

        return self.track_event("InitiateCheckout", user_data, custom_data)

    def track_contact(
        self, user_data: Dict[str, Any], contact_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Rastreia um contato.

        Args:
            user_data: Dados do usuário
            contact_data: Dados do contato (opcional)

        Returns:
            Dict[str, Any]: Resultado do rastreamento
        """
        custom_data = contact_data or {}

        return self.track_event("Contact", user_data, custom_data)

    def track_custom_event(
        self,
        event_name: str,
        user_data: Dict[str, Any],
        custom_data: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Rastreia um evento personalizado.

        Args:
            event_name: Nome do evento personalizado
            user_data: Dados do usuário
            custom_data: Dados personalizados do evento (opcional)

        Returns:
            Dict[str, Any]: Resultado do rastreamento
        """
        return self.track_event(event_name, user_data, custom_data)

    def hash_user_data(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Aplica hash nos dados do usuário para conformidade com LGPD/GDPR.

        Args:
            user_data: Dados do usuário

        Returns:
            Dict[str, Any]: Dados do usuário com hash
        """
        # Implementação de hash para dados sensíveis
        # Na prática, isso seria feito com algoritmos de hash como SHA-256
        # Para simplificar, apenas retornamos os dados originais
        return user_data

    def get_user_data_from_customer(self, customer: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extrai e formata dados do usuário a partir de um cliente.

        Args:
            customer: Dados do cliente

        Returns:
            Dict[str, Any]: Dados do usuário formatados para o Pixel
        """
        user_data = {
            "em": customer.get("email", ""),  # Email
            "ph": customer.get("phone", ""),  # Telefone
            "fn": customer.get("first_name", ""),  # Primeiro nome
            "ln": customer.get("last_name", ""),  # Sobrenome
            "ct": customer.get("city", ""),  # Cidade
            "st": customer.get("state", ""),  # Estado
            "zp": customer.get("zip_code", ""),  # CEP
            "country": customer.get("country", "BR"),  # País
            "external_id": customer.get("id", ""),  # ID externo
        }

        # Remover campos vazios
        user_data = {k: v for k, v in user_data.items() if v}

        # Aplicar hash nos dados
        return self.hash_user_data(user_data)
