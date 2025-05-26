# Módulo de Abertura/Fechamento de Dia - POS Moderno

## Visão Geral

O Módulo de Abertura/Fechamento de Dia é responsável por gerenciar o ciclo de operação diário do restaurante. Ele controla a abertura e fechamento do dia de operação, mantém o registro de vendas e pedidos, e fornece relatórios consolidados para análise de desempenho.

## Conceitos Principais

### Dia de Operação (Business Day)

Um dia de operação representa um período de atividade do restaurante, geralmente correspondendo a um dia do calendário. Ele possui os seguintes estados:

- **Aberto (Open)**: O restaurante está em operação, aceitando pedidos e realizando vendas.
- **Fechado (Closed)**: O período de operação foi encerrado, com todos os caixas fechados e vendas contabilizadas.

### Ciclo de Vida do Dia de Operação

1. **Abertura do Dia**: Realizada pelo gerente no início do expediente.
2. **Operação**: Durante o dia, vendas e pedidos são registrados e associados ao dia aberto.
3. **Fechamento do Dia**: Realizado pelo gerente no final do expediente, após todos os caixas serem fechados.
4. **Relatórios**: Após o fechamento, relatórios consolidados ficam disponíveis para análise.

## Regras de Negócio

### Abertura de Dia

- Apenas um dia pode estar aberto por vez
- A data do dia deve ser a atual ou futura
- Apenas usuários com permissão de abertura de dia podem realizar esta operação

### Fechamento de Dia

- Todos os caixas devem estar fechados antes de fechar o dia
- Apenas usuários com permissão de fechamento de dia podem realizar esta operação
- O dia deve estar aberto para ser fechado
- Ao fechar o dia, os totais de vendas e pedidos são calculados e registrados

### Consulta e Relatórios

- Qualquer usuário autenticado pode consultar o dia atual
- Relatórios detalhados requerem permissão específica
- Dias fechados não podem ser reabertos, apenas consultados

## Endpoints da API

### Abertura de Dia

**Endpoint**: `POST /api/v1/business-day`

**Permissão**: `DAY_OPEN`

**Corpo da Requisição**:
```json
{
  "date": "2025-05-23",
  "opened_by": "gerente_id",
  "notes": "Dia normal de operação"
}
```

**Resposta de Sucesso (201 Created)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "date": "2025-05-23",
  "status": "open",
  "opened_by": "gerente_id",
  "closed_by": null,
  "opened_at": "2025-05-23T08:00:00Z",
  "closed_at": null,
  "total_sales": 0.0,
  "total_orders": 0,
  "notes": "Dia normal de operação",
  "created_at": "2025-05-23T08:00:00Z",
  "updated_at": "2025-05-23T08:00:00Z"
}
```

**Erros Possíveis**:
- 400 Bad Request: Já existe um dia aberto
- 400 Bad Request: Data inválida (passada)
- 401 Unauthorized: Usuário não autenticado
- 403 Forbidden: Usuário sem permissão

### Fechamento de Dia

**Endpoint**: `PUT /api/v1/business-day/{business_day_id}/close`

**Permissão**: `DAY_CLOSE`

**Corpo da Requisição**:
```json
{
  "closed_by": "gerente_id",
  "notes": "Fechamento normal"
}
```

**Resposta de Sucesso (200 OK)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "date": "2025-05-23",
  "status": "closed",
  "opened_by": "gerente_id",
  "closed_by": "gerente_id",
  "opened_at": "2025-05-23T08:00:00Z",
  "closed_at": "2025-05-23T20:00:00Z",
  "total_sales": 1250.75,
  "total_orders": 45,
  "notes": "Fechamento normal",
  "created_at": "2025-05-23T08:00:00Z",
  "updated_at": "2025-05-23T20:00:00Z"
}
```

**Erros Possíveis**:
- 400 Bad Request: Existem caixas abertos
- 400 Bad Request: O dia já está fechado
- 404 Not Found: Dia não encontrado
- 401 Unauthorized: Usuário não autenticado
- 403 Forbidden: Usuário sem permissão

### Consulta do Dia Atual

**Endpoint**: `GET /api/v1/business-day/current`

**Permissão**: Qualquer usuário autenticado

**Resposta de Sucesso (200 OK)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "date": "2025-05-23",
  "status": "open",
  "opened_by": "gerente_id",
  "closed_by": null,
  "opened_at": "2025-05-23T08:00:00Z",
  "closed_at": null,
  "total_sales": 750.25,
  "total_orders": 30,
  "notes": "Dia normal de operação",
  "created_at": "2025-05-23T08:00:00Z",
  "updated_at": "2025-05-23T15:30:00Z"
}
```

**Erros Possíveis**:
- 404 Not Found: Não há um dia aberto
- 401 Unauthorized: Usuário não autenticado

### Consulta de Dia Específico

**Endpoint**: `GET /api/v1/business-day/{business_day_id}`

**Permissão**: Qualquer usuário autenticado

**Resposta de Sucesso (200 OK)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "date": "2025-05-23",
  "status": "closed",
  "opened_by": "gerente_id",
  "closed_by": "gerente_id",
  "opened_at": "2025-05-23T08:00:00Z",
  "closed_at": "2025-05-23T20:00:00Z",
  "total_sales": 1250.75,
  "total_orders": 45,
  "notes": "Dia normal de operação",
  "created_at": "2025-05-23T08:00:00Z",
  "updated_at": "2025-05-23T20:00:00Z"
}
```

**Erros Possíveis**:
- 404 Not Found: Dia não encontrado
- 401 Unauthorized: Usuário não autenticado

### Listagem de Dias

**Endpoint**: `GET /api/v1/business-day`

**Permissão**: Qualquer usuário autenticado

**Parâmetros de Query**:
- `status`: Filtro por status (open/closed)
- `start_date`: Data inicial (formato ISO: YYYY-MM-DD)
- `end_date`: Data final (formato ISO: YYYY-MM-DD)
- `limit`: Limite de resultados (padrão: 10)
- `offset`: Deslocamento para paginação (padrão: 0)

**Resposta de Sucesso (200 OK)**:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "date": "2025-05-23",
    "status": "closed",
    "opened_at": "2025-05-23T08:00:00Z",
    "closed_at": "2025-05-23T20:00:00Z",
    "total_sales": 1250.75,
    "total_orders": 45
  },
  {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "date": "2025-05-22",
    "status": "closed",
    "opened_at": "2025-05-22T08:00:00Z",
    "closed_at": "2025-05-22T20:00:00Z",
    "total_sales": 1100.50,
    "total_orders": 40
  }
]
```

**Erros Possíveis**:
- 400 Bad Request: Formato de data inválido
- 401 Unauthorized: Usuário não autenticado

### Relatório de Vendas Diárias

**Endpoint**: `GET /api/v1/business-day/{business_day_id}/report`

**Permissão**: `REPORT_READ`

**Resposta de Sucesso (200 OK)**:
```json
{
  "business_day_id": "123e4567-e89b-12d3-a456-426614174000",
  "date": "2025-05-23",
  "total_sales": 1250.75,
  "total_orders": 45,
  "sales_by_payment_method": {
    "credit_card": 750.50,
    "debit_card": 350.25,
    "cash": 150.00
  },
  "sales_by_hour": {
    "08:00": 120.50,
    "09:00": 230.75,
    "10:00": 180.25,
    "11:00": 320.50,
    "12:00": 398.75
  },
  "top_selling_products": [
    {"product_id": "p1", "name": "X-Burger", "quantity": 25, "total": 375.00},
    {"product_id": "p2", "name": "Batata Frita", "quantity": 20, "total": 180.00},
    {"product_id": "p3", "name": "Refrigerante", "quantity": 30, "total": 150.00}
  ],
  "average_ticket": 27.79
}
```

**Erros Possíveis**:
- 404 Not Found: Dia não encontrado
- 401 Unauthorized: Usuário não autenticado
- 403 Forbidden: Usuário sem permissão

### Atualização de Dia

**Endpoint**: `PUT /api/v1/business-day/{business_day_id}`

**Permissão**: `DAY_UPDATE`

**Corpo da Requisição**:
```json
{
  "notes": "Notas atualizadas"
}
```

**Resposta de Sucesso (200 OK)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "date": "2025-05-23",
  "status": "open",
  "opened_by": "gerente_id",
  "closed_by": null,
  "opened_at": "2025-05-23T08:00:00Z",
  "closed_at": null,
  "total_sales": 750.25,
  "total_orders": 30,
  "notes": "Notas atualizadas",
  "created_at": "2025-05-23T08:00:00Z",
  "updated_at": "2025-05-23T15:30:00Z"
}
```

**Erros Possíveis**:
- 404 Not Found: Dia não encontrado
- 401 Unauthorized: Usuário não autenticado
- 403 Forbidden: Usuário sem permissão

## Integração com Event Bus

O módulo de Abertura/Fechamento de Dia publica eventos no barramento de eventos (Event Bus) para notificar outros módulos sobre mudanças no estado do dia de operação.

### Eventos Publicados

#### Abertura de Dia (DAY_OPENED)

```json
{
  "type": "day.opened",
  "data": {
    "business_day": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "date": "2025-05-23",
      "opened_by": "gerente_id",
      "opened_at": "2025-05-23T08:00:00Z"
    },
    "timestamp": 1621234567.89
  }
}
```

#### Fechamento de Dia (DAY_CLOSED)

```json
{
  "type": "day.closed",
  "data": {
    "business_day": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "date": "2025-05-23",
      "closed_by": "gerente_id",
      "closed_at": "2025-05-23T20:00:00Z",
      "total_sales": 1250.75,
      "total_orders": 45
    },
    "timestamp": 1621234567.89
  }
}
```

#### Atualização de Dia (SYSTEM_CONFIG_CHANGED)

```json
{
  "type": "system.config_changed",
  "data": {
    "business_day": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "date": "2025-05-23",
      "status": "open"
    },
    "updated_fields": {
      "notes": "Notas atualizadas"
    },
    "timestamp": 1621234567.89
  }
}
```

### Consumo de Eventos

O módulo de Abertura/Fechamento de Dia também pode consumir eventos de outros módulos para atualizar seus dados. Por exemplo:

- Eventos de venda (`SALE_COMPLETED`) para atualizar os totais do dia
- Eventos de pedido (`ORDER_COMPLETED`) para atualizar a contagem de pedidos
- Eventos de caixa (`CASHIER_CLOSED`) para verificar se todos os caixas foram fechados

## Fluxos de Operação

### Fluxo de Abertura de Dia

1. O gerente inicia o dia de operação através do endpoint de abertura
2. O sistema verifica se não há outro dia aberto
3. O sistema cria um novo dia com status "aberto"
4. O sistema publica o evento `DAY_OPENED`
5. Outros módulos são notificados e podem iniciar suas operações

### Fluxo de Fechamento de Dia

1. O gerente verifica se todos os caixas estão fechados
2. O gerente solicita o fechamento do dia através do endpoint de fechamento
3. O sistema verifica se não há caixas abertos
4. O sistema calcula os totais finais de vendas e pedidos
5. O sistema atualiza o dia para status "fechado"
6. O sistema publica o evento `DAY_CLOSED`
7. Outros módulos são notificados e podem finalizar suas operações

### Fluxo de Geração de Relatório

1. O gerente solicita o relatório de um dia específico
2. O sistema coleta dados de vendas, pagamentos e produtos
3. O sistema calcula métricas como vendas por hora e produtos mais vendidos
4. O sistema retorna o relatório consolidado

## Integração com Outros Módulos

### Módulo de Caixa

- O módulo de Abertura/Fechamento de Dia verifica o status dos caixas antes de permitir o fechamento do dia
- Caixas só podem ser abertos quando há um dia aberto
- O fechamento do dia requer que todos os caixas estejam fechados

### Módulo de Vendas

- Vendas são associadas ao dia de operação atual
- Os totais de vendas são acumulados no dia de operação
- Relatórios de vendas diárias são gerados a partir dos dados de vendas

### Módulo de Relatórios

- O módulo de Abertura/Fechamento de Dia fornece dados consolidados para relatórios gerenciais
- Relatórios diários, semanais e mensais podem ser gerados a partir dos dados dos dias de operação

## Considerações de Implementação

### Persistência de Dados

O módulo utiliza um sistema de persistência baseado em arquivos JSON para armazenar os dados dos dias de operação. Em um ambiente de produção, isso seria substituído por um banco de dados relacional ou NoSQL.

### Concorrência

O módulo implementa verificações para evitar condições de corrida, como tentar abrir múltiplos dias simultaneamente ou fechar um dia que já está fechado.

### Segurança

O acesso aos endpoints é protegido por autenticação JWT e autorização baseada em permissões, garantindo que apenas usuários autorizados possam realizar operações críticas.

## Exemplos de Uso

### Abertura do Dia pelo Gerente

```javascript
// Frontend (exemplo em JavaScript)
async function openBusinessDay() {
  const token = getAuthToken(); // Obter token de autenticação
  const today = new Date().toISOString().split('T')[0]; // Data atual no formato YYYY-MM-DD
  
  const response = await fetch('/api/v1/business-day', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      date: today,
      opened_by: getCurrentUserId(),
      notes: "Dia normal de operação"
    })
  });
  
  if (response.ok) {
    const businessDay = await response.json();
    showSuccessMessage(`Dia aberto com sucesso: ${businessDay.date}`);
    updateDashboard(businessDay);
  } else {
    const error = await response.json();
    showErrorMessage(`Erro ao abrir o dia: ${error.detail}`);
  }
}
```

### Fechamento do Dia pelo Gerente

```javascript
// Frontend (exemplo em JavaScript)
async function closeBusinessDay(businessDayId) {
  const token = getAuthToken(); // Obter token de autenticação
  
  // Verificar se há caixas abertos
  const cashiersResponse = await fetch('/api/v1/cashier?status=open', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const cashiers = await cashiersResponse.json();
  if (cashiers.length > 0) {
    showErrorMessage(`Existem ${cashiers.length} caixas abertos. Feche-os antes de fechar o dia.`);
    return;
  }
  
  // Fechar o dia
  const response = await fetch(`/api/v1/business-day/${businessDayId}/close`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      closed_by: getCurrentUserId(),
      notes: "Fechamento normal"
    })
  });
  
  if (response.ok) {
    const businessDay = await response.json();
    showSuccessMessage(`Dia fechado com sucesso: ${businessDay.date}`);
    showDailySummary(businessDay);
  } else {
    const error = await response.json();
    showErrorMessage(`Erro ao fechar o dia: ${error.detail}`);
  }
}
```

### Consulta do Relatório Diário

```javascript
// Frontend (exemplo em JavaScript)
async function viewDailyReport(businessDayId) {
  const token = getAuthToken(); // Obter token de autenticação
  
  const response = await fetch(`/api/v1/business-day/${businessDayId}/report`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    const report = await response.json();
    renderDailyReport(report);
    
    // Exemplo de renderização de gráfico de vendas por hora
    renderHourlySalesChart(report.sales_by_hour);
    
    // Exemplo de renderização de tabela de produtos mais vendidos
    renderTopProductsTable(report.top_selling_products);
  } else {
    const error = await response.json();
    showErrorMessage(`Erro ao obter relatório: ${error.detail}`);
  }
}
```

## Conclusão

O Módulo de Abertura/Fechamento de Dia é um componente fundamental do sistema POS Moderno, fornecendo controle sobre o ciclo de operação diário do restaurante. Ele garante que as operações sigam um fluxo organizado, com abertura e fechamento adequados, e fornece dados consolidados para análise de desempenho.

A integração com o Event Bus permite que outros módulos sejam notificados sobre mudanças no estado do dia, possibilitando uma arquitetura desacoplada e resiliente. As regras de negócio implementadas garantem a integridade dos dados e a consistência das operações.
