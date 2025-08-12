"""
Módulo de integração com fontes de dados externas.

Este módulo implementa:
1. Integração com API de clima (OpenWeatherMap)
2. Integração com API de eventos (Eventbrite)
3. Integração com dados de feriados
"""

import os
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from fastapi import HTTPException

# Configurar logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class ExternalDataService:
    """Serviço para integração com fontes de dados externas."""

    def __init__(self):
        """
        Inicializa o serviço de integração com fontes externas.
        """
        # Configurações para API de clima
        self.weather_api_config = {
            "api_key": os.environ.get("WEATHER_API_KEY", ""),
            "api_url": "https://api.openweathermap.org/data/2.5/forecast",
        }

        # Configurações para API de eventos
        self.events_api_config = {
            "api_key": os.environ.get("EVENTS_API_KEY", ""),
            "api_url": "https://api.eventbrite.com/v3/events/search/",
        }

    async def get_weather_forecast(
        self, latitude: float, longitude: float, days: int = 7
    ) -> List[Dict[str, Any]]:
        """
        Obtém previsão do tempo para uma localização específica.

        Args:
            latitude: Latitude da localização
            longitude: Longitude da localização
            days: Número de dias para previsão

        Returns:
            List[Dict[str, Any]]: Lista de previsões climáticas
        """
        logger.info(f"Getting weather forecast for location ({latitude}, {longitude})")

        try:
            # Em produção, fazer requisição à API
            # url = f"{self.weather_api_config['api_url']}?lat={latitude}&lon={longitude}&appid={self.weather_api_config['api_key']}&units=metric"
            # response = requests.get(url)
            # response.raise_for_status()
            # data = response.json()

            # Por enquanto, retornar dados simulados
            weather_data = []

            # Data atual
            current_date = datetime.now()

            # Gerar previsão para cada dia
            for day in range(days):
                date = current_date + timedelta(days=day)

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
                for hour in range(24):
                    # Adicionar variação de temperatura ao longo do dia
                    hour_factor = 1.0
                    if hour < 6:
                        hour_factor = 0.7
                    elif 6 <= hour < 12:
                        hour_factor = 0.9
                    elif 12 <= hour < 18:
                        hour_factor = 1.1
                    else:
                        hour_factor = 0.8

                    temperature = temperatures[condition] * hour_factor

                    # Criar registro de clima
                    weather_record = {
                        "dt": int(
                            datetime.combine(
                                date.date(), datetime.min.time().replace(hour=hour)
                            ).timestamp()
                        ),
                        "main": {
                            "temp": temperature,
                            "feels_like": temperature - random.uniform(0, 3),
                            "temp_min": temperature - random.uniform(0, 2),
                            "temp_max": temperature + random.uniform(0, 2),
                            "pressure": random.uniform(1000, 1020),
                            "humidity": random.uniform(30, 90),
                        },
                        "weather": [
                            {
                                "id": {
                                    "clear": 800,
                                    "cloudy": 803,
                                    "rainy": 500,
                                    "stormy": 200,
                                }[condition],
                                "main": {
                                    "clear": "Clear",
                                    "cloudy": "Clouds",
                                    "rainy": "Rain",
                                    "stormy": "Thunderstorm",
                                }[condition],
                                "description": {
                                    "clear": "céu limpo",
                                    "cloudy": "nuvens dispersas",
                                    "rainy": "chuva leve",
                                    "stormy": "tempestade",
                                }[condition],
                                "icon": {
                                    "clear": "01d",
                                    "cloudy": "03d",
                                    "rainy": "10d",
                                    "stormy": "11d",
                                }[condition],
                            }
                        ],
                        "clouds": {
                            "all": {
                                "clear": random.uniform(0, 10),
                                "cloudy": random.uniform(30, 70),
                                "rainy": random.uniform(60, 90),
                                "stormy": random.uniform(80, 100),
                            }[condition]
                        },
                        "wind": {
                            "speed": random.uniform(0, 30),
                            "deg": random.uniform(0, 360),
                        },
                        "visibility": {
                            "clear": 10000,
                            "cloudy": 8000,
                            "rainy": 5000,
                            "stormy": 2000,
                        }[condition],
                        "pop": {"clear": 0, "cloudy": 0.1, "rainy": 0.7, "stormy": 0.9}[
                            condition
                        ],
                        "rain": {
                            "3h": (
                                0
                                if condition in ["clear", "cloudy"]
                                else random.uniform(0.1, 15)
                            )
                        },
                        "sys": {"pod": "d" if 6 <= hour < 18 else "n"},
                        "dt_txt": datetime.combine(
                            date.date(), datetime.min.time().replace(hour=hour)
                        ).strftime("%Y-%m-%d %H:%M:%S"),
                    }

                    weather_data.append(weather_record)

            return weather_data

        except Exception as e:
            logger.error(f"Error getting weather forecast: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500, detail=f"Error getting weather forecast: {str(e)}"
            )

    async def get_nearby_events(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 10.0,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Obtém eventos próximos a uma localização específica.

        Args:
            latitude: Latitude da localização
            longitude: Longitude da localização
            radius_km: Raio de busca em km
            start_date: Data de início (opcional)
            end_date: Data de fim (opcional)

        Returns:
            List[Dict[str, Any]]: Lista de eventos
        """
        logger.info(f"Getting nearby events for location ({latitude}, {longitude})")

        try:
            # Definir datas padrão se não fornecidas
            if not start_date:
                start_date = datetime.now()
            if not end_date:
                end_date = start_date + timedelta(days=30)

            # Em produção, fazer requisição à API
            # url = f"{self.events_api_config['api_url']}?location.latitude={latitude}&location.longitude={longitude}&location.within={radius_km}km&start_date.range_start={start_date.isoformat()}&start_date.range_end={end_date.isoformat()}"
            # headers = {"Authorization": f"Bearer {self.events_api_config['api_key']}"}
            # response = requests.get(url, headers=headers)
            # response.raise_for_status()
            # data = response.json()

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
            num_events = random.randint(10, 30)

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

                # Gerar localização próxima
                lat_offset = random.uniform(-0.05, 0.05)
                lon_offset = random.uniform(-0.05, 0.05)
                event_location = {
                    "latitude": latitude + lat_offset,
                    "longitude": longitude + lon_offset,
                    "address": {
                        "street": f"Rua Exemplo, {random.randint(100, 999)}",
                        "city": "São Paulo",
                        "region": "SP",
                        "postal_code": f"0{random.randint(1000, 9999)}-{random.randint(100, 999)}",
                        "country": "BR",
                    },
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
                    "id": f"event-{i}",
                    "name": {
                        "text": f"{['Grande', 'Super', 'Mega', 'Festival', 'Show de'][random.randint(0, 4)]} {event_type.capitalize()} {i}",
                        "html": f"{['Grande', 'Super', 'Mega', 'Festival', 'Show de'][random.randint(0, 4)]} {event_type.capitalize()} {i}",
                    },
                    "description": {
                        "text": f"Um evento de {event_type} próximo ao restaurante",
                        "html": f"<p>Um evento de {event_type} próximo ao restaurante</p>",
                    },
                    "url": f"https://example.com/events/{i}",
                    "start": {
                        "timezone": "America/Sao_Paulo",
                        "local": event_start.strftime("%Y-%m-%dT%H:%M:%S"),
                        "utc": (event_start - timedelta(hours=3)).strftime(
                            "%Y-%m-%dT%H:%M:%SZ"
                        ),
                    },
                    "end": {
                        "timezone": "America/Sao_Paulo",
                        "local": event_end.strftime("%Y-%m-%dT%H:%M:%S"),
                        "utc": (event_end - timedelta(hours=3)).strftime(
                            "%Y-%m-%dT%H:%M:%SZ"
                        ),
                    },
                    "organization_id": f"org-{random.randint(1000, 9999)}",
                    "created": (
                        datetime.now() - timedelta(days=random.randint(30, 90))
                    ).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "changed": (
                        datetime.now() - timedelta(days=random.randint(0, 30))
                    ).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "capacity": attendance,
                    "capacity_is_custom": False,
                    "status": "live",
                    "currency": "BRL",
                    "listed": True,
                    "shareable": True,
                    "online_event": False,
                    "tx_time_limit": 480,
                    "hide_start_date": False,
                    "hide_end_date": False,
                    "locale": "pt_BR",
                    "is_locked": False,
                    "privacy_setting": "unlocked",
                    "is_series": False,
                    "is_series_parent": False,
                    "is_reserved_seating": False,
                    "show_pick_a_seat": False,
                    "show_seatmap_thumbnail": False,
                    "show_colors_in_seatmap_thumbnail": False,
                    "source": "create_web",
                    "is_free": random.choice([True, False]),
                    "version": "3.0.0",
                    "logo_id": None,
                    "venue": {
                        "id": f"venue-{random.randint(1000, 9999)}",
                        "name": f"Local {i}",
                        "capacity": attendance,
                        "address": event_location["address"],
                        "latitude": event_location["latitude"],
                        "longitude": event_location["longitude"],
                    },
                    "category_id": f"category-{random.randint(1000, 9999)}",
                    "subcategory_id": None,
                    "format_id": None,
                    "category": {"name": event_type.capitalize()},
                    "distance": distance,
                }

                events_data.append(event_record)

            return events_data

        except Exception as e:
            logger.error(f"Error getting nearby events: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500, detail=f"Error getting nearby events: {str(e)}"
            )

    async def get_holidays(
        self,
        country: str = "BR",
        year: Optional[int] = None,
        region: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Obtém feriados para um país e ano específicos.

        Args:
            country: Código do país (ISO 3166-1 alpha-2)
            year: Ano (opcional, padrão é o ano atual)
            region: Código da região (opcional)

        Returns:
            List[Dict[str, Any]]: Lista de feriados
        """
        logger.info(
            f"Getting holidays for country {country}, year {year}, region {region}"
        )

        try:
            # Definir ano padrão se não fornecido
            if not year:
                year = datetime.now().year

            # Em produção, fazer requisição à API ou consultar banco de dados
            # url = f"https://date.nager.at/api/v3/publicholidays/{year}/{country}"
            # response = requests.get(url)
            # response.raise_for_status()
            # data = response.json()

            # Por enquanto, retornar dados simulados para o Brasil
            holidays_data = []

            # Feriados nacionais do Brasil
            national_holidays = [
                {
                    "date": f"{year}-01-01",
                    "name": "Confraternização Universal",
                    "is_national": True,
                },
                {"date": f"{year}-04-21", "name": "Tiradentes", "is_national": True},
                {
                    "date": f"{year}-05-01",
                    "name": "Dia do Trabalho",
                    "is_national": True,
                },
                {
                    "date": f"{year}-09-07",
                    "name": "Independência do Brasil",
                    "is_national": True,
                },
                {
                    "date": f"{year}-10-12",
                    "name": "Nossa Senhora Aparecida",
                    "is_national": True,
                },
                {"date": f"{year}-11-02", "name": "Finados", "is_national": True},
                {
                    "date": f"{year}-11-15",
                    "name": "Proclamação da República",
                    "is_national": True,
                },
                {"date": f"{year}-12-25", "name": "Natal", "is_national": True},
            ]

            # Adicionar feriados nacionais
            for holiday in national_holidays:
                holiday_record = {
                    "date": datetime.strptime(holiday["date"], "%Y-%m-%d"),
                    "name": holiday["name"],
                    "is_national": holiday["is_national"],
                    "is_regional": False,
                    "region": None,
                    "impact_level": 5,  # Alto impacto
                }
                holidays_data.append(holiday_record)

            # Adicionar feriados regionais se região for especificada
            if region == "SP":
                regional_holidays = [
                    {
                        "date": f"{year}-01-25",
                        "name": "Aniversário de São Paulo",
                        "region": "SP",
                    },
                    {
                        "date": f"{year}-07-09",
                        "name": "Revolução Constitucionalista",
                        "region": "SP",
                    },
                ]

                for holiday in regional_holidays:
                    holiday_record = {
                        "date": datetime.strptime(holiday["date"], "%Y-%m-%d"),
                        "name": holiday["name"],
                        "is_national": False,
                        "is_regional": True,
                        "region": holiday["region"],
                        "impact_level": 4,  # Impacto médio-alto
                    }
                    holidays_data.append(holiday_record)

            # Adicionar feriados móveis (Carnaval, Páscoa, etc.)
            # Em produção, calcular corretamente
            # Por enquanto, adicionar datas aproximadas
            mobile_holidays = [
                {
                    "date": f"{year}-02-20",
                    "name": "Carnaval",
                    "is_national": True,
                    "impact_level": 5,
                },
                {
                    "date": f"{year}-04-07",
                    "name": "Sexta-feira Santa",
                    "is_national": True,
                    "impact_level": 5,
                },
                {
                    "date": f"{year}-04-09",
                    "name": "Páscoa",
                    "is_national": True,
                    "impact_level": 5,
                },
                {
                    "date": f"{year}-06-08",
                    "name": "Corpus Christi",
                    "is_national": True,
                    "impact_level": 4,
                },
            ]

            for holiday in mobile_holidays:
                holiday_record = {
                    "date": datetime.strptime(holiday["date"], "%Y-%m-%d"),
                    "name": holiday["name"],
                    "is_national": holiday["is_national"],
                    "is_regional": False,
                    "region": None,
                    "impact_level": holiday["impact_level"],
                }
                holidays_data.append(holiday_record)

            # Retornar como dicionários simples, não como objetos Pydantic
            return holidays_data

        except Exception as e:
            logger.error(f"Error getting holidays: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500, detail=f"Error getting holidays: {str(e)}"
            )
