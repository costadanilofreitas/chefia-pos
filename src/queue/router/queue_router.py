"""
Queue Management Router
Endpoints da API para gerenciamento de filas
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from src.auth.dependencies import get_current_user
from src.core.models.user import User
from src.queue.models.queue_models import (
    QueueEntry,
    QueueEntryCreate,
    QueueEntryUpdate,
    QueueNotification,
    QueuePosition,
    QueueStatistics,
    QueueStatus,
    TableSuggestion,
    WaitTimeEstimate,
)
from src.queue.services.queue_service import queue_service

router = APIRouter(prefix="/api/v1/tables/queue", tags=["Queue Management"])


@router.post("/", response_model=QueueEntry)
async def add_to_queue(
    entry_data: QueueEntryCreate,
    current_user: User = Depends(get_current_user)
):
    """Adiciona cliente à fila de espera"""
    return await queue_service.add_to_queue(
        entry_data=entry_data,
        store_id=current_user.store_id,
        user_id=str(current_user.id),
        terminal_id=current_user.terminal_id or "unknown"
    )


@router.get("/", response_model=List[QueueEntry])
async def list_queue(
    status: Optional[QueueStatus] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Lista entradas na fila"""
    return await queue_service.get_queue_list(
        store_id=current_user.store_id,
        status_filter=status
    )


@router.get("/statistics", response_model=QueueStatistics)
async def get_queue_statistics(
    current_user: User = Depends(get_current_user)
):
    """Obtém estatísticas da fila"""
    return await queue_service.get_statistics(current_user.store_id)


@router.get("/estimate", response_model=WaitTimeEstimate)
async def estimate_wait_time(
    party_size: int = Query(..., ge=1, le=20),
    current_user: User = Depends(get_current_user)
):
    """Estima tempo de espera para um tamanho de grupo"""
    return await queue_service.estimate_wait_time(
        party_size=party_size,
        store_id=current_user.store_id
    )


@router.get("/{entry_id}", response_model=QueueEntry)
async def get_queue_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user)
):
    """Obtém detalhes de uma entrada específica"""
    entry = queue_service.queue_entries.get(entry_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queue entry not found"
        )
    return entry


@router.get("/{entry_id}/position", response_model=QueuePosition)
async def get_queue_position(entry_id: str):
    """Obtém posição atual na fila (público)"""
    return await queue_service.get_position(entry_id)


@router.put("/{entry_id}", response_model=QueueEntry)
async def update_queue_entry(
    entry_id: str,
    update_data: QueueEntryUpdate,
    current_user: User = Depends(get_current_user)
):
    """Atualiza entrada na fila"""
    return await queue_service.update_queue_entry(
        entry_id=entry_id,
        update_data=update_data,
        user_id=str(current_user.id),
        terminal_id=current_user.terminal_id or "unknown"
    )


@router.post("/{entry_id}/notify", response_model=QueueNotification)
async def notify_customer(
    entry_id: str,
    current_user: User = Depends(get_current_user)
):
    """Notifica cliente que mesa está pronta"""
    return await queue_service.notify_customer(
        entry_id=entry_id,
        user_id=str(current_user.id),
        terminal_id=current_user.terminal_id or "unknown"
    )


@router.post("/{entry_id}/seat", response_model=QueueEntry)
async def seat_customer(
    entry_id: str,
    table_id: str,
    current_user: User = Depends(get_current_user)
):
    """Marca cliente como sentado"""
    return await queue_service.seat_customer(
        entry_id=entry_id,
        table_id=table_id,
        user_id=str(current_user.id),
        terminal_id=current_user.terminal_id or "unknown"
    )


@router.post("/{entry_id}/no-show", response_model=QueueEntry)
async def mark_no_show(
    entry_id: str,
    current_user: User = Depends(get_current_user)
):
    """Marca cliente como no-show"""
    return await queue_service.mark_no_show(
        entry_id=entry_id,
        user_id=str(current_user.id),
        terminal_id=current_user.terminal_id or "unknown"
    )


@router.delete("/{entry_id}", response_model=QueueEntry)
async def cancel_queue_entry(
    entry_id: str,
    reason: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Cancela/Remove entrada da fila"""
    return await queue_service.cancel_entry(
        entry_id=entry_id,
        reason=reason,
        user_id=str(current_user.id),
        terminal_id=current_user.terminal_id or "unknown"
    )


@router.post("/{entry_id}/suggestions", response_model=List[TableSuggestion])
async def get_table_suggestions(
    entry_id: str,
    available_tables: List[dict],
    current_user: User = Depends(get_current_user)
):
    """Sugere melhores mesas para um grupo"""
    return await queue_service.suggest_tables(
        entry_id=entry_id,
        available_tables=available_tables
    )


# Public endpoints (sem autenticação)

@router.get("/public/{token}", response_model=QueuePosition)
async def get_public_queue_position(token: str):
    """Endpoint público para cliente verificar posição na fila"""
    # TODO: Implementar sistema de tokens para acesso público
    # Por enquanto usando entry_id como token
    return await queue_service.get_position(token)


@router.post("/public/{token}/leave")
async def leave_queue(token: str):
    """Endpoint público para cliente sair da fila"""
    # TODO: Implementar sistema de tokens
    return await queue_service.cancel_entry(
        entry_id=token,
        reason="Customer left queue",
        user_id="customer",
        terminal_id="public"
    )
