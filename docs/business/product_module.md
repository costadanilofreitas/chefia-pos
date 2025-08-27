# Módulo de Produtos e Cardápio - Documentação

## Visão Geral

O Módulo de Produtos e Cardápio é responsável pelo gerenciamento completo de produtos, categorias, combos, cardápios e imagens no sistema POS. Este módulo fornece todas as funcionalidades necessárias para criar e manter o catálogo de produtos do restaurante, incluindo suporte para personalização de combos e cardápios dinâmicos.

## Componentes Principais

### 1. Produtos

Os produtos são os itens individuais que podem ser vendidos no restaurante. Cada produto possui atributos como nome, descrição, preço, categorias, status e tipo. Os produtos podem ser de diferentes tipos:

- **Produtos Simples (Single)**: Itens individuais como hambúrgueres, bebidas, sobremesas, etc.
- **Combos**: Conjuntos de produtos simples vendidos como uma unidade, com possibilidade de personalização.

### 2. Categorias

As categorias permitem organizar os produtos em grupos lógicos, facilitando a navegação e busca. As categorias podem ser hierárquicas, com categorias pai e filhas, e possuem atributos como nome, descrição, tipo e ordem de exibição.

### 3. Combos e Personalização

Os combos são conjuntos de produtos vendidos como uma unidade, geralmente com um preço promocional. O sistema suporta personalização de combos, permitindo que itens sejam substituídos por outros dentro de grupos de troca definidos.

### 4. Cardápios

Os cardápios são coleções de produtos e categorias que podem ser ativados em horários específicos ou dias da semana. Isso permite que o restaurante tenha cardápios diferentes para café da manhã, almoço, jantar, ou dias específicos.

### 5. Imagens

O módulo suporta o gerenciamento de imagens para produtos, permitindo upload, definição de imagem principal e exclusão.

## Modelos de Dados

### Product

```python
class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    price: float
    cost: Optional[float] = None
    type: ProductType
    status: ProductStatus = ProductStatus.ACTIVE
    categories: List[str] = []
    tags: List[str] = []
    attributes: Optional[Dict[str, Any]] = None
    barcode: Optional[str] = None
    sku: Optional[str] = None
    display_order: int = 0
    is_featured: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
```

### ProductCategory

```python
class ProductCategory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    type: CategoryType = CategoryType.MAIN
    parent_id: Optional[str] = None
    display_order: int = 0
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
```

### ComboItem

```python
class ComboItem(BaseModel):
    combo_id: str
    product_id: str
    quantity: int = 1
    is_exchangeable: bool = False
    exchange_group_id: Optional[str] = None
    notes: Optional[str] = None
```

### Menu

```python
class Menu(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    is_active: bool = True
    days_of_week: Optional[List[int]] = None  # 0=Segunda, 1=Terça, ..., 6=Domingo
    start_time: Optional[str] = None  # Formato HH:MM
    end_time: Optional[str] = None  # Formato HH:MM
    categories: List[str] = []
    products: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
```

## Endpoints da API

### Produtos

#### Criar Produto

```
POST /api/v1/products
```

**Permissão**: `PRODUCT_CREATE`

**Corpo da Requisição**:
```json
{
  "name": "Hambúrguer Clássico",
  "description": "Hambúrguer com queijo, alface e tomate",
  "price": 15.90,
  "cost": 5.50,
  "type": "single",
  "status": "active",
  "categories": ["categoria-id-1"],
  "tags": ["hamburguer", "carne"],
  "attributes": {
    "nutritional_info": {
      "calories": 450,
      "protein": 25,
      "carbs": 30,
      "fat": 20,
      "sodium": 800
    }
  },
  "display_order": 1,
  "is_featured": true
}
```

**Resposta**:
```json
{
  "id": "produto-id-1",
  "name": "Hambúrguer Clássico",
  "description": "Hambúrguer com queijo, alface e tomate",
  "price": 15.90,
  "cost": 5.50,
  "type": "single",
  "status": "active",
  "categories": ["categoria-id-1"],
  "tags": ["hamburguer", "carne"],
  "attributes": {
    "nutritional_info": {
      "calories": 450,
      "protein": 25,
      "carbs": 30,
      "fat": 20,
      "sodium": 800
    }
  },
  "display_order": 1,
  "is_featured": true,
  "created_at": "2025-05-23T02:00:00.000Z",
  "updated_at": "2025-05-23T02:00:00.000Z"
}
```

#### Listar Produtos

```
GET /api/v1/products
```

**Permissão**: `PRODUCT_READ`

**Parâmetros de Consulta**:
- `category_id` (opcional): Filtrar por categoria
- `status` (opcional): Filtrar por status (`active`, `inactive`, `out_of_stock`)
- `type` (opcional): Filtrar por tipo (`single`, `combo`)
- `is_featured` (opcional): Filtrar por destaque
- `search` (opcional): Buscar por nome, descrição, SKU ou código de barras
- `limit` (opcional): Limite de resultados (padrão: 50)
- `offset` (opcional): Deslocamento para paginação (padrão: 0)

**Resposta**:
```json
[
  {
    "id": "produto-id-1",
    "name": "Hambúrguer Clássico",
    "price": 15.90,
    "type": "single",
    "status": "active",
    "main_image": "/data/images/imagem-1.jpg",
    "categories": ["categoria-id-1"],
    "is_featured": true
  },
  {
    "id": "produto-id-2",
    "name": "Refrigerante Cola",
    "price": 5.90,
    "type": "single",
    "status": "active",
    "main_image": "/data/images/imagem-2.jpg",
    "categories": ["categoria-id-2"],
    "is_featured": false
  }
]
```

#### Obter Produto por ID

```
GET /api/v1/products/{product_id}
```

**Permissão**: `PRODUCT_READ`

**Resposta**:
```json
{
  "id": "produto-id-1",
  "name": "Hambúrguer Clássico",
  "description": "Hambúrguer com queijo, alface e tomate",
  "price": 15.90,
  "cost": 5.50,
  "type": "single",
  "status": "active",
  "categories": ["categoria-id-1"],
  "tags": ["hamburguer", "carne"],
  "attributes": {
    "nutritional_info": {
      "calories": 450,
      "protein": 25,
      "carbs": 30,
      "fat": 20,
      "sodium": 800
    }
  },
  "display_order": 1,
  "is_featured": true,
  "created_at": "2025-05-23T02:00:00.000Z",
  "updated_at": "2025-05-23T02:00:00.000Z"
}
```

#### Atualizar Produto

```
PUT /api/v1/products/{product_id}
```

**Permissão**: `PRODUCT_UPDATE`

**Corpo da Requisição**:
```json
{
  "name": "Hambúrguer Clássico Especial",
  "price": 17.90,
  "is_featured": true
}
```

**Resposta**:
```json
{
  "id": "produto-id-1",
  "name": "Hambúrguer Clássico Especial",
  "description": "Hambúrguer com queijo, alface e tomate",
  "price": 17.90,
  "cost": 5.50,
  "type": "single",
  "status": "active",
  "categories": ["categoria-id-1"],
  "tags": ["hamburguer", "carne"],
  "attributes": {
    "nutritional_info": {
      "calories": 450,
      "protein": 25,
      "carbs": 30,
      "fat": 20,
      "sodium": 800
    }
  },
  "display_order": 1,
  "is_featured": true,
  "created_at": "2025-05-23T02:00:00.000Z",
  "updated_at": "2025-05-23T02:10:00.000Z"
}
```

#### Excluir Produto

```
DELETE /api/v1/products/{product_id}
```

**Permissão**: `PRODUCT_DELETE`

**Resposta**: 204 No Content

### Categorias

#### Criar Categoria

```
POST /api/v1/products/categories
```

**Permissão**: `CATEGORY_CREATE`

**Corpo da Requisição**:
```json
{
  "name": "Lanches",
  "description": "Hambúrgueres e sanduíches",
  "type": "main",
  "display_order": 1,
  "is_active": true
}
```

**Resposta**:
```json
{
  "id": "categoria-id-1",
  "name": "Lanches",
  "description": "Hambúrgueres e sanduíches",
  "type": "main",
  "parent_id": null,
  "display_order": 1,
  "is_active": true,
  "created_at": "2025-05-23T02:00:00.000Z",
  "updated_at": "2025-05-23T02:00:00.000Z"
}
```

#### Listar Categorias

```
GET /api/v1/products/categories
```

**Permissão**: `CATEGORY_READ`

**Parâmetros de Consulta**:
- `parent_id` (opcional): Filtrar por categoria pai
- `is_active` (opcional): Filtrar por status de ativação
- `limit` (opcional): Limite de resultados (padrão: 100)
- `offset` (opcional): Deslocamento para paginação (padrão: 0)

**Resposta**:
```json
[
  {
    "id": "categoria-id-1",
    "name": "Lanches",
    "description": "Hambúrgueres e sanduíches",
    "type": "main",
    "parent_id": null,
    "display_order": 1,
    "is_active": true,
    "created_at": "2025-05-23T02:00:00.000Z",
    "updated_at": "2025-05-23T02:00:00.000Z"
  },
  {
    "id": "categoria-id-2",
    "name": "Bebidas",
    "description": "Refrigerantes, sucos e água",
    "type": "main",
    "parent_id": null,
    "display_order": 2,
    "is_active": true,
    "created_at": "2025-05-23T02:00:00.000Z",
    "updated_at": "2025-05-23T02:00:00.000Z"
  }
]
```

### Combos

#### Criar Combo

```
POST /api/v1/products/combos
```

**Permissão**: `PRODUCT_CREATE`

**Corpo da Requisição**:
```json
{
  "product": {
    "name": "Combo Hambúrguer",
    "description": "Hambúrguer + Bebida + Sobremesa",
    "price": 25.90,
    "cost": 9.50,
    "type": "combo",
    "status": "active",
    "categories": ["categoria-id-1"],
    "tags": ["combo", "promocao"],
    "display_order": 1,
    "is_featured": true
  },
  "items": [
    {
      "product_id": "produto-id-1",
      "quantity": 1,
      "is_exchangeable": false
    },
    {
      "product_id": "produto-id-2",
      "quantity": 1,
      "is_exchangeable": true,
      "exchange_group_id": "grupo-troca-id-1"
    },
    {
      "product_id": "produto-id-3",
      "quantity": 1,
      "is_exchangeable": false
    }
  ]
}
```

**Resposta**:
```json
{
  "id": "combo-id-1",
  "name": "Combo Hambúrguer",
  "description": "Hambúrguer + Bebida + Sobremesa",
  "price": 25.90,
  "cost": 9.50,
  "type": "combo",
  "status": "active",
  "categories": ["categoria-id-1"],
  "tags": ["combo", "promocao"],
  "display_order": 1,
  "is_featured": true,
  "created_at": "2025-05-23T02:00:00.000Z",
  "updated_at": "2025-05-23T02:00:00.000Z"
}
```

#### Obter Itens do Combo

```
GET /api/v1/products/combos/{combo_id}/items
```

**Permissão**: `PRODUCT_READ`

**Resposta**:
```json
[
  {
    "combo_id": "combo-id-1",
    "product_id": "produto-id-1",
    "quantity": 1,
    "is_exchangeable": false
  },
  {
    "combo_id": "combo-id-1",
    "product_id": "produto-id-2",
    "quantity": 1,
    "is_exchangeable": true,
    "exchange_group_id": "grupo-troca-id-1"
  },
  {
    "combo_id": "combo-id-1",
    "product_id": "produto-id-3",
    "quantity": 1,
    "is_exchangeable": false
  }
]
```

### Imagens

#### Upload de Imagem

```
POST /api/v1/products/{product_id}/images
```

**Permissão**: `PRODUCT_UPDATE`

**Corpo da Requisição**: Formulário multipart com:
- `file`: Arquivo de imagem
- `is_main`: Booleano indicando se é a imagem principal

**Resposta**:
```json
{
  "id": "imagem-id-1",
  "product_id": "produto-id-1",
  "file_path": "/data/images/imagem-1.jpg",
  "file_name": "imagem-1.jpg",
  "is_main": true,
  "url": "/api/v1/products/images/imagem-id-1"
}
```

#### Listar Imagens do Produto

```
GET /api/v1/products/{product_id}/images
```

**Permissão**: `PRODUCT_READ`

**Resposta**:
```json
[
  {
    "id": "imagem-id-1",
    "product_id": "produto-id-1",
    "file_path": "/data/images/imagem-1.jpg",
    "file_name": "imagem-1.jpg",
    "is_main": true,
    "url": "/api/v1/products/images/imagem-id-1"
  },
  {
    "id": "imagem-id-2",
    "product_id": "produto-id-1",
    "file_path": "/data/images/imagem-2.jpg",
    "file_name": "imagem-2.jpg",
    "is_main": false,
    "url": "/api/v1/products/images/imagem-id-2"
  }
]
```

### Cardápios

#### Criar Cardápio

```
POST /api/v1/products/menus
```

**Permissão**: `MENU_CREATE`

**Corpo da Requisição**:
```json
{
  "name": "Cardápio Principal",
  "description": "Cardápio padrão do restaurante",
  "is_active": true,
  "days_of_week": [0, 1, 2, 3, 4, 5, 6],
  "start_time": "10:00",
  "end_time": "22:00",
  "categories": ["categoria-id-1", "categoria-id-2", "categoria-id-3"],
  "products": ["produto-id-1", "produto-id-2", "produto-id-3"]
}
```

**Resposta**:
```json
{
  "id": "cardapio-id-1",
  "name": "Cardápio Principal",
  "description": "Cardápio padrão do restaurante",
  "is_active": true,
  "days_of_week": [0, 1, 2, 3, 4, 5, 6],
  "start_time": "10:00",
  "end_time": "22:00",
  "categories": ["categoria-id-1", "categoria-id-2", "categoria-id-3"],
  "products": ["produto-id-1", "produto-id-2", "produto-id-3"],
  "created_at": "2025-05-23T02:00:00.000Z",
  "updated_at": "2025-05-23T02:00:00.000Z"
}
```

#### Obter Cardápio Atual

```
GET /api/v1/products/menus/current
```

**Permissão**: `MENU_READ`

**Parâmetros de Consulta**:
- `day_of_week` (opcional): Dia da semana (0=Segunda, 1=Terça, ..., 6=Domingo)
- `time` (opcional): Hora no formato HH:MM

**Resposta**:
```json
{
  "id": "cardapio-id-1",
  "name": "Cardápio Principal",
  "description": "Cardápio padrão do restaurante",
  "is_active": true,
  "days_of_week": [0, 1, 2, 3, 4, 5, 6],
  "start_time": "10:00",
  "end_time": "22:00",
  "categories": ["categoria-id-1", "categoria-id-2", "categoria-id-3"],
  "products": ["produto-id-1", "produto-id-2", "produto-id-3"],
  "created_at": "2025-05-23T02:00:00.000Z",
  "updated_at": "2025-05-23T02:00:00.000Z"
}
```

## Regras de Negócio

### Produtos

1. Um produto pode pertencer a múltiplas categorias.
2. Um produto pode estar em um dos seguintes estados: ativo, inativo ou fora de estoque.
3. Produtos podem ser simples (single) ou combos.
4. Produtos podem ter múltiplas imagens, mas apenas uma pode ser definida como principal.

### Categorias

1. As categorias podem ser hierárquicas, com categorias pai e filhas.
2. Uma categoria só pode ser excluída se não tiver produtos associados ou subcategorias.
3. Categorias inativas não aparecem no cardápio, mas seus produtos ainda podem ser acessados diretamente.

### Combos

1. Um combo é composto por múltiplos produtos simples.
2. Cada item em um combo pode ser marcado como trocável ou não.
3. Itens trocáveis devem estar associados a um grupo de troca.
4. Um grupo de troca define quais produtos podem ser usados como substituição.
5. A personalização de um combo pode afetar seu preço final.

### Cardápios

1. Múltiplos cardápios podem existir simultaneamente.
2. Cardápios podem ser configurados para dias e horários específicos.
3. O sistema determina automaticamente qual cardápio está ativo com base no dia e hora atual.
4. Um cardápio pode conter categorias e produtos específicos.

## Integração com Event Bus

O módulo de produtos e cardápio integra-se com o Event Bus do sistema para publicar e consumir eventos relevantes:

### Eventos Publicados

1. `PRODUCT_CREATED`: Quando um novo produto é criado.
2. `PRODUCT_UPDATED`: Quando um produto é atualizado.
3. `PRODUCT_STATUS_CHANGED`: Quando o status de um produto muda.
4. `CATEGORY_CREATED`: Quando uma nova categoria é criada.
5. `CATEGORY_UPDATED`: Quando uma categoria é atualizada.
6. `MENU_UPDATED`: Quando um cardápio é criado ou atualizado.

### Eventos Consumidos

1. `BUSINESS_DAY_OPENED`: Para atualizar produtos sazonais quando um novo dia é aberto.
2. `BUSINESS_DAY_CLOSED`: Para atualizar estatísticas de produtos vendidos no dia.
3. `ORDER_CREATED`: Para atualizar contadores de popularidade de produtos.
4. `INVENTORY_UPDATED`: Para atualizar o status de produtos com base na disponibilidade em estoque.

## Exemplos de Uso

### Criação de um Produto Simples

```python
# Criar uma categoria
category = await product_service.create_category(
    ProductCategory(
        name="Lanches",
        description="Hambúrgueres e sanduíches",
        type=CategoryType.MAIN,
        display_order=1
    )
)

# Criar um produto
product = await product_service.create_product(
    Product(
        name="Hambúrguer Clássico",
        description="Hambúrguer com queijo, alface e tomate",
        price=15.90,
        cost=5.50,
        type=ProductType.SINGLE,
        status=ProductStatus.ACTIVE,
        categories=[category.id],
        tags=["hamburguer", "carne"],
        display_order=1,
        is_featured=True
    )
)
```

### Criação de um Combo

```python
# Criar um grupo de troca
exchange_group = await product_service.create_exchange_group(
    name="Bebidas do Combo",
    description="Opções de bebidas para o combo",
    products=["produto-refrigerante-id", "produto-suco-id"]
)

# Criar um combo
combo = await product_service.create_combo(
    Product(
        name="Combo Hambúrguer",
        description="Hambúrguer + Bebida + Sobremesa",
        price=25.90,
        cost=9.50,
        type=ProductType.COMBO,
        status=ProductStatus.ACTIVE,
        categories=["categoria-lanches-id"],
        tags=["combo", "promocao"],
        display_order=1,
        is_featured=True
    ),
    [
        ComboItem(
            combo_id="",  # Será preenchido pelo serviço
            product_id="produto-hamburguer-id",
            quantity=1,
            is_exchangeable=False
        ),
        ComboItem(
            combo_id="",  # Será preenchido pelo serviço
            product_id="produto-refrigerante-id",
            quantity=1,
            is_exchangeable=True,
            exchange_group_id=exchange_group.id
        ),
        ComboItem(
            combo_id="",  # Será preenchido pelo serviço
            product_id="produto-sobremesa-id",
            quantity=1,
            is_exchangeable=False
        )
    ]
)
```

### Personalização de um Combo

```python
# Processar personalização de um combo
customization_result = await combo_rules_service.process_combo_customization(
    combo_id="combo-id",
    customizations=[
        {
            "original_item_id": "produto-refrigerante-id",
            "replacement_product_id": "produto-suco-id",
            "quantity": 1
        }
    ]
)

# Resultado da personalização
print(f"Preço base: {customization_result['base_price']}")
print(f"Preço ajustado: {customization_result['adjusted_price']}")
for customization in customization_result['customizations']:
    print(f"Substituição: {customization['original_item']['name']} -> {customization['replacement']['name']}")
    print(f"Diferença de preço: {customization['price_difference']}")
```

### Criação de um Cardápio

```python
# Criar um cardápio
menu = await product_service.create_menu(
    Menu(
        name="Cardápio Principal",
        description="Cardápio padrão do restaurante",
        is_active=True,
        days_of_week=[0, 1, 2, 3, 4, 5, 6],  # Todos os dias da semana
        start_time="10:00",
        end_time="22:00",
        categories=["categoria-lanches-id", "categoria-bebidas-id", "categoria-sobremesas-id"],
        products=["produto-hamburguer-id", "produto-refrigerante-id", "produto-sobremesa-id"]
    )
)

# Obter o cardápio atual
current_menu = await product_service.get_current_menu()
```

## Considerações de Desempenho

1. **Armazenamento de Imagens**: As imagens são armazenadas no sistema de arquivos local, com referências no banco de dados. Para ambientes de produção com alta carga, considere usar um serviço de armazenamento de objetos.

2. **Cardápios em Cache**: Para melhorar o desempenho, o cardápio atual pode ser armazenado em cache e invalidado apenas quando houver atualizações.

3. **Paginação**: Todas as operações de listagem suportam paginação para evitar sobrecarga com grandes conjuntos de dados.

## Segurança

1. **Controle de Acesso**: Todas as operações requerem permissões específicas:
   - `PRODUCT_CREATE`, `PRODUCT_READ`, `PRODUCT_UPDATE`, `PRODUCT_DELETE`
   - `CATEGORY_CREATE`, `CATEGORY_READ`, `CATEGORY_UPDATE`, `CATEGORY_DELETE`
   - `MENU_CREATE`, `MENU_READ`, `MENU_UPDATE`, `MENU_DELETE`

2. **Validação de Dados**: Todos os dados de entrada são validados usando o sistema de validação do Pydantic.

3. **Sanitização de Arquivos**: Os uploads de imagens são validados quanto ao tipo e tamanho antes do armazenamento.

## Conclusão

O Módulo de Produtos e Cardápio fornece uma base robusta para o gerenciamento de produtos em um sistema POS para restaurantes. Com suporte para produtos simples, combos personalizáveis, categorias hierárquicas e cardápios dinâmicos, o módulo atende a todas as necessidades de um restaurante moderno.

A integração com o Event Bus permite que o módulo se comunique eficientemente com outros componentes do sistema, como estoque, pedidos e dia de operação, garantindo uma experiência coesa e consistente.
