"""
Módulo base para chatbots em diferentes plataformas.

Este módulo define interfaces e classes abstratas para implementação
de chatbots em múltiplas plataformas (WhatsApp, Messenger, Instagram),
permitindo reutilização de código e funcionalidades comuns.
"""

import logging
import uuid
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List

# Configuração de logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class MessageType:
    """Tipos de mensagens suportados pelos chatbots."""

    TEXT = "text"
    IMAGE = "image"
    TEMPLATE = "template"
    INTERACTIVE_BUTTONS = "interactive_buttons"
    INTERACTIVE_LIST = "interactive_list"
    CAROUSEL = "carousel"
    LOCATION = "location"
    AUDIO = "audio"
    VIDEO = "video"
    FILE = "file"


class ConversationState:
    """Estados possíveis de uma conversa."""

    INITIAL = "initial"
    MENU_BROWSING = "menu_browsing"
    ITEM_SELECTION = "item_selection"
    CART_REVIEW = "cart_review"
    CHECKOUT = "checkout"
    PAYMENT = "payment"
    ORDER_TRACKING = "order_tracking"
    FEEDBACK = "feedback"
    SUPPORT = "support"
    COMPLETED = "completed"


class PlatformType:
    """Tipos de plataformas suportadas."""

    WHATSAPP = "whatsapp"
    MESSENGER = "messenger"
    INSTAGRAM = "instagram"
    TELEGRAM = "telegram"
    GENERIC = "generic"


class BasePlatformIntegration(ABC):
    """Interface base para integrações com plataformas de mensagens."""

    @abstractmethod
    async def send_message(self, to: str, text: str) -> Dict[str, Any]:
        """
        Envia mensagem de texto.

        Args:
            to: ID do destinatário
            text: Texto da mensagem

        Returns:
            Dict[str, Any]: Resultado do envio
        """
        pass

    @abstractmethod
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
        pass

    @abstractmethod
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
        pass

    @abstractmethod
    async def parse_incoming_message(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa mensagem recebida.

        Args:
            data: Dados da mensagem recebida

        Returns:
            Dict[str, Any]: Mensagem processada
        """
        pass


class BaseEventIntegration(ABC):
    """Interface base para integrações com sistemas de eventos."""

    @abstractmethod
    async def send_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Envia mensagem para o sistema de eventos.

        Args:
            message: Mensagem a ser enviada

        Returns:
            Dict[str, Any]: Resultado do envio
        """
        pass

    @abstractmethod
    async def receive_messages(
        self, max_messages: int = 10, wait_time_seconds: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Recebe mensagens do sistema de eventos.

        Args:
            max_messages: Número máximo de mensagens a receber
            wait_time_seconds: Tempo máximo de espera em segundos

        Returns:
            List[Dict[str, Any]]: Mensagens recebidas
        """
        pass

    @abstractmethod
    async def delete_message(self, receipt_handle: str) -> Dict[str, Any]:
        """
        Exclui mensagem processada.

        Args:
            receipt_handle: Identificador de recebimento da mensagem

        Returns:
            Dict[str, Any]: Resultado da exclusão
        """
        pass


class BaseChatbotService(ABC):
    """Classe base para serviços de chatbot."""

    def __init__(self, platform_type: str = PlatformType.GENERIC):
        """
        Inicializa o serviço de chatbot.

        Args:
            platform_type: Tipo de plataforma
        """
        self.platform_type = platform_type
        self.conversations: Dict[str, Any] = {}  # Armazenamento de conversas ativas
        logger.info(f"Serviço de chatbot para {platform_type} inicializado")

    @abstractmethod
    async def process_incoming_message(
        self, message_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Processa mensagem recebida.

        Args:
            message_data: Dados da mensagem

        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        pass

    async def get_or_create_conversation(self, user_id: str) -> Dict[str, Any]:
        """
        Obtém ou cria uma conversa para um usuário.

        Args:
            user_id: ID do usuário

        Returns:
            Dict[str, Any]: Dados da conversa
        """
        if user_id not in self.conversations:
            # Criar nova conversa
            self.conversations[user_id] = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "state": ConversationState.INITIAL,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "messages": [],
                "context": {},
                "cart": [],
            }

        # Atualizar timestamp
        self.conversations[user_id]["updated_at"] = datetime.now().isoformat()

        return self.conversations[user_id]

    async def update_conversation_state(
        self, user_id: str, state: str
    ) -> Dict[str, Any]:
        """
        Atualiza o estado de uma conversa.

        Args:
            user_id: ID do usuário
            state: Novo estado

        Returns:
            Dict[str, Any]: Conversa atualizada
        """
        conversation = await self.get_or_create_conversation(user_id)
        conversation["state"] = state
        conversation["updated_at"] = datetime.now().isoformat()
        return conversation

    async def add_message_to_conversation(
        self, user_id: str, message: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Adiciona mensagem ao histórico da conversa.

        Args:
            user_id: ID do usuário
            message: Mensagem a ser adicionada

        Returns:
            Dict[str, Any]: Conversa atualizada
        """
        conversation = await self.get_or_create_conversation(user_id)

        # Adicionar timestamp se não existir
        if "timestamp" not in message:
            message["timestamp"] = datetime.now().isoformat()

        # Adicionar mensagem ao histórico
        conversation["messages"].append(message)
        conversation["updated_at"] = datetime.now().isoformat()

        return conversation

    async def get_conversation_context(self, user_id: str) -> Dict[str, Any]:
        """
        Obtém o contexto de uma conversa.

        Args:
            user_id: ID do usuário

        Returns:
            Dict[str, Any]: Contexto da conversa
        """
        conversation = await self.get_or_create_conversation(user_id)
        return conversation.get("context", {})

    async def update_conversation_context(
        self, user_id: str, context_updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Atualiza o contexto de uma conversa.

        Args:
            user_id: ID do usuário
            context_updates: Atualizações para o contexto

        Returns:
            Dict[str, Any]: Contexto atualizado
        """
        conversation = await self.get_or_create_conversation(user_id)

        # Criar contexto se não existir
        if "context" not in conversation:
            conversation["context"] = {}

        # Atualizar contexto
        conversation["context"].update(context_updates)
        conversation["updated_at"] = datetime.now().isoformat()

        return conversation["context"]

    async def get_cart(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Obtém o carrinho de compras de um usuário.

        Args:
            user_id: ID do usuário

        Returns:
            List[Dict[str, Any]]: Carrinho de compras
        """
        conversation = await self.get_or_create_conversation(user_id)
        return conversation.get("cart", [])

    async def add_to_cart(
        self, user_id: str, item: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Adiciona item ao carrinho de compras.

        Args:
            user_id: ID do usuário
            item: Item a ser adicionado

        Returns:
            List[Dict[str, Any]]: Carrinho atualizado
        """
        conversation = await self.get_or_create_conversation(user_id)

        # Criar carrinho se não existir
        if "cart" not in conversation:
            conversation["cart"] = []

        # Adicionar item ao carrinho
        conversation["cart"].append(item)
        conversation["updated_at"] = datetime.now().isoformat()

        return conversation["cart"]

    async def clear_cart(self, user_id: str) -> Dict[str, Any]:
        """
        Limpa o carrinho de compras.

        Args:
            user_id: ID do usuário

        Returns:
            Dict[str, Any]: Conversa atualizada
        """
        conversation = await self.get_or_create_conversation(user_id)
        conversation["cart"] = []
        conversation["updated_at"] = datetime.now().isoformat()
        return conversation


class BaseIntegratedChatbot(ABC):
    """Classe base para chatbots integrados com múltiplos serviços."""

    def __init__(self, platform_type: str = PlatformType.GENERIC):
        """
        Inicializa o chatbot integrado.

        Args:
            platform_type: Tipo de plataforma
        """
        self.platform_type = platform_type
        self.running = True
        logger.info(f"Chatbot integrado para {platform_type} inicializado")

    @abstractmethod
    async def process_webhook(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa webhook da plataforma.

        Args:
            request_data: Dados da requisição

        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        pass

    @abstractmethod
    async def send_message(
        self, to: str, message_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Envia mensagem para um usuário.

        Args:
            to: ID do destinatário
            message_data: Dados da mensagem

        Returns:
            Dict[str, Any]: Resultado do envio
        """
        pass

    @abstractmethod
    async def send_marketing_campaign(
        self,
        customer_data: Dict[str, Any],
        campaign_type: str,
        restaurant_data: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Envia campanha de marketing.

        Args:
            customer_data: Dados do cliente
            campaign_type: Tipo de campanha
            restaurant_data: Dados do restaurante (opcional)

        Returns:
            Dict[str, Any]: Resultado do envio
        """
        pass

    @abstractmethod
    async def shutdown(self) -> None:
        """Encerra o chatbot e suas tarefas em background."""
        pass
