# Documentação do Módulo de Inventário

## Visão Geral

O módulo de inventário do POS Modern fornece um sistema completo para gerenciamento de estoque, incluindo rastreamento de itens, transações, perdas e contagens de inventário. O módulo é totalmente integrado com o sistema financeiro, permitindo o lançamento automático de perdas e ajustes de estoque no sistema contábil.

## Funcionalidades Principais

### Gerenciamento de Itens de Inventário
- Cadastro e manutenção de itens de estoque
- Categorização e classificação de produtos
- Definição de níveis mínimos e pontos de reposição
- Valorização de estoque em tempo real

### Transações de Inventário
- Registro de compras, vendas, ajustes e transferências
- Fluxo de aprovação para transações críticas
- Histórico completo de movimentações
- Rastreabilidade de todas as alterações de estoque

### Gestão de Perdas
- Registro detalhado de perdas por tipo (quebra, expiração, etc.)
- Fluxo de aprovação para perdas reportadas
- Integração automática com o sistema financeiro
- Relatórios de análise de perdas

### Contagens de Inventário
- Suporte a contagens físicas periódicas
- Cálculo automático de variações
- Ajustes automáticos após aprovação
- Histórico de contagens para auditoria

### Integração Financeira
- Lançamento automático de perdas no sistema financeiro
- Valorização de estoque refletida na contabilidade
- Rastreamento de custos de produtos
- Suporte a diferentes métodos de custeio

## Arquitetura

O módulo de inventário segue a arquitetura padrão do sistema POS Modern, com separação clara entre modelos, serviços, rotas e eventos:

- **Modelos**: Definição das estruturas de dados usando Pydantic
- **Serviços**: Lógica de negócio e operações de inventário
- **Rotas**: Endpoints da API REST para acesso às funcionalidades
- **Eventos**: Sistema de publicação/assinatura para integrações

## Fluxo de Trabalho para Perdas de Inventário

1. **Registro da Perda**: Um usuário registra uma perda de inventário, especificando o item, quantidade, motivo e observações.
2. **Criação de Transação Pendente**: O sistema cria automaticamente uma transação de inventário pendente.
3. **Aprovação**: Um usuário com permissões adequadas aprova a perda.
4. **Atualização de Estoque**: O sistema reduz o estoque do item.
5. **Lançamento Financeiro**: O sistema cria automaticamente um lançamento financeiro correspondente à perda.
6. **Notificação**: Eventos são publicados para notificar outros módulos sobre a perda.

## Integração com Outros Módulos

- **Módulo Financeiro**: Lançamentos automáticos de perdas e ajustes
- **Módulo de Pedidos**: Atualização automática de estoque após vendas
- **Módulo de Compras**: Atualização automática de estoque após recebimentos
- **Dashboard**: Visualização de níveis de estoque e alertas

## API REST

O módulo expõe uma API REST completa para todas as operações de inventário:

- `GET /inventory/items`: Lista todos os itens de inventário
- `POST /inventory/items`: Cria um novo item de inventário
- `GET /inventory/items/{item_id}`: Obtém detalhes de um item específico
- `PUT /inventory/items/{item_id}`: Atualiza um item de inventário
- `DELETE /inventory/items/{item_id}`: Remove um item de inventário (soft delete)

- `GET /inventory/transactions`: Lista transações de inventário
- `POST /inventory/transactions`: Cria uma nova transação
- `GET /inventory/transactions/{transaction_id}`: Obtém detalhes de uma transação
- `POST /inventory/transactions/{transaction_id}/approve`: Aprova uma transação
- `POST /inventory/transactions/{transaction_id}/reject`: Rejeita uma transação

- `GET /inventory/losses`: Lista perdas de inventário
- `POST /inventory/losses`: Registra uma nova perda
- `GET /inventory/losses/{loss_id}`: Obtém detalhes de uma perda
- `POST /inventory/losses/{loss_id}/approve`: Aprova uma perda
- `POST /inventory/losses/{loss_id}/reject`: Rejeita uma perda

- `GET /inventory/counts`: Lista contagens de inventário
- `POST /inventory/counts`: Cria uma nova contagem
- `GET /inventory/counts/{count_id}`: Obtém detalhes de uma contagem
- `POST /inventory/counts/{count_id}/submit`: Submete uma contagem para aprovação
- `POST /inventory/counts/{count_id}/approve`: Aprova uma contagem
- `POST /inventory/counts/{count_id}/reject`: Rejeita uma contagem

## Eventos

O módulo publica os seguintes eventos para integração com outros módulos:

- `item_created`: Quando um novo item é criado
- `item_updated`: Quando um item é atualizado
- `item_deleted`: Quando um item é removido
- `stock_updated`: Quando o nível de estoque de um item é alterado
- `transaction_created`: Quando uma nova transação é criada
- `transaction_approved`: Quando uma transação é aprovada
- `transaction_rejected`: Quando uma transação é rejeitada
- `loss_reported`: Quando uma perda é registrada
- `loss_approved`: Quando uma perda é aprovada
- `loss_rejected`: Quando uma perda é rejeitada
- `count_created`: Quando uma contagem é criada
- `count_submitted`: Quando uma contagem é submetida
- `count_approved`: Quando uma contagem é aprovada
- `count_rejected`: Quando uma contagem é rejeitada
- `low_stock_alert`: Quando o estoque de um item atinge o ponto de reposição

## Considerações de Segurança

- Todas as operações críticas (aprovações, rejeições) requerem autenticação e autorização adequadas
- Transações e perdas são registradas com informações completas de auditoria
- Todas as alterações de estoque são rastreáveis até o usuário que as realizou

## Próximos Passos e Melhorias Futuras

- Implementação de relatórios avançados de análise de estoque
- Suporte a múltiplos locais de estoque
- Integração com sistemas de código de barras e RFID
- Previsão de demanda baseada em histórico de vendas
- Otimização de níveis de estoque baseada em análise de dados
