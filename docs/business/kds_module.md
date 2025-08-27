# Módulo KDS (Kitchen Display System)

## Visão Geral

O módulo KDS (Kitchen Display System) é responsável por gerenciar a visualização e o controle dos pedidos na cozinha. Ele permite que a equipe da cozinha visualize os pedidos recebidos, atualize o status de preparação e organize o fluxo de trabalho de forma eficiente.

## Funcionalidades Principais

- Visualização de pedidos em tempo real
- Atualização de status de pedidos e itens individuais
- Priorização automática e manual de pedidos
- Temporizadores para controle de tempo de preparo
- Alertas visuais e sonoros para pedidos atrasados
- Estatísticas de desempenho da cozinha
- Suporte para múltiplas estações de trabalho

## Arquitetura

O módulo KDS segue a arquitetura modular do sistema POS, com os seguintes componentes:

### Modelos de Dados

- `KDSOrder`: Representa um pedido no sistema KDS
- `KDSOrderItem`: Representa um item de pedido no KDS
- `KDSOrderStatus`: Enumeração dos possíveis status de um pedido (PENDING, PREPARING, READY, DELIVERED, CANCELLED)
- `KDSOrderPriority`: Enumeração das prioridades de pedidos (LOW, NORMAL, HIGH, URGENT)
- `KDSSession`: Representa uma sessão do KDS (uma instância em execução)
- `KDSStats`: Estatísticas de desempenho do KDS

### Serviços

- `KDSService`: Serviço principal que gerencia todas as operações do KDS
  - Processamento de novos pedidos
  - Atualização de status
  - Gerenciamento de sessões
  - Cálculo de estatísticas

### Eventos

O KDS utiliza o barramento de eventos para comunicação assíncrona com outros módulos:

#### Eventos Consumidos
- `order.created`: Quando um novo pedido é criado
- `order.updated`: Quando um pedido é atualizado
- `order.cancelled`: Quando um pedido é cancelado
- `order.status_changed`: Quando o status de um pedido muda

#### Eventos Publicados
- `kds.order_received`: Quando um pedido é recebido pelo KDS
- `kds.order_status_changed`: Quando o status de um pedido é alterado no KDS
- `kds.item_status_changed`: Quando o status de um item é alterado no KDS
- `kds.session_created`: Quando uma nova sessão do KDS é criada
- `kds.session_updated`: Quando uma sessão do KDS é atualizada
- `kds.stats_updated`: Quando as estatísticas do KDS são atualizadas

### API REST

O módulo KDS expõe os seguintes endpoints:

#### Pedidos

- `GET /api/v1/kds/orders`: Lista todos os pedidos no KDS
- `GET /api/v1/kds/orders/{order_id}`: Obtém detalhes de um pedido específico
- `PUT /api/v1/kds/orders/{order_id}`: Atualiza o status de um pedido
- `PUT /api/v1/kds/orders/{order_id}/items/{item_id}`: Atualiza o status de um item específico

#### Sessões

- `POST /api/v1/kds/sessions`: Cria uma nova sessão do KDS
- `GET /api/v1/kds/sessions`: Lista todas as sessões do KDS
- `GET /api/v1/kds/sessions/{session_id}`: Obtém detalhes de uma sessão específica
- `PUT /api/v1/kds/sessions/{session_id}`: Atualiza uma sessão do KDS

#### Estatísticas

- `GET /api/v1/kds/stats`: Obtém estatísticas de desempenho do KDS

## Interface de Usuário

A interface do KDS é projetada para ser clara, intuitiva e otimizada para telas de toque. Ela inclui:

- Visualização de pedidos em cards organizados por status e prioridade
- Código de cores para indicar status e prioridade
- Temporizadores visuais para cada pedido
- Botões grandes para atualização rápida de status
- Modo de visualização por estação de trabalho
- Suporte para múltiplas sessões via parâmetro de URL (`/kds?kds=1`)

## Fluxo de Trabalho

1. **Recebimento de Pedido**:
   - Um pedido é criado no módulo de Ordens
   - O evento `order.created` é publicado no barramento de eventos
   - O KDS recebe o evento e processa o pedido
   - O pedido aparece na interface do KDS com status "Pendente"

2. **Preparação**:
   - O cozinheiro inicia a preparação e atualiza o status para "Preparando"
   - O KDS registra o horário de início e calcula o tempo estimado de conclusão
   - O evento `kds.order_status_changed` é publicado

3. **Conclusão**:
   - Quando o pedido está pronto, o cozinheiro atualiza o status para "Pronto"
   - O KDS registra o horário de conclusão e calcula o tempo total de preparo
   - O evento `kds.order_status_changed` é publicado
   - O pedido é movido para a área de "Prontos" na interface

4. **Entrega**:
   - Quando o pedido é entregue, seu status é atualizado para "Entregue"
   - O pedido é removido da visualização principal após um tempo configurável

## Integração com Outros Módulos

- **Módulo de Ordens**: Recebe novos pedidos e atualizações de status
- **Módulo de Frente de Caixa (POS)**: Recebe atualizações de status dos pedidos
- **Módulo de Garçom**: Recebe notificações quando pedidos estão prontos

## Operação Offline

O KDS suporta operação offline completa:

- Armazenamento local de pedidos e status
- Sincronização automática quando a conexão é restabelecida
- Persistência de sessões e configurações

## Exemplos de Uso

### Listar Pedidos Pendentes

```javascript
// Frontend (React)
const fetchPendingOrders = async () => {
  const response = await fetch('/api/v1/kds/orders?status=pending');
  const orders = await response.json();
  setOrders(orders);
};
```

### Atualizar Status de um Pedido

```javascript
// Frontend (React)
const updateOrderStatus = async (orderId, newStatus) => {
  const response = await fetch(`/api/v1/kds/orders/${orderId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: newStatus }),
  });
  
  if (response.ok) {
    // Atualizar UI
    const updatedOrder = await response.json();
    updateOrderInState(updatedOrder);
  }
};
```

### Consumir Eventos do KDS

```python
# Backend (Python)
class KDSStatusChangeHandler(EventHandler):
    async def handle(self, event: Event) -> None:
        if event.type == KDSEventType.KDS_ORDER_STATUS_CHANGED:
            order_id = event.data["order_id"]
            new_status = event.data["status"]
            
            # Atualizar o status do pedido no módulo de Ordens
            order_service = get_order_service()
            await order_service.update_order_status(order_id, new_status)
```

## Considerações de Desempenho

- O KDS é otimizado para operação em dispositivos com recursos limitados
- A interface utiliza virtualização para lidar com grandes volumes de pedidos
- Os temporizadores são implementados de forma eficiente para minimizar o uso de CPU
- As atualizações de UI são otimizadas para reduzir o consumo de bateria em dispositivos móveis

## Próximos Passos

- Implementação de filtros avançados por categoria de produto
- Suporte para visualização de imagens dos produtos
- Integração com sistema de notificações para alertas em dispositivos móveis
- Análise avançada de tempos de preparo para otimização de processos
