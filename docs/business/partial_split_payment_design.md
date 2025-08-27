# Design de Pagamentos Parciais e Divisão de Conta

## Visão Geral

Este documento detalha o design e a implementação do sistema de pagamentos parciais e divisão de conta para o POS Modern. Esta funcionalidade permitirá que os clientes paguem pedidos de forma parcial, utilizando diferentes métodos de pagamento, e também dividam o valor total entre múltiplas pessoas.

## Requisitos Funcionais

1. **Pagamentos Parciais**
   - Permitir múltiplos pagamentos para um único pedido
   - Suportar diferentes métodos de pagamento em um mesmo pedido
   - Controlar automaticamente o valor restante a ser pago
   - Permitir pagamentos em momentos diferentes (sessões de pagamento)

2. **Divisão de Conta**
   - Suportar divisão igualitária entre N pessoas
   - Permitir divisão personalizada (valores diferentes por pessoa)
   - Associar itens específicos a pessoas específicas
   - Calcular automaticamente taxas de serviço e descontos proporcionalmente

3. **Integração com Assentos**
   - Associar itens a assentos específicos para facilitar a divisão
   - Permitir agrupamento de assentos para pagamento conjunto
   - Visualizar consumo por assento

4. **Interface de Usuário**
   - Exibir claramente o valor total, valor pago e valor restante
   - Permitir visualização do histórico de pagamentos parciais
   - Interface intuitiva para divisão de conta
   - Suporte a operações via touch em dispositivos móveis e terminais

## Modelo de Dados

### Extensões Necessárias

1. **PaymentSession**
   - Representa uma sessão de pagamento para um pedido
   - Pode conter múltiplos pagamentos parciais
   - Controla o valor total, valor pago e valor restante

2. **PartialPayment**
   - Estende o modelo Payment existente
   - Adiciona referência à sessão de pagamento
   - Inclui informações sobre a parte do pedido que está sendo paga

3. **BillSplit**
   - Define como um pedido será dividido
   - Suporta diferentes métodos de divisão
   - Associa partes do pedido a pessoas ou assentos

4. **SeatPayment**
   - Associa pagamentos a assentos específicos
   - Permite rastrear quem pagou o quê

## Diagrama de Entidades

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│     Order       │──1:N─┤ PaymentSession  │──1:N─┤  PartialPayment │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                        │                        │
        │                        │                        │
        │                        │                        │
        │                  ┌─────┴─────┐                  │
        │                  │ BillSplit │                  │
        │                  └─────┬─────┘                  │
        │                        │                        │
        │                        │                        │
┌───────┴───────┐          ┌─────┴─────┐          ┌───────┴───────┐
│  OrderItem    │──────────┤    Seat   │──────────┤  SeatPayment  │
└───────────────┘          └───────────┘          └───────────────┘
```

## Fluxos de Pagamento

### Pagamento Parcial

1. Cliente solicita pagamento de parte do pedido
2. Sistema cria uma nova sessão de pagamento se necessário
3. Sistema registra o pagamento parcial associado à sessão
4. Sistema atualiza o valor restante a ser pago
5. Se valor restante = 0, pedido é marcado como pago

### Divisão Igualitária

1. Cliente solicita divisão igualitária entre N pessoas
2. Sistema calcula o valor por pessoa
3. Sistema cria uma sessão de pagamento
4. Para cada pessoa, sistema registra um pagamento parcial
5. Sistema atualiza o valor restante após cada pagamento

### Divisão por Assento

1. Itens do pedido são associados a assentos durante o pedido
2. Cliente solicita pagamento por assento
3. Sistema calcula o valor por assento
4. Sistema cria uma sessão de pagamento
5. Para cada assento, sistema registra um pagamento parcial
6. Sistema atualiza o valor restante após cada pagamento

### Divisão Personalizada

1. Cliente especifica valores personalizados para cada pessoa
2. Sistema valida que a soma dos valores = valor total
3. Sistema cria uma sessão de pagamento
4. Para cada pessoa, sistema registra um pagamento parcial com o valor especificado
5. Sistema atualiza o valor restante após cada pagamento

## Implementação Backend

1. **Novos Modelos**
   - Criar modelos para PaymentSession, BillSplit, SeatPayment
   - Estender modelo Payment existente para suportar pagamentos parciais

2. **Serviços**
   - Implementar PaymentSessionService para gerenciar sessões de pagamento
   - Implementar BillSplitService para cálculos de divisão
   - Estender PaymentService para suportar pagamentos parciais

3. **APIs**
   - Criar endpoints para gerenciar sessões de pagamento
   - Criar endpoints para diferentes tipos de divisão
   - Criar endpoints para pagamentos por assento

## Implementação Frontend

1. **Componentes de UI**
   - Tela de resumo de conta com opções de pagamento
   - Interface para seleção de método de divisão
   - Visualização de assentos e itens associados
   - Controles para pagamento parcial

2. **Fluxos de Usuário**
   - Fluxo para pagamento parcial
   - Fluxo para divisão igualitária
   - Fluxo para divisão por assento
   - Fluxo para divisão personalizada

3. **Integrações**
   - Integração com gateways de pagamento
   - Integração com módulo de garçom
   - Integração com módulo de mesas e assentos

## Considerações de Segurança

1. Validação rigorosa de valores para evitar inconsistências
2. Transações atômicas para garantir integridade dos dados
3. Registro detalhado de todas as operações para auditoria
4. Controle de acesso baseado em função para operações sensíveis

## Testes

1. **Testes Unitários**
   - Testes para cálculos de divisão
   - Testes para controle de valor restante
   - Testes para validação de pagamentos parciais

2. **Testes de Integração**
   - Testes de fluxo completo de pagamento parcial
   - Testes de divisão de conta
   - Testes de integração com gateways de pagamento

3. **Testes de UI**
   - Testes de usabilidade da interface de divisão
   - Testes de responsividade em diferentes dispositivos
   - Testes de acessibilidade

## Métricas de Sucesso

1. Tempo médio para completar uma divisão de conta
2. Taxa de erro em pagamentos parciais
3. Satisfação do usuário com o processo de divisão
4. Redução no tempo de fechamento de mesa

## Próximos Passos

1. Implementar modelos de dados estendidos
2. Desenvolver serviços de backend
3. Criar APIs para suporte a pagamentos parciais
4. Implementar interface de usuário
5. Realizar testes abrangentes
6. Documentar casos de uso e exemplos
