# Configuração de Ambientes - ChefIA POS

Este diretório contém as configurações para diferentes ambientes do sistema ChefIA POS.

## Estrutura

```
config/
├── environments/
│   ├── development.json    # Ambiente de desenvolvimento
│   ├── staging.json        # Ambiente de homologação
│   ├── production.json     # Ambiente de produção
│   └── test.json          # Ambiente de testes
├── config.py              # Gerenciador de configurações
└── README.md              # Este arquivo
```

## Ambientes Disponíveis

### Development (Desenvolvimento)
- **Uso**: Desenvolvimento local
- **Debug**: Habilitado
- **Hot Reload**: Habilitado
- **Base de Dados**: Local (localhost:5432)
- **APIs Externas**: Sandbox/Mock

### Staging (Homologação)
- **Uso**: Testes de homologação
- **Debug**: Desabilitado
- **Hot Reload**: Desabilitado
- **Base de Dados**: Servidor de staging
- **APIs Externas**: Sandbox

### Production (Produção)
- **Uso**: Ambiente de produção
- **Debug**: Desabilitado
- **Logs**: Apenas erros críticos
- **Base de Dados**: Servidor de produção
- **APIs Externas**: Produção

### Test (Testes)
- **Uso**: Execução de testes automatizados
- **Debug**: Habilitado para debugging
- **Base de Dados**: Database isolada para testes
- **APIs Externas**: Mocks

## Como Usar

### 1. Via Script Python (Recomendado)

```bash
# Configurar ambiente de desenvolvimento
python scripts/set-environment.py development

# Configurar ambiente de staging
python scripts/set-environment.py staging

# Configurar ambiente de produção
python scripts/set-environment.py production

# Configurar ambiente de testes
python scripts/set-environment.py test

# Ver ambiente atual
python scripts/set-environment.py
```

### 2. Via Configuração Manual

```python
from config.config import config_manager

# Obter configuração do ambiente
config = config_manager.get_environment_config('development')

# Obter configuração específica do backend
backend_config = config_manager.get_backend_config('development')

# Obter URL do banco de dados
db_url = config_manager.get_database_url('development')

# Verificar se feature está habilitada
debug_enabled = config_manager.is_feature_enabled('enable_debug_toolbar', 'development')
```

### 3. Via Variáveis de Ambiente

```bash
# Definir ambiente via variável
export ENVIRONMENT=development

# No Windows
set ENVIRONMENT=development
```

## Configuração do VS Code

O projeto inclui configurações otimizadas para VS Code:

### Launch Configurations (.vscode/launch.json)
- **Debug Backend (FastAPI)**: Debug do servidor Python
- **Debug POS App (React)**: Debug do app principal
- **Debug KDS App (React)**: Debug do sistema de cozinha
- **Debug Kiosk App (React)**: Debug do kiosk
- **Debug Waiter App (React)**: Debug do app do garçom
- **Debug Backend Tests**: Debug dos testes Python
- **Debug Frontend Tests**: Debug dos testes React
- **Debug E2E Tests**: Debug dos testes end-to-end

### Task Configurations (.vscode/tasks.json)
- **Backend: Start Development Server**: Iniciar servidor backend
- **Frontend: Install Dependencies**: Instalar dependências
- **Frontend: Start [App]**: Iniciar apps específicos
- **Frontend: Build All Apps**: Build de produção
- **Frontend: Run Tests**: Executar testes
- **Docker: Start Infrastructure**: Iniciar PostgreSQL, RabbitMQ, Redis

### Settings (.vscode/settings.json)
- Configurações de Python (linting, formatting, testing)
- Configurações de TypeScript/JavaScript
- Configurações de ESLint e Prettier
- File associations e exclusions
- Terminal e debugging settings

## Configurações por App Frontend

Cada app frontend tem suas próprias configurações via arquivos `.env`:

```
frontend/
├── .env.development      # Configurações de desenvolvimento
├── .env.staging          # Configurações de staging
├── .env.production       # Configurações de produção
└── .env.test            # Configurações de teste
```

### Variáveis Disponíveis

```bash
# API Configuration
VITE_API_URL=http://localhost:8001
VITE_WS_URL=ws://localhost:8001/ws

# App Configuration
VITE_APP_NAME=ChefIA POS System
VITE_APP_VERSION=1.0.0-dev
VITE_DEBUG=true

# Feature Flags
VITE_ENABLE_DEBUG_TOOLBAR=true
VITE_ENABLE_HOT_RELOAD=true
VITE_ENABLE_MOCK_DATA=false
VITE_ENABLE_ANALYTICS=false

# Authentication
VITE_JWT_EXPIRATION_HOURS=24

# External Services
VITE_GOOGLE_MAPS_API_KEY=development-key
VITE_PAYMENT_GATEWAY_ENV=sandbox
```

## Comandos de Desenvolvimento

### Iniciar Ambiente Completo

```bash
# 1. Configurar ambiente
python scripts/set-environment.py development

# 2. Iniciar infraestrutura
docker-compose up -d postgres rabbitmq redis

# 3. Iniciar backend
python -m src.main

# 4. Iniciar frontend (em outro terminal)
cd frontend
npm run dev
```

### Executar via VS Code

1. Abrir Command Palette (`Ctrl+Shift+P`)
2. Executar `Tasks: Run Task`
3. Selecionar `Full Stack: Start All Services`

### Executar via Debug

1. Ir para aba Debug (`Ctrl+Shift+D`)
2. Selecionar `Debug Full Stack (Backend + POS)`
3. Pressionar `F5`

## Troubleshooting

### Problema: Configuração não aplicada
**Solução**: Reiniciar VS Code após mudança de ambiente

### Problema: Erro de conexão com banco
**Solução**: Verificar se Docker está rodando
```bash
docker-compose up -d postgres
```

### Problema: Erro de dependências
**Solução**: Reinstalar dependências
```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

### Problema: Conflito de portas
**Solução**: Verificar portas ocupadas
```bash
# Windows
netstat -ano | findstr :8001

# Linux/Mac
lsof -i :8001
```

## Variáveis de Ambiente Obrigatórias

### Staging/Production
```bash
# Database
POSTGRES_HOST=your-db-host
POSTGRES_DB=your-db-name
POSTGRES_USER=your-db-user
POSTGRES_PASSWORD=your-db-password

# Redis
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password

# RabbitMQ
RABBITMQ_HOST=your-rabbitmq-host
RABBITMQ_USER=your-rabbitmq-user
RABBITMQ_PASSWORD=your-rabbitmq-password

# Authentication
JWT_SECRET=your-secure-jwt-secret

# External Services
GOOGLE_MAPS_API_KEY=your-google-maps-key
ASAAS_PRODUCTION_API_KEY=your-asaas-key
```

## Segurança

⚠️ **IMPORTANTE**: 
- Nunca commitar senhas ou chaves de API
- Usar variáveis de ambiente para dados sensíveis
- Verificar arquivos `.env` no `.gitignore`
- Gerar novos secrets para produção

## Suporte

Para dúvidas ou problemas com configurações:
1. Verificar este README
2. Verificar logs de erro
3. Consultar documentação do VS Code
4. Abrir issue no repositório