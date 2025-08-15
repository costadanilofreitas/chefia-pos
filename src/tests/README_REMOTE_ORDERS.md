# Testes Remote Orders - PostgreSQL

Este diretório contém todos os testes relacionados ao módulo Remote Orders após a migração para PostgreSQL.

## 📁 Estrutura de Testes

### Testes Gerais (`src/tests/`)
- `test_postgres_integration.py` - Testes de integração PostgreSQL
- `test_remote_orders_complete.py` - Suite completa de testes

### Testes Específicos (`src/remote_orders/tests/`)
- `test_remote_orders_api.py` - Testes de API REST
- `test_postgres_remote_orders.py` - Testes específicos PostgreSQL
- `run_tests.py` - Script para executar todos os testes do módulo

## 🚀 Como Executar os Testes

### Pré-requisitos

1. **PostgreSQL rodando:**
```bash
docker-compose up postgres
```

2. **Dependências instaladas:**
```bash
pip install asyncpg sqlalchemy[asyncio] pytest requests
```

### Execução dos Testes

#### 1. Suite Completa (Recomendado)
```bash
# Da raiz do projeto
python src/tests/test_remote_orders_complete.py
```

#### 2. Testes PostgreSQL
```bash
python src/tests/test_postgres_integration.py
```

#### 3. Testes do Módulo Remote Orders
```bash
python src/remote_orders/tests/run_tests.py
```

#### 4. Testes de API (requer servidor rodando)
```bash
# Terminal 1: Iniciar servidor
python -m src.main

# Terminal 2: Executar testes
python src/remote_orders/tests/test_remote_orders_api.py
```

#### 5. Testes Unitários com pytest
```bash
pytest src/remote_orders/tests/ -v
```

## 🧪 Tipos de Testes

### ✅ Testes de Conexão
- Verificação de conectividade PostgreSQL
- Health checks do banco
- Configuração de variáveis de ambiente

### ✅ Testes de Repository
- Operações CRUD básicas
- Consultas com filtros
- Estatísticas e agregações
- Conversões de modelos

### ✅ Testes de Service
- Lógica de negócio
- Integração com adapters
- Event bus
- Configurações de plataforma

### ✅ Testes de API
- Autenticação JWT
- Endpoints REST
- Fluxo completo: webhook → aceitar → despachar
- Tratamento de erros

## 🔧 Configuração de Ambiente

### Variáveis de Ambiente (para testes)
```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=posmodern
export DB_PASSWORD=posmodern123
export DB_NAME=posmodern
```

### Docker Compose
```bash
# Subir apenas PostgreSQL
docker-compose up postgres

# Ver logs
docker-compose logs postgres
```

## 📊 Cobertura de Testes

Os testes cobrem:
- ✅ Conexão e configuração PostgreSQL
- ✅ Modelos Pydantic e SQLAlchemy
- ✅ Repository pattern (CRUD)
- ✅ Service layer
- ✅ API endpoints
- ✅ Estatísticas e relatórios
- ✅ Integração com adapters
- ✅ Event system

## 🐛 Troubleshooting

### Erro de Conexão PostgreSQL
```bash
# Verificar se PostgreSQL está rodando
docker ps | grep postgres

# Reiniciar PostgreSQL
docker-compose restart postgres

# Verificar logs
docker-compose logs postgres
```

### Erro de Importação
```bash
# Verificar se você está na raiz do projeto
pwd

# Instalar dependências faltantes
pip install -r requirements.txt
```

### Erro de Permissões
```bash
# No PostgreSQL, verificar usuário
docker exec -it pos_postgres psql -U posmodern -d posmodern -c "\du"
```

## 📝 Adicionando Novos Testes

1. **Testes unitários:** Adicionar em `src/remote_orders/tests/`
2. **Testes de integração:** Adicionar em `src/tests/`
3. **Seguir padrão:** Nome `test_*.py` ou `*_test.py`
4. **Documentar:** Adicionar docstrings e comentários

## 🎯 Resultados Esperados

Todos os testes devem passar com PostgreSQL configurado:

```
📊 RESUMO FINAL DOS TESTES
==========================================
Configuração PostgreSQL.................. ✅ PASSOU
Testes unitários Remote Orders........... ✅ PASSOU
Testes PostgreSQL específicos............ ✅ PASSOU
Integração PostgreSQL.................... ✅ PASSOU
Testes de API............................ ✅ PASSOU

Resultado Final: 5/5 testes passaram

🎉 TODOS OS TESTES PASSARAM!
✅ Remote Orders com PostgreSQL está funcionando perfeitamente!
```