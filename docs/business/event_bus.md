# Arquitetura e Uso do Event Bus - POS Moderno

## Visão Geral

O Event Bus (barramento de eventos) é um componente central do sistema POS Moderno, responsável por facilitar a comunicação assíncrona entre diferentes módulos da aplicação. Ele implementa o padrão de design Publish-Subscribe (Pub/Sub), permitindo que componentes publiquem eventos sem conhecer os destinatários, e que outros componentes se inscrevam para receber notificações sobre eventos específicos.

## Arquitetura

```
+------------------+                    +------------------+
|    Publicador    |                    |    Assinante     |
|    (Publisher)   |                    |   (Subscriber)   |
+------------------+                    +------------------+
        |                                       ^
        | 1. Publica evento                     |
        v                                       |
+------------------+                            |
|                  |                            |
|    Event Bus     |----2. Notifica assinantes-+
|                  |
+------------------+
        |
        v
+------------------+
|    Histórico     |
|    de Eventos    |
+------------------+
```

### Componentes Principais

1. **Event**: Representa um evento no sistema, contendo:
   - ID único
   - Tipo de evento (EventType)
   - Dados associados ao evento
   - Timestamp de criação
   - Métodos para serialização/desserialização

2. **EventType**: Enumeração de todos os tipos de eventos suportados pelo sistema, organizados por domínio:
   - Autenticação (user.logged_in, user.logged_out, etc.)
   - Caixa (cashier.opened, cashier.closed, etc.)
   - Vendas (sale.created, sale.completed, etc.)
   - Sistema (system.started, system.error, etc.)

3. **EventHandler**: Interface para handlers de eventos, que define o método `handle(event)` que será chamado quando um evento for recebido.

4. **EventBus**: Interface que define os métodos para publicação e assinatura de eventos:
   - `publish(event)`: Publica um evento para todos os assinantes interessados
   - `subscribe(event_type, handler)`: Inscreve um handler para um tipo de evento
   - `unsubscribe(event_type, handler)`: Cancela a inscrição de um handler

5. **InMemoryEventBus**: Implementação em memória do EventBus, que:
   - Mantém um registro de assinantes por tipo de evento
   - Armazena um histórico limitado de eventos
   - Notifica os assinantes quando eventos são publicados

## Fluxo de Comunicação

1. **Publicação de Eventos**:
   - Um componente cria um evento com um tipo específico e dados relevantes
   - O componente publica o evento no Event Bus
   - O Event Bus armazena o evento no histórico
   - O Event Bus notifica todos os handlers inscritos para aquele tipo de evento

2. **Assinatura de Eventos**:
   - Um componente cria um handler que implementa a interface EventHandler
   - O componente inscreve o handler no Event Bus para tipos específicos de eventos
   - Quando eventos desses tipos são publicados, o handler é notificado

3. **Processamento de Eventos**:
   - O handler recebe o evento e extrai os dados relevantes
   - O handler executa a lógica de negócio apropriada
   - O handler pode publicar novos eventos como resultado do processamento

## Como Usar o Event Bus

### 1. Publicar um Evento

```python
from src.core.events.event_bus import Event, EventType, get_event_bus

async def create_sale(sale_data):
    # Lógica para criar uma venda
    sale_id = "123"
    
    # Publicar evento de venda criada
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.SALE_CREATED,
        data={
            "sale_id": sale_id,
            "amount": sale_data["total_amount"],
            "items": sale_data["items"],
            "cashier_id": sale_data["cashier_id"],
            "operator_id": sale_data["operator_id"]
        }
    )
    await event_bus.publish(event)
    
    return sale_id
```

### 2. Criar um Handler de Eventos

```python
from src.core.events.event_bus import EventHandler, Event, EventType

class SaleEventHandler(EventHandler):
    """Handler para eventos de venda."""
    
    async def handle(self, event: Event) -> None:
        """Processa eventos de venda."""
        if event.type == EventType.SALE_CREATED:
            await self._handle_sale_created(event)
        elif event.type == EventType.SALE_COMPLETED:
            await self._handle_sale_completed(event)
    
    async def _handle_sale_created(self, event: Event) -> None:
        """Processa evento de venda criada."""
        sale_id = event.data.get("sale_id")
        amount = event.data.get("amount")
        print(f"Venda {sale_id} criada com valor {amount}")
        
        # Aqui poderia ter lógica adicional, como:
        # - Atualizar estatísticas de vendas
        # - Enviar notificação para o KDS
        # - Atualizar estoque
    
    async def _handle_sale_completed(self, event: Event) -> None:
        """Processa evento de venda concluída."""
        sale_id = event.data.get("sale_id")
        payment_method = event.data.get("payment_method")
        print(f"Venda {sale_id} concluída com pagamento via {payment_method}")
        
        # Aqui poderia ter lógica adicional, como:
        # - Emitir nota fiscal
        # - Atualizar relatórios
        # - Registrar comissão
```

### 3. Inscrever um Handler

```python
from src.core.events.event_bus import EventType, get_event_bus

async def setup_sale_handlers():
    # Criar handler
    sale_handler = SaleEventHandler()
    
    # Obter instância do event bus
    event_bus = get_event_bus()
    
    # Inscrever handler para eventos de venda
    await event_bus.subscribe(EventType.SALE_CREATED, sale_handler)
    await event_bus.subscribe(EventType.SALE_COMPLETED, sale_handler)
```

### 4. Cancelar Inscrição de um Handler

```python
async def cleanup_sale_handlers(sale_handler):
    event_bus = get_event_bus()
    
    # Cancelar inscrição do handler
    await event_bus.unsubscribe(EventType.SALE_CREATED, sale_handler)
    await event_bus.unsubscribe(EventType.SALE_COMPLETED, sale_handler)
```

### 5. Acessar o Histórico de Eventos

```python
def get_recent_events(limit=10):
    event_bus = get_event_bus()
    
    # Obter os últimos eventos
    recent_events = event_bus.get_history(limit)
    
    return recent_events
```

## Padrões e Boas Práticas

### Estrutura de Dados dos Eventos

Os dados dos eventos devem seguir uma estrutura consistente:

1. **Identificadores**: Sempre incluir IDs relevantes para rastreabilidade
2. **Timestamps**: Incluir informações temporais quando relevante
3. **Dados Completos**: Incluir todos os dados necessários para processamento
4. **Dados Mínimos**: Evitar incluir dados desnecessários ou redundantes

Exemplo de estrutura para evento de venda:

```python
{
    "sale_id": "123",
    "amount": 99.99,
    "items": [
        {"product_id": "p1", "quantity": 2, "price": 29.99},
        {"product_id": "p2", "quantity": 1, "price": 40.01}
    ],
    "cashier_id": "caixa01",
    "operator_id": "op123",
    "timestamp": 1621234567.89,
    "payment_method": "credit_card"
}
```

### Organização de Handlers

1. **Separação por Domínio**: Criar handlers específicos para cada domínio (vendas, estoque, autenticação, etc.)
2. **Responsabilidade Única**: Cada handler deve ter uma única responsabilidade
3. **Métodos Privados**: Usar métodos privados para processar tipos específicos de eventos
4. **Logging**: Incluir logging adequado para facilitar depuração

### Tratamento de Erros

1. **Capturar Exceções**: Handlers devem capturar exceções para evitar que falhas em um handler afetem outros
2. **Publicar Eventos de Erro**: Quando apropriado, publicar eventos de erro para notificar o sistema
3. **Retry**: Implementar mecanismos de retry para operações que podem falhar temporariamente

```python
async def handle(self, event: Event) -> None:
    try:
        # Processamento do evento
        await self._process_event(event)
    except Exception as e:
        logger.error(f"Erro ao processar evento {event.type}: {str(e)}")
        
        # Publicar evento de erro
        error_event = Event(
            event_type=EventType.SYSTEM_ERROR,
            data={
                "error": {
                    "message": f"Erro ao processar evento {event.type}",
                    "original_event_id": event.id,
                    "exception": str(e)
                }
            }
        )
        await get_event_bus().publish(error_event)
```

## Casos de Uso Comuns

### 1. Notificação de Login

Quando um usuário faz login, o sistema publica um evento que pode ser usado para:
- Registrar a atividade do usuário
- Verificar se é o primeiro login do dia
- Carregar configurações específicas do usuário

### 2. Processamento de Vendas

Quando uma venda é criada:
- O módulo de estoque é notificado para atualizar quantidades
- O módulo de relatórios é notificado para atualizar estatísticas
- O KDS é notificado para exibir novos pedidos

### 3. Monitoramento do Sistema

Eventos de sistema podem ser usados para:
- Registrar erros e exceções
- Monitorar performance
- Detectar problemas potenciais

### 4. Sincronização Offline

O histórico de eventos pode ser usado para:
- Sincronizar dados quando a conexão é restabelecida
- Reconstruir o estado do sistema após falhas
- Auditar operações realizadas

## Extensão do Event Bus

### Implementações Alternativas

O sistema foi projetado para permitir diferentes implementações do EventBus:

1. **InMemoryEventBus**: Implementação padrão, adequada para ambiente local
2. **PersistentEventBus**: Poderia armazenar eventos em banco de dados
3. **DistributedEventBus**: Poderia usar RabbitMQ ou Kafka para comunicação distribuída

Para usar uma implementação alternativa:

```python
from src.core.events.custom_event_bus import CustomEventBus

# Substituir a implementação padrão
_event_bus_instance = CustomEventBus()
```

### Adicionando Novos Tipos de Eventos

Para adicionar novos tipos de eventos:

1. Adicione o novo tipo à enumeração EventType
2. Crie handlers para processar o novo tipo de evento
3. Atualize a documentação para refletir o novo tipo

```python
class EventType(str, Enum):
    # Tipos existentes...
    
    # Novo tipo de evento
    CUSTOMER_REGISTERED = "customer.registered"
```

## Conclusão

O Event Bus é um componente fundamental do sistema POS Moderno, permitindo comunicação desacoplada entre módulos. Ao seguir as práticas recomendadas e entender a arquitetura, os desenvolvedores podem estender o sistema de forma modular e manter a coesão do código.

Para mais informações, consulte os testes em `src/tests/test_event_bus.py` que demonstram diversos cenários de uso do Event Bus.
