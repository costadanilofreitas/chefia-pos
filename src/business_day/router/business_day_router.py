from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import date

from src.auth.security import get_current_active_user, has_permission
from src.auth.models import User, Permission
from src.business_day.models.business_day import (
    BusinessDay,
    BusinessDayCreate,
    BusinessDayUpdate,
    BusinessDayClose,
    BusinessDaySummary,
    DailySalesReport,
    DayStatus,
    create_business_day,
)
from src.business_day.services.business_day_service import get_business_day_service

router = APIRouter(
    prefix="/api/v1/business-day",
    tags=["business-day"],
    responses={401: {"description": "Não autorizado"}},
)


@router.post("", response_model=BusinessDay, status_code=status.HTTP_201_CREATED)
async def open_business_day(
    business_day_create: BusinessDayCreate,
    current_user: User = Depends(has_permission(Permission.CASHIER_OPEN)),
):
    """
    Abre um novo dia de operação.

    - Apenas usuários com permissão de abertura de dia podem executar esta operação
    - Não pode haver outro dia aberto
    - A data deve ser a atual ou futura

    Retorna o dia de operação criado.
    """
    service = get_business_day_service()

    # Verificar se já existe um dia aberto
    open_day = await service.get_open_business_day()
    if open_day:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe um dia aberto com data {open_day.date}. Feche-o antes de abrir um novo dia.",
        )

    # Verificar se a data é válida (atual ou futura)
    try:
        day_date = date.fromisoformat(business_day_create.date)
        today = date.today()
        if day_date < today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Não é possível abrir um dia com data passada. Data atual: {today.isoformat()}",
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de data inválido. Use o formato ISO (YYYY-MM-DD).",
        )

    # Criar o dia de operação
    business_day = create_business_day(business_day_create, current_user.id)

    # Salvar no repositório
    created_day = await service.create_business_day(business_day)

    return created_day


@router.put("/{business_day_id}/close", response_model=BusinessDay)
async def close_business_day(
    business_day_id: str,
    close_data: BusinessDayClose,
    current_user: User = Depends(has_permission(Permission.CASHIER_CLOSE)),
):
    """
    Fecha um dia de operação.

    - Apenas usuários com permissão de fechamento de dia podem executar esta operação
    - O dia deve estar aberto
    - Todos os caixas devem estar fechados

    Retorna o dia de operação fechado com os totais atualizados.
    """
    service = get_business_day_service()

    # Verificar se o dia existe
    business_day = await service.get_business_day(business_day_id)
    if not business_day:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dia de operação com ID {business_day_id} não encontrado.",
        )

    # Verificar se o dia está aberto
    if business_day.status != DayStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O dia de operação já está fechado.",
        )

    # Verificar se todos os caixas estão fechados
    # Esta verificação será implementada quando integrarmos com o módulo de caixa
    # Por enquanto, apenas simulamos a verificação
    cashiers_open = await service.get_open_cashiers(business_day_id)
    if cashiers_open:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Existem {len(cashiers_open)} caixas abertos. Feche todos os caixas antes de fechar o dia.",
        )

    # Fechar o dia
    closed_day = await service.close_business_day(
        business_day_id, close_data.closed_by, close_data.notes
    )

    return closed_day


@router.get("", response_model=List[BusinessDaySummary])
async def list_business_days(
    status: Optional[DayStatus] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
):
    """
    Lista os dias de operação com filtros opcionais.

    - Filtro por status (aberto/fechado)
    - Filtro por período (data inicial e final)
    - Paginação com limit e offset

    Retorna uma lista resumida dos dias de operação.
    """
    service = get_business_day_service()

    # Validar datas se fornecidas
    if start_date:
        try:
            date.fromisoformat(start_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de data inicial inválido. Use o formato ISO (YYYY-MM-DD).",
            )

    if end_date:
        try:
            date.fromisoformat(end_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de data final inválido. Use o formato ISO (YYYY-MM-DD).",
            )

    # Buscar dias de operação
    business_days = await service.list_business_days(
        status=status,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )

    return business_days


@router.get("/current", response_model=BusinessDay)
async def get_current_business_day(
    current_user: User = Depends(get_current_active_user),
):
    """
    Retorna o dia de operação atual (aberto).

    Se não houver um dia aberto, retorna erro 404.
    """
    service = get_business_day_service()

    business_day = await service.get_open_business_day()
    if not business_day:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Não há um dia de operação aberto.",
        )

    return business_day


@router.get("/{business_day_id}", response_model=BusinessDay)
async def get_business_day(
    business_day_id: str, current_user: User = Depends(get_current_active_user)
):
    """
    Retorna um dia de operação específico pelo ID.
    """
    service = get_business_day_service()

    business_day = await service.get_business_day(business_day_id)
    if not business_day:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dia de operação com ID {business_day_id} não encontrado.",
        )

    return business_day


@router.get("/{business_day_id}/report", response_model=DailySalesReport)
async def get_business_day_report(
    business_day_id: str,
    current_user: User = Depends(has_permission(Permission.REPORTS_VIEW)),
):
    """
    Gera um relatório detalhado de vendas para um dia de operação específico.

    - Apenas usuários com permissão de leitura de relatórios podem acessar
    - Inclui totais, vendas por método de pagamento, vendas por hora, produtos mais vendidos
    """
    service = get_business_day_service()

    # Verificar se o dia existe
    business_day = await service.get_business_day(business_day_id)
    if not business_day:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dia de operação com ID {business_day_id} não encontrado.",
        )

    # Gerar relatório
    report = await service.generate_daily_sales_report(business_day_id)

    return report


@router.put("/{business_day_id}", response_model=BusinessDay)
async def update_business_day(
    business_day_id: str,
    update_data: BusinessDayUpdate,
    current_user: User = Depends(has_permission(Permission.CASHIER_CLOSE)),
):
    """
    Atualiza informações de um dia de operação.

    Atualmente, apenas as observações podem ser atualizadas.
    """
    service = get_business_day_service()

    # Verificar se o dia existe
    business_day = await service.get_business_day(business_day_id)
    if not business_day:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dia de operação com ID {business_day_id} não encontrado.",
        )

    # Atualizar o dia
    updated_day = await service.update_business_day(
        business_day_id, update_data.dict(exclude_unset=True)
    )

    return updated_day
