"""
Modelos de dados para integração contábil
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class AccountingExportStatus(str, Enum):
    """Status possíveis para exportação contábil"""

    PENDING = "pending"  # Pendente de exportação
    PROCESSING = "processing"  # Em processamento
    COMPLETED = "completed"  # Exportação concluída com sucesso
    FAILED = "failed"  # Falha na exportação
    PARTIAL = "partial"  # Exportação parcial (com alguns erros)


class DocumentType(str, Enum):
    """Tipos de documentos fiscais suportados"""

    NFCE = "nfce"  # Nota Fiscal de Consumidor Eletrônica
    CFE = "cfe"  # Cupom Fiscal Eletrônico
    SAT = "sat"  # Sistema Autenticador e Transmissor
    NFSE = "nfse"  # Nota Fiscal de Serviço Eletrônica


class AccountingExportBatch(BaseModel):
    """Lote de exportação contábil"""

    id: str
    reference_period: str  # Período de referência (YYYY-MM)
    status: AccountingExportStatus
    start_date: datetime
    end_date: Optional[datetime] = None
    document_count: int
    total_value: float
    export_destination: str  # Sistema contábil de destino (ex: "contabilizei")
    created_by: str
    notes: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class AccountingExportItem(BaseModel):
    """Item individual de exportação contábil"""

    id: str
    batch_id: str
    document_type: DocumentType
    document_id: str
    document_number: str
    document_date: datetime
    document_value: float
    status: AccountingExportStatus
    export_data: Dict[str, Any]  # Dados específicos para exportação
    error_details: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class AccountingMapping(BaseModel):
    """Mapeamento de contas contábeis"""

    id: str
    source_code: str  # Código no sistema POS
    target_code: str  # Código no sistema contábil
    description: str
    account_type: str  # Tipo de conta (receita, despesa, etc)
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class AccountingProvider(BaseModel):
    """Configuração de provedor de serviços contábeis"""

    id: str
    name: str
    provider_type: str  # Tipo de provedor (ex: "contabilizei")
    api_url: str
    api_key: Optional[str] = None
    auth_token: Optional[str] = None
    auth_method: str
    export_format: str  # Formato de exportação (json, xml, csv)
    is_active: bool = True
    settings: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class AccountingSchedule(BaseModel):
    """Agendamento de exportação contábil"""

    id: str
    frequency: str  # daily, weekly, monthly
    day_of_week: Optional[int] = None  # 0-6 (segunda a domingo)
    day_of_month: Optional[int] = None  # 1-31
    time_of_day: str  # HH:MM
    is_active: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
