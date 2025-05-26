# Documentação do Módulo SAT (Sistema Autenticador e Transmissor)

## Visão Geral

O módulo SAT implementa a integração com o Sistema Autenticador e Transmissor para emissão de notas fiscais (CF-e - Cupom Fiscal Eletrônico) no sistema POS Modern. Esta integração é **opcional**, permitindo que o sistema funcione com ou sem a emissão de documentos fiscais, dependendo das necessidades do estabelecimento.

## Características Principais

- **Integração Opcional**: Pode ser habilitada/desabilitada globalmente ou por terminal
- **Suporte a Múltiplos Fabricantes**: Estrutura modular para diferentes equipamentos SAT
- **Simulação para Testes**: Driver de simulação para testes sem hardware real
- **Integração com Fluxo de Vendas**: Emissão automática ao finalizar pedidos
- **Contingência**: Mecanismos para lidar com falhas e indisponibilidade
- **Monitoramento**: Logs detalhados de operações e erros

## Arquitetura

O módulo SAT segue uma arquitetura em camadas:

1. **Modelos de Dados** (`sat_models.py`): Define as estruturas de dados para configuração, CF-e e respostas
2. **Serviço SAT** (`sat_service.py`): Gerencia a comunicação com equipamentos SAT e conversão de dados
3. **Drivers SAT** (`drivers/`): Implementações específicas para diferentes fabricantes
4. **Eventos SAT** (`sat_events.py`): Integração com o barramento de eventos do sistema
5. **API REST** (`sat_router.py`): Endpoints para gerenciamento e operações do SAT
6. **Integração com Pedidos** (`order_service_with_sat.py`): Extensão do serviço de pedidos para emissão fiscal

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

## Configuração

### Configuração Global

A configuração global do SAT é armazenada em `src/sat/config/config.json`:

```json
{
  "enabled": true,
  "driver_type": "simulated",
  "contingency_mode": "offline",
  "auto_print": true,
  "retry_attempts": 3,
  "taxation": {
    "icms_groups": {
      "ICMS00": {
        "code": "00",
        "description": "Tributado integralmente",
        "tax_rate": 18.0,
        "cst": "00",
        "cfop": "5102"
      }
    },
    "default_icms_group": "ICMS00",
    "default_pis_group": "PIS01",
    "default_cofins_group": "COFINS01"
  }
}
```

### Configuração por Terminal

A configuração específica por terminal é armazenada em `src/pos/config/{terminal_id}.json`:

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
    "ie": "111111111111",
    "business_name": "EMPRESA TESTE LTDA"
  }
}
```

### Parâmetros de Configuração

| Parâmetro | Descrição | Valores |
|-----------|-----------|---------|
| enabled | Habilita/desabilita o SAT | true/false |
| driver_type | Tipo de driver SAT | "simulated", "dimep", "bematech", "elgin", "generic" |
| device_code | Código do dispositivo SAT | String |
| activation_code | Código de ativação do SAT | String |
| signature_ac | Assinatura do AC | String |
| cnpj | CNPJ do emitente | String (14 dígitos) |
| ie | Inscrição Estadual do emitente | String |
| business_name | Razão social do emitente | String |
| contingency_mode | Modo de contingência | "none", "offline", "manual" |
| auto_print | Impressão automática do extrato | true/false |
| retry_attempts | Número de tentativas em caso de falha | Inteiro |

## Habilitando/Desabilitando a Emissão Fiscal

A emissão fiscal pode ser habilitada/desabilitada em dois níveis:

### 1. Nível Global

Para habilitar/desabilitar globalmente, edite o arquivo `src/sat/config/config.json`:

```json
{
  "enabled": true,  // true para habilitar, false para desabilitar
  ...
}
```

### 2. Nível de Terminal

Para habilitar/desabilitar por terminal, edite o arquivo `src/pos/config/{terminal_id}.json`:

```json
{
  ...
  "sat": {
    "enabled": true,  // true para habilitar, false para desabilitar
    ...
  }
}
```

**Nota**: Para que a emissão fiscal funcione em um terminal, ela deve estar habilitada tanto no nível global quanto no nível do terminal.

## Fluxo de Emissão de CF-e

### Fluxo Automático (via Eventos)

1. Pedido é finalizado no POS
2. Evento `order.finalized` é publicado no barramento de eventos
3. Handler de eventos SAT captura o evento e verifica se o SAT está habilitado
4. Se habilitado, o pedido é convertido para o formato CF-e
5. CF-e é enviado para o equipamento SAT
6. Resultado da emissão é registrado e eventos são publicados

### Fluxo Manual (via API)

1. Aplicação chama o endpoint `POST /api/v1/sat/emit`
2. Serviço SAT verifica se o SAT está habilitado
3. Se habilitado, o pedido é convertido para o formato CF-e
4. CF-e é enviado para o equipamento SAT
5. Resultado da emissão é retornado na resposta da API

## API REST

### Endpoints Disponíveis

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| /api/v1/sat/status/{terminal_id} | GET | Obtém o status do SAT para um terminal específico |
| /api/v1/sat/emit | POST | Emite um CF-e para um pedido |
| /api/v1/sat/cancel | POST | Cancela um CF-e |
| /api/v1/sat/config | GET | Obtém a configuração global do SAT |
| /api/v1/sat/config | PUT | Atualiza a configuração global do SAT |
| /api/v1/sat/config/{terminal_id} | PUT | Atualiza a configuração do SAT para um terminal específico |
| /api/v1/sat/logs | GET | Obtém logs de operações do SAT |
| /api/v1/sat/process-pending | POST | Processa CF-e pendentes em modo de contingência |

### Exemplos de Uso

#### Emitir CF-e

```http
POST /api/v1/sat/emit
Content-Type: application/json

{
  "order_id": "ORDER-001",
  "terminal_id": "1",
  "customer_document": "12345678909",
  "customer_name": "Cliente Teste"
}
```

#### Cancelar CF-e

```http
POST /api/v1/sat/cancel
Content-Type: application/json

{
  "cfe_id": "CFE-001",
  "reason": "Cancelamento solicitado pelo cliente"
}
```

#### Atualizar Configuração

```http
PUT /api/v1/sat/config
Content-Type: application/json

{
  "enabled": true,
  "driver_type": "dimep",
  "contingency_mode": "offline"
}
```

## Integração com Barramento de Eventos

### Eventos Publicados

| Evento | Descrição |
|--------|-----------|
| sat.emit_requested | Solicitação de emissão de CF-e |
| sat.emit_completed | Emissão de CF-e concluída |
| sat.emit_failed | Falha na emissão de CF-e |
| sat.cancel_requested | Solicitação de cancelamento de CF-e |
| sat.cancel_completed | Cancelamento de CF-e concluído |
| sat.cancel_failed | Falha no cancelamento de CF-e |
| sat.status_changed | Mudança de status do SAT |

### Eventos Assinados

| Evento | Descrição |
|--------|-----------|
| order.finalized | Finalização de pedido |
| order.canceled | Cancelamento de pedido |

## Drivers SAT Suportados

### Driver Simulado

O driver simulado (`SimulatedSATDriver`) é usado para testes sem hardware real. Ele simula o comportamento de um equipamento SAT, incluindo:

- Emissão e cancelamento de CF-e
- Consulta de status
- Simulação de erros aleatórios
- Geração de chaves de acesso e XML simulados

### Drivers para Hardware Real

O módulo está preparado para suportar os seguintes drivers:

- **DIMEP** (`DimepSATDriver`)
- **Bematech** (`BematechSATDriver`)
- **Elgin** (`ElginSATDriver`)
- **Genérico** (`GenericSATDriver`)

Para implementar um novo driver, crie uma classe que herde de `SATDriver` e implemente os métodos abstratos.

## Tratamento de Contingência

O módulo inclui mecanismos para lidar com falhas na emissão fiscal:

### Modos de Contingência

- **Nenhum** (`ContingencyMode.NONE`): Sem tratamento de contingência
- **Offline** (`ContingencyMode.OFFLINE`): Armazena CF-e pendentes para reenvio posterior
- **Manual** (`ContingencyMode.MANUAL`): Requer intervenção manual para resolver falhas

### Processamento de Pendências

CF-e pendentes podem ser processados automaticamente quando o SAT estiver disponível ou manualmente através do endpoint `POST /api/v1/sat/process-pending`.

## Testes

O módulo inclui testes automatizados em `src/sat/tests/test_sat_module.py` que cobrem:

- Carregamento de configuração
- Inicialização do serviço
- Consulta de status
- Emissão de CF-e
- Comportamento quando desabilitado
- Conversão de pedido para CF-e
- Mapeamento de métodos de pagamento

Para executar os testes:

```bash
cd /home/ubuntu/pos-modern
python -m unittest src/sat/tests/test_sat_module.py
```

## Exemplos de Uso

### Emissão Automática ao Finalizar Pedido

O módulo estende o serviço de pedidos para emitir CF-e automaticamente ao finalizar um pedido:

```python
# Finalizar pedido com emissão fiscal (se habilitada)
order = await order_service.finalize_order(order_id, payment_method)
```

### Emissão Manual via API

```python
import requests

# Emitir CF-e
response = requests.post(
    "http://localhost:8000/api/v1/sat/emit",
    json={
        "order_id": "ORDER-001",
        "terminal_id": "1",
        "customer_document": "12345678909",
        "customer_name": "Cliente Teste"
    }
)

# Verificar resultado
if response.status_code == 200:
    result = response.json()
    if result["success"]:
        print(f"CF-e emitido com sucesso: {result['cfe']['chave_acesso']}")
    else:
        print(f"Erro ao emitir CF-e: {result['message']}")
```

## Solução de Problemas

### SAT não está emitindo CF-e

1. Verifique se o SAT está habilitado globalmente e no terminal específico
2. Verifique o status do SAT através do endpoint `GET /api/v1/sat/status/{terminal_id}`
3. Verifique os logs de operações do SAT através do endpoint `GET /api/v1/sat/logs`

### Erros de Comunicação com o SAT

1. Verifique se o equipamento SAT está ligado e conectado
2. Verifique se os parâmetros de conexão estão corretos
3. Tente reiniciar o serviço SAT

### CF-e Pendentes

1. Verifique se há CF-e pendentes através dos logs
2. Processe CF-e pendentes através do endpoint `POST /api/v1/sat/process-pending`

## Próximos Passos

- Implementação de drivers para hardware real (DIMEP, Bematech, Elgin)
- Interface administrativa para gerenciamento do SAT
- Relatórios fiscais
- Integração com outros módulos fiscais (NFC-e, NF-e)
