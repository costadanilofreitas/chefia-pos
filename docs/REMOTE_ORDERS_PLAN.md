# Plano de Implementação - Tela de Pedidos Remotos

## 📋 Objetivo
Implementar uma tela completa para gerenciamento de pedidos externos (iFood, Uber Eats, Rappi, etc.) com funcionalidades de:
- Visualizar pedidos recebidos
- Aceitar/Rejeitar pedidos
- Despachar pedidos
- Configurar aceitação automática
- Monitorar status em tempo real

## 🏗️ Arquitetura Proposta

### Backend Components
1. **Models (remote_order_models.py)**
   - RemoteOrder: Pedido externo
   - RemoteOrderItem: Item do pedido
   - RemoteOrderStatus: Status do pedido
   - RemoteOrderConfig: Configurações automáticas

2. **Services (remote_order_service.py)**
   - Gerenciamento de pedidos
   - Integração com APIs externas
   - Lógica de aceitação automática
   - Notificações

3. **Router (remote_order_router.py)**
   - Endpoints CRUD para pedidos
   - Endpoints de ações (aceitar/rejeitar/despachar)
   - Endpoints de configuração
   - WebSocket para atualizações em tempo real

### Frontend Components
1. **RemoteOrdersScreen.tsx**
   - Tela principal de gerenciamento
   - Lista de pedidos por status
   - Ações rápidas

2. **RemoteOrderCard.tsx**
   - Card individual do pedido
   - Botões de ação
   - Informações detalhadas

3. **RemoteOrderConfig.tsx**
   - Dialog de configurações
   - Aceitação automática
   - Filtros e regras

## 📊 Status de Pedidos
- **PENDING**: Aguardando confirmação
- **ACCEPTED**: Aceito pelo restaurante
- **REJECTED**: Rejeitado pelo restaurante
- **PREPARING**: Em preparação
- **READY**: Pronto para entrega
- **DISPATCHED**: Despachado
- **DELIVERED**: Entregue
- **CANCELLED**: Cancelado

## 🔧 Funcionalidades Principais

### 1. Visualização de Pedidos
- Lista organizada por status
- Filtros por plataforma (iFood, Uber Eats, etc.)
- Ordenação por tempo de chegada
- Indicadores visuais de urgência

### 2. Ações de Pedidos
- **Aceitar**: Confirma o pedido e inicia preparação
- **Rejeitar**: Rejeita com motivo (falta de ingrediente, etc.)
- **Despachar**: Marca como despachado para entrega
- **Cancelar**: Cancela pedido aceito (com justificativa)

### 3. Configuração Automática
- Aceitação automática por horário
- Filtros por valor mínimo
- Blacklist de clientes
- Tempo máximo de preparação

### 4. Notificações
- Som para novos pedidos
- Alertas de tempo limite
- Notificações push
- Integração com sistema de som

## 🎨 Interface Design

### Layout Principal
```
┌─────────────────────────────────────────────────────────┐
│ [Menu] Pedidos Remotos                    [Configurar]  │
├─────────────────────────────────────────────────────────┤
│ [Pendentes: 3] [Aceitos: 5] [Prontos: 2] [Despachados] │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │ Pedido #123 │ │ Pedido #124 │ │ Pedido #125 │        │
│ │ iFood       │ │ Uber Eats   │ │ Rappi       │        │
│ │ R$ 45,90    │ │ R$ 32,50    │ │ R$ 67,80    │        │
│ │ 15:30       │ │ 15:35       │ │ 15:40       │        │
│ │ [Aceitar]   │ │ [Preparando]│ │ [Despachar] │        │
│ │ [Rejeitar]  │ │ [Cancelar]  │ │ [Detalhes]  │        │
│ └─────────────┘ └─────────────┘ └─────────────┘        │
└─────────────────────────────────────────────────────────┘
```

### Card de Pedido
- Número do pedido e plataforma
- Valor total e tempo de chegada
- Lista de itens resumida
- Botões de ação contextuais
- Indicador de tempo restante

## 🔌 Integrações

### APIs Externas
- iFood API
- Uber Eats API
- Rappi API
- WhatsApp Business API (notificações)

### Sistemas Internos
- Sistema de estoque (verificar disponibilidade)
- Sistema de caixa (registrar vendas)
- Sistema de impressão (imprimir pedidos)
- Sistema de delivery (despacho)

## 📱 Responsividade
- Suporte a tablets (principal)
- Suporte a smartphones
- Interface touch-friendly
- Modo landscape otimizado

## 🚀 Implementação Faseada

### Fase 1: Backend Base
- Models e estrutura de dados
- Endpoints básicos CRUD
- Sistema de status

### Fase 2: Frontend Base
- Tela principal
- Lista de pedidos
- Ações básicas

### Fase 3: Funcionalidades Avançadas
- Configuração automática
- Notificações
- Filtros e busca

### Fase 4: Integrações
- APIs externas
- WebSocket
- Notificações push

## 📋 Checklist de Implementação

### Backend
- [ ] Criar models de pedidos remotos
- [ ] Implementar service layer
- [ ] Criar endpoints REST
- [ ] Adicionar WebSocket support
- [ ] Implementar configurações automáticas
- [ ] Adicionar validações e tratamento de erros

### Frontend
- [ ] Criar tela principal RemoteOrdersScreen
- [ ] Implementar componente RemoteOrderCard
- [ ] Criar dialog de configurações
- [ ] Adicionar navegação no menu
- [ ] Implementar notificações visuais
- [ ] Adicionar responsividade

### Testes
- [ ] Testar CRUD de pedidos
- [ ] Testar ações de aceitar/rejeitar
- [ ] Testar configurações automáticas
- [ ] Testar interface responsiva
- [ ] Testar notificações

### Integração
- [ ] Conectar com sistema de estoque
- [ ] Integrar com sistema de impressão
- [ ] Conectar com delivery
- [ ] Testar fluxo completo

