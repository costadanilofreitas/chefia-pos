# Documentação dos Módulos de Frontend e Versionamento

## Visão Geral

Este documento descreve os módulos implementados durante a fase "Dias 41-45: Módulos de Frontend e Versionamento" do projeto POS Moderno. Foram desenvolvidos quatro componentes principais:

1. **Interface para Totem de Autoatendimento (Kiosk)**
2. **Sistema de Versionamento Local**
3. **Sistema de Logs Automáticos**
4. **Módulo de Fornecedores**

## 1. Interface para Totem de Autoatendimento (Kiosk)

### Descrição
O módulo Kiosk fornece uma interface otimizada para telas touch, permitindo que clientes façam pedidos de forma autônoma em quiosques de autoatendimento.

### Estrutura de Arquivos
```
/src/kiosk/
  ├── models/
  │   └── kiosk_models.py       # Modelos de dados para sessões e configurações
  ├── services/
  │   └── kiosk_service.py      # Serviços para gerenciamento de sessões e pedidos
  ├── router/
  │   └── kiosk_router.py       # APIs RESTful para operações do quiosque
  ├── events/
  │   └── kiosk_events.py       # Integração com o barramento de eventos
  └── ui/
      ├── KioskMainPage.jsx     # Componente principal da interface
      ├── KioskMainPage.css     # Estilos da interface principal
      ├── WelcomeScreen.jsx     # Tela de boas-vindas
      ├── CategorySelector.jsx  # Seletor de categorias de produtos
      ├── ProductCard.jsx       # Card de produto
      ├── CartSidebar.jsx       # Carrinho de compras lateral
      ├── CustomizationModal.jsx # Modal para personalização de produtos
      ├── PaymentScreen.jsx     # Tela de pagamento
      └── OrderSummary.jsx      # Resumo do pedido
```

### Funcionalidades Principais
- **Fluxo de Pedido Simplificado**: Interface intuitiva com foco em experiência touch
- **Navegação por Categorias**: Acesso rápido a diferentes seções do cardápio
- **Personalização de Produtos**: Opções para adicionar ou remover ingredientes
- **Carrinho de Compras**: Visualização e edição de itens selecionados
- **Múltiplos Métodos de Pagamento**: Suporte a cartões, dinheiro e outros métodos
- **Confirmação de Pedido**: Exibição de número de pedido e tempo estimado
- **Timeout por Inatividade**: Retorno automático à tela inicial após período sem interação
- **Rastreamento de Sessões**: Coleta de métricas para análise de uso

### Integração com Outros Módulos
- **Módulo de Produtos**: Para obtenção do catálogo de produtos
- **Módulo de Pedidos**: Para criação e processamento de pedidos
- **Módulo de Pagamentos**: Para processamento de transações

### Configuração
O módulo pode ser configurado através do arquivo `config/kiosk/1.json` com as seguintes opções:
- `timeout_seconds`: Tempo de inatividade antes de retornar à tela inicial
- `theme`: Configurações de tema e cores
- `logo_url`: URL do logotipo a ser exibido
- `welcome_message`: Mensagem de boas-vindas personalizada

## 2. Sistema de Versionamento Local

### Descrição
O sistema de versionamento local gerencia atualizações do software, permitindo controle de versões, atualizações automáticas e rollback em caso de falhas.

### Estrutura de Arquivos
```
/src/versioning/
  ├── models/
  │   └── version_models.py     # Modelos para controle de versão
  ├── services/
  │   └── version_service.py    # Serviços para gerenciamento de versões
  └── router/
      └── version_router.py     # APIs para verificação e atualização
```

### Funcionalidades Principais
- **Versionamento Semântico**: Controle de versões usando o padrão MAJOR.MINOR.PATCH
- **Verificação de Atualizações**: Checagem periódica de novas versões disponíveis
- **Download e Instalação Automática**: Processo automatizado de atualização
- **Sistema de Backup e Rollback**: Restauração em caso de falha na atualização
- **Histórico de Atualizações**: Registro de todas as atualizações e seus resultados
- **Verificação de Compatibilidade**: Garantia de compatibilidade entre componentes
- **Controle de Atualizações Críticas**: Priorização de atualizações importantes

### Fluxo de Atualização
1. Verificação de novas versões disponíveis
2. Download dos pacotes de atualização
3. Verificação de integridade (hash)
4. Backup da versão atual
5. Instalação da nova versão
6. Validação da instalação
7. Rollback automático em caso de falha

### APIs Disponíveis
- `GET /api/v1/version/current`: Retorna informações sobre a versão atual
- `GET /api/v1/version/check`: Verifica se há atualizações disponíveis
- `POST /api/v1/version/update`: Inicia o processo de atualização
- `GET /api/v1/version/history`: Retorna o histórico de atualizações
- `POST /api/v1/version/rollback`: Reverte para a versão anterior

## 3. Sistema de Logs Automáticos

### Descrição
O sistema de logs automáticos captura, armazena e permite a visualização de logs do sistema, facilitando o diagnóstico de problemas e a análise de comportamento.

### Estrutura de Arquivos
```
/src/logging/
  ├── models/
  │   └── log_models.py         # Modelos para estrutura de logs
  ├── services/
  │   └── log_service.py        # Serviços para registro e consulta de logs
  ├── router/
  │   └── log_router.py         # APIs para acesso aos logs
  └── ui/
      ├── LogViewer.jsx         # Interface para visualização de logs
      └── LogViewer.css         # Estilos da interface de logs
```

### Funcionalidades Principais
- **Captura Automática de Logs**: Registro de eventos do sistema sem intervenção manual
- **Níveis de Severidade**: Suporte a diferentes níveis (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- **Categorização por Módulo**: Organização de logs por módulo do sistema
- **Rotação de Logs**: Gerenciamento automático do tamanho e retenção de logs
- **Pesquisa e Filtragem**: Interface para busca avançada nos registros
- **Exportação**: Possibilidade de exportar logs para análise externa
- **Alertas**: Notificações para eventos críticos

### Tipos de Logs Capturados
- **Logs de Sistema**: Inicialização, shutdown, atualizações
- **Logs de Aplicação**: Operações de negócio, fluxos de trabalho
- **Logs de Segurança**: Tentativas de login, alterações de permissão
- **Logs de Performance**: Tempos de resposta, uso de recursos
- **Logs de Erro**: Exceções, falhas e problemas

### Interface de Visualização
A interface de visualização de logs (`LogViewer.jsx`) oferece:
- Filtros por data, nível, módulo e texto
- Visualização em tempo real de novos logs
- Agrupamento e expansão de logs relacionados
- Destaque colorido por nível de severidade
- Exportação para formatos comuns (CSV, JSON)

## 4. Módulo de Fornecedores

### Descrição
O módulo de fornecedores gerencia o cadastro de fornecedores e o processo de compras, com integração ao controle de estoque para atualização automática após recebimento de mercadorias.

### Estrutura de Arquivos
```
/src/supplier/
  ├── models/
  │   └── supplier_models.py    # Modelos para fornecedores e pedidos de compra
  ├── services/
  │   └── supplier_service.py   # Serviços para gerenciamento de fornecedores
  ├── router/
  │   └── supplier_router.py    # APIs para operações com fornecedores
  └── ui/
      ├── SupplierManagementPage.jsx  # Interface de gerenciamento
      └── SupplierManagementPage.css  # Estilos da interface
```

### Funcionalidades Principais
- **Cadastro de Fornecedores**: Registro completo com dados de contato e endereço
- **Categorização**: Organização de fornecedores por categoria de produtos
- **Avaliação**: Sistema de rating para qualidade de fornecedores
- **Pedidos de Compra**: Fluxo completo de criação e acompanhamento de pedidos
- **Integração com Estoque**: Atualização automática do estoque ao receber mercadorias
- **Condições de Pagamento**: Registro de prazos e condições por fornecedor
- **Histórico de Compras**: Visualização de todas as transações por fornecedor
- **Estatísticas**: Dashboards com métricas de fornecedores e compras

### Fluxo de Pedido de Compra
1. Criação do pedido (status: DRAFT)
2. Envio ao fornecedor (status: SENT)
3. Confirmação pelo fornecedor (status: CONFIRMED)
4. Recebimento parcial (opcional) (status: PARTIALLY_RECEIVED)
5. Recebimento completo (status: RECEIVED)
6. Possibilidade de cancelamento em qualquer etapa (status: CANCELLED)

### Integração com Estoque
Quando um pedido de compra é marcado como recebido (total ou parcialmente), o sistema:
1. Registra automaticamente a entrada dos itens no estoque
2. Atualiza os níveis de estoque disponível
3. Registra o preço de custo para cálculos de margem
4. Gera um registro de movimentação com referência ao pedido de compra

### APIs Disponíveis
- **Fornecedores**:
  - `POST /api/v1/suppliers`: Criar fornecedor
  - `GET /api/v1/suppliers/{id}`: Obter fornecedor
  - `PUT /api/v1/suppliers/{id}`: Atualizar fornecedor
  - `DELETE /api/v1/suppliers/{id}`: Excluir fornecedor
  - `POST /api/v1/suppliers/query`: Buscar fornecedores
  - `GET /api/v1/suppliers/stats`: Estatísticas de fornecedores

- **Pedidos de Compra**:
  - `POST /api/v1/purchase-orders`: Criar pedido
  - `GET /api/v1/purchase-orders/{id}`: Obter pedido
  - `PUT /api/v1/purchase-orders/{id}`: Atualizar pedido
  - `PUT /api/v1/purchase-orders/{id}/status/{status}`: Alterar status
  - `GET /api/v1/purchase-orders`: Listar pedidos
  - `GET /api/v1/purchase-orders/stats`: Estatísticas de pedidos

## Integração entre Módulos

### Kiosk e Pedidos
- O módulo Kiosk utiliza as APIs do módulo de Pedidos para criar novos pedidos
- Eventos de atualização de status são propagados via Event Bus

### Versionamento e Logging
- O sistema de versionamento registra todas as operações no sistema de logs
- Atualizações críticas geram logs de nível WARNING ou ERROR

### Fornecedores e Estoque
- Recebimento de pedidos de compra atualiza automaticamente o estoque
- Alertas de estoque baixo podem gerar sugestões de pedidos de compra

### Logging e Todos os Módulos
- Todos os módulos utilizam o serviço de logging para registrar operações importantes
- A interface de logs permite visualizar eventos de qualquer módulo do sistema

## Considerações de Segurança

- **Controle de Acesso**: Todas as APIs implementam verificação de permissões
- **Validação de Dados**: Validação rigorosa de inputs em todas as operações
- **Auditoria**: Registro de todas as operações com identificação do usuário
- **Backup**: Sistema de backup automático antes de atualizações

## Próximos Passos

1. **Testes Automatizados**: Implementar testes unitários e de integração
2. **Melhorias de UX**: Refinar a experiência do usuário nas interfaces
3. **Relatórios Avançados**: Desenvolver relatórios gerenciais para fornecedores e compras
4. **Integração com Fiscal**: Conectar pedidos de compra com notas fiscais
5. **Otimização de Performance**: Melhorar o desempenho em dispositivos de baixo recurso
