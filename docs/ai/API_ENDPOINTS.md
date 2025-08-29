# API Endpoints - Chefia POS

## Visão Geral

Este documento detalha todos os endpoints da API do Chefia POS, incluindo os novos módulos de gestão de mesas implementados em 2024.

**Base URL**: `http://localhost:8001/api/v1`

**Autenticação**: Bearer Token (JWT)

## Índice

1. [Autenticação](#1-autenticação)
2. [Gestão Operacional](#2-gestão-operacional)
3. [Produtos e Cardápio](#3-produtos-e-cardápio)
4. [Pedidos](#4-pedidos)
5. [Pagamentos](#5-pagamentos)
6. [**🆕 Queue Management**](#6-queue-management)
7. [**🆕 Reservation System**](#7-reservation-system)
8. [**🆕 Command Cards**](#8-command-cards)
9. [**🆕 Self-Service**](#9-self-service)
10. [**🆕 Table Management**](#10-table-management)
11. [KDS](#11-kds)
12. [**🆕 Centralized Logging**](#12-centralized-logging)
13. [Relatórios](#13-relatórios)
14. [WebSocket Events](#14-websocket-events)

---

## 1. Autenticação

### POST /auth/login
Autenticação de usuário

**Request:**
```json
{
  "username": "admin",
  "password": "123456"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "1",
    "name": "Administrador",
    "role": "ADMIN",
    "permissions": ["DAY_OPEN", "DAY_CLOSE", "ORDER_CREATE"]
  }
}
```

### POST /auth/refresh
Renovar token de acesso

**Headers:** `Authorization: Bearer {refresh_token}`

### POST /auth/logout
Logout do usuário

---

## 2. Gestão Operacional

### Business Day

#### POST /business-day/open
Abrir dia operacional

**Request:**
```json
{
  "date": "2024-08-28",
  "initial_cash": 100.00,
  "notes": "Abertura normal"
}
```

#### GET /business-day/current
Obter dia operacional atual

#### POST /business-day/close
Fechar dia operacional

### Cashier

#### POST /cashier/open
Abrir caixa

**Request:**
```json
{
  "terminal_id": "POS-001",
  "initial_amount": 50.00
}
```

#### GET /cashier/current
Status do caixa atual

#### POST /cashier/close
Fechar caixa

---

## 3. Produtos e Cardápio

### Produtos

#### GET /products
Listar produtos

**Query Parameters:**
- `category_id`: Filtrar por categoria
- `active`: true/false
- `limit`: Número de itens
- `offset`: Paginação

#### GET /products/{id}
Obter produto específico

#### POST /products
Criar produto

**Request:**
```json
{
  "name": "Hambúrguer Especial",
  "description": "Hambúrguer com fritas",
  "price": 25.90,
  "category_id": "1",
  "image_url": "https://...",
  "active": true,
  "ingredients": ["carne", "pão", "alface"]
}
```

#### PUT /products/{id}
Atualizar produto

#### DELETE /products/{id}
Desativar produto

### Categorias

#### GET /categories
Listar categorias

#### POST /categories
Criar categoria

---

## 4. Pedidos

#### POST /orders
Criar pedido

**Request:**
```json
{
  "table_id": "5",
  "customer_name": "João Silva",
  "items": [
    {
      "product_id": "1",
      "quantity": 2,
      "unit_price": 25.90,
      "modifications": ["sem cebola"],
      "notes": "Bem passado"
    }
  ],
  "notes": "Cliente preferencial"
}
```

#### GET /orders
Listar pedidos

**Query Parameters:**
- `status`: pending, preparing, ready, delivered
- `table_id`: Filtrar por mesa
- `date_from`: Data inicial
- `date_to`: Data final

#### GET /orders/{id}
Obter pedido específico

#### PUT /orders/{id}/status
Atualizar status do pedido

**Request:**
```json
{
  "status": "preparing",
  "notes": "Iniciado na cozinha"
}
```

#### DELETE /orders/{id}
Cancelar pedido

---

## 5. Pagamentos

#### POST /payments
Processar pagamento

**Request:**
```json
{
  "order_id": "123",
  "amount": 51.80,
  "method": "credit_card",
  "installments": 1,
  "card_data": {
    "token": "card_token_from_gateway"
  }
}
```

#### GET /payments/{id}
Status do pagamento

#### POST /payments/{id}/refund
Estornar pagamento

---

## 6. Queue Management

### 🆕 Gestão de Fila de Espera

#### POST /queue
Adicionar cliente à fila

**Request:**
```json
{
  "customer_name": "Maria Santos",
  "customer_phone": "+5511999999999",
  "party_size": 4,
  "preferences": ["janela", "canto"],
  "notes": "Aniversário",
  "notification_method": "whatsapp"
}
```

**Response:**
```json
{
  "id": "WQ1693305842",
  "customer_name": "Maria Santos",
  "party_size": 4,
  "position_in_queue": 3,
  "estimated_wait_minutes": 25,
  "check_in_time": "2024-08-28T14:30:42Z",
  "status": "waiting",
  "qr_code_url": "/queue/WQ1693305842/qr"
}
```

#### GET /queue
Listar fila atual

**Response:**
```json
{
  "queue": [
    {
      "id": "WQ1693305842",
      "customer_name": "Maria Santos",
      "party_size": 4,
      "position_in_queue": 1,
      "estimated_wait_minutes": 15,
      "status": "waiting",
      "waiting_time_elapsed": 10
    }
  ],
  "stats": {
    "total_waiting": 8,
    "average_wait_time": 22,
    "last_update": "2024-08-28T14:35:00Z"
  }
}
```

#### POST /queue/{entry_id}/notify
Notificar cliente que mesa está pronta

**Request:**
```json
{
  "table_id": "5",
  "message": "Sua mesa está pronta! Mesa 5."
}
```

#### POST /queue/{entry_id}/seat
Marcar cliente como acomodado

**Request:**
```json
{
  "table_id": "5",
  "seated_time": "2024-08-28T14:45:00Z"
}
```

#### POST /queue/{entry_id}/no-show
Marcar cliente como no-show

#### DELETE /queue/{entry_id}
Remover cliente da fila (cancelamento)

#### GET /queue/{entry_id}/position
Consultar posição na fila (endpoint público)

**Response:**
```json
{
  "position": 2,
  "estimated_wait_minutes": 18,
  "ahead_of_you": 1,
  "status": "waiting"
}
```

#### GET /queue/stats
Estatísticas da fila

**Response:**
```json
{
  "current_stats": {
    "total_in_queue": 5,
    "average_wait_time": 20,
    "longest_wait": 45
  },
  "daily_stats": {
    "total_customers": 156,
    "average_wait_time": 18,
    "peak_queue_size": 12,
    "no_show_rate": 0.08
  }
}
```

---

## 7. Reservation System

### 🆕 Sistema de Reservas

#### POST /reservations
Criar reserva

**Request:**
```json
{
  "customer_name": "Carlos Silva",
  "customer_phone": "+5511888888888",
  "customer_email": "carlos@email.com",
  "party_size": 6,
  "reservation_datetime": "2024-08-30T19:30:00Z",
  "special_requests": "Mesa perto da janela",
  "preferences": ["janela", "quieto"],
  "deposit_required": true
}
```

**Response:**
```json
{
  "id": "RES20240830001",
  "customer_name": "Carlos Silva",
  "party_size": 6,
  "reservation_datetime": "2024-08-30T19:30:00Z",
  "table_id": "12",
  "status": "confirmed",
  "deposit_required": true,
  "deposit_amount": 60.00,
  "confirmation_code": "CONF789123",
  "deposit_link": "https://pay.chefia.com/deposit/RES20240830001"
}
```

#### GET /reservations
Listar reservas

**Query Parameters:**
- `date`: Data específica (YYYY-MM-DD)
- `status`: pending, confirmed, cancelled, completed, no_show
- `customer_phone`: Buscar por telefone
- `table_id`: Reservas de uma mesa específica

#### GET /reservations/{id}
Obter reserva específica

#### PUT /reservations/{id}
Atualizar reserva

**Request:**
```json
{
  "reservation_datetime": "2024-08-30T20:00:00Z",
  "party_size": 8,
  "special_requests": "Aniversário - bolo próprio"
}
```

#### POST /reservations/{id}/confirm
Confirmar reserva

#### POST /reservations/{id}/cancel
Cancelar reserva

**Request:**
```json
{
  "reason": "Cliente cancelou",
  "refund_deposit": true
}
```

#### POST /reservations/{id}/check-in
Fazer check-in da reserva (cliente chegou)

#### POST /reservations/{id}/no-show
Marcar como no-show

#### GET /reservations/{id}/deposit
Status do depósito

#### POST /reservations/{id}/deposit/pay
Processar pagamento do depósito

#### GET /reservations/availability
Verificar disponibilidade

**Query Parameters:**
- `date`: Data desejada
- `party_size`: Tamanho do grupo
- `duration_minutes`: Duração estimada (padrão 120)

**Response:**
```json
{
  "date": "2024-08-30",
  "available_slots": [
    {
      "time": "18:00",
      "available_tables": 3,
      "table_ids": ["5", "8", "12"]
    },
    {
      "time": "19:30",
      "available_tables": 2,
      "table_ids": ["8", "15"]
    }
  ],
  "fully_booked_slots": ["20:00", "20:30", "21:00"]
}
```

### Reservas Recorrentes

#### POST /reservations/recurring
Criar reserva recorrente

**Request:**
```json
{
  "customer_name": "Empresa ABC",
  "customer_phone": "+5511777777777",
  "party_size": 4,
  "start_date": "2024-09-01",
  "end_date": "2024-12-31",
  "recurring_type": "weekly",
  "day_of_week": "friday",
  "time": "12:30",
  "special_requests": "Mesa de reunião"
}
```

#### GET /reservations/recurring/{id}
Obter série de reserva recorrente

#### PUT /reservations/recurring/{id}
Atualizar série recorrente

#### DELETE /reservations/recurring/{id}
Cancelar série recorrente

---

## 8. Command Cards

### 🆕 Sistema de Comandas

#### POST /commands
Criar comanda

**Request:**
```json
{
  "type": "qrcode",
  "table_id": "8",
  "customer_name": "Pedro Lima",
  "credit_limit": 200.00
}
```

**Response:**
```json
{
  "id": "CMD1693305842",
  "code": "CMD1693305842QR789",
  "type": "qrcode",
  "table_id": "8",
  "status": "open",
  "credit_limit": 200.00,
  "total": 0.00,
  "qr_code_url": "/commands/CMD1693305842/qr",
  "print_url": "/commands/CMD1693305842/print"
}
```

#### GET /commands
Listar comandas

**Query Parameters:**
- `status`: open, closed, paid, cancelled
- `table_id`: Comandas de uma mesa
- `date`: Data específica

#### GET /commands/{code}
Buscar comanda por código (escaneamento)

**Response:**
```json
{
  "id": "CMD1693305842",
  "code": "CMD1693305842QR789",
  "customer_name": "Pedro Lima",
  "table_id": "8",
  "status": "open",
  "items": [
    {
      "id": "item1",
      "product_name": "Cerveja",
      "quantity": 2,
      "unit_price": 8.00,
      "total_price": 16.00,
      "added_at": "2024-08-28T15:00:00Z"
    }
  ],
  "subtotal": 16.00,
  "service_charge": 1.60,
  "total": 17.60,
  "credit_available": 182.40
}
```

#### POST /commands/{code}/items
Adicionar itens à comanda

**Request:**
```json
{
  "items": [
    {
      "product_id": "5",
      "quantity": 2,
      "unit_price": 12.50,
      "notes": "Sem gelo"
    },
    {
      "product_id": "8", 
      "quantity": 1,
      "unit_price": 25.00
    }
  ]
}
```

#### DELETE /commands/{code}/items/{item_id}
Remover item da comanda (requer permissão especial)

#### POST /commands/{code}/transfer
Transferir comanda para outra mesa

**Request:**
```json
{
  "new_table_id": "12",
  "reason": "Cliente mudou de mesa"
}
```

#### POST /commands/{code}/close
Fechar comanda para pagamento

**Response:**
```json
{
  "command_id": "CMD1693305842",
  "total": 67.60,
  "items_count": 5,
  "payment_data": {
    "subtotal": 61.45,
    "service_charge": 6.15,
    "total": 67.60
  },
  "closed_at": "2024-08-28T16:30:00Z"
}
```

#### POST /commands/{code}/pay
Processar pagamento da comanda

**Request:**
```json
{
  "payment_method": "credit_card",
  "amount": 67.60,
  "split_type": "equal",
  "participants": 2
}
```

#### GET /commands/{id}/print
Gerar impressão da comanda (PDF)

#### GET /commands/{id}/qr
Gerar QR code da comanda (PNG)

#### POST /commands/{code}/suspend
Suspender comanda temporariamente

#### POST /commands/{code}/reactivate
Reativar comanda suspensa

### Comandas - Relatórios

#### GET /commands/stats
Estatísticas de comandas

**Response:**
```json
{
  "daily": {
    "total_commands": 45,
    "average_ticket": 32.50,
    "total_revenue": 1462.50
  },
  "by_table": [
    {
      "table_id": "5",
      "commands_count": 8,
      "total_revenue": 245.80
    }
  ],
  "by_hour": [
    {
      "hour": "12:00",
      "commands_count": 12,
      "revenue": 350.25
    }
  ]
}
```

---

## 9. Self-Service

### 🆕 Sistema Self-Service

#### GET /selfservice/scales
Listar balanças configuradas

**Response:**
```json
{
  "scales": [
    {
      "id": "scale_01",
      "name": "Balança Principal",
      "location": "Buffet",
      "price_per_kg": 69.90,
      "tare_weight": 150,
      "active": true,
      "last_calibration": "2024-08-25"
    }
  ]
}
```

#### POST /selfservice/weigh
Ler peso da balança

**Request:**
```json
{
  "scale_id": "scale_01"
}
```

**Response:**
```json
{
  "scale_id": "scale_01",
  "gross_weight": 524,
  "tare_weight": 150,
  "net_weight": 374,
  "weight_unit": "g",
  "price_per_kg": 69.90,
  "food_price": 26.15
}
```

#### POST /selfservice/tare
Tarar balança (zerar)

**Request:**
```json
{
  "scale_id": "scale_01"
}
```

#### POST /selfservice/orders
Criar pedido self-service

**Request:**
```json
{
  "scale_id": "scale_01",
  "command_id": "CMD1693305842",
  "additional_items": [
    {
      "product_id": "101",
      "product_name": "Refrigerante",
      "quantity": 1,
      "price": 6.00
    },
    {
      "product_id": "102", 
      "product_name": "Sobremesa",
      "quantity": 1,
      "price": 8.50
    }
  ]
}
```

**Response:**
```json
{
  "id": "SS1693305842",
  "net_weight": 374,
  "food_subtotal": 26.15,
  "additional_subtotal": 14.50,
  "subtotal": 40.65,
  "service_charge": 4.07,
  "total": 44.72,
  "scale_id": "scale_01",
  "command_id": "CMD1693305842"
}
```

#### GET /selfservice/orders/{id}
Obter pedido self-service

#### POST /selfservice/scales/{id}/calibrate
Calibrar balança (requer permissão especial)

#### GET /selfservice/products/additional
Listar produtos adicionais (bebidas, sobremesas)

#### GET /selfservice/pricing
Obter preços atuais

**Response:**
```json
{
  "price_per_kg": 69.90,
  "happy_hour": {
    "active": true,
    "discount": 0.20,
    "start_time": "14:00",
    "end_time": "16:00"
  },
  "child_discount": {
    "percentage": 0.50,
    "max_age": 6
  }
}
```

---

## 10. Table Management

### 🆕 Gestão de Layout de Mesas

#### GET /tables
Listar todas as mesas

**Response:**
```json
{
  "tables": [
    {
      "id": "1",
      "number": "1",
      "capacity": 4,
      "shape": "round",
      "position": {"x": 100, "y": 150},
      "status": "available",
      "current_order_id": null,
      "estimated_available_time": null,
      "last_occupied": "2024-08-28T13:30:00Z"
    }
  ],
  "layout": {
    "width": 800,
    "height": 600,
    "scale": 1.0
  }
}
```

#### GET /tables/{id}
Obter mesa específica com detalhes

#### PUT /tables/{id}/status
Atualizar status da mesa

**Request:**
```json
{
  "status": "occupied",
  "order_id": "ORD123",
  "estimated_duration_minutes": 90
}
```

#### POST /tables
Criar nova mesa

**Request:**
```json
{
  "number": "15",
  "capacity": 6,
  "shape": "rectangular",
  "position": {"x": 300, "y": 250},
  "preferences": ["window", "quiet"]
}
```

#### PUT /tables/{id}
Atualizar configuração da mesa

#### DELETE /tables/{id}
Remover mesa

#### POST /tables/layout
Salvar layout completo

**Request:**
```json
{
  "tables": [
    {
      "id": "1",
      "position": {"x": 120, "y": 180},
      "rotation": 0
    }
  ],
  "layout": {
    "width": 800,
    "height": 600,
    "background_image": "layout.png"
  }
}
```

#### GET /tables/availability
Verificar disponibilidade de mesas

**Query Parameters:**
- `party_size`: Tamanho do grupo
- `datetime`: Data/hora desejada
- `duration_minutes`: Duração estimada

#### POST /tables/{id}/merge
Unir mesas para grupos grandes

**Request:**
```json
{
  "table_ids": ["5", "6"],
  "merged_capacity": 8
}
```

#### POST /tables/{id}/unmerge
Separar mesas unidas

### Estados e Transições

#### POST /tables/{id}/occupy
Marcar mesa como ocupada

#### POST /tables/{id}/free
Liberar mesa

#### POST /tables/{id}/clean
Iniciar limpeza da mesa

#### POST /tables/{id}/maintenance
Colocar mesa em manutenção

---

## 11. KDS

### Kitchen Display System

#### GET /kds/orders
Listar pedidos da cozinha

**Query Parameters:**
- `status`: pending, preparing, ready
- `station`: Estação específica (grill, salads, drinks)

#### PUT /kds/orders/{id}/start
Iniciar preparação

#### PUT /kds/orders/{id}/ready
Marcar como pronto

#### POST /kds/orders/{id}/delay
Reportar atraso

**Request:**
```json
{
  "delay_minutes": 15,
  "reason": "Ingrediente em falta"
}
```

---

## 12. Centralized Logging

### 🆕 Sistema de Logging Centralizado

> **Arquitetura**: O sistema de logging foi projetado para funcionar localmente, onde o backend atua como centralizador de logs de todos os módulos frontend (POS, KDS, Kiosk, Waiter). Como o backend roda no mesmo servidor local, não há problemas de latência ou conectividade.

#### POST /logs
Enviar logs do frontend para o backend

**Request:**
```json
{
  "level": "info",
  "message": "Order updated successfully",
  "module": "kds",
  "timestamp": "2024-08-28T14:30:42Z",
  "context": {
    "orderId": "ORD123",
    "userId": "user456",
    "action": "status_change"
  },
  "session_id": "sess_abc123",
  "user_agent": "Mozilla/5.0..."
}
```

**Response:**
```json
{
  "log_id": "LOG1693305842",
  "received_at": "2024-08-28T14:30:43Z",
  "status": "stored"
}
```

#### POST /logs/batch
Enviar múltiplos logs em batch (otimização)

**Request:**
```json
{
  "logs": [
    {
      "level": "error",
      "message": "WebSocket connection failed",
      "module": "kds",
      "timestamp": "2024-08-28T14:29:00Z",
      "context": {
        "error": "Connection refused",
        "retry_count": 3
      }
    },
    {
      "level": "info",
      "message": "WebSocket reconnected successfully",
      "module": "kds", 
      "timestamp": "2024-08-28T14:30:15Z",
      "context": {
        "reconnect_time_ms": 15000
      }
    }
  ]
}
```

#### GET /logs
Consultar logs (para debugging e monitoramento)

**Query Parameters:**
- `level`: error, warn, info, debug
- `module`: kds, pos, kiosk, waiter
- `date_from`: Data inicial
- `date_to`: Data final
- `limit`: Número de logs (padrão: 100)
- `search`: Busca por palavra-chave na mensagem
- `user_id`: Logs de usuário específico

**Response:**
```json
{
  "logs": [
    {
      "id": "LOG1693305842",
      "level": "error",
      "message": "Failed to update order status",
      "module": "kds",
      "timestamp": "2024-08-28T14:30:42Z",
      "context": {
        "orderId": "ORD123",
        "error": "Network timeout"
      },
      "session_id": "sess_abc123"
    }
  ],
  "total": 1247,
  "pagination": {
    "page": 1,
    "per_page": 100,
    "total_pages": 13
  }
}
```

#### GET /logs/stats
Estatísticas dos logs

**Response:**
```json
{
  "today": {
    "total_logs": 2456,
    "errors": 23,
    "warnings": 156,
    "info": 2277
  },
  "by_module": {
    "kds": {
      "total": 856,
      "errors": 8,
      "warnings": 45
    },
    "pos": {
      "total": 1200,
      "errors": 12,
      "warnings": 89
    }
  },
  "error_trends": [
    {
      "hour": "14:00",
      "error_count": 3,
      "most_common": "WebSocket connection timeout"
    }
  ]
}
```

#### DELETE /logs
Limpar logs antigos (limpeza automática)

**Query Parameters:**
- `older_than_days`: Logs mais antigos que X dias (padrão: 30)
- `keep_errors`: Manter logs de erro por mais tempo (padrão: true)

### Integração Frontend

#### Serviço de Logging (KDS)
```typescript
// Implementação no KDS (já implementado)
class OfflineStorage {
  async log(level: string, message: string, context?: any) {
    const logEntry = {
      level,
      message,
      module: 'kds',
      timestamp: new Date().toISOString(),
      context,
      session_id: this.getSessionId()
    };

    try {
      // Enviar para backend (local)
      await fetch('/api/v1/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      // Fallback: armazenar localmente se backend não disponível
      this.storeLocalLog(logEntry);
    }
  }
}
```

#### Uso nos Componentes
```typescript
// Substitui console.log em produção
import { offlineStorage } from '@/services/offlineStorage';

// Em vez de:
// console.log('Order updated', order); ❌

// Use:
offlineStorage.log('info', 'Order updated successfully', {
  orderId: order.id,
  newStatus: order.status
}); // ✅
```

### Benefícios da Arquitetura

1. **Centralização Local**: Todos os logs ficam centralizados no backend local
2. **Zero Latência**: Backend local = resposta imediata
3. **Persistência**: Logs salvos em banco para auditoria
4. **Debugging**: Fácil depuração com contexto rico
5. **Monitoramento**: Dashboard de erros em tempo real
6. **Compliance**: Trilha de auditoria para regulamentações

---

## 13. Relatórios

### Vendas

#### GET /reports/sales/daily
Relatório diário de vendas

#### GET /reports/sales/period
Vendas por período

**Query Parameters:**
- `start_date`: Data inicial
- `end_date`: Data final
- `group_by`: day, week, month

### 🆕 Relatórios de Mesas

#### GET /reports/tables/occupancy
Taxa de ocupação das mesas

**Response:**
```json
{
  "period": "2024-08-28",
  "overall_occupancy": 0.75,
  "by_table": [
    {
      "table_id": "5",
      "occupancy_rate": 0.85,
      "total_duration_minutes": 1234,
      "turns": 6
    }
  ],
  "peak_hours": [
    {
      "hour": "12:00",
      "occupancy": 0.95
    }
  ]
}
```

#### GET /reports/queue/performance
Performance da fila de espera

#### GET /reports/reservations/analytics
Análise de reservas

#### GET /reports/commands/usage
Relatório de uso de comandas

---

## 14. WebSocket Events

### Conexão
```
WS: ws://localhost:8001/ws/{terminal_id}
```

### Eventos Emitidos pelo Servidor

#### Queue Events
```json
{
  "event": "queue.updated",
  "data": {
    "queue": [...],
    "stats": {...}
  }
}

{
  "event": "queue.customer_notified",
  "data": {
    "customer_name": "Maria Santos",
    "table_id": "5",
    "notification_sent": true
  }
}
```

#### Table Events
```json
{
  "event": "table.status_changed",
  "data": {
    "table_id": "8",
    "old_status": "occupied",
    "new_status": "available",
    "timestamp": "2024-08-28T16:45:00Z"
  }
}
```

#### Order Events
```json
{
  "event": "order.status_updated",
  "data": {
    "order_id": "123",
    "status": "ready",
    "table_id": "5"
  }
}
```

#### Command Events
```json
{
  "event": "command.item_added",
  "data": {
    "command_id": "CMD123",
    "item": {...},
    "new_total": 45.60
  }
}
```

### Eventos do Cliente
```json
{
  "action": "join_room",
  "room": "table_5"
}

{
  "action": "subscribe",
  "events": ["queue.*", "table.*"]
}
```

---

## Códigos de Status HTTP

### Sucessos
- `200 OK`: Requisição bem-sucedida
- `201 Created`: Recurso criado com sucesso
- `204 No Content`: Operação realizada, sem conteúdo de retorno

### Erros do Cliente
- `400 Bad Request`: Dados inválidos
- `401 Unauthorized`: Token inválido ou expirado
- `403 Forbidden`: Sem permissão
- `404 Not Found`: Recurso não encontrado
- `409 Conflict`: Conflito de estado (ex: mesa já ocupada)
- `422 Unprocessable Entity`: Dados válidos mas regras de negócio violadas

### Erros do Servidor
- `500 Internal Server Error`: Erro interno
- `503 Service Unavailable`: Serviço temporariamente indisponível

---

## Exemplos de Uso

### Fluxo Completo: Cliente sem Reserva

```bash
# 1. Adicionar à fila
curl -X POST /api/v1/queue \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "customer_name": "João Silva",
    "customer_phone": "+5511999999999",
    "party_size": 2
  }'

# 2. Consultar posição (cliente pode usar)
curl /api/v1/queue/WQ123456789/position

# 3. Mesa liberada - notificar cliente
curl -X POST /api/v1/queue/WQ123456789/notify \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"table_id": "5"}'

# 4. Cliente chegou - acomodar
curl -X POST /api/v1/queue/WQ123456789/seat \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"table_id": "5"}'

# 5. Criar pedido na mesa
curl -X POST /api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "table_id": "5",
    "customer_name": "João Silva",
    "items": [...]
  }'
```

### Fluxo: Reserva com Depósito

```bash
# 1. Criar reserva
curl -X POST /api/v1/reservations \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "customer_name": "Maria Santos",
    "party_size": 8,
    "reservation_datetime": "2024-08-30T19:00:00Z"
  }'

# 2. Cliente paga depósito
curl -X POST /api/v1/reservations/RES001/deposit/pay \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"payment_method": "credit_card", "amount": 80.00}'

# 3. Confirmar reserva
curl -X POST /api/v1/reservations/RES001/confirm \
  -H "Authorization: Bearer $TOKEN"
```

### Fluxo: Self-Service com Comanda

```bash
# 1. Criar comanda
curl -X POST /api/v1/commands \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type": "qrcode", "table_id": "8"}'

# 2. Cliente vai ao buffet e pesa
curl -X POST /api/v1/selfservice/weigh \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"scale_id": "scale_01"}'

# 3. Criar pedido self-service
curl -X POST /api/v1/selfservice/orders \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "scale_id": "scale_01",
    "command_id": "CMD123",
    "additional_items": [
      {"product_id": "101", "quantity": 1, "price": 6.00}
    ]
  }'

# 4. Fechar comanda
curl -X POST /api/v1/commands/CMD123/close \
  -H "Authorization: Bearer $TOKEN"
```

---

## Rate Limiting

- **Geral**: 100 req/min por IP
- **Autenticação**: 10 req/min por IP  
- **Consulta de fila** (público): 30 req/min por IP
- **Webhook callbacks**: 1000 req/min

## Versionamento

- Versão atual: `v1`
- Retrocompatibilidade mantida por 12 meses
- Headers de depreciação enviados 6 meses antes da remoção
- Changelog disponível em `/api/changelog`

---

**Documentação atualizada em: 28/08/2024**
**Versão da API: 1.3.0**