"""
Módulo de testes de integração para o sistema de otimização operacional.

Este módulo implementa:
1. Testes de integração entre previsão de demanda e otimização operacional
2. Testes de integração com fontes de dados externas
3. Validação de fluxo de dados entre módulos
"""

import logging

# Importar corretamente os módulos
import sys
from datetime import datetime, timedelta
from typing import Any, Dict

sys.path.append("/home/ubuntu/pos-modern")

from src.ai.demand_forecast.models import ForecastDimension, TimeGranularity
from src.ai.demand_forecast.service import DemandForecastService
from src.ai.operational_optimization.integration.external_data import (
    ExternalDataService,
)
from src.ai.operational_optimization.integration.forecast_integration import (
    ForecastIntegrationService,
)
from src.ai.operational_optimization.services.optimization_service import (
    OperationalOptimizationService,
)

# Configurar logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class IntegrationValidator:
    """Classe para validação de integração entre módulos."""

    def __init__(self):
        """
        Inicializa o validador de integração.
        """
        self.optimization_service = OperationalOptimizationService()
        self.forecast_integration = ForecastIntegrationService()
        self.external_data_service = ExternalDataService()
        self.forecast_service = DemandForecastService()

    async def validate_forecast_integration(self, restaurant_id: str) -> Dict[str, Any]:
        """
        Valida integração entre previsão de demanda e otimização operacional.

        Args:
            restaurant_id: ID do restaurante para teste

        Returns:
            Dict[str, Any]: Resultados da validação
        """
        logger.info(f"Validating forecast integration for restaurant {restaurant_id}")

        results: Dict[str, Any] = {"success": True, "tests": [], "errors": []}

        try:
            # Teste 1: Obter previsão de demanda
            start_date = datetime.now()
            end_date = start_date + timedelta(days=7)

            test_result: Dict[str, Any] = {"name": "Obter previsão de demanda", "status": "running"}

            try:
                forecast = await self.forecast_integration.get_demand_forecast(
                    restaurant_id=restaurant_id,
                    start_date=start_date,
                    end_date=end_date,
                    granularity=TimeGranularity.DAILY,
                    dimensions=[ForecastDimension.RESTAURANT],
                )

                test_result["status"] = "success"
                test_result["details"] = {
                    "forecast_id": forecast.request_id,
                    "points_count": len(forecast.points),
                    "start_date": forecast.start_date.isoformat(),
                    "end_date": forecast.end_date.isoformat(),
                }
            except Exception as e:
                test_result["status"] = "failed"
                test_result["error"] = str(e)
                results["success"] = False
                results["errors"].append(
                    {"test": "Obter previsão de demanda", "error": str(e)}
                )

            results["tests"].append(test_result)

            # Teste 2: Gerar recomendações de escala com base na previsão
            test_result_staff: Dict[str, Any] = {"name": "Gerar recomendações de escala", "status": "running"}

            try:
                staff_recommendations = await self.optimization_service.staff_service.generate_staff_recommendations(
                    restaurant_id=restaurant_id,
                    start_date=start_date,
                    end_date=end_date,
                )

                test_result_staff["status"] = "success"
                test_result_staff["details"] = {
                    "recommendations_count": len(staff_recommendations),
                    "first_recommendation": (
                        staff_recommendations[0].dict()
                        if staff_recommendations
                        else None
                    ),
                }
            except Exception as e:
                test_result_staff["status"] = "failed"
                test_result_staff["error"] = str(e)
                results["success"] = False
                results["errors"].append(
                    {"test": "Gerar recomendações de escala", "error": str(e)}
                )

            results["tests"].append(test_result_staff)

            # Teste 3: Gerar todas as recomendações de otimização
            test_result3: Dict[str, Any] = {"name": "Gerar todas as recomendações", "status": "running"}

            try:
                all_recommendations = (
                    await self.optimization_service.generate_all_recommendations(
                        restaurant_id=restaurant_id,
                        start_date=start_date,
                        end_date=end_date,
                    )
                )

                test_result["status"] = "success"
                test_result["details"] = {
                    "recommendations_types": list(
                        all_recommendations["recommendations"].keys()
                    ),
                    "metrics": all_recommendations["metrics"],
                }
            except Exception as e:
                test_result["status"] = "failed"
                test_result["error"] = str(e)
                results["success"] = False
                results["errors"].append(
                    {"test": "Gerar todas as recomendações", "error": str(e)}
                )

            results["tests"].append(test_result)

            return results

        except Exception as e:
            logger.error(
                f"Error validating forecast integration: {str(e)}", exc_info=True
            )
            results["success"] = False
            results["errors"].append({"test": "Validação geral", "error": str(e)})
            return results

    async def validate_external_data_integration(
        self, restaurant_id: str
    ) -> Dict[str, Any]:
        """
        Valida integração com fontes de dados externas.

        Args:
            restaurant_id: ID do restaurante para teste

        Returns:
            Dict[str, Any]: Resultados da validação
        """
        logger.info(
            f"Validating external data integration for restaurant {restaurant_id}"
        )

        results: Dict[str, Any] = {"success": True, "tests": [], "errors": []}

        try:
            # Localização simulada para o restaurante
            location = {"latitude": -23.5505, "longitude": -46.6333}

            # Teste 1: Obter dados climáticos
            test_result: Dict[str, Any] = {"name": "Obter dados climáticos", "status": "running"}

            try:
                weather_data = await self.external_data_service.get_weather_forecast(
                    latitude=location["latitude"],
                    longitude=location["longitude"],
                    days=7,
                )

                test_result["status"] = "success"
                test_result["details"] = {
                    "data_points": len(weather_data),
                    "first_point": weather_data[0] if weather_data else None,
                }
            except Exception as e:
                test_result["status"] = "failed"
                test_result["error"] = str(e)
                results["success"] = False
                results["errors"].append(
                    {"test": "Obter dados climáticos", "error": str(e)}
                )

            results["tests"].append(test_result)

            # Teste 2: Obter dados de eventos
            test_result2: Dict[str, Any] = {"name": "Obter dados de eventos", "status": "running"}

            try:
                start_date = datetime.now()
                end_date = start_date + timedelta(days=30)

                events_data = await self.external_data_service.get_nearby_events(
                    latitude=location["latitude"],
                    longitude=location["longitude"],
                    radius_km=10.0,
                    start_date=start_date,
                    end_date=end_date,
                )

                test_result2["status"] = "success"
                test_result2["details"] = {
                    "events_count": len(events_data),
                    "first_event": events_data[0] if events_data else None,
                }
            except Exception as e:
                test_result2["status"] = "failed"
                test_result2["error"] = str(e)
                results["success"] = False
                results["errors"].append(
                    {"test": "Obter dados de eventos", "error": str(e)}
                )

            results["tests"].append(test_result2)

            # Teste 3: Obter dados de feriados
            test_result3: Dict[str, Any] = {"name": "Obter dados de feriados", "status": "running"}

            try:
                holidays_data = await self.external_data_service.get_holidays(
                    country="BR", year=datetime.now().year, region="SP"
                )

                test_result3["status"] = "success"
                test_result3["details"] = {
                    "holidays_count": len(holidays_data),
                    "first_holiday": holidays_data[0] if holidays_data else None,
                }
            except Exception as e:
                test_result3["status"] = "failed"
                test_result3["error"] = str(e)
                results["success"] = False
                results["errors"].append(
                    {"test": "Obter dados de feriados", "error": str(e)}
                )

            results["tests"].append(test_result3)

            # Teste 4: Enriquecer previsão com dados externos
            test_result4: Dict[str, Any] = {
                "name": "Enriquecer previsão com dados externos",
                "status": "running",
            }

            try:
                start_date = datetime.now()
                end_date = start_date + timedelta(days=7)

                # Obter previsão básica
                forecast = await self.forecast_integration.get_demand_forecast(
                    restaurant_id=restaurant_id,
                    start_date=start_date,
                    end_date=end_date,
                )

                # Enriquecer com dados externos
                enriched_forecast = (
                    await self.forecast_integration.enrich_forecast_with_external_data(
                        forecast=forecast,
                        restaurant_id=restaurant_id,
                        location=location,
                    )
                )

                test_result4["status"] = "success"
                test_result4["details"] = {
                    "forecast_id": enriched_forecast.request_id,
                    "metadata": (
                        enriched_forecast.metadata
                        if hasattr(enriched_forecast, "metadata")
                        else None
                    ),
                }
            except Exception as e:
                test_result4["status"] = "failed"
                test_result4["error"] = str(e)
                results["success"] = False
                results["errors"].append(
                    {"test": "Enriquecer previsão com dados externos", "error": str(e)}
                )

            results["tests"].append(test_result4)

            return results

        except Exception as e:
            logger.error(
                f"Error validating external data integration: {str(e)}", exc_info=True
            )
            results["success"] = False
            results["errors"].append({"test": "Validação geral", "error": str(e)})
            return results

    async def validate_end_to_end_flow(self, restaurant_id: str) -> Dict[str, Any]:
        """
        Valida fluxo completo de ponta a ponta.

        Args:
            restaurant_id: ID do restaurante para teste

        Returns:
            Dict[str, Any]: Resultados da validação
        """
        logger.info(f"Validating end-to-end flow for restaurant {restaurant_id}")

        results: Dict[str, Any] = {"success": True, "tests": [], "errors": []}

        try:
            # Localização simulada para o restaurante
            location = {"latitude": -23.5505, "longitude": -46.6333}

            # Teste 1: Fluxo completo de previsão e otimização
            test_result: Dict[str, Any] = {
                "name": "Fluxo completo de previsão e otimização",
                "status": "running",
            }

            try:
                # 1. Obter dados externos
                start_date = datetime.now()
                end_date = start_date + timedelta(days=7)

                weather_data = await self.external_data_service.get_weather_forecast(
                    latitude=location["latitude"],
                    longitude=location["longitude"],
                    days=7,
                )

                events_data = await self.external_data_service.get_nearby_events(
                    latitude=location["latitude"],
                    longitude=location["longitude"],
                    radius_km=10.0,
                    start_date=start_date,
                    end_date=end_date,
                )

                holidays_data = await self.external_data_service.get_holidays(
                    country="BR", year=datetime.now().year, region="SP"
                )

                # 2. Gerar previsão de demanda
                forecast = await self.forecast_integration.get_demand_forecast(
                    restaurant_id=restaurant_id,
                    start_date=start_date,
                    end_date=end_date,
                    include_weather=True,
                    include_events=True,
                )

                # 3. Enriquecer previsão com dados externos
                (
                    await self.forecast_integration.enrich_forecast_with_external_data(
                        forecast=forecast,
                        restaurant_id=restaurant_id,
                        location=location,
                    )
                )

                # 4. Gerar todas as recomendações de otimização
                all_recommendations = (
                    await self.optimization_service.generate_all_recommendations(
                        restaurant_id=restaurant_id,
                        start_date=start_date,
                        end_date=end_date,
                    )
                )

                test_result["status"] = "success"
                test_result["details"] = {
                    "weather_data_points": len(weather_data),
                    "events_count": len(events_data),
                    "holidays_count": len(holidays_data),
                    "forecast_points": len(forecast.points),
                    "recommendations_types": list(
                        all_recommendations["recommendations"].keys()
                    ),
                    "metrics": all_recommendations["metrics"],
                }
            except Exception as e:
                test_result["status"] = "failed"
                test_result["error"] = str(e)
                results["success"] = False
                results["errors"].append(
                    {"test": "Fluxo completo de previsão e otimização", "error": str(e)}
                )

            results["tests"].append(test_result)

            return results

        except Exception as e:
            logger.error(f"Error validating end-to-end flow: {str(e)}", exc_info=True)
            results["success"] = False
            results["errors"].append({"test": "Validação geral", "error": str(e)})
            return results

    async def run_all_validations(self, restaurant_id: str) -> Dict[str, Any]:
        """
        Executa todas as validações de integração.

        Args:
            restaurant_id: ID do restaurante para teste

        Returns:
            Dict[str, Any]: Resultados de todas as validações
        """
        logger.info(f"Running all validations for restaurant {restaurant_id}")

        results: Dict[str, Any] = {
            "timestamp": datetime.now().isoformat(),
            "restaurant_id": restaurant_id,
            "validations": {},
        }

        # Validar integração de previsão
        forecast_results = await self.validate_forecast_integration(restaurant_id)
        results["validations"]["forecast_integration"] = forecast_results

        # Validar integração de dados externos
        external_data_results = await self.validate_external_data_integration(
            restaurant_id
        )
        results["validations"]["external_data_integration"] = external_data_results

        # Validar fluxo completo
        end_to_end_results = await self.validate_end_to_end_flow(restaurant_id)
        results["validations"]["end_to_end_flow"] = end_to_end_results

        # Calcular resultado geral
        results["overall_success"] = (
            forecast_results["success"]
            and external_data_results["success"]
            and end_to_end_results["success"]
        )

        return results
