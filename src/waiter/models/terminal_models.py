from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class TerminalType(str, Enum):
    """Tipos de terminais de pagamento suportados."""

    REDE_SMART_1 = "rede_smart_1"
    REDE_SMART_2 = "rede_smart_2"
    REDE_POP = "rede_pop"
    CIELO_LIO_PLUS = "cielo_lio_plus"
    CIELO_LIO_V3 = "cielo_lio_v3"
    CIELO_FLASH = "cielo_flash"
    OTHER = "other"


class TerminalStatus(str, Enum):
    """Status possíveis para um terminal de pagamento."""

    ONLINE = "online"
    OFFLINE = "offline"
    BUSY = "busy"
    ERROR = "error"
    MAINTENANCE = "maintenance"


class TerminalCapabilities(BaseModel):
    """Recursos disponíveis em um terminal de pagamento."""

    screen_size: str = Field(..., description="Tamanho da tela em polegadas")
    resolution: str = Field(..., description="Resolução da tela (ex: 480x800)")
    touch_screen: bool = Field(True, description="Se possui tela sensível ao toque")
    printer: bool = Field(True, description="Se possui impressora integrada")
    nfc: bool = Field(False, description="Se possui leitor NFC")
    camera: bool = Field(False, description="Se possui câmera")
    barcode_scanner: bool = Field(
        False, description="Se possui leitor de código de barras"
    )
    wifi: bool = Field(True, description="Se possui conectividade Wi-Fi")
    mobile_data: bool = Field(
        False, description="Se possui conectividade de dados móveis"
    )
    bluetooth: bool = Field(False, description="Se possui conectividade Bluetooth")
    battery_powered: bool = Field(False, description="Se funciona com bateria")
    memory: str = Field("1GB", description="Quantidade de memória RAM")
    storage: str = Field("8GB", description="Capacidade de armazenamento")


class TerminalConfig(BaseModel):
    """Configuração para um terminal de pagamento."""

    id: str = Field(..., description="Identificador único do terminal")
    name: str = Field(..., description="Nome do terminal")
    type: TerminalType = Field(..., description="Tipo do terminal")
    capabilities: TerminalCapabilities = Field(..., description="Recursos do terminal")
    api_key: Optional[str] = Field(None, description="Chave de API para integração")
    api_secret: Optional[str] = Field(
        None, description="Segredo de API para integração"
    )
    merchant_id: Optional[str] = Field(
        None, description="ID do comerciante na operadora"
    )
    terminal_id: Optional[str] = Field(None, description="ID do terminal na operadora")
    sync_interval: int = Field(5, description="Intervalo de sincronização em minutos")
    offline_mode_enabled: bool = Field(
        True, description="Se o modo offline está habilitado"
    )
    max_offline_orders: int = Field(50, description="Número máximo de pedidos offline")
    created_at: datetime = Field(
        default_factory=datetime.now, description="Data de criação"
    )
    updated_at: datetime = Field(
        default_factory=datetime.now, description="Data da última atualização"
    )


class TerminalSession(BaseModel):
    """Sessão ativa em um terminal de pagamento."""

    id: str = Field(..., description="Identificador único da sessão")
    terminal_id: str = Field(..., description="ID do terminal")
    waiter_id: str = Field(..., description="ID do garçom logado")
    status: TerminalStatus = Field(
        TerminalStatus.ONLINE, description="Status atual do terminal"
    )
    started_at: datetime = Field(
        default_factory=datetime.now, description="Data de início da sessão"
    )
    last_activity: datetime = Field(
        default_factory=datetime.now, description="Data da última atividade"
    )
    last_sync: datetime = Field(
        default_factory=datetime.now, description="Data da última sincronização"
    )
    pending_orders: List[str] = Field(
        [], description="IDs de pedidos pendentes de sincronização"
    )
    battery_level: Optional[int] = Field(
        None, description="Nível de bateria em percentual"
    )
    signal_strength: Optional[int] = Field(
        None, description="Força do sinal em percentual"
    )
    metadata: Dict[str, Any] = Field({}, description="Metadados adicionais da sessão")


class OfflineOrder(BaseModel):
    """Pedido criado em modo offline no terminal."""

    id: str = Field(..., description="Identificador único do pedido offline")
    terminal_id: str = Field(..., description="ID do terminal")
    waiter_id: str = Field(..., description="ID do garçom")
    table_id: str = Field(..., description="ID da mesa")
    items: List[Dict[str, Any]] = Field(..., description="Itens do pedido")
    total: float = Field(..., description="Valor total do pedido")
    created_at: datetime = Field(
        default_factory=datetime.now, description="Data de criação"
    )
    synced: bool = Field(False, description="Se o pedido foi sincronizado")
    synced_at: Optional[datetime] = Field(None, description="Data de sincronização")
    server_order_id: Optional[str] = Field(
        None, description="ID do pedido no servidor após sincronização"
    )
    metadata: Dict[str, Any] = Field({}, description="Metadados adicionais do pedido")
