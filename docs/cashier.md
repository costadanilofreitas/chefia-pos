# Módulo de Caixa - POS Moderno

## Visão Geral

O Módulo de Caixa é responsável por gerenciar as operações financeiras do restaurante, incluindo abertura e fechamento de caixas, registro de vendas, retiradas de dinheiro (rupturas), e geração de relatórios financeiros. Este módulo integra-se com o Módulo de Abertura/Fechamento de Dia para garantir a consistência das operações financeiras.

## Conceitos Principais

### Caixa (Cashier)

Um caixa representa um ponto de venda físico operado por um funcionário específico. Ele possui os seguintes estados:

- **Aberto (Open)**: O caixa está em operação, aceitando transações.
- **Fechado (Closed)**: O caixa foi encerrado, com todas as transações contabilizadas e o dinheiro físico conferido.

### Operações de Caixa

O módulo suporta diversos tipos de operações:

- **Abertura (Opening)**: Inicialização do caixa com um saldo inicial.
- **Venda (Sale)**: Registro de uma venda, aumentando o saldo do caixa.
- **Reembolso (Refund)**: Devolução de dinheiro ao cliente, diminuindo o saldo do caixa.
- **Retirada (Withdrawal)**: Ruptura - retirada de dinheiro do caixa para fins específicos.
- **Depósito (Deposit)**: Adição de dinheiro ao caixa sem estar associada a uma venda.
- **Fechamento (Closing)**: Encerramento do caixa, com conferência do dinheiro físico.

### Métodos de Pagamento

O sistema suporta diversos métodos de pagamento:

- Dinheiro (Cash)
- Cartão de Crédito (Credit Card)
- Cartão de Débito (Debit Card)
- PIX
- Voucher
- iFood

## Regras de Negócio

### Abertura de Caixa

- Deve haver um dia de operação aberto
- Um operador só pode ter um caixa aberto por vez
- Um terminal só pode ter um caixa aberto por vez
- Apenas usuários com permissão de abertura de caixa podem realizar esta operação

### Operações de Caixa

- O caixa deve estar aberto para registrar operações
- Operações de saída (retiradas, reembolsos) não podem exceder o saldo atual
- Retiradas (rupturas) requerem permissão específica
- Apenas o operador atual do caixa ou um gerente pode registrar operações

### Fechamento de Caixa

- O operador deve informar o valor físico em dinheiro para conferência
- O sistema calcula a diferença entre o valor físico e o saldo esperado
- Apenas o operador atual do caixa ou um gerente pode fechá-lo
- O caixa deve estar aberto para ser fechado

### Integração com Dia de Operação

- Caixas só podem ser abertos quando há um dia aberto
- O fechamento do dia requer que todos os caixas estejam fechados
- Todas as operações de caixa são associadas ao dia de operação atual

## Endpoints da API

### Abertura de Caixa

**Endpoint**: `POST /api/v1/cashier`

**Permissão**: `CASHIER_OPEN`

**Corpo da Requisição**:
```json
{
  "terminal_id": "POS-001",
  "business_day_id": "day-123",
  "opening_balance": 100.0,
  "operator_id": "operator-123",
  "notes": "Caixa principal"
}
```

**Resposta de Sucesso (201 Created)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "terminal_id": "POS-001",
  "business_day_id": "day-123",
  "status": "open",
  "current_operator_id": "operator-123",
  "opening_balance": 100.0,
  "current_balance": 100.0,
  "expected_balance": 100.0,
  "physical_cash_amount": null,
  "cash_difference": null,
  "opened_at": "2025-05-23T08:00:00Z",
  "closed_at": null,
  "created_at": "2025-05-23T08:00:00Z",
  "updated_at": "2025-05-23T08:00:00Z",
  "notes": "Caixa principal"
}
```

**Erros Possíveis**:
- 400 Bad Request: O dia de operação está fechado
- 400 Bad Request: O operador já possui um caixa aberto
- 400 Bad Request: O terminal já possui um caixa aberto
- 401 Unauthorized: Usuário não autenticado
- 403 Forbidden: Usuário sem permissão

### Fechamento de Caixa

**Endpoint**: `PUT /api/v1/cashier/{cashier_id}/close`

**Permissão**: `CASHIER_CLOSE`

**Corpo da Requisição**:
```json
{
  "operator_id": "operator-123",
  "physical_cash_amount": 350.75,
  "notes": "Fechamento normal"
}
```

**Resposta de Sucesso (200 OK)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "terminal_id": "POS-001",
  "business_day_id": "day-123",
  "status": "closed",
  "current_operator_id": "operator-123",
  "opening_balance": 100.0,
  "current_balance": 350.75,
  "expected_balance": 350.75,
  "physical_cash_amount": 350.75,
  "cash_difference": 0.0,
  "opened_at": "2025-05-23T08:00:00Z",
  "closed_at": "2025-05-23T18:00:00Z",
  "created_at": "2025-05-23T08:00:00Z",
  "updated_at": "2025-05-23T18:00:00Z",
  "notes": "Fechamento normal"
}
```

**Erros Possíveis**:
- 400 Bad Request: O caixa já está fechado
- 403 Forbidden: Apenas o operador atual ou um gerente pode fechar o caixa
- 404 Not Found: Caixa não encontrado
- 401 Unauthorized: Usuário não autenticado
- 403 Forbidden: Usuário sem permissão

### Registro de Operação

**Endpoint**: `POST /api/v1/cashier/{cashier_id}/operation`

**Permissão**: Varia conforme o tipo de operação

**Corpo da Requisição**:
```json
{
  "operation_type": "sale",
  "amount": 50.75,
  "operator_id": "operator-123",
  "payment_method": "credit_card",
  "related_entity_id": "sale-123",
  "notes": "Venda de combo"
}
```

**Resposta de Sucesso (200 OK)**:
```json
{
  "id": "op-123",
  "cashier_id": "123e4567-e89b-12d3-a456-426614174000",
  "operation_type": "sale",
  "amount": 50.75,
  "operator_id": "operator-123",
  "payment_method": "credit_card",
  "related_entity_id": "sale-123",
  "balance_before": 300.0,
  "balance_after": 350.75,
  "created_at": "2025-05-23T10:30:00Z",
  "notes": "Venda de combo"
}
```

**Erros Possíveis**:
- 400 Bad Request: O caixa está fechado
- 403 Forbidden: Apenas o operador atual ou um gerente pode registrar operações
- 403 Forbidden: Usuário sem permissão para o tipo de operação
- 404 Not Found: Caixa não encontrado
- 401 Unauthorized: Usuário não autenticado

### Registro de Retirada (Ruptura)

**Endpoint**: `POST /api/v1/cashier/{cashier_id}/withdrawal`

**Permissão**: `CASHIER_WITHDRAWAL`

**Corpo da Requisição**:
```json
{
  "amount": 100.0,
  "operator_id": "operator-123",
  "reason": "Pagamento de fornecedor",
  "authorized_by": "gerente_id",
  "notes": "Retirada autorizada pelo gerente"
}
```

**Resposta de Sucesso (200 OK)**:
```json
{
  "id": "op-456",
  "cashier_id": "123e4567-e89b-12d3-a456-426614174000",
  "operation_type": "withdrawal",
  "amount": 100.0,
  "operator_id": "operator-123",
  "payment_method": null,
  "related_entity_id": null,
  "balance_before": 350.75,
  "balance_after": 250.75,
  "created_at": "2025-05-23T14:30:00Z",
  "notes": "Retirada: Pagamento de fornecedor. Retirada autorizada pelo gerente"
}
```

**Erros Possíveis**:
- 400 Bad Request: O caixa está fechado
- 400 Bad Request: O valor da retirada excede o saldo atual
- 404 Not Found: Caixa não encontrado
- 401 Unauthorized: Usuário não autenticado
- 403 Forbidden: Usuário sem permissão

### Listagem de Caixas

**Endpoint**: `GET /api/v1/cashier`

**Permissão**: Qualquer usuário autenticado

**Parâmetros de Query**:
- `business_day_id`: Filtro por dia de operação
- `status`: Filtro por status (open/closed)
- `terminal_id`: Filtro por terminal
- `operator_id`: Filtro por operador
- `limit`: Limite de resultados (padrão: 10)
- `offset`: Deslocamento para paginação (padrão: 0)

**Resposta de Sucesso (200 OK)**:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "terminal_id": "POS-001",
    "business_day_id": "day-123",
    "status": "open",
    "current_operator_id": "operator-123",
    "current_balance": 350.75,
    "opened_at": "2025-05-23T08:00:00Z",
    "closed_at": null
  },
  {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "terminal_id": "POS-002",
    "business_day_id": "day-123",
    "status": "closed",
    "current_operator_id": "operator-456",
    "current_balance": 250.50,
    "opened_at": "2025-05-23T08:00:00Z",
    "closed_at": "2025-05-23T17:00:00Z"
  }
]
```

**Erros Possíveis**:
- 401 Unauthorized: Usuário não autenticado

### Caixas Atuais

**Endpoint**: `GET /api/v1/cashier/current`

**Permissão**: Qualquer usuário autenticado

**Resposta de Sucesso (200 OK)**:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "terminal_id": "POS-001",
    "business_day_id": "day-123",
    "status": "open",
    "current_operator_id": "operator-123",
    "current_balance": 350.75,
    "opened_at": "2025-05-23T08:00:00Z",
    "closed_at": null
  }
]
```

**Erros Possíveis**:
- 401 Unauthorized: Usuário não autenticado

### Detalhes do Caixa

**Endpoint**: `GET /api/v1/cashier/{cashier_id}`

**Permissão**: Qualquer usuário autenticado

**Resposta de Sucesso (200 OK)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "terminal_id": "POS-001",
  "business_day_id": "day-123",
  "status": "open",
  "current_operator_id": "operator-123",
  "opening_balance": 100.0,
  "current_balance": 350.75,
  "expected_balance": 350.75,
  "physical_cash_amount": null,
  "cash_difference": null,
  "opened_at": "2025-05-23T08:00:00Z",
  "closed_at": null,
  "created_at": "2025-05-23T08:00:00Z",
  "updated_at": "2025-05-23T10:30:00Z",
  "notes": "Caixa principal"
}
```

**Erros Possíveis**:
- 404 Not Found: Caixa não encontrado
- 401 Unauthorized: Usuário não autenticado

### Operações do Caixa

**Endpoint**: `GET /api/v1/cashier/{cashier_id}/operations`

**Permissão**: Qualquer usuário autenticado

**Parâmetros de Query**:
- `operation_type`: Filtro por tipo de operação
- `limit`: Limite de resultados (padrão: 50)
- `offset`: Deslocamento para paginação (padrão: 0)

**Resposta de Sucesso (200 OK)**:
```json
[
  {
    "id": "op-123",
    "cashier_id": "123e4567-e89b-12d3-a456-426614174000",
    "operation_type": "sale",
    "amount": 50.75,
    "operator_id": "operator-123",
    "payment_method": "credit_card",
    "related_entity_id": "sale-123",
    "balance_before": 300.0,
    "balance_after": 350.75,
    "created_at": "2025-05-23T10:30:00Z",
    "notes": "Venda de combo"
  },
  {
    "id": "op-122",
    "cashier_id": "123e4567-e89b-12d3-a456-426614174000",
    "operation_type": "sale",
    "amount": 200.0,
    "operator_id": "operator-123",
    "payment_method": "cash",
    "related_entity_id": "sale-122",
    "balance_before": 100.0,
    "balance_after": 300.0,
    "created_at": "2025-05-23T09:15:00Z",
    "notes": "Venda de refeição"
  }
]
```

**Erros Possíveis**:
- 404 Not Found: Caixa não encontrado
- 401 Unauthorized: Usuário não autenticado

### Relatório do Caixa

**Endpoint**: `GET /api/v1/cashier/{cashier_id}/report`

**Permissão**: `REPORT_READ`

**Resposta de Sucesso (200 OK)**:
```json
{
  "cashier_id": "123e4567-e89b-12d3-a456-426614174000",
  "terminal_id": "POS-001",
  "business_day_id": "day-123",
  "operator_id": "operator-123",
  "opening_balance": 100.0,
  "closing_balance": 450.75,
  "physical_cash_amount": 150.0,
  "cash_difference": 0.0,
  "total_sales": 500.0,
  "total_refunds": 50.0,
  "total_withdrawals": 100.0,
  "total_deposits": 0.0,
  "sales_by_payment_method": {
    "credit_card": 300.0,
    "debit_card": 150.0,
    "cash": 50.0
  },
  "operations_count": {
    "sale": 10,
    "refund": 1,
    "withdrawal": 1
  },
  "opened_at": "2025-05-23T08:00:00Z",
  "closed_at": "2025-05-23T18:00:00Z",
  "duration_minutes": 600
}
```

**Erros Possíveis**:
- 404 Not Found: Caixa não encontrado
- 401 Unauthorized: Usuário não autenticado
- 403 Forbidden: Usuário sem permissão

## Integração com Event Bus

O módulo de Caixa publica eventos no barramento de eventos (Event Bus) para notificar outros módulos sobre mudanças no estado do caixa e operações realizadas.

### Eventos Publicados

#### Abertura de Caixa (CASHIER_OPENED)

```json
{
  "type": "cashier.opened",
  "data": {
    "cashier": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "terminal_id": "POS-001",
      "business_day_id": "day-123",
      "operator_id": "operator-123",
      "opening_balance": 100.0,
      "opened_at": "2025-05-23T08:00:00Z"
    },
    "timestamp": 1621234567.89
  }
}
```

#### Fechamento de Caixa (CASHIER_CLOSED)

```json
{
  "type": "cashier.closed",
  "data": {
    "cashier": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "terminal_id": "POS-001",
      "business_day_id": "day-123",
      "operator_id": "operator-123",
      "opening_balance": 100.0,
      "closing_balance": 350.75,
      "physical_cash_amount": 350.75,
      "cash_difference": 0.0,
      "opened_at": "2025-05-23T08:00:00Z",
      "closed_at": "2025-05-23T18:00:00Z"
    },
    "timestamp": 1621234567.89
  }
}
```

#### Operação de Venda (SALE_COMPLETED)

```json
{
  "type": "sale.completed",
  "data": {
    "operation": {
      "id": "op-123",
      "cashier_id": "123e4567-e89b-12d3-a456-426614174000",
      "operation_type": "sale",
      "amount": 50.75,
      "operator_id": "operator-123",
      "payment_method": "credit_card",
      "related_entity_id": "sale-123",
      "balance_before": 300.0,
      "balance_after": 350.75,
      "created_at": "2025-05-23T10:30:00Z"
    },
    "cashier": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "terminal_id": "POS-001",
      "business_day_id": "day-123",
      "current_balance": 350.75
    },
    "timestamp": 1621234567.89
  }
}
```

#### Retirada de Caixa (CASHIER_WITHDRAWAL)

```json
{
  "type": "cashier.withdrawal",
  "data": {
    "operation": {
      "id": "op-456",
      "cashier_id": "123e4567-e89b-12d3-a456-426614174000",
      "operation_type": "withdrawal",
      "amount": 100.0,
      "operator_id": "operator-123",
      "payment_method": null,
      "related_entity_id": null,
      "balance_before": 350.75,
      "balance_after": 250.75,
      "created_at": "2025-05-23T14:30:00Z"
    },
    "cashier": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "terminal_id": "POS-001",
      "business_day_id": "day-123",
      "current_balance": 250.75
    },
    "timestamp": 1621234567.89
  }
}
```

### Consumo de Eventos

O módulo de Caixa também pode consumir eventos de outros módulos para atualizar seus dados. Por exemplo:

- Eventos de dia de operação (`DAY_OPENED`, `DAY_CLOSED`) para validar operações
- Eventos de pedido (`ORDER_CREATED`) para pré-processar informações de venda
- Eventos de autenticação (`USER_LOGGED_OUT`) para verificar operadores ativos

## Fluxos de Operação

### Fluxo de Abertura de Caixa

1. O operador inicia o caixa através do endpoint de abertura
2. O sistema verifica se o dia de operação está aberto
3. O sistema verifica se o operador já tem um caixa aberto
4. O sistema verifica se o terminal já tem um caixa aberto
5. O sistema cria um novo caixa com status "aberto" e saldo inicial
6. O sistema registra uma operação de abertura
7. O sistema publica o evento `CASHIER_OPENED`
8. Outros módulos são notificados e podem iniciar suas operações

### Fluxo de Venda

1. O operador registra uma venda através do endpoint de operação
2. O sistema verifica se o caixa está aberto
3. O sistema verifica se o operador é o mesmo que está operando o caixa
4. O sistema registra a operação de venda e atualiza o saldo do caixa
5. O sistema publica o evento `SALE_COMPLETED`
6. Outros módulos são notificados e podem atualizar seus dados

### Fluxo de Retirada (Ruptura)

1. O operador solicita uma retirada através do endpoint de retirada
2. O sistema verifica se o caixa está aberto
3. O sistema verifica se o operador tem permissão para retiradas
4. O sistema verifica se há saldo suficiente para a retirada
5. O sistema registra a operação de retirada e atualiza o saldo do caixa
6. O sistema publica o evento `CASHIER_WITHDRAWAL`
7. Outros módulos são notificados e podem atualizar seus dados

### Fluxo de Fechamento de Caixa

1. O operador solicita o fechamento do caixa através do endpoint de fechamento
2. O sistema verifica se o caixa está aberto
3. O sistema verifica se o operador é o mesmo que está operando o caixa ou se é um gerente
4. O sistema calcula a diferença entre o valor físico informado e o saldo esperado
5. O sistema registra uma operação de fechamento
6. O sistema atualiza o caixa para status "fechado"
7. O sistema publica o evento `CASHIER_CLOSED`
8. Outros módulos são notificados e podem atualizar seus dados

## Integração com Outros Módulos

### Módulo de Abertura/Fechamento de Dia

- O módulo de Caixa verifica se há um dia aberto antes de permitir a abertura de um caixa
- O módulo de Dia verifica se todos os caixas estão fechados antes de permitir o fechamento do dia
- Eventos de abertura e fechamento de dia são consumidos pelo módulo de Caixa

### Módulo de Vendas

- Operações de venda são registradas no caixa
- O módulo de Vendas pode consultar o status dos caixas antes de permitir vendas
- Eventos de venda são publicados para atualização de relatórios

### Módulo de Relatórios

- O módulo de Caixa fornece dados detalhados para relatórios financeiros
- Relatórios de caixa podem ser gerados a qualquer momento para caixas abertos ou fechados
- Dados históricos de operações são mantidos para auditoria

## Considerações de Implementação

### Persistência de Dados

O módulo utiliza um sistema de persistência baseado em arquivos JSON para armazenar os dados dos caixas e operações. Em um ambiente de produção, isso seria substituído por um banco de dados relacional ou NoSQL.

### Concorrência

O módulo implementa verificações para evitar condições de corrida, como tentar registrar operações em um caixa já fechado ou tentar abrir múltiplos caixas para o mesmo operador.

### Segurança

O acesso aos endpoints é protegido por autenticação JWT e autorização baseada em permissões, garantindo que apenas usuários autorizados possam realizar operações críticas como retiradas de dinheiro.

## Exemplos de Uso

### Abertura de Caixa pelo Operador

```javascript
// Frontend (exemplo em JavaScript)
async function openCashier() {
  const token = getAuthToken(); // Obter token de autenticação
  const businessDayId = getCurrentBusinessDayId(); // Obter ID do dia atual
  
  const response = await fetch('/api/v1/cashier', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      terminal_id: getTerminalId(),
      business_day_id: businessDayId,
      opening_balance: 100.0,
      operator_id: getCurrentUserId(),
      notes: "Caixa principal - Turno da manhã"
    })
  });
  
  if (response.ok) {
    const cashier = await response.json();
    showSuccessMessage(`Caixa aberto com sucesso: ${cashier.id}`);
    updateCashierDisplay(cashier);
  } else {
    const error = await response.json();
    showErrorMessage(`Erro ao abrir o caixa: ${error.detail}`);
  }
}
```

### Registro de Venda

```javascript
// Frontend (exemplo em JavaScript)
async function registerSale(saleData) {
  const token = getAuthToken(); // Obter token de autenticação
  const cashierId = getCurrentCashierId(); // Obter ID do caixa atual
  
  const response = await fetch(`/api/v1/cashier/${cashierId}/operation`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      operation_type: "sale",
      amount: saleData.total,
      operator_id: getCurrentUserId(),
      payment_method: saleData.paymentMethod,
      related_entity_id: saleData.id,
      notes: `Venda #${saleData.id}`
    })
  });
  
  if (response.ok) {
    const operation = await response.json();
    updateCashierBalance(operation.balance_after);
    return operation;
  } else {
    const error = await response.json();
    showErrorMessage(`Erro ao registrar venda: ${error.detail}`);
    throw new Error(error.detail);
  }
}
```

### Retirada de Dinheiro (Ruptura)

```javascript
// Frontend (exemplo em JavaScript)
async function withdrawCash(amount, reason) {
  const token = getAuthToken(); // Obter token de autenticação
  const cashierId = getCurrentCashierId(); // Obter ID do caixa atual
  
  // Verificar se o usuário tem permissão para retiradas
  if (!currentUserHasPermission('CASHIER_WITHDRAWAL')) {
    showErrorMessage('Você não tem permissão para realizar retiradas.');
    return;
  }
  
  // Solicitar autorização do gerente para retiradas acima de um valor
  let authorizedBy = null;
  if (amount > 200) {
    authorizedBy = await requestManagerAuthorization();
    if (!authorizedBy) {
      showErrorMessage('Retirada não autorizada pelo gerente.');
      return;
    }
  }
  
  const response = await fetch(`/api/v1/cashier/${cashierId}/withdrawal`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: amount,
      operator_id: getCurrentUserId(),
      reason: reason,
      authorized_by: authorizedBy,
      notes: `Retirada autorizada para: ${reason}`
    })
  });
  
  if (response.ok) {
    const operation = await response.json();
    showSuccessMessage(`Retirada de R$ ${amount.toFixed(2)} realizada com sucesso.`);
    updateCashierBalance(operation.balance_after);
    printWithdrawalReceipt(operation);
  } else {
    const error = await response.json();
    showErrorMessage(`Erro ao realizar retirada: ${error.detail}`);
  }
}
```

### Fechamento de Caixa

```javascript
// Frontend (exemplo em JavaScript)
async function closeCashier(physicalCashAmount) {
  const token = getAuthToken(); // Obter token de autenticação
  const cashierId = getCurrentCashierId(); // Obter ID do caixa atual
  
  // Obter detalhes do caixa para mostrar saldo esperado
  const cashierResponse = await fetch(`/api/v1/cashier/${cashierId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const cashier = await cashierResponse.json();
  const expectedCash = cashier.expected_balance;
  const difference = physicalCashAmount - expectedCash;
  
  // Confirmar fechamento com o operador
  const confirmMessage = `
    Saldo esperado em dinheiro: R$ ${expectedCash.toFixed(2)}
    Dinheiro físico contado: R$ ${physicalCashAmount.toFixed(2)}
    Diferença: R$ ${difference.toFixed(2)}
    
    Deseja confirmar o fechamento do caixa?
  `;
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  // Fechar o caixa
  const response = await fetch(`/api/v1/cashier/${cashierId}/close`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      operator_id: getCurrentUserId(),
      physical_cash_amount: physicalCashAmount,
      notes: `Fechamento com diferença de R$ ${difference.toFixed(2)}`
    })
  });
  
  if (response.ok) {
    const closedCashier = await response.json();
    showSuccessMessage(`Caixa fechado com sucesso. Diferença: R$ ${closedCashier.cash_difference.toFixed(2)}`);
    
    // Gerar e imprimir relatório de fechamento
    const reportResponse = await fetch(`/api/v1/cashier/${cashierId}/report`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (reportResponse.ok) {
      const report = await reportResponse.json();
      printClosingReport(report);
    }
    
    // Redirecionar para tela inicial
    navigateToHome();
  } else {
    const error = await response.json();
    showErrorMessage(`Erro ao fechar o caixa: ${error.detail}`);
  }
}
```

## Conclusão

O Módulo de Caixa é um componente crítico do sistema POS Moderno, fornecendo controle sobre as operações financeiras do restaurante. Ele garante a integridade das transações, com regras claras para abertura, operação e fechamento de caixas, além de fornecer relatórios detalhados para análise financeira.

A integração com o Event Bus permite que outros módulos sejam notificados sobre mudanças no estado dos caixas e operações realizadas, possibilitando uma arquitetura desacoplada e resiliente. As regras de negócio implementadas garantem a segurança das operações financeiras e a consistência dos dados.
