import logging
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from src.product.models.product import ProductType
from src.product.services.product_service import get_product_service

logger = logging.getLogger(__name__)


class ComboRulesService:
    """Serviço para aplicação de regras de negócio para combos."""

    async def validate_combo_creation(
        self, product_data: Dict[str, Any], items: List[Dict[str, Any]]
    ) -> None:
        """
        Valida a criação de um combo, verificando se todos os produtos existem
        e se os grupos de troca são válidos.

        Raises:
            HTTPException: Se a validação falhar.
        """
        if not items:
            raise HTTPException(
                status_code=400, detail="Um combo deve ter pelo menos um item"
            )

        product_service = get_product_service()

        # Verificar se todos os produtos existem
        product_ids = [item["product_id"] for item in items]
        for product_id in product_ids:
            product = await product_service.get_product(product_id)
            if not product:
                raise HTTPException(
                    status_code=400, detail=f"Produto não encontrado: {product_id}"
                )

            # Verificar se o produto não é um combo (evitar combos de combos)
            if product.type == ProductType.COMBO:
                raise HTTPException(
                    status_code=400,
                    detail=f"Não é possível incluir um combo dentro de outro combo: {product_id}",
                )

        # Verificar grupos de troca
        exchange_group_ids = set()
        for item in items:
            if item.get("is_exchangeable") and item.get("exchange_group_id"):
                exchange_group_ids.add(item["exchange_group_id"])

        # Validar grupos de troca
        for group_id in exchange_group_ids:
            group = await product_service.get_exchange_group(group_id)
            if not group:
                raise HTTPException(
                    status_code=400, detail=f"Grupo de troca não encontrado: {group_id}"
                )

    async def validate_combo_update(
        self, combo_id: str, items: Optional[List[Dict[str, Any]]] = None
    ) -> None:
        """
        Valida a atualização de um combo.

        Raises:
            HTTPException: Se a validação falhar.
        """
        if items is None:
            return

        product_service = get_product_service()

        # Verificar se o combo existe
        combo = await product_service.get_product(combo_id)
        if not combo:
            raise HTTPException(status_code=404, detail="Combo não encontrado")

        if combo.type != ProductType.COMBO:
            raise HTTPException(status_code=400, detail="O produto não é um combo")

        # Validar itens do combo
        await self.validate_combo_creation({}, items)

    async def process_combo_customization(
        self, combo_id: str, customizations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Processa personalizações para um combo, como substituições de itens.

        Args:
            combo_id: ID do combo
            customizations: Lista de personalizações no formato:
                [
                    {
                        "original_item_id": "item-1",
                        "replacement_product_id": "product-2",
                        "quantity": 1
                    }
                ]

        Returns:
            Dict com informações do combo personalizado, incluindo preço ajustado.
        """
        product_service = get_product_service()

        # Buscar combo
        combo = await product_service.get_product(combo_id)
        if not combo:
            raise HTTPException(status_code=404, detail="Combo não encontrado")

        if combo.type != ProductType.COMBO:
            raise HTTPException(status_code=400, detail="O produto não é um combo")

        # Buscar itens do combo
        combo_items = await product_service.get_combo_items(combo_id)
        if not combo_items:
            raise HTTPException(status_code=400, detail="O combo não possui itens")

        # Mapear itens por ID para facilitar acesso
        combo_items_map = {item["product_id"]: item for item in combo_items}

        # Inicializar preço ajustado com o preço base do combo
        adjusted_price = combo.price

        # Processar personalizações
        processed_customizations = []

        for customization in customizations:
            original_item_id = customization.get("original_item_id")
            replacement_product_id = customization.get("replacement_product_id")
            quantity = customization.get("quantity", 1)

            # Verificar se o item original existe no combo
            if original_item_id not in combo_items_map:
                raise HTTPException(
                    status_code=400,
                    detail=f"Item original não encontrado no combo: {original_item_id}",
                )

            original_item = combo_items_map[original_item_id]

            # Verificar se o item é trocável
            if not original_item.get("is_exchangeable", False):
                raise HTTPException(
                    status_code=400,
                    detail=f"O item não permite substituição: {original_item_id}",
                )

            # Verificar grupo de troca
            exchange_group_id = original_item.get("exchange_group_id")
            if not exchange_group_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"O item não possui grupo de troca definido: {original_item_id}",
                )

            # Buscar grupo de troca
            exchange_group = await product_service.get_exchange_group(exchange_group_id)
            if not exchange_group:
                raise HTTPException(
                    status_code=400,
                    detail=f"Grupo de troca não encontrado: {exchange_group_id}",
                )

            # Verificar se o produto de substituição está no grupo de troca
            if replacement_product_id not in exchange_group.get("product_ids", []):
                raise HTTPException(
                    status_code=400,
                    detail=f"Produto de substituição não permitido para este item: {replacement_product_id}",
                )

            # Buscar produto de substituição
            if replacement_product_id is None:
                raise HTTPException(
                    status_code=400,
                    detail="ID do produto de substituição não fornecido",
                )
            replacement_product = await product_service.get_product(
                str(replacement_product_id)
            )
            if not replacement_product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Produto de substituição não encontrado: {replacement_product_id}",
                )

            # Buscar produto original
            if original_item_id is None:
                raise HTTPException(
                    status_code=400, detail="ID do produto original não fornecido"
                )
            original_product = await product_service.get_product(str(original_item_id))
            if not original_product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Produto original não encontrado: {original_item_id}",
                )

            # Calcular diferença de preço
            price_difference = (
                replacement_product.price - original_product.price
            ) * quantity

            # Ajustar preço total
            adjusted_price += price_difference

            # Adicionar à lista de personalizações processadas
            processed_customizations.append(
                {
                    "original_item": {
                        "id": original_item_id,
                        "name": original_product.name,
                        "price": original_product.price,
                    },
                    "replacement": {
                        "id": replacement_product_id,
                        "name": replacement_product.name,
                        "price": replacement_product.price,
                    },
                    "quantity": quantity,
                    "price_difference": price_difference,
                }
            )

        # Retornar informações do combo personalizado
        return {
            "combo_id": combo_id,
            "combo_name": combo.name,
            "base_price": combo.price,
            "adjusted_price": adjusted_price,
            "customizations": processed_customizations,
        }

    async def calculate_combo_nutritional_info(self, combo_id: str) -> Dict[str, Any]:
        """
        Calcula informações nutricionais para um combo com base nos seus itens.

        Args:
            combo_id: ID do combo

        Returns:
            Dict com informações nutricionais agregadas.
        """
        product_service = get_product_service()

        # Buscar combo
        combo = await product_service.get_product(combo_id)
        if not combo:
            raise HTTPException(status_code=404, detail="Combo não encontrado")

        if combo.type != ProductType.COMBO:
            raise HTTPException(status_code=400, detail="O produto não é um combo")

        # Buscar itens do combo
        combo_items = await product_service.get_combo_items(combo_id)
        if not combo_items:
            return {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "sodium": 0}

        # Inicializar valores nutricionais
        total_calories = 0
        total_protein = 0
        total_carbs = 0
        total_fat = 0
        total_sodium = 0

        # Somar valores nutricionais de cada item
        for item in combo_items:
            product_id = item["product_id"]
            quantity = item.get("quantity", 1)

            # Buscar produto
            product = await product_service.get_product(product_id)
            if not product:
                continue

            # Extrair informações nutricionais dos atributos do produto
            attributes = product.attributes or {}
            nutritional_info = attributes.get("nutritional_info", {})

            # Somar valores, multiplicando pela quantidade
            total_calories += nutritional_info.get("calories", 0) * quantity
            total_protein += nutritional_info.get("protein", 0) * quantity
            total_carbs += nutritional_info.get("carbs", 0) * quantity
            total_fat += nutritional_info.get("fat", 0) * quantity
            total_sodium += nutritional_info.get("sodium", 0) * quantity

        # Retornar informações nutricionais agregadas
        return {
            "calories": total_calories,
            "protein": total_protein,
            "carbs": total_carbs,
            "fat": total_fat,
            "sodium": total_sodium,
        }


# Singleton para o serviço de regras de combo
_combo_rules_service_instance = None


def get_combo_rules_service() -> ComboRulesService:
    """Retorna a instância singleton do serviço de regras de combo."""
    global _combo_rules_service_instance
    if _combo_rules_service_instance is None:
        _combo_rules_service_instance = ComboRulesService()
    return _combo_rules_service_instance
