import json
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Request

from src.remote_orders.models.remote_order_models import RemoteOrderStatus
from src.remote_orders.services.rappi_order_service import (
    RappiOrderService,
    get_rappi_order_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/remote-orders/rappi", tags=["rappi"])


@router.post("/webhook")
async def rappi_webhook(
    request: Request,
    x_rappi_signature: Optional[str] = Header(None),
    rappi_service: RappiOrderService = Depends(get_rappi_order_service),
):
    """
    Endpoint para receber webhooks do Rappi.

    Args:
        request: Requisição HTTP
        x_rappi_signature: Assinatura do webhook para validação
        rappi_service: Serviço de pedidos Rappi

    Returns:
        Dict: Resposta de confirmação
    """
    try:
        # Ler o corpo da requisição
        body = await request.body()
        webhook_data = json.loads(body)

        logger.info(
            f"Received Rappi webhook: {webhook_data.get('eventType', 'unknown')}"
        )

        # Processar webhook
        result = await rappi_service.process_rappi_webhook(
            webhook_data, x_rappi_signature or ""
        )

        if result:
            return {"status": "success", "message": "Webhook processed successfully"}
        else:
            return {
                "status": "ignored",
                "message": "Webhook ignored or no action required",
            }

    except Exception as e:
        logger.exception(f"Error processing Rappi webhook: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error processing webhook: {str(e)}"
        ) from e


@router.get("/orders")
async def list_rappi_orders(
    restaurant_id: str,
    status: Optional[str] = None,
    rappi_service: RappiOrderService = Depends(get_rappi_order_service),
):
    """
    Lista pedidos do Rappi.

    Args:
        restaurant_id: ID do restaurante
        status: Filtro por status (opcional)
        rappi_service: Serviço de pedidos Rappi

    Returns:
        List: Lista de pedidos
    """
    # Em uma implementação real, buscar do banco de dados
    # Exemplo:
    # orders = await rappi_service.list_orders(restaurant_id, status)

    # Implementação simulada para desenvolvimento
    return {"orders": []}


@router.get("/orders/{order_id}")
async def get_rappi_order(
    order_id: str, rappi_service: RappiOrderService = Depends(get_rappi_order_service)
):
    """
    Obtém detalhes de um pedido do Rappi.

    Args:
        order_id: ID do pedido
        rappi_service: Serviço de pedidos Rappi

    Returns:
        Dict: Detalhes do pedido
    """
    order = await rappi_service.get_remote_order(order_id)

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return order


@router.post("/orders/{order_id}/confirm")
async def confirm_rappi_order(
    order_id: str, rappi_service: RappiOrderService = Depends(get_rappi_order_service)
):
    """
    Confirma um pedido do Rappi.

    Args:
        order_id: ID do pedido
        rappi_service: Serviço de pedidos Rappi

    Returns:
        Dict: Resposta de confirmação
    """
    success = await rappi_service.confirm_remote_order(order_id)

    if not success:
        raise HTTPException(status_code=400, detail="Failed to confirm order")

    return {"status": "success", "message": "Order confirmed successfully"}


@router.post("/orders/{order_id}/reject")
async def reject_rappi_order(
    order_id: str,
    data: Dict[str, Any] = Body(...),
    rappi_service: RappiOrderService = Depends(get_rappi_order_service),
):
    """
    Rejeita um pedido do Rappi.

    Args:
        order_id: ID do pedido
        data: Dados com motivo da rejeição
        rappi_service: Serviço de pedidos Rappi

    Returns:
        Dict: Resposta de rejeição
    """
    reason = data.get("reason", "Rejected by restaurant")

    success = await rappi_service.reject_remote_order(order_id, reason)

    if not success:
        raise HTTPException(status_code=400, detail="Failed to reject order")

    return {"status": "success", "message": "Order rejected successfully"}


@router.post("/orders/{order_id}/status")
async def update_rappi_order_status(
    order_id: str,
    data: Dict[str, Any] = Body(...),
    rappi_service: RappiOrderService = Depends(get_rappi_order_service),
):
    """
    Atualiza o status de um pedido do Rappi.

    Args:
        order_id: ID do pedido
        data: Dados com novo status
        rappi_service: Serviço de pedidos Rappi

    Returns:
        Dict: Resposta de atualização
    """
    try:
        status_str = data.get("status")
        status = RemoteOrderStatus(status_str)

        success = await rappi_service.update_order_status(order_id, status)

        if not success:
            raise HTTPException(status_code=400, detail="Failed to update order status")

        return {"status": "success", "message": f"Order status updated to {status_str}"}

    except ValueError as e:
        raise HTTPException(
            status_code=400, detail=f"Invalid status: {data.get('status')}"
        ) from e


@router.post("/products/{product_id}/availability")
async def update_product_availability(
    product_id: str,
    data: Dict[str, Any] = Body(...),
    rappi_service: RappiOrderService = Depends(get_rappi_order_service),
):
    """
    Atualiza a disponibilidade de um produto no Rappi.

    Args:
        product_id: ID do produto
        data: Dados com disponibilidade e ID do restaurante
        rappi_service: Serviço de pedidos Rappi

    Returns:
        Dict: Resposta de atualização
    """
    restaurant_id = data.get("restaurant_id")
    available = data.get("available", True)

    if not restaurant_id:
        raise HTTPException(status_code=400, detail="Restaurant ID is required")

    success = await rappi_service.update_product_availability(
        restaurant_id, product_id, available
    )

    if not success:
        raise HTTPException(
            status_code=400, detail="Failed to update product availability"
        )

    return {
        "status": "success",
        "message": f"Product {product_id} availability updated to {available}",
    }


@router.post("/configuration")
async def update_rappi_configuration(
    data: Dict[str, Any] = Body(...),
    rappi_service: RappiOrderService = Depends(get_rappi_order_service),
):
    """
    Atualiza a configuração do Rappi para um restaurante.

    Args:
        data: Dados de configuração
        rappi_service: Serviço de pedidos Rappi

    Returns:
        Dict: Resposta de atualização
    """
    # Em uma implementação real, salvar no banco de dados
    # Exemplo:
    # config = await rappi_service.update_configuration(data)

    # Implementação simulada para desenvolvimento
    return {"status": "success", "message": "Configuration updated successfully"}
