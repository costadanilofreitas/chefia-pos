"""
Serviço para otimização de operações de delivery.

Este serviço implementa funcionalidades para:
1. Otimizar rotas e alocação de entregadores com base em previsões de demanda
2. Recomendar tempos de preparação para minimizar espera
3. Integrar com Google Maps para otimização de rotas
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import HTTPException

from ...demand_forecast.models import ForecastResult
from ...demand_forecast.service import DemandForecastService
from ..models import DeliveryOptimization

# Configurar logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class DeliveryOptimizationService:
    """Serviço para otimização de operações de delivery."""

    def __init__(self):
        """
        Inicializa o serviço de otimização de delivery.
        """
        self.forecast_service = DemandForecastService()

        # Parâmetros padrão para otimização de delivery
        self.default_parameters = {
            # Número médio de entregas que um entregador pode fazer por hora
            "driver_capacity": 3,
            # Tempo médio de preparação por pedido (em minutos)
            "avg_preparation_time": 15,
            # Tempo médio de entrega por pedido (em minutos)
            "avg_delivery_time": 20,
            # Fator de segurança para lidar com picos inesperados (1.2 = 20% extra)
            "safety_factor": 1.2,
            # Janelas de tempo para análise (em horas)
            "time_windows": [
                "11:00-13:00",
                "13:00-15:00",
                "18:00-20:00",
                "20:00-22:00",
            ],
        }

    async def optimize_delivery_operations(
        self,
        restaurant_id: str,
        date: datetime,
        time_windows: Optional[List[str]] = None,
    ) -> List[DeliveryOptimization]:
        """
        Otimiza operações de delivery para um dia específico.

        Args:
            restaurant_id: ID do restaurante
            date: Data para otimização
            time_windows: Janelas de tempo para análise (opcional)

        Returns:
            List[DeliveryOptimization]: Lista de otimizações de delivery
        """
        logger.info(
            f"Optimizing delivery operations for restaurant {restaurant_id} on {date.date()}"
        )

        # Se time_windows não for fornecido, usar janelas padrão
        if not time_windows:
            time_windows = self.default_parameters["time_windows"]

        try:
            # Obter previsão de demanda para o dia
            start_date = datetime.combine(date.date(), datetime.min.time())
            end_date = datetime.combine(date.date(), datetime.max.time())

            forecast = await self._get_demand_forecast(
                restaurant_id=restaurant_id, start_date=start_date, end_date=end_date
            )

            # Gerar otimizações para cada janela de tempo
            optimizations = []

            for time_window in time_windows:
                # Calcular demanda esperada para esta janela de tempo
                expected_demand = await self._calculate_expected_demand(
                    forecast=forecast, date=date, time_window=time_window
                )

                # Calcular número recomendado de entregadores
                recommended_drivers = await self._calculate_recommended_drivers(
                    expected_demand=expected_demand
                )

                # Calcular tempo recomendado de preparação
                recommended_preparation_time = (
                    await self._calculate_recommended_preparation_time(
                        expected_demand=expected_demand
                    )
                )

                # Gerar ID único para a otimização
                optimization_id = f"delivery-opt-{restaurant_id}-{uuid.uuid4().hex[:8]}"

                # Gerar explicação para a otimização
                reason = await self._generate_optimization_reason(
                    expected_demand=expected_demand,
                    recommended_drivers=recommended_drivers,
                    recommended_preparation_time=recommended_preparation_time,
                    time_window=time_window,
                )

                # Criar objeto de otimização
                optimization = DeliveryOptimization(
                    optimization_id=optimization_id,
                    restaurant_id=restaurant_id,
                    created_at=datetime.now(),
                    date=date,
                    time_window=time_window,
                    recommended_driver_count=recommended_drivers,
                    recommended_preparation_time=recommended_preparation_time,
                    expected_order_volume=int(expected_demand),
                    confidence=0.85,  # Confiança padrão
                    reason=reason,
                    forecast_id=forecast.request_id,
                )

                optimizations.append(optimization)

            return optimizations

        except Exception as e:
            logger.error(
                f"Error optimizing delivery operations: {str(e)}", exc_info=True
            )
            raise HTTPException(
                status_code=500,
                detail=f"Error optimizing delivery operations: {str(e)}",
            ) from e

    async def _get_demand_forecast(
        self, restaurant_id: str, start_date: datetime, end_date: datetime
    ) -> ForecastResult:
        """
        Obtém previsão de demanda para o período.

        Args:
            restaurant_id: ID do restaurante
            start_date: Data de início
            end_date: Data de fim

        Returns:
            ForecastResult: Resultado da previsão de demanda
        """
        # Em produção, consultar serviço de previsão
        # Por enquanto, retornar objeto simulado

        # Simular pontos de previsão
        points = []
        current_date = start_date
        while current_date <= end_date:
            # Simular diferentes valores para diferentes horas do dia
            for hour in range(10, 23):  # 10h às 22h
                # Valor base (pedidos de delivery por hora)
                base_value = 10

                # Ajustar para hora do dia (pico no almoço e jantar)
                if 11 <= hour <= 14:  # Almoço
                    time_factor = 2.0
                elif 18 <= hour <= 21:  # Jantar
                    time_factor = 2.5
                else:
                    time_factor = 0.5

                # Ajustar para dia da semana (mais movimento no fim de semana)
                weekday = current_date.weekday()
                if weekday >= 5:  # Fim de semana
                    day_factor = 1.5
                else:
                    day_factor = 1.0

                # Calcular valor final
                value = base_value * time_factor * day_factor

                # Adicionar alguma variação aleatória
                import random

                value = value * (0.9 + 0.2 * random.random())

                # Criar ponto de previsão
                from ...demand_forecast.models import ForecastPoint

                point = ForecastPoint(
                    timestamp=datetime.combine(
                        current_date.date(), datetime.min.time().replace(hour=hour)
                    ),
                    value=value,
                    lower_bound=value * 0.8,
                    upper_bound=value * 1.2,
                    dimension_values={"restaurant": restaurant_id},
                )

                points.append(point)

            # Avançar para o próximo dia
            current_date += timedelta(days=1)

        # Criar objeto de previsão
        forecast = ForecastResult(
            request_id=f"forecast-{restaurant_id}-{uuid.uuid4().hex[:8]}",
            restaurant_id=restaurant_id,
            created_at=datetime.now(),
            start_date=start_date,
            end_date=end_date,
            granularity="hourly",
            model_type="auto",
            dimensions=["restaurant"],
            points=points,
            metrics={"MAPE": 18.5, "RMSE": 7.2},
            data_sources_used=["sales_history", "weather", "events", "holidays"],
        )

        return forecast

    async def _calculate_expected_demand(
        self, forecast: ForecastResult, date: datetime, time_window: str
    ) -> float:
        """
        Calcula demanda esperada para um dia e janela de tempo específicos.

        Args:
            forecast: Previsão de demanda
            date: Data
            time_window: Janela de tempo (ex: "18:00-20:00")

        Returns:
            float: Demanda esperada (número de pedidos)
        """
        # Extrair horas de início e fim da janela de tempo
        start_time_str, end_time_str = time_window.split("-")
        start_hour = int(start_time_str.split(":")[0])
        end_hour = int(end_time_str.split(":")[0])

        # Filtrar pontos de previsão para o dia e janela de tempo específicos
        relevant_points = [
            p
            for p in forecast.points
            if p.timestamp.date() == date.date()
            and start_hour <= p.timestamp.hour < end_hour
        ]

        if not relevant_points:
            return 0.0

        # Calcular soma dos valores de previsão (total de pedidos na janela)
        total_demand = sum(p.value for p in relevant_points)

        return total_demand

    async def _calculate_recommended_drivers(self, expected_demand: float) -> int:
        """
        Calcula número recomendado de entregadores com base na demanda esperada.

        Args:
            expected_demand: Demanda esperada (número de pedidos)

        Returns:
            int: Número recomendado de entregadores
        """
        # Calcular número base de entregadores
        # Fórmula: (Pedidos totais) / (Capacidade por entregador)
        base_drivers = expected_demand / self.default_parameters["driver_capacity"]

        # Aplicar fator de segurança
        recommended_drivers = base_drivers * self.default_parameters["safety_factor"]

        # Arredondar para cima para garantir cobertura adequada
        import math

        recommended_drivers = math.ceil(recommended_drivers)

        # Garantir pelo menos 1 entregador
        recommended_drivers = max(1, recommended_drivers)

        return recommended_drivers

    async def _calculate_recommended_preparation_time(
        self, expected_demand: float
    ) -> int:
        """
        Calcula tempo recomendado de preparação com base na demanda esperada.

        Args:
            expected_demand: Demanda esperada (número de pedidos)

        Returns:
            int: Tempo recomendado de preparação (em minutos)
        """
        # Tempo base de preparação
        base_time = self.default_parameters["avg_preparation_time"]

        # Ajustar com base no volume de pedidos
        # Para volumes maiores, aumentar o tempo de preparação para evitar atrasos
        if expected_demand > 30:
            adjusted_time = base_time * 1.2
        elif expected_demand > 20:
            adjusted_time = base_time * 1.1
        elif expected_demand > 10:
            adjusted_time = base_time * 1.05
        else:
            adjusted_time = base_time

        # Arredondar para o minuto mais próximo
        import math

        recommended_time = math.ceil(adjusted_time)

        return recommended_time

    async def _generate_optimization_reason(
        self,
        expected_demand: float,
        recommended_drivers: int,
        recommended_preparation_time: int,
        time_window: str,
    ) -> str:
        """
        Gera explicação para a otimização de delivery.

        Args:
            expected_demand: Demanda esperada (número de pedidos)
            recommended_drivers: Número recomendado de entregadores
            recommended_preparation_time: Tempo recomendado de preparação
            time_window: Janela de tempo

        Returns:
            str: Explicação para a otimização
        """
        return (
            f"Para a janela de tempo {time_window}, esperamos aproximadamente {int(expected_demand)} pedidos de delivery. "
            f"Recomendamos {recommended_drivers} entregadores e um tempo de preparação de {recommended_preparation_time} minutos por pedido "
            f"para garantir entregas dentro do prazo e maximizar a satisfação do cliente."
        )
