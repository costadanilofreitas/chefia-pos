# Regras de Negócio Consolidadas - Chefia POS

## Visão Geral do Sistema

O Chefia POS é um sistema completo de ponto de venda para restaurantes, desenvolvido com arquitetura de microserviços, composto por:

- **Backend**: FastAPI (Python) com 30+ módulos especializados
- **Frontend**: React/TypeScript com arquitetura monorepo (múltiplas aplicações)
- **Event-Driven Architecture**: Sistema de eventos para comunicação entre módulos
- **Multi-terminal**: Suporte para múltiplos terminais e interfaces (POS, KDS, Kiosk, Waiter, etc.)

### Arquitetura de Deployment Híbrida

#### 🏢 On-Premise (Local no Restaurante)

- **POS Principal**: Roda 100% local com PostgreSQL local
- **KDS (Kitchen Display)**: Sistema local para cozinha
- **Kiosk**: Autoatendimento local
- **Waiter Terminal**: Tablets/dispositivos locais
- **Banco de Dados**: PostgreSQL local para operações críticas
- **Vantagem**: Funciona mesmo sem internet, alta velocidade, dados sensíveis protegidos

#### ☁️ Cloud (Nuvem)

- **Site Institucional**: Website do restaurante
- **Cardápio Online**: QR Code e pedidos online
- **Backoffice**: Gestão remota e relatórios
- **PostSale**: Feedback e avaliações
- **Chatbots**: WhatsApp, Instagram, Messenger
- **IAs**: Análises preditivas e otimizações
- **Integrações**: iFood, Rappi, pagamentos online
- **Vantagem**: Acesso remoto, escalabilidade, integrações externas

#### 🔄 Sincronização

- Dados críticos permanecem locais (vendas, caixa, pedidos)
- Sincronização seletiva com cloud para relatórios e análises
- Modo offline garantido para operações essenciais
- Backup automático na nuvem quando conectado

### Estado Atual de Evolução dos Módulos Frontend

#### 📊 Maturidade dos Módulos

1. **POS Terminal** ⭐⭐⭐⭐⭐ (Mais Evoluído)

   - Não usa mais `common/` (totalmente independente)
   - Código enxuto e otimizado
   - Components próprios e específicos
   - Performance otimizada para hardware de PDV
   - Interface refinada após múltiplas iterações

2. **KDS (Kitchen Display)** ⭐⭐⭐

   - Em processo de migração
   - Ainda usa alguns componentes do `common/`
   - Próximo na fila para refatoração completa

3. **Kiosk (Autoatendimento)** ⭐⭐⭐

   - Desenvolvimento intermediário
   - Interface touch-first em evolução
   - Parcialmente dependente do `common/`

4. **Waiter Terminal** ⭐⭐
   - Fase inicial de desenvolvimento
   - Ainda muito dependente do `common/`
   - Planejado para evolução futura

#### 🎯 Estratégia de Evolução

- Cada módulo evolui para ser independente
- Remover dependências do `common/` gradualmente
- Otimizar para o hardware e uso específico
- Manter apenas types e utils verdadeiramente compartilhados

## 1. REGRAS DE NEGÓCIO CORE

### 1.1 Autenticação e Autorização

#### Regras de Autenticação

- Sistema baseado em JWT com tokens de acesso
- Token expira em 30 minutos (configurável)
- Refresh token disponível para renovação
- Senha numérica de 4-6 dígitos para operações rápidas
- Suporte a múltiplos níveis de usuário

#### Níveis de Acesso (Roles)

1. **ADMIN**: Acesso total ao sistema
2. **MANAGER**: Gestão operacional e financeira
3. **CASHIER**: Operação de caixa e vendas
4. **WAITER**: Atendimento de mesas
5. **KITCHEN**: Visualização e gestão de pedidos na cozinha
6. **CUSTOMER**: Auto-atendimento (kiosk)

#### Permissões Específicas

- `DAY_OPEN/DAY_CLOSE`: Abertura e fechamento de dia operacional
- `CASHIER_OPEN/CASHIER_CLOSE`: Abertura e fechamento de caixa
- `CASHIER_WITHDRAWAL`: Realizar sangrias/retiradas
- `ORDER_CREATE/UPDATE/CANCEL`: Gestão de pedidos
- `PRODUCT_CREATE/UPDATE/DELETE`: Gestão de produtos
- `REPORT_READ`: Acesso a relatórios
- `DISCOUNT_APPLY`: Aplicar descontos

### 1.2 Controle de Terminal

#### Regras de Terminal

- Cada terminal possui ID único (ex: POS-001, POS-002)
- Um terminal só pode ter um caixa aberto por vez
- Terminal deve estar registrado no sistema para operar
- Configuração específica por terminal (impressora, display, etc.)

## 2. GESTÃO OPERACIONAL

### 2.1 Dia de Operação (Business Day)

#### Abertura de Dia

- **Apenas um dia pode estar aberto por vez**
- Data do dia deve ser atual ou futura (não permite datas passadas)
- Requer permissão `DAY_OPEN`
- Registra operador e timestamp de abertura
- Publica evento `DAY_OPENED` para todos os módulos

#### Durante o Dia

- Todas as operações são vinculadas ao dia aberto
- Vendas e pedidos acumulam nos totais do dia
- Múltiplos caixas podem operar simultaneamente
- Sistema rastreia métricas em tempo real

#### Fechamento de Dia

- **Todos os caixas devem estar fechados antes de fechar o dia**
- Requer permissão `DAY_CLOSE`
- Calcula totais finais (vendas, pedidos, impostos)
- Gera relatório consolidado automático
- Publica evento `DAY_CLOSED`
- **Dia fechado não pode ser reaberto**

### 2.2 Gestão de Caixa (Cashier)

#### Abertura de Caixa

- Requer dia de operação aberto
- Um operador só pode ter um caixa aberto por vez
- Um terminal só pode ter um caixa aberto por vez
- Define saldo inicial (troco)
- Registra operador, terminal e timestamp

#### Operações de Caixa

Tipos suportados:

- **Venda (Sale)**: Aumenta saldo
- **Reembolso (Refund)**: Diminui saldo
- **Retirada/Sangria (Withdrawal)**: Diminui saldo
- **Depósito (Deposit)**: Aumenta saldo

Regras:

- Caixa deve estar aberto para registrar operações
- Saídas não podem exceder saldo atual
- Retiradas requerem permissão `CASHIER_WITHDRAWAL`
- Retiradas acima de R$ 200 requerem autorização gerencial
- Todas as operações são auditadas

#### Fechamento de Caixa

- Operador informa valor físico em dinheiro
- Sistema calcula diferença (físico vs esperado)
- Apenas operador atual ou gerente pode fechar
- Gera relatório de fechamento com:
  - Total de vendas por método de pagamento
  - Quantidade de operações
  - Diferença de caixa
  - Duração do turno

## 3. GESTÃO DE PRODUTOS E CARDÁPIO

### 3.1 Produtos

#### Tipos de Produto

1. **Single**: Produto individual simples
2. **Combo**: Conjunto de produtos com preço especial
3. **Weight-based**: Vendido por peso (kg)
4. **Composite**: Produto composto (ex: pizza meio-a-meio)

#### Estados do Produto

- **Active**: Disponível para venda
- **Inactive**: Temporariamente indisponível
- **Out_of_stock**: Sem estoque

#### Regras de Produto

- Produto pode pertencer a múltiplas categorias
- Pode ter múltiplas imagens (uma principal)
- Suporte a código de barras e SKU
- Atributos customizados (informações nutricionais, etc.)
- Tags para busca e filtro

### 3.2 Categorias

#### Hierarquia

- Categorias podem ter subcategorias (parent_id)
- Tipos: MAIN, SUB, SPECIAL
- Ordem de exibição configurável
- Categoria inativa não aparece no cardápio

#### Regras de Exclusão

- Não pode excluir categoria com produtos associados
- Não pode excluir categoria com subcategorias

### 3.3 Combos

#### Estrutura do Combo

- Conjunto de produtos com preço promocional
- Cada item pode ser trocável ou fixo
- Itens trocáveis pertencem a grupo de troca

#### Personalização de Combo

- Cliente pode trocar itens dentro do grupo de troca
- Troca pode gerar ajuste de preço (positivo ou negativo)
- Sistema calcula preço final automaticamente

### 3.4 Cardápios

#### Configuração Temporal

- Múltiplos cardápios podem coexistir
- Ativação por dia da semana (0=Segunda, 6=Domingo)
- Ativação por horário (start_time, end_time)
- Sistema seleciona cardápio ativo automaticamente

#### Composição

- Lista de categorias ativas
- Lista de produtos específicos
- Pode sobrescrever disponibilidade padrão

## 4. GESTÃO DE PEDIDOS

### 4.1 Criação de Pedido

#### Pré-requisitos

- Dia de operação deve estar aberto
- Caixa deve estar aberto (para vendas diretas)
- Produtos devem estar ativos e com estoque

#### Tipos de Pedido

- **dine_in**: Consumo no local
- **takeout**: Para viagem
- **delivery**: Entrega
- **drive_thru**: Drive-thru

#### Estados do Pedido

- **pending**: Aguardando preparação
- **preparing**: Em preparação
- **ready**: Pronto para entrega
- **delivered**: Entregue
- **canceled**: Cancelado

### 4.2 Personalização de Itens

#### Modificações Permitidas

1. **Remoção de Ingredientes**
   - Não altera preço base
   - Registra ingredientes removidos
2. **Adição de Ingredientes**
   - Pode ter custo adicional
   - Limite de quantidade configurável
3. **Opções de Categoria**
   - Tipo de pão, massa, borda
   - Pode ter ajuste de preço
4. **Produtos Compostos**
   - Pizza meio-a-meio
   - Preço: maior valor, média ou soma (configurável)
   - Cada seção tem proporção (0.5 = metade)

### 4.3 Regras de Cancelamento

- Permitido apenas nos status "pending" ou "preparing"
- Pedidos entregues não podem ser cancelados
- Pedidos pagos requerem permissão especial
- Reembolso automático se pagamento realizado
- Motivo do cancelamento é obrigatório

### 4.4 Aplicação de Desconto

- Desconto não pode exceder subtotal
- Requer permissão `DISCOUNT_APPLY`
- Motivo do desconto é obrigatório
- Tipos: percentual ou valor fixo
- Pode ser por item ou pedido completo

## 5. GESTÃO DE PAGAMENTOS

### 5.1 Métodos de Pagamento

Suportados:

- **cash**: Dinheiro
- **credit_card**: Cartão de crédito
- **debit_card**: Cartão de débito
- **pix**: PIX
- **voucher**: Vale refeição/alimentação
- **mixed**: Pagamento misto

### 5.2 Pagamento Parcial

#### Regras

- Cliente pode pagar parte do pedido
- Sistema rastreia saldo pendente
- Múltiplos pagamentos parciais permitidos
- Pedido só é finalizado quando totalmente pago

### 5.3 Divisão de Conta (Split)

#### Modalidades

1. **Por igual**: Divide valor total igualmente
2. **Por item**: Cada pessoa paga seus itens
3. **Por valor**: Define valor específico por pessoa
4. **Por percentual**: Define percentual por pessoa

#### Regras de Split

- Mínimo 2, máximo 10 participantes
- Soma deve totalizar 100% do pedido
- Taxa de serviço dividida proporcionalmente
- Cada participante pode usar método de pagamento diferente

### 5.4 Integração com Gateways

#### Asaas (Principal)

- Suporte a split payment automático
- Webhook para notificações
- Tokenização de cartões
- Recorrência para assinaturas

## 6. MÓDULO FISCAL

### 6.1 Impostos Suportados

- **ICMS**: Imposto estadual sobre mercadorias
- **ISS**: Imposto sobre serviços
- **PIS**: Programa de Integração Social
- **COFINS**: Contribuição para Financiamento da Seguridade Social
- **IPI**: Imposto sobre Produtos Industrializados

### 6.2 Regimes Tributários

Suportados:

- Simples Nacional
- Lucro Presumido
- Lucro Real
- MEI

### 6.3 Configuração Regional

- Por UF (estado)
- Por município
- Regras específicas por NCM
- Benefícios fiscais configuráveis
- Substituição tributária

### 6.4 Integração SAT/NFCe

#### SAT (São Paulo)

- Geração de CF-e SAT
- Validação online/offline
- Contingência automática

#### NFC-e (Outros estados)

- Emissão de NFC-e
- Modo online e contingência
- DANFE simplificado

### 6.5 Regras de Emissão

- Documento fiscal obrigatório para consumidor final
- CPF/CNPJ opcional (obrigatório acima de limite)
- Cancelamento até 30 minutos após emissão
- Inutilização de numeração em caso de falha

## 7. GESTÃO DE ESTOQUE

### 7.1 Controle de Inventory

#### Movimentações

- **Entrada**: Compra, devolução, ajuste positivo
- **Saída**: Venda, perda, ajuste negativo
- **Transferência**: Entre locais de armazenamento

#### Regras de Baixa

- Automática na confirmação do pedido
- Baseada em receita/ficha técnica
- Considera ingredientes e modificações
- Alerta de estoque mínimo

### 7.2 Gestão de Fornecedores

- Cadastro com CNPJ validado
- Múltiplos contatos por fornecedor
- Histórico de compras
- Avaliação de performance
- Prazo de pagamento configurável

### 7.3 Compras e Recebimento

- Pedido de compra com aprovação
- Conferência no recebimento
- Divergências registradas
- Atualização automática de custos
- Integração com contas a pagar

## 8. MÓDULOS ESPECIALIZADOS

### 8.1 KDS (Kitchen Display System)

#### Funcionalidades

- Exibição de pedidos em tempo real
- Ordenação por prioridade/tempo
- Marcação de itens prontos
- Tempo médio de preparação
- Alertas de atraso

#### Regras Operacionais

- Pedido aparece automaticamente após confirmação
- Cores indicam urgência (verde/amarelo/vermelho)
- Som de alerta para novos pedidos
- Estatísticas de performance por estação

### 8.2 Waiter Terminal

#### Gestão de Mesas

- Layout visual configurável
- Estados: livre, ocupada, reservada, conta
- Transferência de mesa
- Junção de mesas
- Divisão de mesa

#### Comandas

- Vinculada à mesa e garçom
- Múltiplas comandas por mesa permitidas
- Transferência entre garçons
- Impressão de comanda parcial

### 8.3 Kiosk (Autoatendimento)

#### Fluxo do Cliente

1. Seleção de produtos
2. Personalização
3. Revisão do pedido
4. Pagamento (cartão/PIX)
5. Retirada de senha

#### Regras

- Apenas métodos de pagamento eletrônicos
- Timeout de sessão (5 minutos)
- Limite de itens por pedido
- Validação de pagamento antes de confirmar

### 8.4 Delivery

#### Integração com Plataformas

- **iFood**: Webhook para pedidos, cardápio sincronizado
- **Rappi**: API REST, atualização de status
- **Próprio**: App white-label

#### Gestão de Entrega

- Cálculo de frete por distância/região
- Tempo estimado de entrega
- Rastreamento de entregador
- Integração com Google Maps
- Zonas de entrega configuráveis

### 8.5 Loyalty (Fidelidade)

#### Programas

- Pontos por compra
- Cashback
- Cupons de desconto
- Clube de assinatura

#### Regras de Pontuação

- 1 ponto a cada R$ 1,00 (configurável)
- Pontos expiram em 12 meses
- Resgate mínimo: 100 pontos
- Conversão: 100 pontos = R$ 5,00

#### Campanhas

- Por período (data início/fim)
- Por dia da semana
- Por categoria de produto
- Por valor mínimo de compra
- Pontos em dobro/triplo

## 8.6. GESTÃO DE MESAS E RESERVAS (NOVO 2024)

### 8.6.1 Fila de Espera (Queue Management)

#### Regras de Entrada na Fila

- **Máximo 50 pessoas na fila simultaneamente** (configurável)
- **Tamanho de grupo**: 1-2, 3-4, 5-6, 7+ pessoas
- **Dados obrigatórios**: Nome, telefone, quantidade pessoas
- **Tempo máximo na fila**: 3 horas (auto-cancelamento)
- **Nome não pode estar duplicado** na fila ativa

#### Cálculo de Tempo de Espera

- **Baseado na ocupação atual** das mesas
- **Histórico de tempo médio** de permanência por tamanho de grupo
- **Tempo de limpeza** entre clientes (configurável 5-15 min)
- **Margem de erro**: ±10 minutos máximo
- **Recalculo automático** a cada mudança de status de mesa

#### Notificações

- **SMS**: Para números brasileiros (+55)
- **WhatsApp**: Integração com API oficial
- **Sistema**: Alto-falantes internos
- **Tempo limite para resposta**: 5 minutos após notificação
- **Máximo 3 tentativas** de contato

#### Estados da Fila

1. **WAITING**: Cliente aguardando na fila
2. **NOTIFIED**: Cliente foi chamado
3. **SEATED**: Cliente foi acomodado
4. **NO_SHOW**: Cliente não compareceu após 5 min
5. **CANCELLED**: Cliente cancelou ou saiu

### 8.6.2 Sistema de Reservas

#### Regras de Criação

- **Antecedência mínima**: 1 hora (configurável)
- **Antecedência máxima**: 30 dias
- **Horário de funcionamento**: Respeitar horários do restaurante
- **Máximo por dia**: 80% da capacidade reservável
- **Sobreposição**: Não permitir mesmo horário para mesma mesa

#### Depósitos e Garantias

- **Depósito obrigatório**: Para grupos 6+ pessoas
- **Valor mínimo**: R$ 10,00 por pessoa
- **Prazo para pagamento**: 2 horas após reserva
- **Cancelamento gratuito**: Até 4 horas antes
- **Reembolso**: 50% se cancelar até 2 horas antes

#### Confirmações e Lembretes

- **SMS de confirmação**: Imediato após reserva
- **Lembrete 24h antes**: Automático
- **Lembrete 2h antes**: Com opção de cancelar
- **Tolerância de atraso**: 15 minutos
- **No-show automático**: Após 15 min sem contato

#### Reservas Recorrentes

- **Aniversários**: Automático anual
- **Encontros empresariais**: Semanal/mensal
- **Mesa cativa**: Mesmo dia/horário por período
- **Desconto fidelidade**: 5-10% após 5 reservas cumpridas

### 8.6.3 Sistema de Comandas (Command Cards)

#### Tipos de Comanda Suportados

1. **BARCODE**: Código de barras Code128
2. **QRCODE**: QR Code com URL ou código
3. **RFID**: Tags de radiofrequência (13.56MHz)
4. **NFC**: Near Field Communication
5. **MANUAL**: Digitação direta do código

#### Regras de Sessão

- **Uma comanda por cliente/mesa**
- **Limite de crédito**: R$ 500,00 (configurável)
- **Tempo máximo sessão**: 8 horas
- **Auto-fechamento**: Após inatividade de 2 horas
- **Transferência**: Entre mesas permitida

#### Controle de Itens

- **Adição**: Qualquer funcionário autorizado
- **Remoção**: Apenas manager ou superior
- **Limite por item**: 10 unidades (anti-fraude)
- **Taxa de serviço**: 10% automática (configurável)
- **Desconto máximo**: 20% do total

#### Responsabilidade de Pagamento

- **Individual**: Cada comanda paga separadamente
- **Mesa**: Uma pessoa paga todas as comandas
- **Divisão**: Split automático por número de pessoas
- **Grupo**: Definir responsável na abertura

#### Estados da Comanda

1. **OPEN**: Aberta para consumo
2. **SUSPENDED**: Temporariamente suspensa
3. **CLOSED**: Fechada para pagamento
4. **PAID**: Paga e finalizada
5. **CANCELLED**: Cancelada (apenas manager)

### 8.6.4 Self-Service com Balança

#### Configuração de Balanças

- **Protocolo**: Serial RS-232, USB, TCP/IP
- **Precisão mínima**: 5 gramas
- **Capacidade**: 2-15 kg
- **Tara automática**: Pratos padrão (150g)
- **Calibração**: Semanal obrigatória

#### Regras de Cobrança

- **Preço por kg**: Configurável por horário/dia
- **Peso mínimo**: 100g para cobrança
- **Peso máximo**: 2kg por transação
- **Tara personalizada**: Para containers especiais
- **Desconto grupo**: Crianças até 6 anos (50%)

#### Itens Adicionais

- **Bebidas**: Preço fixo por unidade
- **Sobremesas**: Preço especial
- **Acompanhamentos**: Pães, molhos gratuitos
- **Limite bebidas**: 3 por pessoa no buffet
- **Promoções**: Happy hour, desconto estudante

#### Controles Anti-Fraude

- **Pesagem obrigatória**: Não permite bypass
- **Foto do prato**: Câmera opcional para auditoria
- **Limite de tara**: Máximo 300g por container
- **Supervisor**: Aprovação para pesos > 1.5kg
- **Bloqueio automático**: 3 tentativas de tara inválida

### 8.6.5 Layout de Mesas

#### Configuração Visual

- **Grid flexível**: Arrastar e soltar mesas
- **Formas suportadas**: Redonda, quadrada, retangular
- **Capacidade**: 1-12 pessoas por mesa
- **Numeração**: Automática ou manual
- **Cores por status**: Verde (livre), Vermelho (ocupada), Azul (reservada)

#### Estados em Tempo Real

1. **AVAILABLE**: Mesa livre e limpa
2. **OCCUPIED**: Mesa com clientes
3. **RESERVED**: Mesa reservada
4. **CLEANING**: Em processo de limpeza
5. **MAINTENANCE**: Fora de uso
6. **BLOCKED**: Bloqueada para eventos

#### Integração com Sistemas

- **Reservas**: Automático quando horário chega
- **Fila**: Notificação quando mesa adequada fica livre
- **Comandas**: Vinculação automática mesa-comanda
- **KDS**: Status de pedidos por mesa
- **Pagamento**: Fechamento de conta por mesa

#### Regras de Ocupação

- **Tolerância de pessoas**: +1 pessoa além da capacidade
- **Junção de mesas**: Para grupos grandes
- **Divisão não permitida**: Mesa unitária não pode dividir
- **Prioridade**: Reserva > Fila > Walk-in
- **Tempo médio**: 90 min para almoço, 120 min para jantar

## 9. RELATÓRIOS E ANALYTICS

### 9.1 Relatórios Operacionais

#### Diários

- Resumo de vendas
- Produtos mais vendidos
- Métodos de pagamento
- Cancelamentos e devoluções
- Performance por hora

#### Periódicos

- Comparativo semanal/mensal
- Tendências de venda
- Análise de horário de pico
- Performance de funcionários
- Ticket médio

### 9.2 Relatórios Financeiros

- Fluxo de caixa
- DRE simplificado
- Contas a pagar/receber
- Comissões
- Impostos

### 9.3 Dashboards em Tempo Real

- Vendas do dia
- Pedidos em preparação
- Ocupação de mesas
- Fila de espera
- Alertas e notificações

## 10. INTEGRAÇÕES E PERIFÉRICOS

### 10.1 Impressoras

#### Tipos Suportados

- Térmica 58mm/80mm
- Matricial para documentos fiscais
- Laser para relatórios

#### Marcas Homologadas

- Epson TM-T20/TM-T88
- Bematech MP-4200
- Elgin i9
- Daruma DR800

#### Regras de Impressão

- Comanda na confirmação do pedido
- Cupom fiscal na finalização
- Via do cliente e via do estabelecimento
- Reimpressão requer permissão

### 10.2 Balanças

- Protocolo Toledo/Filizola
- Leitura automática de peso
- Tara configurável
- Integração com cadastro de produtos

### 10.3 TEF (Transferência Eletrônica de Fundos)

- SiTef, PayGo
- Pinpad USB/Serial
- Desfazimento automático em caso de erro
- Comprovante via impressora

### 10.4 Displays

- Display de cliente (2x20, 4x20)
- Monitor secundário
- Tablet para assinatura digital
- TV para painel de senhas

## 11. SEGURANÇA E AUDITORIA

### 11.1 Segurança de Dados

- Criptografia de dados sensíveis (senhas, cartões)
- HTTPS obrigatório em produção
- Certificados SSL/TLS
- Backup automático diário
- Retenção de 90 dias

### 11.2 Auditoria

#### Eventos Auditados

- Login/logout
- Abertura/fechamento (dia e caixa)
- Cancelamentos
- Descontos
- Modificação de preços
- Alteração de configurações

#### Informações Registradas

- Usuário
- Timestamp
- IP de origem
- Ação realizada
- Dados antes/depois
- Justificativa (quando aplicável)

### 11.3 Compliance

- LGPD: Anonimização de dados pessoais
- PCI-DSS: Não armazena dados de cartão
- SPED Fiscal: Geração de arquivos
- NF-e: Comunicação com SEFAZ

## 12. CONFIGURAÇÕES E PARAMETRIZAÇÃO

### 12.1 Configurações Globais

- Dados da empresa (CNPJ, razão social, etc.)
- Timezone e formato de data/hora
- Moeda e casas decimais
- Idioma do sistema
- Logo e cores da marca

### 12.2 Configurações Operacionais

- Horário de funcionamento
- Tempo de preparação padrão
- Tolerância para atraso
- Quantidade mínima/máxima por item
- Taxa de serviço (%)

### 12.3 Configurações Financeiras

- Formas de pagamento aceitas
- Limite para pagamento em dinheiro
- Prazo para cancelamento
- Juros e multas
- Comissões de vendedores

## 13. FUNCIONALIDADES OFFLINE E ARQUITETURA HÍBRIDA

### 13.1 Modo Offline (On-Premise)

#### Princípio Fundamental

- **POS SEMPRE funciona localmente**, internet é opcional
- Banco PostgreSQL local garante operação contínua
- Dados críticos NUNCA dependem da cloud

#### Ativação

- Sistema roda offline por padrão (on-premise)
- Detecta conexão para sincronizar com cloud
- Manual para forçar modo 100% local

#### Funcionalidades COMPLETAS em Modo Local

- ✅ Registro de vendas (PostgreSQL local)
- ✅ Gestão completa de pedidos
- ✅ Abertura/fechamento de caixa e dia
- ✅ Impressão de comandas e cupons
- ✅ Cálculo de impostos (regras locais)
- ✅ Controle de estoque local
- ✅ Relatórios operacionais do dia
- ✅ KDS funcionando normalmente
- ✅ Kiosk para pedidos internos

#### Funcionalidades que Requerem Internet

- ❌ Pedidos online (iFood, Rappi)
- ❌ Pagamentos online
- ❌ WhatsApp/Chatbots
- ❌ Sincronização com backoffice cloud
- ❌ Análises de IA
- ❌ Backup na nuvem

### 13.2 Sincronização Híbrida

#### Dados que Ficam SEMPRE Locais

- Vendas e transações do dia
- Movimentações de caixa
- Estoque operacional
- Dados de funcionários e senhas
- Configurações de hardware

#### Dados que Sincronizam com Cloud

- Relatórios consolidados
- Métricas para análise
- Cardápio para site/app
- Avaliações e feedback
- Backups de segurança

#### Estratégia de Sincronização

- Queue de operações para sincronizar
- Sincronização incremental a cada 5 minutos
- Resolução de conflitos: local tem prioridade
- Prioridade: vendas > estoque > relatórios

### 13.3 Regras de Negócio On-Premise vs Cloud

#### Operações Críticas (SEMPRE Local)

1. **Vendas e Pagamentos**: PostgreSQL local
2. **Caixa e Fechamento**: Nunca depende de internet
3. **Pedidos de Balcão**: 100% local
4. **Impressão Fiscal**: SAT/NFCe local

#### Operações Cloud (Quando Disponível)

1. **Delivery Online**: Integração com plataformas
2. **Gestão Remota**: Backoffice para proprietários
3. **Marketing**: Campanhas e promoções
4. **Analytics**: BI e dashboards avançados

## 14. REGRAS DE NEGÓCIO ESPECÍFICAS DO SETOR

### 14.1 Fast Food

- Combos pré-definidos
- Modificações rápidas
- Senhas de retirada
- Display de preparação
- Drive-thru

### 14.2 Restaurante À La Carte

- Reserva de mesas
- Comandas por mesa
- Couvert artístico
- Carta de vinhos
- Sugestão do chef

### 14.3 Pizzaria

- Sabores fracionados (2, 3, 4 sabores)
- Bordas recheadas
- Tamanhos variados
- Preço por maior valor ou média
- Entrega expressa

### 14.4 Bar/Pub

- Controle de fichas
- Consumação mínima
- Happy hour (preços diferenciados)
- Controle de entrada
- Venda de ingressos

## 15. MANUTENÇÃO E SUPORTE

### 15.1 Backup e Recuperação

- Backup automático diário
- Backup manual sob demanda
- Restore point antes de atualizações
- Recuperação seletiva
- Teste de integridade

### 15.2 Atualizações

- Versionamento semântico
- Atualizações incrementais
- Rollback automático em caso de erro
- Changelog detalhado
- Notificação de breaking changes

### 15.3 Monitoramento

- Health check de serviços
- Alertas de erro
- Métricas de performance
- Uso de recursos
- Disponibilidade (uptime)

## 16. ROADMAP E EVOLUÇÃO

### Funcionalidades Planejadas

1. **Inteligência Artificial**

   - Previsão de demanda
   - Sugestões personalizadas
   - Detecção de fraudes
   - Chatbot de atendimento

2. **Mobilidade**

   - App para garçons (React Native)
   - App para clientes
   - PWA completo
   - Notificações push

3. **Integrações Avançadas**

   - ERP (SAP, TOTVS)
   - Contabilidade (ContaAzul, Omie)
   - RH (Gupy, Pontomais)
   - Marketing (RD Station, Mailchimp)

4. **Analytics Avançado**
   - BI integrado
   - Machine Learning
   - Análise preditiva
   - Relatórios customizados

## Conclusão

Este documento consolida todas as regras de negócio identificadas no sistema Chefia POS. O sistema demonstra maturidade em suas funcionalidades core, com arquitetura bem estruturada e preparada para escalar. As regras aqui documentadas servem como referência para desenvolvimento, testes e treinamento de usuários.

### Pontos Fortes

- **Arquitetura híbrida on-premise/cloud bem definida**
- POS 100% funcional sem internet (PostgreSQL local)
- Arquitetura modular e escalável
- Cobertura ampla de funcionalidades
- Integração entre módulos via eventos
- Suporte multi-terminal e multi-interface
- Regras de negócio bem definidas
- **POS Terminal já maduro e otimizado (não usa common/)**

### Áreas de Melhoria

- Completar migração dos outros módulos (KDS, Kiosk, Waiter) para arquitetura independente
- Otimização de performance dos módulos em desenvolvimento
- Cobertura de testes
- Documentação de APIs
- Sistema de sincronização cloud mais robusto

### Recomendações Prioritárias

1. **Manter filosofia on-premise first** - operação local é prioridade
2. Continuar evolução dos módulos para independência total
3. Expandir testes automatizados
4. Melhorar sincronização seletiva com cloud
5. Documentar claramente o que é local vs cloud para usuários finais

### Arquitetura Target

- **Local (On-Premise)**: Todas operações críticas do restaurante
- **Cloud**: Apenas funcionalidades complementares e análises
- **Sincronização**: Inteligente e seletiva, nunca bloqueante
- **Frontend**: Cada módulo 100% independente e otimizado
