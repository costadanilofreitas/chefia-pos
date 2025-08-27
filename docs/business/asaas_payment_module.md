# Módulo de Pagamento Online Asaas - Documentação

## Visão Geral

O módulo de pagamento online Asaas permite a integração do sistema POS Modern com a plataforma de pagamentos Asaas, possibilitando o processamento de pagamentos via PIX, cartão de crédito e débito. A implementação atual foca no pagamento via PIX, com suporte para notificações por e-mail e SMS.

## Arquitetura

O módulo segue a arquitetura modular do sistema POS Modern, com os seguintes componentes:

### 1. Modelos de Dados
- `PaymentProvider`: Enum para provedores de pagamento (Asaas)
- `PaymentMethod`: Enum para métodos de pagamento (PIX, crédito, débito)
- `PaymentStatus`: Enum para status de pagamento (pendente, confirmado, etc.)
- `NotificationType`: Enum para tipos de notificação (e-mail, SMS)
- `Payment`: Modelo para armazenar informações de pagamento
- `PaymentCreate`: Modelo para criação de pagamentos
- `ProviderConfig`: Configuração do provedor de pagamento

### 2. Adaptador Asaas
- Implementa a comunicação com a API do Asaas
- Gerencia autenticação e requisições HTTP
- Converte dados entre o formato interno e o formato da API
- Processa webhooks para atualização de status

### 3. Serviço de Pagamento
- Gerencia o ciclo de vida dos pagamentos
- Seleciona o adaptador apropriado com base no provedor
- Integra com o serviço de pedidos para atualização de status
- Publica eventos para notificação de mudanças de status

### 4. Endpoints da API
- `/api/v1/payments/`: Criação de pagamentos
- `/api/v1/payments/{payment_id}`: Obtenção de detalhes de pagamento
- `/api/v1/payments/order/{order_id}`: Listagem de pagamentos por pedido
- `/api/v1/payments/{payment_id}/check`: Verificação de status de pagamento
- `/api/v1/payments/webhook/asaas`: Recebimento de webhooks do Asaas

### 5. Sistema de Eventos
- Eventos para notificação de criação e atualização de pagamentos
- Integração com outros módulos do sistema

## Fluxo de Pagamento PIX

1. **Criação do Pagamento**:
   - O cliente seleciona PIX como método de pagamento
   - O sistema cria um pagamento via API do Asaas
   - O Asaas gera um QR Code PIX e uma chave PIX
   - O sistema exibe o QR Code e a chave para o cliente

2. **Pagamento pelo Cliente**:
   - O cliente escaneia o QR Code ou copia a chave PIX
   - O cliente realiza o pagamento em seu aplicativo bancário

3. **Confirmação do Pagamento**:
   - O Asaas recebe a confirmação do pagamento
   - O Asaas envia um webhook para o sistema
   - O sistema atualiza o status do pagamento
   - O sistema atualiza o status do pedido
   - O sistema envia notificação ao cliente (e-mail/SMS)

4. **Verificação Manual**:
   - O sistema permite verificação manual do status via endpoint de verificação

## Configuração

### 1. Configuração do Asaas

Para utilizar o módulo, é necessário configurar uma conta no Asaas e obter as credenciais de API:

1. Crie uma conta em [https://www.asaas.com/](https://www.asaas.com/)
2. Acesse o painel administrativo
3. Vá para "Configurações" > "API"
4. Gere uma chave de API
5. Anote a chave para configuração no sistema

### 2. Configuração no Sistema

A configuração do provedor de pagamento é armazenada em um arquivo JSON:

```json
{
  "providers": [
    {
      "provider": "asaas",
      "api_key": "SUA_CHAVE_API_AQUI",
      "sandbox": false,
      "default_notification": "email",
      "webhook_token": "TOKEN_SEGURANCA_WEBHOOK",
      "notification_config": {
        "email": {
          "enabled": true,
          "template_id": "template_email_pagamento"
        },
        "sms": {
          "enabled": true,
          "template_id": "template_sms_pagamento"
        }
      }
    }
  ]
}
```

Salve este arquivo em `/home/ubuntu/pos-modern/src/payment/config/payment_providers.json`.

## Uso da API

### 1. Criação de Pagamento PIX

**Requisição:**
```http
POST /api/v1/payments/
Content-Type: application/json
Authorization: Bearer {token}

{
  "order_id": "order_123",
  "method": "pix",
  "amount": 100.0,
  "notification_type": "email",
  "customer_email": "cliente@example.com",
  "customer_name": "Cliente Teste",
  "description": "Pedido #123",
  "external_reference": "123"
}
```

**Resposta:**
```json
{
  "id": "payment_id_123",
  "order_id": "order_123",
  "provider": "asaas",
  "provider_payment_id": "payment_123",
  "method": "pix",
  "amount": 100.0,
  "status": "pending",
  "notification_type": "email",
  "customer_email": "cliente@example.com",
  "customer_name": "Cliente Teste",
  "description": "Pedido #123",
  "external_reference": "123",
  "created_at": "2025-05-24T16:30:00",
  "pix_key": "pix_key_123",
  "pix_qrcode": "qrcode_data",
  "pix_qrcode_image": "qrcode_image_data",
  "pix_expiration_date": "2025-05-25T16:30:00",
  "payment_url": "https://example.com/payment"
}
```

### 2. Verificação de Status de Pagamento

**Requisição:**
```http
GET /api/v1/payments/{payment_id}/check
Authorization: Bearer {token}
```

**Resposta:**
```json
{
  "id": "payment_id_123",
  "order_id": "order_123",
  "provider": "asaas",
  "provider_payment_id": "payment_123",
  "method": "pix",
  "amount": 100.0,
  "status": "confirmed",
  "notification_type": "email",
  "customer_email": "cliente@example.com",
  "customer_name": "Cliente Teste",
  "description": "Pedido #123",
  "external_reference": "123",
  "created_at": "2025-05-24T16:30:00",
  "paid_at": "2025-05-24T16:35:00"
}
```

### 3. Configuração de Webhook no Asaas

Para receber atualizações automáticas de status, configure um webhook no painel do Asaas:

1. Acesse o painel administrativo do Asaas
2. Vá para "Configurações" > "Webhooks"
3. Adicione um novo webhook com a URL:
   ```
   https://seu-dominio.com/api/v1/payments/webhook/asaas
   ```
4. Selecione os eventos:
   - PAYMENT_RECEIVED
   - PAYMENT_CONFIRMED
   - PAYMENT_OVERDUE
   - PAYMENT_REFUNDED
   - PAYMENT_CANCELLED
   - PAYMENT_FAILED

## Integração com Outros Módulos

### 1. Integração com Módulo de Pedidos

O módulo de pagamento atualiza automaticamente o status do pedido quando um pagamento é confirmado:

```python
# Exemplo de código no serviço de pagamento
async def update_payment_status(self, payment_id: str, status: PaymentStatus, payment_date: Optional[datetime] = None) -> Payment:
    # Obter pagamento
    payment = await self.get_payment(payment_id)
    if not payment:
        raise ValueError(f"Pagamento não encontrado: {payment_id}")
    
    # Atualizar status
    payment.status = status
    if status in [PaymentStatus.CONFIRMED, PaymentStatus.RECEIVED]:
        payment.paid_at = payment_date or datetime.now()
    
    # Salvar pagamento
    self._save_payment(payment)
    
    # Atualizar pedido
    from src.order.services.order_service import OrderService
    from src.product.models.product import OrderUpdate, PaymentStatus as OrderPaymentStatus
    
    order_service = OrderService()
    await order_service.update_order(payment.order_id, OrderUpdate(
        payment_status=OrderPaymentStatus.PAID,
        payment_method=payment.method.name
    ))
    
    # Publicar evento
    event_bus = get_event_bus()
    await event_bus.publish(
        EventType.PAYMENT_STATUS_UPDATED,
        {
            "payment_id": payment.id,
            "order_id": payment.order_id,
            "status": payment.status,
            "paid_at": payment.paid_at
        }
    )
    
    return payment
```

### 2. Integração com Módulo de Notificações

O módulo de pagamento utiliza o sistema de eventos para notificar sobre mudanças de status:

```python
# Exemplo de código no serviço de pagamento
async def create_payment(self, payment_data: PaymentCreate) -> Payment:
    # ... código de criação de pagamento ...
    
    # Publicar evento
    event_bus = get_event_bus()
    await event_bus.publish(
        EventType.PAYMENT_CREATED,
        {
            "payment_id": payment.id,
            "order_id": payment.order_id,
            "method": payment.method,
            "amount": payment.amount,
            "status": payment.status,
            "notification_type": payment.notification_type,
            "customer_email": payment.customer_email,
            "customer_name": payment.customer_name
        }
    )
    
    return payment
```

## Extensão para Outros Métodos de Pagamento

O módulo foi projetado para ser facilmente estendido para suportar outros métodos de pagamento:

### 1. Cartão de Crédito

Para adicionar suporte a pagamento com cartão de crédito:

1. Atualize o adaptador Asaas para incluir métodos específicos para cartão
2. Adicione campos para dados de cartão nos modelos
3. Implemente a lógica de tokenização de cartão
4. Adicione endpoints específicos para processamento de cartão

### 2. Integração com WhatsApp

Para integração com bot de WhatsApp para pagamentos com cartão:

1. Implemente um adaptador para a API do WhatsApp
2. Crie endpoints para receber mensagens do WhatsApp
3. Implemente fluxo de pagamento via conversação
4. Integre com o adaptador Asaas para processamento de pagamento

## Considerações de Segurança

1. **Proteção de Dados Sensíveis**:
   - Nunca armazene dados completos de cartão de crédito
   - Utilize tokenização para referência a cartões
   - Criptografe dados sensíveis em trânsito e em repouso

2. **Autenticação e Autorização**:
   - Todos os endpoints requerem autenticação
   - Implemente controle de acesso baseado em funções
   - Utilize HTTPS para todas as comunicações

3. **Validação de Webhooks**:
   - Verifique a autenticidade dos webhooks recebidos
   - Implemente token de segurança para webhooks
   - Valide a origem das requisições

## Solução de Problemas

### 1. Pagamento não confirmado

Se um pagamento PIX não for confirmado automaticamente:

1. Verifique se o webhook está configurado corretamente no Asaas
2. Verifique se o sistema está recebendo as notificações do webhook
3. Utilize o endpoint de verificação manual para atualizar o status
4. Verifique os logs do sistema para erros

### 2. Erro na criação de pagamento

Se ocorrer um erro ao criar um pagamento:

1. Verifique se a chave de API do Asaas está correta
2. Verifique se os dados do cliente estão completos e válidos
3. Verifique a conexão com a API do Asaas
4. Consulte os logs do sistema para detalhes do erro

## Conclusão

O módulo de pagamento online Asaas com integração PIX oferece uma solução completa para processamento de pagamentos no sistema POS Modern. A arquitetura modular permite fácil extensão para outros métodos de pagamento e integração com outros módulos do sistema.

Para suporte adicional ou dúvidas, consulte a documentação oficial do Asaas em [https://docs.asaas.com/](https://docs.asaas.com/).
