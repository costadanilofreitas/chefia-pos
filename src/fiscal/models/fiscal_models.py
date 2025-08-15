import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


class RegimeTributario(str, Enum):
    """Regimes tributários suportados."""

    SIMPLES = "simples"
    LUCRO_PRESUMIDO = "lucro_presumido"
    LUCRO_REAL = "lucro_real"
    MEI = "mei"


class TipoImposto(str, Enum):
    """Tipos de impostos suportados."""

    ICMS = "icms"
    PIS = "pis"
    COFINS = "cofins"
    ISS = "iss"
    IPI = "ipi"
    ICMS_ST = "icms_st"


class TipoItem(str, Enum):
    """Tipos de itens para classificação fiscal."""

    PRODUTO = "produto"
    SERVICO = "servico"
    PRODUTO_SERVICO = "produto_servico"


class OrigemProduto(str, Enum):
    """Códigos de origem do produto conforme legislação fiscal."""

    NACIONAL = "0"
    ESTRANGEIRA_IMPORTACAO_DIRETA = "1"
    ESTRANGEIRA_ADQUIRIDA_MERCADO_INTERNO = "2"
    NACIONAL_CONTEUDO_IMPORTACAO_SUPERIOR_40 = "3"
    NACIONAL_PROCESSOS_PRODUTIVOS_BASICOS = "4"
    NACIONAL_CONTEUDO_IMPORTACAO_INFERIOR_40 = "5"
    ESTRANGEIRA_IMPORTACAO_DIRETA_SEM_SIMILAR = "6"
    ESTRANGEIRA_ADQUIRIDA_MERCADO_INTERNO_SEM_SIMILAR = "7"
    NACIONAL_CONTEUDO_IMPORTACAO_SUPERIOR_70 = "8"


class ImpostoConfig(BaseModel):
    """Configuração base para um imposto."""

    cst: str
    aliquota: float
    base_calculo: float = 100.0  # Percentual da base de cálculo (100% = valor total)


class ICMSConfig(ImpostoConfig):
    """Configuração específica para ICMS."""

    modalidade_base_calculo: Optional[str] = None
    percentual_reducao_base_calculo: float = 0.0
    percentual_margem_valor_adicionado: float = 0.0
    modalidade_st: Optional[str] = None


class PISConfig(ImpostoConfig):
    """Configuração específica para PIS."""

    pass


class COFINSConfig(ImpostoConfig):
    """Configuração específica para COFINS."""

    pass


class ISSConfig(BaseModel):
    """Configuração específica para ISS."""

    aliquota: float
    base_calculo: float = 100.0
    codigo_servico: Optional[str] = None
    municipio_incidencia: Optional[str] = None


class IPIConfig(ImpostoConfig):
    """Configuração específica para IPI."""

    codigo_enquadramento: Optional[str] = None


class GrupoFiscal(BaseModel):
    """Grupo fiscal para produtos ou serviços."""

    id: str
    descricao: str
    codigo_ncm: Optional[str] = None
    codigo_cest: Optional[str] = None
    tipo_item: TipoItem
    origem: OrigemProduto = OrigemProduto.NACIONAL
    icms: Optional[ICMSConfig] = None
    pis: Optional[PISConfig] = None
    cofins: Optional[COFINSConfig] = None
    iss: Optional[ISSConfig] = None
    ipi: Optional[IPIConfig] = None
    observacoes: Optional[str] = None
    ativo: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class RegraNcm(BaseModel):
    """Regra fiscal específica para um código NCM."""

    codigo_ncm: str
    descricao: str
    aliquota_icms: float
    aliquota_pis: float
    aliquota_cofins: float
    cst_icms: str
    cst_pis: str
    cst_cofins: str
    cfop: str
    percentual_reducao_base_calculo: float = 0.0
    observacoes: Optional[str] = None


class BeneficioFiscal(BaseModel):
    """Benefício fiscal aplicável a determinados produtos ou operações."""

    codigo: str
    descricao: str
    tipo_imposto: TipoImposto
    percentual_reducao: float
    data_inicio: datetime
    data_fim: Optional[datetime] = None
    uf: Optional[str] = None
    municipio: Optional[str] = None
    codigos_ncm: List[str] = Field(default_factory=list)
    observacoes: Optional[str] = None
    ativo: bool = True


class ConfiguracaoRegional(BaseModel):
    """Configuração fiscal para uma região específica (UF ou município)."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    uf: str
    municipio: Optional[str] = None
    regime_tributario: RegimeTributario = RegimeTributario.SIMPLES
    aliquota_icms_padrao: float
    aliquota_iss_padrao: float = 0.0
    substituicao_tributaria: bool = False
    regras_ncm: List[RegraNcm] = Field(default_factory=list)
    beneficios_fiscais: List[BeneficioFiscal] = Field(default_factory=list)
    observacoes: Optional[str] = None
    ativo: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    @validator("uf")
    def validate_uf(cls, v):
        """Valida o formato da UF."""
        if v and len(v) != 2:
            raise ValueError("UF deve ter 2 caracteres")
        return v.upper()


class ImpostoCalculado(BaseModel):
    """Resultado do cálculo de um imposto específico."""

    tipo: TipoImposto
    cst: str
    aliquota: float
    base_calculo: float
    valor: float
    observacoes: Optional[str] = None


class ItemCalculoFiscal(BaseModel):
    """Resultado do cálculo fiscal para um item."""

    item_id: str
    valor_bruto: float
    valor_liquido: float
    descontos: float = 0.0
    acrescimos: float = 0.0
    impostos: Dict[str, ImpostoCalculado] = Field(default_factory=dict)
    total_impostos: float = 0.0
    origem: OrigemProduto = OrigemProduto.NACIONAL
    ncm: Optional[str] = None
    cest: Optional[str] = None
    cfop: Optional[str] = None
    observacoes: Optional[str] = None


class ResultadoCalculoFiscal(BaseModel):
    """Resultado completo do cálculo fiscal para um pedido."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    subtotal: float
    descontos: float = 0.0
    acrescimos: float = 0.0
    valor_total: float
    itens: List[ItemCalculoFiscal] = Field(default_factory=list)
    total_impostos: float = 0.0
    observacoes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)


class CalculoFiscalRequest(BaseModel):
    """Requisição para cálculo fiscal."""

    order_id: str
    region_id: Optional[str] = None
    uf: Optional[str] = None
    municipio: Optional[str] = None


class ProductFiscalInfo(BaseModel):
    """Informações fiscais de um produto."""

    fiscal_group_id: str
    ncm: Optional[str] = None
    cest: Optional[str] = None
    origem: OrigemProduto = OrigemProduto.NACIONAL


class FiscalLog(BaseModel):
    """Registro de operações fiscais para auditoria."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    operation: str  # calculate, update_config, etc.
    order_id: Optional[str] = None
    region_id: Optional[str] = None
    user_id: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    success: bool = True
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
