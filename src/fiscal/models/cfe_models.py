"""
Modelos de dados para documentos fiscais CF-e (Cupom Fiscal Eletrônico)
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class CFeStatus(str, Enum):
    """Status possíveis para um CF-e"""

    DRAFT = "draft"  # Rascunho, ainda não enviado
    PENDING = "pending"  # Enviado, aguardando resposta
    AUTHORIZED = "authorized"  # Autorizado pelo SAT/MFE
    REJECTED = "rejected"  # Rejeitado pelo SAT/MFE
    CANCELLED = "cancelled"  # Cancelado após autorização
    ERROR = "error"  # Erro no processamento


class CFeItem(BaseModel):
    """Item de um CF-e"""

    id: str
    product_id: str
    product_code: str
    product_description: str
    quantity: float
    unit_price: float
    total_price: float
    unit_measure: str
    ncm_code: str  # Nomenclatura Comum do Mercosul
    cfop: str  # Código Fiscal de Operações e Prestações
    taxes: Dict[str, Dict[str, Any]]
    discount: float = 0.0
    additional_info: Optional[str] = None


class CFePayment(BaseModel):
    """Informações de pagamento do CF-e"""

    method: str  # Método de pagamento (dinheiro, cartão, etc)
    value: float
    card_info: Optional[Dict[str, Any]] = None  # Informações do cartão, se aplicável
    installments: Optional[int] = None  # Número de parcelas, se aplicável


class CFeCustomer(BaseModel):
    """Informações do cliente (opcional no CF-e)"""

    id: Optional[str] = None
    name: Optional[str] = None
    document_type: Optional[str] = None  # CPF ou CNPJ
    document_number: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class CFeIssuer(BaseModel):
    """Informações do emissor do CF-e"""

    id: str
    name: str
    trade_name: str
    cnpj: str
    state_registration: str
    municipal_registration: Optional[str] = None
    address: Dict[str, Any]
    crt: str  # Código de Regime Tributário


class CFeResponse(BaseModel):
    """Resposta do SAT/MFE para o CF-e"""

    authorization_date: Optional[datetime] = None
    authorization_protocol: Optional[str] = None
    status_code: str
    status_message: str
    access_key: Optional[str] = None
    xml_response: Optional[str] = None
    qr_code_data: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None
    sat_serial_number: Optional[str] = None  # Número de série do equipamento SAT


class CFeDocument(BaseModel):
    """Modelo principal do CF-e"""

    id: str
    number: str
    issue_date: datetime
    status: CFeStatus
    items: List[CFeItem]
    payments: List[CFePayment]
    customer: Optional[CFeCustomer] = None
    issuer: CFeIssuer
    total_value: float
    discount_value: float = 0.0
    shipping_value: float = 0.0
    total_taxes: float
    additional_info: Optional[str] = None
    response: Optional[CFeResponse] = None
    state_code: str  # Código do estado (UF)
    operation_nature: str  # Natureza da operação
    emission_type: str  # Tipo de emissão (normal, contingência, etc)
    presence_indicator: str  # Indicador de presença do consumidor
    xml_content: Optional[str] = None  # Conteúdo XML do CF-e
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    accounting_exported: bool = False  # Indica se foi exportado para contabilidade
    sat_equipment_id: Optional[str] = None  # Identificador do equipamento SAT/MFE


class CFeEvent(BaseModel):
    """Eventos relacionados ao CF-e (cancelamento, etc)"""

    id: str
    cfe_id: str
    event_type: str
    event_date: datetime
    reason: str
    status: str
    protocol: Optional[str] = None
    xml_content: Optional[str] = None
    response: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.now)


class CFeStateRule(BaseModel):
    """Regras específicas por estado para CF-e"""

    state_code: str
    state_name: str
    requires_mfe: bool = False  # Indica se o estado requer MFE em vez de SAT
    special_rules: Dict[str, Any] = {}
    active: bool = True
    updated_at: datetime = Field(default_factory=datetime.now)
