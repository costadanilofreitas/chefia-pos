from enum import Enum
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime


class SATStatus(str, Enum):
    """Status do equipamento SAT."""
    UNKNOWN = "unknown"
    READY = "ready"
    BUSY = "busy"
    ERROR = "error"
    BLOCKED = "blocked"
    OFFLINE = "offline"


class SATDriverType(str, Enum):
    """Tipos de drivers SAT suportados."""
    SIMULATED = "simulated"
    DIMEP = "dimep"
    BEMATECH = "bematech"
    ELGIN = "elgin"
    GENERIC = "generic"


class ContingencyMode(str, Enum):
    """Modos de contingência para o SAT."""
    NONE = "none"
    OFFLINE = "offline"
    MANUAL = "manual"


class CFeTaxGroup(BaseModel):
    """Grupo de tributação para itens do CF-e."""
    code: str
    description: str
    tax_rate: float
    cst: str = ""
    cfop: str = ""
    origin: str = "0"  # 0 = Nacional


class CFeTaxation(BaseModel):
    """Configuração de tributação para o CF-e."""
    icms_groups: Dict[str, CFeTaxGroup] = Field(default_factory=dict)
    pis_groups: Dict[str, CFeTaxGroup] = Field(default_factory=dict)
    cofins_groups: Dict[str, CFeTaxGroup] = Field(default_factory=dict)
    default_icms_group: str = "ICMS00"
    default_pis_group: str = "PIS01"
    default_cofins_group: str = "COFINS01"


class SATConfig(BaseModel):
    """Configuração do equipamento SAT."""
    enabled: bool = False
    driver_type: SATDriverType = SATDriverType.SIMULATED
    device_code: str = ""
    activation_code: str = ""
    signature_ac: str = ""
    cnpj: str = ""
    ie: str = ""
    business_name: str = ""
    connection_params: Dict[str, Any] = Field(default_factory=dict)
    contingency_mode: ContingencyMode = ContingencyMode.OFFLINE
    auto_print: bool = True
    retry_attempts: int = 3
    taxation: CFeTaxation = Field(default_factory=CFeTaxation)

    @validator('cnpj')
    def validate_cnpj(cls, v):
        """Valida o formato do CNPJ."""
        if v and not v.isdigit():
            v = ''.join(filter(str.isdigit, v))
        if v and len(v) != 14:
            raise ValueError('CNPJ deve ter 14 dígitos')
        return v

    @validator('ie')
    def validate_ie(cls, v):
        """Valida o formato da Inscrição Estadual."""
        if v and not v.isdigit():
            v = ''.join(filter(str.isdigit, v))
        return v


class CFePagamento(BaseModel):
    """Informações de pagamento do CF-e."""
    tipo: str  # Código do meio de pagamento conforme SAT
    valor: float
    credenciadora: Optional[str] = None  # Para cartões
    nsu: Optional[str] = None  # Para cartões


class CFeItem(BaseModel):
    """Item do CF-e."""
    numero: int
    codigo: str
    descricao: str
    quantidade: float
    unidade: str
    valor_unitario: float
    valor_total: float
    icms_grupo: str
    pis_grupo: str
    cofins_grupo: str
    origem: str = "0"  # 0 = Nacional
    ncm: Optional[str] = None


class CFe(BaseModel):
    """Modelo do Cupom Fiscal Eletrônico."""
    id: str
    chave_acesso: Optional[str] = None
    numero_serie: Optional[str] = None
    data_emissao: Optional[datetime] = None
    cnpj_emitente: str
    ie_emitente: str
    razao_social_emitente: str
    cnpj_destinatario: Optional[str] = None
    cpf_destinatario: Optional[str] = None
    nome_destinatario: Optional[str] = None
    valor_total: float
    desconto: float = 0
    acrescimo: float = 0
    itens: List[CFeItem] = Field(default_factory=list)
    pagamentos: List[CFePagamento] = Field(default_factory=list)
    observacoes: Optional[str] = None
    status: str = "pendente"  # pendente, emitido, cancelado, erro
    xml: Optional[str] = None
    qrcode: Optional[str] = None
    numero_extrato: Optional[str] = None
    order_id: str
    terminal_id: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    error_message: Optional[str] = None
    contingency: bool = False

    @validator('cnpj_emitente', 'cnpj_destinatario')
    def validate_cnpj(cls, v):
        """Valida o formato do CNPJ."""
        if v and not v.isdigit():
            v = ''.join(filter(str.isdigit, v))
        if v and len(v) != 14:
            raise ValueError('CNPJ deve ter 14 dígitos')
        return v

    @validator('cpf_destinatario')
    def validate_cpf(cls, v):
        """Valida o formato do CPF."""
        if v and not v.isdigit():
            v = ''.join(filter(str.isdigit, v))
        if v and len(v) != 11:
            raise ValueError('CPF deve ter 11 dígitos')
        return v


class SATLog(BaseModel):
    """Registro de operações e erros do SAT."""
    id: str
    terminal_id: str
    operation: str  # emitir, cancelar, consultar, etc.
    status: str  # success, error
    message: str
    details: Optional[Dict[str, Any]] = None
    cfe_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)


class SATResponse(BaseModel):
    """Resposta de operações do SAT."""
    success: bool
    message: str
    cfe: Optional[CFe] = None
    details: Optional[Dict[str, Any]] = None


class SATStatusResponse(BaseModel):
    """Resposta de consulta de status do SAT."""
    status: SATStatus
    message: str
    last_communication: Optional[datetime] = None
    details: Optional[Dict[str, Any]] = None


class SATEmitRequest(BaseModel):
    """Requisição para emissão de CF-e."""
    order_id: str
    terminal_id: str
    customer_document: Optional[str] = None  # CPF/CNPJ do cliente
    customer_name: Optional[str] = None  # Nome do cliente


class SATCancelRequest(BaseModel):
    """Requisição para cancelamento de CF-e."""
    cfe_id: str
    reason: str
