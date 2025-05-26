# Documentação do Módulo de Estoque

## Visão Geral

O Módulo de Estoque é um componente essencial do sistema POS Moderno, responsável pelo gerenciamento centralizado de itens de estoque, sejam eles produtos finais ou ingredientes utilizados na preparação.

Este módulo permite rastrear as quantidades de itens, registrar movimentações (entradas, saídas, vendas, ajustes), definir alertas de estoque baixo e gerar relatórios básicos.

**Importante:** Conforme definido, este é um módulo básico e não utiliza o sistema de licenciamento por instância (arquivos `config/stock/ID.json`). Ele está disponível por padrão quando o backend é executado.

## Arquitetura

O módulo segue a arquitetura padrão do sistema:

- **Models (`src/stock/models/stock_models.py`)**: Define as estruturas de dados usando Pydantic (StockItem, StockMovement, StockLevel).
- **Services (`src/stock/services/stock_service.py`)**: Contém a lógica de negócio para manipulação dos dados de estoque. Atualmente utiliza um armazenamento em memória para fins de demonstração (deve ser substituído por interação com banco de dados).
- **Router (`src/stock/router/stock_router.py`)**: Expõe a funcionalidade através de uma API RESTful usando FastAPI.
- **UI (`src/stock/ui/`)**: Componentes React (`StockManagementPage.jsx`, `StockManagementPage.css`) para a interface de gerenciamento no frontend.

## Modelos de Dados Principais

- **`StockItem`**: Representa um item no estoque (produto ou ingrediente).
  - `id`: UUID único.
  - `name`: Nome do item.
  - `unit`: Unidade de medida (ex: "unidade", "kg", "L").
  - `current_quantity`: Quantidade atual em estoque.
  - `low_stock_threshold`: Nível mínimo para alerta (opcional).
  - `product_id` / `ingredient_id`: Links opcionais para outros módulos.
  - `last_updated`: Data/hora da última atualização.
- **`StockMovement`**: Representa uma movimentação de estoque.
  - `id`: UUID único.
  - `stock_item_id`: ID do item movimentado.
  - `quantity`: Quantidade (positiva para entrada, negativa para saída/ajuste).
  - `movement_type`: Tipo (`entry`, `exit`, `adjustment`, `sale`).
  - `reason`: Motivo da movimentação (opcional).
  - `timestamp`: Data/hora da movimentação.
- **`StockLevel`**: Usado para relatórios, mostra o nível atual de um item.

## Endpoints da API

Prefixo: `/api/v1/stock`

**Itens de Estoque (`/items`)**

- `POST /items/`: Cria um novo item de estoque.
  - **Request Body**: `StockItemCreate`
  - **Response**: `StockItem`
- `GET /items/`: Lista todos os itens de estoque.
  - **Response**: `List[StockItem]`
- `GET /items/{item_id}`: Obtém detalhes de um item específico.
  - **Response**: `StockItem`
- `PUT /items/{item_id}`: Atualiza detalhes de um item (exceto quantidade).
  - **Request Body**: `StockItemBase`
  - **Response**: `StockItem`
- `DELETE /items/{item_id}`: Exclui um item de estoque.
  - **Response**: `204 No Content`

**Movimentações de Estoque (`/movements`)**

- `POST /movements/`: Registra uma nova movimentação de estoque (atualiza a quantidade do item).
  - **Request Body**: `StockMovementCreate`
  - **Response**: `StockMovement`
- `GET /movements/`: Obtém o histórico de movimentações (opcionalmente filtrado por `item_id`).
  - **Query Param**: `item_id: Optional[uuid.UUID]`
  - **Response**: `List[StockMovement]`

**Níveis e Relatórios (`/levels`)**

- `GET /levels/`: Obtém os níveis atuais de estoque.
  - **Query Param**: `low_stock_only: bool = False` (Filtra apenas itens com estoque baixo)
  - **Response**: `List[StockLevel]`

## Integração

- **Módulo de Produtos**: O `StockItem` pode ser vinculado a um `product_id`.
- **Módulo de Pedidos/Vendas**: Quando uma venda é finalizada, o sistema deve chamar `POST /movements/` com `movement_type='sale'` para dar baixa automática no estoque dos itens vendidos (ou seus ingredientes, dependendo da configuração).
- **Frontend**: A interface (`StockManagementPage.jsx`) consome os endpoints da API para exibir e gerenciar o estoque.

## Considerações Futuras

- Implementar persistência em banco de dados (PostgreSQL).
- Detalhar a lógica de baixa por ingredientes (requer definição de receitas no Módulo de Produtos).
- Adicionar relatórios mais avançados (custo médio, curva ABC, etc.).
- Implementar suporte a múltiplos depósitos/almoxarifados, se necessário.
- Adicionar testes automatizados.

