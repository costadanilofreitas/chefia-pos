-- Inicialização do banco de dados PostgreSQL para o sistema POS Modern
-- Este script cria os esquemas e tabelas necessários para todos os módulos

-- Criar esquema principal
CREATE SCHEMA IF NOT EXISTS pos_modern;

-- Configurar timezone
SET timezone = 'UTC';

-- Habilitar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "hstore";

-- Tabelas do módulo de Produtos
CREATE TABLE pos_modern.products (
    product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    barcode VARCHAR(50),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2),
    category_id UUID,
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_products_client_store ON pos_modern.products(client_id, store_id);
CREATE INDEX idx_products_category ON pos_modern.products(category_id);
CREATE INDEX idx_products_active ON pos_modern.products(is_active);

CREATE TABLE pos_modern.product_categories (
    category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID,
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_categories_client_store ON pos_modern.product_categories(client_id, store_id);
CREATE INDEX idx_product_categories_parent ON pos_modern.product_categories(parent_id);

-- Tabelas do módulo de Pedidos
CREATE TABLE pos_modern.orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) NOT NULL,
    order_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    customer_id UUID,
    waiter_id UUID,
    table_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(20) NOT NULL,
    payment_method VARCHAR(20),
    notes TEXT,
    metadata JSONB
);

CREATE INDEX idx_orders_client_store ON pos_modern.orders(client_id, store_id);
CREATE INDEX idx_orders_status ON pos_modern.orders(status);
CREATE INDEX idx_orders_created_at ON pos_modern.orders(created_at);
CREATE INDEX idx_orders_customer ON pos_modern.orders(customer_id);
CREATE INDEX idx_orders_table ON pos_modern.orders(table_id);

CREATE TABLE pos_modern.order_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES pos_modern.orders(order_id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    notes TEXT,
    customizations JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON pos_modern.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON pos_modern.order_items(product_id);
CREATE INDEX idx_order_items_status ON pos_modern.order_items(status);

-- Tabelas do módulo de Clientes
CREATE TABLE pos_modern.customers (
    customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    document VARCHAR(20),
    address JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_customers_client_store ON pos_modern.customers(client_id, store_id);
CREATE INDEX idx_customers_email ON pos_modern.customers(email);
CREATE INDEX idx_customers_phone ON pos_modern.customers(phone);
CREATE INDEX idx_customers_document ON pos_modern.customers(document);

-- Tabelas do módulo de Pagamentos
CREATE TABLE pos_modern.payments (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    provider VARCHAR(20) NOT NULL,
    provider_payment_id VARCHAR(100),
    method VARCHAR(20) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    pix_key VARCHAR(100),
    pix_qrcode TEXT,
    pix_qrcode_image TEXT,
    pix_expiration_date TIMESTAMP WITH TIME ZONE,
    payment_url TEXT,
    notification_type VARCHAR(20),
    customer_email VARCHAR(100),
    customer_phone VARCHAR(20),
    customer_name VARCHAR(100),
    customer_document VARCHAR(20),
    description TEXT,
    external_reference VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_payments_order_id ON pos_modern.payments(order_id);
CREATE INDEX idx_payments_provider_payment_id ON pos_modern.payments(provider_payment_id);
CREATE INDEX idx_payments_status ON pos_modern.payments(status);
CREATE INDEX idx_payments_created_at ON pos_modern.payments(created_at);

CREATE TABLE pos_modern.payment_provider_configs (
    config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(20) NOT NULL,
    api_key VARCHAR(100) NOT NULL,
    sandbox BOOLEAN DEFAULT TRUE,
    webhook_url VARCHAR(255),
    default_notification VARCHAR(20) DEFAULT 'email',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_provider_configs_provider ON pos_modern.payment_provider_configs(provider);

-- Tabelas do módulo de Split Payment
CREATE TABLE pos_modern.split_configs (
    config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_split_configs_restaurant_store ON pos_modern.split_configs(restaurant_id, store_id);
CREATE INDEX idx_split_configs_active ON pos_modern.split_configs(is_active);

CREATE TABLE pos_modern.split_recipients (
    recipient_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID NOT NULL REFERENCES pos_modern.split_configs(config_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    wallet_id VARCHAR(100) NOT NULL,
    split_type VARCHAR(20) NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_split_recipients_config_id ON pos_modern.split_recipients(config_id);

CREATE TABLE pos_modern.retention_configs (
    retention_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID NOT NULL REFERENCES pos_modern.split_configs(config_id) ON DELETE CASCADE,
    split_type VARCHAR(20) NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    wallet_id VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_retention_configs_config_id ON pos_modern.retention_configs(config_id);

CREATE TABLE pos_modern.split_payment_records (
    record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL,
    provider_payment_id VARCHAR(100) NOT NULL,
    split_config_id UUID NOT NULL,
    total_value DECIMAL(10, 2) NOT NULL,
    net_value DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_split_payment_records_payment_id ON pos_modern.split_payment_records(payment_id);
CREATE INDEX idx_split_payment_records_config_id ON pos_modern.split_payment_records(split_config_id);

CREATE TABLE pos_modern.split_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL REFERENCES pos_modern.split_payment_records(record_id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL,
    wallet_id VARCHAR(100) NOT NULL,
    split_type VARCHAR(20) NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    calculated_value DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    transfer_id VARCHAR(100),
    transferred_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_split_transactions_record_id ON pos_modern.split_transactions(record_id);
CREATE INDEX idx_split_transactions_recipient_id ON pos_modern.split_transactions(recipient_id);
CREATE INDEX idx_split_transactions_status ON pos_modern.split_transactions(status);

CREATE TABLE pos_modern.retention_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL REFERENCES pos_modern.split_payment_records(record_id) ON DELETE CASCADE,
    split_type VARCHAR(20) NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    calculated_value DECIMAL(10, 2) NOT NULL,
    wallet_id VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_retention_transactions_record_id ON pos_modern.retention_transactions(record_id);

-- Tabelas do módulo de Pedidos Remotos
CREATE TABLE pos_modern.remote_orders (
    remote_order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) NOT NULL,
    provider VARCHAR(20) NOT NULL,
    provider_order_id VARCHAR(100) NOT NULL,
    order_id UUID,
    status VARCHAR(20) NOT NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    customer_address JSONB,
    total DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_remote_orders_client_store ON pos_modern.remote_orders(client_id, store_id);
CREATE INDEX idx_remote_orders_provider ON pos_modern.remote_orders(provider);
CREATE INDEX idx_remote_orders_provider_order_id ON pos_modern.remote_orders(provider_order_id);
CREATE INDEX idx_remote_orders_order_id ON pos_modern.remote_orders(order_id);
CREATE INDEX idx_remote_orders_status ON pos_modern.remote_orders(status);

CREATE TABLE pos_modern.remote_order_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    remote_order_id UUID NOT NULL REFERENCES pos_modern.remote_orders(remote_order_id) ON DELETE CASCADE,
    provider_item_id VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    customizations JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_remote_order_items_remote_order_id ON pos_modern.remote_order_items(remote_order_id);

-- Tabelas do módulo de Garçom
CREATE TABLE pos_modern.table_layouts (
    layout_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_table_layouts_client_store ON pos_modern.table_layouts(client_id, store_id);
CREATE INDEX idx_table_layouts_active ON pos_modern.table_layouts(is_active);

CREATE TABLE pos_modern.tables (
    table_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    layout_id UUID NOT NULL REFERENCES pos_modern.table_layouts(layout_id) ON DELETE CASCADE,
    number VARCHAR(20) NOT NULL,
    capacity INTEGER NOT NULL,
    position_x DECIMAL(10, 2) NOT NULL,
    position_y DECIMAL(10, 2) NOT NULL,
    width DECIMAL(10, 2) NOT NULL,
    height DECIMAL(10, 2) NOT NULL,
    rotation INTEGER DEFAULT 0,
    shape VARCHAR(20) DEFAULT 'rectangle',
    status VARCHAR(20) DEFAULT 'available',
    current_order_id UUID,
    waiter_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tables_layout_id ON pos_modern.tables(layout_id);
CREATE INDEX idx_tables_status ON pos_modern.tables(status);
CREATE INDEX idx_tables_current_order_id ON pos_modern.tables(current_order_id);
CREATE INDEX idx_tables_waiter_id ON pos_modern.tables(waiter_id);

CREATE TABLE pos_modern.sections (
    section_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    layout_id UUID NOT NULL REFERENCES pos_modern.table_layouts(layout_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    position_x DECIMAL(10, 2) NOT NULL,
    position_y DECIMAL(10, 2) NOT NULL,
    width DECIMAL(10, 2) NOT NULL,
    height DECIMAL(10, 2) NOT NULL,
    color VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sections_layout_id ON pos_modern.sections(layout_id);

-- Tabelas do módulo KDS
CREATE TABLE pos_modern.kds_stations (
    station_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    categories JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kds_stations_client_store ON pos_modern.kds_stations(client_id, store_id);
CREATE INDEX idx_kds_stations_active ON pos_modern.kds_stations(is_active);

CREATE TABLE pos_modern.kds_item_status (
    status_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL,
    station_id UUID NOT NULL REFERENCES pos_modern.kds_stations(station_id),
    status VARCHAR(20) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    estimated_time INTEGER,
    actual_time INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kds_item_status_order_item_id ON pos_modern.kds_item_status(order_item_id);
CREATE INDEX idx_kds_item_status_station_id ON pos_modern.kds_item_status(station_id);
CREATE INDEX idx_kds_item_status_status ON pos_modern.kds_item_status(status);

-- Tabelas do módulo de Usuários
CREATE TABLE pos_modern.users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(50) NOT NULL,
    store_id VARCHAR(50),
    username VARCHAR(50) NOT NULL,
    password VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_client_store ON pos_modern.users(client_id, store_id);
CREATE INDEX idx_users_username ON pos_modern.users(username);
CREATE INDEX idx_users_email ON pos_modern.users(email);
CREATE INDEX idx_users_role ON pos_modern.users(role);
CREATE INDEX idx_users_active ON pos_modern.users(is_active);

-- Função para atualizar o timestamp de updated_at automaticamente
CREATE OR REPLACE FUNCTION pos_modern.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a função a todas as tabelas
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'pos_modern' 
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_updated_at_trigger
            BEFORE UPDATE ON pos_modern.%I
            FOR EACH ROW
            EXECUTE FUNCTION pos_modern.update_updated_at_column();
        ', t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Inserir dados iniciais para testes
INSERT INTO pos_modern.users (client_id, store_id, username, password, name, role)
VALUES 
('default', 'default', 'admin', crypt('admin123', gen_salt('bf')), 'Administrador', 'admin'),
('default', 'default', 'manager', crypt('manager123', gen_salt('bf')), 'Gerente', 'manager'),
('default', 'default', 'waiter', crypt('waiter123', gen_salt('bf')), 'Garçom', 'waiter'),
('default', 'default', 'cashier', crypt('cashier123', gen_salt('bf')), 'Caixa', 'cashier');

-- Configuração inicial do provedor de pagamento
INSERT INTO pos_modern.payment_provider_configs (provider, api_key, sandbox, default_notification)
VALUES ('asaas', '$ASAAS_API_KEY', true, 'email');

-- Mensagem de conclusão
DO $$
BEGIN
    RAISE NOTICE 'Inicialização do banco de dados concluída com sucesso!';
END;
$$ LANGUAGE plpgsql;
