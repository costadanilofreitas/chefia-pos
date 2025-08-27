# Design do Módulo Fiscal

## Visão Geral

O Módulo Fiscal do POS Modern é responsável pelo cálculo de impostos conforme as regras regionais brasileiras e pela integração com o Sistema Autenticador e Transmissor (SAT) para emissão de documentos fiscais. Este módulo foi projetado para ser flexível, configurável e adaptável às diferentes legislações fiscais do Brasil.

## Objetivos

1. Calcular corretamente os impostos (ICMS, PIS, COFINS, etc.) de acordo com a região
2. Integrar-se ao módulo SAT para emissão de documentos fiscais
3. Suportar diferentes regras fiscais por estado e município
4. Permitir configuração fácil e manutenção das regras fiscais
5. Fornecer uma API clara para outros módulos do sistema

## Arquitetura

### Componentes Principais

1. **Modelos de Dados (fiscal_models.py)**
   - Definição das estruturas de dados para regras fiscais, configurações regionais e cálculos
   - Suporte a diferentes tipos de impostos (ICMS, PIS, COFINS, ISS, etc.)
   - Modelos para NCM, CFOP, CST e outras classificações fiscais

2. **Serviço Fiscal (fiscal_service.py)**
   - Lógica principal para cálculo de impostos
   - Determinação das alíquotas aplicáveis com base na região e tipo de produto
   - Cálculo de valores de impostos para itens e pedidos completos

3. **Configuração Regional (regional_config.py)**
   - Definição de regras fiscais por estado e município
   - Mapeamento de NCM para alíquotas específicas
   - Regras de substituição tributária e benefícios fiscais

4. **Integração SAT (fiscal_sat_integration.py)**
   - Ponte entre o módulo fiscal e o módulo SAT
   - Conversão de dados fiscais para o formato esperado pelo SAT
   - Tratamento de respostas e erros do SAT

5. **API REST (fiscal_router.py)**
   - Endpoints para consulta de regras fiscais
   - Cálculo de impostos para simulações
   - Configuração e manutenção das regras fiscais

### Diagrama de Componentes

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Módulo Pedido  │────▶│  Módulo Fiscal  │────▶│   Módulo SAT    │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Configuração   │
                        │    Regional     │
                        └─────────────────┘
```

## Fluxo de Dados

### Cálculo de Impostos para um Pedido

1. O módulo de Pedido solicita o cálculo de impostos para um pedido
2. O Serviço Fiscal identifica a região do estabelecimento
3. Para cada item do pedido:
   - Identifica a classificação fiscal (NCM, CFOP, CST)
   - Consulta as regras fiscais aplicáveis para a região
   - Calcula os valores de impostos (ICMS, PIS, COFINS, etc.)
4. Agrega os valores de impostos para o pedido completo
5. Retorna os detalhes fiscais para o módulo de Pedido

### Integração com SAT para Emissão de CF-e

1. O módulo de Pedido solicita a emissão de um CF-e
2. O Serviço Fiscal prepara os dados fiscais do pedido
3. O componente de Integração SAT converte os dados para o formato esperado pelo SAT
4. Os dados são enviados para o módulo SAT para emissão do CF-e
5. A resposta do SAT é processada e retornada ao módulo de Pedido

## Modelo de Dados

### Configuração Regional

```json
{
  "uf": "SP",
  "municipio": "São Paulo",
  "regime_tributario": "SIMPLES",
  "aliquota_icms_padrao": 18.0,
  "aliquota_iss_padrao": 5.0,
  "substituicao_tributaria": true,
  "regras_ncm": [
    {
      "codigo_ncm": "2106.90.10",
      "descricao": "Preparações para elaboração de bebidas",
      "aliquota_icms": 18.0,
      "aliquota_pis": 1.65,
      "aliquota_cofins": 7.6,
      "cst_icms": "00",
      "cst_pis": "01",
      "cst_cofins": "01",
      "cfop": "5102"
    }
  ],
  "beneficios_fiscais": [
    {
      "codigo": "SP12345",
      "descricao": "Redução de base de cálculo para restaurantes",
      "tipo_imposto": "ICMS",
      "percentual_reducao": 30.0,
      "data_inicio": "2023-01-01",
      "data_fim": "2025-12-31"
    }
  ]
}
```

### Grupo Fiscal de Produto

```json
{
  "id": "GF001",
  "descricao": "Alimentos Preparados",
  "codigo_ncm": "2106.90.10",
  "codigo_cest": "1234567",
  "tipo_item": "PRODUTO",
  "origem": "0",
  "icms": {
    "cst": "00",
    "aliquota": 18.0,
    "base_calculo": 100.0
  },
  "pis": {
    "cst": "01",
    "aliquota": 1.65,
    "base_calculo": 100.0
  },
  "cofins": {
    "cst": "01",
    "aliquota": 7.6,
    "base_calculo": 100.0
  },
  "iss": {
    "aliquota": 5.0,
    "base_calculo": 100.0,
    "codigo_servico": "1234"
  }
}
```

### Resultado de Cálculo Fiscal

```json
{
  "item_id": "12345",
  "valor_bruto": 100.0,
  "valor_liquido": 100.0,
  "descontos": 0.0,
  "acrescimos": 0.0,
  "impostos": {
    "icms": {
      "cst": "00",
      "aliquota": 18.0,
      "base_calculo": 100.0,
      "valor": 18.0
    },
    "pis": {
      "cst": "01",
      "aliquota": 1.65,
      "base_calculo": 100.0,
      "valor": 1.65
    },
    "cofins": {
      "cst": "01",
      "aliquota": 7.6,
      "base_calculo": 100.0,
      "valor": 7.6
    }
  },
  "total_impostos": 27.25
}
```

## API REST

### Endpoints

#### Consulta de Regras Fiscais

```
GET /fiscal/rules?uf=SP&municipio=São Paulo
```

Resposta:
```json
{
  "uf": "SP",
  "municipio": "São Paulo",
  "regime_tributario": "SIMPLES",
  "aliquota_icms_padrao": 18.0,
  "aliquota_iss_padrao": 5.0,
  "substituicao_tributaria": true
}
```

#### Cálculo de Impostos para Simulação

```
POST /fiscal/calculate
{
  "items": [
    {
      "product_id": "12345",
      "quantity": 2,
      "unit_price": 50.0,
      "fiscal_group_id": "GF001"
    }
  ],
  "region": {
    "uf": "SP",
    "municipio": "São Paulo"
  }
}
```

Resposta:
```json
{
  "subtotal": 100.0,
  "total_impostos": 27.25,
  "detalhamento": [
    {
      "item_id": "12345",
      "valor_bruto": 100.0,
      "valor_liquido": 100.0,
      "impostos": {
        "icms": {
          "valor": 18.0
        },
        "pis": {
          "valor": 1.65
        },
        "cofins": {
          "valor": 7.6
        }
      },
      "total_impostos": 27.25
    }
  ]
}
```

## Integração com Outros Módulos

### Módulo de Produtos

O módulo fiscal se integra ao módulo de produtos para obter informações fiscais dos produtos, como grupo fiscal, NCM, CFOP, etc.

```python
# Exemplo de integração com o módulo de produtos
async def get_product_fiscal_info(product_id: str) -> ProductFiscalInfo:
    product = await product_service.get_product(product_id)
    return ProductFiscalInfo(
        fiscal_group_id=product.fiscal_group_id,
        ncm=product.ncm,
        cest=product.cest,
        origem=product.origem
    )
```

### Módulo de Pedidos

O módulo fiscal se integra ao módulo de pedidos para calcular os impostos dos pedidos e preparar os dados para emissão de documentos fiscais.

```python
# Exemplo de integração com o módulo de pedidos
async def calculate_order_taxes(order_id: str) -> OrderTaxResult:
    order = await order_service.get_order(order_id)
    region = await get_establishment_region(order.establishment_id)
    
    tax_result = OrderTaxResult(
        order_id=order_id,
        items=[]
    )
    
    for item in order.items:
        product_fiscal_info = await get_product_fiscal_info(item.product_id)
        item_tax = await fiscal_service.calculate_item_taxes(
            item=item,
            product_fiscal_info=product_fiscal_info,
            region=region
        )
        tax_result.items.append(item_tax)
    
    tax_result.total_taxes = sum(item.total_taxes for item in tax_result.items)
    return tax_result
```

### Módulo SAT

O módulo fiscal se integra ao módulo SAT para emissão de documentos fiscais.

```python
# Exemplo de integração com o módulo SAT
async def prepare_cfe_for_order(order_id: str) -> CFe:
    order = await order_service.get_order(order_id)
    tax_result = await calculate_order_taxes(order_id)
    
    cfe = CFe(
        id=str(uuid.uuid4()),
        order_id=order_id,
        terminal_id=order.terminal_id,
        cnpj_emitente=config.cnpj,
        ie_emitente=config.ie,
        razao_social_emitente=config.razao_social,
        valor_total=order.total,
        desconto=order.discount,
        acrescimo=0.0,
        itens=[],
        pagamentos=[]
    )
    
    # Adicionar itens com informações fiscais
    for i, item in enumerate(order.items):
        item_tax = next((tax for tax in tax_result.items if tax.item_id == item.id), None)
        if not item_tax:
            continue
            
        cfe_item = CFeItem(
            numero=i+1,
            codigo=item.product_id,
            descricao=item.product_name,
            quantidade=item.quantity,
            unidade="UN",
            valor_unitario=item.unit_price,
            valor_total=item.total_price,
            icms_grupo=item_tax.impostos.icms.cst,
            pis_grupo=item_tax.impostos.pis.cst,
            cofins_grupo=item_tax.impostos.cofins.cst,
            origem=item_tax.origem,
            ncm=item_tax.ncm
        )
        cfe.itens.append(cfe_item)
    
    # Adicionar pagamentos
    if order.payment_method:
        payment_type = map_payment_method_to_sat(order.payment_method)
        cfe_payment = CFePagamento(
            tipo=payment_type,
            valor=order.total
        )
        cfe.pagamentos.append(cfe_payment)
    
    return cfe
```

## Considerações de Implementação

### Configuração Regional

A configuração regional será armazenada em arquivos JSON no diretório `config/fiscal/`. Cada arquivo representará uma região (UF ou município) e conterá as regras fiscais específicas.

### Cache de Regras Fiscais

Para melhorar o desempenho, as regras fiscais serão carregadas em memória e atualizadas apenas quando houver alterações nos arquivos de configuração.

### Validação de Regras Fiscais

O módulo incluirá validadores para garantir que as regras fiscais estejam corretas e completas, evitando erros durante o cálculo de impostos.

### Logs e Auditoria

Todas as operações fiscais serão registradas em logs detalhados para fins de auditoria e depuração.

## Próximos Passos

1. Implementar os modelos de dados para o módulo fiscal
2. Desenvolver o serviço de cálculo fiscal com suporte a diferentes regiões
3. Criar a integração com o módulo SAT
4. Implementar a API REST para consulta e configuração de regras fiscais
5. Integrar o módulo fiscal ao fluxo de pedidos
6. Testar com diferentes cenários regionais e fiscais
