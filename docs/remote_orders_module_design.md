# Módulo de Ordens Remotas - Design de Arquitetura

## 1. Visão Geral

O Módulo de Ordens Remotas é responsável por integrar o sistema POS Modern com plataformas externas de pedidos, como iFood, Uber Eats, Rappi, entre outras. Este documento detalha a arquitetura, componentes e fluxos de integração, começando com a implementação do adaptador para o iFood.

## 2. Objetivos

- Receber e processar pedidos de plataformas externas
- Converter pedidos externos para o formato interno do sistema
- Notificar sobre atualizações de status de pedidos
- Manter sincronização bidirecional de status
- Garantir rastreabilidade e auditoria de pedidos remotos
- Permitir configuração flexível por plataforma

## 3. Arquitetura

### 3.1 Componentes Principais

![Diagrama de Arquitetura](../docs/images/remote_orders_architecture.png)

1. **API Gateway**: Ponto de entrada para webhooks das plataformas externas
2. **Adaptadores de Plataforma**: Conversores específicos para cada plataforma (iFood, Uber Eats, etc.)
3. **Serviço de Ordens Remotas**: Gerencia o ciclo de vida de pedidos remotos
4. **Repositório de Ordens Remotas**: Armazena dados específicos de pedidos remotos
5. **Integração com Barramento de Eventos**: Publica e assina eventos relacionados a pedidos

### 3.2 Fluxo de Dados

```
Plataforma Externa → API Gateway → Adaptador → Serviço de Ordens Remotas → Serviço de Pedidos → Barramento de Eventos
```

## 4. Adaptador iFood

### 4.1 Funcionalidades

- Receber webhooks do iFood para novos pedidos e atualizações
- Converter pedidos do formato iFood para o formato interno
- Enviar atualizações de status para o iFood
- Gerenciar autenticação e autorização com a API do iFood
- Lidar com erros e retentativas

### 4.2 Mapeamento de Dados

| iFood                   | POS Modern              | Observações                                |
|-------------------------|-------------------------|-------------------------------------------|
| id                      | external_order_id       | ID original mantido para rastreabilidade   |
| orderType               | order_type              | Mapeado para enums internos                |
| customer                | customer_*              | Dados do cliente mapeados individualmente  |
| items                   | items                   | Produtos mapeados por código ou nome       |
| totalPrice              | total                   | Valor total do pedido                      |
| deliveryFee             | delivery_fee            | Taxa de entrega                            |
| payments                | payment_method          | Método de pagamento mapeado                |

### 4.3 Mapeamento de Status

| iFood                   | POS Modern              | Observações                                |
|-------------------------|-------------------------|-------------------------------------------|
| PLACED                  | PENDING                 | Pedido recebido                           |
| CONFIRMED               | PREPARING               | Pedido confirmado, em preparação          |
| DISPATCHED              | DELIVERING              | Pedido em rota de entrega                 |
| DELIVERED               | DELIVERED               | Pedido entregue                           |
| CANCELLED               | CANCELLED               | Pedido cancelado                          |

## 5. Serviço de Ordens Remotas

### 5.1 Responsabilidades

- Gerenciar o ciclo de vida de pedidos remotos
- Coordenar a comunicação entre adaptadores e o sistema interno
- Manter registro de pedidos remotos e suas correspondências internas
- Processar filas de pedidos e atualizações
- Gerenciar configurações por plataforma

### 5.2 Interfaces

```python
class RemoteOrderService:
    async def process_remote_order(self, platform: str, order_data: dict) -> Order:
        """Processa um pedido remoto e o converte para um pedido interno."""
        
    async def update_remote_order_status(self, order_id: str, status: OrderStatus) -> bool:
        """Atualiza o status de um pedido remoto na plataforma externa."""
        
    async def get_remote_order_by_external_id(self, platform: str, external_id: str) -> Optional[RemoteOrder]:
        """Busca um pedido remoto pelo ID externo."""
        
    async def list_remote_orders(self, platform: str, status: Optional[OrderStatus] = None) -> List[RemoteOrder]:
        """Lista pedidos remotos com filtros."""
```

## 6. Modelos de Dados

### 6.1 RemoteOrder

```python
class RemoteOrder(BaseModel):
    id: str
    platform: str  # "ifood", "ubereats", etc.
    external_order_id: str
    internal_order_id: str
    raw_data: Dict[str, Any]  # Dados originais da plataforma
    status: str
    last_update: datetime
    created_at: datetime
    updated_at: datetime
```

### 6.2 RemotePlatformConfig

```python
class RemotePlatformConfig(BaseModel):
    platform: str
    enabled: bool
    api_key: str
    api_secret: str
    webhook_url: str
    auto_accept: bool
    default_preparation_time: int  # em minutos
    notification_email: Optional[str]
    notification_phone: Optional[str]
```

## 7. Eventos

### 7.1 Eventos Publicados

- `REMOTE_ORDER_RECEIVED`: Quando um novo pedido remoto é recebido
- `REMOTE_ORDER_ACCEPTED`: Quando um pedido remoto é aceito
- `REMOTE_ORDER_REJECTED`: Quando um pedido remoto é rejeitado
- `REMOTE_ORDER_STATUS_CHANGED`: Quando o status de um pedido remoto muda
- `REMOTE_ORDER_ERROR`: Quando ocorre um erro no processamento de um pedido remoto

### 7.2 Eventos Assinados

- `ORDER_STATUS_CHANGED`: Para atualizar o status na plataforma externa
- `ORDER_CANCELLED`: Para cancelar o pedido na plataforma externa

## 8. API REST

### 8.1 Endpoints

- `POST /api/v1/remote-orders/webhook/{platform}`: Recebe webhooks das plataformas
- `GET /api/v1/remote-orders/`: Lista pedidos remotos
- `GET /api/v1/remote-orders/{id}`: Obtém detalhes de um pedido remoto
- `PUT /api/v1/remote-orders/{id}/status`: Atualiza o status de um pedido remoto
- `GET /api/v1/remote-platforms/`: Lista plataformas configuradas
- `PUT /api/v1/remote-platforms/{platform}`: Atualiza configuração de uma plataforma

## 9. Configuração

### 9.1 Arquivo de Configuração

```json
{
  "remote_platforms": [
    {
      "platform": "ifood",
      "enabled": true,
      "api_key": "your-api-key",
      "api_secret": "your-api-secret",
      "webhook_url": "https://your-domain.com/api/v1/remote-orders/webhook/ifood",
      "auto_accept": true,
      "default_preparation_time": 30,
      "notification_email": "manager@restaurant.com",
      "notification_phone": "+5511999999999"
    }
  ]
}
```

## 10. Tratamento de Erros

### 10.1 Estratégias

- **Retentativas**: Para falhas temporárias de comunicação
- **Fila de Processamento**: Para garantir que pedidos não sejam perdidos
- **Logs Detalhados**: Para auditoria e diagnóstico
- **Notificações**: Para alertar sobre problemas críticos
- **Modo de Contingência**: Para operação offline temporária

### 10.2 Cenários de Erro

| Cenário                                | Estratégia                                                  |
|----------------------------------------|------------------------------------------------------------|
| Falha na comunicação com a plataforma  | Retentativa com backoff exponencial                        |
| Produto não encontrado                 | Notificação para operador e registro em log                |
| Pedido duplicado                       | Detecção e prevenção de duplicação                         |
| Falha no processamento interno         | Registro em log e notificação para administrador           |

## 11. Segurança

- Autenticação via API keys e secrets
- Validação de assinaturas de webhooks
- Sanitização de dados de entrada
- Limitação de taxa para prevenção de abuso
- Logs de auditoria para todas as operações

## 12. Monitoramento

- Métricas de pedidos por plataforma
- Tempo médio de processamento
- Taxa de erros
- Alertas para falhas críticas
- Dashboard operacional

## 13. Implementação Faseada

### Fase 1: iFood (Atual)
- Implementação do adaptador iFood
- Configuração básica
- Fluxos principais de pedido

### Fase 2: Expansão
- Adaptadores para outras plataformas (Uber Eats, Rappi)
- Melhorias na interface de usuário
- Relatórios avançados

### Fase 3: Otimização
- Melhorias de performance
- Recursos avançados de integração
- Automações adicionais

## 14. Considerações Técnicas

- Uso de webhooks para comunicação assíncrona
- Cache para dados frequentemente acessados
- Transações para garantir consistência de dados
- Idempotência para evitar processamento duplicado
- Timeout adequado para operações externas
