from typing import List, Dict, Any, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Path, Body, status
from fastapi.responses import JSONResponse
from datetime import datetime
import uuid
import json

from src.product.models.product import (
    OrderItem,
    OrderItemCreate,
    OrderItemCustomization,
    OrderItemSection,
    Order,
    OrderCreate,
    OrderUpdate,
    OrderStatus,
    PaymentStatus,
    PaymentMethod,
    OrderType,
    OrderItemUpdate,
    ApplyCouponRequest,
    ApplyPointsRequest,
    DiscountResponse
)
from src.auth.security import get_current_user
from src.auth.models import User, Permission
from src.core.events.event_bus import get_event_bus, Event, EventType
from src.order.services.order_service import order_service

router = APIRouter(prefix="/api/v1", tags=["orders"])

def _check_permissions(user: User, required_permissions: List[str]):
    """Helper function to check user permissions inline."""
    if Permission.ALL in user.permissions:
        return # User has all permissions
    for perm in required_permissions:
        if perm not in user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissão necessária: {perm}"
            )

@router.post("/orders/", response_model=Order)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user)
):
    """Cria um novo pedido."""
    _check_permissions(current_user, ["orders.create"])
    return await order_service.create_order(order_data, current_user.id)

@router.get("/orders/{order_id}", response_model=Order)
async def get_order(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """Busca um pedido pelo ID."""
    _check_permissions(current_user, ["orders.read"])
    order = await order_service.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return order

@router.get("/orders/", response_model=List[Order])
async def list_orders(
    customer_id: Optional[str] = None,
    cashier_id: Optional[str] = None,
    status: Optional[OrderStatus] = None,
    payment_status: Optional[PaymentStatus] = None,
    order_type: Optional[OrderType] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """Lista pedidos com filtros."""
    _check_permissions(current_user, ["orders.read"])
    return await order_service.list_orders(
        customer_id=customer_id,
        cashier_id=cashier_id,
        status=status,
        payment_status=payment_status,
        order_type=order_type,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )

@router.put("/orders/{order_id}", response_model=Order)
async def update_order(
    order_id: str,
    update_data: OrderUpdate,
    current_user: User = Depends(get_current_user)
):
    """Atualiza um pedido."""
    _check_permissions(current_user, ["orders.update"])
    order = await order_service.update_order(order_id, update_data)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return order

@router.post("/orders/{order_id}/items/", response_model=OrderItem)
async def add_order_item(
    order_id: str,
    item_data: OrderItemCreate,
    current_user: User = Depends(get_current_user)
):
    """Adiciona um item a um pedido existente."""
    _check_permissions(current_user, ["orders.update"])
    item = await order_service.add_order_item(order_id, item_data)
    if not item:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return item

@router.put("/orders/items/{item_id}", response_model=OrderItem)
async def update_order_item(
    item_id: str,
    update_data: OrderItemUpdate,
    current_user: User = Depends(get_current_user)
):
    """Atualiza um item de pedido."""
    _check_permissions(current_user, ["orders.update"])
    item = await order_service.update_order_item(item_id, update_data)
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return item

@router.delete("/orders/items/{item_id}", status_code=204)
async def remove_order_item(
    item_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove um item de um pedido."""
    _check_permissions(current_user, ["orders.update"])
    success = await order_service.remove_order_item(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return None

# === New endpoints for coupon and points redemption ===

@router.post("/orders/{order_id}/apply-coupon", response_model=DiscountResponse)
async def apply_coupon_to_order(
    order_id: str,
    coupon_request: ApplyCouponRequest,
    current_user: User = Depends(get_current_user)
):
    """Aplica um cupom de desconto a um pedido."""
    _check_permissions(current_user, ["orders.update"])
    try:
        return await order_service.apply_coupon(order_id, coupon_request)
    except HTTPException as e:
        # Re-raise HTTP exceptions from the service
        raise e
    except Exception as e:
        # Log unexpected errors and return a generic error message
        print(f"Error applying coupon: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao aplicar cupom"
        )

@router.post("/orders/{order_id}/apply-points", response_model=DiscountResponse)
async def apply_points_to_order(
    order_id: str,
    points_request: ApplyPointsRequest,
    current_user: User = Depends(get_current_user)
):
    """Aplica pontos de fidelidade a um pedido."""
    _check_permissions(current_user, ["orders.update"])
    try:
        return await order_service.apply_points(order_id, points_request)
    except HTTPException as e:
        # Re-raise HTTP exceptions from the service
        raise e
    except Exception as e:
        # Log unexpected errors and return a generic error message
        print(f"Error applying points: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao aplicar pontos"
        )

@router.post("/orders/{order_id}/finalize", response_model=Order)
async def finalize_order(
    order_id: str,
    payment_method: PaymentMethod,
    current_user: User = Depends(get_current_user)
):
    """Finaliza um pedido, processando pagamento e aplicando pontos/cupons."""
    _check_permissions(current_user, ["orders.update"])
    try:
        return await order_service.finalize_order(order_id, payment_method)
    except HTTPException as e:
        # Re-raise HTTP exceptions from the service
        raise e
    except Exception as e:
        # Log unexpected errors and return a generic error message
        print(f"Error finalizing order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao finalizar pedido"
        )
