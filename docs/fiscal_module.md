# Documentação do Módulo Fiscal

## Visão Geral

O Módulo Fiscal é responsável pelo cálculo de impostos conforme a região, integração com o SAT (Sistema Autenticador e Transmissor) e geração de notas fiscais. Este módulo foi projetado para ser flexível, configurável e atender às diferentes necessidades fiscais em todo o Brasil.

## Funcionalidades Principais

- Cálculo de impostos (ICMS, PIS, COFINS, ISS, IPI) conforme regras regionais
- Suporte a diferentes regimes tributários (Simples Nacional, Lucro Presumido, Lucro Real, MEI)
- Configuração por UF e município
- Suporte a benefícios fiscais e regras específicas por NCM
- Integração com o módulo SAT para emissão de documentos fiscais
- Impressão de notas fiscais em impressoras térmicas
- API completa para gerenciamento de configurações fiscais
- Auditoria e rastreabilidade de operações fiscais

## Arquitetura

O módulo fiscal é composto pelos seguintes componentes:

1. **Modelos de Dados**: Definições de estruturas para configurações fiscais, grupos fiscais, regras NCM, etc.
2. **Serviço Fiscal**: Lógica principal para cálculo de impostos e gerenciamento de regras fiscais
3. **Serviço de Impressão de Notas**: Responsável pela geração e impressão de notas fiscais
4. **API REST**: Endpoints para gerenciamento de configurações e cálculo de impostos
5. **Integração com SAT**: Comunicação com o módulo SAT para emissão de documentos fiscais
6. **Templates de Impressão**: Modelos para impressão de notas fiscais

## Configuração

### Estrutura de Diretórios

```
/src/fiscal/
  ├── config/
  │   ├── regional/       # Configurações por região (UF/município)
  │   └── groups/         # Grupos fiscais para produtos/serviços
  ├── models/             # Modelos de dados
  ├── services/           # Serviços
  ├── router/             # API REST
  ├── templates/          # Templates de impressão
  └── tests/              # Testes automatizados
```

### Configurações Regionais

As configurações regionais são armazenadas em arquivos JSON no diretório `config/regional/`. Cada arquivo representa uma configuração para uma UF ou município específico.

Exemplo de configuração para São Paulo:

```json
{
  "id": "sp",
  "uf": "SP",
  "municipio": null,
  "regime_tributario": "simples",
  "aliquota_icms_padrao": 18.0,
  "aliquota_iss_padrao": 5.0,
  "substituicao_tributaria": false,
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
      "codigo": "B001",
      "descricao": "Redução ICMS Alimentos Básicos",
      "tipo_imposto": "icms",
      "percentual_reducao": 50.0,
      "data_inicio": "2023-01-01T00:00:00",
      "data_fim": null,
      "codigos_ncm": ["1006", "1101", "1902"]
    }
  ],
  "ativo": true
}
```

### Grupos Fiscais

Os grupos fiscais são armazenados em arquivos JSON no diretório `config/groups/`. Cada arquivo representa um grupo fiscal para um tipo de produto ou serviço.

Exemplo de grupo fiscal para alimentos:

```json
{
  "id": "alimentos",
  "descricao": "Alimentos em Geral",
  "codigo_ncm": null,
  "codigo_cest": null,
  "tipo_item": "produto",
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
  "ativo": true
}
```

## Integração com Outros Módulos

### Integração com Produtos

O módulo fiscal depende de informações fiscais dos produtos para realizar o cálculo correto dos impostos. Cada produto deve ter:

- Grupo fiscal associado
- Código NCM (opcional)
- Código CEST (opcional)
- Origem (nacional, importado, etc.)

### Integração com Pedidos

O cálculo fiscal é realizado durante o processamento de pedidos. O módulo fiscal recebe os dados do pedido e calcula os impostos para cada item, retornando o resultado completo.

### Integração com SAT

O módulo fiscal fornece todas as informações necessárias para a emissão de documentos fiscais pelo SAT, incluindo:

- Valores de impostos por item
- CSTs aplicáveis
- Bases de cálculo
- Alíquotas

### Integração com Impressoras

O módulo fiscal inclui um serviço de impressão de notas fiscais que se integra com o módulo de periféricos para imprimir documentos em impressoras térmicas.

## API REST

### Endpoints Principais

#### Configurações Regionais

- `GET /fiscal/regions`: Lista todas as configurações regionais
- `GET /fiscal/regions/{region_id}`: Obtém uma configuração regional específica
- `GET /fiscal/regions/by-location?uf=XX&municipio=YY`: Obtém configuração por UF e município
- `POST /fiscal/regions`: Cria uma nova configuração regional
- `PUT /fiscal/regions/{region_id}`: Atualiza uma configuração regional
- `DELETE /fiscal/regions/{region_id}`: Remove uma configuração regional

#### Grupos Fiscais

- `GET /fiscal/groups`: Lista todos os grupos fiscais
- `GET /fiscal/groups/{group_id}`: Obtém um grupo fiscal específico
- `POST /fiscal/groups`: Cria um novo grupo fiscal
- `PUT /fiscal/groups/{group_id}`: Atualiza um grupo fiscal
- `DELETE /fiscal/groups/{group_id}`: Remove um grupo fiscal

#### Cálculo Fiscal

- `POST /fiscal/calculate`: Calcula impostos para um pedido

## Fluxo de Trabalho

### Cálculo de Impostos

1. O módulo de pedidos solicita o cálculo fiscal para um pedido
2. O módulo fiscal identifica a configuração regional aplicável
3. Para cada item do pedido:
   - Obtém informações fiscais do produto
   - Identifica o grupo fiscal e regras NCM aplicáveis
   - Calcula os impostos (ICMS, PIS, COFINS, ISS, IPI)
   - Aplica benefícios fiscais se disponíveis
4. Retorna o resultado completo do cálculo fiscal

### Emissão de Nota Fiscal

1. Após a finalização do pedido, o módulo de pedidos solicita a emissão da nota fiscal
2. O módulo fiscal calcula os impostos para o pedido
3. Os dados fiscais são enviados para o módulo SAT para emissão do documento fiscal
4. Após a emissão bem-sucedida, o módulo fiscal gera o documento auxiliar (DANFE)
5. O documento é enviado para impressão na impressora térmica configurada

## Exemplos de Uso

### Cálculo de Impostos para um Pedido

```python
from fiscal.services.fiscal_service import fiscal_service
from product.services.product_service import product_service

async def calculate_taxes_for_order(order_id, uf, municipio=None):
    # Obtém o pedido
    order = await order_service.get_order(order_id)
    
    # Obtém a configuração regional
    regional_config = fiscal_service.get_regional_config(uf, municipio)
    if not regional_config:
        raise Exception(f"Configuração regional não encontrada para UF={uf}, Município={municipio}")
    
    # Calcula os impostos
    result = await fiscal_service.calculate_order_taxes(
        order=order.dict(),
        regional_config=regional_config,
        product_service=product_service
    )
    
    return result
```

### Impressão de Nota Fiscal

```python
from fiscal.services.invoice_print_service import invoice_print_service
from sat.services.sat_service import sat_service

async def print_invoice(order_id, printer_id=None):
    # Obtém o pedido
    order = await order_service.get_order(order_id)
    
    # Obtém dados do SAT
    sat_data = await sat_service.get_sat_data(order_id)
    
    # Obtém resultado fiscal
    fiscal_result = await fiscal_service.calculate_order_taxes(
        order=order.dict(),
        regional_config=fiscal_service.get_regional_config(order.uf, order.municipio),
        product_service=product_service
    )
    
    # Imprime a nota fiscal
    success = await invoice_print_service.print_invoice(
        fiscal_result=fiscal_result,
        order_data=order.dict(),
        sat_data=sat_data,
        printer_id=printer_id
    )
    
    return success
```

## Testes

O módulo fiscal inclui testes automatizados para validar o funcionamento correto em diferentes cenários:

- Testes de cálculo de impostos para diferentes regiões
- Testes de aplicação de benefícios fiscais
- Testes de integração com SAT
- Testes de impressão de notas fiscais

Para executar os testes:

```bash
cd /home/ubuntu/pos-modern
python -m unittest src/fiscal/tests/test_fiscal_module.py
```

## Solução de Problemas

### Problemas Comuns

#### Impostos Incorretos

- Verifique se a configuração regional está correta para a UF/município
- Verifique se o produto está associado ao grupo fiscal correto
- Verifique se o código NCM está correto e se existem regras específicas para ele

#### Falha na Emissão de Nota Fiscal

- Verifique se o SAT está configurado e funcionando corretamente
- Verifique se todos os campos obrigatórios estão preenchidos no pedido
- Verifique os logs do SAT para identificar erros específicos

#### Falha na Impressão

- Verifique se a impressora está configurada e conectada
- Verifique se o template de impressão está correto
- Verifique os logs do módulo de periféricos para identificar erros específicos

## Considerações de Segurança

- As configurações fiscais são críticas para a operação do sistema e devem ser protegidas
- Alterações nas configurações fiscais devem ser auditadas
- O acesso à API fiscal deve ser restrito a usuários autorizados

## Limitações Conhecidas

- O módulo atual suporta apenas o regime tributário do Simples Nacional, Lucro Presumido e Lucro Real
- Algumas regras fiscais específicas para setores regulamentados podem não estar implementadas
- A integração com o SAT é limitada aos modelos suportados pelo módulo SAT

## Próximos Passos

- Implementação de suporte a mais regimes tributários
- Melhorias na interface de usuário para configuração fiscal
- Integração com sistemas de contabilidade externos
- Suporte a mais modelos de SAT e impressoras fiscais
