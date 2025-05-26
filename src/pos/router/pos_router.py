from typing import List, Dict, Any, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Body, status # Added status
from datetime import datetime
import os # Added for path joining

from src.pos.models.pos_models import (
    POSSession, 
    POSSessionCreate, 
    POSSessionUpdate, 
    POSSessionStatus,
    POSSessionSummary,
    PaymentTransaction,
    PaymentTransactionCreate,
    PaymentTransactionUpdate,
    PaymentMethod,
    PaymentStatus,
    Receipt,
    ReceiptCreate,
    ReceiptType,
    CashOperation,
    CashOperationCreate,
    POSReport,
    POSReportCreate,
    POSConfig
)
from src.pos.services.pos_service import get_pos_service
from src.auth.security import get_current_user, has_permission 
from src.auth.models import User, Permission # Import User and Permission
from src.core.dependencies import check_instance_license, CONFIG_DIR # Import the dependency and config dir

router = APIRouter(prefix="/api/v1", tags=["pos"])

# Dependency for checking POS instance license
check_pos_license = check_instance_license("pos")

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

# Endpoints para Sessões POS
@router.post("/pos/sessions", response_model=POSSession)
async def create_pos_session(
    session_data: POSSessionCreate,
    pos_id: int = Depends(check_pos_license), # Check license based on query param
    current_user: User = Depends(get_current_user),
):
    """
    Cria uma nova sessão POS para uma instância licenciada.
    
    - **pos_id**: ID da instância POS licenciada (obrigatório via query param)
    - Requer permissão: CASHIER_OPEN
    """
    _check_permissions(current_user, [Permission.CASHIER_OPEN]) # Corrected permission
    pos_service = get_pos_service()
    try:
        return await pos_service.create_session(session_data, current_user.id, pos_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/pos/sessions/{session_id}", response_model=POSSession)
async def get_pos_session(
    session_id: str = Path(..., description="ID da sessão POS"),
    current_user: User = Depends(get_current_user)
):
    """
    Busca uma sessão POS pelo ID.
    Requer permissão: SALE_READ
    """
    _check_permissions(current_user, [Permission.SALE_READ]) # Corrected permission
    pos_service = get_pos_service()
    session = await pos_service.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Sessão POS não encontrada")
        
    config_file_path = os.path.join(CONFIG_DIR, "pos", f"{session.pos_id}.json")
    if not os.path.exists(config_file_path):
        raise HTTPException(status_code=403, detail=f"Instance ID {session.pos_id} associated with this session is no longer licensed.")
        
    return session

@router.get("/pos/sessions", response_model=List[POSSessionSummary])
async def list_pos_sessions(
    pos_id: Optional[int] = Query(None, description="Filtrar por ID da instância POS licenciada"),
    terminal_id: Optional[str] = Query(None, description="Filtrar por terminal"),
    cashier_id: Optional[str] = Query(None, description="Filtrar por caixa"),
    user_id: Optional[str] = Query(None, description="Filtrar por usuário"),
    business_day_id: Optional[str] = Query(None, description="Filtrar por dia de operação"),
    status: Optional[POSSessionStatus] = Query(None, description="Filtrar por status"),
    start_date: Optional[str] = Query(None, description="Data inicial (formato ISO)"),
    end_date: Optional[str] = Query(None, description="Data final (formato ISO)"),
    limit: int = Query(50, description="Limite de resultados"),
    offset: int = Query(0, description="Deslocamento para paginação"),
    current_user: User = Depends(get_current_user)
):
    """
    Lista sessões POS com filtros, opcionalmente por instância licenciada.
    Requer permissão: SALE_READ
    
    - **pos_id**: ID da instância POS licenciada (opcional via query param)
    """
    _check_permissions(current_user, [Permission.SALE_READ]) # Corrected permission
    if pos_id is not None:
        config_file_path = os.path.join(CONFIG_DIR, "pos", f"{pos_id}.json")
        if not os.path.exists(config_file_path):
            raise HTTPException(
                status_code=403,
                detail=f"Instance ID {pos_id} for module pos is not licensed."
            )
            
    pos_service = get_pos_service()
    return await pos_service.list_sessions(
        pos_id=pos_id,
        terminal_id=terminal_id,
        cashier_id=cashier_id,
        user_id=user_id,
        business_day_id=business_day_id,
        status=status,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )

@router.put("/pos/sessions/{session_id}", response_model=POSSession)
async def update_pos_session(
    session_update: POSSessionUpdate,
    session_id: str = Path(..., description="ID da sessão POS"),
    current_user: User = Depends(get_current_user),
):
    """
    Atualiza uma sessão POS.
    Requer permissão: SALE_UPDATE
    """
    _check_permissions(current_user, [Permission.SALE_UPDATE]) # Corrected permission
    pos_service = get_pos_service()
    try:
        existing_session = await pos_service.get_session(session_id)
        if not existing_session:
             raise HTTPException(status_code=404, detail="Sessão POS não encontrada")
        config_file_path = os.path.join(CONFIG_DIR, "pos", f"{existing_session.pos_id}.json")
        if not os.path.exists(config_file_path):
            raise HTTPException(status_code=403, detail=f"Instance ID {existing_session.pos_id} associated with this session is no longer licensed.")
            
        session = await pos_service.update_session(session_id, session_update)
        if not session:
            raise HTTPException(status_code=404, detail="Sessão POS não encontrada após atualização")
        return session
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/pos/sessions/{session_id}/close", response_model=POSSession)
async def close_pos_session(
    session_id: str = Path(..., description="ID da sessão POS"),
    closing_balance: float = Body(..., embed=True, description="Saldo de fechamento"),
    notes: Optional[str] = Body(None, embed=True, description="Observações"),
    current_user: User = Depends(get_current_user),
):
    """
    Fecha uma sessão POS.
    Requer permissão: CASHIER_CLOSE
    """
    _check_permissions(current_user, [Permission.CASHIER_CLOSE]) # Corrected permission
    pos_service = get_pos_service()
    try:
        existing_session = await pos_service.get_session(session_id)
        if not existing_session:
             raise HTTPException(status_code=404, detail="Sessão POS não encontrada")
        config_file_path = os.path.join(CONFIG_DIR, "pos", f"{existing_session.pos_id}.json")
        if not os.path.exists(config_file_path):
            raise HTTPException(status_code=403, detail=f"Instance ID {existing_session.pos_id} associated with this session is no longer licensed.")
            
        session = await pos_service.close_session(session_id, closing_balance, notes)
        if not session:
            raise HTTPException(status_code=404, detail="Sessão POS não encontrada após fechamento")
        return session
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/pos/sessions/{session_id}/suspend", response_model=POSSession)
async def suspend_pos_session(
    session_id: str = Path(..., description="ID da sessão POS"),
    reason: str = Body(..., embed=True, description="Motivo da suspensão"),
    current_user: User = Depends(get_current_user),
):
    """
    Suspende uma sessão POS.
    Requer permissão: SALE_UPDATE
    """
    _check_permissions(current_user, [Permission.SALE_UPDATE]) # Corrected permission
    pos_service = get_pos_service()
    try:
        existing_session = await pos_service.get_session(session_id)
        if not existing_session:
             raise HTTPException(status_code=404, detail="Sessão POS não encontrada")
        config_file_path = os.path.join(CONFIG_DIR, "pos", f"{existing_session.pos_id}.json")
        if not os.path.exists(config_file_path):
            raise HTTPException(status_code=403, detail=f"Instance ID {existing_session.pos_id} associated with this session is no longer licensed.")
            
        session = await pos_service.suspend_session(session_id, reason)
        if not session:
            raise HTTPException(status_code=404, detail="Sessão POS não encontrada após suspensão")
        return session
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# Exemplo: Pagamento (verificação implícita pela sessão)
@router.post("/pos/payments", response_model=PaymentTransaction)
async def create_payment_transaction(
    payment_data: PaymentTransactionCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Cria uma nova transação de pagamento.
    A licença é verificada pela sessão POS associada.
    Requer permissão: SALE_CREATE
    """
    _check_permissions(current_user, [Permission.SALE_CREATE]) # Corrected permission
    pos_service = get_pos_service()
    try:
        return await pos_service.create_payment(payment_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as e:
        if e.status_code == 403:
            raise e
        raise HTTPException(status_code=400, detail="Erro ao processar pagamento")

@router.get("/pos/config", response_model=POSConfig) 
async def get_pos_config(
    pos_id: int = Depends(check_pos_license),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna a configuração específica para uma instância POS licenciada.
    Requer permissão: SALE_READ
    
    - **pos_id**: ID da instância POS licenciada (obrigatório via query param)
    """
    _check_permissions(current_user, [Permission.SALE_READ]) # Corrected permission
    
    pos_service = get_pos_service()
    config = await pos_service.get_instance_config(pos_id)
    if not config:
         raise HTTPException(status_code=404, detail=f"Configuração para POS ID {pos_id} não encontrada")
    return config

@router.get("/pos/payments/{payment_id}", response_model=PaymentTransaction)
async def get_payment_transaction(payment_id: str, current_user: User = Depends(get_current_user)): 
    _check_permissions(current_user, [Permission.SALE_READ]) # Corrected permission
    raise HTTPException(status_code=501, detail="Not Implemented")

@router.get("/pos/payments", response_model=List[PaymentTransaction])
async def list_payment_transactions(current_user: User = Depends(get_current_user)): 
    _check_permissions(current_user, [Permission.SALE_READ]) # Corrected permission
    raise HTTPException(status_code=501, detail="Not Implemented")

@router.put("/pos/payments/{payment_id}", response_model=PaymentTransaction)
async def update_payment_transaction(payment_id: str, payment_update: PaymentTransactionUpdate, current_user: User = Depends(get_current_user)): 
    _check_permissions(current_user, [Permission.SALE_UPDATE]) # Corrected permission
    raise HTTPException(status_code=501, detail="Not Implemented")

@router.post("/pos/payments/{payment_id}/refund", response_model=PaymentTransaction)
async def refund_payment(payment_id: str, reason: str = Body(...), current_user: User = Depends(get_current_user)): 
    _check_permissions(current_user, [Permission.SALE_UPDATE]) # Corrected permission (assuming update covers refund)
    raise HTTPException(status_code=501, detail="Not Implemented")

@router.post("/pos/cash-operations", response_model=CashOperation)
async def create_cash_operation(operation_data: CashOperationCreate, current_user: User = Depends(get_current_user)): 
    _check_permissions(current_user, [Permission.CASHIER_WITHDRAW]) # Corrected permission
    raise HTTPException(status_code=501, detail="Not Implemented")

@router.get("/pos/cash-operations/{operation_id}", response_model=CashOperation)
async def get_cash_operation(operation_id: str, current_user: User = Depends(get_current_user)): 
    _check_permissions(current_user, [Permission.SALE_READ]) # Corrected permission
    raise HTTPException(status_code=501, detail="Not Implemented")

@router.get("/pos/cash-operations", response_model=List[CashOperation])
async def list_cash_operations(current_user: User = Depends(get_current_user)): 
    _check_permissions(current_user, [Permission.SALE_READ]) # Corrected permission
    raise HTTPException(status_code=501, detail="Not Implemented")

@router.post("/pos/receipts", response_model=Receipt)
async def create_receipt(receipt_data: ReceiptCreate, current_user: User = Depends(get_current_user)): 
    _check_permissions(current_user, [Permission.SALE_READ]) # Corrected permission (assuming read allows printing)
    raise HTTPException(status_code=501, detail="Not Implemented")

@router.get("/pos/receipts/{receipt_id}", response_model=Receipt)
async def get_receipt(receipt_id: str, current_user: User = Depends(get_current_user)): 
    _check_permissions(current_user, [Permission.SALE_READ]) # Corrected permission
    raise HTTPException(status_code=501, detail="Not Implemented")

@router.get("/pos/receipts", response_model=List[Receipt])
async def list_receipts(current_user: User = Depends(get_current_user)): 
    _check_permissions(current_user, [Permission.SALE_READ]) # Corrected permission
    raise HTTPException(status_code=501, detail="Not Implemented")

# Add other endpoints like reprint_receipt, generate_report, get_report, list_reports
# Ensure permissions are corrected for them as well.


