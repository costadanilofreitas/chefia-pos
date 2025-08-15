import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class WaiterOrderStatus(str, Enum):
    """Status de um pedido no módulo de garçom."""

    DRAFT = "draft"  # Rascunho, ainda não enviado para a cozinha
    SENT = "sent"  # Enviado para a cozinha
    PREPARING = "preparing"  # Em preparo na cozinha
    READY = "ready"  # Pronto para entrega
    DELIVERED = "delivered"  # Entregue ao cliente
    CANCELLED = "cancelled"  # Cancelado


class WaiterOrderType(str, Enum):
    """Tipo de pedido no módulo de garçom."""

    DINE_IN = "dine_in"  # Consumo no local
    TAKEOUT = "takeout"  # Para viagem
    DELIVERY = "delivery"  # Entrega


class WaiterOrderItemCustomization(BaseModel):
    """Personalização de um item de pedido."""

    type: str  # "add", "remove", "substitute"
    ingredient_id: str
    ingredient_name: str
    price_adjustment: float = 0.0
    notes: Optional[str] = None


class WaiterOrderItemSection(BaseModel):
    """Seção de um item de pedido (ex: metade de uma pizza)."""

    section_id: str
    product_id: str
    product_name: str


class WaiterOrderItem(BaseModel):
    """Item de um pedido no módulo de garçom."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    product_id: str
    product_name: str
    product_type: str  # "simple", "composite", "combo"
    quantity: int
    unit_price: float
    total_price: float
    customizations: List[WaiterOrderItemCustomization] = []
    sections: List[WaiterOrderItemSection] = []
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None


class WaiterOrderItemCreate(BaseModel):
    """Dados para criação de um item de pedido."""

    product_id: str
    quantity: int = 1
    customizations: List[WaiterOrderItemCustomization] = []
    sections: List[WaiterOrderItemSection] = []
    notes: Optional[str] = None


class WaiterOrderItemUpdate(BaseModel):
    """Dados para atualização de um item de pedido."""

    quantity: Optional[int] = None
    customizations: Optional[List[WaiterOrderItemCustomization]] = None
    notes: Optional[str] = None


class WaiterOrder(BaseModel):
    """Pedido no módulo de garçom."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    waiter_id: str
    waiter_name: str
    table_number: str
    customer_count: Optional[int] = None
    order_number: Optional[str] = None
    order_type: WaiterOrderType = WaiterOrderType.DINE_IN
    status: WaiterOrderStatus = WaiterOrderStatus.DRAFT
    items: List[WaiterOrderItem] = []
    subtotal: float = 0.0
    tax: float = 0.0
    discount: float = 0.0
    total: float = 0.0
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    sync_status: str = "synced"  # "synced", "pending_sync", "sync_error"
    local_id: Optional[str] = None  # ID local para operação offline


class WaiterOrderCreate(BaseModel):
    """Dados para criação de um pedido."""

    waiter_id: str
    waiter_name: str
    table_number: str
    customer_count: Optional[int] = None
    order_type: WaiterOrderType = WaiterOrderType.DINE_IN
    items: List[WaiterOrderItemCreate] = []
    notes: Optional[str] = None
    local_id: Optional[str] = None  # ID local para operação offline


class WaiterOrderUpdate(BaseModel):
    """Dados para atualização de um pedido."""

    table_number: Optional[str] = None
    customer_count: Optional[int] = None
    order_type: Optional[WaiterOrderType] = None
    status: Optional[WaiterOrderStatus] = None
    notes: Optional[str] = None


class WaiterSession(BaseModel):
    """Sessão do módulo de garçom."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    waiter_id: str
    waiter_name: str
    device_id: str
    device_type: str  # "tablet", "smartphone", "desktop"
    is_personal_device: bool = False
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    last_sync_at: Optional[datetime] = None


class WaiterSessionCreate(BaseModel):
    """Dados para criação de uma sessão do módulo de garçom."""

    waiter_id: str
    waiter_name: str
    device_id: str
    device_type: str
    is_personal_device: bool = False


class WaiterSessionUpdate(BaseModel):
    """Dados para atualização de uma sessão do módulo de garçom."""

    active: Optional[bool] = None
    last_sync_at: Optional[datetime] = None


class WaiterTable(BaseModel):
    """Mesa no módulo de garçom."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    number: str
    name: Optional[str] = None
    capacity: int
    status: str = "available"  # "available", "occupied", "reserved", "cleaning"
    current_order_id: Optional[str] = None
    customer_count: Optional[int] = None
    occupied_at: Optional[datetime] = None
    last_updated_at: Optional[datetime] = None


class WaiterTableCreate(BaseModel):
    """Dados para criação de uma mesa."""

    number: str
    name: Optional[str] = None
    capacity: int


class WaiterTableUpdate(BaseModel):
    """Dados para atualização de uma mesa."""

    name: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[str] = None
    current_order_id: Optional[str] = None
    customer_count: Optional[int] = None
    occupied_at: Optional[datetime] = None


class WaiterStats(BaseModel):
    """Estatísticas do módulo de garçom."""

    total_orders: int = 0
    draft_orders: int = 0
    sent_orders: int = 0
    preparing_orders: int = 0
    ready_orders: int = 0
    delivered_orders: int = 0
    cancelled_orders: int = 0
    total_tables: int = 0
    available_tables: int = 0
    occupied_tables: int = 0
    reserved_tables: int = 0
    cleaning_tables: int = 0
    average_service_time: Optional[float] = None  # Em minutos
    pending_sync_count: int = 0
