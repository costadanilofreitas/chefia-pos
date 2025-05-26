# Documentação do Módulo de Delivery e API Gateway

## Visão Geral

Este documento descreve a implementação e integração do Módulo de Delivery e API Gateway no sistema POS Modern. Estes módulos expandem as capacidades do sistema, permitindo o gerenciamento completo de entregas e a integração com sistemas externos através de uma API padronizada.

## Módulo de Delivery

### Descrição

O Módulo de Delivery é responsável pelo gerenciamento completo do processo de entrega de pedidos, desde a criação até a conclusão. Ele permite o rastreamento em tempo real, gerenciamento de entregadores, definição de zonas de entrega e otimização de rotas.

### Modelos de Dados

#### DeliveryOrder

Representa um pedido de entrega no sistema.

```python
class DeliveryOrder(BaseModel):
    id: str
    order_id: str
    customer_id: str
    address_id: str
    courier_id: Optional[str] = None
    status: DeliveryOrderStatus
    delivery_fee: float
    estimated_delivery_time: datetime
    actual_delivery_time: Optional[datetime] = None
    delivery_notes: Optional[str] = None
    tracking_code: str
    payment_on_delivery: bool = False
    payment_amount: Optional[float] = None
    payment_method: Optional[str] = None
    priority: int = 0
    created_at: datetime
    updated_at: datetime
```

#### DeliveryCourier

Representa um entregador no sistema.

```python
class DeliveryCourier(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str] = None
    vehicle_type: str
    vehicle_plate: Optional[str] = None
    courier_type: CourierType
    employee_id: Optional[str] = None
    status: CourierStatus
    current_location: Optional[Dict[str, float]] = None
    current_deliveries: int = 0
    max_deliveries: int = 1
    rating: Optional[float] = None
    is_active: bool = True
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
```

#### DeliveryZone

Representa uma zona de entrega no sistema.

```python
class DeliveryZone(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    base_fee: float
    min_delivery_time: int  # em minutos
    max_delivery_time: int  # em minutos
    polygon: List[Dict[str, float]]  # lista de coordenadas {lat, lng}
    additional_fee_per_km: Optional[float] = None
    min_order_value: Optional[float] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
```

#### DeliveryTracking

Representa um evento de rastreamento de entrega.

```python
class DeliveryTracking(BaseModel):
    id: str
    delivery_order_id: str
    event_type: TrackingEventType
    timestamp: datetime
    location: Optional[Dict[str, float]] = None
    notes: Optional[str] = None
```

### Serviços

#### DeliveryService

Gerencia pedidos de entrega, incluindo criação, atualização de status e rastreamento.

Principais métodos:
- `create_delivery_order`: Cria um novo pedido de entrega
- `get_delivery_order`: Obtém um pedido de entrega pelo ID
- `update_order_status`: Atualiza o status de um pedido de entrega
- `assign_courier`: Atribui um entregador a um pedido
- `calculate_delivery_fee`: Calcula a taxa de entrega para um endereço
- `estimate_delivery_time`: Estima o tempo de entrega para um endereço
- `get_tracking_history`: Obtém o histórico de rastreamento de um pedido
- `create_tracking_event`: Cria um evento de rastreamento
- `optimize_routes`: Otimiza rotas para entregas pendentes

#### CourierService

Gerencia entregadores, incluindo criação, atualização de status e localização.

Principais métodos:
- `create_courier`: Cria um novo entregador
- `get_courier`: Obtém um entregador pelo ID
- `update_courier_status`: Atualiza o status de um entregador
- `update_courier_location`: Atualiza a localização de um entregador
- `list_couriers`: Lista entregadores com filtros
- `get_courier_current_deliveries`: Obtém as entregas atuais de um entregador
- `get_courier_performance`: Obtém métricas de desempenho de um entregador

#### ZoneService

Gerencia zonas de entrega, incluindo criação, atualização e verificação de endereços.

Principais métodos:
- `create_zone`: Cria uma nova zona de entrega
- `get_zone`: Obtém uma zona de entrega pelo ID
- `update_zone`: Atualiza uma zona de entrega
- `list_zones`: Lista zonas de entrega
- `get_zone_for_address`: Obtém a zona de entrega para um endereço
- `check_address_deliverable`: Verifica se um endereço está em uma zona de entrega

### Endpoints da API

#### Pedidos de Delivery

- `POST /api/v1/delivery/orders/`: Cria um novo pedido de delivery
- `GET /api/v1/delivery/orders/{order_id}`: Obtém um pedido de delivery pelo ID
- `PUT /api/v1/delivery/orders/{order_id}/status`: Atualiza o status de um pedido de delivery
- `POST /api/v1/delivery/orders/{order_id}/assign`: Atribui um entregador a um pedido
- `GET /api/v1/delivery/orders/`: Lista pedidos de delivery com filtros

#### Entregadores

- `POST /api/v1/delivery/couriers/`: Cria um novo entregador
- `GET /api/v1/delivery/couriers/{courier_id}`: Obtém um entregador pelo ID
- `PUT /api/v1/delivery/couriers/{courier_id}/status`: Atualiza o status de um entregador
- `PUT /api/v1/delivery/couriers/{courier_id}/location`: Atualiza a localização de um entregador
- `GET /api/v1/delivery/couriers/`: Lista entregadores com filtros
- `GET /api/v1/delivery/couriers/{courier_id}/deliveries`: Obtém as entregas atuais de um entregador
- `GET /api/v1/delivery/couriers/{courier_id}/performance`: Obtém métricas de desempenho de um entregador

#### Zonas de Entrega

- `POST /api/v1/delivery/zones/`: Cria uma nova zona de entrega
- `GET /api/v1/delivery/zones/{zone_id}`: Obtém uma zona de entrega pelo ID
- `GET /api/v1/delivery/zones/`: Lista zonas de entrega
- `POST /api/v1/delivery/check-address`: Verifica se um endereço está em uma zona de entrega

#### Rastreamento

- `GET /api/v1/delivery/tracking/{order_id}`: Obtém o histórico de rastreamento de um pedido
- `POST /api/v1/delivery/tracking/{order_id}`: Cria um evento de rastreamento
- `GET /api/public/delivery/tracking/{tracking_code}`: Endpoint público para rastreamento de pedido pelo cliente

#### Otimização de Rotas

- `POST /api/v1/delivery/routes/optimize`: Otimiza rotas para entregas pendentes

### Integração com Outros Módulos

#### Integração com Módulo de Pedidos

O Módulo de Delivery se integra com o Módulo de Pedidos através do barramento de eventos. Quando um pedido é criado com a opção de delivery, um evento `ORDER_CREATED` é publicado, e o Módulo de Delivery cria automaticamente um pedido de entrega correspondente.

Da mesma forma, quando o status de um pedido é alterado (por exemplo, para "pronto para entrega"), um evento `ORDER_STATUS_CHANGED` é publicado, e o Módulo de Delivery atualiza o status do pedido de entrega correspondente.

#### Integração com Módulo de Contas

Quando um pedido de entrega é concluído com pagamento na entrega, o Módulo de Delivery notifica o Módulo de Contas para registrar o pagamento. Isso é feito através do barramento de eventos, publicando um evento `PAYMENT_RECEIVED`.

#### Integração com Módulo de Funcionários

O Módulo de Delivery se integra com o Módulo de Funcionários para gerenciar entregadores que são funcionários da empresa. Quando um entregador é criado com `courier_type=EMPLOYEE`, o Módulo de Delivery verifica se o funcionário existe e obtém suas informações.

## API Gateway

### Descrição

O API Gateway serve como ponto central de entrada para sistemas externos que desejam interagir com o POS Modern. Ele fornece uma interface RESTful padronizada, gerencia autenticação, autorização, limitação de taxa e transformação de dados.

### Componentes

#### ApiGateway

Classe principal que gerencia o roteamento de requisições, autenticação e transformação de dados.

#### GatewayRouter

Responsável por rotear requisições para os serviços internos apropriados.

#### Middlewares

- `AuthenticationMiddleware`: Verifica a autenticação de requisições
- `RateLimitingMiddleware`: Limita a taxa de requisições por cliente
- `LoggingMiddleware`: Registra detalhes de requisições e respostas
- `TransformationMiddleware`: Transforma dados de requisições e respostas

### Endpoints da API Externa

#### Autenticação

- `POST /api/external/auth/token`: Obtém um token de acesso para a API externa

#### Produtos

- `GET /api/external/products`: Obtém produtos disponíveis
- `GET /api/external/products/{product_id}`: Obtém detalhes de um produto

#### Pedidos

- `POST /api/external/orders`: Cria um novo pedido
- `GET /api/external/orders/{order_id}`: Obtém detalhes de um pedido
- `GET /api/external/orders`: Lista pedidos com filtros

#### Delivery

- `POST /api/external/delivery/track`: Rastreia uma entrega

#### Webhooks

- `POST /api/external/webhooks/order`: Webhook para recebimento de eventos de pedidos

### Integração com Barramento de Eventos

O API Gateway se integra com o barramento de eventos para publicar eventos quando ações são realizadas através da API externa. Por exemplo, quando um pedido é criado através da API externa, o API Gateway publica um evento `ORDER_CREATED` no barramento de eventos.

### Segurança

O API Gateway implementa várias camadas de segurança:

1. **Autenticação**: Todas as requisições (exceto endpoints públicos) devem incluir um token de acesso válido.
2. **Autorização**: Diferentes clientes podem ter diferentes níveis de acesso.
3. **Limitação de Taxa**: Limita o número de requisições por cliente em um determinado período.
4. **Validação de Dados**: Valida todos os dados de entrada antes de processá-los.
5. **Logs de Auditoria**: Registra todas as requisições e respostas para fins de auditoria.

## Fluxos de Trabalho

### Fluxo de Entrega

1. Um pedido é criado com a opção de delivery.
2. O Módulo de Delivery cria automaticamente um pedido de entrega.
3. O pedido é preparado e seu status é atualizado para "pronto para entrega".
4. Um entregador disponível é atribuído ao pedido.
5. O entregador coleta o pedido e inicia a entrega.
6. O entregador atualiza o status do pedido durante a entrega.
7. O entregador marca o pedido como entregue após a conclusão.
8. Se o pagamento foi feito na entrega, o Módulo de Contas é notificado.

### Fluxo de API Externa

1. Um cliente externo obtém um token de acesso.
2. O cliente faz requisições à API externa usando o token.
3. O API Gateway autentica e valida cada requisição.
4. O API Gateway roteia a requisição para o serviço interno apropriado.
5. O serviço interno processa a requisição e retorna uma resposta.
6. O API Gateway transforma a resposta e a envia de volta ao cliente.

## Considerações de Implementação

### Persistência de Dados

Atualmente, os dados são armazenados em memória para fins de demonstração. Em um ambiente de produção, seria necessário implementar persistência em banco de dados.

### Escalabilidade

O design modular e baseado em eventos permite que o sistema seja facilmente escalado horizontalmente. Cada módulo pode ser executado em múltiplas instâncias, e o barramento de eventos garante a comunicação assíncrona entre eles.

### Monitoramento

O sistema inclui logs detalhados para todas as operações, permitindo o monitoramento e a depuração. Em um ambiente de produção, seria recomendável implementar métricas e alertas adicionais.

## Testes

Foram implementados testes automatizados para validar a funcionalidade do Módulo de Delivery e do API Gateway. Os testes cobrem:

- Criação e atualização de pedidos de entrega
- Atribuição de entregadores
- Cálculo de taxas de entrega
- Estimativa de tempo de entrega
- Rastreamento de pedidos
- Autenticação e autorização
- Roteamento de requisições
- Limitação de taxa
- Transformação de dados

## Próximos Passos

1. Implementar persistência em banco de dados
2. Adicionar suporte a notificações em tempo real (por exemplo, WebSockets)
3. Implementar integração com serviços de mapas para otimização de rotas
4. Adicionar suporte a pagamentos online
5. Implementar um painel de controle para gerenciamento de entregas
