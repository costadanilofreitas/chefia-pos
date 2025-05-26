# Módulo de Pedido para Garçom

## Visão Geral

O módulo de Pedido para Garçom é responsável por gerenciar o processo de criação e acompanhamento de pedidos pelos garçons em tablets e smartphones. Ele permite que os garçons registrem pedidos, atualizem itens, enviem para a cozinha e acompanhem o status de preparação, tudo isso com suporte a operação offline.

## Funcionalidades Principais

- Visualização de mesas e seus status (disponível, ocupada, reservada, limpeza)
- Criação e edição de pedidos
- Adição, modificação e remoção de itens
- Customização de produtos (adições, remoções, substituições)
- Envio de pedidos para a cozinha
- Acompanhamento de status de preparação
- Cancelamento de pedidos
- Operação offline com sincronização automática
- Gerenciamento de sessões de garçom

## Arquitetura

O módulo de Pedido para Garçom segue a arquitetura modular do sistema POS, com os seguintes componentes:

### Modelos de Dados

- `WaiterOrder`: Representa um pedido no sistema de garçom
- `WaiterOrderItem`: Representa um item de pedido
- `WaiterOrderStatus`: Enumeração dos possíveis status de um pedido (DRAFT, SENT, PREPARING, READY, DELIVERED, CANCELLED)
- `WaiterOrderType`: Enumeração dos tipos de pedido (DINE_IN, TAKEOUT, DELIVERY)
- `WaiterSession`: Representa uma sessão do garçom (uma instância em execução)
- `WaiterTable`: Representa uma mesa no restaurante
- `WaiterStats`: Estatísticas de desempenho do módulo de garçom

### Serviços

- `WaiterService`: Serviço principal que gerencia todas as operações do módulo de garçom
  - Gerenciamento de pedidos
  - Gerenciamento de mesas
  - Gerenciamento de sessões
  - Sincronização de dados offline
  - Cálculo de estatísticas

### Eventos

O módulo de Pedido para Garçom utiliza o barramento de eventos para comunicação assíncrona com outros módulos:

#### Eventos Consumidos
- `kds.order_status_changed`: Quando o status de um pedido é alterado no KDS
- `order.updated`: Quando um pedido é atualizado no módulo de Ordens

#### Eventos Publicados
- `waiter.order_created`: Quando um novo pedido é criado
- `waiter.order_updated`: Quando um pedido é atualizado
- `waiter.order_sent`: Quando um pedido é enviado para a cozinha
- `waiter.order_cancelled`: Quando um pedido é cancelado
- `waiter.session_created`: Quando uma nova sessão do garçom é criada
- `waiter.session_updated`: Quando uma sessão do garçom é atualizada
- `waiter.table_updated`: Quando o status de uma mesa é atualizado
- `waiter.sync_requested`: Quando uma sincronização é solicitada
- `waiter.sync_completed`: Quando uma sincronização é concluída

### API REST

O módulo de Pedido para Garçom expõe os seguintes endpoints:

#### Pedidos

- `POST /api/v1/waiter/orders`: Cria um novo pedido
- `GET /api/v1/waiter/orders`: Lista pedidos com filtros opcionais
- `GET /api/v1/waiter/orders/{order_id}`: Obtém detalhes de um pedido específico
- `PUT /api/v1/waiter/orders/{order_id}`: Atualiza um pedido existente
- `POST /api/v1/waiter/orders/{order_id}/send`: Envia um pedido para a cozinha
- `POST /api/v1/waiter/orders/{order_id}/cancel`: Cancela um pedido
- `POST /api/v1/waiter/orders/{order_id}/items`: Adiciona um item a um pedido
- `PUT /api/v1/waiter/orders/{order_id}/items/{item_id}`: Atualiza um item de pedido
- `DELETE /api/v1/waiter/orders/{order_id}/items/{item_id}`: Remove um item de pedido

#### Sessões

- `POST /api/v1/waiter/sessions`: Cria uma nova sessão do garçom
- `GET /api/v1/waiter/sessions`: Lista todas as sessões do garçom
- `GET /api/v1/waiter/sessions/{session_id}`: Obtém detalhes de uma sessão específica
- `PUT /api/v1/waiter/sessions/{session_id}`: Atualiza uma sessão do garçom

#### Mesas

- `POST /api/v1/waiter/tables`: Cria uma nova mesa
- `GET /api/v1/waiter/tables`: Lista todas as mesas
- `GET /api/v1/waiter/tables/{table_id}`: Obtém detalhes de uma mesa específica
- `PUT /api/v1/waiter/tables/{table_id}`: Atualiza uma mesa existente

#### Estatísticas e Sincronização

- `GET /api/v1/waiter/stats`: Obtém estatísticas de desempenho do módulo de garçom
- `POST /api/v1/waiter/sync/{device_id}`: Sincroniza dados de um dispositivo

## Interface de Usuário

A interface do módulo de Pedido para Garçom é projetada para ser intuitiva, responsiva e otimizada para dispositivos móveis. Ela inclui:

- Visualização de mesas em grid com código de cores para status
- Formulário de pedido com adição rápida de itens
- Customização de produtos com opções de adição, remoção e substituição
- Botões grandes para facilitar o uso em telas de toque
- Indicadores de status de conexão e sincronização
- Suporte para múltiplas sessões via parâmetro de URL (`/waiter?waiter=1`)

## Fluxo de Trabalho

1. **Seleção de Mesa**:
   - O garçom visualiza o grid de mesas com seus respectivos status
   - Seleciona uma mesa disponível ou ocupada para criar ou editar um pedido

2. **Criação de Pedido**:
   - Para uma mesa disponível, o garçom cria um novo pedido
   - Adiciona itens ao pedido, com possíveis customizações
   - O pedido é salvo com status "Rascunho"
   - A mesa é atualizada para status "Ocupada"

3. **Envio para Cozinha**:
   - Quando o pedido está completo, o garçom o envia para a cozinha
   - O status do pedido é alterado para "Enviado"
   - Um evento é publicado para notificar o KDS

4. **Acompanhamento**:
   - O garçom pode verificar o status de preparação dos pedidos
   - Recebe atualizações quando o status muda no KDS (Preparando, Pronto)
   - Pode adicionar itens a pedidos existentes e enviá-los separadamente

5. **Finalização**:
   - Quando o pedido é entregue, seu status é atualizado para "Entregue"
   - Ao finalizar o atendimento, a mesa pode ser liberada para limpeza

## Operação Offline

O módulo de Pedido para Garçom suporta operação offline completa:

- Armazenamento local de pedidos, mesas e configurações
- Criação e edição de pedidos sem conexão
- Fila de ações pendentes para sincronização
- Sincronização automática quando a conexão é restabelecida
- Indicadores visuais de status de conexão e ações pendentes

## Integração com Outros Módulos

- **Módulo de KDS**: Recebe pedidos enviados e atualiza status de preparação
- **Módulo de Produtos**: Fornece informações de produtos, preços e disponibilidade
- **Módulo de Frente de Caixa (POS)**: Recebe informações de pedidos para pagamento
- **Módulo de Autenticação**: Controle de acesso e permissões de garçons

## Exemplos de Uso

### Criar um Novo Pedido

```javascript
// Frontend (React)
const createOrder = async (tableNumber) => {
  const orderData = {
    waiter_id: session.waiter_id,
    waiter_name: session.waiter_name,
    table_number: tableNumber,
    customer_count: 2,
    order_type: 'dine_in',
    items: [
      {
        product_id: 'prod-123',
        quantity: 1,
        customizations: [
          {
            type: 'add',
            ingredient_id: 'ing-456',
            ingredient_name: 'Queijo Extra',
            price_adjustment: 2.50
          }
        ]
      }
    ]
  };
  
  const response = await fetch('/api/v1/waiter/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });
  
  if (response.ok) {
    const newOrder = await response.json();
    // Atualizar UI
  }
};
```

### Enviar Pedido para a Cozinha

```javascript
// Frontend (React)
const sendOrderToKitchen = async (orderId) => {
  const response = await fetch(`/api/v1/waiter/orders/${orderId}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  
  if (response.ok) {
    const updatedOrder = await response.json();
    // Atualizar UI
  }
};
```

### Consumir Eventos do KDS

```python
# Backend (Python)
class KDSEventHandler(EventHandler):
    async def handle(self, event: Event) -> None:
        if event.type == "kds.order_status_changed":
            order_id = event.data["order_id"]
            new_status = event.data["status"]
            
            # Mapear status do KDS para status do garçom
            waiter_status = None
            if new_status == "preparing":
                waiter_status = WaiterOrderStatus.PREPARING
            elif new_status == "ready":
                waiter_status = WaiterOrderStatus.READY
            
            if waiter_status:
                waiter_service = get_waiter_service()
                await waiter_service.update_order_status_from_event(
                    order_id, 
                    waiter_status
                )
```

## Considerações de Desempenho

- A interface é otimizada para dispositivos com recursos limitados
- O armazenamento local utiliza IndexedDB para persistência eficiente
- A sincronização é feita em segundo plano para não bloquear a interface
- As atualizações de UI são otimizadas para reduzir o consumo de bateria
- O tráfego de rede é minimizado, enviando apenas dados alterados durante a sincronização

## Próximos Passos

- Implementação de filtros avançados para produtos
- Suporte para divisão de contas
- Integração com sistema de fidelidade
- Sugestões automáticas baseadas em histórico de pedidos
- Notificações push para alertar garçons sobre pedidos prontos
