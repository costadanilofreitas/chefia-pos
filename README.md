# POS Modern - Sistema Completo de Gestão para Restaurantes

O POS Modern é uma solução completa e modular para gestão de restaurantes, oferecendo desde o ponto de venda até integrações avançadas com plataformas de delivery, pagamentos online e análises preditivas com IA.

## Arquitetura do Sistema

O POS Modern foi desenvolvido com uma arquitetura modular, event-driven e escalável:

```
pos-modern/
├── src/                      # Código-fonte do sistema
│   ├── accounts/             # Gestão de contas e usuários
│   ├── ai/                   # Módulos de inteligência artificial
│   │   ├── demand_forecast/  # Previsão de demanda com Amazon Forecast
│   │   └── operational_optimization/ # Otimização operacional
│   ├── api/                  # API principal e gateway
│   ├── auth/                 # Autenticação e controle de acesso (RBAC)
│   ├── backoffice/           # Interface administrativa
│   ├── business_day/         # Gestão de dias de operação
│   ├── cashier/              # Operações de caixa
│   ├── core/                 # Componentes centrais e compartilhados
│   ├── customer/             # Gestão de clientes
│   ├── delivery/             # Integração com plataformas de delivery
│   ├── employee/             # Gestão de funcionários
│   ├── fiscal/               # Módulos fiscais (SAT, NFC-e, CF-e, MFE)
│   ├── inventory/            # Gestão de estoque
│   ├── kds/                  # Sistema de exibição para cozinha
│   ├── kiosk/                # Totem de autoatendimento
│   ├── marketplace/          # Marketplace de integrações
│   ├── menu/                 # Gestão de cardápio
│   ├── mobile_waiter/        # Aplicativo móvel para garçons
│   ├── order/                # Gestão de pedidos
│   ├── payment/              # Processamento de pagamentos
│   ├── peripherals/          # Integração com periféricos
│   ├── pos/                  # Terminal de ponto de venda
│   ├── postsale/             # Módulo de pós-venda e feedback
│   ├── product/              # Gestão de produtos
│   ├── remote_orders/        # Pedidos remotos (delivery, takeout)
│   │   └── adapters/         # Adaptadores para plataformas externas
│   │       ├── ifood/        # Integração completa com iFood
│   │       └── ...           # Outros adaptadores
│   ├── sat/                  # Integração com SAT
│   ├── stock/                # Controle de estoque
│   ├── supplier/             # Gestão de fornecedores
│   ├── support/              # Sistema de suporte escalável
│   ├── waiter/               # Módulo de garçom
│   ├── whatsapp/             # Chatbot WhatsApp com IA generativa
│   │   ├── sqs/              # Integração SQS FIFO para comunicação event-based
│   │   └── ...               # Outros componentes do chatbot
│   └── main.py               # Ponto de entrada da aplicação
├── docs/                     # Documentação detalhada
├── requirements.txt          # Dependências do projeto
├── Dockerfile                # Configuração para containerização
├── docker-compose.yml        # Configuração para ambiente de desenvolvimento
└── README.md                 # Documentação do projeto
```

## Funcionalidades Principais

### Módulos Operacionais
- **Ponto de Venda (POS)**: Interface intuitiva para registro de vendas
- **Frente de Caixa**: Abertura/fechamento, gestão de caixa, relatórios
- **Cardápio Digital**: Cardápio online acessível via QR Code
- **Gestão de Mesas**: Layout visual e controle de ocupação
- **Gestão de Pedidos**: Registro, acompanhamento e entrega
- **Controle de Estoque**: Gestão de inventário e alertas
- **KDS (Kitchen Display System)**: Visualização de pedidos na cozinha

### Integrações Estratégicas
- **iFood**: Integração bidirecional completa com marketplace de delivery
- **Chatbot WhatsApp**: Atendimento automatizado via WhatsApp (Twilio + Amazon Bedrock)
- **Pagamentos Online**: Integração com Asaas para PIX, crédito e débito
- **Documentos Fiscais**: SAT, NFC-e, CF-e, MFE
- **Contabilidade**: Exportação para sistemas contábeis

### Recursos Avançados
- **IA Preditiva**: Previsão de demanda e otimização operacional
- **Campanhas Automáticas**: Marketing personalizado via WhatsApp/Telegram
- **Dashboards Analíticos**: Visualizações personalizáveis para KPIs
- **Marketplace de Integrações**: API pública para parceiros
- **Suporte Escalável**: Sistema de tickets e base de conhecimento

## Requisitos do Sistema

### Requisitos de Hardware
- **Servidor**: 2+ núcleos, 4GB+ RAM
- **Clientes**: Tablets, computadores, smartphones ou quiosques
- **Periféricos**: Impressoras térmicas, gavetas de dinheiro, leitores de código de barras (opcionais)

### Requisitos de Software
- **Sistema Operacional**: Linux, Windows ou macOS
- **Docker**: 20.10.0+
- **Docker Compose**: 2.0.0+
- **Navegador**: Chrome 90+, Firefox 90+, Edge 90+, Safari 14+

## Como Executar

### Usando Docker (Recomendado)

1. Certifique-se de ter Docker e Docker Compose instalados
2. Clone o repositório
3. Configure as variáveis de ambiente:

```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. Execute o sistema:

```bash
docker-compose up
```

5. Acesse a interface web em http://localhost:8080
6. Acesse o backoffice em http://localhost:8080/backoffice
7. Acesse a documentação da API em http://localhost:8080/api/docs

### Sem Docker

1. Certifique-se de ter Python 3.11+ e Node.js 18+ instalados
2. Clone o repositório
3. Configure o ambiente Python:

```bash
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
pip install -r requirements.txt
```

4. Configure o ambiente Node.js:

```bash
cd frontend
npm install
```

5. Configure as variáveis de ambiente:

```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

6. Execute o backend:

```bash
cd backend
uvicorn src.main:app --reload
```

7. Execute o frontend:

```bash
cd frontend
npm run dev
```

8. Acesse a interface web em http://localhost:3000
9. Acesse o backoffice em http://localhost:3000/backoffice
10. Acesse a documentação da API em http://localhost:8000/api/docs

## Módulos e Integrações

### Módulo de Cardápio Online (QR Code)
- Cardápio digital acessível via QR Code
- Personalização visual por restaurante
- Filtros por categoria, preço e tipo de item
- Indicadores de itens populares
- Modo escuro/claro
- Informações nutricionais e alérgenos (opcional)
- Pedidos diretos pelo cardápio

### Módulo Fiscal
- Integração com SAT
- Suporte a NFC-e
- Suporte a CF-e
- Suporte a MFE
- Integração com sistemas contábeis
- Conformidade com legislações estaduais

### Marketplace de Integrações
- API pública REST
- Modelo de aprovação de parceiros
- Integrações prioritárias:
  - Delivery (iFood, Rappi, etc.)
  - Pagamentos (Asaas, PagSeguro, etc.)
  - CRM (RD Station, Hubspot, etc.)
- Webhooks para notificações em tempo real
- Documentação completa da API

### Módulo de IA e Análise Preditiva
- Previsão de demanda automática
- Otimização de escala de funcionários
- Otimização de rotas de delivery
- Otimização de distribuição de mesas
- Retenção em totens de autoatendimento
- Campanhas automáticas via WhatsApp

### Chatbot WhatsApp (Implementação Completa)
- **Integração com Twilio**: Processamento de mensagens e webhooks
- **Arquitetura Event-Driven**: Comunicação via SQS FIFO para desacoplamento
- **IA Generativa**: Integração com Amazon Bedrock (Claude) para respostas personalizadas
- **Exibição e Navegação do Cardápio**: Menus interativos com botões e listas
- **Registro de Pedidos**: Fluxo completo de pedidos via chat
- **Pagamentos Online**: Integração com Asaas para PIX e cartões
- **Confirmação Configurável**: Modos automático ou manual por restaurante
- **Notificações em Tempo Real**: Atualizações de status do pedido
- **Reembolso Automático**: Para pedidos não confirmados ou cancelados
- **Campanhas de Marketing**: Geração de mensagens personalizadas com IA
- **Análise de Feedback**: Processamento de sentimento e tópicos com IA

### Integração com iFood (Implementação Completa)
- **Autenticação OAuth2**: Gerenciamento de tokens com renovação automática
- **Webhooks Bidirecionais**: Recebimento e processamento de eventos
- **Polling de Eventos**: Verificação periódica de novos pedidos
- **Confirmação/Rejeição**: Fluxo completo de aceitação ou recusa de pedidos
- **Atualização de Status**: Sincronização em tempo real do status do pedido
- **Notificações**: Sistema de notificações para novos pedidos e atualizações
- **Reembolso Automático**: Para pedidos cancelados com pagamento antecipado
- **Verificação de Assinatura**: Segurança em webhooks com HMAC
- **Conversão de Formato**: Adaptação entre formatos iFood e interno

### Pagamentos Online
- Integração com Asaas
- Suporte a PIX
- Suporte a cartões de crédito e débito
- Split de pagamentos
- Pagamentos parciais por assento
- Estornos automáticos

## Arquitetura Event-Driven

O POS Modern implementa uma arquitetura event-driven robusta para garantir escalabilidade, resiliência e desacoplamento entre componentes:

### Componentes Principais
- **SQS FIFO**: Filas para comunicação assíncrona com garantia de ordem
- **Webhooks**: Endpoints para recebimento de eventos externos
- **Event Handlers**: Processadores de eventos específicos
- **Notification Service**: Serviço centralizado de notificações

### Fluxos de Eventos
1. **Pedido via WhatsApp**:
   - Cliente envia mensagem → Webhook Twilio → SQS → Processador de Mensagens → Confirmação → Notificação
   
2. **Pedido via iFood**:
   - iFood envia pedido → Webhook iFood → Validação → Processador de Pedidos → Confirmação → Notificação
   
3. **Atualização de Status**:
   - Mudança de status → SQS → Processador de Status → Atualização externa → Notificação ao cliente

## Checklist de Integrações Implementadas

- [x] Autenticação e RBAC
- [x] Cardápio Online via QR Code
- [x] Terminal Móvel para Garçons
- [x] SAT Fiscal
- [x] NFC-e, CF-e, MFE
- [x] Marketplace de Integrações
- [x] API Pública REST
- [x] Previsão de Demanda com IA
- [x] Otimização Operacional
- [x] Campanhas de Marketing Automatizadas
- [x] Integração com iFood (Completa)
- [x] Chatbot WhatsApp via Twilio (Completo)
- [x] IA Generativa (Amazon Bedrock/Claude)
- [x] Pagamentos Online via Asaas
- [x] Split de Pagamentos
- [x] Feedback Pós-Venda
- [x] Dashboards Analíticos
- [x] Sistema de Suporte Escalável

## Usuários de Teste

Para facilitar os testes, o sistema vem pré-configurado com os seguintes usuários:

- **Administrador**: username: `admin`, senha: `admin123`
- **Gerente**: username: `gerente`, senha: `senha123`
- **Caixa**: username: `caixa`, senha: `senha123`
- **Garçom**: username: `garcom`, senha: `senha123`
- **Cozinheiro**: username: `cozinheiro`, senha: `senha123`

## Exemplos de Uso

### Autenticação

```bash
curl -X POST "http://localhost:8080/api/v1/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=gerente&password=senha123"
```

### Obter Cardápio

```bash
curl -X GET "http://localhost:8080/api/v1/menu/restaurant/123" \
  -H "Authorization: Bearer {seu_token_aqui}"
```

### Criar Pedido

```bash
curl -X POST "http://localhost:8080/api/v1/orders" \
  -H "Authorization: Bearer {seu_token_aqui}" \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": "123",
    "table_id": "45",
    "items": [
      {"product_id": "789", "quantity": 2, "notes": "Sem cebola"},
      {"product_id": "456", "quantity": 1}
    ]
  }'
```

### Integração com iFood (Webhook)

```bash
curl -X POST "http://localhost:8080/api/v1/remote_orders/ifood/webhook" \
  -H "X-Ifood-Signature: {assinatura_hmac}" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "ORDER_PLACED",
    "order": {
      "id": "ifood-123456",
      "restaurant": "123",
      "customer": {"name": "João Silva", "phone": "11999998888"},
      "items": [
        {"name": "X-Burger", "quantity": 2, "price": 15.90}
      ],
      "totalPrice": 31.80
    }
  }'
```

### Confirmar Pedido iFood

```bash
curl -X POST "http://localhost:8080/api/v1/remote_orders/ifood/orders/{order_id}/confirm" \
  -H "Authorization: Bearer {seu_token_aqui}" \
  -H "Content-Type: application/json"
```

### Cancelar Pedido iFood

```bash
curl -X POST "http://localhost:8080/api/v1/remote_orders/ifood/orders/{order_id}/cancel" \
  -H "Authorization: Bearer {seu_token_aqui}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Restaurante sem ingredientes disponíveis"
  }'
```

### Enviar Mensagem via WhatsApp

```bash
curl -X POST "http://localhost:8080/api/v1/whatsapp/send" \
  -H "Authorization: Bearer {seu_token_aqui}" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5511999998888",
    "message": {
      "type": "text",
      "text": "Seu pedido #123 está pronto para retirada!"
    }
  }'
```

### Enviar Mensagem Interativa via WhatsApp

```bash
curl -X POST "http://localhost:8080/api/v1/whatsapp/send" \
  -H "Authorization: Bearer {seu_token_aqui}" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5511999998888",
    "message": {
      "type": "interactive_buttons",
      "body": "Seu pedido #123 está pronto. Como deseja receber?",
      "options": [
        {"id": "delivery", "title": "Delivery"},
        {"id": "pickup", "title": "Retirar no local"}
      ]
    }
  }'
```

### Enviar Campanha de Marketing via WhatsApp

```bash
curl -X POST "http://localhost:8080/api/v1/whatsapp/campaign" \
  -H "Authorization: Bearer {seu_token_aqui}" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_data": {
      "name": "Maria Silva",
      "phone": "5511999998888",
      "favorite_items": ["X-Burger", "Batata Frita"],
      "days_inactive": 30,
      "last_order_date": "2025-04-26"
    },
    "campaign_type": "reactivation",
    "restaurant_data": {
      "name": "Burger Place"
    }
  }'
```

### Processar Pagamento PIX via Asaas

```bash
curl -X POST "http://localhost:8080/api/v1/payment/pix" \
  -H "Authorization: Bearer {seu_token_aqui}" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "cus_123456",
    "value": 31.80,
    "description": "Pedido #123",
    "external_reference": "order_123"
  }'
```

## Configuração de Integrações

### Configuração do Chatbot WhatsApp

Configure as seguintes variáveis de ambiente para habilitar o chatbot WhatsApp:

```
# Twilio
TWILIO_ACCOUNT_SID=seu_account_sid
TWILIO_AUTH_TOKEN=seu_auth_token
TWILIO_WHATSAPP_NUMBER=seu_numero_whatsapp

# AWS SQS
AWS_ACCESS_KEY_ID=sua_access_key
AWS_SECRET_ACCESS_KEY=sua_secret_key
AWS_REGION=sua_regiao
WHATSAPP_SQS_QUEUE_URL=url_da_fila_sqs

# Asaas
ASAAS_API_KEY=sua_api_key
ASAAS_API_URL=https://api.asaas.com/v3

# Amazon Bedrock
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

### Configuração da Integração iFood

Configure as seguintes variáveis de ambiente para habilitar a integração com iFood:

```
# iFood
IFOOD_CLIENT_ID=seu_client_id
IFOOD_CLIENT_SECRET=seu_client_secret
IFOOD_MERCHANT_ID=seu_merchant_id
IFOOD_WEBHOOK_SECRET=seu_webhook_secret
IFOOD_WEBHOOK_URL=https://seu-dominio.com/api/v1/remote_orders/ifood/webhook
IFOOD_AUTO_CONFIRM=false
IFOOD_CONFIRMATION_TIMEOUT=15
```

## Como Testar

Execute os testes automatizados com:

```bash
# Testes unitários
pytest src/tests/unit/

# Testes de integração
pytest src/tests/integration/

# Testes de ponta a ponta
pytest src/tests/e2e/
```

## Arquitetura Multi-Tenant e Serverless

O POS Modern foi projetado com arquitetura multi-tenant para suportar múltiplos restaurantes em uma única instância, e pode ser implantado em infraestrutura serverless na AWS para alta escalabilidade e baixo custo.

### Componentes AWS
- **Lambda**: Funções serverless para processamento
- **API Gateway**: Gerenciamento de APIs
- **DynamoDB**: Armazenamento de dados
- **S3**: Armazenamento de arquivos estáticos
- **Cognito**: Autenticação e autorização
- **SQS/SNS**: Filas e notificações para arquitetura event-driven
- **CloudWatch**: Monitoramento e logs
- **Bedrock**: IA generativa para chatbot WhatsApp

## Licenciamento

O sistema suporta licenciamento modular, permitindo que restaurantes optem por funcionalidades específicas conforme suas necessidades. O controle de licenças é gerenciado pelo backoffice administrativo.

## Suporte e Documentação

- Documentação detalhada disponível em `/docs`
- Sistema de tickets integrado para suporte
- Base de conhecimento com artigos e tutoriais
- Chatbot de suporte para resolução de problemas comuns

## Contribuição

Contribuições são bem-vindas! Por favor, leia o guia de contribuição em `CONTRIBUTING.md` antes de enviar pull requests.

## Notas de Desenvolvimento

Este sistema foi desenvolvido seguindo as melhores práticas de arquitetura de software, segurança e experiência do usuário. A arquitetura modular e event-driven permite fácil extensão e manutenção, enquanto as integrações estratégicas garantem um ecossistema completo para gestão de restaurantes.

A implementação completa do chatbot WhatsApp e da integração com iFood representa um avanço significativo na capacidade do sistema de gerenciar pedidos remotos de forma eficiente e automatizada, com suporte a fluxos complexos de confirmação, notificação e reembolso.
