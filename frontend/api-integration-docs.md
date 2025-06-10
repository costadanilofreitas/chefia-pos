# Documentação de APIs e Pontos de Integração - POS Modern

Este documento descreve os endpoints de API e pontos de integração utilizados por cada módulo do frontend do POS Modern.

## Visão Geral da Arquitetura

O POS Modern utiliza uma arquitetura baseada em microserviços, onde cada módulo frontend se comunica com diferentes endpoints de API REST e também pode se comunicar com outros módulos através de um event bus. A comunicação entre os módulos é feita principalmente através de:

1. **API REST** - Para comunicação com o backend
2. **Event Bus** - Para comunicação entre módulos frontend
3. **Hooks Compartilhados** - Para compartilhamento de lógica entre módulos

## Módulos e Endpoints de API

### 1. Módulo POS (Ponto de Venda)

O módulo POS é responsável pelo atendimento no balcão, gerenciamento de caixa e processamento de pedidos.

#### Endpoints de API:

| Endpoint | Método | Descrição | Parâmetros |
|----------|--------|-----------|------------|
| `/api/auth/login` | POST | Autenticação de usuário | `{ username, password }` |
| `/api/business-day/open` | POST | Abertura do dia de operação | `{ date, initialAmount }` |
| `/api/business-day/close` | POST | Fechamento do dia de operação | `{ date, finalAmount }` |
| `/api/cashier/open` | POST | Abertura de caixa | `{ initialAmount, userId }` |
| `/api/cashier/close` | POST | Fechamento de caixa | `{ finalAmount, userId }` |
| `/api/cashier/withdrawal` | POST | Sangria de caixa | `{ amount, reason }` |
| `/api/orders` | GET | Listar pedidos | `{ status, date }` |
| `/api/orders` | POST | Criar novo pedido | `{ items, customer, paymentMethod }` |
| `/api/orders/:id` | GET | Detalhes do pedido | - |
| `/api/orders/:id/status` | PUT | Atualizar status do pedido | `{ status }` |
| `/api/products` | GET | Listar produtos | `{ category, search }` |
| `/api/categories` | GET | Listar categorias | - |

#### Integrações:

- **Impressora Fiscal** - Para emissão de cupom fiscal
- **Gateway de Pagamento** - Para processamento de pagamentos com cartão
- **SAT/NFC-e** - Para emissão de documentos fiscais

### 2. Módulo KDS (Kitchen Display System)

O módulo KDS exibe os pedidos para a cozinha e permite o gerenciamento do fluxo de preparação.

#### Endpoints de API:

| Endpoint | Método | Descrição | Parâmetros |
|----------|--------|-----------|------------|
| `/api/auth/login` | POST | Autenticação de usuário | `{ username, password }` |
| `/api/orders` | GET | Listar pedidos | `{ status, station }` |
| `/api/orders/:id/status` | PUT | Atualizar status do pedido | `{ status }` |
| `/api/stations` | GET | Listar estações de trabalho | - |

#### Integrações:

- **Event Bus** - Para receber atualizações em tempo real de novos pedidos
- **Impressora de Comandas** - Para impressão de comandas na cozinha

### 3. Módulo Kiosk (Autoatendimento)

O módulo Kiosk permite que os clientes façam pedidos sem interação com atendentes.

#### Endpoints de API:

| Endpoint | Método | Descrição | Parâmetros |
|----------|--------|-----------|------------|
| `/api/products` | GET | Listar produtos | `{ category, search }` |
| `/api/categories` | GET | Listar categorias | - |
| `/api/orders` | POST | Criar novo pedido | `{ items, paymentMethod }` |
| `/api/payments/process` | POST | Processar pagamento | `{ orderId, method, amount }` |

#### Integrações:

- **Gateway de Pagamento** - Para processamento de pagamentos com cartão
- **Impressora de Senhas** - Para impressão de senha de atendimento

### 4. Módulo Waiter (Garçom)

O módulo Waiter permite que garçons gerenciem mesas, façam pedidos e controlem o atendimento.

#### Endpoints de API:

| Endpoint | Método | Descrição | Parâmetros |
|----------|--------|-----------|------------|
| `/api/auth/login` | POST | Autenticação de usuário | `{ username, password }` |
| `/api/tables` | GET | Listar mesas | `{ status }` |
| `/api/tables/:id` | GET | Detalhes da mesa | - |
| `/api/tables/:id/orders` | GET | Pedidos da mesa | - |
| `/api/orders` | POST | Criar novo pedido | `{ items, tableId }` |
| `/api/orders/:id` | PUT | Atualizar pedido | `{ items, status }` |
| `/api/products` | GET | Listar produtos | `{ category, search }` |
| `/api/categories` | GET | Listar categorias | - |

#### Integrações:

- **Event Bus** - Para receber atualizações em tempo real de status de pedidos
- **TableLayoutEditor** - Componente compartilhado para visualização do layout de mesas

### 5. Módulo Menu (Cardápio Digital)

O módulo Menu exibe o cardápio digital para clientes, acessível via QR Code.

#### Endpoints de API:

| Endpoint | Método | Descrição | Parâmetros |
|----------|--------|-----------|------------|
| `/api/restaurant/:id` | GET | Informações do restaurante | - |
| `/api/products` | GET | Listar produtos | `{ category, search }` |
| `/api/categories` | GET | Listar categorias | - |

#### Integrações:

- **AWS S3** - Para armazenamento e acesso a imagens de produtos

### 6. Módulo Backoffice (Gerenciamento)

O módulo Backoffice permite o gerenciamento remoto do restaurante.

#### Endpoints de API:

| Endpoint | Método | Descrição | Parâmetros |
|----------|--------|-----------|------------|
| `/api/auth/login` | POST | Autenticação de usuário | `{ username, password }` |
| `/api/restaurants` | GET | Listar restaurantes | - |
| `/api/restaurants/:id` | GET | Detalhes do restaurante | - |
| `/api/restaurants/:id/stats` | GET | Estatísticas do restaurante | `{ period }` |
| `/api/products` | GET | Listar produtos | `{ category, search }` |
| `/api/products` | POST | Criar produto | `{ name, description, price, category }` |
| `/api/products/:id` | PUT | Atualizar produto | `{ name, description, price, category }` |
| `/api/categories` | GET | Listar categorias | - |
| `/api/categories` | POST | Criar categoria | `{ name }` |
| `/api/inventory` | GET | Listar itens de estoque | - |
| `/api/customers` | GET | Listar clientes | `{ search }` |
| `/api/reports/sales` | GET | Relatório de vendas | `{ startDate, endDate }` |
| `/api/reports/inventory` | GET | Relatório de estoque | `{ startDate, endDate }` |

#### Integrações:

- **AWS S3** - Para armazenamento e acesso a imagens de produtos
- **Serviço de Relatórios** - Para geração de relatórios em PDF

### 7. Módulo Common (Componentes Compartilhados)

O módulo Common contém componentes, hooks e utilitários compartilhados entre os outros módulos.

#### Hooks Compartilhados:

| Hook | Descrição | Módulos que utilizam |
|------|-----------|---------------------|
| `useAuth` | Gerenciamento de autenticação | POS, KDS, Waiter, Backoffice |
| `useBusinessDay` | Gerenciamento do dia de operação | POS |
| `useCashier` | Gerenciamento de caixa | POS |
| `useOrder` | Gerenciamento de pedidos | POS, KDS, Kiosk, Waiter |
| `useWebSocket` | Conexão com WebSocket para atualizações em tempo real | KDS, Waiter |
| `useApi` | Chamadas à API com tratamento de erros | Todos os módulos |

#### Componentes Compartilhados:

| Componente | Descrição | Módulos que utilizam |
|------------|-----------|---------------------|
| `ProductCard` | Exibição de produto | POS, Kiosk, Waiter, Menu |
| `TableLayoutEditor` | Editor de layout de mesas | Waiter, Backoffice |
| `OrderCard` | Exibição de pedido | POS, KDS, Waiter |
| `PaymentForm` | Formulário de pagamento | POS, Kiosk |

#### Utilitários Compartilhados:

| Utilitário | Descrição | Módulos que utilizam |
|------------|-----------|---------------------|
| `formatCurrency` | Formatação de valores monetários | Todos os módulos |
| `formatDateTime` | Formatação de data e hora | Todos os módulos |

## Event Bus

O POS Modern utiliza um event bus baseado em RabbitMQ para comunicação em tempo real entre os módulos. Abaixo estão os principais eventos:

| Evento | Descrição | Produtor | Consumidores |
|--------|-----------|----------|--------------|
| `order.created` | Novo pedido criado | POS, Kiosk, Waiter | KDS |
| `order.updated` | Pedido atualizado | POS, KDS, Waiter | KDS, Waiter, POS |
| `order.completed` | Pedido finalizado | KDS | POS, Waiter |
| `table.status_changed` | Status da mesa alterado | Waiter | POS, Backoffice |
| `cashier.opened` | Caixa aberto | POS | Backoffice |
| `cashier.closed` | Caixa fechado | POS | Backoffice |
| `business_day.opened` | Dia de operação aberto | POS | Backoffice |
| `business_day.closed` | Dia de operação fechado | POS | Backoffice |

## Dívidas Técnicas

### 1. Módulo Mobile Waiter

O módulo Mobile Waiter é um aplicativo React Native que precisa ser tratado separadamente do monorepo web. Ele deve ser migrado para um repositório próprio com sua própria estrutura de build.

### 2. Componente MessageQueueTestInterface

Este componente foi temporariamente excluído do build devido a incompatibilidades de tipo. Ele precisa ser refatorado para ser compatível com TypeScript.

### 3. Configurações de TypeScript

As configurações de TypeScript foram temporariamente relaxadas para permitir a compilação. É necessário revisar e corrigir os erros de tipo em todo o projeto.

### 4. Implementação de Hooks

Os hooks compartilhados foram implementados com funcionalidades básicas simuladas. É necessário implementar a lógica real de comunicação com o backend.

## Próximos Passos

1. Implementar testes unitários para todos os módulos
2. Configurar pipeline de CI/CD
3. Implementar autenticação real com JWT
4. Integrar com serviços externos (gateway de pagamento, SAT, etc.)
5. Resolver as dívidas técnicas identificadas
