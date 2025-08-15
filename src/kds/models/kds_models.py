import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class KDSOrderStatus(str, Enum):
    """Status de um pedido no KDS."""

    PENDING = "pending"  # Pedido recebido, aguardando início do preparo
    PREPARING = "preparing"  # Pedido em preparo
    READY = "ready"  # Pedido pronto para entrega
    DELIVERED = "delivered"  # Pedido entregue
    CANCELLED = "cancelled"  # Pedido cancelado


class KDSOrderPriority(str, Enum):
    """Prioridade de um pedido no KDS."""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class ItemStatus(str, Enum):
    """Status de um item no KDS."""

    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class KDSOrderItem(BaseModel):
    """Item de um pedido no KDS."""

    id: str
    product_id: str
    product_name: str
    quantity: int
    customizations: List[Dict[str, Any]] = []
    sections: List[Dict[str, Any]] = []
    notes: Optional[str] = None
    status: KDSOrderStatus = KDSOrderStatus.PENDING
    preparation_time: Optional[int] = None  # Tempo estimado de preparo em minutos
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class KDSOrder(BaseModel):
    """Pedido no KDS."""

    id: str
    order_number: str
    order_type: str  # "dine_in", "takeout", "delivery"
    table_number: Optional[str] = None
    customer_name: Optional[str] = None
    items: List[KDSOrderItem]
    status: KDSOrderStatus = KDSOrderStatus.PENDING
    priority: KDSOrderPriority = KDSOrderPriority.NORMAL
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    estimated_completion_time: Optional[datetime] = None
    notes: Optional[str] = None


class KDSOrderUpdate(BaseModel):
    """Atualização de status de um pedido no KDS."""

    status: Optional[KDSOrderStatus] = None
    priority: Optional[KDSOrderPriority] = None
    notes: Optional[str] = None


class KDSOrderItemUpdate(BaseModel):
    """Atualização de status de um item de pedido no KDS."""

    status: Optional[KDSOrderStatus] = None
    notes: Optional[str] = None


class KDSSession(BaseModel):
    """Sessão do KDS."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    station_type: str  # "grill", "fryer", "salad", "all"
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None


class KDSSessionCreate(BaseModel):
    """Dados para criação de uma sessão do KDS."""

    name: str
    station_type: str


class KDSSessionUpdate(BaseModel):
    """Atualização de uma sessão do KDS."""

    name: Optional[str] = None
    station_type: Optional[str] = None
    active: Optional[bool] = None


class KDSStats(BaseModel):
    """Estatísticas do KDS."""

    total_orders: int = 0
    pending_orders: int = 0
    preparing_orders: int = 0
    ready_orders: int = 0
    delivered_orders: int = 0
    cancelled_orders: int = 0
    average_preparation_time: Optional[float] = None  # Em minutos
    current_load: Optional[float] = None  # Percentual de carga (0-100)
