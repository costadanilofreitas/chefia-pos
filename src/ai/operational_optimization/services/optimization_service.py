"""
Serviço principal para coordenação de otimização operacional.

Este serviço orquestra todos os serviços de otimização operacional:
1. Otimização de escala de funcionários
2. Otimização de delivery
3. Otimização de distribuição de mesas
4. Otimização de totem de autoatendimento
5. Campanhas de WhatsApp/Telegram
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import HTTPException

from ...demand_forecast.service import DemandForecastService
from ..models import OperationalOptimizationConfig
from .delivery_service import DeliveryOptimizationService
from .kiosk_service import KioskOptimizationService
from .staff_service import StaffOptimizationService
from .table_service import TableOptimizationService
from .whatsapp_service import WhatsAppCampaignService

# Configurar logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class OperationalOptimizationService:
    """Serviço principal para otimização operacional."""

    def __init__(self):
        """
        Inicializa o serviço de otimização operacional.
        """
        self.staff_service = StaffOptimizationService()
        self.delivery_service = DeliveryOptimizationService()
        self.table_service = TableOptimizationService()
        self.kiosk_service = KioskOptimizationService()
        self.whatsapp_service = WhatsAppCampaignService()
        self.forecast_service = DemandForecastService()

    async def generate_all_recommendations(
        self,
        restaurant_id: str,
        start_date: datetime,
        end_date: datetime,
        config: Optional[OperationalOptimizationConfig] = None,
    ) -> Dict[str, Any]:
        """
        Gera todas as recomendações de otimização operacional.

        Args:
            restaurant_id: ID do restaurante
            start_date: Data de início do período
            end_date: Data de fim do período
            config: Configuração opcional para otimização

        Returns:
            Dict[str, Any]: Dicionário com todas as recomendações
        """
        logger.info(
            f"Generating all optimization recommendations for restaurant {restaurant_id}"
        )

        # Validar parâmetros
        if start_date >= end_date:
            raise HTTPException(
                status_code=400, detail="Start date must be before end date"
            )

        # Se config não for fornecido, usar configuração padrão
        if not config:
            config = OperationalOptimizationConfig(restaurant_id=restaurant_id)

        try:
            # Inicializar resultados
            results: Dict[str, Any] = {
                "restaurant_id": restaurant_id,
                "generated_at": datetime.now(),
                "period": {"start_date": start_date, "end_date": end_date},
                "recommendations": {},
            }

            # Gerar recomendações de escala de funcionários
            if config.staffing_optimization_enabled:
                staff_recommendations = (
                    await self.staff_service.generate_staff_recommendations(
                        restaurant_id=restaurant_id,
                        start_date=start_date,
                        end_date=end_date,
                    )
                )
                results["recommendations"]["staffing"] = staff_recommendations

            # Gerar otimizações de delivery
            if config.delivery_optimization_enabled:
                delivery_optimizations = []
                current_date = start_date
                while current_date <= end_date:
                    daily_optimizations = (
                        await self.delivery_service.optimize_delivery_operations(
                            restaurant_id=restaurant_id, date=current_date
                        )
                    )
                    delivery_optimizations.extend(daily_optimizations)
                    current_date += timedelta(days=1)
                results["recommendations"]["delivery"] = delivery_optimizations

            # Gerar recomendações de distribuição de mesas
            if config.table_optimization_enabled:
                table_recommendations = []
                current_date = start_date
                while current_date <= end_date:
                    daily_recommendations = (
                        await self.table_service.optimize_table_distribution(
                            restaurant_id=restaurant_id, date=current_date
                        )
                    )
                    table_recommendations.extend(daily_recommendations)
                    current_date += timedelta(days=1)
                results["recommendations"]["tables"] = table_recommendations

            # Gerar otimizações de totem
            if config.kiosk_optimization_enabled:
                kiosk_optimizations = (
                    await self.kiosk_service.optimize_kiosk_experience(
                        restaurant_id=restaurant_id
                    )
                )
                results["recommendations"]["kiosk"] = kiosk_optimizations

            # Gerar recomendações de campanhas de WhatsApp
            if config.whatsapp_optimization_enabled:
                # Gerar campanhas para clientes inativos
                inactive_campaigns = (
                    await self.whatsapp_service.generate_campaign_recommendations(
                        restaurant_id=restaurant_id, campaign_type="inactive_customers"
                    )
                )

                # Gerar campanhas de pós-compra
                post_purchase_campaigns = (
                    await self.whatsapp_service.generate_campaign_recommendations(
                        restaurant_id=restaurant_id, campaign_type="post_purchase"
                    )
                )

                results["recommendations"]["whatsapp"] = {
                    "inactive_customers": inactive_campaigns,
                    "post_purchase": post_purchase_campaigns,
                }

            # Adicionar métricas e estatísticas
            results["metrics"] = await self._calculate_optimization_metrics(
                results["recommendations"]
            )

            return results

        except Exception as e:
            logger.error(
                f"Error generating optimization recommendations: {str(e)}",
                exc_info=True,
            )
            raise HTTPException(
                status_code=500,
                detail=f"Error generating optimization recommendations: {str(e)}",
            ) from e

    async def _calculate_optimization_metrics(
        self, recommendations: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calcula métricas e estatísticas para as recomendações.

        Args:
            recommendations: Dicionário com recomendações

        Returns:
            Dict[str, Any]: Métricas e estatísticas
        """
        metrics: Dict[str, Any] = {
            "total_recommendations": 0,
            "potential_savings": 0.0,
            "potential_revenue_increase": 0.0,
            "potential_efficiency_increase": 0.0,
        }

        # Calcular métricas para escala de funcionários
        if "staffing" in recommendations:
            staff_recs = recommendations["staffing"]
            metrics["total_recommendations"] += len(staff_recs)

            # Estimar economia potencial
            staff_savings = 0.0
            for rec in staff_recs:
                if (
                    rec.current_staff_count
                    and rec.recommended_staff_count < rec.current_staff_count
                ):
                    # Estimar economia por funcionário reduzido (valor fictício)
                    staff_savings += (
                        rec.current_staff_count - rec.recommended_staff_count
                    ) * 150.0

            metrics["potential_savings"] += staff_savings
            metrics["staffing_metrics"] = {
                "recommendations_count": len(staff_recs),
                "potential_savings": staff_savings,
            }

        # Calcular métricas para delivery
        if "delivery" in recommendations:
            delivery_opts = recommendations["delivery"]
            metrics["total_recommendations"] += len(delivery_opts)

            # Estimar aumento de eficiência
            efficiency_increase = 0.0
            for opt in delivery_opts:
                # Estimar aumento de eficiência (valor fictício)
                efficiency_increase += 0.05 * opt.expected_order_volume

            metrics["potential_efficiency_increase"] += efficiency_increase
            metrics["delivery_metrics"] = {
                "recommendations_count": len(delivery_opts),
                "potential_efficiency_increase": efficiency_increase,
            }

        # Calcular métricas para mesas
        if "tables" in recommendations:
            table_recs = recommendations["tables"]
            metrics["total_recommendations"] += len(table_recs)

            # Estimar aumento de receita
            revenue_increase = 0.0
            for rec in table_recs:
                # Estimar aumento de receita (valor fictício)
                revenue_increase += (
                    0.1 * rec.expected_customer_volume * 30.0
                )  # 10% mais clientes * ticket médio

            metrics["potential_revenue_increase"] += revenue_increase
            metrics["tables_metrics"] = {
                "recommendations_count": len(table_recs),
                "potential_revenue_increase": revenue_increase,
            }

        # Calcular métricas para totem
        if "kiosk" in recommendations:
            kiosk_opts = recommendations["kiosk"]
            metrics["total_recommendations"] += len(kiosk_opts)

            # Estimar aumento de receita
            revenue_increase = 0.0
            for opt in kiosk_opts:
                # Estimar aumento de receita (valor fictício)
                revenue_increase += (
                    opt.expected_conversion_lift * 0.01 * 1000.0
                )  # % de aumento * base diária

            metrics["potential_revenue_increase"] += revenue_increase
            metrics["kiosk_metrics"] = {
                "recommendations_count": len(kiosk_opts),
                "potential_revenue_increase": revenue_increase,
            }

        # Calcular métricas para WhatsApp
        if "whatsapp" in recommendations:
            whatsapp_campaigns = []
            if "inactive_customers" in recommendations["whatsapp"]:
                whatsapp_campaigns.extend(
                    recommendations["whatsapp"]["inactive_customers"]
                )
            if "post_purchase" in recommendations["whatsapp"]:
                whatsapp_campaigns.extend(recommendations["whatsapp"]["post_purchase"])

            metrics["total_recommendations"] += len(whatsapp_campaigns)

            # Estimar aumento de receita
            revenue_increase = 0.0
            for campaign in whatsapp_campaigns:
                # Estimar aumento de receita (valor fictício)
                if "inactive_customers" in campaign.name.lower():
                    # Recuperação de clientes inativos
                    customer_count = campaign.target_segment.get("customer_count", 100)
                    avg_order_value = campaign.target_segment.get(
                        "avg_previous_order_value", 50.0
                    )
                    expected_response_rate = campaign.expected_response_rate
                    revenue_increase += (
                        customer_count * avg_order_value * expected_response_rate
                    )
                else:
                    # Campanhas de pós-compra
                    customer_count = campaign.target_segment.get("customer_count", 100)
                    avg_order_value = campaign.target_segment.get(
                        "avg_order_value", 50.0
                    )
                    expected_response_rate = campaign.expected_response_rate
                    revenue_increase += (
                        customer_count * avg_order_value * expected_response_rate * 0.5
                    )  # 50% de retorno

            metrics["potential_revenue_increase"] += revenue_increase
            metrics["whatsapp_metrics"] = {
                "recommendations_count": len(whatsapp_campaigns),
                "potential_revenue_increase": revenue_increase,
            }

        # Arredondar valores
        metrics["potential_savings"] = round(metrics["potential_savings"], 2)
        metrics["potential_revenue_increase"] = round(
            metrics["potential_revenue_increase"], 2
        )
        metrics["potential_efficiency_increase"] = round(
            metrics["potential_efficiency_increase"], 2
        )

        return metrics
