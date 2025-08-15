"""
Inicialização do módulo de integração.
"""

# Importações necessárias
from .external_data import ExternalDataService
from .forecast_integration import ForecastIntegrationService

# Exportar classes e funções relevantes
__all__ = ["ForecastIntegrationService", "ExternalDataService"]
