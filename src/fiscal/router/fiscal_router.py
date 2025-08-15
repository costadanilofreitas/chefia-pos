"""
Router para os módulos fiscais avançados (NFC-e, CF-e, MFE, Contabilidade)
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel

from src.core.auth.dependencies import get_current_user, verify_permissions
from src.core.config.service import ConfigService
from src.core.database.service import DatabaseService
from src.fiscal.models.accounting_models import (
    AccountingExportBatch,
    AccountingMapping,
    AccountingProvider,
    AccountingSchedule,
)
from src.fiscal.models.cfe_models import CFeDocument, CFeEvent, CFeResponse, CFeStatus
from src.fiscal.models.mfe_models import MFEConfiguration, MFEEquipment, MFEStatus
from src.fiscal.models.nfce_models import (
    NFCeDocument,
    NFCeEvent,
    NFCeResponse,
    NFCeStatus,
)
from src.fiscal.services.accounting_service import AccountingService
from src.fiscal.services.cfe_service import CFeService
from src.fiscal.services.mfe_service import MFEService
from src.fiscal.services.nfce_service import NFCeService

# Criação do router
router = APIRouter(prefix="/fiscal", tags=["fiscal"])


# Dependências
def get_db_service():
    return DatabaseService()


def get_config_service():
    return ConfigService()


def get_nfce_service(
    db_service: DatabaseService = Depends(get_db_service),
    config_service: ConfigService = Depends(get_config_service),
):
    # Simulação de serviço de certificados
    certificate_service = None  # Em um ambiente real, isso seria injetado
    return NFCeService(db_service, certificate_service, config_service)


def get_cfe_service(
    db_service: DatabaseService = Depends(get_db_service),
    config_service: ConfigService = Depends(get_config_service),
):
    # Simulação de serviço SAT
    sat_service = None  # Em um ambiente real, isso seria injetado
    return CFeService(db_service, sat_service, config_service)


def get_mfe_service(
    db_service: DatabaseService = Depends(get_db_service),
    config_service: ConfigService = Depends(get_config_service),
):
    return MFEService(db_service, config_service)


def get_accounting_service(
    db_service: DatabaseService = Depends(get_db_service),
    nfce_service: NFCeService = Depends(get_nfce_service),
    cfe_service: CFeService = Depends(get_cfe_service),
    config_service: ConfigService = Depends(get_config_service),
):
    return AccountingService(db_service, nfce_service, cfe_service, config_service)


# Modelos de requisição e resposta
class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


class NFCeCreateRequest(BaseModel):
    number: str
    series: str
    issue_date: datetime
    items: List[Dict[str, Any]]
    payments: List[Dict[str, Any]]
    issuer: Dict[str, Any]
    total_value: float
    total_taxes: float
    state_code: str
    customer: Optional[Dict[str, Any]] = None
    additional_info: Optional[Dict[str, Any]] = None


class NFCeUpdateRequest(BaseModel):
    number: Optional[str] = None
    series: Optional[str] = None
    issue_date: Optional[datetime] = None
    items: Optional[List[Dict[str, Any]]] = None
    payments: Optional[List[Dict[str, Any]]] = None
    issuer: Optional[Dict[str, Any]] = None
    total_value: Optional[float] = None
    total_taxes: Optional[float] = None
    state_code: Optional[str] = None
    customer: Optional[Dict[str, Any]] = None
    additional_info: Optional[Dict[str, Any]] = None


class NFCeCancelRequest(BaseModel):
    reason: str


class CFeCreateRequest(BaseModel):
    number: str
    issue_date: datetime
    items: List[Dict[str, Any]]
    payments: List[Dict[str, Any]]
    issuer: Dict[str, Any]
    total_value: float
    total_taxes: float
    state_code: str
    customer: Optional[Dict[str, Any]] = None
    additional_info: Optional[Dict[str, Any]] = None


class CFeUpdateRequest(BaseModel):
    number: Optional[str] = None
    issue_date: Optional[datetime] = None
    items: Optional[List[Dict[str, Any]]] = None
    payments: Optional[List[Dict[str, Any]]] = None
    issuer: Optional[Dict[str, Any]] = None
    total_value: Optional[float] = None
    total_taxes: Optional[float] = None
    state_code: Optional[str] = None
    customer: Optional[Dict[str, Any]] = None
    additional_info: Optional[Dict[str, Any]] = None


class CFeCancelRequest(BaseModel):
    reason: str


class MFEEquipmentCreateRequest(BaseModel):
    serial_number: str
    model: str
    manufacturer: str
    firmware_version: str
    state_code: str
    store_id: str
    technical_contact: Optional[Dict[str, Any]] = None


class MFEEquipmentUpdateRequest(BaseModel):
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    firmware_version: Optional[str] = None
    state_code: Optional[str] = None
    store_id: Optional[str] = None
    technical_contact: Optional[Dict[str, Any]] = None


class MFEActivationRequest(BaseModel):
    activation_code: str


class MFEDeactivationRequest(BaseModel):
    reason: str


class MFEConfigurationRequest(BaseModel):
    parameter_name: str
    parameter_value: str
    description: Optional[str] = None


class MFEMaintenanceScheduleRequest(BaseModel):
    scheduled_date: datetime
    maintenance_type: str
    description: str
    technician_info: Optional[Dict[str, Any]] = None


class MFEMaintenanceCompleteRequest(BaseModel):
    completion_notes: str


class AccountingProviderCreateRequest(BaseModel):
    name: str
    provider_type: str
    api_url: str
    auth_method: str
    export_format: str
    api_key: Optional[str] = None
    auth_token: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class AccountingProviderUpdateRequest(BaseModel):
    name: Optional[str] = None
    provider_type: Optional[str] = None
    api_url: Optional[str] = None
    auth_method: Optional[str] = None
    export_format: Optional[str] = None
    api_key: Optional[str] = None
    auth_token: Optional[str] = None
    is_active: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None


class AccountingMappingCreateRequest(BaseModel):
    source_code: str
    target_code: str
    description: str
    account_type: str


class AccountingMappingUpdateRequest(BaseModel):
    target_code: Optional[str] = None
    description: Optional[str] = None
    account_type: Optional[str] = None
    is_active: Optional[bool] = None


class AccountingExportBatchCreateRequest(BaseModel):
    reference_period: str
    export_destination: str
    notes: Optional[str] = None


class AccountingScheduleCreateRequest(BaseModel):
    frequency: str
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    time_of_day: str


class AccountingScheduleUpdateRequest(BaseModel):
    frequency: Optional[str] = None
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    time_of_day: Optional[str] = None
    is_active: Optional[bool] = None


# Rotas para NFC-e
@router.post("/nfce", response_model=NFCeDocument, status_code=201)
async def create_nfce(
    request: NFCeCreateRequest,
    nfce_service: NFCeService = Depends(get_nfce_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Cria uma nova NFC-e"""
    verify_permissions(current_user, "fiscal:nfce:create")

    try:
        nfce = nfce_service.create_nfce(request.dict())
        return nfce
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar NFC-e: {str(e)}"
        ) from e


@router.get("/nfce/{nfce_id}", response_model=NFCeDocument)
async def get_nfce(
    nfce_id: str = Path(..., description="ID da NFC-e"),
    nfce_service: NFCeService = Depends(get_nfce_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Obtém uma NFC-e pelo ID"""
    verify_permissions(current_user, "fiscal:nfce:read")

    nfce = nfce_service.get_nfce(nfce_id)
    if not nfce:
        raise HTTPException(status_code=404, detail="NFC-e não encontrada")

    return nfce


@router.put("/nfce/{nfce_id}", response_model=NFCeDocument)
async def update_nfce(
    request: NFCeUpdateRequest,
    nfce_id: str = Path(..., description="ID da NFC-e"),
    nfce_service: NFCeService = Depends(get_nfce_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Atualiza uma NFC-e"""
    verify_permissions(current_user, "fiscal:nfce:update")

    try:
        nfce = nfce_service.update_nfce(nfce_id, request.dict(exclude_unset=True))
        if not nfce:
            raise HTTPException(status_code=404, detail="NFC-e não encontrada")

        return nfce
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar NFC-e: {str(e)}"
        ) from e


@router.post("/nfce/{nfce_id}/send", response_model=NFCeResponse)
async def send_nfce(
    nfce_id: str = Path(..., description="ID da NFC-e"),
    nfce_service: NFCeService = Depends(get_nfce_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Envia uma NFC-e para a SEFAZ"""
    verify_permissions(current_user, "fiscal:nfce:send")

    success, message, response = nfce_service.send_nfce(nfce_id)

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return response


@router.post("/nfce/{nfce_id}/cancel", response_model=NFCeEvent)
async def cancel_nfce(
    request: NFCeCancelRequest,
    nfce_id: str = Path(..., description="ID da NFC-e"),
    nfce_service: NFCeService = Depends(get_nfce_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Cancela uma NFC-e"""
    verify_permissions(current_user, "fiscal:nfce:cancel")

    success, message, event = nfce_service.cancel_nfce(nfce_id, request.reason)

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return event


@router.get("/nfce", response_model=PaginatedResponse)
async def list_nfce(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(20, ge=1, le=100, description="Tamanho da página"),
    status: Optional[NFCeStatus] = Query(None, description="Filtrar por status"),
    start_date: Optional[datetime] = Query(None, description="Data inicial"),
    end_date: Optional[datetime] = Query(None, description="Data final"),
    nfce_service: NFCeService = Depends(get_nfce_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Lista NFC-e com filtros e paginação"""
    verify_permissions(current_user, "fiscal:nfce:read")

    # Constrói os filtros
    filters: Dict[str, Any] = {}

    if status:
        filters["status"] = status

    if start_date or end_date:
        date_filter = {}
        if start_date:
            date_filter["$gte"] = start_date
        if end_date:
            date_filter["$lte"] = end_date

        if date_filter:
            filters["issue_date"] = date_filter

    # Busca os documentos
    documents, total = nfce_service.list_nfce(filters, page, page_size)

    # Calcula o total de páginas
    total_pages = (total + page_size - 1) // page_size

    return {
        "items": documents,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# Rotas para CF-e
@router.post("/cfe", response_model=CFeDocument, status_code=201)
async def create_cfe(
    request: CFeCreateRequest,
    cfe_service: CFeService = Depends(get_cfe_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Cria um novo CF-e"""
    verify_permissions(current_user, "fiscal:cfe:create")

    try:
        cfe = cfe_service.create_cfe(request.dict())
        return cfe
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar CF-e: {str(e)}"
        ) from e


@router.get("/cfe/{cfe_id}", response_model=CFeDocument)
async def get_cfe(
    cfe_id: str = Path(..., description="ID do CF-e"),
    cfe_service: CFeService = Depends(get_cfe_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Obtém um CF-e pelo ID"""
    verify_permissions(current_user, "fiscal:cfe:read")

    cfe = cfe_service.get_cfe(cfe_id)
    if not cfe:
        raise HTTPException(status_code=404, detail="CF-e não encontrado")

    return cfe


@router.put("/cfe/{cfe_id}", response_model=CFeDocument)
async def update_cfe(
    request: CFeUpdateRequest,
    cfe_id: str = Path(..., description="ID do CF-e"),
    cfe_service: CFeService = Depends(get_cfe_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Atualiza um CF-e"""
    verify_permissions(current_user, "fiscal:cfe:update")

    try:
        cfe = cfe_service.update_cfe(cfe_id, request.dict(exclude_unset=True))
        if not cfe:
            raise HTTPException(status_code=404, detail="CF-e não encontrado")

        return cfe
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar CF-e: {str(e)}"
        ) from e


@router.post("/cfe/{cfe_id}/send", response_model=CFeResponse)
async def send_cfe(
    cfe_id: str = Path(..., description="ID do CF-e"),
    cfe_service: CFeService = Depends(get_cfe_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Envia um CF-e para o SAT/MFE"""
    verify_permissions(current_user, "fiscal:cfe:send")

    success, message, response = cfe_service.send_cfe(cfe_id)

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return response


@router.post("/cfe/{cfe_id}/cancel", response_model=CFeEvent)
async def cancel_cfe(
    request: CFeCancelRequest,
    cfe_id: str = Path(..., description="ID do CF-e"),
    cfe_service: CFeService = Depends(get_cfe_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Cancela um CF-e"""
    verify_permissions(current_user, "fiscal:cfe:cancel")

    success, message, event = cfe_service.cancel_cfe(cfe_id, request.reason)

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return event


@router.get("/cfe", response_model=PaginatedResponse)
async def list_cfe(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(20, ge=1, le=100, description="Tamanho da página"),
    status: Optional[CFeStatus] = Query(None, description="Filtrar por status"),
    start_date: Optional[datetime] = Query(None, description="Data inicial"),
    end_date: Optional[datetime] = Query(None, description="Data final"),
    cfe_service: CFeService = Depends(get_cfe_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Lista CF-e com filtros e paginação"""
    verify_permissions(current_user, "fiscal:cfe:read")

    # Constrói os filtros
    filters: Dict[str, Any] = {}

    if status:
        filters["status"] = status

    if start_date or end_date:
        date_filter: Dict[str, datetime] = {}
        if start_date:
            date_filter["$gte"] = start_date
        if end_date:
            date_filter["$lte"] = end_date

        if date_filter:
            filters["issue_date"] = date_filter

    # Busca os documentos
    documents, total = cfe_service.list_cfe(filters, page, page_size)

    # Calcula o total de páginas
    total_pages = (total + page_size - 1) // page_size

    return {
        "items": documents,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# Rotas para MFE
@router.post("/mfe/equipment", response_model=MFEEquipment, status_code=201)
async def register_mfe_equipment(
    request: MFEEquipmentCreateRequest,
    mfe_service: MFEService = Depends(get_mfe_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Registra um novo equipamento MFE"""
    verify_permissions(current_user, "fiscal:mfe:create")

    try:
        equipment = mfe_service.register_equipment(request.dict())
        return equipment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao registrar equipamento MFE: {str(e)}"
        ) from e


@router.get("/mfe/equipment/{equipment_id}", response_model=MFEEquipment)
async def get_mfe_equipment(
    equipment_id: str = Path(..., description="ID do equipamento MFE"),
    mfe_service: MFEService = Depends(get_mfe_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Obtém um equipamento MFE pelo ID"""
    verify_permissions(current_user, "fiscal:mfe:read")

    equipment = mfe_service.get_equipment(equipment_id)
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipamento MFE não encontrado")

    return equipment


@router.put("/mfe/equipment/{equipment_id}", response_model=MFEEquipment)
async def update_mfe_equipment(
    request: MFEEquipmentUpdateRequest,
    equipment_id: str = Path(..., description="ID do equipamento MFE"),
    mfe_service: MFEService = Depends(get_mfe_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Atualiza um equipamento MFE"""
    verify_permissions(current_user, "fiscal:mfe:update")

    try:
        equipment = mfe_service.update_equipment(
            equipment_id, request.dict(exclude_unset=True)
        )
        if not equipment:
            raise HTTPException(
                status_code=404, detail="Equipamento MFE não encontrado"
            )

        return equipment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar equipamento MFE: {str(e)}"
        ) from e


@router.post("/mfe/equipment/{equipment_id}/activate")
async def activate_mfe_equipment(
    request: MFEActivationRequest,
    equipment_id: str = Path(..., description="ID do equipamento MFE"),
    mfe_service: MFEService = Depends(get_mfe_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Ativa um equipamento MFE"""
    verify_permissions(current_user, "fiscal:mfe:activate")

    success, message = mfe_service.activate_equipment(
        equipment_id, request.activation_code
    )

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {"success": True, "message": message}


@router.post("/mfe/equipment/{equipment_id}/deactivate")
async def deactivate_mfe_equipment(
    request: MFEDeactivationRequest,
    equipment_id: str = Path(..., description="ID do equipamento MFE"),
    mfe_service: MFEService = Depends(get_mfe_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Desativa um equipamento MFE"""
    verify_permissions(current_user, "fiscal:mfe:deactivate")

    success, message = mfe_service.deactivate_equipment(equipment_id, request.reason)

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {"success": True, "message": message}


@router.get("/mfe/equipment/{equipment_id}/status")
async def check_mfe_equipment_status(
    equipment_id: str = Path(..., description="ID do equipamento MFE"),
    mfe_service: MFEService = Depends(get_mfe_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Verifica o status de um equipamento MFE"""
    verify_permissions(current_user, "fiscal:mfe:read")

    success, message, status_data = mfe_service.check_equipment_status(equipment_id)

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {"success": True, "message": message, "status": status_data}


@router.post(
    "/mfe/equipment/{equipment_id}/configuration", response_model=Dict[str, Any]
)
async def set_mfe_configuration(
    request: MFEConfigurationRequest,
    equipment_id: str = Path(..., description="ID do equipamento MFE"),
    mfe_service: MFEService = Depends(get_mfe_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Define uma configuração para um equipamento MFE"""
    verify_permissions(current_user, "fiscal:mfe:configure")

    success, message = mfe_service.set_configuration(
        equipment_id,
        request.parameter_name,
        request.parameter_value,
        request.description,
        current_user.get("username", "system"),
    )

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {"success": True, "message": message}


@router.get(
    "/mfe/equipment/{equipment_id}/configuration", response_model=List[MFEConfiguration]
)
async def get_mfe_configurations(
    equipment_id: str = Path(..., description="ID do equipamento MFE"),
    mfe_service: MFEService = Depends(get_mfe_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Obtém todas as configurações de um equipamento MFE"""
    verify_permissions(current_user, "fiscal:mfe:read")

    configurations = mfe_service.get_all_configurations(equipment_id)
    return configurations


@router.post("/mfe/equipment/{equipment_id}/maintenance/schedule")
async def schedule_mfe_maintenance(
    request: MFEMaintenanceScheduleRequest,
    equipment_id: str = Path(..., description="ID do equipamento MFE"),
    mfe_service: MFEService = Depends(get_mfe_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Agenda uma manutenção para um equipamento MFE"""
    verify_permissions(current_user, "fiscal:mfe:maintenance")

    success, message, schedule_id = mfe_service.schedule_maintenance(
        equipment_id,
        request.scheduled_date,
        request.maintenance_type,
        request.description,
        request.technician_info,
    )

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {"success": True, "message": message, "schedule_id": schedule_id}


@router.post("/mfe/maintenance/{schedule_id}/complete")
async def complete_mfe_maintenance(
    request: MFEMaintenanceCompleteRequest,
    schedule_id: str = Path(..., description="ID do agendamento de manutenção"),
    mfe_service: MFEService = Depends(get_mfe_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Marca uma manutenção como concluída"""
    verify_permissions(current_user, "fiscal:mfe:maintenance")

    success, message = mfe_service.complete_maintenance(
        schedule_id, request.completion_notes
    )

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {"success": True, "message": message}


@router.get("/mfe/equipment", response_model=PaginatedResponse)
async def list_mfe_equipment(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(20, ge=1, le=100, description="Tamanho da página"),
    status: Optional[MFEStatus] = Query(None, description="Filtrar por status"),
    state_code: Optional[str] = Query(None, description="Filtrar por estado"),
    mfe_service: MFEService = Depends(get_mfe_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Lista equipamentos MFE com filtros e paginação"""
    verify_permissions(current_user, "fiscal:mfe:read")

    # Constrói os filtros
    filters: Dict[str, Any] = {}

    if status:
        filters["status"] = status

    if state_code:
        filters["state_code"] = state_code

    # Busca os equipamentos
    equipments, total = mfe_service.list_equipment(filters, page, page_size)

    # Calcula o total de páginas
    total_pages = (total + page_size - 1) // page_size

    return {
        "items": equipments,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# Rotas para Contabilidade
@router.post("/accounting/provider", response_model=AccountingProvider, status_code=201)
async def register_accounting_provider(
    request: AccountingProviderCreateRequest,
    accounting_service: AccountingService = Depends(get_accounting_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Registra um novo provedor de serviços contábeis"""
    verify_permissions(current_user, "fiscal:accounting:create")

    try:
        provider = accounting_service.register_provider(request.dict())
        return provider
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao registrar provedor: {str(e)}"
        ) from e


@router.get("/accounting/provider/{provider_id}", response_model=AccountingProvider)
async def get_accounting_provider(
    provider_id: str = Path(..., description="ID do provedor"),
    accounting_service: AccountingService = Depends(get_accounting_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Obtém um provedor pelo ID"""
    verify_permissions(current_user, "fiscal:accounting:read")

    provider = accounting_service.get_provider(provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provedor não encontrado")

    return provider


@router.put("/accounting/provider/{provider_id}", response_model=AccountingProvider)
async def update_accounting_provider(
    request: AccountingProviderUpdateRequest,
    provider_id: str = Path(..., description="ID do provedor"),
    accounting_service: AccountingService = Depends(get_accounting_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Atualiza um provedor"""
    verify_permissions(current_user, "fiscal:accounting:update")

    try:
        provider = accounting_service.update_provider(
            provider_id, request.dict(exclude_unset=True)
        )
        if not provider:
            raise HTTPException(status_code=404, detail="Provedor não encontrado")

        return provider
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar provedor: {str(e)}"
        ) from e


@router.post("/accounting/mapping", response_model=AccountingMapping, status_code=201)
async def create_accounting_mapping(
    request: AccountingMappingCreateRequest,
    accounting_service: AccountingService = Depends(get_accounting_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Cria um novo mapeamento de contas contábeis"""
    verify_permissions(current_user, "fiscal:accounting:create")

    try:
        mapping = accounting_service.create_mapping(request.dict())
        return mapping
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar mapeamento: {str(e)}"
        ) from e


@router.get("/accounting/mapping/{mapping_id}", response_model=AccountingMapping)
async def get_accounting_mapping(
    mapping_id: str = Path(..., description="ID do mapeamento"),
    accounting_service: AccountingService = Depends(get_accounting_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Obtém um mapeamento pelo ID"""
    verify_permissions(current_user, "fiscal:accounting:read")

    mapping = accounting_service.get_mapping(mapping_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapeamento não encontrado")

    return mapping


@router.put("/accounting/mapping/{mapping_id}", response_model=AccountingMapping)
async def update_accounting_mapping(
    request: AccountingMappingUpdateRequest,
    mapping_id: str = Path(..., description="ID do mapeamento"),
    accounting_service: AccountingService = Depends(get_accounting_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Atualiza um mapeamento"""
    verify_permissions(current_user, "fiscal:accounting:update")

    try:
        mapping = accounting_service.update_mapping(
            mapping_id, request.dict(exclude_unset=True)
        )
        if not mapping:
            raise HTTPException(status_code=404, detail="Mapeamento não encontrado")

        return mapping
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar mapeamento: {str(e)}"
        ) from e


@router.post(
    "/accounting/export", response_model=AccountingExportBatch, status_code=201
)
async def create_export_batch(
    request: AccountingExportBatchCreateRequest,
    accounting_service: AccountingService = Depends(get_accounting_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Cria um novo lote de exportação contábil"""
    verify_permissions(current_user, "fiscal:accounting:export")

    try:
        batch = accounting_service.create_export_batch(
            request.reference_period,
            request.export_destination,
            current_user.get("username", "system"),
            request.notes,
        )
        return batch
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar lote de exportação: {str(e)}"
        ) from e


@router.post("/accounting/export/{batch_id}/process")
async def process_export_batch(
    batch_id: str = Path(..., description="ID do lote de exportação"),
    accounting_service: AccountingService = Depends(get_accounting_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Processa um lote de exportação contábil"""
    verify_permissions(current_user, "fiscal:accounting:export")

    success, message, file_path = accounting_service.process_export_batch(batch_id)

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {"success": True, "message": message, "file_path": file_path}


@router.get("/accounting/export/{batch_id}", response_model=AccountingExportBatch)
async def get_export_batch(
    batch_id: str = Path(..., description="ID do lote de exportação"),
    accounting_service: AccountingService = Depends(get_accounting_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Obtém um lote de exportação pelo ID"""
    verify_permissions(current_user, "fiscal:accounting:read")

    batch = accounting_service.get_export_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Lote de exportação não encontrado")

    return batch


@router.get("/accounting/export/{batch_id}/items", response_model=PaginatedResponse)
async def list_export_items(
    batch_id: str = Path(..., description="ID do lote de exportação"),
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(20, ge=1, le=100, description="Tamanho da página"),
    accounting_service: AccountingService = Depends(get_accounting_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Lista itens de exportação de um lote"""
    verify_permissions(current_user, "fiscal:accounting:read")

    items, total = accounting_service.list_export_items(batch_id, page, page_size)

    # Calcula o total de páginas
    total_pages = (total + page_size - 1) // page_size

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.post("/accounting/schedule", response_model=AccountingSchedule, status_code=201)
async def create_accounting_schedule(
    request: AccountingScheduleCreateRequest,
    accounting_service: AccountingService = Depends(get_accounting_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Cria um novo agendamento de exportação contábil"""
    verify_permissions(current_user, "fiscal:accounting:schedule")

    try:
        schedule = accounting_service.create_schedule(request.dict())
        return schedule
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar agendamento: {str(e)}"
        ) from e


@router.get("/accounting/schedule/{schedule_id}", response_model=AccountingSchedule)
async def get_accounting_schedule(
    schedule_id: str = Path(..., description="ID do agendamento"),
    accounting_service: AccountingService = Depends(get_accounting_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Obtém um agendamento pelo ID"""
    verify_permissions(current_user, "fiscal:accounting:read")

    schedule = accounting_service.get_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")

    return schedule


@router.put("/accounting/schedule/{schedule_id}", response_model=AccountingSchedule)
async def update_accounting_schedule(
    request: AccountingScheduleUpdateRequest,
    schedule_id: str = Path(..., description="ID do agendamento"),
    accounting_service: AccountingService = Depends(get_accounting_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Atualiza um agendamento"""
    verify_permissions(current_user, "fiscal:accounting:update")

    try:
        schedule = accounting_service.update_schedule(
            schedule_id, request.dict(exclude_unset=True)
        )
        if not schedule:
            raise HTTPException(status_code=404, detail="Agendamento não encontrado")

        return schedule
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar agendamento: {str(e)}"
        ) from e


@router.post("/accounting/execute-scheduled")
async def execute_scheduled_exports(
    accounting_service: AccountingService = Depends(get_accounting_service),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Executa as exportações agendadas que estão pendentes"""
    verify_permissions(current_user, "fiscal:accounting:export")

    results = accounting_service.execute_scheduled_exports()

    return {
        "success": True,
        "message": f"Processados {len(results)} agendamentos",
        "results": results,
    }
