# Módulo de Ordem (Pedidos) - Documentação

## Visão Geral

O módulo de Ordem (Pedidos) é responsável por gerenciar todo o ciclo de vida dos pedidos no sistema POS, desde a criação até o pagamento e entrega. Este módulo foi projetado para suportar uma ampla variedade de personalizações e variações de produtos, incluindo:

- Remoção e adição de ingredientes
- Produtos compostos (como pizza meio-a-meio)
- Seleção de opções de categoria (tipo de pão, massa, borda)
- Produtos vendidos por peso
- Agregados (molhos, talheres, etc.)
- Combos com possibilidade de troca de itens

## Modelos de Dados

### OrderItem (Item de Pedido)

Representa um item individual em um pedido, com suporte para todas as personalizações possíveis:

- **id**: Identificador único do item
- **order_id**: Referência ao pedido
- **product_id**: Referência ao produto
- **product_name**: Nome do produto (para exibição)
- **product_type**: Tipo do produto (single, combo, weight_based, composite)
- **quantity**: Quantidade (pode ser fracionária para produtos por peso)
- **unit_price**: Preço unitário (após ajustes de personalização)
- **total_price**: Preço total (unit_price * quantity)
- **customizations**: Lista de personalizações (remoção/adição de ingredientes, seleção de opções)
- **sections**: Lista de seções para produtos compostos (ex: pizza meio-a-meio)
- **notes**: Observações adicionais

### OrderItemCustomization (Personalização de Item)

Representa uma personalização aplicada a um item de pedido:

- **type**: Tipo de personalização (remove_ingredient, add_ingredient, option_selection)
- **target_id**: ID do ingrediente ou opção
- **name**: Nome do ingrediente ou opção (para exibição)
- **quantity**: Quantidade (para ingredientes extras)
- **price_adjustment**: Ajuste de preço (positivo ou negativo)
- **notes**: Observações adicionais

### OrderItemSection (Seção de Item Composto)

Representa uma seção de um produto composto (ex: metade de uma pizza):

- **section_id**: ID da seção no produto composto
- **product_id**: ID do produto selecionado para esta seção
- **product_name**: Nome do produto (para exibição)
- **proportion**: Proporção da seção no produto total (0.5 = metade)
- **price_adjustment**: Ajuste de preço adicional

### Order (Pedido)

Representa um pedido completo:

- **id**: Identificador único do pedido
- **customer_id**: Referência ao cliente (opcional)
- **customer_name**: Nome do cliente (opcional)
- **cashier_id**: Referência ao caixa/operador
- **table_number**: Número da mesa (opcional)
- **order_number**: Número do pedido (formato YYYYMMDD-XXXX)
- **order_type**: Tipo do pedido (dine_in, takeout, delivery, drive_thru)
- **status**: Status do pedido (pending, preparing, ready, delivered, canceled)
- **payment_status**: Status do pagamento (pending, paid, refunded, canceled)
- **payment_method**: Método de pagamento (cash, credit_card, debit_card, pix, voucher, mixed)
- **items**: Lista de itens do pedido
- **subtotal**: Valor subtotal (soma dos itens)
- **tax**: Valor de impostos
- **discount**: Valor de desconto
- **total**: Valor total (subtotal - discount + tax)
- **notes**: Observações adicionais
- **created_at**: Data/hora de criação
- **updated_at**: Data/hora de atualização
- **completed_at**: Data/hora de conclusão (opcional)

## Endpoints da API

### Pedidos

- **POST /api/v1/orders**: Cria um novo pedido
- **GET /api/v1/orders/{order_id}**: Busca um pedido pelo ID
- **GET /api/v1/orders**: Lista pedidos com filtros
- **PUT /api/v1/orders/{order_id}**: Atualiza um pedido
- **POST /api/v1/orders/{order_id}/cancel**: Cancela um pedido
- **POST /api/v1/orders/{order_id}/discount**: Aplica um desconto a um pedido
- **POST /api/v1/orders/{order_id}/payment**: Define o status de pagamento de um pedido

### Itens de Pedido

- **POST /api/v1/orders/{order_id}/items**: Adiciona um item a um pedido
- **PUT /api/v1/orders/items/{item_id}**: Atualiza um item de pedido
- **DELETE /api/v1/orders/items/{item_id}**: Remove um item de um pedido

## Fluxos Principais

### Criação de Pedido

1. Cliente faz um pedido (via caixa, garçom, totem ou delivery)
2. Sistema valida os produtos e calcula os preços considerando todas as personalizações
3. Pedido é criado com status "Pendente"
4. Evento `order.created` é publicado no barramento de eventos
5. Módulos interessados (KDS, impressão de comanda) são notificados

### Personalização de Produtos

1. Cliente solicita personalização (remover/adicionar ingredientes, trocar itens em combo)
2. Sistema calcula ajustes de preço com base nas personalizações
3. Personalizações são registradas no item do pedido
4. Preço total é recalculado

### Produtos Compostos (Pizza Meio-a-Meio)

1. Cliente seleciona produto composto (ex: pizza)
2. Cliente escolhe os sabores para cada seção (ex: metades)
3. Sistema calcula o preço com base na estratégia de precificação (maior valor, soma, média)
4. Produto composto é adicionado ao pedido com todas as seções especificadas

### Atualização de Status

1. Funcionário atualiza o status do pedido (preparando, pronto, entregue)
2. Sistema registra a mudança de status e timestamp
3. Evento `order.updated` é publicado no barramento de eventos
4. Módulos interessados são notificados da mudança

### Cancelamento de Pedido

1. Funcionário ou cliente solicita cancelamento
2. Sistema verifica se o pedido pode ser cancelado
3. Pedido é marcado como cancelado
4. Evento `order.canceled` é publicado no barramento de eventos
5. Módulos interessados são notificados

### Pagamento

1. Cliente realiza pagamento
2. Funcionário registra o método de pagamento e valor
3. Sistema atualiza o status de pagamento
4. Evento `order.payment_status_changed` é publicado no barramento de eventos

## Integração com Outros Módulos

### Módulo de Produtos e Cardápio

- Consulta de produtos, preços e disponibilidade
- Validação de personalizações e opções
- Cálculo de preços para produtos compostos e personalizados

### Módulo de Caixa

- Registro de vendas e pagamentos
- Abertura/fechamento de caixa
- Relatórios financeiros

### Módulo de KDS (Kitchen Display System)

- Exibição de pedidos para a cozinha
- Atualização de status de preparação
- Notificação de pedidos prontos

### Módulo de Impressão

- Impressão de comandas
- Impressão de recibos
- Impressão de relatórios

### Módulo de Estoque

- Baixa de estoque com base nos pedidos
- Alerta de produtos com estoque baixo
- Controle de ingredientes

## Regras de Negócio

### Validação de Pedidos

- Pedidos só podem ser criados quando há um dia de operação aberto
- Pedidos só podem ser associados a um caixa aberto
- Produtos inativos ou sem estoque não podem ser adicionados ao pedido

### Personalização de Produtos

- Remoção de ingredientes não altera o preço base
- Adição de ingredientes extras pode ter custo adicional
- Opções de categoria podem ter ajustes de preço (positivos ou negativos)

### Produtos Compostos

- Pizza meio-a-meio pode usar a estratégia de precificação do sabor mais caro ou média dos sabores
- Cada seção pode ter um ajuste de preço adicional

### Combos

- Itens em combos podem ser trocados por outros do mesmo grupo de troca
- Trocas podem ter ajustes de preço

### Cancelamento e Modificação

- Pedidos só podem ser modificados nos status "Pendente" ou "Preparando"
- Pedidos entregues não podem ser cancelados
- Cancelamento de pedidos pagos requer permissão especial

### Descontos

- Descontos não podem ser maiores que o subtotal do pedido
- Aplicação de descontos requer permissão especial
- Motivo do desconto deve ser registrado

## Exemplos de Uso

### Criação de Pedido Simples

```json
POST /api/v1/orders
{
  "customer_name": "João Silva",
  "order_type": "dine_in",
  "table_number": "15",
  "items": [
    {
      "product_id": "123e4567-e89b-12d3-a456-426614174000",
      "quantity": 1
    },
    {
      "product_id": "223e4567-e89b-12d3-a456-426614174001",
      "quantity": 2
    }
  ]
}
```

### Criação de Pedido com Personalização

```json
POST /api/v1/orders
{
  "customer_name": "Maria Oliveira",
  "order_type": "takeout",
  "items": [
    {
      "product_id": "123e4567-e89b-12d3-a456-426614174000",
      "quantity": 1,
      "customizations": [
        {
          "type": "remove_ingredient",
          "target_id": "ing-123",
          "name": "Cebola"
        },
        {
          "type": "add_ingredient",
          "target_id": "ing-456",
          "name": "Bacon Extra",
          "quantity": 1,
          "price_adjustment": 3.50
        }
      ]
    }
  ]
}
```

### Criação de Pedido com Pizza Meio-a-Meio

```json
POST /api/v1/orders
{
  "customer_name": "Carlos Pereira",
  "order_type": "delivery",
  "items": [
    {
      "product_id": "pizza-base-id",
      "quantity": 1,
      "sections": [
        {
          "section_id": "section-1",
          "product_id": "pizza-calabresa-id",
          "product_name": "Calabresa",
          "proportion": 0.5
        },
        {
          "section_id": "section-2",
          "product_id": "pizza-mussarela-id",
          "product_name": "Mussarela",
          "proportion": 0.5
        }
      ]
    }
  ]
}
```

## Considerações de Segurança

- Todas as operações de pedido requerem autenticação
- Criação de pedidos requer permissão `order:create`
- Atualização de pedidos requer permissão `order:update`
- Cancelamento de pedidos requer permissão `order:cancel`
- Aplicação de descontos requer permissão `order:discount`
- Definição de status de pagamento requer permissão `order:payment`

## Eventos Publicados

- `order.created`: Quando um novo pedido é criado
- `order.updated`: Quando um pedido é atualizado
- `order.item_added`: Quando um item é adicionado a um pedido
- `order.item_updated`: Quando um item de pedido é atualizado
- `order.item_removed`: Quando um item é removido de um pedido
- `order.canceled`: Quando um pedido é cancelado
- `order.discount_applied`: Quando um desconto é aplicado a um pedido
- `order.payment_status_changed`: Quando o status de pagamento é alterado

## Limitações e Considerações Futuras

- Suporte para pedidos recorrentes
- Integração com sistemas de fidelidade e cupons
- Suporte para divisão de conta
- Integração com sistemas de entrega externos
- Análise de dados para recomendações personalizadas
