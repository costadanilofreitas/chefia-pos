"""
Módulo de inicialização para o pacote de marketing.

Este módulo inicializa o pacote de marketing e exporta as classes e funções relevantes.
"""

from .facebook_pixel import FacebookPixelIntegration
from .marketing_integration import MarketingIntegration

__all__ = ["FacebookPixelIntegration", "MarketingIntegration"]
