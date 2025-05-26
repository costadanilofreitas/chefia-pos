# Módulo de Ordens Remotas - Documentação

## Visão Geral

O Módulo de Ordens Remotas é uma extensão do sistema POS Modern que permite a integração com plataformas de delivery externas, começando pelo iFood. Este módulo possibilita o recebimento, processamento e gerenciamento de pedidos provenientes dessas plataformas, integrando-os ao fluxo de pedidos existente no sistema.

## Arquitetura

O módulo segue a arquitetura modular do sistema POS Modern, com separação clara entre modelos, serviços, adaptadores e endpoints da API:

```
src/remote_orders/
├── models/
│   └── remote_order_models.py    # Modelos de dados para pedidos remotos
├── services/
│   └── remote_order_service.py   # Serviço de gerenciamento de pedidos remotos
├── adapters/
│   └── ifood_adapter.py          # Adaptador específico para o iFood
├── router/
│   └── remote_order_router.py    # Endpoints da API para pedidos remotos
├── events/
│   └── remote_order_events.py    # Eventos relacionados a pedidos remotos
└── tests/
    ├── test_ifood_adapter.py     # Testes para o adaptador iFood
    ├── test_remote_order_service.py  # Testes para o serviço
    └── test_remote_order_router.py   # Testes para os endpoints da API
```

## Componentes Principais

### Modelos de Dados

Os modelos de dados definem a estrutura dos pedidos remotos e suas configurações:

- `RemoteOrder`: Representa um pedido recebido de uma plataforma externa
- `RemoteOrderItem`: Item de um pedido remoto
- `RemoteOrderCustomer`: Dados do cliente em um pedido remoto
- `RemoteOrderPayment`: Informações de pagamento de um pedido remoto
- `RemotePlatformConfig`: Configurações para integração com uma plataforma

### Serviço de Pedidos Remotos

O serviço `RemoteOrderService` é responsável por:

- Processar pedidos recebidos via webhook
- Converter pedidos remotos para o formato interno
- Gerenciar o ciclo de vida dos pedidos remotos
- Sincronizar status entre pedidos internos e remotos
- Publicar eventos relacionados a pedidos remotos

### Adaptador iFood

O adaptador `IFoodAdapter` implementa a integração específica com o iFood:

- Autenticação com a API do iFood
- Conversão de dados do formato iFood para o formato interno
- Atualização de status de pedidos no iFood
- Verificação de assinaturas de webhook

### Endpoints da API

O módulo expõe os seguintes endpoints:

- `/api/v1/remote-orders/webhook/{platform}`: Recebe webhooks das plataformas
- `/api/v1/remote-orders/`: Lista pedidos remotos
- `/api/v1/remote-orders/{order_id}`: Obtém detalhes de um pedido remoto
- `/api/v1/remote-orders/{order_id}/accept`: Aceita um pedido remoto
- `/api/v1/remote-orders/{order_id}/reject`: Rejeita um pedido remoto
- `/api/v1/remote-platforms/`: Gerencia configurações de plataformas

## Fluxo de Pedidos

1. **Recebimento**: Um pedido é recebido via webhook da plataforma externa
2. **Processamento**: O pedido é convertido para o formato interno e salvo
3. **Aceitação/Rejeição**: O pedido pode ser aceito (criando um pedido interno) ou rejeitado
4. **Sincronização**: Mudanças de status no pedido interno são propagadas para a plataforma externa

## Eventos

O módulo publica os seguintes eventos no barramento de eventos do sistema:

- `REMOTE_ORDER_RECEIVED`: Quando um novo pedido é recebido
- `REMOTE_ORDER_ACCEPTED`: Quando um pedido é aceito
- `REMOTE_ORDER_REJECTED`: Quando um pedido é rejeitado
- `REMOTE_ORDER_STATUS_CHANGED`: Quando o status de um pedido é alterado
- `REMOTE_ORDER_ERROR`: Quando ocorre um erro no processamento

## Integração com o Sistema Existente

O módulo se integra com o sistema existente através de:

- Conversão de pedidos remotos para o formato interno de pedidos
- Propagação de mudanças de status entre pedidos internos e remotos
- Publicação de eventos no barramento de eventos do sistema

## Configuração

As configurações para cada plataforma são armazenadas em arquivos JSON:

```json
{
  "platform": "ifood",
  "enabled": true,
  "api_key": "sua_api_key",
  "api_secret": "seu_api_secret",
  "webhook_url": "https://seu-dominio.com/api/v1/remote-orders/webhook/ifood",
  "auto_accept": false
}
```

## Extensibilidade

O módulo foi projetado para ser facilmente extensível para outras plataformas:

1. Criar um novo adaptador para a plataforma (ex: `uber_eats_adapter.py`)
2. Implementar os métodos necessários no adaptador
3. Registrar o adaptador no serviço de pedidos remotos
4. Adicionar a configuração para a nova plataforma

## Testes

O módulo inclui testes abrangentes para todos os componentes:

- Testes unitários para o adaptador iFood
- Testes para o serviço de pedidos remotos
- Testes para os endpoints da API
- Testes de integração com o fluxo de pedidos existente

## Requisitos

- Python 3.8+
- FastAPI
- aiohttp (para comunicação assíncrona com APIs externas)
- Acesso à internet para comunicação com as APIs das plataformas

## Próximos Passos

- Implementar adaptadores para outras plataformas (Uber Eats, Rappi, etc.)
- Adicionar interface de usuário para gerenciamento de pedidos remotos
- Implementar relatórios e análises específicas para pedidos remotos
