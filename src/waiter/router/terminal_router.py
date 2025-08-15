from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query

from ..models.terminal_models import (
    OfflineOrder,
    TerminalConfig,
    TerminalSession,
    TerminalStatus,
)
from ..services.terminal_service import TerminalService

router = APIRouter(prefix="/api/waiter/terminal", tags=["terminal"])


@router.get("/configs", response_model=List[TerminalConfig])
async def get_terminal_configs(
    restaurant_id: str = Query(..., description="ID do restaurante"),
    store_id: str = Query(..., description="ID da loja"),
    terminal_service: TerminalService = Depends(),
):
    """Obtém todas as configurações de terminais para um restaurante/loja."""
    return await terminal_service.get_terminal_configs(restaurant_id, store_id)


@router.get("/configs/{terminal_id}", response_model=TerminalConfig)
async def get_terminal_config(
    terminal_id: str = Path(..., description="ID do terminal"),
    terminal_service: TerminalService = Depends(),
):
    """Obtém a configuração de um terminal específico."""
    config = await terminal_service.get_terminal_config(terminal_id)
    if not config:
        raise HTTPException(status_code=404, detail="Terminal não encontrado")
    return config


@router.post("/configs", response_model=TerminalConfig)
async def create_terminal_config(
    config: TerminalConfig, terminal_service: TerminalService = Depends()
):
    """Cria uma nova configuração de terminal."""
    return await terminal_service.create_terminal_config(config)


@router.put("/configs/{terminal_id}", response_model=TerminalConfig)
async def update_terminal_config(
    config: TerminalConfig,
    terminal_id: str = Path(..., description="ID do terminal"),
    terminal_service: TerminalService = Depends(),
):
    """Atualiza a configuração de um terminal."""
    if terminal_id != config.id:
        raise HTTPException(
            status_code=400,
            detail="ID do terminal na URL não corresponde ao ID no corpo",
        )

    updated_config = await terminal_service.update_terminal_config(config)
    if not updated_config:
        raise HTTPException(status_code=404, detail="Terminal não encontrado")
    return updated_config


@router.delete("/configs/{terminal_id}", response_model=Dict[str, bool])
async def delete_terminal_config(
    terminal_id: str = Path(..., description="ID do terminal"),
    terminal_service: TerminalService = Depends(),
):
    """Remove a configuração de um terminal."""
    success = await terminal_service.delete_terminal_config(terminal_id)
    if not success:
        raise HTTPException(status_code=404, detail="Terminal não encontrado")
    return {"success": True}


@router.post("/sessions", response_model=TerminalSession)
async def create_terminal_session(
    terminal_id: str = Query(..., description="ID do terminal"),
    waiter_id: str = Query(..., description="ID do garçom"),
    terminal_service: TerminalService = Depends(),
):
    """Inicia uma nova sessão em um terminal."""
    session = await terminal_service.create_terminal_session(terminal_id, waiter_id)
    if not session:
        raise HTTPException(status_code=400, detail="Não foi possível criar a sessão")
    return session


@router.get("/sessions/{session_id}", response_model=TerminalSession)
async def get_terminal_session(
    session_id: str = Path(..., description="ID da sessão"),
    terminal_service: TerminalService = Depends(),
):
    """Obtém os detalhes de uma sessão de terminal."""
    session = await terminal_service.get_terminal_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    return session


@router.put("/sessions/{session_id}/status", response_model=TerminalSession)
async def update_terminal_status(
    status: TerminalStatus,
    session_id: str = Path(..., description="ID da sessão"),
    battery_level: Optional[int] = Query(
        None, description="Nível de bateria em percentual"
    ),
    signal_strength: Optional[int] = Query(
        None, description="Força do sinal em percentual"
    ),
    terminal_service: TerminalService = Depends(),
):
    """Atualiza o status de um terminal."""
    session = await terminal_service.update_terminal_status(
        session_id, status, battery_level, signal_strength
    )
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    return session


@router.post("/offline/orders", response_model=OfflineOrder)
async def create_offline_order(
    order: OfflineOrder, terminal_service: TerminalService = Depends()
):
    """Registra um pedido criado em modo offline."""
    return await terminal_service.create_offline_order(order)


@router.get("/offline/orders", response_model=List[OfflineOrder])
async def get_offline_orders(
    terminal_id: str = Query(..., description="ID do terminal"),
    synced: Optional[bool] = Query(
        None, description="Filtrar por status de sincronização"
    ),
    terminal_service: TerminalService = Depends(),
):
    """Obtém pedidos offline de um terminal."""
    return await terminal_service.get_offline_orders(terminal_id, synced)


@router.post("/sync", response_model=Dict[str, Any])
async def sync_terminal_data(
    terminal_id: str = Query(..., description="ID do terminal"),
    session_id: str = Query(..., description="ID da sessão"),
    terminal_service: TerminalService = Depends(),
):
    """Sincroniza dados entre o terminal e o servidor."""
    result = await terminal_service.sync_terminal_data(terminal_id, session_id)
    return result
