# Diagrama de Integração do Módulo de Contas

Este documento descreve o design e a integração do Módulo de Contas com os demais módulos do sistema POS Moderno, com foco especial na integração com pedidos (orders) e fornecedores (suppliers).

## 1. Visão Geral

O Módulo de Contas é responsável por gerenciar todas as transações financeiras do estabelecimento, incluindo:

- Contas a receber (duplicatas)
- Contas a pagar (fornecedores e funcionários)
- Fluxo de caixa
- Relatórios financeiros

## 2. Integração com Pedidos (Orders)

### 2.1 Fluxo de Receitas

Quando um pedido é finalizado no sistema, ele gera automaticamente uma entrada no módulo de contas:

```
Pedido Finalizado → Evento "order_finalized" → Módulo de Contas → Criação de Receivable
```

#### Detalhes da Integração:

1. **Pedido à Vista**:
   - Cria uma `Receivable` com `status = PAID`
   - Registra uma `Transaction` de entrada na conta apropriada
   - Atualiza o saldo da conta

2. **Pedido a Prazo**:
   - Cria uma `Receivable` com `status = PENDING`
   - Define `due_date` conforme condições negociadas
   - Quando pago, atualiza para `status = PAID` e registra a `Transaction`

3. **Pedido Parcialmente Pago**:
   - Cria uma `Receivable` com `status = PARTIALLY_PAID`
   - Registra uma `Transaction` parcial
   - Mantém controle do saldo restante

### 2.2 Mapeamento de Dados

| Campo em Order | Campo em Receivable | Observação |
|----------------|---------------------|------------|
| id | source_id | Referência ao pedido original |
| total_amount | amount | Valor total do pedido |
| created_at | issue_date | Data de emissão |
| payment_due_date | due_date | Data de vencimento |
| customer_id | customer_id | Cliente associado |
| payment_method | payment_method | Método de pagamento |

## 3. Integração com Fornecedores (Suppliers)

### 3.1 Fluxo de Despesas

Quando um pedido de compra é recebido, gera automaticamente uma conta a pagar:

```
Pedido de Compra Recebido → Evento "purchase_order_received" → Módulo de Contas → Criação de Payable
```

#### Detalhes da Integração:

1. **Compra à Vista**:
   - Cria um `Payable` com `status = PAID`
   - Registra uma `Transaction` de saída na conta apropriada
   - Atualiza o saldo da conta

2. **Compra a Prazo**:
   - Cria um `Payable` com `status = PENDING`
   - Define `due_date` conforme condições negociadas com fornecedor
   - Quando pago, atualiza para `status = PAID` e registra a `Transaction`

### 3.2 Mapeamento de Dados

| Campo em PurchaseOrder | Campo em Payable | Observação |
|------------------------|------------------|------------|
| id | source_id | Referência ao pedido de compra |
| total_amount | amount | Valor total da compra |
| created_at | issue_date | Data de emissão |
| payment_term_days | due_date | Calculado a partir do prazo |
| supplier_id | supplier_id | Fornecedor associado |

## 4. Integração com Funcionários (Employees)

### 4.1 Fluxo de Pagamento de Salários

O pagamento de salários é gerenciado como contas a pagar especiais:

```
Folha de Pagamento → Módulo de Contas → Criação de Payables para cada funcionário
```

#### Detalhes da Integração:

1. **Salário Regular**:
   - Cria um `Payable` para cada funcionário
   - Define `employee_id` para associar ao funcionário
   - Utiliza `source_type = EMPLOYEE` para identificar como salário

2. **Pagamento por Entrega** (para entregadores):
   - Agrega todas as entregas do período
   - Calcula o valor total devido
   - Cria um `Payable` com o valor agregado

### 4.2 Mapeamento de Dados

| Campo em Employee | Campo em Payable | Observação |
|-------------------|------------------|------------|
| id | employee_id | Funcionário associado |
| base_salary + componentes | amount | Valor total do salário |
| payment_frequency | due_date | Determina a data de vencimento |

## 5. Fluxo de Dados e Eventos

### 5.1 Eventos Publicados pelo Módulo de Contas

- `receivable_created`: Quando uma nova conta a receber é criada
- `receivable_paid`: Quando uma conta a receber é paga
- `payable_created`: Quando uma nova conta a pagar é criada
- `payable_paid`: Quando uma conta a pagar é paga
- `transaction_created`: Quando uma transação é registrada
- `account_balance_updated`: Quando o saldo de uma conta é atualizado

### 5.2 Eventos Consumidos pelo Módulo de Contas

- `order_finalized`: Quando um pedido é finalizado (do módulo de Pedidos)
- `purchase_order_received`: Quando um pedido de compra é recebido (do módulo de Fornecedores)
- `employee_salary_due`: Quando um salário deve ser pago (do módulo de Funcionários)

## 6. Estrutura de Dados

### 6.1 Contas (Accounts)

As contas representam os diferentes repositórios financeiros:

- **Caixa**: Para operações em dinheiro
- **Banco**: Para operações bancárias
- **Cartão de Crédito**: Para pagamentos com cartão

### 6.2 Transações (Transactions)

Cada movimentação financeira é registrada como uma transação:

- **Receitas**: Entradas de dinheiro
- **Despesas**: Saídas de dinheiro
- **Transferências**: Movimentação entre contas

### 6.3 Contas a Receber (Receivables)

Representam valores a receber de clientes:

- Vendas a prazo
- Parcelamentos
- Outras receitas pendentes

### 6.4 Contas a Pagar (Payables)

Representam valores a pagar:

- Fornecedores
- Salários
- Despesas operacionais
- Impostos

## 7. Regras de Negócio

### 7.1 Regras para Contas a Receber

1. Uma conta a receber é criada automaticamente quando um pedido é finalizado
2. O status inicial depende do método de pagamento
3. Contas a receber podem ser agrupadas por cliente
4. Pagamentos parciais são permitidos
5. Juros podem ser aplicados em contas vencidas

### 7.2 Regras para Contas a Pagar

1. Uma conta a pagar é criada quando um pedido de compra é recebido
2. Contas a pagar de salários são geradas automaticamente conforme a frequência de pagamento
3. Pagamentos antecipados podem ter desconto
4. Pagamentos em atraso podem ter multa
5. Aprovação pode ser necessária para pagamentos acima de determinado valor

### 7.3 Regras para Transações

1. Toda transação deve estar associada a uma conta
2. O saldo da conta é atualizado imediatamente após a transação
3. Transações não podem ser excluídas, apenas estornadas
4. Cada transação deve ter uma categoria para fins de relatório

## 8. Relatórios Financeiros

O módulo de contas fornece os seguintes relatórios:

1. **Fluxo de Caixa**: Entradas e saídas por período
2. **Contas a Receber**: Listagem de duplicatas pendentes
3. **Contas a Pagar**: Listagem de pagamentos pendentes
4. **Demonstrativo de Resultados**: Receitas, despesas e lucro
5. **Relatório de Inadimplência**: Contas vencidas
6. **Previsão Financeira**: Projeção de receitas e despesas

## 9. Considerações de Segurança

1. Acesso restrito baseado em permissões
2. Registro de auditoria para todas as operações
3. Validação rigorosa de dados
4. Backup automático de dados financeiros
5. Criptografia de dados sensíveis

## 10. Testes

Para garantir a robustez do módulo de contas, serão implementados os seguintes testes:

### 10.1 Testes Unitários

- Teste de criação de contas
- Teste de criação de transações
- Teste de atualização de saldos
- Teste de validação de regras de negócio

### 10.2 Testes de Integração

- Teste de integração com o módulo de Pedidos
- Teste de integração com o módulo de Fornecedores
- Teste de integração com o módulo de Funcionários
- Teste de geração de relatórios

### 10.3 Testes de Carga

- Teste de desempenho com grande volume de transações
- Teste de concorrência em operações simultâneas

## 11. Próximos Passos

1. Implementação dos modelos de dados
2. Implementação dos serviços de negócio
3. Implementação das APIs
4. Integração com os demais módulos
5. Desenvolvimento de testes
6. Documentação detalhada
