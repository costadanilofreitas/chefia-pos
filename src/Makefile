# Makefile para automação de tarefas do backend (Chefia POS)

.PHONY: help install dev-install format lint typecheck test clean setup-hooks run all ci-check

# Variáveis
PYTHON = python3
PIP = pip
SRC_DIR = .
TEST_DIR = tests

# Help
help:
	@echo "Comandos disponíveis:"
	@echo "  install      - Instalar dependências de produção (poetry)"
	@echo "  dev-install  - Instalar dependências de desenvolvimento"
	@echo "  format       - Formatar código (black + ruff)"
	@echo "  format-check - Verificar formatação sem alterar arquivos"
	@echo "  lint         - Executar linting (ruff)"
	@echo "  typecheck    - Verificar tipos (mypy)"
	@echo "  test         - Executar testes (pytest)"
	@echo "  test-cov     - Executar testes com coverage"
	@echo "  clean        - Limpar arquivos temporários"
	@echo "  setup-hooks  - Configurar pre-commit hooks"
	@echo "  run          - Executar aplicação"
	@echo "  run-dev      - Executar aplicação em modo desenvolvimento"
	@echo "  all          - Formatar, lint, typecheck e testar"
	@echo "  ci-check     - Verificação completa do CI"

# Instalação
install:
	poetry install --no-dev

dev-install: install
	poetry install
	poetry add --group dev pre-commit

# Formatação
format:
	@echo "📝 Formatando com black..."
	poetry run black $(SRC_DIR)
	@echo "🔧 Aplicando ruff fix..."
	poetry run ruff check $(SRC_DIR) --fix
	@echo "✅ Formatação concluída!"

# Verificar formatação sem alterar
format-check:
	@echo "📋 Verificando formatação..."
	poetry run black --check $(SRC_DIR)
	poetry run ruff check $(SRC_DIR)
	@echo "✅ Verificação de formatação concluída!"

# Linting
lint:
	@echo "🔍 Executando ruff..."
	poetry run ruff check $(SRC_DIR)
	@echo "✅ Linting concluído!"

# Type checking
typecheck:
	@echo "🔍 Executando mypy..."
	poetry run mypy $(SRC_DIR) --ignore-missing-imports
	@echo "✅ Type checking concluído!"

# Testes
test:
	@echo "🧪 Executando testes..."
	poetry run pytest $(TEST_DIR) -v

test-cov:
	@echo "🧪 Executando testes com coverage..."
	poetry run pytest $(TEST_DIR) --cov=$(SRC_DIR) --cov-report=html --cov-report=term-missing

# Limpeza
clean:
	@echo "🧹 Limpando arquivos temporários..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.pyd" -delete
	find . -type f -name ".coverage" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Limpeza concluída!"

# Configurar hooks
setup-hooks:
	@echo "⚙️ Configurando pre-commit hooks..."
	poetry run pre-commit install
	poetry run pre-commit install --hook-type commit-msg
	@echo "✅ Hooks configurados!"

# Executar aplicação
run:
	@echo "🚀 Iniciando aplicação..."
	poetry run uvicorn main:app --host 0.0.0.0 --port 8001

run-dev:
	@echo "🚀 Iniciando aplicação em modo desenvolvimento..."
	poetry run uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Comando completo
all: format lint typecheck test
	@echo "✅ Todas as verificações passaram!"

# Verificação completa do CI
ci-check: format-check lint typecheck test
	@echo "✅ Verificação completa do CI passou!"

# Configuração inicial do projeto
setup: dev-install setup-hooks
	@echo "✅ Projeto configurado com sucesso!"
	@echo "💡 Execute 'make format' para formatar o código"
	@echo "💡 Execute 'make run-dev' para iniciar o desenvolvimento"