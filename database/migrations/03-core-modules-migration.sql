-- Migration for core modules: auth, business_day, cashier, product, order
-- This migration creates the missing tables for core modules migration to PostgreSQL

-- Create auth module tables
CREATE TABLE IF NOT EXISTS pos_modern.numeric_credentials (
    credential_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    operator_code VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE,
    failed_attempts VARCHAR(10) DEFAULT '0' NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_numeric_credentials_user_id ON pos_modern.numeric_credentials(user_id);
CREATE INDEX idx_numeric_credentials_operator_code ON pos_modern.numeric_credentials(operator_code);
CREATE INDEX idx_numeric_credentials_active ON pos_modern.numeric_credentials(is_active);

CREATE TABLE IF NOT EXISTS pos_modern.user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    device_info JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON pos_modern.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON pos_modern.user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON pos_modern.user_sessions(expires_at);
CREATE INDEX idx_user_sessions_active ON pos_modern.user_sessions(is_active);

-- Create business_day module tables
CREATE TABLE IF NOT EXISTS pos_modern.business_days (
    business_day_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) NOT NULL,
    date VARCHAR(10) NOT NULL, -- YYYY-MM-DD format
    status VARCHAR(20) NOT NULL, -- open, closed
    opened_by UUID NOT NULL,
    closed_by UUID,
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    total_sales DECIMAL(10, 2) DEFAULT 0.0 NOT NULL,
    total_orders INTEGER DEFAULT 0 NOT NULL,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_business_days_client_store ON pos_modern.business_days(client_id, store_id);
CREATE INDEX idx_business_days_date ON pos_modern.business_days(date);
CREATE INDEX idx_business_days_status ON pos_modern.business_days(status);
CREATE INDEX idx_business_days_opened_by ON pos_modern.business_days(opened_by);

CREATE TABLE IF NOT EXISTS pos_modern.business_day_operations (
    operation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_day_id UUID NOT NULL,
    operation_type VARCHAR(20) NOT NULL, -- open, close, update
    operator_id UUID NOT NULL,
    amount DECIMAL(10, 2),
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_business_day_operations_business_day_id ON pos_modern.business_day_operations(business_day_id);
CREATE INDEX idx_business_day_operations_type ON pos_modern.business_day_operations(operation_type);
CREATE INDEX idx_business_day_operations_operator_id ON pos_modern.business_day_operations(operator_id);

-- Create cashier module tables
CREATE TABLE IF NOT EXISTS pos_modern.cashiers (
    cashier_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) NOT NULL,
    terminal_id VARCHAR(50) NOT NULL,
    business_day_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL, -- open, closed
    current_operator_id UUID,
    opening_balance DECIMAL(10, 2) DEFAULT 0.0 NOT NULL,
    current_balance DECIMAL(10, 2) DEFAULT 0.0 NOT NULL,
    expected_balance DECIMAL(10, 2) DEFAULT 0.0 NOT NULL,
    physical_cash_amount DECIMAL(10, 2),
    cash_difference DECIMAL(10, 2),
    opened_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cashiers_client_store ON pos_modern.cashiers(client_id, store_id);
CREATE INDEX idx_cashiers_terminal_id ON pos_modern.cashiers(terminal_id);
CREATE INDEX idx_cashiers_business_day_id ON pos_modern.cashiers(business_day_id);
CREATE INDEX idx_cashiers_status ON pos_modern.cashiers(status);
CREATE INDEX idx_cashiers_operator_id ON pos_modern.cashiers(current_operator_id);

CREATE TABLE IF NOT EXISTS pos_modern.cashier_operations (
    operation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL,
    operation_type VARCHAR(20) NOT NULL, -- opening, closing, withdrawal, deposit, sale, refund
    amount DECIMAL(10, 2) NOT NULL,
    operator_id UUID NOT NULL,
    payment_method VARCHAR(20), -- cash, credit_card, debit_card, pix, voucher, ifood
    related_entity_id UUID, -- order_id, payment_id, etc.
    balance_before DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cashier_operations_cashier_id ON pos_modern.cashier_operations(cashier_id);
CREATE INDEX idx_cashier_operations_type ON pos_modern.cashier_operations(operation_type);
CREATE INDEX idx_cashier_operations_operator_id ON pos_modern.cashier_operations(operator_id);
CREATE INDEX idx_cashier_operations_payment_method ON pos_modern.cashier_operations(payment_method);

CREATE TABLE IF NOT EXISTS pos_modern.cashier_withdrawals (
    withdrawal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL,
    operation_id UUID NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    operator_id UUID NOT NULL,
    authorized_by UUID,
    reason VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cashier_withdrawals_cashier_id ON pos_modern.cashier_withdrawals(cashier_id);
CREATE INDEX idx_cashier_withdrawals_operation_id ON pos_modern.cashier_withdrawals(operation_id);
CREATE INDEX idx_cashier_withdrawals_operator_id ON pos_modern.cashier_withdrawals(operator_id);

-- Create additional product module tables
CREATE TABLE IF NOT EXISTS pos_modern.product_images (
    image_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES pos_modern.products(product_id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    is_main BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_images_product_id ON pos_modern.product_images(product_id);
CREATE INDEX idx_product_images_is_main ON pos_modern.product_images(is_main);

CREATE TABLE IF NOT EXISTS pos_modern.ingredients (
    ingredient_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    unit VARCHAR(20) DEFAULT 'unit' NOT NULL,
    cost_per_unit DECIMAL(10, 4) DEFAULT 0.0 NOT NULL,
    current_stock DECIMAL(10, 3) DEFAULT 0.0 NOT NULL,
    minimum_stock DECIMAL(10, 3) DEFAULT 0.0 NOT NULL,
    supplier VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ingredients_client_store ON pos_modern.ingredients(client_id, store_id);
CREATE INDEX idx_ingredients_active ON pos_modern.ingredients(is_active);

CREATE TABLE IF NOT EXISTS pos_modern.product_ingredients (
    product_ingredient_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES pos_modern.products(product_id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES pos_modern.ingredients(ingredient_id),
    quantity DECIMAL(10, 3) NOT NULL,
    is_optional BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_ingredients_product_id ON pos_modern.product_ingredients(product_id);
CREATE INDEX idx_product_ingredients_ingredient_id ON pos_modern.product_ingredients(ingredient_id);

CREATE TABLE IF NOT EXISTS pos_modern.combo_items (
    combo_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combo_product_id UUID NOT NULL REFERENCES pos_modern.products(product_id) ON DELETE CASCADE,
    item_product_id UUID NOT NULL REFERENCES pos_modern.products(product_id),
    quantity INTEGER DEFAULT 1 NOT NULL,
    is_optional BOOLEAN DEFAULT FALSE NOT NULL,
    price_adjustment DECIMAL(10, 2) DEFAULT 0.0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_combo_items_combo_product_id ON pos_modern.combo_items(combo_product_id);
CREATE INDEX idx_combo_items_item_product_id ON pos_modern.combo_items(item_product_id);

CREATE TABLE IF NOT EXISTS pos_modern.option_groups (
    option_group_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES pos_modern.products(product_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT FALSE NOT NULL,
    max_selections INTEGER DEFAULT 1 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_option_groups_product_id ON pos_modern.option_groups(product_id);
CREATE INDEX idx_option_groups_active ON pos_modern.option_groups(is_active);

CREATE TABLE IF NOT EXISTS pos_modern.options (
    option_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    option_group_id UUID NOT NULL REFERENCES pos_modern.option_groups(option_group_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price_adjustment DECIMAL(10, 2) DEFAULT 0.0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_options_option_group_id ON pos_modern.options(option_group_id);
CREATE INDEX idx_options_active ON pos_modern.options(is_active);

-- Add missing columns to existing tables
ALTER TABLE pos_modern.users ADD COLUMN IF NOT EXISTS permissions JSONB;

ALTER TABLE pos_modern.products ADD COLUMN IF NOT EXISTS sku VARCHAR(50);
ALTER TABLE pos_modern.products ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE pos_modern.products ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'SIMPLE';
ALTER TABLE pos_modern.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE pos_modern.products ADD COLUMN IF NOT EXISTS weight_based BOOLEAN DEFAULT FALSE;
ALTER TABLE pos_modern.products ADD COLUMN IF NOT EXISTS pricing_strategy VARCHAR(20) DEFAULT 'FIXED';

-- Update order tables with missing columns
ALTER TABLE pos_modern.orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'dine_in';
ALTER TABLE pos_modern.orders ADD COLUMN IF NOT EXISTS business_day_id UUID;
ALTER TABLE pos_modern.orders ADD COLUMN IF NOT EXISTS cashier_id UUID;
ALTER TABLE pos_modern.orders ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10, 2) DEFAULT 0.0;
ALTER TABLE pos_modern.orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) DEFAULT 0.0;
ALTER TABLE pos_modern.orders ADD COLUMN IF NOT EXISTS delivery_address JSONB;
ALTER TABLE pos_modern.orders ADD COLUMN IF NOT EXISTS estimated_preparation_time INTEGER;
ALTER TABLE pos_modern.orders ADD COLUMN IF NOT EXISTS preparation_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE pos_modern.orders ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE pos_modern.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE pos_modern.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE pos_modern.orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

ALTER TABLE pos_modern.order_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(100);
ALTER TABLE pos_modern.order_items ADD COLUMN IF NOT EXISTS preparation_time INTEGER;
ALTER TABLE pos_modern.order_items ADD COLUMN IF NOT EXISTS preparation_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE pos_modern.order_items ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP WITH TIME ZONE;

-- Create additional order tables
CREATE TABLE IF NOT EXISTS pos_modern.order_discounts (
    discount_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES pos_modern.orders(order_id) ON DELETE CASCADE,
    discount_type VARCHAR(20) NOT NULL, -- coupon, points, percentage, fixed
    discount_code VARCHAR(50),
    discount_amount DECIMAL(10, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2),
    description VARCHAR(255),
    applied_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_discounts_order_id ON pos_modern.order_discounts(order_id);
CREATE INDEX idx_order_discounts_type ON pos_modern.order_discounts(discount_type);

CREATE TABLE IF NOT EXISTS pos_modern.order_payments (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES pos_modern.orders(order_id) ON DELETE CASCADE,
    payment_method VARCHAR(20) NOT NULL, -- cash, credit_card, debit_card, pix, voucher
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- pending, completed, failed, refunded
    transaction_id VARCHAR(100),
    provider_payment_id VARCHAR(100),
    processed_by UUID,
    processed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_payments_order_id ON pos_modern.order_payments(order_id);
CREATE INDEX idx_order_payments_method ON pos_modern.order_payments(payment_method);
CREATE INDEX idx_order_payments_status ON pos_modern.order_payments(status);

CREATE TABLE IF NOT EXISTS pos_modern.order_history (
    history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES pos_modern.orders(order_id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by UUID NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_history_order_id ON pos_modern.order_history(order_id);
CREATE INDEX idx_order_history_status ON pos_modern.order_history(new_status);
CREATE INDEX idx_order_history_changed_by ON pos_modern.order_history(changed_by);

-- Apply update triggers to new tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'pos_modern' 
        AND table_type = 'BASE TABLE'
        AND table_name IN (
            'numeric_credentials', 'user_sessions', 'business_days', 'business_day_operations',
            'cashiers', 'cashier_operations', 'cashier_withdrawals', 'product_images',
            'ingredients', 'product_ingredients', 'combo_items', 'option_groups', 'options',
            'order_discounts', 'order_payments', 'order_history'
        )
    LOOP
        BEGIN
            EXECUTE format('
                CREATE TRIGGER update_updated_at_trigger
                BEFORE UPDATE ON pos_modern.%I
                FOR EACH ROW
                EXECUTE FUNCTION pos_modern.update_updated_at_column();
            ', t);
        EXCEPTION
            WHEN duplicate_object THEN
                -- Trigger already exists, continue
                NULL;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing
INSERT INTO pos_modern.business_days (client_id, store_id, date, status, opened_by, opened_at, total_sales, total_orders)
VALUES ('default', 'default', '2025-08-14', 'open', (SELECT user_id FROM pos_modern.users WHERE username = 'admin' LIMIT 1), NOW(), 0.0, 0)
ON CONFLICT DO NOTHING;

-- Message
DO $$
BEGIN
    RAISE NOTICE 'Core modules migration completed successfully!';
    RAISE NOTICE 'Tables created: auth, business_day, cashier, product (extended), order (extended)';
END;
$$ LANGUAGE plpgsql;