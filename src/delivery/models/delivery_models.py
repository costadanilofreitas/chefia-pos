from pydantic import BaseModel
from typing import List, Dict, Optional
from enum import Enum
from datetime import datetime


class DeliveryOrderStatus(str, Enum):
    """Status possíveis para um pedido de delivery."""
    PENDING = "pending"                # Aguardando atribuição
    ASSIGNED = "assigned"              # Atribuído a um entregador
    PREPARING = "preparing"            # Em preparação na cozinha
    READY_FOR_PICKUP = "ready_pickup"  # Pronto para coleta pelo entregador
    IN_TRANSIT = "in_transit"          # Em trânsito para o cliente
    DELIVERED = "delivered"            # Entregue ao cliente
    CANCELLED = "cancelled"            # Cancelado
    RETURNED = "returned"              # Devolvido (cliente não encontrado, etc.)


class DeliveryOrder(BaseModel):
    """Modelo para pedido de delivery."""
    id: str
    order_id: str                      # ID do pedido original
    customer_id: str                   # ID do cliente
    address_id: str                    # ID do endereço de entrega
    delivery_fee: float                # Taxa de entrega
    estimated_delivery_time: datetime  # Tempo estimado de entrega
    actual_delivery_time: Optional[datetime] = None
    delivery_notes: Optional[str] = None
    status: DeliveryOrderStatus
    courier_id: Optional[str] = None   # ID do entregador atribuído
    route_id: Optional[str] = None     # ID da rota (para agrupamento)
    payment_on_delivery: bool = False  # Se o pagamento será na entrega
    payment_amount: Optional[float] = None  # Valor a ser coletado na entrega
    payment_method: Optional[str] = None    # Método de pagamento na entrega
    created_at: datetime
    updated_at: datetime
    tracking_code: str                 # Código para rastreamento pelo cliente
    priority: int = 0                  # Prioridade (0 = normal, maior = mais prioritário)


class CourierStatus(str, Enum):
    """Status possíveis para um entregador."""
    AVAILABLE = "available"      # Disponível para entregas
    BUSY = "busy"                # Ocupado com entregas
    OFFLINE = "offline"          # Fora de serviço
    ON_BREAK = "on_break"        # Em pausa


class CourierType(str, Enum):
    """Tipos de entregador."""
    EMPLOYEE = "employee"        # Funcionário da empresa
    FREELANCER = "freelancer"    # Freelancer
    THIRD_PARTY = "third_party"  # Terceirizado


class DeliveryCourier(BaseModel):
    """Modelo para entregador."""
    id: str
    name: str
    phone: str
    email: Optional[str] = None
    vehicle_type: str            # Tipo de veículo (moto, carro, bicicleta, etc.)
    vehicle_plate: Optional[str] = None
    status: CourierStatus
    courier_type: CourierType
    employee_id: Optional[str] = None  # ID do funcionário (se for funcionário)
    current_location: Optional[Dict[str, float]] = None  # {lat, lng}
    max_deliveries: int = 1      # Máximo de entregas simultâneas
    current_deliveries: int = 0  # Entregas atuais
    rating: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    notes: Optional[str] = None


class RouteStatus(str, Enum):
    """Status possíveis para uma rota de entrega."""
    PLANNING = "planning"        # Em planejamento
    ASSIGNED = "assigned"        # Atribuída a um entregador
    IN_PROGRESS = "in_progress"  # Em andamento
    COMPLETED = "completed"      # Concluída
    CANCELLED = "cancelled"      # Cancelada


class DeliveryRoute(BaseModel):
    """Modelo para rota de entrega (agrupamento de pedidos)."""
    id: str
    courier_id: Optional[str] = None
    status: RouteStatus
    orders: List[str]            # Lista de IDs de pedidos
    estimated_start_time: datetime
    estimated_end_time: datetime
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    total_distance: Optional[float] = None  # Em km
    created_at: datetime
    updated_at: datetime
    optimization_score: Optional[float] = None  # Pontuação de otimização


class DeliveryZone(BaseModel):
    """Modelo para zona de entrega."""
    id: str
    name: str
    description: Optional[str] = None
    base_fee: float              # Taxa base de entrega
    min_delivery_time: int       # Tempo mínimo em minutos
    max_delivery_time: int       # Tempo máximo em minutos
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    polygon: List[Dict[str, float]]  # Lista de coordenadas {lat, lng}
    additional_fee_per_km: Optional[float] = None  # Taxa adicional por km
    min_order_value: Optional[float] = None  # Valor mínimo do pedido


class TrackingEventType(str, Enum):
    """Tipos de eventos de rastreamento."""
    ORDER_CREATED = "order_created"
    ORDER_ASSIGNED = "order_assigned"
    PREPARING = "preparing"
    READY_FOR_PICKUP = "ready_for_pickup"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    ARRIVED = "arrived"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"
    LOCATION_UPDATED = "location_updated"


class DeliveryTracking(BaseModel):
    """Modelo para rastreamento de entrega."""
    id: str
    delivery_order_id: str
    event_type: TrackingEventType
    timestamp: datetime
    location: Optional[Dict[str, float]] = None  # {lat, lng}
    notes: Optional[str] = None
    created_by: str              # ID do usuário ou sistema que criou o evento


# Modelos para requisições da API
class CreateDeliveryOrderRequest(BaseModel):
    """Modelo para requisição de criação de pedido de delivery."""
    order_id: str
    customer_id: str
    address_id: str
    delivery_fee: float
    delivery_notes: Optional[str] = None
    payment_on_delivery: bool = False
    payment_amount: Optional[float] = None
    payment_method: Optional[str] = None
    priority: int = 0


class UpdateDeliveryOrderStatusRequest(BaseModel):
    """Modelo para requisição de atualização de status de pedido."""
    status: DeliveryOrderStatus
    notes: Optional[str] = None


class UpdateDeliveryOrderRequest(BaseModel):
    """Modelo para requisição de atualização de pedido de delivery."""
    delivery_fee: Optional[float] = None
    estimated_delivery_time: Optional[datetime] = None
    delivery_notes: Optional[str] = None
    payment_on_delivery: Optional[bool] = None
    payment_amount: Optional[float] = None
    payment_method: Optional[str] = None
    priority: Optional[int] = None


class AssignCourierRequest(BaseModel):
    """Modelo para requisição de atribuição de entregador."""
    courier_id: str


class CreateCourierRequest(BaseModel):
    """Modelo para requisição de criação de entregador."""
    name: str
    phone: str
    email: Optional[str] = None
    vehicle_type: str
    vehicle_plate: Optional[str] = None
    courier_type: CourierType
    employee_id: Optional[str] = None
    max_deliveries: int = 1
    notes: Optional[str] = None


class UpdateCourierStatusRequest(BaseModel):
    """Modelo para requisição de atualização de status de entregador."""
    status: CourierStatus


class UpdateCourierLocationRequest(BaseModel):
    """Modelo para requisição de atualização de localização de entregador."""
    latitude: float
    longitude: float


class CreateZoneRequest(BaseModel):
    """Modelo para requisição de criação de zona de entrega."""
    name: str
    description: Optional[str] = None
    base_fee: float
    min_delivery_time: int
    max_delivery_time: int
    polygon: List[Dict[str, float]]
    additional_fee_per_km: Optional[float] = None
    min_order_value: Optional[float] = None


class CreateTrackingEventRequest(BaseModel):
    """Modelo para requisição de criação de evento de rastreamento."""
    event_type: TrackingEventType
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None


class CheckAddressRequest(BaseModel):
    """Modelo para requisição de verificação de endereço."""
    address_id: str
    order_value: Optional[float] = None
