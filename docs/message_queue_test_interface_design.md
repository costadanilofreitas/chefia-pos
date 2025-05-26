# Design da Interface de Teste via Mensagens na Fila

## Visão Geral

A Interface de Teste via Mensagens na Fila é uma ferramenta que permite aos desenvolvedores e testadores enviar mensagens diretamente às filas dos módulos do sistema POS Modern, facilitando testes, depuração e validação de integrações. Esta interface fornece uma maneira estruturada de interagir com o barramento de eventos do sistema, permitindo simular eventos e monitorar o comportamento dos módulos em resposta a esses eventos.

## Objetivos

1. **Facilitar Testes**: Permitir o envio de mensagens de teste para simular eventos do sistema
2. **Depurar Integrações**: Ajudar na identificação e resolução de problemas de integração entre módulos
3. **Validar Comportamentos**: Verificar se os módulos respondem corretamente aos eventos recebidos
4. **Monitorar Fluxo de Eventos**: Visualizar o fluxo de eventos no sistema em tempo real
5. **Automatizar Testes**: Possibilitar a criação de scripts de teste automatizados

## Análise do Barramento de Eventos Existente

O sistema POS Modern utiliza um barramento de eventos baseado em um padrão publish-subscribe, implementado na classe `EventBus`. Os principais componentes são:

1. **EventType**: Enum que define os tipos de eventos suportados pelo sistema
2. **Event**: Classe que representa um evento, contendo dados e metadados
3. **EventHandler**: Classe que manipula eventos com base em callbacks e filtros
4. **EventBus**: Classe principal que gerencia a publicação e assinatura de eventos

O barramento de eventos suporta:
- Publicação de eventos tipados
- Assinatura de eventos com filtros
- Manipulação assíncrona de eventos
- Logging de atividades

## Requisitos da Interface de Teste

### Requisitos Funcionais

1. **Envio de Mensagens**:
   - Permitir o envio de mensagens para qualquer tipo de evento definido no sistema
   - Suportar a criação de eventos com dados e metadados personalizados
   - Validar o formato das mensagens antes do envio

2. **Monitoramento**:
   - Visualizar eventos publicados no barramento em tempo real
   - Filtrar eventos por tipo, origem, destino, etc.
   - Salvar histórico de eventos para análise posterior

3. **Depuração**:
   - Mostrar detalhes completos de cada evento
   - Rastrear o fluxo de eventos relacionados
   - Identificar erros de processamento

4. **Automação**:
   - Suportar a criação de sequências de eventos para testes
   - Permitir a programação de envios com intervalos definidos
   - Integrar com ferramentas de teste automatizado

### Requisitos Não-Funcionais

1. **Usabilidade**:
   - Interface intuitiva para usuários técnicos
   - Feedback claro sobre o resultado das operações
   - Documentação abrangente com exemplos

2. **Performance**:
   - Processamento rápido de mensagens
   - Baixo impacto no desempenho do sistema principal
   - Suporte a alto volume de eventos para testes de carga

3. **Segurança**:
   - Controle de acesso para operações sensíveis
   - Validação de entrada para prevenir injeção de código
   - Modo somente leitura para ambientes de produção

## Arquitetura Proposta

### Componentes Principais

1. **API de Mensagens**:
   - Endpoints REST para envio e consulta de mensagens
   - Validação de esquema de mensagens
   - Integração com o barramento de eventos

2. **Serviço de Monitoramento**:
   - Assinante global para todos os tipos de eventos
   - Armazenamento temporário de histórico de eventos
   - Filtros configuráveis para visualização

3. **Interface de Usuário**:
   - Painel para composição de mensagens
   - Visualização em tempo real de eventos
   - Ferramentas de análise e depuração

4. **Módulo de Automação**:
   - Editor de sequências de eventos
   - Agendador de envios
   - Exportação/importação de cenários de teste

### Diagrama de Componentes

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  Interface Web   | --> |  API de          | --> |  Barramento de   |
|  (Dashboard)     |     |  Mensagens       |     |  Eventos         |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
        ^                        |                         |
        |                        v                         v
        |                +------------------+     +------------------+
        |                |                  |     |                  |
        +--------------- |  Serviço de      | <-- |  Módulos do      |
                         |  Monitoramento   |     |  Sistema         |
                         |                  |     |                  |
                         +------------------+     +------------------+
```

## API Proposta

### Endpoints REST

1. **POST /api/test/events**
   - Envia um evento para o barramento
   - Corpo: tipo de evento, dados, metadados
   - Retorno: ID do evento, status

2. **GET /api/test/events**
   - Lista eventos capturados pelo monitor
   - Parâmetros: filtros, paginação
   - Retorno: lista de eventos

3. **GET /api/test/events/{id}**
   - Obtém detalhes de um evento específico
   - Retorno: evento completo com histórico de processamento

4. **GET /api/test/event-types**
   - Lista todos os tipos de eventos disponíveis
   - Retorno: lista de tipos com descrições

5. **POST /api/test/sequences**
   - Cria uma sequência de eventos para teste
   - Corpo: lista de eventos, intervalos
   - Retorno: ID da sequência, status

### WebSockets

1. **/ws/events**
   - Stream em tempo real de eventos publicados
   - Suporta filtros para tipos específicos
   - Formato: JSON com detalhes do evento

## Interface de Usuário

### Telas Principais

1. **Dashboard**:
   - Visão geral do sistema
   - Estatísticas de eventos
   - Status dos módulos

2. **Compositor de Mensagens**:
   - Seleção de tipo de evento
   - Editor de JSON para dados
   - Validação em tempo real
   - Histórico de mensagens enviadas

3. **Monitor de Eventos**:
   - Lista em tempo real de eventos
   - Filtros configuráveis
   - Detalhes expandíveis
   - Exportação de logs

4. **Editor de Sequências**:
   - Interface drag-and-drop para criar sequências
   - Configuração de intervalos
   - Salvamento e carregamento de cenários

## Implementação

### Etapas de Desenvolvimento

1. **Fase 1: Backend**
   - Implementar API REST para envio de mensagens
   - Criar serviço de monitoramento de eventos
   - Desenvolver sistema de validação de mensagens

2. **Fase 2: Frontend**
   - Desenvolver interface web para composição de mensagens
   - Implementar visualização em tempo real de eventos
   - Criar ferramentas de filtragem e busca

3. **Fase 3: Recursos Avançados**
   - Adicionar editor de sequências
   - Implementar funcionalidades de automação
   - Desenvolver ferramentas de análise

### Integração com o Sistema Existente

A integração com o barramento de eventos existente será feita através de:

1. Extensão da classe `EventBus` para adicionar funcionalidades de monitoramento
2. Criação de um serviço dedicado para processamento de mensagens de teste
3. Implementação de endpoints REST que se comunicam com o barramento

## Considerações de Segurança

1. **Controle de Acesso**:
   - Restringir acesso à interface de teste em ambientes de produção
   - Implementar autenticação e autorização para operações sensíveis

2. **Validação de Entrada**:
   - Validar rigorosamente todas as mensagens antes do envio
   - Prevenir injeção de código malicioso

3. **Modo Seguro**:
   - Opção de modo somente leitura para ambientes sensíveis
   - Limitação de tipos de eventos que podem ser enviados

## Próximos Passos

1. Implementar a extensão do barramento de eventos para suportar monitoramento
2. Desenvolver a API REST para envio e consulta de mensagens
3. Criar a interface web básica para composição e visualização de mensagens
4. Implementar a validação de formato de mensagens
5. Desenvolver a documentação de uso com exemplos
