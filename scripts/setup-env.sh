#!/bin/bash

# Script para configurar variáveis de ambiente para o PostgreSQL
# Autor: POS Modern Team
# Data: 25/05/2025

# Diretório do script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Criar arquivo .env se não existir
ENV_FILE="$PROJECT_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Criando arquivo .env..."
    touch "$ENV_FILE"
fi

# Configurações padrão
DEFAULT_POSTGRES_USER="posmodern"
DEFAULT_POSTGRES_PASSWORD="posmodern123"
DEFAULT_POSTGRES_DB="posmodern"
DEFAULT_POSTGRES_PORT="5432"
DEFAULT_RABBITMQ_USER="posmodern"
DEFAULT_RABBITMQ_PASSWORD="posmodern123"
DEFAULT_RABBITMQ_PORT="5672"
DEFAULT_RABBITMQ_MANAGEMENT_PORT="15672"
DEFAULT_REDIS_PASSWORD="posmodern123"
DEFAULT_REDIS_PORT="6379"
DEFAULT_API_GATEWAY_PORT="3000"
DEFAULT_DASHBOARD_PORT="8080"
DEFAULT_NODE_ENV="development"

# Função para atualizar ou adicionar variável no .env
update_env_var() {
    local key=$1
    local value=$2
    
    if grep -q "^${key}=" "$ENV_FILE"; then
        # Substituir valor existente
        sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    else
        # Adicionar nova variável
        echo "${key}=${value}" >> "$ENV_FILE"
    fi
}

# Atualizar variáveis de ambiente
update_env_var "POSTGRES_USER" "$DEFAULT_POSTGRES_USER"
update_env_var "POSTGRES_PASSWORD" "$DEFAULT_POSTGRES_PASSWORD"
update_env_var "POSTGRES_DB" "$DEFAULT_POSTGRES_DB"
update_env_var "POSTGRES_PORT" "$DEFAULT_POSTGRES_PORT"
update_env_var "RABBITMQ_USER" "$DEFAULT_RABBITMQ_USER"
update_env_var "RABBITMQ_PASSWORD" "$DEFAULT_RABBITMQ_PASSWORD"
update_env_var "RABBITMQ_PORT" "$DEFAULT_RABBITMQ_PORT"
update_env_var "RABBITMQ_MANAGEMENT_PORT" "$DEFAULT_RABBITMQ_MANAGEMENT_PORT"
update_env_var "REDIS_PASSWORD" "$DEFAULT_REDIS_PASSWORD"
update_env_var "REDIS_PORT" "$DEFAULT_REDIS_PORT"
update_env_var "API_GATEWAY_PORT" "$DEFAULT_API_GATEWAY_PORT"
update_env_var "DASHBOARD_PORT" "$DEFAULT_DASHBOARD_PORT"
update_env_var "NODE_ENV" "$DEFAULT_NODE_ENV"

# Verificar se o Asaas API Key está definido
if ! grep -q "^ASAAS_API_KEY=" "$ENV_FILE"; then
    echo "ASAAS_API_KEY=seu_api_key_aqui" >> "$ENV_FILE"
    echo "ASAAS_ENV=sandbox" >> "$ENV_FILE"
    echo "IMPORTANTE: Edite o arquivo .env e configure sua API key do Asaas."
fi

echo "Configuração de variáveis de ambiente concluída."
echo "Arquivo .env criado/atualizado em: $ENV_FILE"

# Criar diretórios necessários se não existirem
mkdir -p "$PROJECT_ROOT/data"
mkdir -p "$PROJECT_ROOT/logs"

echo "Diretórios de dados e logs criados."
echo "Configuração concluída com sucesso!"
