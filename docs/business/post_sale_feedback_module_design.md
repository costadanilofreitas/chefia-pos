# Design do Módulo de Pós-Venda

## Visão Geral

O Módulo de Pós-Venda é uma funcionalidade essencial para o sistema POS Modern que permitirá coletar feedback dos clientes após a conclusão de pedidos, oferecendo benefícios como incentivo para avaliações. Este documento detalha o design técnico e funcional do módulo.

## Objetivos

1. Coletar avaliações e feedback dos clientes após a conclusão de pedidos
2. Oferecer benefícios personalizados como incentivo para avaliações
3. Fornecer análises e insights sobre a satisfação do cliente
4. Integrar com outros módulos do sistema para uma experiência completa

## Arquitetura

### Componentes Principais

1. **Modelos de Dados**:
   - `Feedback`: Armazena avaliações e comentários dos clientes
   - `FeedbackRequest`: Gerencia solicitações de feedback enviadas aos clientes
   - `Benefit`: Define benefícios oferecidos por avaliações
   - `CustomerBenefit`: Associa benefícios concedidos a clientes específicos

2. **Serviços**:
   - `FeedbackService`: Gerencia o ciclo de vida das avaliações
   - `BenefitService`: Controla a criação e distribuição de benefícios
   - `NotificationService`: Envia solicitações de feedback e notificações de benefícios
   - `AnalyticsService`: Processa dados de feedback para gerar insights

3. **APIs**:
   - Endpoints para submissão de avaliações
   - Rotas para gerenciamento de benefícios
   - Interfaces para análise de dados de feedback

4. **Interfaces de Usuário**:
   - Formulário de avaliação para clientes
   - Dashboard de análise de feedback para gerentes
   - Interface de gerenciamento de benefícios

## Fluxos de Trabalho

### Solicitação de Feedback

1. Após a conclusão de um pedido, o sistema registra uma solicitação de feedback
2. O cliente recebe uma notificação (e-mail, SMS, QR code no recibo) com link para avaliação
3. O link permanece válido por um período configurável (padrão: 7 dias)
4. Lembretes podem ser enviados automaticamente se o cliente não responder

### Submissão de Avaliação

1. O cliente acessa o formulário de avaliação através do link recebido
2. O formulário apresenta perguntas sobre a experiência (satisfação geral, qualidade, atendimento)
3. O cliente pode adicionar comentários textuais e fotos (opcional)
4. Após submissão, o cliente recebe confirmação e informações sobre benefícios

### Distribuição de Benefícios

1. Com base na política configurada, o sistema determina o benefício a ser concedido
2. O benefício é registrado na conta do cliente (se cadastrado) ou gerado como código promocional
3. O cliente recebe notificação sobre o benefício concedido
4. O benefício pode ser resgatado em visitas futuras

### Análise de Feedback

1. Os dados de feedback são processados e agregados automaticamente
2. Métricas-chave são calculadas (NPS, satisfação média, tendências)
3. Alertas são gerados para avaliações negativas que requerem atenção
4. Relatórios periódicos são enviados aos gerentes

## Modelos de Dados

### Feedback

```python
class FeedbackRating(int, Enum):
    """Escala de avaliação de 1 a 5 estrelas."""
    VERY_POOR = 1
    POOR = 2
    AVERAGE = 3
    GOOD = 4
    EXCELLENT = 5

class FeedbackCategory(str, Enum):
    """Categorias de feedback."""
    FOOD_QUALITY = "food_quality"
    SERVICE = "service"
    AMBIENCE = "ambience"
    PRICE = "price"
    CLEANLINESS = "cleanliness"
    GENERAL = "general"

class Feedback(BaseModel):
    """Modelo para armazenar feedback do cliente."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    overall_rating: FeedbackRating
    category_ratings: Dict[FeedbackCategory, FeedbackRating] = {}
    comment: Optional[str] = None
    photos: List[str] = []
    restaurant_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    benefit_id: Optional[str] = None
    benefit_claimed: bool = False
    benefit_claimed_at: Optional[datetime] = None
    source: str = "direct"  # direct, email, qr, sms
```

### FeedbackRequest

```python
class FeedbackRequestStatus(str, Enum):
    """Status da solicitação de feedback."""
    PENDING = "pending"
    COMPLETED = "completed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class FeedbackRequest(BaseModel):
    """Modelo para solicitações de feedback."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    access_token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: FeedbackRequestStatus = FeedbackRequestStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    reminder_sent: bool = False
    reminder_sent_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    feedback_id: Optional[str] = None
```

### Benefit

```python
class BenefitType(str, Enum):
    """Tipos de benefícios."""
    DISCOUNT = "discount"
    FREE_ITEM = "free_item"
    LOYALTY_POINTS = "loyalty_points"
    COUPON = "coupon"
    GIFT_CARD = "gift_card"

class BenefitTrigger(str, Enum):
    """Gatilhos para concessão de benefícios."""
    ANY_FEEDBACK = "any_feedback"
    POSITIVE_FEEDBACK = "positive_feedback"
    NEGATIVE_FEEDBACK = "negative_feedback"
    FIRST_FEEDBACK = "first_feedback"
    REPEAT_CUSTOMER = "repeat_customer"

class Benefit(BaseModel):
    """Modelo para definição de benefícios."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    type: BenefitType
    value: float  # Valor do benefício (desconto, pontos, etc.)
    trigger: BenefitTrigger
    min_rating: Optional[int] = None  # Avaliação mínima para trigger baseado em rating
    active: bool = True
    valid_from: datetime = Field(default_factory=datetime.utcnow)
    valid_until: Optional[datetime] = None
    restaurant_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    usage_limit: Optional[int] = None  # Limite de uso total
    usage_count: int = 0
    item_id: Optional[str] = None  # Para benefícios do tipo FREE_ITEM
```

### CustomerBenefit

```python
class CustomerBenefitStatus(str, Enum):
    """Status do benefício do cliente."""
    ISSUED = "issued"
    NOTIFIED = "notified"
    CLAIMED = "claimed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class CustomerBenefit(BaseModel):
    """Modelo para benefícios concedidos a clientes."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    benefit_id: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    feedback_id: str
    order_id: str
    code: str = Field(default_factory=lambda: ''.join(random.choices(string.ascii_uppercase + string.digits, k=8)))
    status: CustomerBenefitStatus = CustomerBenefitStatus.ISSUED
    created_at: datetime = Field(default_factory=datetime.utcnow)
    notified_at: Optional[datetime] = None
    claimed_at: Optional[datetime] = None
    expires_at: datetime
    claimed_order_id: Optional[str] = None
```

## Serviços

### FeedbackService

Responsável por gerenciar o ciclo de vida das avaliações, incluindo:

- Criação de solicitações de feedback
- Processamento de avaliações recebidas
- Geração de tokens de acesso seguros
- Validação de solicitações de feedback
- Associação de feedback a pedidos e clientes

### BenefitService

Gerencia a criação, distribuição e resgate de benefícios:

- Definição de políticas de benefícios
- Determinação de benefícios elegíveis com base em avaliações
- Geração de códigos promocionais
- Validação e resgate de benefícios
- Rastreamento de uso de benefícios

### NotificationService

Responsável por todas as comunicações relacionadas a feedback:

- Envio de solicitações de feedback por diversos canais
- Geração de lembretes para avaliações pendentes
- Notificação sobre benefícios concedidos
- Alertas para equipe sobre avaliações negativas

### AnalyticsService

Processa dados de feedback para gerar insights:

- Cálculo de métricas-chave (NPS, satisfação média)
- Identificação de tendências e padrões
- Geração de relatórios periódicos
- Alertas baseados em limiares configuráveis

## Interfaces de Usuário

### Formulário de Avaliação para Clientes

- Design responsivo para acesso via dispositivos móveis
- Interface simples e intuitiva
- Suporte a múltiplos idiomas
- Opção para envio de fotos
- Confirmação visual de benefícios concedidos

### Dashboard de Análise de Feedback

- Visão geral de métricas-chave
- Filtros por período, categoria, avaliação
- Visualização de tendências ao longo do tempo
- Acesso a comentários individuais
- Exportação de dados para análise externa

### Interface de Gerenciamento de Benefícios

- Criação e edição de políticas de benefícios
- Monitoramento de benefícios concedidos e resgatados
- Análise de eficácia dos benefícios
- Configuração de regras de distribuição automática

## Integrações

### Módulo de Pedidos

- Acesso a detalhes de pedidos para contextualização do feedback
- Trigger automático de solicitação de feedback após conclusão do pedido
- Associação de avaliações a itens específicos do pedido

### Módulo de Clientes

- Acesso a informações de contato para envio de solicitações
- Atualização do histórico do cliente com feedback fornecido
- Associação de benefícios à conta do cliente

### Módulo de Pagamentos

- Aplicação de benefícios em transações futuras
- Validação de códigos promocionais durante pagamento
- Rastreamento de uso de benefícios

## Considerações de Segurança

- Tokens de acesso seguros para formulários de avaliação
- Validação de origem para submissões de feedback
- Proteção contra abuso de benefícios
- Conformidade com regulamentações de privacidade (LGPD/GDPR)
- Anonimização de dados sensíveis em relatórios

## Métricas de Sucesso

- Taxa de resposta às solicitações de feedback
- Tempo médio entre solicitação e submissão
- Distribuição de avaliações por categoria
- Taxa de resgate de benefícios
- Impacto dos benefícios na retenção de clientes

## Próximos Passos

1. Implementação dos modelos de dados
2. Desenvolvimento dos serviços de backend
3. Criação das APIs RESTful
4. Implementação das interfaces de usuário
5. Testes de integração com outros módulos
6. Validação com usuários reais
7. Lançamento e monitoramento inicial
