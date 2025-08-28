# WebSocket API - Sincronização em Tempo Real

## Visão Geral

A API WebSocket do Chefia POS permite sincronização em tempo real entre múltiplos terminais, oferecendo:
- **Latência baixa**: <10ms para propagação de mudanças
- **Reconexão automática**: Cliente se reconecta automaticamente
- **Fila de mensagens**: Mensagens são enfileiradas durante desconexões
- **Resolução de conflitos**: Sistema automático de resolução
- **Auditoria completa**: Log de todas as operações

## Conexão WebSocket

### Endpoint de Conexão

```
ws://localhost:8001/ws/{terminal_id}?type={terminal_type}&user_id={user_id}
```

**Parâmetros:**
- `terminal_id` (obrigatório): ID único do terminal (ex: "pos-001", "kds-001")
- `terminal_type` (obrigatório): Tipo do terminal ("pos", "kds", "waiter", "monitor")
- `user_id` (opcional): ID do usuário conectado

**Exemplo de Conexão:**
```javascript
const ws = new WebSocket('ws://localhost:8001/ws/pos-001?type=pos&user_id=user123');
```

### Estados de Conexão

| Estado | Descrição |
|--------|-----------|
| `connecting` | Estabelecendo conexão |
| `connected` | Conectado e operacional |
| `disconnected` | Desconectado |
| `error` | Erro na conexão |

## Tipos de Mensagens

### 1. Mensagens de Controle

#### Connection Established
**Direção**: Servidor → Cliente

```json
{
  "type": "connection_established",
  "terminal_id": "pos-001",
  "server_time": "2024-01-15T10:30:00.000Z",
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Ping/Pong (Heartbeat)
**Direção**: Cliente ↔ Servidor

```json
// Cliente envia
{
  "type": "ping",
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// Servidor responde
{
  "type": "pong",
  "server_time": "2024-01-15T10:30:00.000Z"
}
```

### 2. Sincronização de Dados

#### Data Sync (Sincronização de Dados)
**Direção**: Cliente → Servidor → Outros Clientes

```json
{
  "type": "data_sync",
  "operation": {
    "id": "op-123456",
    "entity_type": "orders",
    "entity_id": "order-789",
    "operation": "UPDATE",
    "data": {
      "id": "order-789",
      "status": "preparing",
      "items": [...],
      "version": 2
    },
    "version": 2,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "terminal_id": "pos-001",
    "user_id": "user123",
    "requires_lock": true,
    "priority": "high"
  }
}
```

#### Sync Confirmation
**Direção**: Cliente → Servidor

```json
{
  "type": "sync_confirmation",
  "operation_id": "op-123456",
  "terminal_id": "kds-001",
  "timestamp": "2024-01-15T10:30:01.000Z"
}
```

#### Sync Error
**Direção**: Servidor → Cliente

```json
{
  "type": "sync_error",
  "operation_id": "op-123456",
  "error": "Could not acquire entity lock",
  "entity_type": "orders",
  "entity_id": "order-789",
  "terminal_id": "pos-001"
}
```

### 3. Resolução de Conflitos

#### Sync Conflict
**Direção**: Servidor → Cliente

```json
{
  "type": "sync_conflict",
  "conflict": {
    "id": "conflict-456",
    "type": "version_conflict",
    "entity_type": "orders",
    "entity_id": "order-789",
    "local_data": {
      "status": "paid",
      "version": 3
    },
    "remote_data": {
      "status": "preparing",
      "version": 2
    },
    "local_version": 3,
    "remote_version": 2,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Conflict Resolution
**Direção**: Cliente → Servidor

```json
{
  "type": "conflict_resolution",
  "conflict_id": "conflict-456",
  "resolution": "accept_remote",
  "resolved_data": {
    "status": "preparing",
    "version": 4
  },
  "terminal_id": "pos-001"
}
```

### 4. Status dos Terminais

#### Terminal Status Update
**Direção**: Servidor → Monitores

```json
{
  "type": "terminal_status_update",
  "terminals": {
    "pos-001": {
      "type": "pos",
      "status": "online",
      "connected_at": "2024-01-15T09:00:00.000Z",
      "last_ping": "2024-01-15T10:29:50.000Z",
      "performance": {
        "response_time": 25,
        "error_rate": 0.001,
        "memory_usage": 45.2,
        "cache_hit_rate": 0.95
      }
    },
    "kds-001": {
      "type": "kds",
      "status": "online",
      "connected_at": "2024-01-15T09:15:00.000Z",
      "last_ping": "2024-01-15T10:29:45.000Z"
    }
  },
  "total_online": 2,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 5. Monitoramento e Métricas

#### Performance Metrics
**Direção**: Servidor → Monitores

```json
{
  "type": "performance_metrics",
  "terminal_id": "pos-001",
  "metrics": {
    "websocket_latency": 8,
    "sync_operations_per_second": 12,
    "cache_hit_rate": 0.95,
    "memory_usage_mb": 45.2,
    "active_connections": 3,
    "queue_size": 0,
    "last_sync": "2024-01-15T10:29:58.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Entidades Sincronizáveis

### Orders (Pedidos)
```json
{
  "entity_type": "orders",
  "priority": "high",
  "requires_lock": true,
  "conflict_resolution": "last_write_wins",
  "audit_required": true
}
```

### Products (Produtos)
```json
{
  "entity_type": "products",
  "priority": "medium",
  "requires_lock": false,
  "conflict_resolution": "merge_changes",
  "audit_required": true
}
```

### Customers (Clientes)
```json
{
  "entity_type": "customers",
  "priority": "medium",
  "requires_lock": false,
  "conflict_resolution": "merge_non_conflicting",
  "audit_required": true
}
```

### Cashier Operations (Operações de Caixa)
```json
{
  "entity_type": "cashier_operations",
  "priority": "critical",
  "requires_lock": true,
  "conflict_resolution": "manual_resolution",
  "audit_required": true
}
```

## Operações Suportadas

### CREATE
Criação de nova entidade:
```json
{
  "operation": "CREATE",
  "entity_type": "orders",
  "entity_id": "order-new-123",
  "data": {
    "id": "order-new-123",
    "customer_id": "customer-456",
    "items": [...],
    "total": 25.50,
    "status": "pending",
    "version": 1
  }
}
```

### UPDATE
Atualização de entidade existente:
```json
{
  "operation": "UPDATE",
  "entity_type": "orders",
  "entity_id": "order-789",
  "data": {
    "status": "preparing",
    "version": 3
  }
}
```

### DELETE
Remoção de entidade:
```json
{
  "operation": "DELETE",
  "entity_type": "orders",
  "entity_id": "order-789",
  "data": {
    "deleted_at": "2024-01-15T10:30:00.000Z",
    "version": 4
  }
}
```

### BULK_UPDATE
Atualização em lote:
```json
{
  "operation": "BULK_UPDATE",
  "entity_type": "products",
  "data": {
    "updates": [
      {
        "entity_id": "product-1",
        "data": {"stock": 10, "version": 2}
      },
      {
        "entity_id": "product-2",
        "data": {"stock": 5, "version": 3}
      }
    ]
  }
}
```

## Estratégias de Resolução de Conflitos

### Last Write Wins
Para operações em entidades críticas como pedidos:
```json
{
  "conflict_resolution": "last_write_wins",
  "description": "A operação com timestamp mais recente prevalece"
}
```

### Merge Changes
Para entidades que permitem mesclagem:
```json
{
  "conflict_resolution": "merge_changes",
  "description": "Campos não conflitantes são mesclados automaticamente"
}
```

### Merge Non-Conflicting
Para dados de clientes e produtos:
```json
{
  "conflict_resolution": "merge_non_conflicting",
  "description": "Apenas campos que não conflitam são mesclados"
}
```

### Manual Resolution
Para operações financeiras críticas:
```json
{
  "conflict_resolution": "manual_resolution",
  "description": "Conflito é marcado para resolução manual"
}
```

## Sistema de Bloqueio Otimista

### Acquire Lock
```json
{
  "type": "acquire_lock",
  "entity_type": "orders",
  "entity_id": "order-789",
  "terminal_id": "pos-001",
  "timeout": 30000,
  "lock_id": "lock-123456"
}
```

### Lock Acquired
```json
{
  "type": "lock_acquired",
  "lock_id": "lock-123456",
  "entity_type": "orders",
  "entity_id": "order-789",
  "expires_at": "2024-01-15T10:30:30.000Z"
}
```

### Lock Failed
```json
{
  "type": "lock_failed",
  "entity_type": "orders",
  "entity_id": "order-789",
  "reason": "Already locked by pos-002",
  "locked_by": "pos-002",
  "locked_until": "2024-01-15T10:30:15.000Z"
}
```

### Release Lock
```json
{
  "type": "release_lock",
  "lock_id": "lock-123456",
  "terminal_id": "pos-001"
}
```

## Auditoria e Logging

### Audit Log Entry
```json
{
  "type": "audit_log",
  "entry": {
    "id": "audit-789123",
    "operation_id": "op-123456",
    "entity_type": "orders",
    "entity_id": "order-789",
    "operation": "UPDATE",
    "terminal_id": "pos-001",
    "user_id": "user123",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "changes": {
      "before": {"status": "pending"},
      "after": {"status": "preparing"}
    },
    "sync_status": "completed",
    "conflict_resolved": false
  }
}
```

## Códigos de Erro

### WebSocket Error Codes

| Código | Descrição |
|--------|-----------|
| 4001 | Invalid terminal ID |
| 4002 | Invalid terminal type |
| 4003 | Authentication failed |
| 4004 | Terminal already connected |
| 4005 | Rate limit exceeded |
| 4006 | Invalid message format |
| 4007 | Entity not found |
| 4008 | Permission denied |
| 4009 | Lock timeout |
| 4010 | Conflict resolution failed |

### Tratamento de Erros

```javascript
ws.onclose = (event) => {
  switch (event.code) {
    case 4001:
      console.error('Invalid terminal ID');
      // Não tentar reconectar
      break;
    case 4003:
      console.error('Authentication failed');
      // Solicitar nova autenticação
      break;
    case 1006:
      console.log('Connection lost, attempting to reconnect...');
      // Reconectar automaticamente
      break;
  }
};
```

## Exemplos de Implementação

### Cliente JavaScript Completo

```javascript
class RealtimeWebSocketClient {
  constructor(terminalId, terminalType, userId) {
    this.terminalId = terminalId;
    this.terminalType = terminalType;
    this.userId = userId;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.messageQueue = [];
    this.heartbeatInterval = null;
    
    this.connect();
  }

  connect() {
    const url = `ws://localhost:8001/ws/${this.terminalId}?type=${this.terminalType}&user_id=${this.userId}`;
    this.ws = new WebSocket(url);
    
    this.ws.onopen = this.handleOpen.bind(this);
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
    this.ws.onerror = this.handleError.bind(this);
  }

  handleOpen() {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    this.flushMessageQueue();
  }

  handleMessage(event) {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
      case 'connection_established':
        this.handleConnectionEstablished(message);
        break;
      case 'data_sync':
        this.handleDataSync(message);
        break;
      case 'sync_conflict':
        this.handleSyncConflict(message);
        break;
      case 'terminal_status_update':
        this.handleTerminalStatusUpdate(message);
        break;
      case 'pong':
        // Heartbeat response
        break;
    }
  }

  handleDataSync(message) {
    const { operation } = message;
    
    // Aplica mudanças localmente
    this.applyRemoteUpdate(operation);
    
    // Confirma recebimento
    this.send({
      type: 'sync_confirmation',
      operation_id: operation.id,
      terminal_id: this.terminalId
    });
  }

  syncData(entityType, entityId, operation, data, options = {}) {
    const message = {
      type: 'data_sync',
      operation: {
        id: this.generateOperationId(),
        entity_type: entityType,
        entity_id: entityId,
        operation: operation,
        data: data,
        version: data.version || 1,
        timestamp: new Date().toISOString(),
        terminal_id: this.terminalId,
        user_id: this.userId,
        requires_lock: options.requiresLock || false,
        priority: options.priority || 'medium'
      }
    };
    
    this.send(message);
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Enfileira mensagem para envio posterior
      this.messageQueue.push(message);
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.send({
        type: 'ping',
        timestamp: new Date().toISOString()
      });
    }, 30000); // 30 segundos
  }

  handleClose(event) {
    console.log('WebSocket closed:', event.code, event.reason);
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Reconecta automaticamente (exceto alguns códigos de erro)
    if (![4001, 4002, 4003].includes(event.code)) {
      this.attemptReconnect();
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }
}

// Uso
const client = new RealtimeWebSocketClient('pos-001', 'pos', 'user123');

// Sincronizar atualização de pedido
client.syncData('orders', 'order-789', 'UPDATE', {
  id: 'order-789',
  status: 'preparing',
  version: 2
}, {
  requiresLock: true,
  priority: 'high'
});
```

## Performance e Otimizações

### Métricas Esperadas
- **Latência WebSocket**: <10ms
- **Propagação de Sync**: <50ms
- **Reconexão**: <2s
- **Throughput**: 1000 ops/sec por terminal

### Otimizações Implementadas
- **Message Batching**: Agrupa mensagens quando possível
- **Compression**: Comprime mensagens grandes automaticamente
- **Connection Pooling**: Reutiliza conexões quando possível
- **Smart Reconnection**: Backoff exponencial com jitter

## Monitoramento

### Métricas Coletadas
- Número de conexões ativas
- Latência de mensagens
- Taxa de erro de sincronização
- Conflitos resolvidos
- Performance por terminal

### Endpoints de Monitoramento

```http
GET /api/v1/websocket/stats
```

```json
{
  "total_connections": 15,
  "connections_by_type": {
    "pos": 8,
    "kds": 4,
    "waiter": 2,
    "monitor": 1
  },
  "message_throughput": 1250,
  "average_latency": 8.5,
  "conflict_rate": 0.002,
  "uptime_seconds": 3600
}
```

Este documento fornece a especificação completa da API WebSocket para sincronização em tempo real do sistema Chefia POS.