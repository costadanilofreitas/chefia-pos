"""
Serviço para otimização de totem de autoatendimento.

Este serviço implementa funcionalidades para:
1. Maximizar conversão e retenção no totem de autoatendimento
2. Personalizar a experiência com base no comportamento do cliente
3. Recomendar itens e promoções para aumentar o ticket médio
"""

import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from ...demand_forecast.service import DemandForecastService
from ..models import KioskOptimization

# Configurar logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class KioskOptimizationService:
    """Serviço para otimização de totem de autoatendimento."""

    def __init__(self):
        """
        Inicializa o serviço de otimização de totem.
        """
        self.forecast_service = DemandForecastService()

        # Parâmetros padrão para otimização de totem
        self.default_parameters = {
            # Número máximo de itens para destacar
            "max_highlighted_items": 6,
            # Número máximo de promoções para destacar
            "max_highlighted_promotions": 3,
            # Tempo máximo recomendado para completar um pedido (em segundos)
            "target_order_completion_time": 120,
            # Taxa de conversão base (percentual de usuários que completam o pedido)
            "base_conversion_rate": 0.75,
        }

    async def optimize_kiosk_experience(
        self, restaurant_id: str, kiosk_id: Optional[str] = None
    ) -> List[KioskOptimization]:
        """
        Otimiza experiência do totem para maximizar conversão.

        Args:
            restaurant_id: ID do restaurante
            kiosk_id: ID do totem (opcional, se None otimiza todos os totens)

        Returns:
            List[KioskOptimization]: Lista de otimizações de totem
        """
        logger.info(f"Optimizing kiosk experience for restaurant {restaurant_id}")

        try:
            # Obter dados de comportamento dos clientes (em produção, consultar banco de dados)
            customer_behavior = await self._get_customer_behavior(
                restaurant_id, kiosk_id
            )

            # Obter dados de vendas (em produção, consultar banco de dados)
            sales_data = await self._get_sales_data(restaurant_id)

            # Obter dados de abandono (em produção, consultar banco de dados)
            abandonment_data = await self._get_abandonment_data(restaurant_id, kiosk_id)

            # Gerar otimizações para cada totem
            optimizations = []

            # Se kiosk_id for fornecido, otimizar apenas esse totem
            # Caso contrário, otimizar todos os totens do restaurante
            kiosk_ids = (
                [kiosk_id] if kiosk_id else await self._get_all_kiosk_ids(restaurant_id)
            )

            for kid in kiosk_ids:
                # Identificar itens populares para destacar
                recommended_items = await self._identify_recommended_items(
                    restaurant_id=restaurant_id,
                    kiosk_id=kid,
                    sales_data=sales_data,
                    customer_behavior=customer_behavior,
                )

                # Identificar promoções para destacar
                recommended_promotions = await self._identify_recommended_promotions(
                    restaurant_id=restaurant_id,
                    kiosk_id=kid,
                    sales_data=sales_data,
                    customer_behavior=customer_behavior,
                    abandonment_data=abandonment_data,
                )

                # Calcular aumento esperado na conversão
                expected_conversion_lift = (
                    await self._calculate_expected_conversion_lift(
                        restaurant_id=restaurant_id,
                        kiosk_id=kid,
                        recommended_items=recommended_items,
                        recommended_promotions=recommended_promotions,
                        abandonment_data=abandonment_data,
                    )
                )

                # Gerar explicação para a otimização
                reason = await self._generate_optimization_reason(
                    restaurant_id=restaurant_id,
                    kiosk_id=kid,
                    recommended_items=recommended_items,
                    recommended_promotions=recommended_promotions,
                    expected_conversion_lift=expected_conversion_lift,
                    abandonment_data=abandonment_data,
                )

                # Gerar ID único para a otimização
                optimization_id = f"kiosk-opt-{restaurant_id}-{uuid.uuid4().hex[:8]}"

                # Criar objeto de otimização
                optimization = KioskOptimization(
                    optimization_id=optimization_id,
                    restaurant_id=restaurant_id,
                    created_at=datetime.now(),
                    kiosk_id=kid,
                    recommended_items=recommended_items,
                    recommended_promotions=recommended_promotions,
                    expected_conversion_lift=expected_conversion_lift,
                    confidence=0.85,  # Confiança padrão
                    reason=reason,
                )

                optimizations.append(optimization)

            return optimizations

        except Exception as e:
            logger.error(f"Error optimizing kiosk experience: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500, detail=f"Error optimizing kiosk experience: {str(e)}"
            ) from e

    async def _get_all_kiosk_ids(self, restaurant_id: str) -> List[str]:
        """
        Obtém IDs de todos os totens do restaurante.

        Args:
            restaurant_id: ID do restaurante

        Returns:
            List[str]: Lista de IDs de totens
        """
        # Em produção, consultar banco de dados
        # Por enquanto, retornar IDs simulados

        return [f"kiosk-{i}" for i in range(1, 4)]

    async def _get_customer_behavior(
        self, restaurant_id: str, kiosk_id: Optional[str]
    ) -> Dict[str, Any]:
        """
        Obtém dados de comportamento dos clientes no totem.

        Args:
            restaurant_id: ID do restaurante
            kiosk_id: ID do totem (opcional)

        Returns:
            Dict[str, Any]: Dados de comportamento dos clientes
        """
        # Em produção, consultar banco de dados
        # Por enquanto, retornar dados simulados

        return {
            "avg_time_spent": 95,  # segundos
            "avg_screens_viewed": 4.2,
            "avg_items_viewed": 8.5,
            "avg_items_added": 2.3,
            "most_viewed_categories": ["burgers", "combos", "desserts"],
            "most_abandoned_categories": ["drinks", "sides"],
            "peak_abandonment_screens": ["payment", "customization"],
            "conversion_rate": 0.72,  # 72% dos usuários completam o pedido
            "return_rate": 0.65,  # 65% dos usuários retornam em 30 dias
        }

    async def _get_sales_data(self, restaurant_id: str) -> Dict[str, Any]:
        """
        Obtém dados de vendas do restaurante.

        Args:
            restaurant_id: ID do restaurante

        Returns:
            Dict[str, Any]: Dados de vendas
        """
        # Em produção, consultar banco de dados
        # Por enquanto, retornar dados simulados

        return {
            "top_selling_items": [
                {
                    "id": "item-1",
                    "name": "X-Burger",
                    "category": "burgers",
                    "price": 18.90,
                    "sales_count": 1250,
                },
                {
                    "id": "item-2",
                    "name": "Combo X-Burger",
                    "category": "combos",
                    "price": 25.90,
                    "sales_count": 980,
                },
                {
                    "id": "item-3",
                    "name": "Batata Frita G",
                    "category": "sides",
                    "price": 12.90,
                    "sales_count": 870,
                },
                {
                    "id": "item-4",
                    "name": "Milk Shake Chocolate",
                    "category": "desserts",
                    "price": 15.90,
                    "sales_count": 750,
                },
                {
                    "id": "item-5",
                    "name": "X-Salada",
                    "category": "burgers",
                    "price": 20.90,
                    "sales_count": 720,
                },
                {
                    "id": "item-6",
                    "name": "Combo X-Salada",
                    "category": "combos",
                    "price": 27.90,
                    "sales_count": 680,
                },
                {
                    "id": "item-7",
                    "name": "Refrigerante 500ml",
                    "category": "drinks",
                    "price": 8.90,
                    "sales_count": 1500,
                },
                {
                    "id": "item-8",
                    "name": "Sundae",
                    "category": "desserts",
                    "price": 10.90,
                    "sales_count": 650,
                },
            ],
            "popular_combinations": [
                {"items": ["item-1", "item-3", "item-7"], "frequency": 0.35},
                {"items": ["item-5", "item-3", "item-7"], "frequency": 0.28},
                {"items": ["item-2", "item-8"], "frequency": 0.22},
            ],
            "avg_ticket": 32.50,
            "peak_hours": [12, 13, 19, 20],
        }

    async def _get_abandonment_data(
        self, restaurant_id: str, kiosk_id: Optional[str]
    ) -> Dict[str, Any]:
        """
        Obtém dados de abandono de pedidos no totem.

        Args:
            restaurant_id: ID do restaurante
            kiosk_id: ID do totem (opcional)

        Returns:
            Dict[str, Any]: Dados de abandono
        """
        # Em produção, consultar banco de dados
        # Por enquanto, retornar dados simulados

        return {
            "overall_abandonment_rate": 0.28,  # 28% dos usuários abandonam o pedido
            "abandonment_by_step": {
                "menu_browsing": 0.05,
                "item_selection": 0.08,
                "customization": 0.12,
                "cart_review": 0.10,
                "payment": 0.15,
            },
            "abandonment_by_time": {
                "0-30s": 0.10,
                "30-60s": 0.15,
                "60-120s": 0.25,
                "120s+": 0.50,
            },
            "common_abandonment_reasons": [
                {"reason": "processo_demorado", "frequency": 0.35},
                {"reason": "muitas_opcoes", "frequency": 0.25},
                {"reason": "preco_alto", "frequency": 0.20},
                {"reason": "problemas_pagamento", "frequency": 0.15},
                {"reason": "outros", "frequency": 0.05},
            ],
        }

    async def _identify_recommended_items(
        self,
        restaurant_id: str,
        kiosk_id: str,
        sales_data: Dict[str, Any],
        customer_behavior: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Identifica itens recomendados para destacar no totem.

        Args:
            restaurant_id: ID do restaurante
            kiosk_id: ID do totem
            sales_data: Dados de vendas
            customer_behavior: Dados de comportamento dos clientes

        Returns:
            List[Dict[str, Any]]: Lista de itens recomendados
        """
        # Obter itens mais vendidos
        top_items = sales_data["top_selling_items"][
            : self.default_parameters["max_highlighted_items"]
        ]

        # Adicionar informações de destaque e posicionamento
        recommended_items = []
        for i, item in enumerate(top_items):
            # Calcular pontuação de relevância
            relevance_score = 1.0
            if item["category"] in customer_behavior["most_viewed_categories"]:
                relevance_score *= 1.2

            # Calcular posição recomendada
            # Itens mais relevantes devem aparecer primeiro
            position = i + 1

            # Adicionar à lista de recomendações
            recommended_items.append(
                {
                    "item_id": item["id"],
                    "name": item["name"],
                    "category": item["category"],
                    "price": item["price"],
                    "highlight": True,
                    "position": position,
                    "relevance_score": relevance_score,
                    "reason": "Item popular com alta taxa de conversão",
                }
            )

        return recommended_items

    async def _identify_recommended_promotions(
        self,
        restaurant_id: str,
        kiosk_id: str,
        sales_data: Dict[str, Any],
        customer_behavior: Dict[str, Any],
        abandonment_data: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Identifica promoções recomendadas para destacar no totem.

        Args:
            restaurant_id: ID do restaurante
            kiosk_id: ID do totem
            sales_data: Dados de vendas
            customer_behavior: Dados de comportamento dos clientes
            abandonment_data: Dados de abandono

        Returns:
            List[Dict[str, Any]]: Lista de promoções recomendadas
        """
        # Em produção, consultar banco de dados de promoções
        # Por enquanto, gerar promoções simuladas com base nos dados

        recommended_promotions = []

        # Promoção 1: Combo com desconto para categorias mais abandonadas
        if "drinks" in customer_behavior["most_abandoned_categories"]:
            recommended_promotions.append(
                {
                    "promotion_id": f"promo-{uuid.uuid4().hex[:8]}",
                    "name": "Combo Bebida com Desconto",
                    "description": "Adicione uma bebida ao seu lanche com 20% de desconto",
                    "discount_type": "percentage",
                    "discount_value": 20,
                    "applies_to": ["drinks"],
                    "requires": ["burgers", "combos"],
                    "position": 1,
                    "highlight_color": "#FF5722",
                    "reason": "Aumenta conversão de bebidas, categoria com alta taxa de abandono",
                }
            )

        # Promoção 2: Desconto para aumentar ticket médio
        recommended_promotions.append(
            {
                "promotion_id": f"promo-{uuid.uuid4().hex[:8]}",
                "name": "Sobremesa com Desconto",
                "description": "Adicione uma sobremesa ao seu pedido com 15% de desconto",
                "discount_type": "percentage",
                "discount_value": 15,
                "applies_to": ["desserts"],
                "requires": ["combos", "burgers"],
                "position": 2,
                "highlight_color": "#4CAF50",
                "reason": "Aumenta ticket médio e conversão de sobremesas",
            }
        )

        # Promoção 3: Oferta especial para reduzir abandono no pagamento
        if (
            "payment" in abandonment_data["abandonment_by_step"]
            and abandonment_data["abandonment_by_step"]["payment"] > 0.1
        ):
            recommended_promotions.append(
                {
                    "promotion_id": f"promo-{uuid.uuid4().hex[:8]}",
                    "name": "Frete Grátis",
                    "description": "Frete grátis para pedidos acima de R$ 50",
                    "discount_type": "free_shipping",
                    "discount_value": 0,
                    "min_order_value": 50,
                    "applies_to": ["delivery"],
                    "position": 3,
                    "highlight_color": "#2196F3",
                    "reason": "Reduz abandono na etapa de pagamento",
                }
            )

        # Limitar ao número máximo de promoções
        return recommended_promotions[
            : self.default_parameters["max_highlighted_promotions"]
        ]

    async def _calculate_expected_conversion_lift(
        self,
        restaurant_id: str,
        kiosk_id: str,
        recommended_items: List[Dict[str, Any]],
        recommended_promotions: List[Dict[str, Any]],
        abandonment_data: Dict[str, Any],
    ) -> float:
        """
        Calcula aumento esperado na taxa de conversão.

        Args:
            restaurant_id: ID do restaurante
            kiosk_id: ID do totem
            recommended_items: Itens recomendados
            recommended_promotions: Promoções recomendadas
            abandonment_data: Dados de abandono

        Returns:
            float: Aumento esperado na taxa de conversão (percentual)
        """
        # Taxa de abandono atual
        current_abandonment = abandonment_data["overall_abandonment_rate"]

        # Taxa de conversão atual
        current_conversion = 1 - current_abandonment

        # Calcular impacto esperado dos itens destacados
        items_impact = 0.02 * min(len(recommended_items), 3)  # Até 6% de impacto

        # Calcular impacto esperado das promoções
        promotions_impact = 0.03 * len(recommended_promotions)  # Até 9% de impacto

        # Calcular impacto total (com diminuição de retornos)
        total_impact = (items_impact + promotions_impact) * 0.8

        # Calcular nova taxa de conversão esperada
        new_conversion = min(0.95, current_conversion * (1 + total_impact))

        # Calcular aumento percentual
        conversion_lift = (
            (new_conversion - current_conversion) / current_conversion
        ) * 100

        return round(conversion_lift, 2)

    async def _generate_optimization_reason(
        self,
        restaurant_id: str,
        kiosk_id: str,
        recommended_items: List[Dict[str, Any]],
        recommended_promotions: List[Dict[str, Any]],
        expected_conversion_lift: float,
        abandonment_data: Dict[str, Any],
    ) -> str:
        """
        Gera explicação para a otimização de totem.

        Args:
            restaurant_id: ID do restaurante
            kiosk_id: ID do totem
            recommended_items: Itens recomendados
            recommended_promotions: Promoções recomendadas
            expected_conversion_lift: Aumento esperado na conversão
            abandonment_data: Dados de abandono

        Returns:
            str: Explicação para a otimização
        """
        # Principais razões de abandono
        top_abandonment_reason = abandonment_data["common_abandonment_reasons"][0][
            "reason"
        ]
        abandonment_reasons_map = {
            "processo_demorado": "processo demorado",
            "muitas_opcoes": "excesso de opções",
            "preco_alto": "preços considerados altos",
            "problemas_pagamento": "problemas no pagamento",
        }
        abandonment_reason = abandonment_reasons_map.get(
            top_abandonment_reason, top_abandonment_reason
        )

        # Gerar explicação
        explanation = (
            f"A otimização do totem {kiosk_id} pode aumentar a taxa de conversão em {expected_conversion_lift:.1f}%. "
            f"Atualmente, {abandonment_data['overall_abandonment_rate']*100:.1f}% dos clientes abandonam o pedido, "
            f"principalmente devido a {abandonment_reason}. "
        )

        if recommended_items:
            item_names = ", ".join([item["name"] for item in recommended_items[:3]])
            explanation += f"Recomendamos destacar itens populares como {item_names} para facilitar a escolha. "

        if recommended_promotions:
            promo_names = ", ".join([promo["name"] for promo in recommended_promotions])
            explanation += f"As promoções {promo_names} podem aumentar o ticket médio e reduzir o abandono. "

        explanation += (
            "Estas mudanças simplificam o processo de pedido e incentivam a conclusão, "
            "especialmente nas etapas com maior abandono."
        )

        return explanation
