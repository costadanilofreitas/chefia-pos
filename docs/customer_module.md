# Documentação do Módulo de Clientes

## Visão Geral

O Módulo de Clientes gerencia todas as informações relacionadas aos clientes do estabelecimento, incluindo dados cadastrais, endereços, programa de fidelidade e histórico de compras. O objetivo é fornecer uma visão 360º do cliente para melhorar o atendimento e possibilitar ações de marketing direcionadas.

Este módulo permite:
- Cadastrar e atualizar informações de clientes (nome, telefone, email).
- Gerenciar múltiplos endereços por cliente, útil para serviços de delivery.
- Manter um programa de fidelidade simples baseado em pontos.
- Registrar e consultar o histórico de compras de cada cliente.

**Importante:** Conforme definido, este é um módulo básico e não utiliza o sistema de licenciamento por instância (arquivos `config/customer/ID.json`). Ele está disponível por padrão quando o backend é executado e é acessível a partir dos módulos PDV, Garçom e Delivery.

## Arquitetura

O módulo segue a arquitetura padrão do sistema:

- **Models (`src/customer/models/customer_models.py`)**: Define as estruturas de dados usando Pydantic (Customer, Address, Loyalty, PurchaseHistoryEntry).
- **Services (`src/customer/services/customer_service.py`)**: Contém a lógica de negócio para manipulação dos dados de clientes. Atualmente utiliza um armazenamento em memória para fins de demonstração (deve ser substituído por interação com banco de dados).
- **Router (`src/customer/router/customer_router.py`)**: Expõe a funcionalidade através de uma API RESTful usando FastAPI.
- **UI (`src/customer/ui/`)**: Componentes React (`CustomerManagementPage.jsx`, `CustomerManagementPage.css`) para a interface de gerenciamento no frontend, priorizando o acesso via POS.

## Modelos de Dados Principais

- **`Address`**: Representa um endereço associado a um cliente.
  - `id`: UUID único.
  - `street`, `number`, `complement`, `neighborhood`, `city`, `state`, `zip_code`: Campos do endereço.
  - `is_primary`: Indica se é o endereço principal.
- **`Loyalty`**: Armazena informações de fidelidade.
  - `points`: Pontos acumulados.
  - `level`: Nível de fidelidade (opcional, ex: Bronze, Prata, Ouro).
  - `last_updated`: Data/hora da última atualização.
- **`PurchaseHistoryEntry`**: Representa uma compra no histórico do cliente.
  - `order_id`: UUID do pedido original.
  - `purchase_date`: Data da compra.
  - `total_amount`: Valor total da compra.
  - `items_summary`: Resumo dos itens (opcional).
- **`Customer`**: Modelo principal do cliente.
  - `id`: UUID único.
  - `name`, `phone`, `email`: Dados básicos.
  - `addresses`: Lista de `Address`.
  - `loyalty`: Objeto `Loyalty`.
  - `purchase_history`: Lista de `PurchaseHistoryEntry`.
  - `created_at`, `last_updated`: Timestamps.

## Endpoints da API

Prefixo: `/api/v1/customers`

**Clientes (`/`)**

- `POST /`: Cria um novo cliente.
  - **Request Body**: `CustomerCreate`
  - **Response**: `Customer`
- `GET /`: Lista clientes (permite busca por nome, telefone ou email).
  - **Query Param**: `search: Optional[str]`
  - **Response**: `List[Customer]`
- `GET /{customer_id}`: Obtém detalhes de um cliente específico.
  - **Response**: `Customer`
- `PUT /{customer_id}`: Atualiza dados básicos de um cliente.
  - **Request Body**: `CustomerUpdate`
  - **Response**: `Customer`
- `DELETE /{customer_id}`: Exclui um cliente.
  - **Response**: `204 No Content`

**Endereços (`/{customer_id}/addresses`)**

- `POST /{customer_id}/addresses/`: Adiciona um novo endereço ao cliente.
  - **Request Body**: `Address`
  - **Response**: `Customer` (com a lista de endereços atualizada)
- `PUT /{customer_id}/addresses/{address_id}`: Atualiza um endereço existente.
  - **Request Body**: `Address` (completo)
  - **Response**: `Customer`
- `DELETE /{customer_id}/addresses/{address_id}`: Exclui um endereço.
  - **Response**: `Customer`

**Fidelidade (`/{customer_id}/loyalty`)**

- `PATCH /{customer_id}/loyalty/`: Atualiza os pontos de fidelidade (adiciona ou subtrai).
  - **Request Body**: `{ "points_change": int }`
  - **Response**: `Loyalty` (com os pontos atualizados)

**Histórico de Compras (`/{customer_id}/purchases`)**

- `POST /{customer_id}/purchases/`: Adiciona uma entrada ao histórico de compras (normalmente chamado internamente após uma venda).
  - **Request Body**: `PurchaseHistoryEntry`
  - **Response**: `Customer` (com o histórico atualizado)

## Integração

- **Módulos de Frontend (PDV, Garçom, Delivery)**: Devem usar `GET /` para buscar clientes e `GET /{customer_id}` para obter detalhes ao selecionar um cliente para um pedido ou consulta.
- **Módulo de Pedidos**: Ao finalizar um pedido associado a um cliente, este módulo deve:
    1. Chamar `POST /{customer_id}/purchases/` para registrar a compra no histórico.
    2. Calcular pontos de fidelidade (se aplicável) e chamar `PATCH /{customer_id}/loyalty/` para atualizar os pontos.
- **Frontend**: A interface (`CustomerManagementPage.jsx`) consome os endpoints da API para exibir e gerenciar os clientes.

## Considerações Futuras

- Implementar persistência em banco de dados (PostgreSQL).
- Desenvolver funcionalidades de resgate de pontos/benefícios no módulo de fidelidade.
- Adicionar paginação e filtros mais avançados na listagem de clientes.
- Criar interfaces de usuário para gerenciamento de endereços, ajuste de pontos e visualização completa do histórico.
- Implementar lógica para definir níveis de fidelidade automaticamente.
- Adicionar testes automatizados.

