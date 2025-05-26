# Documentação do Sistema de Cupons e Fidelidade

## Visão Geral

O Sistema de Cupons e Fidelidade é uma extensão do Módulo de Clientes que permite a criação e gerenciamento de cupons de desconto, bem como o resgate de pontos de fidelidade durante o processo de venda. Este sistema se integra com o Módulo de Pedidos para aplicar descontos e gerenciar pontos de fidelidade dos clientes.

## Funcionalidades Principais

1. **Cupons de Desconto**:
   - Criação e gerenciamento de cupons com diferentes tipos (percentual ou valor fixo)
   - Suporte a cupons para pedido completo ou produto específico
   - Regras de validação (data de validade, valor mínimo, limite de uso)
   - Rastreamento de uso de cupons

2. **Sistema de Pontos de Fidelidade**:
   - Acúmulo automático de pontos baseado no valor da compra
   - Resgate de pontos para obter descontos em pedidos
   - Conversão configurável de pontos para valor monetário (padrão: 100 pontos = R$1,00)
   - Histórico de resgates de pontos

3. **Integração com Pedidos**:
   - Aplicação de cupons durante a finalização do pedido
   - Resgate de pontos durante a finalização do pedido
   - Suporte a descontos combinados (cupom + pontos)
   - Atualização automática do histórico de compras do cliente

## Modelos de Dados

### Cupons

```python
class CouponType(str, Enum):
    PERCENTAGE = "percentage"  # Desconto percentual (ex: 10% off)
    FIXED = "fixed"            # Desconto de valor fixo (ex: R$10 off)

class CouponScope(str, Enum):
    ORDER = "order"            # Aplica-se ao pedido inteiro
    PRODUCT = "product"        # Aplica-se a um produto específico

class Coupon:
    id: UUID
    code: str                  # Código único do cupom
    description: str           # Descrição do cupom
    discount_type: CouponType  # Tipo de desconto (percentual ou fixo)
    discount_value: float      # Valor do desconto (percentual ou valor fixo)
    scope: CouponScope         # Escopo do cupom (pedido ou produto)
    product_id: Optional[UUID] # ID do produto se o escopo for PRODUCT
    min_order_value: Optional[float] # Valor mínimo do pedido necessário
    max_discount: Optional[float] # Valor máximo de desconto (para descontos percentuais)
    valid_from: date           # Data de início da validade
    valid_until: Optional[date] # Data de término da validade (None = sem expiração)
    max_uses: Optional[int]    # Número máximo de usos (None = ilimitado)
    is_active: bool            # Se o cupom está ativo
    uses_count: int            # Contador de usos do cupom
    created_at: datetime
    updated_at: datetime
```

### Resgates

```python
class CouponRedemption:
    coupon_id: UUID
    order_id: UUID
    customer_id: Optional[UUID]
    discount_amount: float
    redeemed_at: datetime

class PointsRedemption:
    customer_id: UUID
    order_id: UUID
    points_redeemed: int
    discount_amount: float
    redeemed_at: datetime
```

### Extensões ao Modelo de Pedido

```python
class Order:
    # Campos existentes...
    applied_coupon_code: Optional[str] # Código do cupom aplicado
    coupon_discount: float = 0.0       # Valor do desconto do cupom
    points_redeemed: Optional[int]     # Pontos resgatados
    points_discount: float = 0.0       # Valor do desconto dos pontos
```

## Fluxos de Trabalho

### Criação de Cupons

1. Um administrador cria um novo cupom através da API `/api/v1/customers/coupons/`
2. O sistema valida os dados do cupom (código único, valores válidos)
3. O cupom é armazenado e disponibilizado para uso

### Aplicação de Cupom em um Pedido

1. Durante a finalização de um pedido, o operador insere o código do cupom
2. O sistema valida o cupom através da API `/api/v1/customers/coupons/validate`
3. Se válido, o desconto é calculado e aplicado ao pedido via `/api/v1/orders/{order_id}/apply-coupon`
4. O pedido é atualizado com o código do cupom e o valor do desconto
5. Ao finalizar o pedido, o uso do cupom é registrado e o contador de usos é incrementado

### Resgate de Pontos de Fidelidade

1. Durante a finalização de um pedido para um cliente cadastrado, o operador verifica o saldo de pontos
2. O operador insere a quantidade de pontos a resgatar
3. O sistema calcula o desconto equivalente via `/api/v1/customers/{customer_id}/loyalty/calculate-discount`
4. O desconto é aplicado ao pedido via `/api/v1/orders/{order_id}/apply-points`
5. Ao finalizar o pedido, os pontos são deduzidos do saldo do cliente

### Finalização de Pedido com Descontos

1. O operador finaliza o pedido via `/api/v1/orders/{order_id}/finalize`
2. O sistema processa os descontos (cupom e/ou pontos)
3. Os pontos são deduzidos do saldo do cliente (se aplicável)
4. O uso do cupom é registrado (se aplicável)
5. Novos pontos são adicionados ao saldo do cliente com base no valor final do pedido
6. A compra é registrada no histórico do cliente

## Endpoints da API

### Cupons

- `POST /api/v1/customers/coupons/`: Cria um novo cupom
- `GET /api/v1/customers/coupons/`: Lista todos os cupons (com filtro opcional para ativos)
- `GET /api/v1/customers/coupons/{coupon_id}`: Obtém detalhes de um cupom específico
- `GET /api/v1/customers/coupons/code/{code}`: Obtém um cupom pelo código
- `PUT /api/v1/customers/coupons/{coupon_id}`: Atualiza um cupom existente
- `DELETE /api/v1/customers/coupons/{coupon_id}`: Exclui um cupom
- `POST /api/v1/customers/coupons/validate`: Valida um cupom e calcula o desconto

### Fidelidade

- `PATCH /api/v1/customers/{customer_id}/loyalty/`: Atualiza os pontos de fidelidade de um cliente
- `GET /api/v1/customers/{customer_id}/loyalty/calculate-discount`: Calcula o desconto para um número de pontos

### Pedidos

- `POST /api/v1/orders/{order_id}/apply-coupon`: Aplica um cupom a um pedido
- `POST /api/v1/orders/{order_id}/apply-points`: Aplica pontos de fidelidade a um pedido
- `POST /api/v1/orders/{order_id}/finalize`: Finaliza um pedido, processando pagamento e aplicando descontos

## Regras de Negócio

### Cupons

1. Cada cupom deve ter um código único
2. Cupons percentuais devem ter valores entre 0 e 100
3. Cupons de valor fixo devem ter valores positivos
4. Cupons para produtos específicos devem ter um product_id
5. Cupons podem ter um valor mínimo de pedido para serem aplicados
6. Cupons percentuais podem ter um valor máximo de desconto
7. Cupons podem ter um limite de usos
8. Cupons têm datas de validade (início e opcional fim)
9. Cupons podem ser desativados (is_active = false)

### Pontos de Fidelidade

1. A conversão padrão é de 100 pontos = R$1,00
2. Clientes ganham 1 ponto por unidade monetária gasta (arredondado para baixo)
3. Clientes só podem resgatar pontos que possuem
4. Pontos são deduzidos apenas quando o pedido é finalizado com sucesso
5. Pontos são adicionados apenas quando o pedido é finalizado com sucesso

## Considerações de Implementação

1. O sistema atualmente usa armazenamento em memória, que deve ser substituído por um banco de dados persistente em produção
2. A taxa de conversão de pontos (100:1) está definida como constante no código e deve ser movida para um arquivo de configuração
3. A lógica de atribuição de níveis de fidelidade (Bronze, Prata, Ouro) não está implementada e pode ser adicionada no futuro
4. O frontend para gerenciamento de cupons e aplicação de descontos no PDV ainda precisa ser implementado

## Exemplos de Uso

### Criar um Cupom de 10% de Desconto

```json
POST /api/v1/customers/coupons/
{
  "code": "WELCOME10",
  "description": "10% de desconto para novos clientes",
  "discount_type": "percentage",
  "discount_value": 10.0,
  "scope": "order",
  "min_order_value": 50.0,
  "max_discount": 30.0,
  "valid_from": "2025-05-01",
  "valid_until": "2025-06-30",
  "max_uses": 100,
  "is_active": true
}
```

### Aplicar um Cupom a um Pedido

```json
POST /api/v1/orders/123e4567-e89b-12d3-a456-426614174000/apply-coupon
{
  "coupon_code": "WELCOME10"
}
```

### Resgatar Pontos de Fidelidade

```json
POST /api/v1/orders/123e4567-e89b-12d3-a456-426614174000/apply-points
{
  "points_to_redeem": 500
}
```

### Finalizar um Pedido com Descontos

```json
POST /api/v1/orders/123e4567-e89b-12d3-a456-426614174000/finalize
{
  "payment_method": "CREDIT"
}
```
