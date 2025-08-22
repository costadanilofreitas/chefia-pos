# Diagrama de Arquitetura - Chefia POS

## 1. VISÃO GERAL DA ARQUITETURA

```mermaid
graph TB
    subgraph "CAMADA DE APRESENTAÇÃO"
        subgraph "Frontend Applications"
            POS[POS Terminal<br/>React + TypeScript]
            KDS[Kitchen Display<br/>React + TypeScript]
            KIOSK[Self-Service Kiosk<br/>React + TypeScript]
            WAITER[Waiter Terminal<br/>React + TypeScript]
            BACKOFFICE[Backoffice<br/>React + TypeScript]
        end
        
        subgraph "Shared Frontend"
            COMMON[Common Components<br/>UI Library]
            SERVICES[Frontend Services<br/>API Client]
        end
    end
    
    subgraph "CAMADA DE API"
        NGINX[Nginx<br/>Reverse Proxy]
        API[FastAPI<br/>REST API Gateway]
    end
    
    subgraph "CAMADA DE NEGÓCIO"
        subgraph "Core Modules"
            AUTH[Auth Module]
            EVENTBUS[Event Bus]
            MIDDLEWARE[Middleware]
        end
        
        subgraph "Business Modules"
            PRODUCT[Product Module]
            ORDER[Order Module]
            PAYMENT[Payment Module]
            CASHIER[Cashier Module]
            FISCAL[Fiscal Module]
            INVENTORY[Inventory Module]
        end
    end
    
    subgraph "CAMADA DE DADOS"
        POSTGRES[(PostgreSQL<br/>Main Database)]
        REDIS[(Redis<br/>Cache & Session)]
        RABBITMQ[RabbitMQ<br/>Message Queue]
        JSON[JSON Files<br/>Dev Storage]
    end
    
    subgraph "INTEGRAÇÕES EXTERNAS"
        IFOOD[iFood API]
        RAPPI[Rappi API]
        ASAAS[Asaas Payment]
        SAT[SAT Fiscal]
        MAPS[Google Maps]
    end
    
    %% Connections
    POS --> NGINX
    KDS --> NGINX
    KIOSK --> NGINX
    WAITER --> NGINX
    BACKOFFICE --> NGINX
    
    COMMON --> POS
    COMMON --> KDS
    COMMON --> KIOSK
    COMMON --> WAITER
    COMMON --> BACKOFFICE
    
    SERVICES --> NGINX
    
    NGINX --> API
    API --> AUTH
    API --> PRODUCT
    API --> ORDER
    API --> PAYMENT
    API --> CASHIER
    API --> FISCAL
    API --> INVENTORY
    
    AUTH --> EVENTBUS
    PRODUCT --> EVENTBUS
    ORDER --> EVENTBUS
    PAYMENT --> EVENTBUS
    CASHIER --> EVENTBUS
    FISCAL --> EVENTBUS
    INVENTORY --> EVENTBUS
    
    EVENTBUS --> RABBITMQ
    
    AUTH --> REDIS
    PRODUCT --> POSTGRES
    ORDER --> POSTGRES
    PAYMENT --> POSTGRES
    CASHIER --> POSTGRES
    FISCAL --> POSTGRES
    INVENTORY --> POSTGRES
    
    PAYMENT --> ASAAS
    ORDER --> IFOOD
    ORDER --> RAPPI
    FISCAL --> SAT
    ORDER --> MAPS
```

## 2. FLUXO DE DADOS

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant N as Nginx
    participant A as API Gateway
    participant S as Service
    participant E as Event Bus
    participant D as Database
    participant C as Cache
    
    U->>F: User Action
    F->>F: Local Validation
    F->>N: HTTP Request
    N->>A: Route Request
    A->>A: Auth Middleware
    A->>C: Check Cache
    alt Cache Hit
        C-->>A: Cached Data
        A-->>F: Response
    else Cache Miss
        A->>S: Process Request
        S->>D: Query Database
        D-->>S: Data
        S->>E: Publish Event
        E-->>E: Notify Subscribers
        S->>C: Update Cache
        S-->>A: Response
        A-->>F: Response
    end
    F-->>U: Update UI
```

## 3. ARQUITETURA DE MICROSERVIÇOS (MODULAR MONOLITH)

```mermaid
graph LR
    subgraph "Monolith Application"
        subgraph "API Layer"
            R1[/api/v1/products]
            R2[/api/v1/orders]
            R3[/api/v1/payments]
            R4[/api/v1/fiscal]
        end
        
        subgraph "Service Layer"
            PS[ProductService]
            OS[OrderService]
            PAS[PaymentService]
            FS[FiscalService]
        end
        
        subgraph "Repository Layer"
            PR[ProductRepo]
            OR[OrderRepo]
            PAR[PaymentRepo]
            FR[FiscalRepo]
        end
        
        subgraph "Event System"
            EB[Event Bus]
            EH1[ProductHandler]
            EH2[OrderHandler]
            EH3[PaymentHandler]
        end
    end
    
    R1 --> PS
    R2 --> OS
    R3 --> PAS
    R4 --> FS
    
    PS --> PR
    OS --> OR
    PAS --> PAR
    FS --> FR
    
    PS --> EB
    OS --> EB
    PAS --> EB
    FS --> EB
    
    EB --> EH1
    EB --> EH2
    EB --> EH3
    
    PR --> DB[(Database)]
    OR --> DB
    PAR --> DB
    FR --> DB
```

## 4. COMPONENTES DO FRONTEND

```mermaid
graph TB
    subgraph "Frontend Monorepo Structure"
        ROOT[package.json<br/>Workspace Root]
        
        subgraph "apps/"
            POS_APP[pos/<br/>Main POS Terminal]
            KDS_APP[kds/<br/>Kitchen Display]
            KIOSK_APP[kiosk/<br/>Self Service]
            WAITER_APP[waiter/<br/>Waiter Terminal]
            BACK_APP[backoffice/<br/>Management]
        end
        
        subgraph "common/"
            COMP[components/<br/>Shared UI Components]
            HOOKS[hooks/<br/>Custom React Hooks]
            SERV[services/<br/>API Services]
            TYPES[types/<br/>TypeScript Types]
            UTILS[utils/<br/>Utilities]
        end
        
        ROOT --> POS_APP
        ROOT --> KDS_APP
        ROOT --> KIOSK_APP
        ROOT --> WAITER_APP
        ROOT --> BACK_APP
        ROOT --> COMP
        
        POS_APP --> COMP
        POS_APP --> HOOKS
        POS_APP --> SERV
        POS_APP --> TYPES
        POS_APP --> UTILS
        
        KDS_APP --> COMP
        KIOSK_APP --> COMP
        WAITER_APP --> COMP
        BACK_APP --> COMP
    end
```

## 5. EVENT-DRIVEN ARCHITECTURE

```mermaid
graph TB
    subgraph "Event Publishers"
        P1[Order Module]
        P2[Payment Module]
        P3[Cashier Module]
        P4[Product Module]
    end
    
    subgraph "Event Bus"
        EB[In-Memory Event Bus<br/>+ RabbitMQ Integration]
        EQ[Event Queue]
        EH[Event History]
    end
    
    subgraph "Event Subscribers"
        S1[KDS Handler]
        S2[Inventory Handler]
        S3[Fiscal Handler]
        S4[Analytics Handler]
        S5[Notification Handler]
    end
    
    subgraph "Event Types"
        E1[order.created]
        E2[order.updated]
        E3[payment.completed]
        E4[cashier.opened]
        E5[product.updated]
    end
    
    P1 --> E1
    P1 --> E2
    P2 --> E3
    P3 --> E4
    P4 --> E5
    
    E1 --> EB
    E2 --> EB
    E3 --> EB
    E4 --> EB
    E5 --> EB
    
    EB --> EQ
    EB --> EH
    
    EQ --> S1
    EQ --> S2
    EQ --> S3
    EQ --> S4
    EQ --> S5
```

## 6. FLUXO DE PEDIDO (ORDER FLOW)

```mermaid
stateDiagram-v2
    [*] --> Created: Customer creates order
    Created --> Validated: Validate products & stock
    Validated --> Pending: Add to queue
    Pending --> Preparing: Kitchen starts
    Preparing --> Ready: Kitchen completes
    Ready --> Delivered: Customer receives
    Delivered --> Paid: Payment processed
    Paid --> Completed: Order finished
    Completed --> [*]
    
    Created --> Cancelled: Cancel before start
    Pending --> Cancelled: Cancel in queue
    Preparing --> Cancelled: Cancel with permission
    Cancelled --> [*]
    
    note right of Validated
        - Check product availability
        - Calculate prices
        - Apply discounts
    end note
    
    note right of Preparing
        - Send to KDS
        - Update inventory
        - Track preparation time
    end note
    
    note right of Paid
        - Process payment
        - Generate fiscal document
        - Update cashier
    end note
```

## 7. INFRAESTRUTURA DE DEPLOYMENT

```mermaid
graph TB
    subgraph "Development Environment"
        DEV_APP[Application<br/>FastAPI + React]
        DEV_DB[(JSON Files)]
        DEV_CACHE[(In-Memory)]
    end
    
    subgraph "Docker Compose Stack"
        DC_APP[App Container<br/>Python 3.11]
        DC_WEB[Web Container<br/>Node 20]
        DC_DB[(PostgreSQL 14)]
        DC_CACHE[(Redis 6)]
        DC_QUEUE[RabbitMQ 3]
        DC_PROXY[Nginx]
    end
    
    subgraph "Production Environment"
        subgraph "Load Balancer"
            LB[Nginx/HAProxy]
        end
        
        subgraph "Application Servers"
            APP1[API Server 1]
            APP2[API Server 2]
            APP3[API Server N]
        end
        
        subgraph "Static Assets"
            CDN[CDN<br/>CloudFlare/AWS]
        end
        
        subgraph "Data Layer"
            DB_MASTER[(PostgreSQL<br/>Master)]
            DB_SLAVE[(PostgreSQL<br/>Replica)]
            CACHE_CLUSTER[(Redis<br/>Cluster)]
            MQ_CLUSTER[RabbitMQ<br/>Cluster]
        end
    end
    
    DEV_APP --> DEV_DB
    DEV_APP --> DEV_CACHE
    
    DC_PROXY --> DC_APP
    DC_PROXY --> DC_WEB
    DC_APP --> DC_DB
    DC_APP --> DC_CACHE
    DC_APP --> DC_QUEUE
    
    LB --> APP1
    LB --> APP2
    LB --> APP3
    
    APP1 --> DB_MASTER
    APP2 --> DB_MASTER
    APP3 --> DB_MASTER
    
    DB_MASTER --> DB_SLAVE
    
    APP1 --> CACHE_CLUSTER
    APP2 --> CACHE_CLUSTER
    APP3 --> CACHE_CLUSTER
    
    APP1 --> MQ_CLUSTER
    APP2 --> MQ_CLUSTER
    APP3 --> MQ_CLUSTER
    
    CDN --> LB
```

## 8. SEGURANÇA E AUTENTICAÇÃO

```mermaid
graph LR
    subgraph "Client"
        USER[User]
        TOKEN[JWT Token]
    end
    
    subgraph "API Gateway"
        AUTH_MW[Auth Middleware]
        RATE_LIMIT[Rate Limiter]
        CORS[CORS Handler]
    end
    
    subgraph "Auth Service"
        LOGIN[Login Endpoint]
        VALIDATE[Token Validation]
        REFRESH[Token Refresh]
        RBAC[Role-Based Access]
    end
    
    subgraph "Security Layers"
        HASH[Password Hashing<br/>Argon2]
        ENCRYPT[Data Encryption<br/>AES-256]
        SSL[SSL/TLS<br/>HTTPS]
    end
    
    USER --> LOGIN
    LOGIN --> HASH
    HASH --> TOKEN
    TOKEN --> USER
    
    USER --> |Request + Token| AUTH_MW
    AUTH_MW --> VALIDATE
    VALIDATE --> RBAC
    
    AUTH_MW --> RATE_LIMIT
    RATE_LIMIT --> CORS
    
    CORS --> |Authorized| API[API Resources]
    
    TOKEN --> |Expired| REFRESH
    REFRESH --> |New Token| USER
    
    SSL --> |Encrypts| AUTH_MW
```

## 9. INTEGRAÇÃO COM HARDWARE

```mermaid
graph TB
    subgraph "POS Terminal"
        APP[POS Application]
        DRIVER[Hardware Drivers]
    end
    
    subgraph "Peripherals"
        subgraph "Printers"
            THERMAL[Thermal Printer<br/>Epson/Bematech]
            FISCAL[Fiscal Printer<br/>SAT Module]
        end
        
        subgraph "Input Devices"
            BARCODE[Barcode Scanner<br/>USB/Serial]
            SCALE[Digital Scale<br/>Toledo/Filizola]
            PINPAD[PIN Pad<br/>TEF/SiTef]
        end
        
        subgraph "Display"
            CUSTOMER[Customer Display<br/>2x20 LCD]
            KITCHEN[Kitchen Display<br/>Monitor/TV]
        end
        
        subgraph "Cash Management"
            DRAWER[Cash Drawer<br/>RJ11/USB]
        end
    end
    
    APP --> DRIVER
    
    DRIVER --> |ESC/POS| THERMAL
    DRIVER --> |XML| FISCAL
    DRIVER --> |HID| BARCODE
    DRIVER --> |Serial| SCALE
    DRIVER --> |TEF| PINPAD
    DRIVER --> |Serial| CUSTOMER
    DRIVER --> |HTTP| KITCHEN
    DRIVER --> |Pulse| DRAWER
```

## 10. FLUXO DE SINCRONIZAÇÃO OFFLINE

```mermaid
graph TB
    subgraph "Online Mode"
        ON_APP[Application]
        ON_API[API Server]
        ON_DB[(Cloud Database)]
    end
    
    subgraph "Offline Mode"
        OFF_APP[Application]
        OFF_SW[Service Worker]
        OFF_IDB[(IndexedDB)]
        OFF_QUEUE[Sync Queue]
    end
    
    subgraph "Sync Process"
        DETECT[Connection Monitor]
        SYNC[Sync Engine]
        CONFLICT[Conflict Resolution]
        MERGE[Data Merger]
    end
    
    ON_APP --> |Normal Flow| ON_API
    ON_API --> ON_DB
    
    OFF_APP --> |Offline Detection| OFF_SW
    OFF_SW --> OFF_IDB
    OFF_SW --> OFF_QUEUE
    
    DETECT --> |Online| SYNC
    OFF_QUEUE --> SYNC
    SYNC --> CONFLICT
    CONFLICT --> MERGE
    MERGE --> ON_API
    ON_API --> |Update| ON_DB
    ON_DB --> |Sync Back| OFF_IDB
```

## 11. MONITORAMENTO E OBSERVABILIDADE

```mermaid
graph LR
    subgraph "Application"
        APP[POS System]
        METRICS[Metrics Collector]
        LOGS[Log Aggregator]
        TRACES[Trace Collector]
    end
    
    subgraph "Collection Layer"
        PROM[Prometheus<br/>Metrics]
        LOKI[Loki<br/>Logs]
        JAEGER[Jaeger<br/>Traces]
    end
    
    subgraph "Visualization"
        GRAFANA[Grafana<br/>Dashboards]
        ALERT[Alert Manager]
    end
    
    subgraph "Metrics"
        M1[Response Time]
        M2[Error Rate]
        M3[CPU/Memory]
        M4[Queue Size]
        M5[Active Users]
    end
    
    APP --> METRICS
    APP --> LOGS
    APP --> TRACES
    
    METRICS --> PROM
    LOGS --> LOKI
    TRACES --> JAEGER
    
    PROM --> GRAFANA
    LOKI --> GRAFANA
    JAEGER --> GRAFANA
    
    GRAFANA --> ALERT
    
    M1 --> METRICS
    M2 --> METRICS
    M3 --> METRICS
    M4 --> METRICS
    M5 --> METRICS
```

## 12. PIPELINE CI/CD

```mermaid
graph LR
    subgraph "Development"
        DEV[Developer]
        LOCAL[Local Tests]
    end
    
    subgraph "Version Control"
        GIT[Git Repository]
        PR[Pull Request]
    end
    
    subgraph "CI Pipeline"
        BUILD[Build]
        TEST[Run Tests]
        LINT[Lint/Format]
        SEC[Security Scan]
        DOCKER[Build Image]
    end
    
    subgraph "CD Pipeline"
        STAGING[Staging Deploy]
        E2E[E2E Tests]
        PROD[Production Deploy]
        ROLLBACK[Rollback]
    end
    
    subgraph "Monitoring"
        HEALTH[Health Check]
        SMOKE[Smoke Tests]
        METRICS[Metrics Check]
    end
    
    DEV --> LOCAL
    LOCAL --> GIT
    GIT --> PR
    PR --> BUILD
    BUILD --> TEST
    TEST --> LINT
    LINT --> SEC
    SEC --> DOCKER
    
    DOCKER --> STAGING
    STAGING --> E2E
    E2E --> |Success| PROD
    E2E --> |Failure| ROLLBACK
    
    PROD --> HEALTH
    HEALTH --> SMOKE
    SMOKE --> METRICS
```

## LEGENDA

### Componentes
- **Retângulos**: Aplicações/Serviços
- **Cilindros**: Bancos de Dados/Storage
- **Losangos**: Decisões/Condições
- **Setas**: Fluxo de Dados/Comunicação

### Cores (quando renderizado)
- **Azul**: Frontend/UI
- **Verde**: Backend/API
- **Amarelo**: Infraestrutura
- **Vermelho**: Segurança
- **Roxo**: Integrações Externas

### Protocolos
- **HTTP/HTTPS**: Comunicação web
- **WebSocket**: Real-time
- **TCP/IP**: Conexões diretas
- **Serial/USB**: Hardware
- **AMQP**: Message queue

## NOTAS DE ARQUITETURA

1. **Modular Monolith**: Sistema organizado em módulos mas deployado como unidade única
2. **Event-Driven**: Comunicação assíncrona entre módulos via Event Bus
3. **Multi-Tenant Ready**: Preparado para múltiplos restaurantes/franquias
4. **Offline-First**: Capacidade parcial offline com sincronização
5. **Hardware Agnostic**: Suporte a múltiplas marcas de periféricos
6. **Cloud Ready**: Preparado para deploy em nuvem mas funciona on-premise

Este diagrama representa a arquitetura atual do sistema Chefia POS, mostrando todos os componentes principais, suas interações e fluxos de dados.