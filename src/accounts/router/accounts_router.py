from datetime import date
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status

from src.auth.models import Permission, User
from src.auth.security import get_current_user

from ..models.accounts_models import (
    Account,
    AccountCreate,
    AccountType,
    AccountUpdate,
    FinancialReport,
    FinancialReportCreate,
    Payable,
    PayableCreate,
    PayableUpdate,
    PaymentStatus,
    Receivable,
    ReceivableCreate,
    ReceivableUpdate,
    RecurringTransaction,
    RecurringTransactionCreate,
    RecurringTransactionUpdate,
    SourceType,
    Transaction,
    TransactionCreate,
    TransactionType,
    TransactionUpdate,
)
from ..services.accounts_service import accounts_service

router = APIRouter(prefix="/api/v1", tags=["accounts"])


def _check_permissions(user: User, required_permissions: List[str]):
    """Helper function to check user permissions inline."""
    if Permission.ALL in user.permissions:
        return  # User has all permissions
    for perm in required_permissions:
        if perm not in user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissão necessária: {perm}",
            )


# === Endpoints para Contas ===


@router.post("/accounts/", response_model=Account)
async def create_account(
    account_data: AccountCreate, current_user: User = Depends(get_current_user)
):
    """Cria uma nova conta financeira."""
    _check_permissions(current_user, ["accounts.create"])
    try:
        return await accounts_service.create_account(
            account_data=account_data,
            user_id=current_user.id,
            user_name=current_user.full_name or current_user.username,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar conta: {str(e)}"
        ) from e


@router.get("/accounts/{account_id}", response_model=Account)
async def get_account(
    account_id: str = Path(..., description="ID da conta"),
    current_user: User = Depends(get_current_user),
):
    """Busca uma conta pelo ID."""
    _check_permissions(current_user, ["accounts.read"])
    account = await accounts_service.get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return account


@router.put("/accounts/{account_id}", response_model=Account)
async def update_account(
    account_id: str = Path(..., description="ID da conta"),
    account_data: AccountUpdate = Body(...),
    current_user: User = Depends(get_current_user),
):
    """Atualiza uma conta."""
    _check_permissions(current_user, ["accounts.update"])
    try:
        account = await accounts_service.update_account(
            account_id=account_id,
            account_data=account_data,
            user_id=current_user.id,
            user_name=current_user.full_name or current_user.username,
        )
        if not account:
            raise HTTPException(status_code=404, detail="Conta não encontrada")
        return account
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar conta: {str(e)}"
        ) from e


@router.get("/accounts/", response_model=List[Account])
async def list_accounts(
    account_type: Optional[AccountType] = Query(None, description="Tipo de conta"),
    is_active: Optional[bool] = Query(None, description="Status ativo"),
    current_user: User = Depends(get_current_user),
):
    """Lista contas com filtros opcionais."""
    _check_permissions(current_user, ["accounts.read"])
    return await accounts_service.list_accounts(
        account_type=account_type, is_active=is_active
    )


@router.post("/accounts/{account_id}/balance", response_model=Account)
async def update_account_balance(
    account_id: str = Path(..., description="ID da conta"),
    amount: float = Body(..., embed=True),
    operation: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
):
    """Atualiza o saldo de uma conta."""
    _check_permissions(current_user, ["accounts.update"])
    try:
        account = await accounts_service.update_account_balance(
            account_id=account_id,
            amount=amount,
            operation=operation,
            user_id=current_user.id,
            user_name=current_user.full_name or current_user.username,
        )
        if not account:
            raise HTTPException(status_code=404, detail="Conta não encontrada")
        return account
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar saldo: {str(e)}"
        ) from e


# === Endpoints para Transações ===


@router.post("/transactions/", response_model=Transaction)
async def create_transaction(
    transaction_data: TransactionCreate, current_user: User = Depends(get_current_user)
):
    """Cria uma nova transação."""
    _check_permissions(current_user, ["transactions.create"])
    try:
        return await accounts_service.create_transaction(
            transaction_data=transaction_data,
            user_id=current_user.id,
            user_name=current_user.full_name or current_user.username,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar transação: {str(e)}"
        ) from e


@router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(
    transaction_id: str = Path(..., description="ID da transação"),
    current_user: User = Depends(get_current_user),
):
    """Busca uma transação pelo ID."""
    _check_permissions(current_user, ["transactions.read"])
    transaction = await accounts_service.get_transaction(transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return transaction


@router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(
    transaction_id: str = Path(..., description="ID da transação"),
    update_data: TransactionUpdate = Body(...),
    current_user: User = Depends(get_current_user),
):
    """Atualiza uma transação."""
    _check_permissions(current_user, ["transactions.update"])
    try:
        transaction = await accounts_service.update_transaction(
            transaction_id=transaction_id,
            update_data=update_data,
            user_id=current_user.id,
            user_name=current_user.full_name or current_user.username,
        )
        if not transaction:
            raise HTTPException(status_code=404, detail="Transação não encontrada")
        return transaction
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar transação: {str(e)}"
        ) from e


@router.get("/transactions/", response_model=List[Transaction])
async def list_transactions(
    account_id: Optional[str] = Query(None, description="ID da conta"),
    transaction_type: Optional[TransactionType] = Query(
        None, description="Tipo de transação"
    ),
    status: Optional[PaymentStatus] = Query(None, description="Status da transação"),
    start_date: Optional[date] = Query(None, description="Data inicial"),
    end_date: Optional[date] = Query(None, description="Data final"),
    source_type: Optional[SourceType] = Query(None, description="Tipo de origem"),
    source_id: Optional[str] = Query(None, description="ID de origem"),
    limit: int = Query(100, description="Limite de resultados"),
    offset: int = Query(0, description="Deslocamento para paginação"),
    current_user: User = Depends(get_current_user),
):
    """Lista transações com filtros."""
    _check_permissions(current_user, ["transactions.read"])
    return await accounts_service.list_transactions(
        account_id=account_id,
        transaction_type=transaction_type,
        status=status,
        start_date=start_date,
        end_date=end_date,
        source_type=source_type,
        source_id=source_id,
        limit=limit,
        offset=offset,
    )


# === Endpoints para Contas a Receber ===


@router.post("/receivables/", response_model=Receivable)
async def create_receivable(
    receivable_data: ReceivableCreate, current_user: User = Depends(get_current_user)
):
    """Cria uma nova conta a receber."""
    _check_permissions(current_user, ["receivables.create"])
    try:
        return await accounts_service.create_receivable(
            receivable_data=receivable_data,
            user_id=current_user.id,
            user_name=current_user.full_name or current_user.username,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar conta a receber: {str(e)}"
        ) from e


@router.get("/receivables/{receivable_id}", response_model=Receivable)
async def get_receivable(
    receivable_id: str = Path(..., description="ID da conta a receber"),
    current_user: User = Depends(get_current_user),
):
    """Busca uma conta a receber pelo ID."""
    _check_permissions(current_user, ["receivables.read"])
    receivable = await accounts_service.get_receivable(receivable_id)
    if not receivable:
        raise HTTPException(status_code=404, detail="Conta a receber não encontrada")
    return receivable


@router.put("/receivables/{receivable_id}", response_model=Receivable)
async def update_receivable(
    receivable_id: str = Path(..., description="ID da conta a receber"),
    update_data: ReceivableUpdate = Body(...),
    current_user: User = Depends(get_current_user),
):
    """Atualiza uma conta a receber."""
    _check_permissions(current_user, ["receivables.update"])
    try:
        receivable = await accounts_service.update_receivable(
            receivable_id=receivable_id,
            update_data=update_data,
            user_id=current_user.id,
            user_name=current_user.full_name or current_user.username,
        )
        if not receivable:
            raise HTTPException(
                status_code=404, detail="Conta a receber não encontrada"
            )
        return receivable
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar conta a receber: {str(e)}"
        ) from e


@router.get("/receivables/", response_model=List[Receivable])
async def list_receivables(
    customer_id: Optional[str] = Query(None, description="ID do cliente"),
    status: Optional[PaymentStatus] = Query(
        None, description="Status da conta a receber"
    ),
    start_due_date: Optional[date] = Query(
        None, description="Data de vencimento inicial"
    ),
    end_due_date: Optional[date] = Query(None, description="Data de vencimento final"),
    source_type: Optional[SourceType] = Query(None, description="Tipo de origem"),
    source_id: Optional[str] = Query(None, description="ID de origem"),
    limit: int = Query(100, description="Limite de resultados"),
    offset: int = Query(0, description="Deslocamento para paginação"),
    current_user: User = Depends(get_current_user),
):
    """Lista contas a receber com filtros."""
    _check_permissions(current_user, ["receivables.read"])
    return await accounts_service.list_receivables(
        customer_id=customer_id,
        status=status,
        start_due_date=start_due_date,
        end_due_date=end_due_date,
        source_type=source_type,
        source_id=source_id,
        limit=limit,
        offset=offset,
    )


# === Endpoints para Contas a Pagar ===


@router.post("/payables/", response_model=Payable)
async def create_payable(
    payable_data: PayableCreate, current_user: User = Depends(get_current_user)
):
    """Cria uma nova conta a pagar."""
    _check_permissions(current_user, ["payables.create"])
    try:
        return await accounts_service.create_payable(
            payable_data=payable_data,
            user_id=current_user.id,
            user_name=current_user.full_name or current_user.username,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar conta a pagar: {str(e)}"
        ) from e


@router.get("/payables/{payable_id}", response_model=Payable)
async def get_payable(
    payable_id: str = Path(..., description="ID da conta a pagar"),
    current_user: User = Depends(get_current_user),
):
    """Busca uma conta a pagar pelo ID."""
    _check_permissions(current_user, ["payables.read"])
    payable = await accounts_service.get_payable(payable_id)
    if not payable:
        raise HTTPException(status_code=404, detail="Conta a pagar não encontrada")
    return payable


@router.put("/payables/{payable_id}", response_model=Payable)
async def update_payable(
    payable_id: str = Path(..., description="ID da conta a pagar"),
    update_data: PayableUpdate = Body(...),
    current_user: User = Depends(get_current_user),
):
    """Atualiza uma conta a pagar."""
    _check_permissions(current_user, ["payables.update"])
    try:
        payable = await accounts_service.update_payable(
            payable_id=payable_id,
            update_data=update_data,
            user_id=current_user.id,
            user_name=current_user.full_name or current_user.username,
        )
        if not payable:
            raise HTTPException(status_code=404, detail="Conta a pagar não encontrada")
        return payable
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar conta a pagar: {str(e)}"
        ) from e


@router.get("/payables/", response_model=List[Payable])
async def list_payables(
    supplier_id: Optional[str] = Query(None, description="ID do fornecedor"),
    employee_id: Optional[str] = Query(None, description="ID do funcionário"),
    status: Optional[PaymentStatus] = Query(
        None, description="Status da conta a pagar"
    ),
    start_due_date: Optional[date] = Query(
        None, description="Data de vencimento inicial"
    ),
    end_due_date: Optional[date] = Query(None, description="Data de vencimento final"),
    source_type: Optional[SourceType] = Query(None, description="Tipo de origem"),
    source_id: Optional[str] = Query(None, description="ID de origem"),
    limit: int = Query(100, description="Limite de resultados"),
    offset: int = Query(0, description="Deslocamento para paginação"),
    current_user: User = Depends(get_current_user),
):
    """Lista contas a pagar com filtros."""
    _check_permissions(current_user, ["payables.read"])
    return await accounts_service.list_payables(
        supplier_id=supplier_id,
        employee_id=employee_id,
        status=status,
        start_due_date=start_due_date,
        end_due_date=end_due_date,
        source_type=source_type,
        source_id=source_id,
        limit=limit,
        offset=offset,
    )


# === Endpoints para Transações Recorrentes ===


@router.post("/recurring-transactions/", response_model=RecurringTransaction)
async def create_recurring_transaction(
    transaction_data: RecurringTransactionCreate,
    current_user: User = Depends(get_current_user),
):
    """Cria uma nova transação recorrente."""
    _check_permissions(current_user, ["transactions.create"])
    try:
        return await accounts_service.create_recurring_transaction(
            transaction_data=transaction_data,
            user_id=current_user.id,
            user_name=current_user.full_name or current_user.username,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar transação recorrente: {str(e)}"
        ) from e


@router.get(
    "/recurring-transactions/{transaction_id}", response_model=RecurringTransaction
)
async def get_recurring_transaction(
    transaction_id: str = Path(..., description="ID da transação recorrente"),
    current_user: User = Depends(get_current_user),
):
    """Busca uma transação recorrente pelo ID."""
    _check_permissions(current_user, ["transactions.read"])
    transaction = await accounts_service.get_recurring_transaction(transaction_id)
    if not transaction:
        raise HTTPException(
            status_code=404, detail="Transação recorrente não encontrada"
        )
    return transaction


@router.put(
    "/recurring-transactions/{transaction_id}", response_model=RecurringTransaction
)
async def update_recurring_transaction(
    transaction_id: str = Path(..., description="ID da transação recorrente"),
    update_data: RecurringTransactionUpdate = Body(...),
    current_user: User = Depends(get_current_user),
):
    """Atualiza uma transação recorrente."""
    _check_permissions(current_user, ["transactions.update"])
    try:
        transaction = await accounts_service.update_recurring_transaction(
            transaction_id=transaction_id,
            update_data=update_data,
            user_id=current_user.id,
            user_name=current_user.full_name or current_user.username,
        )
        if not transaction:
            raise HTTPException(
                status_code=404, detail="Transação recorrente não encontrada"
            )
        return transaction
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar transação recorrente: {str(e)}"
        ) from e


@router.get("/recurring-transactions/", response_model=List[RecurringTransaction])
async def list_recurring_transactions(
    account_id: Optional[str] = Query(None, description="ID da conta"),
    transaction_type: Optional[TransactionType] = Query(
        None, description="Tipo de transação"
    ),
    is_active: Optional[bool] = Query(None, description="Status ativo"),
    current_user: User = Depends(get_current_user),
):
    """Lista transações recorrentes com filtros."""
    _check_permissions(current_user, ["transactions.read"])
    return await accounts_service.list_recurring_transactions(
        account_id=account_id, transaction_type=transaction_type, is_active=is_active
    )


@router.post("/recurring-transactions/process", response_model=List[str])
async def process_recurring_transactions(
    current_date: Optional[date] = Body(None, embed=True),
    current_user: User = Depends(get_current_user),
):
    """Processa transações recorrentes, gerando transações para a data atual."""
    _check_permissions(current_user, ["transactions.create"])
    try:
        return await accounts_service.process_recurring_transactions(current_date)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar transações recorrentes: {str(e)}",
        ) from e


# === Endpoints para Relatórios Financeiros ===


@router.post("/reports/", response_model=FinancialReport)
async def create_financial_report(
    report_data: FinancialReportCreate, current_user: User = Depends(get_current_user)
):
    """Cria um novo relatório financeiro."""
    _check_permissions(current_user, ["reports.create"])
    try:
        return await accounts_service.create_financial_report(
            report_data=report_data,
            user_id=current_user.id,
            user_name=current_user.full_name or current_user.username,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar relatório: {str(e)}"
        ) from e


@router.get("/reports/{report_id}", response_model=FinancialReport)
async def get_financial_report(
    report_id: str = Path(..., description="ID do relatório"),
    current_user: User = Depends(get_current_user),
):
    """Busca um relatório financeiro pelo ID."""
    _check_permissions(current_user, ["reports.read"])
    report = await accounts_service.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Relatório não encontrado")
    return report


@router.get("/reports/", response_model=List[FinancialReport])
async def list_financial_reports(
    report_type: Optional[str] = Query(None, description="Tipo de relatório"),
    start_date: Optional[date] = Query(None, description="Data inicial"),
    end_date: Optional[date] = Query(None, description="Data final"),
    limit: int = Query(100, description="Limite de resultados"),
    offset: int = Query(0, description="Deslocamento para paginação"),
    current_user: User = Depends(get_current_user),
):
    """Lista relatórios financeiros com filtros."""
    _check_permissions(current_user, ["reports.read"])
    return await accounts_service.list_reports(
        report_type=report_type,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )


# === Endpoints para Resumo Financeiro ===


@router.get("/financial-summary", response_model=Dict[str, Any])
async def get_financial_summary(current_user: User = Depends(get_current_user)):
    """Obtém um resumo financeiro."""
    _check_permissions(current_user, ["accounts.read"])
    try:
        return await accounts_service.get_financial_summary()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter resumo financeiro: {str(e)}"
        ) from e


# === Endpoints para Integração com Pedidos ===


@router.post("/orders/{order_id}/receivable", response_model=str)
async def create_receivable_from_order(
    order_id: str = Path(..., description="ID do pedido"),
    customer_id: Optional[str] = Body(None, embed=True),
    amount: float = Body(..., embed=True),
    description: str = Body(..., embed=True),
    issue_date: date = Body(..., embed=True),
    due_date: date = Body(..., embed=True),
    status: PaymentStatus = Body(..., embed=True),
    payment_method: Optional[str] = Body(None, embed=True),
    current_user: User = Depends(get_current_user),
):
    """Cria uma conta a receber a partir de um pedido."""
    _check_permissions(current_user, ["receivables.create"])
    try:
        return await accounts_service.create_receivable_from_order(
            order_id=order_id,
            customer_id=customer_id,
            amount=amount,
            description=description,
            issue_date=issue_date,
            due_date=due_date,
            status=status,
            payment_method=payment_method,
            created_by=current_user.id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar conta a receber do pedido: {str(e)}"
        ) from e


# === Endpoints para Integração com Compras ===


@router.post("/purchases/{purchase_id}/payable", response_model=str)
async def create_payable_from_purchase(
    purchase_id: str = Path(..., description="ID da compra"),
    supplier_id: str = Body(..., embed=True),
    amount: float = Body(..., embed=True),
    description: str = Body(..., embed=True),
    issue_date: date = Body(..., embed=True),
    due_date: date = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
):
    """Cria uma conta a pagar a partir de uma compra."""
    _check_permissions(current_user, ["payables.create"])
    try:
        return await accounts_service.create_payable_from_purchase(
            purchase_id=purchase_id,
            supplier_id=supplier_id,
            amount=amount,
            description=description,
            issue_date=issue_date,
            due_date=due_date,
            created_by=current_user.id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar conta a pagar da compra: {str(e)}"
        ) from e


# === Endpoints para Integração com Funcionários ===


@router.post("/employees/{employee_id}/payable", response_model=str)
async def create_payable_for_employee(
    employee_id: str = Path(..., description="ID do funcionário"),
    amount: float = Body(..., embed=True),
    description: str = Body(..., embed=True),
    reference: str = Body(..., embed=True),
    due_date: date = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
):
    """Cria uma conta a pagar para um funcionário."""
    _check_permissions(current_user, ["payables.create"])
    try:
        return await accounts_service.create_payable_for_employee(
            employee_id=employee_id,
            amount=amount,
            description=description,
            reference=reference,
            due_date=due_date,
            created_by=current_user.id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar conta a pagar para funcionário: {str(e)}",
        ) from e
