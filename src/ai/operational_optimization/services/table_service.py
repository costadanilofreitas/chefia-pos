"""
Serviço para otimização de distribuição de mesas.

Este serviço implementa funcionalidades para:
1. Recomendar distribuição de mesas com base em previsões de demanda
2. Otimizar ocupação e rotatividade de mesas
3. Melhorar experiência do cliente e eficiência operacional
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from fastapi import HTTPException

from ..models import TableDistributionRecommendation
from ...demand_forecast.models import ForecastResult
from ...demand_forecast.service import DemandForecastService

# Configurar logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class TableOptimizationService:
    """Serviço para otimização de distribuição de mesas."""

    def __init__(self):
        """
        Inicializa o serviço de otimização de mesas.
        """
        self.forecast_service = DemandForecastService()

        # Parâmetros padrão para otimização de mesas
        self.default_parameters = {
            # Tempo médio de ocupação de mesa (em minutos)
            "avg_table_time": 90,
            # Capacidade de diferentes tipos de mesa
            "table_capacities": {"small": 2, "medium": 4, "large": 6, "xl": 8},
            # Distribuição padrão de tamanhos de grupo
            "default_group_distribution": {
                "1-2": 0.4,  # 40% dos grupos têm 1-2 pessoas
                "3-4": 0.35,  # 35% dos grupos têm 3-4 pessoas
                "5-6": 0.15,  # 15% dos grupos têm 5-6 pessoas
                "7+": 0.1,  # 10% dos grupos têm 7+ pessoas
            },
            # Janelas de tempo para análise (em horas)
            "time_windows": [
                "11:00-13:00",
                "13:00-15:00",
                "18:00-20:00",
                "20:00-22:00",
            ],
        }

    async def optimize_table_distribution(
        self,
        restaurant_id: str,
        date: datetime,
        time_windows: Optional[List[str]] = None,
    ) -> List[TableDistributionRecommendation]:
        """
        Otimiza distribuição de mesas para um dia específico.

        Args:
            restaurant_id: ID do restaurante
            date: Data para otimização
            time_windows: Janelas de tempo para análise (opcional)

        Returns:
            List[TableDistributionRecommendation]: Lista de recomendações de distribuição de mesas
        """
        logger.info(
            f"Optimizing table distribution for restaurant {restaurant_id} on {date.date()}"
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

            # Obter layout atual de mesas (em produção, consultar banco de dados)
            current_layout = await self._get_current_table_layout(restaurant_id)

            # Gerar recomendações para cada janela de tempo
            recommendations = []

            for time_window in time_windows:
                # Calcular demanda esperada para esta janela de tempo
                expected_demand = await self._calculate_expected_demand(
                    forecast=forecast, date=date, time_window=time_window
                )

                # Calcular distribuição recomendada de mesas
                table_recommendations = await self._calculate_recommended_tables(
                    expected_demand=expected_demand, current_layout=current_layout
                )

                # Gerar ID único para a recomendação
                recommendation_id = f"table-rec-{restaurant_id}-{uuid.uuid4().hex[:8]}"

                # Gerar explicação para a recomendação
                reason = await self._generate_recommendation_reason(
                    expected_demand=expected_demand,
                    table_recommendations=table_recommendations,
                    current_layout=current_layout,
                    time_window=time_window,
                )

                # Criar objeto de recomendação
                recommendation = TableDistributionRecommendation(
                    recommendation_id=recommendation_id,
                    restaurant_id=restaurant_id,
                    created_at=datetime.now(),
                    date=date,
                    time_window=time_window,
                    table_recommendations=table_recommendations,
                    expected_customer_volume=int(expected_demand),
                    confidence=0.85,  # Confiança padrão
                    reason=reason,
                    forecast_id=forecast.request_id,
                )

                recommendations.append(recommendation)

            return recommendations

        except Exception as e:
            logger.error(
                f"Error optimizing table distribution: {str(e)}", exc_info=True
            )
            raise HTTPException(
                status_code=500, detail=f"Error optimizing table distribution: {str(e)}"
            )

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
                # Valor base (clientes por hora)
                base_value = 40

                # Ajustar para hora do dia (pico no almoço e jantar)
                if 11 <= hour <= 14:  # Almoço
                    time_factor = 2.0
                elif 18 <= hour <= 21:  # Jantar
                    time_factor = 2.2
                else:
                    time_factor = 0.4

                # Ajustar para dia da semana (mais movimento no fim de semana)
                weekday = current_date.weekday()
                if weekday >= 5:  # Fim de semana
                    day_factor = 1.8
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
            metrics={"MAPE": 16.8, "RMSE": 9.3},
            data_sources_used=["sales_history", "weather", "events", "holidays"],
        )

        return forecast

    async def _get_current_table_layout(
        self, restaurant_id: str
    ) -> List[Dict[str, Any]]:
        """
        Obtém layout atual de mesas do restaurante.

        Args:
            restaurant_id: ID do restaurante

        Returns:
            List[Dict[str, Any]]: Lista de mesas com suas configurações
        """
        # Em produção, consultar banco de dados
        # Por enquanto, retornar layout simulado

        return [
            {
                "id": "table-1",
                "type": "small",
                "capacity": 2,
                "position": {"x": 1, "y": 1},
                "area": "main",
            },
            {
                "id": "table-2",
                "type": "small",
                "capacity": 2,
                "position": {"x": 1, "y": 2},
                "area": "main",
            },
            {
                "id": "table-3",
                "type": "small",
                "capacity": 2,
                "position": {"x": 1, "y": 3},
                "area": "main",
            },
            {
                "id": "table-4",
                "type": "small",
                "capacity": 2,
                "position": {"x": 1, "y": 4},
                "area": "main",
            },
            {
                "id": "table-5",
                "type": "medium",
                "capacity": 4,
                "position": {"x": 2, "y": 1},
                "area": "main",
            },
            {
                "id": "table-6",
                "type": "medium",
                "capacity": 4,
                "position": {"x": 2, "y": 2},
                "area": "main",
            },
            {
                "id": "table-7",
                "type": "medium",
                "capacity": 4,
                "position": {"x": 2, "y": 3},
                "area": "main",
            },
            {
                "id": "table-8",
                "type": "medium",
                "capacity": 4,
                "position": {"x": 2, "y": 4},
                "area": "main",
            },
            {
                "id": "table-9",
                "type": "large",
                "capacity": 6,
                "position": {"x": 3, "y": 1},
                "area": "main",
            },
            {
                "id": "table-10",
                "type": "large",
                "capacity": 6,
                "position": {"x": 3, "y": 2},
                "area": "main",
            },
            {
                "id": "table-11",
                "type": "xl",
                "capacity": 8,
                "position": {"x": 3, "y": 3},
                "area": "main",
            },
            {
                "id": "table-12",
                "type": "xl",
                "capacity": 8,
                "position": {"x": 3, "y": 4},
                "area": "main",
            },
        ]

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
            float: Demanda esperada (número de clientes)
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

        # Calcular média dos valores de previsão
        avg_demand = sum(p.value for p in relevant_points) / len(relevant_points)

        # Multiplicar pela duração da janela para obter o total de clientes
        total_demand = avg_demand * (end_hour - start_hour)

        return total_demand

    async def _calculate_recommended_tables(
        self, expected_demand: float, current_layout: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Calcula distribuição recomendada de mesas com base na demanda esperada.

        Args:
            expected_demand: Demanda esperada (número de clientes)
            current_layout: Layout atual de mesas

        Returns:
            List[Dict[str, Any]]: Recomendações de configuração de mesas
        """
        # Calcular número total de clientes esperados
        total_customers = int(expected_demand)

        # Calcular número de grupos com base na distribuição padrão
        groups = {
            "1-2": int(
                total_customers
                * self.default_parameters["default_group_distribution"]["1-2"]
                / 1.5
            ),
            "3-4": int(
                total_customers
                * self.default_parameters["default_group_distribution"]["3-4"]
                / 3.5
            ),
            "5-6": int(
                total_customers
                * self.default_parameters["default_group_distribution"]["5-6"]
                / 5.5
            ),
            "7+": int(
                total_customers
                * self.default_parameters["default_group_distribution"]["7+"]
                / 8
            ),
        }

        # Calcular número ideal de mesas de cada tipo
        ideal_tables = {
            "small": groups["1-2"],
            "medium": groups["3-4"],
            "large": groups["5-6"],
            "xl": groups["7+"],
        }

        # Contar mesas atuais por tipo
        current_tables = {
            "small": sum(1 for t in current_layout if t["type"] == "small"),
            "medium": sum(1 for t in current_layout if t["type"] == "medium"),
            "large": sum(1 for t in current_layout if t["type"] == "large"),
            "xl": sum(1 for t in current_layout if t["type"] == "xl"),
        }

        # Calcular diferenças
        differences = {
            table_type: ideal - current
            for table_type, ideal in ideal_tables.items()
            for current in [current_tables[table_type]]
        }

        # Gerar recomendações
        recommendations = []

        # Recomendações para adicionar/remover mesas
        for table_type, diff in differences.items():
            if diff > 0:
                recommendations.append(
                    {
                        "action": "add",
                        "table_type": table_type,
                        "count": diff,
                        "reason": f"Adicionar {diff} mesas do tipo {table_type} para acomodar grupos de {self.default_parameters['table_capacities'][table_type]} pessoas",
                    }
                )
            elif diff < 0:
                recommendations.append(
                    {
                        "action": "remove",
                        "table_type": table_type,
                        "count": abs(diff),
                        "reason": f"Remover {abs(diff)} mesas do tipo {table_type} para otimizar o espaço",
                    }
                )

        # Recomendações para combinar mesas
        if groups["5-6"] > current_tables["large"] and current_tables["small"] >= 2:
            combine_count = min(
                groups["5-6"] - current_tables["large"], current_tables["small"] // 2
            )
            if combine_count > 0:
                recommendations.append(
                    {
                        "action": "combine",
                        "source_type": "small",
                        "source_count": combine_count * 2,
                        "target_type": "large",
                        "target_count": combine_count,
                        "reason": f"Combinar {combine_count * 2} mesas pequenas para criar {combine_count} mesas grandes",
                    }
                )

        # Recomendações para dividir mesas
        if groups["1-2"] > current_tables["small"] and current_tables["large"] > 0:
            split_count = min(
                (groups["1-2"] - current_tables["small"] + 1) // 2,
                current_tables["large"],
            )
            if split_count > 0:
                recommendations.append(
                    {
                        "action": "split",
                        "source_type": "large",
                        "source_count": split_count,
                        "target_type": "small",
                        "target_count": split_count * 2,
                        "reason": f"Dividir {split_count} mesas grandes para criar {split_count * 2} mesas pequenas",
                    }
                )

        # Recomendações para reservas
        if total_customers > sum(t["capacity"] for t in current_layout):
            recommendations.append(
                {
                    "action": "reservations",
                    "policy": "strict",
                    "reason": "Implementar política estrita de reservas devido à alta demanda esperada",
                }
            )

        # Recomendações para rotatividade
        avg_table_time = self.default_parameters["avg_table_time"]
        if total_customers > sum(t["capacity"] for t in current_layout) * (
            240 / avg_table_time
        ):
            new_table_time = max(60, avg_table_time - 15)
            recommendations.append(
                {
                    "action": "rotation",
                    "current_time": avg_table_time,
                    "target_time": new_table_time,
                    "reason": f"Reduzir tempo médio de ocupação de mesa de {avg_table_time} para {new_table_time} minutos para aumentar rotatividade",
                }
            )

        return recommendations

    async def _generate_recommendation_reason(
        self,
        expected_demand: float,
        table_recommendations: List[Dict[str, Any]],
        current_layout: List[Dict[str, Any]],
        time_window: str,
    ) -> str:
        """
        Gera explicação para a recomendação de distribuição de mesas.

        Args:
            expected_demand: Demanda esperada (número de clientes)
            table_recommendations: Recomendações de configuração de mesas
            current_layout: Layout atual de mesas
            time_window: Janela de tempo

        Returns:
            str: Explicação para a recomendação
        """
        # Calcular capacidade atual
        current_capacity = sum(t["capacity"] for t in current_layout)

        # Calcular número de recomendações por tipo
        add_recs = [r for r in table_recommendations if r["action"] == "add"]
        remove_recs = [r for r in table_recommendations if r["action"] == "remove"]
        combine_recs = [r for r in table_recommendations if r["action"] == "combine"]
        split_recs = [r for r in table_recommendations if r["action"] == "split"]
        policy_recs = [
            r
            for r in table_recommendations
            if r["action"] in ["reservations", "rotation"]
        ]

        # Gerar explicação
        explanation = f"Para a janela de tempo {time_window}, esperamos aproximadamente {int(expected_demand)} clientes. "

        if expected_demand > current_capacity:
            explanation += f"A capacidade atual de {current_capacity} lugares não será suficiente. "
        else:
            explanation += f"A capacidade atual de {current_capacity} lugares é adequada, mas pode ser otimizada. "

        if add_recs:
            explanation += (
                "Recomendamos adicionar "
                + ", ".join(
                    [f"{r['count']} mesas do tipo {r['table_type']}" for r in add_recs]
                )
                + ". "
            )

        if remove_recs:
            explanation += (
                "Recomendamos remover "
                + ", ".join(
                    [
                        f"{r['count']} mesas do tipo {r['table_type']}"
                        for r in remove_recs
                    ]
                )
                + ". "
            )

        if combine_recs:
            explanation += "Recomendamos combinar mesas para acomodar grupos maiores. "

        if split_recs:
            explanation += (
                "Recomendamos dividir mesas para acomodar mais grupos pequenos. "
            )

        if policy_recs:
            for rec in policy_recs:
                if rec["action"] == "reservations":
                    explanation += f"Devido à alta demanda, recomendamos uma política {rec['policy']} de reservas. "
                elif rec["action"] == "rotation":
                    explanation += f"Recomendamos reduzir o tempo médio de ocupação de mesa de {rec['current_time']} para {rec['target_time']} minutos para aumentar a rotatividade. "

        return explanation
