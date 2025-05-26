from typing import Dict, List, Optional, Any, Union
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body, status
from fastapi.responses import JSONResponse
from datetime import datetime

from src.sat.models.sat_models import (
    SATConfig,
    SATStatus,
    SATResponse,
    SATStatusResponse,
    SATEmitRequest,
    SATCancelRequest,
    CFe
)
from src.sat.services.sat_service import get_sat_service
from src.auth.security import get_current_user
from src.auth.models import User, Permission

router = APIRouter(prefix="/api/v1", tags=["sat"])

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

@router.get("/sat/status/{terminal_id}", response_model=SATStatusResponse)
async def get_sat_status(
    terminal_id: str,
    current_user: User = Depends(get_current_user)
):
    """Obtém o status do SAT para um terminal específico."""
    _check_permissions(current_user, ["sat.read"])
    
    sat_service = get_sat_service()
    
    # Verificar se o SAT está habilitado
    is_enabled = await sat_service.is_enabled(terminal_id)
    if not is_enabled:
        return SATStatusResponse(
            status=SATStatus.OFFLINE,
            message="SAT não habilitado para este terminal"
        )
    
    # Obter status
    return await sat_service.get_status(terminal_id)

@router.post("/sat/emit", response_model=SATResponse)
async def emit_cfe(
    request: SATEmitRequest,
    current_user: User = Depends(get_current_user)
):
    """Emite um CF-e para um pedido."""
    _check_permissions(current_user, ["sat.emit"])
    
    sat_service = get_sat_service()
    
    # Verificar se o SAT está habilitado
    is_enabled = await sat_service.is_enabled(request.terminal_id)
    if not is_enabled:
        return SATResponse(
            success=False,
            message="SAT não habilitado para este terminal"
        )
    
    # Buscar pedido (em uma implementação real, seria do banco de dados)
    # Aqui estamos simulando um pedido para fins de demonstração
    order_data = {
        "id": request.order_id,
        "total": 100.0,
        "discount": 0,
        "service_fee": 0,
        "items": [
            {
                "product_id": "P001",
                "name": "Produto Teste",
                "quantity": 2,
                "unit": "UN",
                "price": 50.0,
                "total": 100.0
            }
        ],
        "payment": {
            "method": "CREDIT_CARD",
            "amount": 100.0,
            "card_acquirer": "CIELO",
            "card_authorization": "123456"
        }
    }
    
    # Adicionar informações do cliente, se fornecidas
    if request.customer_document or request.customer_name:
        order_data["customer"] = {}
        if request.customer_document:
            order_data["customer"]["document"] = request.customer_document
        if request.customer_name:
            order_data["customer"]["name"] = request.customer_name
    
    # Emitir CF-e
    return await sat_service.emit_cfe(order_data, request.terminal_id)

@router.post("/sat/cancel", response_model=SATResponse)
async def cancel_cfe(
    request: SATCancelRequest,
    current_user: User = Depends(get_current_user)
):
    """Cancela um CF-e."""
    _check_permissions(current_user, ["sat.cancel"])
    
    sat_service = get_sat_service()
    
    # Extrair terminal_id do CF-e (em uma implementação real, seria do banco de dados)
    # Aqui estamos usando um terminal_id fixo para fins de demonstração
    terminal_id = "1"
    
    # Cancelar CF-e
    return await sat_service.cancel_cfe(request.cfe_id, request.reason, terminal_id)

@router.get("/sat/config", response_model=SATConfig)
async def get_sat_config(
    current_user: User = Depends(get_current_user)
):
    """Obtém a configuração global do SAT."""
    _check_permissions(current_user, ["sat.config"])
    
    sat_service = get_sat_service()
    return sat_service.config

@router.put("/sat/config", response_model=SATConfig)
async def update_sat_config(
    config_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Atualiza a configuração global do SAT."""
    _check_permissions(current_user, ["sat.config"])
    
    sat_service = get_sat_service()
    success = await sat_service.update_config(config_data)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao atualizar configuração do SAT"
        )
    
    return sat_service.config

@router.put("/sat/config/{terminal_id}", response_model=Dict[str, Any])
async def update_terminal_sat_config(
    terminal_id: str,
    config_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Atualiza a configuração do SAT para um terminal específico."""
    _check_permissions(current_user, ["sat.config"])
    
    sat_service = get_sat_service()
    success = await sat_service.update_terminal_config(terminal_id, config_data)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Terminal {terminal_id} não encontrado ou erro ao atualizar configuração"
        )
    
    return {"success": True, "terminal_id": terminal_id}

@router.get("/sat/logs", response_model=List[Dict[str, Any]])
async def get_sat_logs(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    """Obtém logs de operações do SAT."""
    _check_permissions(current_user, ["sat.read"])
    
    sat_service = get_sat_service()
    logs = await sat_service.get_logs(limit, offset)
    
    # Converter para dicionários para serialização
    return [log.dict() for log in logs]

@router.post("/sat/process-pending", response_model=Dict[str, Any])
async def process_pending_cfes(
    current_user: User = Depends(get_current_user)
):
    """Processa CF-e pendentes em modo de contingência."""
    _check_permissions(current_user, ["sat.emit"])
    
    sat_service = get_sat_service()
    return await sat_service.process_pending_cfes()
