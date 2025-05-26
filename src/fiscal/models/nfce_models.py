"""
Modelos de dados para documentos fiscais NFC-e (Nota Fiscal de Consumidor Eletrônica)
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field


class NFCeStatus(str, Enum):
    """Status possíveis para uma NFC-e"""
    DRAFT = "draft"  # Rascunho, ainda não enviado
    PENDING = "pending"  # Enviado, aguardando resposta
    AUTHORIZED = "authorized"  # Autorizado pela SEFAZ
    REJECTED = "rejected"  # Rejeitado pela SEFAZ
    CANCELLED = "cancelled"  # Cancelado após autorização
    ERROR = "error"  # Erro no processamento


class TaxType(str, Enum):
    """Tipos de impostos aplicáveis"""
    ICMS = "icms"
    PIS = "pis"
    COFINS = "cofins"
    IPI = "ipi"
    ISS = "iss"
    OUTROS = "outros"


class NFCeItem(BaseModel):
    """Item de uma NFC-e"""
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
    taxes: Dict[TaxType, Dict[str, Any]]
    discount: float = 0.0
    additional_info: Optional[str] = None


class NFCePayment(BaseModel):
    """Informações de pagamento da NFC-e"""
    method: str  # Método de pagamento (dinheiro, cartão, etc)
    value: float
    card_info: Optional[Dict[str, Any]] = None  # Informações do cartão, se aplicável
    installments: Optional[int] = None  # Número de parcelas, se aplicável


class NFCeCustomer(BaseModel):
    """Informações do cliente (opcional na NFC-e)"""
    id: Optional[str] = None
    name: Optional[str] = None
    document_type: Optional[str] = None  # CPF ou CNPJ
    document_number: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class NFCeIssuer(BaseModel):
    """Informações do emissor da NFC-e"""
    id: str
    name: str
    trade_name: str
    cnpj: str
    state_registration: str
    municipal_registration: Optional[str] = None
    address: Dict[str, Any]
    crt: str  # Código de Regime Tributário


class NFCeResponse(BaseModel):
    """Resposta da SEFAZ para a NFC-e"""
    authorization_date: Optional[datetime] = None
    authorization_protocol: Optional[str] = None
    status_code: str
    status_message: str
    access_key: Optional[str] = None
    xml_response: Optional[str] = None
    qr_code_data: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None


class NFCeDocument(BaseModel):
    """Modelo principal da NFC-e"""
    id: str
    number: str
    series: str
    issue_date: datetime
    status: NFCeStatus
    items: List[NFCeItem]
    payments: List[NFCePayment]
    customer: Optional[NFCeCustomer] = None
    issuer: NFCeIssuer
    total_value: float
    discount_value: float = 0.0
    shipping_value: float = 0.0
    total_taxes: float
    additional_info: Optional[str] = None
    response: Optional[NFCeResponse] = None
    state_code: str  # Código do estado (UF)
    operation_nature: str  # Natureza da operação
    emission_type: str  # Tipo de emissão (normal, contingência, etc)
    destination_type: str  # Tipo de destinatário
    presence_indicator: str  # Indicador de presença do consumidor
    xml_content: Optional[str] = None  # Conteúdo XML da NFC-e
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    accounting_exported: bool = False  # Indica se foi exportado para contabilidade


class NFCeEvent(BaseModel):
    """Eventos relacionados à NFC-e (cancelamento, inutilização, etc)"""
    id: str
    nfce_id: str
    event_type: str
    event_date: datetime
    reason: str
    status: str
    protocol: Optional[str] = None
    xml_content: Optional[str] = None
    response: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.now)


class NFCeStateRule(BaseModel):
    """Regras específicas por estado para NFC-e"""
    state_code: str
    state_name: str
    webservice_url: str
    contingency_url: Optional[str] = None
    certificate_required: bool = True
    special_rules: Dict[str, Any] = {}
    active: bool = True
    updated_at: datetime = Field(default_factory=datetime.now)
