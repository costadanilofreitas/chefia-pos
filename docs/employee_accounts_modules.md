# Documentação do Módulo de Funcionários e Contas

Este documento descreve a implementação e integração dos módulos de Funcionários (Employee) e Contas (Accounts) no sistema POS Modern.

## Módulo de Funcionários

### Visão Geral

O módulo de Funcionários gerencia o cadastro e controle de colaboradores do estabelecimento, com suporte a diferentes funções (operador, garçom, entregador, etc.), tipos de vínculo (fixo ou temporário), controle de ponto, avaliações de desempenho e integração com o módulo financeiro para pagamentos.

### Modelos de Dados

- **Employee**: Representa um funcionário com dados pessoais, função, tipo de vínculo, salário, etc.
- **DeliveryAssignment**: Associação de um entregador a pedidos de delivery
- **EmployeeAttendance**: Registro de ponto (entrada/saída) de funcionários
- **EmployeePerformance**: Avaliações de desempenho periódicas

### Funcionalidades Principais

1. **Cadastro e Gerenciamento de Funcionários**
   - Cadastro completo com dados pessoais e profissionais
   - Controle de funções e permissões
   - Gestão de vínculos (fixo/temporário)
   - Histórico de alterações

2. **Controle de Ponto**
   - Registro de entrada e saída
   - Cálculo de horas trabalhadas
   - Controle de horas extras
   - Relatórios de presença

3. **Avaliação de Desempenho**
   - Avaliações periódicas
   - Métricas personalizáveis
   - Histórico de avaliações

4. **Integração com Delivery**
   - Atribuição de pedidos a entregadores
   - Controle de status de entregas
   - Métricas de desempenho de entrega

5. **Integração com Financeiro**
   - Geração automática de contas a pagar para salários
   - Controle de adiantamentos
   - Histórico de pagamentos

### API Endpoints

#### Funcionários
- `POST /api/v1/employees/` - Criar funcionário
- `GET /api/v1/employees/{employee_id}` - Obter funcionário
- `PUT /api/v1/employees/{employee_id}` - Atualizar funcionário
- `DELETE /api/v1/employees/{employee_id}` - Excluir funcionário (inativar)
- `GET /api/v1/employees/` - Listar funcionários com filtros

#### Atribuições de Entrega
- `POST /api/v1/delivery-assignments/` - Criar atribuição
- `PUT /api/v1/delivery-assignments/{assignment_id}` - Atualizar atribuição
- `GET /api/v1/delivery-assignments/{assignment_id}` - Obter atribuição
- `GET /api/v1/employees/{employee_id}/delivery-assignments` - Listar atribuições de um entregador

#### Registro de Ponto
- `POST /api/v1/attendance/` - Registrar ponto
- `PUT /api/v1/attendance/{attendance_id}` - Atualizar registro
- `GET /api/v1/attendance/{attendance_id}` - Obter registro
- `GET /api/v1/employees/{employee_id}/attendance` - Listar registros de um funcionário

#### Avaliação de Desempenho
- `POST /api/v1/performance/` - Criar avaliação
- `PUT /api/v1/performance/{evaluation_id}` - Atualizar avaliação
- `GET /api/v1/performance/{evaluation_id}` - Obter avaliação
- `GET /api/v1/employees/{employee_id}/performance` - Listar avaliações de um funcionário

#### Salários
- `POST /api/v1/employees/generate-salary-payables` - Gerar contas a pagar para salários

#### Estatísticas
- `GET /api/v1/employees/statistics` - Obter estatísticas sobre funcionários

## Módulo de Contas

### Visão Geral

O módulo de Contas gerencia todas as operações financeiras do estabelecimento, incluindo contas bancárias, transações, contas a receber, contas a pagar, transações recorrentes e relatórios financeiros.

### Modelos de Dados

- **Account**: Representa uma conta financeira (caixa, banco, etc.)
- **Transaction**: Registro de movimentação financeira
- **Receivable**: Conta a receber
- **Payable**: Conta a pagar
- **RecurringTransaction**: Transação recorrente (assinaturas, mensalidades, etc.)
- **FinancialReport**: Relatório financeiro gerado

### Funcionalidades Principais

1. **Gestão de Contas**
   - Cadastro e controle de contas financeiras
   - Controle de saldo
   - Transferências entre contas

2. **Transações Financeiras**
   - Registro de receitas e despesas
   - Categorização de transações
   - Anexos de comprovantes

3. **Contas a Receber**
   - Geração automática a partir de pedidos
   - Controle de vencimentos
   - Registro de pagamentos
   - Notificações de atraso

4. **Contas a Pagar**
   - Registro de fornecedores e despesas
   - Controle de vencimentos
   - Registro de pagamentos
   - Integração com salários de funcionários

5. **Transações Recorrentes**
   - Configuração de receitas/despesas periódicas
   - Geração automática de transações
   - Suporte a diferentes periodicidades

6. **Relatórios Financeiros**
   - Fluxo de caixa
   - Demonstrativo de resultados
   - Relatórios de contas a receber/pagar
   - Exportação em diferentes formatos

### API Endpoints

#### Contas
- `POST /api/v1/accounts/` - Criar conta
- `GET /api/v1/accounts/{account_id}` - Obter conta
- `PUT /api/v1/accounts/{account_id}` - Atualizar conta
- `GET /api/v1/accounts/` - Listar contas
- `POST /api/v1/accounts/{account_id}/balance` - Atualizar saldo

#### Transações
- `POST /api/v1/transactions/` - Criar transação
- `GET /api/v1/transactions/{transaction_id}` - Obter transação
- `PUT /api/v1/transactions/{transaction_id}` - Atualizar transação
- `GET /api/v1/transactions/` - Listar transações

#### Contas a Receber
- `POST /api/v1/receivables/` - Criar conta a receber
- `GET /api/v1/receivables/{receivable_id}` - Obter conta a receber
- `PUT /api/v1/receivables/{receivable_id}` - Atualizar conta a receber
- `GET /api/v1/receivables/` - Listar contas a receber

#### Contas a Pagar
- `POST /api/v1/payables/` - Criar conta a pagar
- `GET /api/v1/payables/{payable_id}` - Obter conta a pagar
- `PUT /api/v1/payables/{payable_id}` - Atualizar conta a pagar
- `GET /api/v1/payables/` - Listar contas a pagar

#### Transações Recorrentes
- `POST /api/v1/recurring-transactions/` - Criar transação recorrente
- `GET /api/v1/recurring-transactions/{transaction_id}` - Obter transação recorrente
- `PUT /api/v1/recurring-transactions/{transaction_id}` - Atualizar transação recorrente
- `GET /api/v1/recurring-transactions/` - Listar transações recorrentes
- `POST /api/v1/recurring-transactions/process` - Processar transações recorrentes

#### Relatórios
- `POST /api/v1/reports/` - Criar relatório
- `GET /api/v1/reports/{report_id}` - Obter relatório
- `GET /api/v1/reports/` - Listar relatórios
- `GET /api/v1/financial-summary` - Obter resumo financeiro

#### Integração com Pedidos
- `POST /api/v1/orders/{order_id}/receivable` - Criar conta a receber a partir de pedido

#### Integração com Compras
- `POST /api/v1/purchases/{purchase_id}/payable` - Criar conta a pagar a partir de compra

#### Integração com Funcionários
- `POST /api/v1/employees/{employee_id}/payable` - Criar conta a pagar para funcionário

## Integrações

### Integração entre Funcionários e Contas

O módulo de Funcionários se integra com o módulo de Contas para:

1. **Geração de Salários**
   - Criação automática de contas a pagar para salários
   - Suporte a diferentes periodicidades (mensal, quinzenal)
   - Controle de adiantamentos

2. **Comissões**
   - Cálculo de comissões baseado em vendas
   - Integração com o módulo de Pedidos
   - Pagamento automático ou manual

### Integração entre Pedidos e Contas

O módulo de Pedidos se integra com o módulo de Contas para:

1. **Contas a Receber**
   - Geração automática de contas a receber a partir de pedidos
   - Suporte a diferentes formas de pagamento
   - Controle de status (pago, pendente, etc.)

### Integração entre Fornecedores e Contas

O módulo de Fornecedores se integra com o módulo de Contas para:

1. **Contas a Pagar**
   - Geração de contas a pagar a partir de compras
   - Controle de vencimentos
   - Histórico de pagamentos por fornecedor

## Fluxos de Trabalho

### Contratação de Funcionário

1. Cadastro do funcionário no sistema
2. Definição de função, salário e tipo de vínculo
3. Configuração de permissões de acesso
4. Integração com o módulo financeiro para pagamentos

### Pagamento de Salários

1. Geração automática ou manual de contas a pagar
2. Aprovação dos valores
3. Registro do pagamento
4. Atualização do histórico financeiro do funcionário

### Registro de Venda e Recebimento

1. Criação do pedido
2. Finalização com forma de pagamento
3. Geração automática de conta a receber (se aplicável)
4. Registro do recebimento
5. Atualização do saldo da conta

### Compra de Fornecedor e Pagamento

1. Registro da compra
2. Geração de conta a pagar
3. Controle de vencimento
4. Registro do pagamento
5. Atualização do saldo da conta

## Considerações de Segurança

- Todas as operações financeiras exigem permissões específicas
- Histórico completo de alterações para auditoria
- Validações rigorosas para evitar inconsistências
- Controle granular de acesso por função

## Próximos Passos

1. **Implementação de Interface de Usuário**
   - Telas de gerenciamento de funcionários
   - Dashboard financeiro
   - Relatórios visuais

2. **Testes Automatizados**
   - Testes unitários para validação de regras de negócio
   - Testes de integração para fluxos completos
   - Testes de carga para operações financeiras em massa

3. **Melhorias Futuras**
   - Integração com sistemas bancários
   - Suporte a múltiplas moedas
   - Conciliação bancária automática
   - Folha de pagamento completa
