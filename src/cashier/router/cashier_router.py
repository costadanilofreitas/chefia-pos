from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import logging

from src.auth.security import get_current_active_user, has_permission
from src.auth.models import User, Permission
from src.cashier.models.cashier import (
    Cashier,
    CashierCreate,
    CashierUpdate,
    CashierClose,
    CashierOperation,
    CashierWithdrawal,
    CashierSummary,
    CashierOperationResponse,
    CashierStatus,
    OperationType,
    create_cashier
)
from src.cashier.services.cashier_service import (
    get_cashier_service
)
from src.business_day.services.business_day_service import (
    get_business_day_service
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/cashier",
    tags=["cashier"],
    responses={401: {"description": "Não autorizado"}},
)


@router.post("", response_model=Cashier, status_code=status.HTTP_201_CREATED)
async def open_cashier(
    cashier_create: CashierCreate,
    current_user: User = Depends(has_permission(Permission.CASHIER_OPEN))
):
    """
    Abre um novo caixa para um terminal específico.
    
    - Apenas usuários com permissão de abertura de caixa podem executar esta operação
    - Deve haver um dia de operação aberto
    - Um operador só pode ter um caixa aberto por vez
    - Um terminal só pode ter um caixa aberto por vez
    - O terminal_id é obrigatório e identifica o POS específico
    
    Retorna o caixa criado.
    """
    service = get_cashier_service()
    business_day_service = get_business_day_service()
    
    # Verificar se o terminal_id foi fornecido
    if not cashier_create.terminal_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O ID do terminal é obrigatório para abertura do caixa."
        )
    
    # Verificar se o operador já tem um caixa aberto
    operator_cashier = await service.get_cashier_by_operator(cashier_create.operator_id)
    if operator_cashier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"O operador já possui um caixa aberto (ID: {operator_cashier.id})."
        )
    
    # Verificar se o terminal específico já tem um caixa aberto
    terminal_cashier = await service.get_cashier_by_terminal(cashier_create.terminal_id)
    if terminal_cashier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"O terminal {cashier_create.terminal_id} já possui um caixa aberto (ID: {terminal_cashier.id})."
        )
    
    # Criar o caixa
    cashier = create_cashier(cashier_create, cashier_create.operator_id)
    
    # Salvar no repositório
    created_cashier = await service.create_cashier(cashier)
    
    return created_cashier


@router.put("/{cashier_id}/close", response_model=Cashier)
async def close_cashier(
    cashier_id: str,
    close_data: CashierClose,
    current_user: User = Depends(has_permission(Permission.CASHIER_CLOSE))
):
    """
    Fecha um caixa.
    
    - Apenas usuários com permissão de fechamento de caixa podem executar esta operação
    - O caixa deve estar aberto
    - O operador deve informar o valor físico em dinheiro para conferência
    
    Retorna o caixa fechado com os totais atualizados.
    """
    service = get_cashier_service()
    
    # Verificar se o caixa existe
    cashier = await service.get_cashier(cashier_id)
    if not cashier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Caixa com ID {cashier_id} não encontrado."
        )
    
    # Verificar se o caixa está aberto
    if cashier.status != CashierStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O caixa já está fechado."
        )
    
    # Verificar se o operador é o mesmo que abriu o caixa ou se é um gerente
    if cashier.current_operator_id != close_data.operator_id and current_user.role != "gerente":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o operador atual do caixa ou um gerente pode fechá-lo."
        )
    
    # Fechar o caixa
    closed_cashier = await service.close_cashier(
        cashier_id, 
        close_data.operator_id,
        close_data.physical_cash_amount,
        close_data.notes
    )
    
    return closed_cashier


@router.post("/{cashier_id}/operation", response_model=CashierOperationResponse)
async def register_cashier_operation(
    cashier_id: str,
    operation: CashierOperation,
    current_user: User = Depends(get_current_active_user)
):
    """
    Registra uma operação no caixa.
    
    - O caixa deve estar aberto
    - O operador deve ser o mesmo que está operando o caixa ou um gerente
    - Diferentes tipos de operação podem requerer permissões específicas
    
    Retorna a operação registrada com os saldos atualizados.
    """
    service = get_cashier_service()
    
    # Verificar se o caixa existe
    cashier = await service.get_cashier(cashier_id)
    if not cashier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Caixa com ID {cashier_id} não encontrado."
        )
    
    # Verificar se o caixa está aberto
    if cashier.status != CashierStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O caixa está fechado. Não é possível registrar operações."
        )
    
    # Verificar se o operador é o mesmo que está operando o caixa ou se é um gerente
    if cashier.current_operator_id != operation.operator_id and current_user.role != "gerente":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o operador atual do caixa ou um gerente pode registrar operações."
        )
    
    # Verificar permissões específicas para cada tipo de operação
    if operation.operation_type == OperationType.WITHDRAWAL and "cashier:withdrawal" not in current_user.permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para realizar retiradas do caixa."
        )
    
    # Registrar a operação
    operation_response = await service.register_operation(cashier_id, operation)
    
    return operation_response


@router.post("/{cashier_id}/withdrawal", response_model=CashierOperationResponse)
async def register_cashier_withdrawal(
    cashier_id: str,
    withdrawal: CashierWithdrawal,
    current_user: User = Depends(has_permission(Permission.CASHIER_WITHDRAW))
):
    """
    Registra uma ruptura (retirada de dinheiro) no caixa.
    
    - O caixa deve estar aberto
    - O operador deve ter permissão específica para retiradas
    - O valor da retirada não pode exceder o saldo atual do caixa
    
    Retorna a operação de retirada registrada com os saldos atualizados.
    """
    service = get_cashier_service()
    
    # Verificar se o caixa existe
    cashier = await service.get_cashier(cashier_id)
    if not cashier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Caixa com ID {cashier_id} não encontrado."
        )
    
    # Verificar se o caixa está aberto
    if cashier.status != CashierStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O caixa está fechado. Não é possível realizar retiradas."
        )
    
    # Verificar se o valor da retirada não excede o saldo atual
    if withdrawal.amount > cashier.current_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"O valor da retirada (R$ {withdrawal.amount:.2f}) excede o saldo atual do caixa (R$ {cashier.current_balance:.2f})."
        )
    
    # Criar operação de retirada
    operation = CashierOperation(
        operation_type=OperationType.WITHDRAWAL,
        amount=withdrawal.amount,
        operator_id=withdrawal.operator_id,
        payment_method=None,
        related_entity_id=None,
        notes=f"Retirada: {withdrawal.reason}. {withdrawal.notes or ''}"
    )
    
    # Registrar a operação
    operation_response = await service.register_operation(cashier_id, operation)
    
    return operation_response


@router.get("/terminal/{terminal_id}/status", response_model=dict)
async def get_terminal_cashier_status(
    terminal_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Verifica o status do caixa para um terminal específico.
    
    Retorna informações sobre se há um caixa aberto no terminal,
    qual operador está usando e dados básicos do caixa.
    """
    try:
        service = get_cashier_service()
        business_day_service = get_business_day_service()
        
        # Buscar caixa aberto no terminal
        terminal_cashier = await service.get_cashier_by_terminal(terminal_id)
        
        if not terminal_cashier:
            return {
                "has_open_cashier": False,
                "terminal_id": terminal_id,
                "message": "Nenhum caixa aberto neste terminal"
            }
        
        # Buscar dia de operação (com tratamento de erro)
        business_day = None
        try:
            business_day = await business_day_service.get_business_day(terminal_cashier.business_day_id)
        except Exception as e:
            logger.warning(f"Erro ao buscar business_day {terminal_cashier.business_day_id}: {e}")
        
        return {
            "has_open_cashier": True,
            "terminal_id": terminal_id,
            "cashier_id": terminal_cashier.id,
            "operator_id": terminal_cashier.current_operator_id,
            "operator_name": getattr(terminal_cashier, 'current_operator_name', 'Operador'),
            "opened_at": terminal_cashier.opened_at,
            "initial_balance": terminal_cashier.opening_balance,  # Corrigido: usar opening_balance
            "current_balance": terminal_cashier.current_balance,
            "business_day_id": terminal_cashier.business_day_id,
            "business_day_date": business_day.date if business_day else None,
            "status": terminal_cashier.status
        }
    except Exception as e:
        logger.error(f"Erro ao verificar status do terminal {terminal_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao verificar status do terminal: {str(e)}"
        )


@router.get("", response_model=List[CashierSummary])
async def list_cashiers(
    business_day_id: Optional[str] = None,
    status: Optional[CashierStatus] = None,
    terminal_id: Optional[str] = None,
    operator_id: Optional[str] = None,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user)
):
    """
    Lista os caixas com filtros opcionais.
    
    - Filtro por dia de operação
    - Filtro por status (aberto/fechado)
    - Filtro por terminal
    - Filtro por operador
    - Paginação com limit e offset
    
    Retorna uma lista resumida dos caixas.
    """
    service = get_cashier_service()
    
    # Buscar caixas
    cashiers = await service.list_cashiers(
        business_day_id=business_day_id,
        status=status,
        terminal_id=terminal_id,
        operator_id=operator_id,
        limit=limit,
        offset=offset
    )
    
    return cashiers


@router.get("/current", response_model=List[CashierSummary])
async def get_current_cashiers(
    current_user: User = Depends(get_current_active_user)
):
    """
    Retorna os caixas abertos no dia de operação atual.
    
    Se não houver um dia aberto ou caixas abertos, retorna uma lista vazia.
    """
    service = get_cashier_service()
    business_day_service = get_business_day_service()
    
    # Buscar o dia de operação atual
    business_day = await business_day_service.get_open_business_day()
    if not business_day:
        return []
    
    # Buscar caixas abertos no dia atual
    cashiers = await service.list_cashiers(
        business_day_id=business_day.id,
        status=CashierStatus.OPEN
    )
    
    return cashiers


@router.get("/{cashier_id}", response_model=Cashier)
async def get_cashier(
    cashier_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Retorna um caixa específico pelo ID.
    """
    service = get_cashier_service()
    
    cashier = await service.get_cashier(cashier_id)
    if not cashier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Caixa com ID {cashier_id} não encontrado."
        )
    
    return cashier


@router.get("/{cashier_id}/operations", response_model=List[CashierOperationResponse])
async def get_cashier_operations(
    cashier_id: str,
    operation_type: Optional[OperationType] = None,
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retorna as operações de um caixa específico.
    
    - Filtro opcional por tipo de operação
    - Paginação com limit e offset
    """
    service = get_cashier_service()
    
    # Verificar se o caixa existe
    cashier = await service.get_cashier(cashier_id)
    if not cashier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Caixa com ID {cashier_id} não encontrado."
        )
    
    # Buscar operações
    operations = await service.get_cashier_operations(
        cashier_id,
        operation_type=operation_type,
        limit=limit,
        offset=offset
    )
    
    return operations


# @router.get("/{cashier_id}/report", response_model=CashierReport)
# async def get_cashier_report(
#     cashier_id: str,
#     current_user: User = Depends(has_permission(Permission.REPORT_READ))
# ):
#     """
#     Gera um relatório detalhado para um caixa específico.
#     
#     - Apenas usuários com permissão de leitura de relatórios podem acessar
#     - Inclui totais, operações por tipo, vendas por método de pagamento
#     """
#     service = get_cashier_service()
#     
#     # Verificar se o caixa existe
#     cashier = await service.get_cashier(cashier_id)
#     if not cashier:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail=f"Caixa com ID {cashier_id} não encontrado."
#         )
#     
#     # Gerar relatório
#     report = await service.generate_cashier_report(cashier_id)
#     
#     return report


@router.put("/{cashier_id}", response_model=Cashier)
async def update_cashier(
    cashier_id: str,
    update_data: CashierUpdate,
    current_user: User = Depends(has_permission(Permission.CASHIER_CLOSE)) # Assuming close permission allows update
):
    """
    Atualiza informações de um caixa.
    
    Atualmente, apenas as observações podem ser atualizadas.
    """
    service = get_cashier_service()
    
    # Verificar se o caixa existe
    cashier = await service.get_cashier(cashier_id)
    if not cashier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Caixa com ID {cashier_id} não encontrado."
        )
    
    # Atualizar o caixa
    updated_cashier = await service.update_cashier(
        cashier_id,
        update_data.dict(exclude_unset=True)
    )
    
    return updated_cashier
