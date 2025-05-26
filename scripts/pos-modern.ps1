# PowerShell script para iniciar o sistema POS Modern
# Autor: POS Modern Team
# Data: 25/05/2025

# Diretório do script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Get-Item $ScriptDir).Parent.FullName

# Verificar se o Docker está instalado
try {
    $null = Get-Command docker -ErrorAction Stop
}
catch {
    Write-Host "Docker não encontrado. Por favor, instale o Docker antes de continuar." -ForegroundColor Red
    exit 1
}

# Verificar se o Docker Compose está instalado
try {
    $null = Get-Command docker-compose -ErrorAction Stop
}
catch {
    Write-Host "Docker Compose não encontrado. Por favor, instale o Docker Compose antes de continuar." -ForegroundColor Red
    exit 1
}

# Ir para o diretório raiz do projeto
Set-Location -Path $ProjectRoot

# Verificar se o arquivo docker-compose.yml existe
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "Arquivo docker-compose.yml não encontrado no diretório raiz do projeto." -ForegroundColor Red
    exit 1
}

# Configurar variáveis de ambiente
$EnvFile = Join-Path -Path $ProjectRoot -ChildPath ".env"
if (-not (Test-Path $EnvFile)) {
    Write-Host "Criando arquivo .env com configurações padrão..." -ForegroundColor Yellow
    
    # Configurações padrão
    @"
POSTGRES_USER=posmodern
POSTGRES_PASSWORD=posmodern123
POSTGRES_DB=posmodern
POSTGRES_PORT=5432
RABBITMQ_USER=posmodern
RABBITMQ_PASSWORD=posmodern123
RABBITMQ_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672
REDIS_PASSWORD=posmodern123
REDIS_PORT=6379
API_GATEWAY_PORT=3000
DASHBOARD_PORT=8080
NODE_ENV=development
ASAAS_API_KEY=seu_api_key_aqui
ASAAS_ENV=sandbox
"@ | Out-File -FilePath $EnvFile -Encoding utf8
    
    Write-Host "Arquivo .env criado. IMPORTANTE: Edite o arquivo e configure sua API key do Asaas." -ForegroundColor Yellow
}

# Criar diretórios necessários
$DataDir = Join-Path -Path $ProjectRoot -ChildPath "data"
$LogsDir = Join-Path -Path $ProjectRoot -ChildPath "logs"

if (-not (Test-Path $DataDir)) {
    New-Item -Path $DataDir -ItemType Directory | Out-Null
    Write-Host "Diretório de dados criado: $DataDir" -ForegroundColor Green
}

if (-not (Test-Path $LogsDir)) {
    New-Item -Path $LogsDir -ItemType Directory | Out-Null
    Write-Host "Diretório de logs criado: $LogsDir" -ForegroundColor Green
}

# Iniciar os serviços
Write-Host "Iniciando o sistema POS Modern..." -ForegroundColor Cyan
docker-compose up -d

# Verificar se os serviços foram iniciados corretamente
if ($LASTEXITCODE -eq 0) {
    Write-Host "Sistema POS Modern iniciado com sucesso!" -ForegroundColor Green
    Write-Host "Serviços disponíveis:" -ForegroundColor Cyan
    docker-compose ps
    
    # Obter as portas dos serviços do arquivo .env
    $EnvContent = Get-Content $EnvFile
    
    $ApiPort = ($EnvContent | Where-Object { $_ -match "API_GATEWAY_PORT=(.*)" } | ForEach-Object { $matches[1] })
    if (-not $ApiPort) { $ApiPort = "3000" }
    
    $DashboardPort = ($EnvContent | Where-Object { $_ -match "DASHBOARD_PORT=(.*)" } | ForEach-Object { $matches[1] })
    if (-not $DashboardPort) { $DashboardPort = "8080" }
    
    $RabbitMQPort = ($EnvContent | Where-Object { $_ -match "RABBITMQ_MANAGEMENT_PORT=(.*)" } | ForEach-Object { $matches[1] })
    if (-not $RabbitMQPort) { $RabbitMQPort = "15672" }
    
    $RabbitMQUser = ($EnvContent | Where-Object { $_ -match "RABBITMQ_USER=(.*)" } | ForEach-Object { $matches[1] })
    if (-not $RabbitMQUser) { $RabbitMQUser = "posmodern" }
    
    $RabbitMQPassword = ($EnvContent | Where-Object { $_ -match "RABBITMQ_PASSWORD=(.*)" } | ForEach-Object { $matches[1] })
    if (-not $RabbitMQPassword) { $RabbitMQPassword = "posmodern123" }
    
    Write-Host ""
    Write-Host "API Gateway disponível em: http://localhost:$ApiPort" -ForegroundColor Green
    Write-Host "Dashboard disponível em: http://localhost:$DashboardPort" -ForegroundColor Green
    Write-Host "RabbitMQ Management disponível em: http://localhost:$RabbitMQPort" -ForegroundColor Green
    Write-Host "Usuário: $RabbitMQUser" -ForegroundColor Green
    Write-Host "Senha: $RabbitMQPassword" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Para parar o sistema, execute: docker-compose down" -ForegroundColor Yellow
}
else {
    Write-Host "Erro ao iniciar o sistema POS Modern. Verifique os logs para mais detalhes." -ForegroundColor Red
    exit 1
}
