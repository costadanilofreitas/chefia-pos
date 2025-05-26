#!/bin/bash

# Script para iniciar o sistema POS Modern
# Autor: POS Modern Team
# Data: 25/05/2025

# Diretório do script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Verificar se o Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "Docker não encontrado. Por favor, instale o Docker antes de continuar."
    exit 1
fi

# Verificar se o Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose não encontrado. Por favor, instale o Docker Compose antes de continuar."
    exit 1
fi

# Configurar variáveis de ambiente
if [ -f "$SCRIPT_DIR/setup-env.sh" ]; then
    echo "Configurando variáveis de ambiente..."
    bash "$SCRIPT_DIR/setup-env.sh"
fi

# Ir para o diretório raiz do projeto
cd "$PROJECT_ROOT"

# Verificar se o arquivo docker-compose.yml existe
if [ ! -f "docker-compose.yml" ]; then
    echo "Arquivo docker-compose.yml não encontrado no diretório raiz do projeto."
    exit 1
fi

# Iniciar os serviços
echo "Iniciando o sistema POS Modern..."
docker-compose up -d

# Verificar se os serviços foram iniciados corretamente
if [ $? -eq 0 ]; then
    echo "Sistema POS Modern iniciado com sucesso!"
    echo "Serviços disponíveis:"
    docker-compose ps
    
    # Obter a porta do API Gateway
    API_PORT=$(grep "API_GATEWAY_PORT" .env | cut -d '=' -f2 || echo "3000")
    
    echo ""
    echo "API Gateway disponível em: http://localhost:$API_PORT"
    
    # Obter a porta do Dashboard
    DASHBOARD_PORT=$(grep "DASHBOARD_PORT" .env | cut -d '=' -f2 || echo "8080")
    
    echo "Dashboard disponível em: http://localhost:$DASHBOARD_PORT"
    
    # Obter a porta do RabbitMQ Management
    RABBITMQ_MANAGEMENT_PORT=$(grep "RABBITMQ_MANAGEMENT_PORT" .env | cut -d '=' -f2 || echo "15672")
    
    echo "RabbitMQ Management disponível em: http://localhost:$RABBITMQ_MANAGEMENT_PORT"
    echo "Usuário: $(grep "RABBITMQ_USER" .env | cut -d '=' -f2 || echo "posmodern")"
    echo "Senha: $(grep "RABBITMQ_PASSWORD" .env | cut -d '=' -f2 || echo "posmodern123")"
    
    echo ""
    echo "Para parar o sistema, execute: docker-compose down"
else
    echo "Erro ao iniciar o sistema POS Modern. Verifique os logs para mais detalhes."
    exit 1
fi
