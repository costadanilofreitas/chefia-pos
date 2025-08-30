from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel

from src.auth.auth import get_current_user
from src.waiter.models.table_layout_models import (
    TableLayout,
    TableLayoutConfig,
    TableStatus,
)
from src.waiter.services.table_layout_service import TableLayoutService

router = APIRouter(prefix="/api/waiter/tables", tags=["waiter"])


# Dependência para obter o serviço de layout de mesas
def get_table_layout_service():
    # Aqui seria a lógica para obter o serviço do container de DI
    # Por enquanto, vamos criar uma instância diretamente
    from src.core.database.db_service import get_db_service

    db_service = get_db_service()
    return TableLayoutService(db_service)


# Modelos para requisições
class CreateLayoutRequest(BaseModel):
    restaurant_id: str
    store_id: str
    name: str
    description: Optional[str] = None
    tables: List[Dict[str, Any]] = []
    sections: List[Dict[str, Any]] = []
    background_image: Optional[str] = None
    background_color: str = "#FFFFFF"
    width: int = 1000
    height: int = 800
    metadata: Dict[str, Any] = {}


class UpdateLayoutRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tables: Optional[List[Dict[str, Any]]] = None
    sections: Optional[List[Dict[str, Any]]] = None
    background_image: Optional[str] = None
    background_color: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    is_active: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None


class UpdateTableStatusRequest(BaseModel):
    status: TableStatus
    order_id: Optional[str] = None
    waiter_id: Optional[str] = None


class UpdateConfigRequest(BaseModel):
    active_layout_id: Optional[str] = None
    auto_assign_waiter: Optional[bool] = None
    table_status_colors: Optional[Dict[str, str]] = None


# Rotas para gerenciamento de layouts
@router.post("/layouts", response_model=TableLayout)
async def create_layout(
    request: CreateLayoutRequest,
    service: TableLayoutService = Depends(get_table_layout_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Cria um novo layout de mesas."""
    try:
        layout = await service.create_layout(request.dict())
        return layout
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/layouts", response_model=List[TableLayout])
async def get_layouts(
    restaurant_id: str = Query(..., description="ID do restaurante"),
    store_id: str = Query(..., description="ID da loja"),
    service: TableLayoutService = Depends(get_table_layout_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Obtém todos os layouts de um restaurante/loja."""
    layouts = await service.get_layouts_by_restaurant(restaurant_id, store_id)
    return layouts


@router.get("/layouts/active", response_model=TableLayout)
async def get_active_layout(
    restaurant_id: str = Query(..., description="ID do restaurante"),
    store_id: str = Query(..., description="ID da loja"),
    service: TableLayoutService = Depends(get_table_layout_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Obtém o layout ativo para um restaurante/loja."""
    layout = await service.get_active_layout(restaurant_id, store_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout ativo não encontrado")
    return layout


@router.get("/layouts/{layout_id}", response_model=TableLayout)
async def get_layout(
    layout_id: str = Path(..., description="ID do layout"),
    service: TableLayoutService = Depends(get_table_layout_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Obtém um layout pelo ID."""
    layout = await service.get_layout(layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout não encontrado")
    return layout


@router.put("/layouts/{layout_id}", response_model=TableLayout)
async def update_layout(
    layout_id: str = Path(..., description="ID do layout"),
    request: UpdateLayoutRequest = None,
    service: TableLayoutService = Depends(get_table_layout_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Atualiza um layout existente."""
    if not request:
        raise HTTPException(
            status_code=400, detail="Dados de atualização não fornecidos"
        )

    # Filtrar campos None
    update_data = {k: v for k, v in request.dict().items() if v is not None}

    layout = await service.update_layout(layout_id, update_data)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout não encontrado")

    return layout


@router.delete("/layouts/{layout_id}", response_model=Dict[str, bool])
async def delete_layout(
    layout_id: str = Path(..., description="ID do layout"),
    service: TableLayoutService = Depends(get_table_layout_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Exclui um layout."""
    success = await service.delete_layout(layout_id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Não foi possível excluir o layout. Verifique se não é o layout ativo.",
        )

    return {"success": True}


@router.post("/layouts/{layout_id}/activate", response_model=Dict[str, bool])
async def set_active_layout(
    layout_id: str = Path(..., description="ID do layout"),
    restaurant_id: str = Query(..., description="ID do restaurante"),
    store_id: str = Query(..., description="ID da loja"),
    service: TableLayoutService = Depends(get_table_layout_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Define um layout como ativo."""
    success = await service.set_active_layout(restaurant_id, store_id, layout_id)
    if not success:
        raise HTTPException(
            status_code=400, detail="Não foi possível definir o layout como ativo"
        )

    return {"success": True}


# Rotas para gerenciamento de mesas
@router.put(
    "/layouts/{layout_id}/tables/{table_id}/status", response_model=Dict[str, bool]
)
async def update_table_status(
    layout_id: str = Path(..., description="ID do layout"),
    table_id: str = Path(..., description="ID da mesa"),
    request: UpdateTableStatusRequest = None,
    service: TableLayoutService = Depends(get_table_layout_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Atualiza o status de uma mesa."""
    if not request:
        raise HTTPException(
            status_code=400, detail="Dados de atualização não fornecidos"
        )

    success = await service.update_table_status(
        layout_id, table_id, request.status, request.order_id, request.waiter_id
    )

    if not success:
        raise HTTPException(status_code=404, detail="Layout ou mesa não encontrados")

    return {"success": True}


@router.get("/by-status", response_model=List[Dict[str, Any]])
async def get_tables_by_status(
    restaurant_id: str = Query(..., description="ID do restaurante"),
    store_id: str = Query(..., description="ID da loja"),
    status: Optional[TableStatus] = Query(None, description="Status para filtrar"),
    service: TableLayoutService = Depends(get_table_layout_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Obtém mesas pelo status."""
    tables = await service.get_tables_by_status(restaurant_id, store_id, status)
    return tables


@router.get("/by-order/{order_id}", response_model=Dict[str, Any])
async def get_table_with_order(
    order_id: str = Path(..., description="ID do pedido"),
    service: TableLayoutService = Depends(get_table_layout_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Encontra a mesa associada a um pedido."""
    table = await service.get_table_with_order(order_id)
    if not table:
        raise HTTPException(
            status_code=404, detail="Mesa não encontrada para este pedido"
        )

    return table


# Rotas para configuração de layout
@router.get("/config", response_model=TableLayoutConfig)
async def get_layout_config(
    restaurant_id: str = Query(..., description="ID do restaurante"),
    store_id: str = Query(..., description="ID da loja"),
    service: TableLayoutService = Depends(get_table_layout_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Obtém a configuração de layout para um restaurante/loja."""
    config = await service.get_layout_config(restaurant_id, store_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")

    return config


@router.put("/config", response_model=TableLayoutConfig)
async def update_layout_config(
    restaurant_id: str = Query(..., description="ID do restaurante"),
    store_id: str = Query(..., description="ID da loja"),
    request: UpdateConfigRequest = None,
    service: TableLayoutService = Depends(get_table_layout_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Atualiza a configuração de layout."""
    if not request:
        raise HTTPException(
            status_code=400, detail="Dados de atualização não fornecidos"
        )

    # Filtrar campos None
    update_data = {k: v for k, v in request.dict().items() if v is not None}

    config = await service.update_layout_config(restaurant_id, store_id, update_data)
    if not config:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")

    return config
