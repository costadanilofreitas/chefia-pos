"""
Pacote de integração com iFood.

Este pacote contém os componentes necessários para integração
completa com a plataforma iFood, incluindo autenticação,
API, webhooks e processamento de eventos.
"""

from .auth_manager import IFoodAuthManager
from .api_client import IFoodAPIClient
from .webhook_handler import IFoodWebhookHandler

__all__ = ["IFoodAuthManager", "IFoodAPIClient", "IFoodWebhookHandler"]
