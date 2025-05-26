from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..database.mongodb import get_database
from .trace_repository import TraceRepository
from .transaction_tracker import TransactionType, TransactionOrigin, EventType, TransactionStatus

router = APIRouter(
    prefix="/api/tracing",
    tags=["tracing"],
    responses={404: {"description": "Not found"}},
)

async def get_trace_repository(db: AsyncIOMotorDatabase = Depends(get_database)) -> TraceRepository:
    """
    Dependency para injetar o TraceRepository.
    """
    return TraceRepository(db)

@router.get("/transactions/{transaction_id}")
async def get_transaction(
    transaction_id: str,
    include_events: bool = False,
    repository: TraceRepository = Depends(get_trace_repository)
):
    """
    Recupera informações detalhadas sobre uma transação específica.
    """
    # Obter resumo da transação
    transaction = await repository.get_transaction_summary(transaction_id)
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    # Incluir eventos se solicitado
    if include_events:
        events = await repository.get_events_by_transaction_id(transaction_id)
        transaction["events"] = events
    
    return transaction

@router.get("/transactions")
async def search_transactions(
    type: Optional[str] = None,
    origin: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    module: Optional[str] = None,
    sort_by: str = "start_time",
    sort_direction: int = -1,
    skip: int = 0,
    limit: int = 50,
    repository: TraceRepository = Depends(get_trace_repository)
):
    """
    Pesquisa transações com base em filtros específicos.
    """
    # Construir filtros
    filters = {}
    
    if type:
        filters["type"] = type
    
    if origin:
        filters["origin"] = origin
    
    if status:
        filters["status"] = status
    
    if module:
        filters["modules"] = module
    
    # Processar datas
    if start_date:
        try:
            start_datetime = datetime.fromisoformat(start_date)
            filters["start_time"] = filters.get("start_time", {})
            filters["start_time"]["$gte"] = start_datetime
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido para start_date")
    
    if end_date:
        try:
            end_datetime = datetime.fromisoformat(end_date)
            filters["start_time"] = filters.get("start_time", {})
            filters["start_time"]["$lte"] = end_datetime
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido para end_date")
    
    # Executar pesquisa
    transactions = await repository.search_transactions(
        filters=filters,
        sort_by=sort_by,
        sort_direction=sort_direction,
        skip=skip,
        limit=limit
    )
    
    return {
        "total": len(transactions),
        "skip": skip,
        "limit": limit,
        "transactions": transactions
    }

@router.get("/events/{transaction_id}")
async def get_transaction_events(
    transaction_id: str,
    repository: TraceRepository = Depends(get_trace_repository)
):
    """
    Recupera todos os eventos associados a uma transação específica.
    """
    events = await repository.get_events_by_transaction_id(transaction_id)
    
    if not events:
        raise HTTPException(status_code=404, detail="Eventos não encontrados para esta transação")
    
    return events

@router.get("/stats")
async def get_transaction_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    group_by: str = "type",
    repository: TraceRepository = Depends(get_trace_repository)
):
    """
    Recupera estatísticas agregadas de transações.
    """
    # Processar datas
    start_datetime = None
    end_datetime = None
    
    if start_date:
        try:
            start_datetime = datetime.fromisoformat(start_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido para start_date")
    
    if end_date:
        try:
            end_datetime = datetime.fromisoformat(end_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido para end_date")
    
    # Validar group_by
    valid_group_by = ["type", "origin", "status", "first_module", "last_module"]
    if group_by not in valid_group_by:
        raise HTTPException(
            status_code=400, 
            detail=f"Valor inválido para group_by. Valores permitidos: {', '.join(valid_group_by)}"
        )
    
    # Obter estatísticas
    stats = await repository.get_transaction_stats(
        start_time=start_datetime,
        end_time=end_datetime,
        group_by=group_by
    )
    
    return {
        "group_by": group_by,
        "start_date": start_datetime.isoformat() if start_datetime else None,
        "end_date": end_datetime.isoformat() if end_datetime else None,
        "stats": stats
    }

@router.get("/types")
async def get_transaction_types():
    """
    Retorna todos os tipos de transação disponíveis.
    """
    return {
        "types": [t.value for t in TransactionType]
    }

@router.get("/origins")
async def get_transaction_origins():
    """
    Retorna todas as origens de transação disponíveis.
    """
    return {
        "origins": [o.value for o in TransactionOrigin]
    }

@router.get("/event-types")
async def get_event_types():
    """
    Retorna todos os tipos de evento disponíveis.
    """
    return {
        "event_types": [e.value for e in EventType]
    }

@router.get("/statuses")
async def get_transaction_statuses():
    """
    Retorna todos os status de transação disponíveis.
    """
    return {
        "statuses": [s.value for s in TransactionStatus]
    }
