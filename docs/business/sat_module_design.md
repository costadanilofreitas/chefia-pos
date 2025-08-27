# Design do Módulo SAT (Sistema Autenticador e Transmissor)

## Visão Geral

O módulo SAT será responsável pela integração com o Sistema Autenticador e Transmissor para emissão de notas fiscais (CF-e - Cupom Fiscal Eletrônico) no sistema POS Modern. Esta integração será **opcional**, permitindo que o sistema funcione com ou sem a emissão de documentos fiscais, dependendo das necessidades do estabelecimento.

## Objetivos

1. Implementar integração com equipamentos SAT para emissão de CF-e
2. Tornar a emissão de notas fiscais opcional e configurável
3. Integrar com o fluxo de vendas existente de forma não intrusiva
4. Suportar múltiplos modelos de equipamentos SAT
5. Permitir simulação para testes sem hardware real
6. Fornecer mecanismos de contingência para falhas

## Arquitetura

### Componentes Principais

1. **Modelos de Dados (sat_models.py)**
   - `SATConfig`: Configurações do equipamento SAT
   - `CFe`: Modelo do Cupom Fiscal Eletrônico
   - `SATStatus`: Status do equipamento SAT
   - `SATLog`: Registro de operações e erros

2. **Serviço SAT (sat_service.py)**
   - Gerenciamento de conexão com equipamento SAT
   - Conversão de pedidos para formato CF-e
   - Emissão e cancelamento de CF-e
   - Consulta de status e logs

3. **Drivers SAT (drivers/)**
   - Implementações específicas para diferentes fabricantes
   - Driver de simulação para testes

4. **API REST (sat_router.py)**
   - Endpoints para gerenciamento do SAT
   - Emissão e consulta de CF-e
   - Configuração e status

5. **Integração com Eventos (sat_events.py)**
   - Eventos para notificação de emissão/cancelamento
   - Handlers para eventos de finalização de pedidos

### Diagrama de Componentes

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  Order Service  │─────▶│   SAT Service   │─────▶│  SAT Hardware   │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│   Event Bus     │◀────▶│   SAT Events    │      │   SAT Drivers   │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  Order Router   │─────▶│   SAT Router    │─────▶│  SAT Models     │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Fluxo de Emissão de CF-e

1. **Verificação de Configuração**
   - Ao finalizar um pedido, o sistema verifica se a emissão de CF-e está habilitada
   - Se não estiver habilitada, o fluxo normal continua sem emissão fiscal

2. **Preparação dos Dados**
   - Conversão do pedido para o formato CF-e
   - Validação dos dados fiscais (CNPJ, IE, etc.)

3. **Emissão do CF-e**
   - Envio dos dados para o equipamento SAT
   - Recebimento e processamento da resposta

4. **Armazenamento e Impressão**
   - Armazenamento do CF-e no banco de dados
   - Impressão do extrato do CF-e (opcional)
   - Envio de eventos de notificação

5. **Tratamento de Erros**
   - Tentativas de reenvio em caso de falha
   - Registro de erros para resolução posterior
   - Modo de contingência quando necessário

### Diagrama de Sequência

```
┌─────────┐          ┌─────────────┐          ┌────────────┐          ┌───────────┐
│         │          │             │          │            │          │           │
│   POS   │          │ OrderService│          │ SATService │          │    SAT    │
│         │          │             │          │            │          │           │
└────┬────┘          └──────┬──────┘          └─────┬──────┘          └─────┬─────┘
     │                      │                       │                       │
     │   Finalizar Pedido   │                       │                       │
     │─────────────────────▶│                       │                       │
     │                      │                       │                       │
     │                      │ Verificar Configuração│                       │
     │                      │──────────────────────▶│                       │
     │                      │                       │                       │
     │                      │                       │ SAT Habilitado?       │
     │                      │                       │───────────────────────│
     │                      │                       │                       │
     │                      │                       │       Sim/Não         │
     │                      │                       │◀──────────────────────│
     │                      │                       │                       │
     │                      │ Se habilitado, emitir │                       │
     │                      │──────────────────────▶│                       │
     │                      │                       │                       │
     │                      │                       │  Preparar Dados CF-e  │
     │                      │                       │───────────────────────│
     │                      │                       │                       │
     │                      │                       │    Enviar para SAT    │
     │                      │                       │───────────────────────▶
     │                      │                       │                       │
     │                      │                       │    Resposta do SAT    │
     │                      │                       │◀──────────────────────│
     │                      │                       │                       │
     │                      │   Resposta da Emissão │                       │
     │                      │◀─────────────────────-│                       │
     │                      │                       │                       │
     │  Resposta Finalização│                       │                       │
     │◀─────────────────────│                       │                       │
     │                      │                       │                       │
```

## Configuração e Optabilidade

A emissão de CF-e será controlada por configurações em dois níveis:

1. **Nível de Sistema**
   - Arquivo de configuração global (`config/sat/config.json`)
   - Define se o módulo SAT está habilitado globalmente

2. **Nível de Terminal**
   - Configuração por terminal POS (`config/pos/{id}.json`)
   - Permite habilitar/desabilitar por terminal específico

Exemplo de configuração global:
```json
{
  "enabled": true,
  "default_driver": "dimep",
  "contingency_mode": "offline",
  "auto_print": true,
  "retry_attempts": 3
}
```

Exemplo de configuração por terminal:
```json
{
  "terminal_id": "POS001",
  "terminal_name": "Caixa 1",
  "sat": {
    "enabled": true,
    "device_code": "900004019",
    "activation_code": "12345678",
    "signature_ac": "SGR-SAT SISTEMA DE GESTAO E RETAGUARDA DO SAT",
    "cnpj": "61099008000141",
    "ie": "111111111111"
  }
}
```

## Integração com o Fluxo de Vendas

A integração com o fluxo de vendas existente será feita de forma não intrusiva, através de:

1. **Extensão do Serviço de Pedidos**
   - Adição de método opcional para emissão fiscal
   - Verificação de configuração antes da emissão

2. **Eventos**
   - Assinatura de eventos de finalização de pedidos
   - Publicação de eventos de emissão/cancelamento de CF-e

3. **Middleware de API**
   - Verificação de configuração SAT em endpoints relevantes
   - Adição de informações fiscais nas respostas quando disponíveis

## Drivers SAT Suportados

Inicialmente, o módulo suportará os seguintes drivers:

1. **Simulado**
   - Para testes sem hardware real
   - Simula respostas e comportamentos do SAT

2. **DIMEP**
   - Suporte ao SAT DIMEP
   - Comunicação via DLL/biblioteca nativa

3. **Bematech**
   - Suporte ao SAT Bematech
   - Comunicação via DLL/biblioteca nativa

4. **Elgin**
   - Suporte ao SAT Elgin
   - Comunicação via DLL/biblioteca nativa

5. **Genérico**
   - Implementação baseada na especificação padrão
   - Para equipamentos compatíveis com a especificação

## Tratamento de Contingência

O módulo incluirá mecanismos de contingência para lidar com falhas:

1. **Modo Offline**
   - Armazenamento local de CF-e pendentes
   - Tentativa automática de reenvio quando o SAT estiver disponível

2. **Registro de Erros**
   - Log detalhado de erros e tentativas
   - Interface para visualização e resolução

3. **Alertas**
   - Notificação de erros críticos
   - Monitoramento de status do SAT

## Próximos Passos

1. Implementar modelos de dados e interfaces
2. Desenvolver driver de simulação para testes
3. Implementar serviço SAT básico
4. Integrar com fluxo de pedidos
5. Implementar drivers para equipamentos reais
6. Desenvolver interface de administração
7. Implementar mecanismos de contingência
8. Realizar testes abrangentes
