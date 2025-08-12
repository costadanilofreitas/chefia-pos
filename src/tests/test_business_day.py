import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
import json
import os
from datetime import date, datetime, timedelta

from src.api.main import app
from src.business_day.models.business_day import BusinessDay, DayStatus
from src.business_day.services.business_day_service import get_business_day_service

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
    # Caminho para o arquivo de dados de teste
    data_dir = os.path.join("/home/ubuntu/pos-modern/data")
    business_days_file = os.path.join(data_dir, "business_days.json")

    # Garantir que o diretório existe
    os.makedirs(data_dir, exist_ok=True)

    # Limpar dados antes do teste
    with open(business_days_file, "w") as f:
        json.dump([], f)

    yield

    # Limpar dados após o teste
    with open(business_days_file, "w") as f:
        json.dump([], f)


# Fixture para criar um dia de operação aberto para testes
@pytest.fixture
async def open_business_day(clean_test_data):
    """Cria um dia de operação aberto para testes."""
    service = get_business_day_service()
    today = date.today().isoformat()

    business_day = BusinessDay(
        id="test-day-id",
        date=today,
        status=DayStatus.OPEN,
        opened_by="gerente_id",
        closed_by=None,
        opened_at=datetime.now().isoformat(),
        closed_at=None,
        total_sales=0.0,
        total_orders=0,
        notes="Dia de teste",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
    )

    # Salvar diretamente no arquivo de dados
    business_days = []
    business_days.append(business_day.dict())

    with open(
        os.path.join("/home/ubuntu/pos-modern/data", "business_days.json"), "w"
    ) as f:
        json.dump(business_days, f)

    return business_day


# Testes para abertura de dia
def test_open_business_day_success(clean_test_data):
    """Testa a abertura de um dia de operação com sucesso."""
    token = get_auth_token(client)
    today = date.today().isoformat()

    response = client.post(
        "/api/v1/business-day",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "date": today,
            "opened_by": "gerente_id",
            "notes": "Dia normal de operação",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["date"] == today
    assert data["status"] == "open"
    assert data["opened_by"] == "gerente_id"
    assert data["closed_by"] is None
    assert data["closed_at"] is None


def test_open_business_day_past_date(clean_test_data):
    """Testa a abertura de um dia de operação com data passada."""
    token = get_auth_token(client)
    past_date = (date.today() - timedelta(days=1)).isoformat()

    response = client.post(
        "/api/v1/business-day",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "date": past_date,
            "opened_by": "gerente_id",
            "notes": "Dia com data passada",
        },
    )

    assert response.status_code == 400
    assert "data passada" in response.json()["detail"].lower()


def test_open_business_day_already_open(clean_test_data):
    """Testa a abertura de um dia quando já existe outro aberto."""
    token = get_auth_token(client)
    today = date.today().isoformat()

    # Abrir o primeiro dia
    response = client.post(
        "/api/v1/business-day",
        headers={"Authorization": f"Bearer {token}"},
        json={"date": today, "opened_by": "gerente_id", "notes": "Primeiro dia"},
    )
    assert response.status_code == 201

    # Tentar abrir outro dia
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    response = client.post(
        "/api/v1/business-day",
        headers={"Authorization": f"Bearer {token}"},
        json={"date": tomorrow, "opened_by": "gerente_id", "notes": "Segundo dia"},
    )

    assert response.status_code == 400
    assert "já existe um dia aberto" in response.json()["detail"].lower()


def test_open_business_day_unauthorized():
    """Testa a abertura de um dia sem autenticação."""
    today = date.today().isoformat()

    response = client.post(
        "/api/v1/business-day",
        json={
            "date": today,
            "opened_by": "gerente_id",
            "notes": "Dia sem autenticação",
        },
    )

    assert response.status_code == 401


# Testes para fechamento de dia
@pytest.mark.asyncio
async def test_close_business_day_success(open_business_day):
    """Testa o fechamento de um dia de operação com sucesso."""
    token = get_auth_token(client)

    # Mock para simular que não há caixas abertos
    with patch(
        "src.business_day.services.business_day_service.BusinessDayService.get_open_cashiers",
        new_callable=AsyncMock,
    ) as mock_get_open_cashiers:
        mock_get_open_cashiers.return_value = []

        response = client.put(
            f"/api/v1/business-day/{open_business_day.id}/close",
            headers={"Authorization": f"Bearer {token}"},
            json={"closed_by": "gerente_id", "notes": "Fechamento normal"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == open_business_day.id
        assert data["status"] == "closed"
        assert data["closed_by"] == "gerente_id"
        assert data["closed_at"] is not None


@pytest.mark.asyncio
async def test_close_business_day_with_open_cashiers(open_business_day):
    """Testa o fechamento de um dia com caixas abertos."""
    token = get_auth_token(client)

    # Mock para simular caixas abertos
    with patch(
        "src.business_day.services.business_day_service.BusinessDayService.get_open_cashiers",
        new_callable=AsyncMock,
    ) as mock_get_open_cashiers:
        mock_get_open_cashiers.return_value = [
            {"id": "cashier1", "terminal_id": "term1"}
        ]

        response = client.put(
            f"/api/v1/business-day/{open_business_day.id}/close",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "closed_by": "gerente_id",
                "notes": "Tentativa de fechamento com caixas abertos",
            },
        )

        assert response.status_code == 400
        assert "caixas abertos" in response.json()["detail"].lower()


def test_close_business_day_not_found(clean_test_data):
    """Testa o fechamento de um dia que não existe."""
    token = get_auth_token(client)

    response = client.put(
        "/api/v1/business-day/non-existent-id/close",
        headers={"Authorization": f"Bearer {token}"},
        json={"closed_by": "gerente_id", "notes": "Fechamento de dia inexistente"},
    )

    assert response.status_code == 404


# Testes para consulta de dias
@pytest.mark.asyncio
async def test_get_current_business_day(open_business_day):
    """Testa a obtenção do dia de operação atual."""
    token = get_auth_token(client)

    response = client.get(
        "/api/v1/business-day/current", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == open_business_day.id
    assert data["status"] == "open"


def test_get_current_business_day_none(clean_test_data):
    """Testa a obtenção do dia atual quando não há dia aberto."""
    token = get_auth_token(client)

    response = client.get(
        "/api/v1/business-day/current", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 404
    assert "não há um dia" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_business_day_by_id(open_business_day):
    """Testa a obtenção de um dia específico pelo ID."""
    token = get_auth_token(client)

    response = client.get(
        f"/api/v1/business-day/{open_business_day.id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == open_business_day.id


def test_get_business_day_by_id_not_found(clean_test_data):
    """Testa a obtenção de um dia que não existe."""
    token = get_auth_token(client)

    response = client.get(
        "/api/v1/business-day/non-existent-id",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_business_days(open_business_day):
    """Testa a listagem de dias de operação."""
    token = get_auth_token(client)

    response = client.get(
        "/api/v1/business-day", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == open_business_day.id


@pytest.mark.asyncio
async def test_list_business_days_with_filters(open_business_day):
    """Testa a listagem de dias com filtros."""
    token = get_auth_token(client)

    # Filtrar por status
    response = client.get(
        "/api/v1/business-day?status=open", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1

    # Filtrar por data
    today = date.today().isoformat()
    response = client.get(
        f"/api/v1/business-day?start_date={today}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


# Testes para relatórios
@pytest.mark.asyncio
async def test_get_business_day_report(open_business_day):
    """Testa a geração de relatório para um dia de operação."""
    token = get_auth_token(client)

    response = client.get(
        f"/api/v1/business-day/{open_business_day.id}/report",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["business_day_id"] == open_business_day.id
    assert "sales_by_payment_method" in data
    assert "sales_by_hour" in data
    assert "top_selling_products" in data
    assert "average_ticket" in data


def test_get_business_day_report_not_found(clean_test_data):
    """Testa a geração de relatório para um dia que não existe."""
    token = get_auth_token(client)

    response = client.get(
        "/api/v1/business-day/non-existent-id/report",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404


# Testes para atualização de dia
@pytest.mark.asyncio
async def test_update_business_day(open_business_day):
    """Testa a atualização de um dia de operação."""
    token = get_auth_token(client)

    response = client.put(
        f"/api/v1/business-day/{open_business_day.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"notes": "Notas atualizadas"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == open_business_day.id
    assert data["notes"] == "Notas atualizadas"


def test_update_business_day_not_found(clean_test_data):
    """Testa a atualização de um dia que não existe."""
    token = get_auth_token(client)

    response = client.put(
        "/api/v1/business-day/non-existent-id",
        headers={"Authorization": f"Bearer {token}"},
        json={"notes": "Notas para dia inexistente"},
    )

    assert response.status_code == 404
