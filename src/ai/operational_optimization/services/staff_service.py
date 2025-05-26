"""
Serviço para otimização de escala de funcionários.

Este serviço implementa:
1. Previsão de demanda de funcionários com base em previsão de clientes
2. Otimização de escala por função e período
3. Recomendações para redução de custos operacionais
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any, Union
from fastapi import HTTPException

# Importar corretamente os módulos
import sys
sys.path.append('/home/ubuntu/pos-modern')

from src.ai.operational_optimization.models import StaffingRecommendation
from src.ai.operational_optimization.integration.forecast_integration import ForecastIntegrationService

# Configurar logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class StaffOptimizationService:
    """Serviço para otimização de escala de funcionários."""
    
    def __init__(self):
        """
        Inicializa o serviço de otimização de escala.
        """
        self.forecast_integration = ForecastIntegrationService()
        
        # Parâmetros padrão para otimização
        self.default_parameters = {
            # Número de clientes que um funcionário pode atender por hora, por função
            "customers_per_staff": {
                "waiter": 15,       # Um garçom pode atender 15 clientes por hora
                "kitchen": 25,      # Um cozinheiro pode preparar pedidos para 25 clientes por hora
                "cashier": 30,      # Um caixa pode atender 30 clientes por hora
                "host": 40,         # Um recepcionista pode receber 40 clientes por hora
                "delivery": 8       # Um entregador pode fazer entregas para 8 clientes por hora
            },
            
            # Ajuste de capacidade por período do dia
            "time_period_adjustment": {
                "morning": 0.8,     # Manhã: 80% da capacidade padrão
                "lunch": 1.2,       # Almoço: 120% da capacidade padrão (mais eficiente em horário de pico)
                "afternoon": 0.9,   # Tarde: 90% da capacidade padrão
                "dinner": 1.1,      # Jantar: 110% da capacidade padrão
                "night": 0.7        # Noite: 70% da capacidade padrão (menor eficiência)
            }
        }
    
    async def generate_staff_recommendations(
        self,
        restaurant_id: str,
        start_date: datetime,
        end_date: datetime,
        roles: Optional[List[str]] = None
    ) -> List[StaffingRecommendation]:
        """
        Gera recomendações de escala de funcionários.
        
        Args:
            restaurant_id: ID do restaurante
            start_date: Data de início
            end_date: Data de fim
            roles: Lista de funções (opcional)
            
        Returns:
            List[StaffingRecommendation]: Lista de recomendações de escala
        """
        logger.info(f"Generating staff recommendations for restaurant {restaurant_id}")
        
        try:
            # Se não foram especificadas funções, usar todas
            if not roles:
                roles = list(self.default_parameters["customers_per_staff"].keys())
            
            # Obter previsão de demanda
            forecast = await self.forecast_integration.get_demand_forecast(
                restaurant_id=restaurant_id,
                start_date=start_date,
                end_date=end_date
            )
            
            # Gerar recomendações para cada função e período
            recommendations = []
            
            # Definir períodos do dia
            time_periods = {
                "morning": (8, 11),     # 8h às 11h
                "lunch": (11, 14),      # 11h às 14h
                "afternoon": (14, 17),  # 14h às 17h
                "dinner": (17, 21),     # 17h às 21h
                "night": (21, 23)       # 21h às 23h
            }
            
            # Para cada dia no período
            current_date = start_date
            while current_date <= end_date:
                # Para cada função
                for role in roles:
                    # Para cada período do dia
                    for period_name, (start_hour, end_hour) in time_periods.items():
                        # Filtrar pontos de previsão para o período
                        period_points = [
                            point for point in forecast.points
                            if point.timestamp.date() == current_date.date() and
                            start_hour <= point.timestamp.hour < end_hour
                        ]
                        
                        # Se não há pontos para o período, pular
                        if not period_points:
                            continue
                        
                        # Calcular volume médio de clientes para o período
                        avg_customer_volume = sum(point.value for point in period_points) / len(period_points)
                        
                        # Calcular número recomendado de funcionários
                        customers_per_staff = self.default_parameters["customers_per_staff"][role]
                        time_adjustment = self.default_parameters["time_period_adjustment"][period_name]
                        
                        # Ajustar capacidade com base no período
                        adjusted_capacity = customers_per_staff * time_adjustment
                        
                        # Calcular número recomendado (arredondar para cima)
                        import math
                        recommended_staff = math.ceil(avg_customer_volume / adjusted_capacity)
                        
                        # Criar recomendação - usando datetime em vez de date
                        recommendation = StaffingRecommendation(
                            recommendation_id=f"staff-rec-{restaurant_id}-{uuid.uuid4().hex[:8]}",
                            restaurant_id=restaurant_id,
                            created_at=datetime.now(),
                            date=datetime.combine(current_date.date(), datetime.min.time()),  # Convertendo date para datetime
                            time_window=f"{start_hour}h-{end_hour}h ({period_name})",
                            role=role,
                            recommended_staff_count=recommended_staff,
                            current_staff_count=None,  # Em produção, obter do banco de dados
                            expected_customer_volume=int(avg_customer_volume),
                            confidence=0.85,
                            reason=f"Previsão de {int(avg_customer_volume)} clientes no período, com capacidade ajustada de {adjusted_capacity} clientes por {role}",
                            forecast_id=forecast.request_id
                        )
                        
                        recommendations.append(recommendation)
                
                # Avançar para o próximo dia
                current_date += timedelta(days=1)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating staff recommendations: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500, 
                detail=f"Error generating staff recommendations: {str(e)}"
            )
    
    async def optimize_staff_schedule(
        self,
        restaurant_id: str,
        date: datetime,
        current_schedule: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Otimiza escala de funcionários existente.
        
        Args:
            restaurant_id: ID do restaurante
            date: Data da escala
            current_schedule: Escala atual
            
        Returns:
            Dict[str, Any]: Escala otimizada
        """
        logger.info(f"Optimizing staff schedule for restaurant {restaurant_id} on {date}")
        
        try:
            # Em produção, implementar algoritmo de otimização
            # Por enquanto, retornar escala simulada
            
            # Gerar recomendações para o dia
            recommendations = await self.generate_staff_recommendations(
                restaurant_id=restaurant_id,
                start_date=date,
                end_date=date
            )
            
            # Organizar recomendações por período e função
            optimized_schedule = {
                "restaurant_id": restaurant_id,
                "date": date.strftime("%Y-%m-%d"),
                "schedule": {}
            }
            
            for rec in recommendations:
                period = rec.time_window
                role = rec.role
                
                if period not in optimized_schedule["schedule"]:
                    optimized_schedule["schedule"][period] = {}
                
                optimized_schedule["schedule"][period][role] = {
                    "recommended_count": rec.recommended_staff_count,
                    "current_count": current_schedule.get("schedule", {}).get(period, {}).get(role, {}).get("count", 0),
                    "expected_customers": rec.expected_customer_volume
                }
            
            # Calcular métricas de otimização
            total_current = sum(
                schedule.get(role, {}).get("current_count", 0)
                for period, schedule in current_schedule.get("schedule", {}).items()
                for role in schedule
            )
            
            total_recommended = sum(
                schedule[role]["recommended_count"]
                for period, schedule in optimized_schedule["schedule"].items()
                for role in schedule
            )
            
            optimized_schedule["metrics"] = {
                "total_current_staff": total_current,
                "total_recommended_staff": total_recommended,
                "staff_difference": total_recommended - total_current,
                "optimization_percentage": round((1 - total_recommended / total_current) * 100, 2) if total_current > 0 else 0
            }
            
            return optimized_schedule
            
        except Exception as e:
            logger.error(f"Error optimizing staff schedule: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500, 
                detail=f"Error optimizing staff schedule: {str(e)}"
            )
