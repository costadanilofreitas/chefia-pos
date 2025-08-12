from fastapi.testclient import TestClient
from jose import jwt

from src.api.main import app
from src.auth.security import SECRET_KEY, ALGORITHM

client = TestClient(app)


def test_root():
    """Testa se a rota raiz está funcionando."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "POS Moderno API está funcionando!"}


def test_login_success():
    """Testa login com credenciais válidas."""
    response = client.post(
        "/api/v1/auth/token",
        data={"username": "gerente", "password": "senha123"},
    )
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    assert "expires_in" in token_data

    # Verifica se o token é válido
    payload = jwt.decode(token_data["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "gerente"
    assert payload["role"] == "gerente"
    assert "all" in payload["permissions"]


def test_login_invalid_credentials():
    """Testa login com credenciais inválidas."""
    response = client.post(
        "/api/v1/auth/token",
        data={"username": "gerente", "password": "senha_errada"},
    )
    assert response.status_code == 401
    assert "detail" in response.json()


def test_me_endpoint():
    """Testa o endpoint /me com autenticação válida."""
    # Primeiro faz login para obter o token
    login_response = client.post(
        "/api/v1/auth/token",
        data={"username": "gerente", "password": "senha123"},
    )
    token = login_response.json()["access_token"]

    # Usa o token para acessar o endpoint /me
    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["username"] == "gerente"
    assert user_data["role"] == "gerente"
    assert "all" in user_data["permissions"]


def test_me_endpoint_no_token():
    """Testa o endpoint /me sem token de autenticação."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_protected_route():
    """Testa uma rota protegida com autenticação válida."""
    # Primeiro faz login para obter o token
    login_response = client.post(
        "/api/v1/auth/token",
        data={"username": "gerente", "password": "senha123"},
    )
    token = login_response.json()["access_token"]

    # Usa o token para acessar a rota protegida
    response = client.get(
        "/api/v1/protected", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Esta é uma rota protegida"
    assert data["user"] == "gerente"
    assert data["role"] == "gerente"


def test_protected_route_no_token():
    """Testa uma rota protegida sem token de autenticação."""
    response = client.get("/api/v1/protected")
    assert response.status_code == 401


def test_verify_permission():
    """Testa a verificação de permissão para um usuário com a permissão."""
    # Login como gerente (tem todas as permissões)
    login_response = client.post(
        "/api/v1/auth/token",
        data={"username": "gerente", "password": "senha123"},
    )
    token = login_response.json()["access_token"]

    # Verifica uma permissão específica
    response = client.get(
        "/api/v1/auth/verify-permission/venda:criar",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["has_permission"] == True


def test_verify_permission_unauthorized():
    """Testa a verificação de permissão para um usuário sem a permissão."""
    # Login como cozinheiro (não tem permissão de venda)
    login_response = client.post(
        "/api/v1/auth/token",
        data={"username": "cozinheiro", "password": "senha123"},
    )
    token = login_response.json()["access_token"]

    # Verifica uma permissão que o cozinheiro não tem
    response = client.get(
        "/api/v1/auth/verify-permission/venda:criar",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_verify_role():
    """Testa a verificação de papel para um usuário com o papel."""
    # Login como caixa
    login_response = client.post(
        "/api/v1/auth/token",
        data={"username": "caixa", "password": "senha123"},
    )
    token = login_response.json()["access_token"]

    # Verifica o papel de caixa
    response = client.get(
        "/api/v1/auth/verify-role/caixa", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["has_role"] == True


def test_verify_role_unauthorized():
    """Testa a verificação de papel para um usuário sem o papel."""
    # Login como caixa
    login_response = client.post(
        "/api/v1/auth/token",
        data={"username": "caixa", "password": "senha123"},
    )
    token = login_response.json()["access_token"]

    # Verifica o papel de gerente (que o caixa não tem)
    response = client.get(
        "/api/v1/auth/verify-role/gerente", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403


def test_protected_by_permission():
    """Testa acesso a endpoint protegido por permissão específica."""
    # Login como gerente (tem todas as permissões)
    login_response = client.post(
        "/api/v1/auth/token",
        data={"username": "gerente", "password": "senha123"},
    )
    token = login_response.json()["access_token"]

    # Acessa endpoint protegido por permissão
    response = client.get(
        "/api/v1/auth/protected-by-permission",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200


def test_protected_by_permission_unauthorized():
    """Testa acesso negado a endpoint protegido por permissão específica."""
    # Login como cozinheiro (não tem permissão de relatório)
    login_response = client.post(
        "/api/v1/auth/token",
        data={"username": "cozinheiro", "password": "senha123"},
    )
    token = login_response.json()["access_token"]

    # Tenta acessar endpoint protegido por permissão que não possui
    response = client.get(
        "/api/v1/auth/protected-by-permission",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_protected_by_role():
    """Testa acesso a endpoint protegido por papel específico."""
    # Login como gerente
    login_response = client.post(
        "/api/v1/auth/token",
        data={"username": "gerente", "password": "senha123"},
    )
    token = login_response.json()["access_token"]

    # Acessa endpoint protegido por papel de gerente
    response = client.get(
        "/api/v1/auth/protected-by-role", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200


def test_protected_by_role_unauthorized():
    """Testa acesso negado a endpoint protegido por papel específico."""
    # Login como caixa (não é gerente)
    login_response = client.post(
        "/api/v1/auth/token",
        data={"username": "caixa", "password": "senha123"},
    )
    token = login_response.json()["access_token"]

    # Tenta acessar endpoint protegido por papel que não possui
    response = client.get(
        "/api/v1/auth/protected-by-role", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
