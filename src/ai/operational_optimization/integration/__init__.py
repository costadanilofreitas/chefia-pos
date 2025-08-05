"""
Inicialização do módulo de integração.
"""

# Importações necessárias
from .forecast_integration import ForecastIntegrationService
from .external_data import ExternalDataService

# Exportar classes e funções relevantes
__all__ = ["ForecastIntegrationService", "ExternalDataService"]
