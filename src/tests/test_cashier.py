import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
import json
import os
from datetime import date, datetime, timedelta

from src.api.main import app
from src.cashier.models.cashier import Cashier, CashierStatus, OperationType, PaymentMethod
from src.cashier.services.cashier_service import CashierService, get_cashier_service
from src.business_day.services.business_day_service import get_business_day_service
from src.auth.security import fake_users_db

# Configurar cliente de teste
client = TestClient(app)

# Mock para o token de autenticação
def get_auth_token(client, username="gerente", password="senha123"):
    """Obtém um token de autenticação para testes."""
    response = client.post(
        "/api/v1/auth/token",
        data={"username": username, "password": password},
    )
    return response.json()["access_token"]


# Fixture para limpar os dados de teste
@pytest.fixture
def clean_test_data():
    """Limpa os dados de teste antes e depois de cada teste."""
    # Caminho para os arquivos de dados de teste
    data_dir = os.path.join("/home/ubuntu/pos-modern/data")
    cashiers_file = os.path.join(data_dir, "cashiers.json")
    operations_file = os.path.join(data_dir, "cashier_operations.json")
    business_days_file = os.path.join(data_dir, "business_days.json")
    
    # Garantir que o diretório existe
    os.makedirs(data_dir, exist_ok=True)
    
    # Limpar dados antes do teste
    with open(cashiers_file, 'w') as f:
        json.dump([], f)
    
    with open(operations_file, 'w') as f:
        json.dump([], f)
    
    with open(business_days_file, 'w') as f:
        json.dump([], f)
    
    yield
    
    # Limpar dados após o teste
    with open(cashiers_file, 'w') as f:
        json.dump([], f)
    
    with open(operations_file, 'w') as f:
        json.dump([], f)
    
    with open(business_days_file, 'w') as f:
        json.dump([], f)


# Fixture para criar um dia de operação aberto para testes
@pytest.fixture
async def open_business_day(clean_test_data):
    """Cria um dia de operação aberto para testes."""
    service = get_business_day_service()
    today = date.today().isoformat()
    
    business_day = {
        "id": "test-day-id",
        "date": today,
        "status": "open",
        "opened_by": "gerente_id",
        "closed_by": None,
        "opened_at": datetime.now().isoformat(),
        "closed_at": None,
        "total_sales": 0.0,
        "total_orders": 0,
        "notes": "Dia de teste",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    # Salvar diretamente no arquivo de dados
    with open(os.path.join("/home/ubuntu/pos-modern/data", "business_days.json"), 'w') as f:
        json.dump([business_day], f)
    
    return business_day


# Fixture para criar um caixa aberto para testes
@pytest.fixture
async def open_cashier(open_business_day):
    """Cria um caixa aberto para testes."""
    service = get_cashier_service()
    
    cashier = {
        "id": "test-cashier-id",
        "terminal_id": "POS-001",
        "business_day_id": "test-day-id",
        "status": "open",
        "current_operator_id": "operator-123",
        "opening_balance": 100.0,
        "current_balance": 100.0,
        "expected_balance": 100.0,
        "physical_cash_amount": None,
        "cash_difference": None,
        "opened_at": datetime.now().isoformat(),
        "closed_at": None,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "notes": "Caixa de teste"
    }
    
    # Salvar diretamente no arquivo de dados
    with open(os.path.join("/home/ubuntu/pos-modern/data", "cashiers.json"), 'w') as f:
        json.dump([cashier], f)
    
    # Criar operação de abertura
    operation = {
        "id": "op-opening-123",
        "cashier_id": "test-cashier-id",
        "operation_type": "opening",
        "amount": 100.0,
        "operator_id": "operator-123",
        "payment_method": "cash",
        "related_entity_id": None,
        "balance_before": 0.0,
        "balance_after": 100.0,
        "created_at": datetime.now().isoformat(),
        "notes": "Abertura de caixa"
    }
    
    # Salvar operação
    with open(os.path.join("/home/ubuntu/pos-modern/data", "cashier_operations.json"), 'w') as f:
        json.dump([operation], f)
    
    return cashier


# Testes para abertura de caixa
@pytest.mark.asyncio
async def test_open_cashier_success(open_business_day):
    """Testa a abertura de um caixa com sucesso."""
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/cashier",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "terminal_id": "POS-002",
            "business_day_id": "test-day-id",
            "opening_balance": 150.0,
            "operator_id": "operator-456",
            "notes": "Caixa secundário"
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["terminal_id"] == "POS-002"
    assert data["business_day_id"] == "test-day-id"
    assert data["status"] == "open"
    assert data["current_operator_id"] == "operator-456"
    assert data["opening_balance"] == 150.0
    assert data["current_balance"] == 150.0
    assert data["opened_at"] is not None
    assert data["closed_at"] is None


@pytest.mark.asyncio
async def test_open_cashier_day_closed(clean_test_data):
    """Testa a abertura de um caixa quando o dia está fechado."""
    token = get_auth_token(client)
    
    # Criar dia fechado
    business_day = {
        "id": "closed-day-id",
        "date": date.today().isoformat(),
        "status": "closed",
        "opened_by": "gerente_id",
        "closed_by": "gerente_id",
        "opened_at": datetime.now().isoformat(),
        "closed_at": datetime.now().isoformat(),
        "total_sales": 0.0,
        "total_orders": 0,
        "notes": "Dia fechado",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    with open(os.path.join("/home/ubuntu/pos-modern/data", "business_days.json"), 'w') as f:
        json.dump([business_day], f)
    
    response = client.post(
        "/api/v1/cashier",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "terminal_id": "POS-001",
            "business_day_id": "closed-day-id",
            "opening_balance": 100.0,
            "operator_id": "operator-123",
            "notes": "Tentativa com dia fechado"
        }
    )
    
    assert response.status_code == 400
    assert "dia de operação está fechado" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_open_cashier_operator_already_has_cashier(open_cashier):
    """Testa a abertura de um caixa quando o operador já tem um caixa aberto."""
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/cashier",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "terminal_id": "POS-002",
            "business_day_id": "test-day-id",
            "opening_balance": 100.0,
            "operator_id": "operator-123",  # Mesmo operador do caixa já aberto
            "notes": "Tentativa com operador duplicado"
        }
    )
    
    assert response.status_code == 400
    assert "operador já possui um caixa aberto" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_open_cashier_terminal_already_has_cashier(open_cashier):
    """Testa a abertura de um caixa quando o terminal já tem um caixa aberto."""
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/cashier",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "terminal_id": "POS-001",  # Mesmo terminal do caixa já aberto
            "business_day_id": "test-day-id",
            "opening_balance": 100.0,
            "operator_id": "operator-456",
            "notes": "Tentativa com terminal duplicado"
        }
    )
    
    assert response.status_code == 400
    assert "terminal já possui um caixa aberto" in response.json()["detail"].lower()


# Testes para fechamento de caixa
@pytest.mark.asyncio
async def test_close_cashier_success(open_cashier):
    """Testa o fechamento de um caixa com sucesso."""
    token = get_auth_token(client)
    
    response = client.put(
        f"/api/v1/cashier/test-cashier-id/close",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "operator_id": "operator-123",
            "physical_cash_amount": 100.0,
            "notes": "Fechamento normal"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "test-cashier-id"
    assert data["status"] == "closed"
    assert data["physical_cash_amount"] == 100.0
    assert data["cash_difference"] == 0.0
    assert data["closed_at"] is not None


@pytest.mark.asyncio
async def test_close_cashier_not_found(clean_test_data, open_business_day):
    """Testa o fechamento de um caixa que não existe."""
    token = get_auth_token(client)
    
    response = client.put(
        "/api/v1/cashier/non-existent-id/close",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "operator_id": "operator-123",
            "physical_cash_amount": 100.0,
            "notes": "Fechamento de caixa inexistente"
        }
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_close_cashier_already_closed(open_business_day):
    """Testa o fechamento de um caixa que já está fechado."""
    token = get_auth_token(client)
    
    # Criar caixa fechado
    cashier = {
        "id": "closed-cashier-id",
        "terminal_id": "POS-001",
        "business_day_id": "test-day-id",
        "status": "closed",
        "current_operator_id": "operator-123",
        "opening_balance": 100.0,
        "current_balance": 100.0,
        "expected_balance": 100.0,
        "physical_cash_amount": 100.0,
        "cash_difference": 0.0,
        "opened_at": datetime.now().isoformat(),
        "closed_at": datetime.now().isoformat(),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "notes": "Caixa já fechado"
    }
    
    with open(os.path.join("/home/ubuntu/pos-modern/data", "cashiers.json"), 'w') as f:
        json.dump([cashier], f)
    
    response = client.put(
        "/api/v1/cashier/closed-cashier-id/close",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "operator_id": "operator-123",
            "physical_cash_amount": 100.0,
            "notes": "Tentativa de fechar caixa já fechado"
        }
    )
    
    assert response.status_code == 400
    assert "caixa já está fechado" in response.json()["detail"].lower()


# Testes para operações de caixa
@pytest.mark.asyncio
async def test_register_sale_operation(open_cashier):
    """Testa o registro de uma operação de venda."""
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/cashier/test-cashier-id/operation",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "operation_type": "sale",
            "amount": 50.0,
            "operator_id": "operator-123",
            "payment_method": "credit_card",
            "related_entity_id": "sale-123",
            "notes": "Venda de combo"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["operation_type"] == "sale"
    assert data["amount"] == 50.0
    assert data["payment_method"] == "credit_card"
    assert data["balance_before"] == 100.0
    assert data["balance_after"] == 150.0


@pytest.mark.asyncio
async def test_register_cash_withdrawal(open_cashier):
    """Testa o registro de uma retirada de dinheiro (ruptura)."""
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/cashier/test-cashier-id/withdrawal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "amount": 50.0,
            "operator_id": "operator-123",
            "reason": "Pagamento de fornecedor",
            "authorized_by": "gerente_id",
            "notes": "Retirada autorizada"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["operation_type"] == "withdrawal"
    assert data["amount"] == 50.0
    assert data["balance_before"] == 100.0
    assert data["balance_after"] == 50.0
    assert "retirada" in data["notes"].lower()


@pytest.mark.asyncio
async def test_withdrawal_exceeds_balance(open_cashier):
    """Testa uma retirada que excede o saldo do caixa."""
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/cashier/test-cashier-id/withdrawal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "amount": 150.0,  # Maior que o saldo de 100.0
            "operator_id": "operator-123",
            "reason": "Tentativa de retirada excessiva",
            "notes": "Retirada não deve ser permitida"
        }
    )
    
    assert response.status_code == 400
    assert "excede o saldo atual" in response.json()["detail"].lower()


# Testes para consulta de caixas
@pytest.mark.asyncio
async def test_get_cashier_by_id(open_cashier):
    """Testa a obtenção de um caixa específico pelo ID."""
    token = get_auth_token(client)
    
    response = client.get(
        "/api/v1/cashier/test-cashier-id",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "test-cashier-id"
    assert data["terminal_id"] == "POS-001"
    assert data["status"] == "open"


@pytest.mark.asyncio
async def test_list_cashiers(open_cashier):
    """Testa a listagem de caixas."""
    token = get_auth_token(client)
    
    response = client.get(
        "/api/v1/cashier",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == "test-cashier-id"


@pytest.mark.asyncio
async def test_get_current_cashiers(open_cashier):
    """Testa a obtenção dos caixas abertos no dia atual."""
    token = get_auth_token(client)
    
    response = client.get(
        "/api/v1/cashier/current",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == "test-cashier-id"
    assert data[0]["status"] == "open"


# Testes para operações e relatórios
@pytest.mark.asyncio
async def test_get_cashier_operations(open_cashier):
    """Testa a obtenção das operações de um caixa."""
    token = get_auth_token(client)
    
    # Adicionar uma operação de venda
    operation = {
        "id": "op-sale-123",
        "cashier_id": "test-cashier-id",
        "operation_type": "sale",
        "amount": 50.0,
        "operator_id": "operator-123",
        "payment_method": "credit_card",
        "related_entity_id": "sale-123",
        "balance_before": 100.0,
        "balance_after": 150.0,
        "created_at": datetime.now().isoformat(),
        "notes": "Venda de teste"
    }
    
    with open(os.path.join("/home/ubuntu/pos-modern/data", "cashier_operations.json"), 'r') as f:
        operations = json.load(f)
    
    operations.append(operation)
    
    with open(os.path.join("/home/ubuntu/pos-modern/data", "cashier_operations.json"), 'w') as f:
        json.dump(operations, f)
    
    response = client.get(
        "/api/v1/cashier/test-cashier-id/operations",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2  # Operação de abertura + venda
    assert any(op["operation_type"] == "sale" for op in data)
    assert any(op["operation_type"] == "opening" for op in data)


@pytest.mark.asyncio
async def test_get_cashier_report(open_cashier):
    """Testa a geração de relatório para um caixa."""
    token = get_auth_token(client)
    
    # Adicionar algumas operações
    operations = [
        {
            "id": "op-sale-1",
            "cashier_id": "test-cashier-id",
            "operation_type": "sale",
            "amount": 50.0,
            "operator_id": "operator-123",
            "payment_method": "credit_card",
            "related_entity_id": "sale-1",
            "balance_before": 100.0,
            "balance_after": 150.0,
            "created_at": datetime.now().isoformat(),
            "notes": "Venda 1"
        },
        {
            "id": "op-sale-2",
            "cashier_id": "test-cashier-id",
            "operation_type": "sale",
            "amount": 30.0,
            "operator_id": "operator-123",
            "payment_method": "cash",
            "related_entity_id": "sale-2",
            "balance_before": 150.0,
            "balance_after": 180.0,
            "created_at": datetime.now().isoformat(),
            "notes": "Venda 2"
        },
        {
            "id": "op-withdrawal",
            "cashier_id": "test-cashier-id",
            "operation_type": "withdrawal",
            "amount": 20.0,
            "operator_id": "operator-123",
            "payment_method": None,
            "related_entity_id": None,
            "balance_before": 180.0,
            "balance_after": 160.0,
            "created_at": datetime.now().isoformat(),
            "notes": "Retirada"
        }
    ]
    
    with open(os.path.join("/home/ubuntu/pos-modern/data", "cashier_operations.json"), 'r') as f:
        existing_operations = json.load(f)
    
    existing_operations.extend(operations)
    
    with open(os.path.join("/home/ubuntu/pos-modern/data", "cashier_operations.json"), 'w') as f:
        json.dump(existing_operations, f)
    
    # Atualizar saldo do caixa
    with open(os.path.join("/home/ubuntu/pos-modern/data", "cashiers.json"), 'r') as f:
        cashiers = json.load(f)
    
    cashiers[0]["current_balance"] = 160.0
    
    with open(os.path.join("/home/ubuntu/pos-modern/data", "cashiers.json"), 'w') as f:
        json.dump(cashiers, f)
    
    response = client.get(
        "/api/v1/cashier/test-cashier-id/report",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["cashier_id"] == "test-cashier-id"
    assert data["total_sales"] == 80.0
    assert data["total_withdrawals"] == 20.0
    assert "credit_card" in data["sales_by_payment_method"]
    assert "cash" in data["sales_by_payment_method"]
    assert data["operations_count"]["sale"] == 2
    assert data["operations_count"]["withdrawal"] == 1
