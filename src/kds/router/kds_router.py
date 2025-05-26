from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body, status
from fastapi.responses import JSONResponse
from datetime import datetime
import os # Keep os for potential future use inside service

from src.kds.models.kds_models import (
    KDSOrder,
    KDSOrderItem,
    KDSOrderStatus,
    KDSOrderPriority,
    KDSOrderUpdate,
    KDSOrderItemUpdate,
    KDSSession,
    KDSSessionCreate,
    KDSSessionUpdate,
    KDSStats
)
from src.kds.services.kds_service import get_kds_service
from src.auth.security import get_current_user
from src.auth.models import User, Permission # Import User and Permission
from src.core.dependencies import check_instance_license # Import license check dependency

router = APIRouter(prefix="/api/v1", tags=["kds"])

# Dependency for checking KDS instance license
check_kds_license = check_instance_license("kds")

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

@router.get("/kds/orders", response_model=List[KDSOrder])
async def list_orders(
    kds_id: int = Depends(check_kds_license), # Use the specific dependency
    status: Optional[KDSOrderStatus] = None,
    priority: Optional[KDSOrderPriority] = None,
    order_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todos os pedidos no KDS com filtros opcionais para uma instância licenciada.
    Requer permissão: ORDER_READ
    """
    _check_permissions(current_user, [Permission.ORDER_READ]) # Corrected permission
    
    kds_service = get_kds_service()
    orders = await kds_service.get_all_orders(
        kds_instance_id=kds_id,
        status=status,
        priority=priority,
        order_type=order_type,
        limit=limit,
        offset=offset
    )
    return orders

@router.get("/kds/orders/{order_id}", response_model=KDSOrder)
async def get_order(
    order_id: str = Path(..., description="ID do pedido"),
    kds_id: int = Depends(check_kds_license), # Use the specific dependency
    current_user: User = Depends(get_current_user)
):
    """
    Busca um pedido específico no KDS pelo ID para uma instância licenciada.
    Requer permissão: ORDER_READ
    """
    _check_permissions(current_user, [Permission.ORDER_READ]) # Corrected permission
    
    kds_service = get_kds_service()
    order = await kds_service.get_order(order_id, kds_instance_id=kds_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return order

@router.put("/kds/orders/{order_id}", response_model=KDSOrder)
async def update_order_status(
    order_id: str = Path(..., description="ID do pedido"),
    update_data: KDSOrderUpdate = Body(...),
    kds_id: int = Depends(check_kds_license), # Use the specific dependency
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza o status de um pedido no KDS para uma instância licenciada.
    Requer permissão: ORDER_UPDATE
    """
    _check_permissions(current_user, [Permission.ORDER_UPDATE]) # Corrected permission
    
    kds_service = get_kds_service()
    order = await kds_service.update_order_status(order_id, update_data, kds_instance_id=kds_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return order

@router.put("/kds/orders/{order_id}/items/{item_id}", response_model=KDSOrderItem)
async def update_item_status(
    order_id: str = Path(..., description="ID do pedido"),
    item_id: str = Path(..., description="ID do item"),
    update_data: KDSOrderItemUpdate = Body(...),
    kds_id: int = Depends(check_kds_license), # Use the specific dependency
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza o status de um item de pedido no KDS para uma instância licenciada.
    Requer permissão: ORDER_UPDATE
    """
    _check_permissions(current_user, [Permission.ORDER_UPDATE]) # Corrected permission
    
    kds_service = get_kds_service()
    item = await kds_service.update_item_status(order_id, item_id, update_data, kds_instance_id=kds_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return item

@router.post("/kds/sessions", response_model=KDSSession)
async def create_session(
    session_data: KDSSessionCreate = Body(...),
    kds_id: int = Depends(check_kds_license), # Use the specific dependency
    current_user: User = Depends(get_current_user)
):
    """
    Cria uma nova sessão do KDS para uma instância licenciada.
    Requer permissão: ORDER_UPDATE (Assuming managing KDS session is part of order flow)
    """
    _check_permissions(current_user, [Permission.ORDER_UPDATE]) # Corrected permission
    
    kds_service = get_kds_service()
    session = await kds_service.create_session(session_data, kds_id)
    return session

@router.get("/kds/sessions", response_model=List[KDSSession])
async def list_sessions(
    kds_id: Optional[int] = Query(None, description="Filtrar por ID da instância KDS licenciada"),
    active_only: bool = Query(False),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todas as sessões do KDS, opcionalmente filtrando por instância licenciada.
    Requer permissão: ORDER_READ
    """
    _check_permissions(current_user, [Permission.ORDER_READ]) # Corrected permission
    
    # Check license if kds_id is provided (Middleware doesn't handle optional query params)
    if kds_id is not None:
        await check_kds_license(kds_id) # Manually invoke the check
        
    kds_service = get_kds_service()
    sessions = await kds_service.get_all_sessions(active_only=active_only, kds_id=kds_id)
    return sessions

@router.get("/kds/sessions/{session_id}", response_model=KDSSession)
async def get_session(
    session_id: str = Path(..., description="ID da sessão"),
    current_user: User = Depends(get_current_user)
):
    """
    Busca uma sessão específica do KDS pelo ID.
    Requer permissão: ORDER_READ
    """
    _check_permissions(current_user, [Permission.ORDER_READ]) # Corrected permission
    
    kds_service = get_kds_service()
    session = await kds_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
        
    # Check license for the associated kds_id
    await check_kds_license(session.kds_id)
        
    return session

@router.put("/kds/sessions/{session_id}", response_model=KDSSession)
async def update_session(
    session_id: str = Path(..., description="ID da sessão"),
    update_data: KDSSessionUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza uma sessão do KDS.
    Requer permissão: ORDER_UPDATE
    """
    _check_permissions(current_user, [Permission.ORDER_UPDATE]) # Corrected permission
    
    kds_service = get_kds_service()
    existing_session = await kds_service.get_session(session_id)
    if not existing_session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
        
    # Check license for the associated kds_id before update
    await check_kds_license(existing_session.kds_id)
        
    session = await kds_service.update_session(session_id, update_data)
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada após atualização")
    return session

@router.get("/kds/stats", response_model=KDSStats)
async def get_stats(
    kds_id: int = Depends(check_kds_license), # Use the specific dependency
    current_user: User = Depends(get_current_user)
):
    """
    Retorna estatísticas do KDS para uma instância licenciada.
    Requer permissão: REPORT_READ
    """
    _check_permissions(current_user, [Permission.REPORT_READ]) # Corrected permission
    
    kds_service = get_kds_service()
    stats = await kds_service.get_stats(kds_instance_id=kds_id)
    return stats

