from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body, status # Added status
import os # Added for path joining

from src.waiter.models.waiter_models import (
    WaiterOrder,
    WaiterOrderItem,
    WaiterOrderStatus,
    WaiterOrderType,
    WaiterOrderCreate,
    WaiterOrderUpdate,
    WaiterOrderItemCreate,
    WaiterOrderItemUpdate,
    WaiterSession,
    WaiterSessionCreate,
    WaiterSessionUpdate,
    WaiterTable,
    WaiterTableCreate,
    WaiterTableUpdate,
    WaiterStats
)
from src.waiter.services.waiter_service import get_waiter_service
from src.auth.security import get_current_user
from src.auth.models import User, Permission # Import User and Permission
from src.core.dependencies import check_instance_license, CONFIG_DIR # Import license check dependency

router = APIRouter(prefix="/api/v1", tags=["waiter"])

# Dependency for checking Waiter instance license
check_waiter_license = check_instance_license("waiter")

# Helper function for inline permission check
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

@router.post("/waiter/orders", response_model=WaiterOrder)
async def create_order(
    order_data: WaiterOrderCreate = Body(...),
    waiter_id: int = Depends(check_waiter_license), # Check license
    current_user: User = Depends(get_current_user)
):
    """
    Cria um novo pedido no módulo de garçom para uma instância licenciada.
    Requer permissão: ORDER_CREATE
    """
    _check_permissions(current_user, [Permission.ORDER_CREATE])
    waiter_service = get_waiter_service()
    order = await waiter_service.create_order(order_data, waiter_id=waiter_id)
    return order

@router.get("/waiter/orders", response_model=List[WaiterOrder])
async def list_orders(
    status: Optional[WaiterOrderStatus] = None,
    order_type: Optional[WaiterOrderType] = None,
    waiter_id_filter: Optional[int] = Query(None, alias="waiter_id", description="Filtrar por ID da instância licenciada"),
    table_number: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    """
    Lista pedidos no módulo de garçom com filtros opcionais.
    Requer permissão: ORDER_READ
    """
    _check_permissions(current_user, [Permission.ORDER_READ])
    # Check license if filtering by waiter_id
    if waiter_id_filter is not None:
        config_file_path = os.path.join(CONFIG_DIR, "waiter", f"{waiter_id_filter}.json")
        if not os.path.exists(config_file_path):
            raise HTTPException(status_code=403, detail=f"Instance ID {waiter_id_filter} for module waiter is not licensed.")
            
    waiter_service = get_waiter_service()
    orders = await waiter_service.get_all_orders(
        status=status,
        order_type=order_type,
        waiter_id=waiter_id_filter,
        table_number=table_number,
        limit=limit,
        offset=offset
    )
    return orders

@router.get("/waiter/orders/{order_id}", response_model=WaiterOrder)
async def get_order(
    order_id: str = Path(..., description="ID do pedido"),
    current_user: User = Depends(get_current_user)
):
    """
    Busca um pedido específico pelo ID.
    Requer permissão: ORDER_READ
    """
    _check_permissions(current_user, [Permission.ORDER_READ])
    waiter_service = get_waiter_service()
    order = await waiter_service.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    # Check license for the associated waiter_id
    config_file_path = os.path.join(CONFIG_DIR, "waiter", f"{order.waiter_id}.json")
    if not os.path.exists(config_file_path):
        raise HTTPException(status_code=403, detail=f"Instance ID {order.waiter_id} associated with this order is not licensed.")
    return order

@router.put("/waiter/orders/{order_id}", response_model=WaiterOrder)
async def update_order(
    order_id: str = Path(..., description="ID do pedido"),
    update_data: WaiterOrderUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza um pedido existente.
    Requer permissão: ORDER_UPDATE
    """
    _check_permissions(current_user, [Permission.ORDER_UPDATE])
    waiter_service = get_waiter_service()
    existing_order = await waiter_service.get_order(order_id)
    if not existing_order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    # Check license for the associated waiter_id
    config_file_path = os.path.join(CONFIG_DIR, "waiter", f"{existing_order.waiter_id}.json")
    if not os.path.exists(config_file_path):
        raise HTTPException(status_code=403, detail=f"Instance ID {existing_order.waiter_id} associated with this order is not licensed.")
    order = await waiter_service.update_order(order_id, update_data)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado após atualização")
    return order

@router.post("/waiter/orders/{order_id}/send", response_model=WaiterOrder)
async def send_order_to_kitchen(
    order_id: str = Path(..., description="ID do pedido"),
    current_user: User = Depends(get_current_user)
):
    """
    Envia um pedido para a cozinha.
    Requer permissão: ORDER_UPDATE
    """
    _check_permissions(current_user, [Permission.ORDER_UPDATE])
    waiter_service = get_waiter_service()
    existing_order = await waiter_service.get_order(order_id)
    if not existing_order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    # Check license for the associated waiter_id
    config_file_path = os.path.join(CONFIG_DIR, "waiter", f"{existing_order.waiter_id}.json")
    if not os.path.exists(config_file_path):
        raise HTTPException(status_code=403, detail=f"Instance ID {existing_order.waiter_id} associated with this order is not licensed.")
    order = await waiter_service.send_order_to_kitchen(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado após envio")
    return order

@router.post("/waiter/orders/{order_id}/cancel", response_model=WaiterOrder)
async def cancel_order(
    order_id: str = Path(..., description="ID do pedido"),
    reason: Optional[str] = Query(None, description="Motivo do cancelamento"),
    current_user: User = Depends(get_current_user)
):
    """
    Cancela um pedido.
    Requer permissão: ORDER_UPDATE (Assuming cancel is an update)
    """
    _check_permissions(current_user, [Permission.ORDER_UPDATE]) # Changed from ORDER_DELETE
    waiter_service = get_waiter_service()
    existing_order = await waiter_service.get_order(order_id)
    if not existing_order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    # Check license for the associated waiter_id
    config_file_path = os.path.join(CONFIG_DIR, "waiter", f"{existing_order.waiter_id}.json")
    if not os.path.exists(config_file_path):
        raise HTTPException(status_code=403, detail=f"Instance ID {existing_order.waiter_id} associated with this order is not licensed.")
    order = await waiter_service.cancel_order(order_id, reason)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado após cancelamento")
    return order

@router.post("/waiter/orders/{order_id}/items", response_model=WaiterOrderItem)
async def add_order_item(
    order_id: str = Path(..., description="ID do pedido"),
    item_data: WaiterOrderItemCreate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """
    Adiciona um item a um pedido existente.
    Requer permissão: ORDER_UPDATE
    """
    _check_permissions(current_user, [Permission.ORDER_UPDATE])
    waiter_service = get_waiter_service()
    existing_order = await waiter_service.get_order(order_id)
    if not existing_order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    # Check license for the associated waiter_id
    config_file_path = os.path.join(CONFIG_DIR, "waiter", f"{existing_order.waiter_id}.json")
    if not os.path.exists(config_file_path):
        raise HTTPException(status_code=403, detail=f"Instance ID {existing_order.waiter_id} associated with this order is not licensed.")
    item = await waiter_service.add_order_item(order_id, item_data)
    if not item:
        raise HTTPException(status_code=404, detail="Erro ao adicionar item")
    return item

@router.put("/waiter/orders/{order_id}/items/{item_id}", response_model=WaiterOrderItem)
async def update_order_item(
    order_id: str = Path(..., description="ID do pedido"),
    item_id: str = Path(..., description="ID do item"),
    update_data: WaiterOrderItemUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza um item de um pedido existente.
    Requer permissão: ORDER_UPDATE
    """
    _check_permissions(current_user, [Permission.ORDER_UPDATE])
    waiter_service = get_waiter_service()
    existing_order = await waiter_service.get_order(order_id)
    if not existing_order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    # Check license for the associated waiter_id
    config_file_path = os.path.join(CONFIG_DIR, "waiter", f"{existing_order.waiter_id}.json")
    if not os.path.exists(config_file_path):
        raise HTTPException(status_code=403, detail=f"Instance ID {existing_order.waiter_id} associated with this order is not licensed.")
    item = await waiter_service.update_order_item(order_id, item_id, update_data)
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return item

@router.delete("/waiter/orders/{order_id}/items/{item_id}", response_model=dict)
async def remove_order_item(
    order_id: str = Path(..., description="ID do pedido"),
    item_id: str = Path(..., description="ID do item"),
    current_user: User = Depends(get_current_user)
):
    """
    Remove um item de um pedido existente.
    Requer permissão: ORDER_UPDATE
    """
    _check_permissions(current_user, [Permission.ORDER_UPDATE])
    waiter_service = get_waiter_service()
    existing_order = await waiter_service.get_order(order_id)
    if not existing_order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    # Check license for the associated waiter_id
    config_file_path = os.path.join(CONFIG_DIR, "waiter", f"{existing_order.waiter_id}.json")
    if not os.path.exists(config_file_path):
        raise HTTPException(status_code=403, detail=f"Instance ID {existing_order.waiter_id} associated with this order is not licensed.")
    success = await waiter_service.remove_order_item(order_id, item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return {"success": True, "message": "Item removido com sucesso"}

@router.post("/waiter/sessions", response_model=WaiterSession)
async def create_session(
    session_data: WaiterSessionCreate = Body(...),
    waiter_id: int = Depends(check_waiter_license), # Check license on creation
    current_user: User = Depends(get_current_user)
):
    """
    Cria uma nova sessão do módulo de garçom para uma instância licenciada.
    Requer permissão: USER_UPDATE (Managing device/user sessions)
    """
    _check_permissions(current_user, [Permission.USER_UPDATE]) # Corrected permission
    waiter_service = get_waiter_service()
    session = await waiter_service.create_session(session_data, waiter_id=waiter_id)
    return session

@router.get("/waiter/sessions", response_model=List[WaiterSession])
async def list_sessions(
    active_only: bool = Query(False, description="Filtrar apenas sessões ativas"),
    waiter_id_filter: Optional[int] = Query(None, alias="waiter_id", description="Filtrar por ID da instância licenciada"),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todas as sessões do módulo de garçom, opcionalmente por instância.
    Requer permissão: USER_READ
    """
    _check_permissions(current_user, [Permission.USER_READ]) # Corrected permission
    if waiter_id_filter is not None:
        config_file_path = os.path.join(CONFIG_DIR, "waiter", f"{waiter_id_filter}.json")
        if not os.path.exists(config_file_path):
            raise HTTPException(status_code=403, detail=f"Instance ID {waiter_id_filter} for module waiter is not licensed.")
    waiter_service = get_waiter_service()
    sessions = await waiter_service.get_all_sessions(active_only=active_only, waiter_id=waiter_id_filter)
    return sessions

@router.get("/waiter/sessions/{session_id}", response_model=WaiterSession)
async def get_session(
    session_id: str = Path(..., description="ID da sessão"),
    current_user: User = Depends(get_current_user)
):
    """
    Busca uma sessão específica pelo ID.
    Requer permissão: USER_READ
    """
    _check_permissions(current_user, [Permission.USER_READ]) # Corrected permission
    waiter_service = get_waiter_service()
    session = await waiter_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    # Check license for the associated waiter_id
    config_file_path = os.path.join(CONFIG_DIR, "waiter", f"{session.waiter_id}.json")
    if not os.path.exists(config_file_path):
        raise HTTPException(status_code=403, detail=f"Instance ID {session.waiter_id} associated with this session is not licensed.")
    return session

@router.put("/waiter/sessions/{session_id}", response_model=WaiterSession)
async def update_session(
    session_id: str = Path(..., description="ID da sessão"),
    update_data: WaiterSessionUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza uma sessão existente.
    Requer permissão: USER_UPDATE
    """
    _check_permissions(current_user, [Permission.USER_UPDATE]) # Corrected permission
    waiter_service = get_waiter_service()
    existing_session = await waiter_service.get_session(session_id)
    if not existing_session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    # Check license for the associated waiter_id
    config_file_path = os.path.join(CONFIG_DIR, "waiter", f"{existing_session.waiter_id}.json")
    if not os.path.exists(config_file_path):
        raise HTTPException(status_code=403, detail=f"Instance ID {existing_session.waiter_id} associated with this session is not licensed.")
    session = await waiter_service.update_session(session_id, update_data)
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada após atualização")
    return session

@router.post("/waiter/tables", response_model=WaiterTable)
async def create_table(
    table_data: WaiterTableCreate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """
    Cria uma nova mesa.
    Requer permissão: SALE_UPDATE (Managing tables affects sales context)
    """
    _check_permissions(current_user, [Permission.SALE_UPDATE]) # Corrected permission
    waiter_service = get_waiter_service()
    table = await waiter_service.create_table(table_data)
    return table

@router.get("/waiter/tables", response_model=List[WaiterTable])
async def list_tables(
    status: Optional[str] = Query(None, description="Filtrar por status"),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todas as mesas.
    Requer permissão: SALE_READ
    """
    _check_permissions(current_user, [Permission.SALE_READ]) # Corrected permission
    waiter_service = get_waiter_service()
    tables = await waiter_service.get_all_tables(status=status)
    return tables

@router.get("/waiter/tables/{table_id}", response_model=WaiterTable)
async def get_table(
    table_id: str = Path(..., description="ID da mesa"),
    current_user: User = Depends(get_current_user)
):
    """
    Busca uma mesa específica pelo ID.
    Requer permissão: SALE_READ
    """
    _check_permissions(current_user, [Permission.SALE_READ]) # Corrected permission
    waiter_service = get_waiter_service()
    table = await waiter_service.get_table(table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Mesa não encontrada")
    return table

@router.put("/waiter/tables/{table_id}", response_model=WaiterTable)
async def update_table(
    table_id: str = Path(..., description="ID da mesa"),
    update_data: WaiterTableUpdate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza uma mesa existente.
    Requer permissão: SALE_UPDATE
    """
    _check_permissions(current_user, [Permission.SALE_UPDATE]) # Corrected permission
    waiter_service = get_waiter_service()
    table = await waiter_service.update_table(table_id, update_data)
    if not table:
        raise HTTPException(status_code=404, detail="Mesa não encontrada")
    return table

@router.get("/waiter/stats", response_model=WaiterStats)
async def get_stats(
    waiter_id: int = Depends(check_waiter_license), # Stats per licensed instance
    current_user: User = Depends(get_current_user)
):
    """
    Retorna estatísticas do módulo de garçom para uma instância licenciada.
    Requer permissão: REPORT_READ
    """
    _check_permissions(current_user, [Permission.REPORT_READ]) # Corrected permission
    waiter_service = get_waiter_service()
    stats = await waiter_service.get_stats(waiter_id=waiter_id)
    return stats

@router.post("/waiter/sync/{device_id}", response_model=Dict[str, Any])
async def sync_device_data(
    device_id: str = Path(..., description="ID do dispositivo"),
    current_user: User = Depends(get_current_user)
):
    """
    Sincroniza dados de um dispositivo.
    Requer permissão: USER_UPDATE (Syncing device data)
    """
    _check_permissions(current_user, [Permission.USER_UPDATE]) # Corrected permission
    # --- LICENSE CHECK NEEDED --- 
    # Find session by device_id, then check session.waiter_id license
    waiter_service = get_waiter_service()
    session = await waiter_service.get_session_by_device(device_id)
    if not session:
        raise HTTPException(status_code=404, detail="Device session not found")
    config_file_path = os.path.join(CONFIG_DIR, "waiter", f"{session.waiter_id}.json")
    if not os.path.exists(config_file_path):
        raise HTTPException(status_code=403, detail=f"Instance ID {session.waiter_id} associated with this device is not licensed.")
    # --- END LICENSE CHECK --- 
    result = await waiter_service.sync_device_data(device_id)
    return result

