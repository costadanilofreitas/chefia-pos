# Supplier Module PostgreSQL Migration

Este documento descreve a migração do módulo supplier de armazenamento em arquivos JSON para PostgreSQL.

## Estrutura Atualizada

### Novos Arquivos Criados

1. **`models/db_models.py`** - Modelos SQLAlchemy para PostgreSQL
   - `SupplierDB` - Tabela de fornecedores
   - `SupplierProductDB` - Tabela de relacionamento fornecedor-produto
   - `PurchaseOrderDB` - Tabela de ordens de compra

2. **`repositories/supplier_repository.py`** - Camada de acesso a dados
   - Operações CRUD para suppliers
   - Operações CRUD para supplier products
   - Operações CRUD para purchase orders

3. **`services/supplier_db_service.py`** - Serviço com banco de dados
   - Implementação usando PostgreSQL
   - Conversão entre modelos Pydantic e SQLAlchemy
   - Lógica de negócio

4. **`router/supplier_db_router.py`** - Router com banco de dados
   - Endpoints para suppliers
   - Endpoints para supplier products
   - Endpoints para purchase orders

5. **`database/migrations/migrate_suppliers_to_postgres.py`** - Script de migração
   - Converte dados de JSON para PostgreSQL
   - Mantém integridade dos dados existentes

## Tabelas Criadas

### suppliers
```sql
CREATE TABLE suppliers (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    document VARCHAR(20) NOT NULL UNIQUE,
    document_type VARCHAR(10) NOT NULL DEFAULT 'CNPJ',
    address JSON NOT NULL,
    contacts JSON DEFAULT '[]',
    payment_terms JSON DEFAULT '[]',
    website VARCHAR(255),
    category VARCHAR(100),
    rating INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### supplier_products
```sql
CREATE TABLE supplier_products (
    id UUID PRIMARY KEY,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    supplier_code VARCHAR(100),
    unit_price FLOAT NOT NULL,
    min_order_quantity INTEGER NOT NULL DEFAULT 1,
    lead_time_days INTEGER NOT NULL DEFAULT 7,
    is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
    last_purchase_date TIMESTAMP WITH TIME ZONE,
    last_purchase_price FLOAT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### purchase_orders
```sql
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    supplier_name VARCHAR(255) NOT NULL,
    order_number VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    items JSON NOT NULL DEFAULT '[]',
    total_amount FLOAT NOT NULL,
    expected_delivery_date TIMESTAMP WITH TIME ZONE,
    payment_term_days INTEGER NOT NULL DEFAULT 30,
    notes TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);
```

## Como Executar a Migração

1. **Certifique-se de que o PostgreSQL está rodando:**
   ```bash
   docker-compose up -d postgres
   ```

2. **Configure a variável de ambiente DATABASE_URL (opcional):**
   ```bash
   export DATABASE_URL="postgresql://postgres:password@localhost:5432/chefia_pos"
   ```

3. **Execute o script de migração:**
   ```bash
   cd database/migrations
   python migrate_suppliers_to_postgres.py
   ```

## Uso dos Novos Endpoints

### Exemplos de API com PostgreSQL

#### Criar Fornecedor
```bash
POST /api/v1/suppliers/
Content-Type: application/json

{
    "name": "Fornecedor Teste",
    "document": "12345678000190",
    "document_type": "CNPJ",
    "address": {
        "street": "Rua Teste",
        "number": "123",
        "neighborhood": "Centro",
        "city": "São Paulo",
        "state": "SP",
        "zip_code": "01000-000"
    },
    "category": "Alimentos",
    "is_active": true
}
```

#### Listar Fornecedores com Filtros
```bash
GET /api/v1/suppliers/?name=Teste&category=Alimentos&is_active=true&limit=50
```

#### Criar Ordem de Compra
```bash
POST /api/v1/suppliers/purchase-orders?created_by=user123
Content-Type: application/json

{
    "supplier_id": "supplier-uuid",
    "items": [
        {
            "product_id": "product-uuid",
            "product_name": "Produto Teste",
            "quantity": 10,
            "unit_price": 25.50,
            "total_price": 255.00
        }
    ],
    "expected_delivery_date": "2025-01-20T10:00:00",
    "payment_term_days": 30,
    "notes": "Entregar pela manhã"
}
```

## Benefícios da Migração

1. **Performance**: Consultas muito mais rápidas com índices de banco de dados
2. **Consistência**: Integridade referencial e transações ACID
3. **Escalabilidade**: Suporte para grandes volumes de dados
4. **Funcionalidades Avançadas**: 
   - Filtros complexos com JSON queries
   - Busca por texto com ILIKE
   - Relacionamentos com foreign keys
   - Geração automática de timestamps

## Compatibilidade

- Os modelos Pydantic permanecem os mesmos
- A API REST mantém a mesma interface
- Os dados existentes são preservados na migração
- O serviço antigo (arquivo JSON) continua disponível para compatibilidade

## Próximos Passos

1. Testar todos os endpoints com dados migrados
2. Atualizar a aplicação para usar o novo router
3. Configurar backup e restore do PostgreSQL
4. Remover arquivos JSON após confirmação de funcionamento
5. Atualizar documentação da API