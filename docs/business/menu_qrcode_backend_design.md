# Design do Backend para Cardápio Online via QR Code

## Visão Geral

Este documento detalha o design do backend para o cardápio online acessível via QR code do sistema POS Modern. A implementação visa criar uma solução robusta, escalável e de alta performance que permita aos clientes acessar o cardápio do restaurante através de seus smartphones e realizar pedidos.

## Arquitetura

### Componentes Principais

1. **Serviço de Menu**

   - Gerenciamento de cardápios, categorias e itens
   - Persistência em PostgreSQL
   - Cache dinâmico com Redis
   - Endpoints RESTful para acesso e gerenciamento

2. **Serviço de QR Code**

   - Geração e gerenciamento de QR codes
   - Personalização visual por restaurante
   - Rastreamento de acessos e análise de uso

3. **Serviço de Pedidos Online**

   - Processamento de pedidos feitos via cardápio online
   - Integração com o módulo de pedidos existente
   - Suporte a diferentes métodos de pagamento

4. **Infraestrutura AWS**
   - Hospedagem em AWS Elastic Beanstalk
   - Armazenamento de imagens em S3
   - CloudFront para CDN
   - RDS para PostgreSQL
   - ElastiCache para Redis

## Modelo de Dados

### Extensões ao Modelo Existente

Os modelos existentes (`Menu`, `MenuItem`, `MenuCategory`, `QRCodeConfig`) serão mantidos, com as seguintes extensões:

1. **MenuAccess**

   ```python
   class MenuAccess(BaseModel):
       id: UUID = Field(default_factory=uuid4)
       qrcode_id: UUID
       access_time: datetime = Field(default_factory=datetime.now)
       device_type: Optional[str] = None
       user_agent: Optional[str] = None
       ip_address: Optional[str] = None
   ```

2. **MenuOrder**

   ```python
   class MenuOrderStatus(str, Enum):
       PENDING = "pending"
       CONFIRMED = "confirmed"
       PREPARING = "preparing"
       READY = "ready"
       DELIVERED = "delivered"
       CANCELLED = "cancelled"

   class MenuOrderItem(BaseModel):
       id: UUID = Field(default_factory=uuid4)
       menu_item_id: UUID
       quantity: int = 1
       notes: Optional[str] = None
       options: List[UUID] = []
       variant_id: Optional[UUID] = None
       unit_price: float
       total_price: float

   class MenuOrder(BaseModel):
       id: UUID = Field(default_factory=uuid4)
       restaurant_id: UUID
       menu_id: UUID
       table_number: Optional[str] = None
       customer_name: Optional[str] = None
       customer_phone: Optional[str] = None
       items: List[MenuOrderItem] = []
       status: MenuOrderStatus = MenuOrderStatus.PENDING
       total_amount: float
       payment_method: Optional[str] = None
       payment_status: str = "pending"
       created_at: datetime = Field(default_factory=datetime.now)
       updated_at: datetime = Field(default_factory=datetime.now)
   ```

3. **MenuCache**
   ```python
   class MenuCache(BaseModel):
       menu_id: UUID
       restaurant_id: UUID
       cache_key: str
       cache_data: Dict[str, Any]
       created_at: datetime = Field(default_factory=datetime.now)
       expires_at: datetime
   ```

## Persistência

### PostgreSQL

Utilizaremos o PostgreSQL para armazenamento persistente de todos os dados relacionados ao cardápio, QR codes e pedidos. As tabelas serão criadas conforme os modelos definidos acima.

```sql
-- Exemplo de criação de tabelas (simplificado)
CREATE TABLE menus (
    id UUID PRIMARY KEY,
    restaurant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE menu_items (
    id UUID PRIMARY KEY,
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Outras tabelas seguem o mesmo padrão
```

### Redis para Cache

Implementaremos um sistema de cache usando Redis para melhorar a performance e reduzir a carga no banco de dados:

1. **Cache de Cardápio Público**

   - Chave: `menu:public:{restaurant_id}`
   - TTL: 15 minutos (configurável)
   - Invalidação: Quando o cardápio for atualizado

2. **Cache de Itens Populares**
   - Chave: `menu:popular:{restaurant_id}`
   - TTL: 1 hora (configurável)
   - Atualização: Baseada em análise de pedidos

## Endpoints da API

### Menu e Itens

Manteremos os endpoints existentes e adicionaremos novos:

```
GET /api/menu/public/{restaurant_id}
- Retorna o cardápio público com cache
- Suporta parâmetros de filtro (categoria, preço, etc.)

GET /api/menu/public/{restaurant_id}/popular
- Retorna os itens mais populares do cardápio

GET /api/menu/public/{restaurant_id}/search
- Pesquisa itens no cardápio por nome, descrição ou tags
```

### Pedidos Online

```
POST /api/menu/orders
- Cria um novo pedido a partir do cardápio online

GET /api/menu/orders/{order_id}
- Retorna detalhes de um pedido específico

PUT /api/menu/orders/{order_id}/status
- Atualiza o status de um pedido

POST /api/menu/orders/{order_id}/payment
- Processa o pagamento de um pedido
```

### QR Codes

```
GET /api/menu/qrcode/{qrcode_id}/stats
- Retorna estatísticas de acesso a um QR code específico

POST /api/menu/qrcode/access
- Registra um acesso a um QR code
```

## Integração com AWS

### Elastic Beanstalk

Configuraremos um ambiente Elastic Beanstalk para hospedar a aplicação:

```yaml
# .ebextensions/01_environment.config
option_settings:
  aws:elasticbeanstalk:application:environment:
    REDIS_HOST: "#{RedisEndpoint}"
    REDIS_PORT: "#{RedisPort}"
    DB_HOST: "#{RDSEndpoint}"
    DB_PORT: "#{RDSPort}"
    DB_NAME: posmodern
    DB_USER: "#{DBUser}"
    DB_PASSWORD: "#{DBPassword}"
    S3_BUCKET: posmodern-menu-assets
    CLOUDFRONT_DOMAIN: "#{CloudFrontDomain}"
```

### S3 e CloudFront

Utilizaremos S3 para armazenamento de imagens e CloudFront como CDN:

```python
def upload_image_to_s3(image_data, file_name, content_type='image/jpeg'):
    """Upload an image to S3 and return the CloudFront URL"""
    s3_client = boto3.client('s3')
    bucket_name = os.environ.get('S3_BUCKET')

    s3_client.put_object(
        Bucket=bucket_name,
        Key=file_name,
        Body=image_data,
        ContentType=content_type
    )

    cloudfront_domain = os.environ.get('CLOUDFRONT_DOMAIN')
    return f"https://{cloudfront_domain}/{file_name}"
```

## Segurança

### Autenticação e Autorização

Para endpoints administrativos, utilizaremos JWT (JSON Web Tokens):

```python
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError as e:
        raise credentials_exception from e
    user = get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user
```

### Proteção contra Ataques

Implementaremos medidas de segurança como:

1. **Rate Limiting**

   - Limitar o número de requisições por IP
   - Proteção contra ataques de força bruta

2. **Validação de Entrada**

   - Validação rigorosa de todos os parâmetros de entrada
   - Proteção contra injeção SQL e XSS

3. **HTTPS**
   - Todas as comunicações serão criptografadas via HTTPS
   - Certificados gerenciados pelo AWS Certificate Manager

## Cache e Performance

### Estratégia de Cache

1. **Cache de Primeiro Nível (Redis)**

   - Cardápios completos
   - Itens populares
   - Configurações de QR code

2. **Cache de Segundo Nível (CloudFront)**
   - Imagens e assets estáticos
   - Conteúdo com baixa frequência de atualização

### Otimização de Performance

1. **Consultas Otimizadas**

   - Índices adequados no PostgreSQL
   - Consultas eficientes com joins otimizados

2. **Compressão de Resposta**

   - Compressão GZIP para respostas HTTP
   - Redução do tamanho das payloads

3. **Lazy Loading**
   - Carregamento sob demanda de dados não essenciais
   - Paginação para conjuntos grandes de dados

## Monitoramento e Logging

### CloudWatch

Configuraremos métricas e alarmes no CloudWatch:

```python
def log_metric(metric_name, value, unit="Count", dimensions=None):
    """Log a custom metric to CloudWatch"""
    cloudwatch = boto3.client('cloudwatch')

    metric_data = {
        'MetricName': metric_name,
        'Value': value,
        'Unit': unit
    }

    if dimensions:
        metric_data['Dimensions'] = dimensions

    cloudwatch.put_metric_data(
        Namespace='PosModern/Menu',
        MetricData=[metric_data]
    )
```

### Structured Logging

Implementaremos logging estruturado para facilitar a análise:

```python
def setup_logger():
    """Configure structured JSON logging"""
    logger = logging.getLogger("menu_service")
    handler = logging.StreamHandler()

    class JsonFormatter(logging.Formatter):
        def format(self, record):
            log_record = {
                "timestamp": datetime.utcnow().isoformat(),
                "level": record.levelname,
                "message": record.getMessage(),
                "module": record.module,
                "function": record.funcName,
                "line": record.lineno
            }

            if hasattr(record, 'request_id'):
                log_record["request_id"] = record.request_id

            return json.dumps(log_record)

    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

    return logger
```

## Próximos Passos

1. Implementar as extensões ao modelo de dados
2. Configurar a persistência em PostgreSQL
3. Implementar o sistema de cache com Redis
4. Desenvolver os novos endpoints da API
5. Configurar a infraestrutura AWS
6. Implementar medidas de segurança
7. Configurar monitoramento e logging
