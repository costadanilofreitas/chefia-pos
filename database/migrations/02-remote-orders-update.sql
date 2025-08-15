-- Migração para atualizar estrutura de Remote Orders
-- Adiciona campos e tabelas necessárias para o novo modelo

-- Atualizar tabela remote_orders para incluir novos campos
ALTER TABLE pos_modern.remote_orders 
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(100),
ADD COLUMN IF NOT EXISTS customer_document VARCHAR(20),
ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS payment_total DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS payment_prepaid BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS payment_online BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;

-- Renomear colunas se necessário para seguir convenção
DO $$
BEGIN
    -- Verificar se colunas antigas existem e renomear
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'pos_modern' 
               AND table_name = 'remote_orders' 
               AND column_name = 'provider_order_id') THEN
        -- Coluna já existe, pular
        NULL;
    ELSE
        -- Adicionar nova coluna se não existir
        ALTER TABLE pos_modern.remote_orders 
        ADD COLUMN provider_order_id VARCHAR(100) NOT NULL DEFAULT '';
    END IF;
END $$;

-- Criar tabela de configurações de plataformas remotas
CREATE TABLE IF NOT EXISTS pos_modern.remote_platform_configs (
    config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(50) NOT NULL DEFAULT 'default',
    store_id VARCHAR(50) NOT NULL DEFAULT 'default',
    platform VARCHAR(20) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    api_key VARCHAR(255) NOT NULL,
    api_secret VARCHAR(255) NOT NULL,
    webhook_url VARCHAR(500),
    auto_accept BOOLEAN DEFAULT FALSE,
    auto_accept_conditions JSONB DEFAULT '{}'::jsonb,
    default_preparation_time INTEGER DEFAULT 30,
    notification_email VARCHAR(100),
    notification_phone VARCHAR(20),
    notification_settings JSONB DEFAULT '{}'::jsonb,
    rejection_reasons JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Criar índices para a nova tabela
CREATE INDEX IF NOT EXISTS idx_remote_platform_configs_platform 
ON pos_modern.remote_platform_configs(platform);

CREATE INDEX IF NOT EXISTS idx_remote_platform_configs_client_store 
ON pos_modern.remote_platform_configs(client_id, store_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_remote_platform_configs_unique 
ON pos_modern.remote_platform_configs(client_id, store_id, platform);

-- Adicionar trigger de updated_at para nova tabela
CREATE TRIGGER update_updated_at_trigger_remote_platform_configs
    BEFORE UPDATE ON pos_modern.remote_platform_configs
    FOR EACH ROW
    EXECUTE FUNCTION pos_modern.update_updated_at_column();

-- Atualizar índices existentes na tabela remote_orders
CREATE INDEX IF NOT EXISTS idx_remote_orders_status_created_at 
ON pos_modern.remote_orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_remote_orders_provider_status 
ON pos_modern.remote_orders(provider, status);

CREATE INDEX IF NOT EXISTS idx_remote_orders_created_at_date 
ON pos_modern.remote_orders(DATE(created_at));

-- Inserir configurações padrão para testes
INSERT INTO pos_modern.remote_platform_configs (platform, api_key, api_secret, webhook_url, rejection_reasons)
VALUES 
('ifood', 'test_ifood_key', 'test_ifood_secret', 
 'http://localhost:8001/api/v1/remote-orders/webhook/ifood',
 '["Produto em falta", "Horário de funcionamento", "Problema técnico", "Valor muito baixo", "Endereço fora da área"]'::jsonb),
('rappi', 'test_rappi_key', 'test_rappi_secret', 
 'http://localhost:8001/api/v1/remote-orders/webhook/rappi',
 '["Produto em falta", "Horário de funcionamento", "Problema técnico", "Valor muito baixo", "Endereço fora da área"]'::jsonb),
('ubereats', 'test_uber_key', 'test_uber_secret', 
 'http://localhost:8001/api/v1/remote-orders/webhook/ubereats',
 '["Produto em falta", "Horário de funcionamento", "Problema técnico", "Valor muito baixo", "Endereço fora da área"]'::jsonb)
ON CONFLICT (client_id, store_id, platform) DO NOTHING;

-- Mensagem de conclusão
DO $$
BEGIN
    RAISE NOTICE 'Migração de Remote Orders concluída com sucesso!';
END;
$$ LANGUAGE plpgsql;