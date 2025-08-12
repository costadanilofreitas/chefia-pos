"""
Módulo de inicialização para o pacote de mensagens.

Este módulo define as importações e configurações iniciais para
o pacote de mensagens, que inclui chatbots para diferentes plataformas.
"""

from .base_chatbot import (
    MessageType,
    ConversationState,
    PlatformType,
    BasePlatformIntegration,
    BaseEventIntegration,
    BaseChatbotService,
    BaseIntegratedChatbot,
)

__all__ = [
    "MessageType",
    "ConversationState",
    "PlatformType",
    "BasePlatformIntegration",
    "BaseEventIntegration",
    "BaseChatbotService",
    "BaseIntegratedChatbot",
]
