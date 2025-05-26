from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field

class RemotePlatform(str, Enum):
    """Plataformas de pedidos remotos suportadas."""
    IFOOD = "ifood"
    UBER_EATS = "ubereats"
    RAPPI = "rappi"
    # Adicionar outras plataformas conforme necessário

class RemoteOrderStatus(str, Enum):
    """Status de pedidos remotos."""
    PENDING = "pending"  # Recebido, aguardando aceitação
    ACCEPTED = "accepted"  # Aceito pelo restaurante
    REJECTED = "rejected"  # Rejeitado pelo restaurante
    PREPARING = "preparing"  # Em preparação
    READY = "ready"  # Pronto para entrega/retirada
    DELIVERING = "delivering"  # Em rota de entrega
    DELIVERED = "delivered"  # Entregue ao cliente
    CANCELLED = "cancelled"  # Cancelado
    ERROR = "error"  # Erro no processamento

class RemoteOrderItem(BaseModel):
    """Item de um pedido remoto."""
    id: str
    external_id: Optional[str] = None
    name: str
    quantity: int
    unit_price: float
    total_price: float
    notes: Optional[str] = None
    customizations: List[Dict[str, Any]] = []

class RemoteOrderCustomer(BaseModel):
    """Dados do cliente em um pedido remoto."""
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    document: Optional[str] = None  # CPF/CNPJ

class RemoteOrderPayment(BaseModel):
    """Informações de pagamento de um pedido remoto."""
    method: str
    status: str
    total: float
    change: Optional[float] = None
    prepaid: bool = False

class RemoteOrder(BaseModel):
    """Modelo para pedidos recebidos de plataformas externas."""
    id: str
    platform: RemotePlatform
    external_order_id: str
    internal_order_id: Optional[str] = None
    status: RemoteOrderStatus
    items: List[RemoteOrderItem]
    customer: RemoteOrderCustomer
    payment: RemoteOrderPayment
    subtotal: float
    delivery_fee: Optional[float] = None
    service_fee: Optional[float] = None
    discount: Optional[float] = None
    total: float
    notes: Optional[str] = None
    scheduled_for: Optional[datetime] = None
    raw_data: Dict[str, Any]  # Dados originais da plataforma
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class RemotePlatformConfig(BaseModel):
    """Configuração para integração com plataforma remota."""
    platform: RemotePlatform
    enabled: bool = True
    api_key: str
    api_secret: str
    webhook_url: str
    auto_accept: bool = False
    default_preparation_time: int = 30  # em minutos
    notification_email: Optional[str] = None
    notification_phone: Optional[str] = None

class RemoteOrderCreate(BaseModel):
    """Modelo para criação manual de pedidos remotos (para testes)."""
    platform: RemotePlatform
    external_order_id: str
    items: List[RemoteOrderItem]
    customer: RemoteOrderCustomer
    payment: RemoteOrderPayment
    subtotal: float
    delivery_fee: Optional[float] = None
    service_fee: Optional[float] = None
    discount: Optional[float] = None
    total: float
    notes: Optional[str] = None
    scheduled_for: Optional[datetime] = None
    raw_data: Optional[Dict[str, Any]] = None

class RemoteOrderUpdate(BaseModel):
    """Modelo para atualização de pedidos remotos."""
    status: Optional[RemoteOrderStatus] = None
    internal_order_id: Optional[str] = None
    notes: Optional[str] = None

class RemoteOrderResponse(BaseModel):
    """Resposta para operações com pedidos remotos."""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
