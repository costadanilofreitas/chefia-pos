# Design do Módulo de Delivery e API Gateway

## 1. Visão Geral

Este documento descreve o design arquitetural do Módulo de Delivery e do API Gateway para o sistema POS Modern. Estes componentes são essenciais para expandir as capacidades do sistema, permitindo o gerenciamento eficiente de entregas e a integração com sistemas externos.

## 2. Módulo de Delivery

### 2.1 Propósito

O Módulo de Delivery é responsável por gerenciar todo o ciclo de vida de pedidos para entrega, desde a criação até a conclusão da entrega. Ele permite o rastreamento de pedidos, atribuição a entregadores, cálculo de taxas, e integração com sistemas de mapas.

### 2.2 Modelos de Dados

#### 2.2.1 DeliveryOrder

```python
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
```

#### 2.2.2 DeliveryCourier

```python
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
```

#### 2.2.3 DeliveryRoute

```python
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
```

#### 2.2.4 DeliveryZone

```python
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
```

#### 2.2.5 DeliveryTracking

```python
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
```

### 2.3 Serviços

#### 2.3.1 DeliveryService

```python
class DeliveryService:
    """Serviço para gerenciamento de pedidos de delivery."""
    
    async def create_delivery_order(self, order_id: str, customer_id: str, address_id: str, 
                                   delivery_fee: float, payment_on_delivery: bool = False) -> DeliveryOrder:
        """Cria um novo pedido de delivery."""
        pass
    
    async def assign_courier(self, delivery_order_id: str, courier_id: str) -> DeliveryOrder:
        """Atribui um entregador a um pedido."""
        pass
    
    async def update_order_status(self, delivery_order_id: str, status: DeliveryOrderStatus, 
                                 notes: Optional[str] = None) -> DeliveryOrder:
        """Atualiza o status de um pedido."""
        pass
    
    async def get_delivery_order(self, delivery_order_id: str) -> Optional[DeliveryOrder]:
        """Obtém um pedido pelo ID."""
        pass
    
    async def list_delivery_orders(self, status: Optional[DeliveryOrderStatus] = None, 
                                  courier_id: Optional[str] = None,
                                  customer_id: Optional[str] = None,
                                  from_date: Optional[datetime] = None,
                                  to_date: Optional[datetime] = None) -> List[DeliveryOrder]:
        """Lista pedidos com filtros."""
        pass
    
    async def calculate_delivery_fee(self, address_id: str, order_value: float) -> float:
        """Calcula a taxa de entrega para um endereço."""
        pass
    
    async def estimate_delivery_time(self, address_id: str) -> int:
        """Estima o tempo de entrega em minutos."""
        pass
    
    async def create_tracking_event(self, delivery_order_id: str, event_type: TrackingEventType,
                                   location: Optional[Dict[str, float]] = None,
                                   notes: Optional[str] = None) -> DeliveryTracking:
        """Cria um evento de rastreamento."""
        pass
    
    async def get_tracking_history(self, delivery_order_id: str) -> List[DeliveryTracking]:
        """Obtém o histórico de rastreamento de um pedido."""
        pass
    
    async def optimize_routes(self) -> List[DeliveryRoute]:
        """Otimiza rotas para entregas pendentes."""
        pass
```

#### 2.3.2 CourierService

```python
class CourierService:
    """Serviço para gerenciamento de entregadores."""
    
    async def create_courier(self, name: str, phone: str, vehicle_type: str,
                            courier_type: CourierType, employee_id: Optional[str] = None) -> DeliveryCourier:
        """Cria um novo entregador."""
        pass
    
    async def update_courier(self, courier_id: str, data: Dict[str, Any]) -> DeliveryCourier:
        """Atualiza dados de um entregador."""
        pass
    
    async def update_courier_status(self, courier_id: str, status: CourierStatus) -> DeliveryCourier:
        """Atualiza o status de um entregador."""
        pass
    
    async def update_courier_location(self, courier_id: str, location: Dict[str, float]) -> DeliveryCourier:
        """Atualiza a localização de um entregador."""
        pass
    
    async def get_courier(self, courier_id: str) -> Optional[DeliveryCourier]:
        """Obtém um entregador pelo ID."""
        pass
    
    async def list_couriers(self, status: Optional[CourierStatus] = None,
                           courier_type: Optional[CourierType] = None,
                           is_active: bool = True) -> List[DeliveryCourier]:
        """Lista entregadores com filtros."""
        pass
    
    async def get_courier_current_deliveries(self, courier_id: str) -> List[DeliveryOrder]:
        """Obtém as entregas atuais de um entregador."""
        pass
    
    async def get_courier_performance(self, courier_id: str, 
                                     from_date: Optional[datetime] = None,
                                     to_date: Optional[datetime] = None) -> Dict[str, Any]:
        """Obtém métricas de desempenho de um entregador."""
        pass
```

#### 2.3.3 DeliveryZoneService

```python
class DeliveryZoneService:
    """Serviço para gerenciamento de zonas de entrega."""
    
    async def create_zone(self, name: str, base_fee: float, min_delivery_time: int,
                         max_delivery_time: int, polygon: List[Dict[str, float]]) -> DeliveryZone:
        """Cria uma nova zona de entrega."""
        pass
    
    async def update_zone(self, zone_id: str, data: Dict[str, Any]) -> DeliveryZone:
        """Atualiza uma zona de entrega."""
        pass
    
    async def get_zone(self, zone_id: str) -> Optional[DeliveryZone]:
        """Obtém uma zona pelo ID."""
        pass
    
    async def list_zones(self, is_active: bool = True) -> List[DeliveryZone]:
        """Lista zonas de entrega."""
        pass
    
    async def get_zone_for_address(self, address_id: str) -> Optional[DeliveryZone]:
        """Obtém a zona de entrega para um endereço."""
        pass
    
    async def check_address_deliverable(self, address_id: str) -> bool:
        """Verifica se um endereço está em uma zona de entrega."""
        pass
```

### 2.4 Eventos

#### 2.4.1 DeliveryEvents

```python
class DeliveryEventType(str, Enum):
    """Tipos de eventos de delivery."""
    DELIVERY_ORDER_CREATED = "delivery.order.created"
    DELIVERY_ORDER_UPDATED = "delivery.order.updated"
    DELIVERY_ORDER_ASSIGNED = "delivery.order.assigned"
    DELIVERY_ORDER_STATUS_CHANGED = "delivery.order.status_changed"
    DELIVERY_ORDER_CANCELLED = "delivery.order.cancelled"
    DELIVERY_ORDER_DELIVERED = "delivery.order.delivered"
    COURIER_CREATED = "delivery.courier.created"
    COURIER_UPDATED = "delivery.courier.updated"
    COURIER_STATUS_CHANGED = "delivery.courier.status_changed"
    COURIER_LOCATION_UPDATED = "delivery.courier.location_updated"
    ZONE_CREATED = "delivery.zone.created"
    ZONE_UPDATED = "delivery.zone.updated"
```

#### 2.4.2 Handlers de Eventos

```python
class OrderCreatedHandler(EventHandler):
    """Handler para eventos de criação de pedido."""
    
    async def handle(self, event: Event) -> None:
        """Processa evento de criação de pedido."""
        if event.type == EventType.ORDER_CREATED:
            # Verifica se o pedido é para delivery
            order_data = event.data.get("order", {})
            if order_data.get("delivery", False):
                # Cria um pedido de delivery
                await delivery_service.create_delivery_order(
                    order_id=order_data.get("id"),
                    customer_id=order_data.get("customer_id"),
                    address_id=order_data.get("delivery_address_id"),
                    delivery_fee=order_data.get("delivery_fee", 0),
                    payment_on_delivery=order_data.get("payment_on_delivery", False)
                )
```

### 2.5 API Endpoints

#### 2.5.1 DeliveryRouter

```python
router = APIRouter(prefix="/api/v1", tags=["delivery"])

@router.post("/delivery/orders/", response_model=DeliveryOrder)
async def create_delivery_order(
    order_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Cria um novo pedido de delivery."""
    # Implementação
    pass

@router.get("/delivery/orders/{order_id}", response_model=DeliveryOrder)
async def get_delivery_order(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """Obtém um pedido de delivery pelo ID."""
    # Implementação
    pass

@router.put("/delivery/orders/{order_id}/status", response_model=DeliveryOrder)
async def update_delivery_order_status(
    order_id: str,
    status_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Atualiza o status de um pedido de delivery."""
    # Implementação
    pass

@router.post("/delivery/orders/{order_id}/assign", response_model=DeliveryOrder)
async def assign_courier_to_order(
    order_id: str,
    courier_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Atribui um entregador a um pedido."""
    # Implementação
    pass

@router.get("/delivery/orders/", response_model=List[DeliveryOrder])
async def list_delivery_orders(
    status: Optional[str] = None,
    courier_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Lista pedidos de delivery com filtros."""
    # Implementação
    pass

# Endpoints para entregadores
@router.post("/delivery/couriers/", response_model=DeliveryCourier)
async def create_courier(
    courier_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Cria um novo entregador."""
    # Implementação
    pass

@router.get("/delivery/couriers/{courier_id}", response_model=DeliveryCourier)
async def get_courier(
    courier_id: str,
    current_user: User = Depends(get_current_user)
):
    """Obtém um entregador pelo ID."""
    # Implementação
    pass

@router.put("/delivery/couriers/{courier_id}/status", response_model=DeliveryCourier)
async def update_courier_status(
    courier_id: str,
    status_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Atualiza o status de um entregador."""
    # Implementação
    pass

@router.put("/delivery/couriers/{courier_id}/location", response_model=DeliveryCourier)
async def update_courier_location(
    courier_id: str,
    location_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Atualiza a localização de um entregador."""
    # Implementação
    pass

@router.get("/delivery/couriers/", response_model=List[DeliveryCourier])
async def list_couriers(
    status: Optional[str] = None,
    courier_type: Optional[str] = None,
    is_active: bool = True,
    current_user: User = Depends(get_current_user)
):
    """Lista entregadores com filtros."""
    # Implementação
    pass

# Endpoints para zonas de entrega
@router.post("/delivery/zones/", response_model=DeliveryZone)
async def create_zone(
    zone_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Cria uma nova zona de entrega."""
    # Implementação
    pass

@router.get("/delivery/zones/{zone_id}", response_model=DeliveryZone)
async def get_zone(
    zone_id: str,
    current_user: User = Depends(get_current_user)
):
    """Obtém uma zona de entrega pelo ID."""
    # Implementação
    pass

@router.get("/delivery/zones/", response_model=List[DeliveryZone])
async def list_zones(
    is_active: bool = True,
    current_user: User = Depends(get_current_user)
):
    """Lista zonas de entrega."""
    # Implementação
    pass

@router.post("/delivery/check-address", response_model=Dict[str, Any])
async def check_address_deliverable(
    address_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Verifica se um endereço está em uma zona de entrega."""
    # Implementação
    pass

# Endpoints para rastreamento
@router.get("/delivery/tracking/{order_id}", response_model=List[DeliveryTracking])
async def get_tracking_history(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """Obtém o histórico de rastreamento de um pedido."""
    # Implementação
    pass

@router.post("/delivery/tracking/{order_id}", response_model=DeliveryTracking)
async def create_tracking_event(
    order_id: str,
    event_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Cria um evento de rastreamento."""
    # Implementação
    pass

# Endpoints públicos (sem autenticação)
@router.get("/public/delivery/tracking/{tracking_code}", response_model=Dict[str, Any])
async def public_track_order(
    tracking_code: str
):
    """Endpoint público para rastreamento de pedido pelo cliente."""
    # Implementação
    pass
```

### 2.6 Integrações

#### 2.6.1 Integração com Módulo de Pedidos

O Módulo de Delivery se integra com o Módulo de Pedidos através do Event Bus, escutando eventos de criação e atualização de pedidos para criar e atualizar pedidos de delivery correspondentes.

#### 2.6.2 Integração com Módulo de Funcionários

O Módulo de Delivery se integra com o Módulo de Funcionários para gerenciar entregadores que são funcionários da empresa, sincronizando dados e status.

#### 2.6.3 Integração com Módulo de Contas

O Módulo de Delivery se integra com o Módulo de Contas para registrar pagamentos realizados na entrega e para calcular comissões de entregadores.

## 3. API Gateway

### 3.1 Propósito

O API Gateway serve como ponto central de entrada para sistemas externos, fornecendo uma interface unificada para acessar os diversos serviços do sistema POS Modern. Ele gerencia autenticação, autorização, roteamento, transformação de dados e integração com o Event Bus.

### 3.2 Componentes

#### 3.2.1 Gateway Router

```python
class GatewayRouter:
    """Roteador central do API Gateway."""
    
    def __init__(self):
        self.routes = {}
        self.middlewares = []
    
    def add_route(self, path: str, target_service: str, methods: List[str] = None):
        """Adiciona uma rota ao gateway."""
        self.routes[path] = {
            "target": target_service,
            "methods": methods or ["GET", "POST", "PUT", "DELETE"]
        }
    
    def add_middleware(self, middleware):
        """Adiciona um middleware ao gateway."""
        self.middlewares.append(middleware)
    
    async def route_request(self, path: str, method: str, headers: Dict[str, str], body: Any) -> Dict[str, Any]:
        """Roteia uma requisição para o serviço apropriado."""
        # Implementação
        pass
```

#### 3.2.2 Authentication Middleware

```python
class AuthenticationMiddleware:
    """Middleware para autenticação de requisições."""
    
    async def process(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Processa uma requisição, verificando autenticação."""
        # Implementação
        pass
```

#### 3.2.3 Rate Limiting Middleware

```python
class RateLimitingMiddleware:
    """Middleware para limitação de taxa de requisições."""
    
    def __init__(self, rate_limit: int, time_window: int):
        self.rate_limit = rate_limit
        self.time_window = time_window
        self.request_counts = {}
    
    async def process(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Processa uma requisição, verificando limites de taxa."""
        # Implementação
        pass
```

#### 3.2.4 Logging Middleware

```python
class LoggingMiddleware:
    """Middleware para registro de requisições."""
    
    async def process(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Processa uma requisição, registrando detalhes."""
        # Implementação
        pass
```

#### 3.2.5 Transformation Middleware

```python
class TransformationMiddleware:
    """Middleware para transformação de dados."""
    
    def __init__(self, transformations: Dict[str, Callable]):
        self.transformations = transformations
    
    async def process(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Processa uma requisição, transformando dados."""
        # Implementação
        pass
```

### 3.3 API Endpoints

#### 3.3.1 External API Router

```python
router = APIRouter(prefix="/api/external", tags=["external"])

@router.post("/auth/token", response_model=Dict[str, Any])
async def get_token(
    credentials: Dict[str, str]
):
    """Obtém um token de acesso para a API externa."""
    # Implementação
    pass

@router.get("/products", response_model=List[Dict[str, Any]])
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    token: str = Depends(validate_token)
):
    """Obtém produtos disponíveis."""
    # Implementação
    pass

@router.get("/products/{product_id}", response_model=Dict[str, Any])
async def get_product(
    product_id: str,
    token: str = Depends(validate_token)
):
    """Obtém detalhes de um produto."""
    # Implementação
    pass

@router.post("/orders", response_model=Dict[str, Any])
async def create_order(
    order_data: Dict[str, Any],
    token: str = Depends(validate_token)
):
    """Cria um novo pedido."""
    # Implementação
    pass

@router.get("/orders/{order_id}", response_model=Dict[str, Any])
async def get_order(
    order_id: str,
    token: str = Depends(validate_token)
):
    """Obtém detalhes de um pedido."""
    # Implementação
    pass

@router.get("/orders", response_model=List[Dict[str, Any]])
async def list_orders(
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    token: str = Depends(validate_token)
):
    """Lista pedidos com filtros."""
    # Implementação
    pass

@router.post("/delivery/track", response_model=Dict[str, Any])
async def track_delivery(
    tracking_data: Dict[str, str],
    token: str = Depends(validate_token)
):
    """Rastreia uma entrega."""
    # Implementação
    pass

@router.post("/webhooks/order", response_model=Dict[str, str])
async def order_webhook(
    webhook_data: Dict[str, Any],
    signature: str = Header(None)
):
    """Webhook para recebimento de eventos de pedidos."""
    # Implementação
    pass
```

### 3.4 Integrações

#### 3.4.1 Integração com Event Bus

O API Gateway se integra com o Event Bus para publicar eventos quando ações são realizadas através da API externa, permitindo que outros módulos reajam a essas ações.

```python
class ExternalEventPublisher:
    """Publicador de eventos para ações externas."""
    
    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus
    
    async def publish_order_created(self, order_data: Dict[str, Any]):
        """Publica evento de criação de pedido externo."""
        await self.event_bus.publish(Event(
            type=EventType.ORDER_CREATED,
            data={"order": order_data, "source": "external_api"}
        ))
    
    async def publish_order_updated(self, order_id: str, update_data: Dict[str, Any]):
        """Publica evento de atualização de pedido externo."""
        await self.event_bus.publish(Event(
            type=EventType.ORDER_UPDATED,
            data={"order_id": order_id, "updates": update_data, "source": "external_api"}
        ))
```

#### 3.4.2 Integração com Módulos Internos

O API Gateway se integra com os módulos internos do sistema, roteando requisições para os serviços apropriados e transformando dados conforme necessário.

```python
class ModuleIntegration:
    """Integração com módulos internos."""
    
    async def call_product_service(self, method: str, path: str, data: Any = None) -> Dict[str, Any]:
        """Chama o serviço de produtos."""
        # Implementação
        pass
    
    async def call_order_service(self, method: str, path: str, data: Any = None) -> Dict[str, Any]:
        """Chama o serviço de pedidos."""
        # Implementação
        pass
    
    async def call_delivery_service(self, method: str, path: str, data: Any = None) -> Dict[str, Any]:
        """Chama o serviço de delivery."""
        # Implementação
        pass
```

## 4. Fluxos de Trabalho

### 4.1 Fluxo de Pedido de Delivery

1. Cliente faz um pedido com opção de delivery
2. Sistema cria um pedido normal e um pedido de delivery associado
3. Pedido vai para a cozinha para preparação
4. Sistema atribui um entregador disponível ao pedido
5. Entregador é notificado sobre o novo pedido
6. Cozinha marca o pedido como pronto
7. Entregador coleta o pedido
8. Entregador atualiza status para "em trânsito"
9. Entregador entrega o pedido e atualiza status
10. Se pagamento na entrega, entregador registra o pagamento
11. Sistema finaliza o pedido de delivery

### 4.2 Fluxo de Integração Externa via API Gateway

1. Sistema externo se autentica no API Gateway
2. Sistema externo faz uma requisição para criar um pedido
3. API Gateway valida a requisição e transforma os dados
4. API Gateway roteia a requisição para o serviço de pedidos
5. Serviço de pedidos processa a requisição e cria o pedido
6. API Gateway publica evento de criação de pedido no Event Bus
7. Outros módulos reagem ao evento (ex: KDS, Delivery)
8. API Gateway retorna resposta ao sistema externo

## 5. Considerações de Segurança

### 5.1 Autenticação e Autorização

- Uso de tokens JWT para autenticação
- Validação de permissões para cada operação
- Expiração de tokens configurável
- Renovação segura de tokens

### 5.2 Proteção de Dados

- Criptografia de dados sensíveis
- Validação de entrada para prevenir injeções
- Sanitização de saída para prevenir XSS
- Proteção contra CSRF

### 5.3 Limitação de Taxa

- Limitação de requisições por IP
- Limitação de requisições por token
- Proteção contra ataques de força bruta
- Proteção contra ataques de negação de serviço

## 6. Monitoramento e Logs

### 6.1 Logs de API

- Registro de todas as requisições e respostas
- Registro de erros e exceções
- Registro de tempos de resposta
- Alertas para erros críticos

### 6.2 Métricas

- Taxa de requisições por endpoint
- Tempo médio de resposta
- Taxa de erros
- Uso de recursos (CPU, memória, rede)

## 7. Escalabilidade

### 7.1 Horizontal

- Suporte a múltiplas instâncias do API Gateway
- Balanceamento de carga entre instâncias
- Sessões distribuídas

### 7.2 Vertical

- Otimização de código para melhor desempenho
- Uso eficiente de recursos
- Caching de respostas frequentes

## 8. Testes

### 8.1 Testes Unitários

- Testes para cada componente isoladamente
- Mocking de dependências
- Cobertura de código

### 8.2 Testes de Integração

- Testes de integração entre módulos
- Testes de API end-to-end
- Testes de fluxos completos

### 8.3 Testes de Carga

- Testes de desempenho sob carga
- Testes de limites de escalabilidade
- Testes de recuperação de falhas

## 9. Próximos Passos

1. Implementar modelos de dados e serviços do Módulo de Delivery
2. Implementar API do Módulo de Delivery
3. Implementar integração com Event Bus
4. Implementar API Gateway com roteamento básico
5. Implementar autenticação e autorização no API Gateway
6. Implementar transformação de dados no API Gateway
7. Implementar integração do API Gateway com Event Bus
8. Realizar testes de integração
9. Documentar APIs externas
10. Implantar e monitorar em ambiente de produção
