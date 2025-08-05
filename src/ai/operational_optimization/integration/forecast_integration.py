"""
Módulo de integração entre otimização operacional e previsão de demanda.

Este módulo implementa:
1. Adaptadores para consumir previsões de demanda
2. Integração com fontes de dados externas (clima, eventos)
3. Sincronização de dados entre módulos
"""

import logging
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from fastapi import HTTPException

# Importar corretamente os módulos
import sys

sys.path.append("/home/ubuntu/pos-modern")
from src.ai.demand_forecast.models import (
    ForecastResult,
    TimeGranularity,
    ForecastDimension,
    ModelType,
)
from src.ai.demand_forecast.service import DemandForecastService

# Configurar logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class ForecastIntegrationService:
    """Serviço para integração com previsão de demanda."""

    def __init__(self):
        """
        Inicializa o serviço de integração com previsão de demanda.
        """
        self.forecast_service = DemandForecastService()

        # Inicializar clientes AWS
        import boto3

        self.s3_client = boto3.client("s3")

        # Configurações para APIs externas
        self.weather_api_config = {
            "api_key": os.environ.get("WEATHER_API_KEY", ""),
            "api_url": "https://api.openweathermap.org/data/2.5/forecast",
        }

        self.events_api_config = {
            "api_key": os.environ.get("EVENTS_API_KEY", ""),
            "api_url": "https://api.eventbrite.com/v3/events/search/",
        }

    async def get_demand_forecast(
        self,
        restaurant_id: str,
        start_date: datetime,
        end_date: datetime,
        granularity: TimeGranularity = TimeGranularity.DAILY,
        dimensions: Optional[List[ForecastDimension]] = None,
        include_weather: bool = True,
        include_events: bool = True,
    ) -> ForecastResult:
        """
        Obtém previsão de demanda para o período especificado.

        Args:
            restaurant_id: ID do restaurante
            start_date: Data de início
            end_date: Data de fim
            granularity: Granularidade temporal
            dimensions: Dimensões para previsão
            include_weather: Incluir dados climáticos
            include_events: Incluir dados de eventos

        Returns:
            ForecastResult: Resultado da previsão de demanda
        """
        logger.info(f"Getting demand forecast for restaurant {restaurant_id}")

        try:
            # Se não foram especificadas dimensões, usar apenas restaurante
            if not dimensions:
                dimensions = [ForecastDimension.RESTAURANT]

            # Criar solicitação de previsão
            from src.ai.demand_forecast.models import ForecastRequest

            request = ForecastRequest(
                restaurant_id=restaurant_id,
                dimensions=dimensions,
                start_date=start_date,
                end_date=end_date,
                granularity=granularity,
                model_type=ModelType.AUTO,
                include_weather=include_weather,
                include_events=include_events,
                include_holidays=True,
                include_promotions=True,
            )

            # Obter previsão
            forecast = await self.forecast_service.create_forecast(request)

            return forecast

        except Exception as e:
            logger.error(f"Error getting demand forecast: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500, detail=f"Error getting demand forecast: {str(e)}"
            )

    async def get_weather_data(
        self,
        restaurant_id: str,
        location: Dict[str, float],
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """
        Obtém dados climáticos para o período especificado.

        Args:
            restaurant_id: ID do restaurante
            location: Localização (latitude, longitude)
            start_date: Data de início
            end_date: Data de fim

        Returns:
            List[Dict[str, Any]]: Lista de dados climáticos
        """
        logger.info(f"Getting weather data for restaurant {restaurant_id}")

        try:
            # Em produção, consultar API de clima
            # Por enquanto, retornar dados simulados

            weather_data = []
            current_date = start_date

            while current_date <= end_date:
                # Simular diferentes condições climáticas
                import random

                conditions = ["clear", "cloudy", "rainy", "stormy"]
                temperatures = {
                    "clear": random.uniform(25, 35),
                    "cloudy": random.uniform(20, 28),
                    "rainy": random.uniform(15, 25),
                    "stormy": random.uniform(12, 20),
                }

                # Selecionar condição para o dia
                condition = random.choice(conditions)

                # Criar dados para cada hora do dia
                for hour in range(8, 23):  # 8h às 22h
                    # Adicionar variação de temperatura ao longo do dia
                    hour_factor = 1.0
                    if hour < 10:
                        hour_factor = 0.8
                    elif hour > 18:
                        hour_factor = 0.9

                    temperature = temperatures[condition] * hour_factor

                    # Criar registro de clima
                    weather_record = {
                        "timestamp": datetime.combine(
                            current_date.date(), datetime.min.time().replace(hour=hour)
                        ),
                        "location": location,
                        "temperature": temperature,
                        "feels_like": temperature - random.uniform(0, 3),
                        "humidity": random.uniform(30, 90),
                        "precipitation": (
                            0
                            if condition in ["clear", "cloudy"]
                            else random.uniform(0.1, 15)
                        ),
                        "wind_speed": random.uniform(0, 30),
                        "weather_condition": condition,
                        "weather_code": {
                            "clear": 800,
                            "cloudy": 803,
                            "rainy": 500,
                            "stormy": 200,
                        }[condition],
                    }

                    weather_data.append(weather_record)

                # Avançar para o próximo dia
                current_date += timedelta(days=1)

            return weather_data

        except Exception as e:
            logger.error(f"Error getting weather data: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500, detail=f"Error getting weather data: {str(e)}"
            )

    async def get_events_data(
        self,
        restaurant_id: str,
        location: Dict[str, float],
        start_date: datetime,
        end_date: datetime,
        radius_km: float = 10.0,
    ) -> List[Dict[str, Any]]:
        """
        Obtém dados de eventos próximos para o período especificado.

        Args:
            restaurant_id: ID do restaurante
            location: Localização (latitude, longitude)
            start_date: Data de início
            end_date: Data de fim
            radius_km: Raio de busca em km

        Returns:
            List[Dict[str, Any]]: Lista de eventos
        """
        logger.info(f"Getting events data for restaurant {restaurant_id}")

        try:
            # Em produção, consultar API de eventos
            # Por enquanto, retornar dados simulados

            events_data = []

            # Simular diferentes tipos de eventos
            event_types = ["concert", "sports", "festival", "conference", "theater"]
            event_sizes = {
                "concert": (500, 10000),
                "sports": (1000, 50000),
                "festival": (1000, 20000),
                "conference": (100, 2000),
                "theater": (50, 500),
            }

            # Gerar eventos aleatórios para o período
            import random

            # Número de eventos a gerar
            num_events = random.randint(5, 15)

            for i in range(num_events):
                # Selecionar tipo de evento
                event_type = random.choice(event_types)

                # Selecionar data e hora do evento
                event_date = start_date + timedelta(
                    days=random.randint(0, (end_date - start_date).days)
                )
                event_hour = random.randint(12, 21)
                event_duration = random.randint(2, 5)

                event_start = datetime.combine(
                    event_date.date(), datetime.min.time().replace(hour=event_hour)
                )
                event_end = event_start + timedelta(hours=event_duration)

                # Gerar localização próxima ao restaurante
                lat_offset = random.uniform(-0.05, 0.05)
                lon_offset = random.uniform(-0.05, 0.05)
                event_location = {
                    "latitude": location["latitude"] + lat_offset,
                    "longitude": location["longitude"] + lon_offset,
                    "address": f"Rua Exemplo, {random.randint(100, 999)}, São Paulo",
                }

                # Calcular distância aproximada
                import math

                distance = (
                    math.sqrt(lat_offset**2 + lon_offset**2) * 111
                )  # Aproximação simples: 1 grau = 111 km

                # Gerar tamanho do evento
                min_size, max_size = event_sizes[event_type]
                attendance = random.randint(min_size, max_size)

                # Criar registro de evento
                event_record = {
                    "event_id": f"event-{i}",
                    "name": f"{event_type.capitalize()} {i}",
                    "start_time": event_start,
                    "end_time": event_end,
                    "location": event_location,
                    "expected_attendance": attendance,
                    "category": event_type,
                    "description": f"Um evento de {event_type} próximo ao restaurante",
                    "distance_from_restaurant": distance,
                }

                events_data.append(event_record)

            return events_data

        except Exception as e:
            logger.error(f"Error getting events data: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500, detail=f"Error getting events data: {str(e)}"
            )

    async def enrich_forecast_with_external_data(
        self, forecast: ForecastResult, restaurant_id: str, location: Dict[str, float]
    ) -> ForecastResult:
        """
        Enriquece previsão com dados externos adicionais.

        Args:
            forecast: Previsão de demanda
            restaurant_id: ID do restaurante
            location: Localização (latitude, longitude)

        Returns:
            ForecastResult: Previsão enriquecida
        """
        logger.info(
            f"Enriching forecast with external data for restaurant {restaurant_id}"
        )

        try:
            # Obter dados climáticos
            weather_data = await self.get_weather_data(
                restaurant_id=restaurant_id,
                location=location,
                start_date=forecast.start_date,
                end_date=forecast.end_date,
            )

            # Obter dados de eventos
            events_data = await self.get_events_data(
                restaurant_id=restaurant_id,
                location=location,
                start_date=forecast.start_date,
                end_date=forecast.end_date,
            )

            # Em produção, ajustar previsão com base nos dados externos
            # Por enquanto, apenas adicionar metadados

            # Adicionar metadados à previsão
            enriched_forecast = forecast
            enriched_forecast.metadata = {
                "weather_data_count": len(weather_data),
                "events_data_count": len(events_data),
                "enrichment_timestamp": datetime.now(),
            }

            return enriched_forecast

        except Exception as e:
            logger.error(f"Error enriching forecast: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500, detail=f"Error enriching forecast: {str(e)}"
            )
