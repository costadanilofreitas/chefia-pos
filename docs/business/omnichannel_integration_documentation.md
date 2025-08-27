# Integração Omnichannel e Facebook Pixel - Documentação

Este documento descreve a implementação da integração omnichannel (WhatsApp, Messenger e Instagram) e Facebook Pixel para o sistema POS Modern.

## Visão Geral

A integração omnichannel permite que o sistema POS Modern se comunique com clientes através de múltiplos canais de mensagens, incluindo:

1. WhatsApp (via Twilio)
2. Facebook Messenger
3. Instagram Direct

Além disso, a integração com Facebook Pixel permite o rastreamento de eventos para otimização de campanhas de marketing.

## Arquitetura

A arquitetura da integração omnichannel segue um modelo event-driven com os seguintes componentes:

### Componentes Principais

1. **Abstrações Base**
   - `BasePlatformIntegration`: Interface comum para integrações de plataformas
   - `BaseChatbotService`: Serviço base para processamento de mensagens

2. **Integrações de Plataforma**
   - `WhatsAppIntegration`: Integração com WhatsApp via Twilio
   - `MessengerIntegration`: Integração com Facebook Messenger
   - `InstagramIntegration`: Integração com Instagram Direct

3. **Serviços de Chatbot**
   - `WhatsAppChatbotService`: Serviço de chatbot para WhatsApp
   - `MessengerChatbotService`: Serviço de chatbot para Messenger
   - `InstagramChatbotService`: Serviço de chatbot para Instagram

4. **Integração SQS**
   - Comunicação event-driven entre chatbots e sistema POS
   - Filas FIFO para garantir ordem de mensagens

5. **Integração de Marketing**
   - `FacebookPixelIntegration`: Integração com Facebook Pixel
   - `MarketingIntegration`: Abstração para múltiplas plataformas de marketing

### Fluxo de Dados

1. Cliente envia mensagem via WhatsApp/Messenger/Instagram
2. Plataforma envia webhook para API do sistema
3. API encaminha para o serviço de chatbot apropriado
4. Chatbot processa mensagem e gera resposta
5. Resposta é enviada de volta para o cliente
6. Eventos relevantes são rastreados via Facebook Pixel

## Configuração

### WhatsApp (Twilio)

```python
# Configuração do WhatsApp via Twilio
TWILIO_ACCOUNT_SID = "seu_account_sid"
TWILIO_AUTH_TOKEN = "seu_auth_token"
TWILIO_PHONE_NUMBER = "seu_numero_whatsapp"
```

### Facebook Messenger

```python
# Configuração do Facebook Messenger
MESSENGER_PAGE_ID = "seu_page_id"
MESSENGER_APP_ID = "seu_app_id"
MESSENGER_APP_SECRET = "seu_app_secret"
MESSENGER_ACCESS_TOKEN = "seu_access_token"
MESSENGER_VERIFY_TOKEN = "seu_verify_token"
```

### Instagram Direct

```python
# Configuração do Instagram Direct
INSTAGRAM_ACCESS_TOKEN = "seu_access_token"
INSTAGRAM_APP_SECRET = "seu_app_secret"
INSTAGRAM_VERIFY_TOKEN = "seu_verify_token"
```

### Facebook Pixel

```python
# Configuração do Facebook Pixel
FACEBOOK_PIXEL_ID = "seu_pixel_id"
FACEBOOK_ACCESS_TOKEN = "seu_access_token"
```

### SQS FIFO

```python
# Configuração do SQS FIFO
AWS_ACCESS_KEY_ID = "sua_access_key"
AWS_SECRET_ACCESS_KEY = "sua_secret_key"
AWS_REGION = "sua_regiao"
SQS_QUEUE_URL = "url_da_fila_sqs"
```

## Funcionalidades

### Comuns a Todas as Plataformas

- Exibição do cardápio com categorias e itens
- Adição de itens ao carrinho
- Revisão do carrinho
- Checkout com informações de entrega
- Pagamento via PIX, cartão de crédito ou dinheiro
- Acompanhamento de pedidos
- Feedback e avaliação
- Suporte ao cliente

### Específicas do WhatsApp

- Integração com Twilio para envio/recebimento de mensagens
- Suporte a mensagens de texto, imagens e botões interativos
- Integração com Amazon Bedrock (Claude) para IA generativa
- Campanhas de marketing personalizadas com IA

### Específicas do Messenger

- Suporte a carrosséis de produtos
- Quick replies para respostas rápidas
- Templates genéricos para exibição de produtos
- Botões interativos para navegação

### Específicas do Instagram

- Suporte a quick replies
- Envio de imagens com legendas
- Adaptações para limitações da API do Instagram

### Facebook Pixel

- Rastreamento de eventos padrão:
  - PageView
  - AddToCart
  - Purchase
  - Lead
  - CompleteRegistration
  - Search
  - ViewContent
  - AddToWishlist
  - InitiateCheckout
  - Contact
- Suporte a eventos personalizados
- Conformidade com LGPD/GDPR (hash de dados sensíveis)

## Validação

A validação da integração omnichannel é realizada através do módulo `OmnichannelValidator`, que testa:

1. Integração com WhatsApp
2. Integração com Messenger
3. Integração com Instagram
4. Integração com Facebook Pixel
5. Integração entre plataformas

Os resultados da validação são salvos em arquivos JSON para análise.

## Próximos Passos

1. Implementação de testes automatizados para todas as integrações
2. Melhorias na integração com IA generativa
3. Suporte a mais plataformas de mensagens
4. Integração com mais plataformas de marketing além do Facebook Pixel
