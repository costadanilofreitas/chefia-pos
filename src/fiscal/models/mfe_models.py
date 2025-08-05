"""
Modelos de dados para MFE (Módulo Fiscal Eletrônico)
"""

from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field


class MFEStatus(str, Enum):
    """Status possíveis para um equipamento MFE"""

    ACTIVE = "active"  # Equipamento ativo e operacional
    INACTIVE = "inactive"  # Equipamento inativo
    MAINTENANCE = "maintenance"  # Em manutenção
    ERROR = "error"  # Com erro
    BLOCKED = "blocked"  # Bloqueado pela SEFAZ


class MFEOperationType(str, Enum):
    """Tipos de operação do MFE"""

    EMISSION = "emission"  # Emissão de documento fiscal
    CANCELLATION = "cancellation"  # Cancelamento de documento
    CONFIGURATION = "configuration"  # Configuração do equipamento
    CONSULTATION = "consultation"  # Consulta de status
    TEST = "test"  # Teste de comunicação


class MFEEquipment(BaseModel):
    """Informações do equipamento MFE"""

    id: str
    serial_number: str
    model: str
    manufacturer: str
    firmware_version: str
    activation_date: datetime
    status: MFEStatus
    last_communication: Optional[datetime] = None
    last_maintenance: Optional[datetime] = None
    state_code: str  # Código do estado (UF)
    store_id: str  # Identificador da loja/estabelecimento
    activation_code: Optional[str] = None
    technical_contact: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class MFEOperation(BaseModel):
    """Registro de operações realizadas no MFE"""

    id: str
    equipment_id: str
    operation_type: MFEOperationType
    operation_date: datetime
    document_id: Optional[str] = None  # ID do documento fiscal relacionado
    status: str
    request_data: Dict[str, Any]
    response_data: Optional[Dict[str, Any]] = None
    error_details: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.now)


class MFEConfiguration(BaseModel):
    """Configurações do MFE"""

    id: str
    equipment_id: str
    parameter_name: str
    parameter_value: str
    description: Optional[str] = None
    updated_by: str
    updated_at: datetime = Field(default_factory=datetime.now)


class MFEStateRule(BaseModel):
    """Regras específicas por estado para MFE"""

    state_code: str
    state_name: str
    webservice_url: str
    contingency_url: Optional[str] = None
    certificate_required: bool = True
    special_parameters: Dict[str, Any] = {}
    active: bool = True
    updated_at: datetime = Field(default_factory=datetime.now)


class MFEMaintenanceSchedule(BaseModel):
    """Agendamento de manutenção para equipamentos MFE"""

    id: str
    equipment_id: str
    scheduled_date: datetime
    maintenance_type: str
    description: str
    technician_info: Optional[Dict[str, Any]] = None
    status: str = "scheduled"  # scheduled, completed, cancelled
    completion_date: Optional[datetime] = None
    completion_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
