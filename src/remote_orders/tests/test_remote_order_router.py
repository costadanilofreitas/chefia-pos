import unittest
import uuid
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from src.remote_orders.models.remote_order_models import (
    RemoteOrder,
    RemotePlatformConfig,
)
from src.remote_orders.router.remote_order_router import router as remote_order_router
from src.auth.security import get_current_user


class TestRemoteOrderRouter(unittest.TestCase):
    """Testes para os endpoints da API de pedidos remotos."""

    def setUp(self):
        """Configuração inicial para os testes."""
        # Criar uma aplicação FastAPI para testes
        self.app = FastAPI()
        self.app.include_router(remote_order_router)

        # Mock para autenticação
        async def mock_get_current_user():
            return MagicMock(
                id="user123",
                username="testuser",
                permissions=[
                    "remote_orders.read",
                    "remote_orders.update",
                    "remote_platforms.read",
                    "remote_platforms.update",
                ],
            )

        self.app.dependency_overrides[get_current_user] = mock_get_current_user

        # Cliente de teste
        self.client = TestClient(self.app)

        # Mock para o serviço de pedidos remotos
        self.remote_order_service_mock = MagicMock()

        # Dados de exemplo
        self.sample_remote_order = {
            "id": str(uuid.uuid4()),
            "platform": "ifood",
            "external_order_id": "abc123",
            "status": "pending",
            "items": [],
            "customer": {"name": "Test Customer", "phone": "123456789"},
            "payment": {
                "method": "CREDIT",
                "status": "PAID",
                "total": 50.0,
                "prepaid": True,
            },
            "subtotal": 45.0,
            "delivery_fee": 5.0,
            "total": 50.0,
            "raw_data": {},
        }

        self.sample_platform_config = {
            "platform": "ifood",
            "enabled": True,
            "api_key": "test_key",
            "api_secret": "test_secret",
            "webhook_url": "https://example.com/webhook/ifood",
            "auto_accept": False,
        }

    @patch("src.remote_orders.router.remote_order_router.remote_order_service")
    def test_receive_webhook(self, mock_service):
        """Testa o endpoint de recebimento de webhook."""
        # Configurar o mock do serviço como AsyncMock
        mock_service.process_remote_order = AsyncMock(
            return_value=RemoteOrder(**self.sample_remote_order)
        )

        # Dados de exemplo para o webhook
        webhook_data = {
            "id": "abc123",
            "items": [
                {
                    "id": "item1",
                    "name": "X-Burger",
                    "quantity": 2,
                    "unitPrice": 15.90,
                    "totalPrice": 31.80,
                }
            ],
            "customer": {"name": "João Silva", "phone": "11999999999"},
            "totalPrice": 31.80,
        }

        # Fazer a requisição
        response = self.client.post(
            "/api/v1/remote-orders/webhook/ifood",
            json=webhook_data,
            headers={"X-Signature": "test_signature"},
        )

        # Verificar se a resposta foi bem-sucedida
        self.assertEqual(response.status_code, 200)

        # Verificar o conteúdo da resposta
        response_data = response.json()
        self.assertTrue(response_data["success"])
        self.assertIn("Pedido", response_data["message"])

        # Verificar se o serviço foi chamado corretamente
        mock_service.process_remote_order.assert_called_once()

    @patch("src.remote_orders.router.remote_order_router.remote_order_service")
    def test_list_remote_orders(self, mock_service):
        """Testa o endpoint de listagem de pedidos remotos."""
        # Configurar o mock do serviço como AsyncMock
        mock_service.list_remote_orders = AsyncMock(
            return_value=[RemoteOrder(**self.sample_remote_order)]
        )

        # Fazer a requisição
        response = self.client.get("/api/v1/remote-orders/")

        # Verificar se a resposta foi bem-sucedida
        self.assertEqual(response.status_code, 200)

        # Verificar o conteúdo da resposta
        response_data = response.json()
        self.assertEqual(len(response_data), 1)
        self.assertEqual(response_data[0]["external_order_id"], "abc123")

        # Verificar se o serviço foi chamado corretamente
        mock_service.list_remote_orders.assert_called_once()

    @patch("src.remote_orders.router.remote_order_router.remote_order_service")
    def test_get_remote_order(self, mock_service):
        """Testa o endpoint de busca de pedido remoto por ID."""
        # Configurar o mock do serviço como AsyncMock
        mock_service.get_remote_order = AsyncMock(
            return_value=RemoteOrder(**self.sample_remote_order)
        )

        # Fazer a requisição
        response = self.client.get(
            f"/api/v1/remote-orders/{self.sample_remote_order['id']}"
        )

        # Verificar se a resposta foi bem-sucedida
        self.assertEqual(response.status_code, 200)

        # Verificar o conteúdo da resposta
        response_data = response.json()
        self.assertEqual(response_data["external_order_id"], "abc123")

        # Verificar se o serviço foi chamado corretamente
        mock_service.get_remote_order.assert_called_once_with(
            self.sample_remote_order["id"]
        )

    @patch("src.remote_orders.router.remote_order_router.remote_order_service")
    def test_accept_remote_order(self, mock_service):
        """Testa o endpoint de aceitação de pedido remoto."""
        # Configurar o mock do serviço como AsyncMock
        mock_service.accept_remote_order = AsyncMock(
            return_value=RemoteOrder(**self.sample_remote_order)
        )

        # Fazer a requisição
        response = self.client.post(
            f"/api/v1/remote-orders/{self.sample_remote_order['id']}/accept"
        )

        # Verificar se a resposta foi bem-sucedida
        self.assertEqual(response.status_code, 200)

        # Verificar o conteúdo da resposta
        response_data = response.json()
        self.assertEqual(response_data["external_order_id"], "abc123")

        # Verificar se o serviço foi chamado corretamente
        mock_service.accept_remote_order.assert_called_once_with(
            self.sample_remote_order["id"]
        )

    @patch("src.remote_orders.router.remote_order_router.remote_order_service")
    def test_reject_remote_order(self, mock_service):
        """Testa o endpoint de rejeição de pedido remoto."""
        # Configurar o mock do serviço como AsyncMock
        mock_service.reject_remote_order = AsyncMock(
            return_value=RemoteOrder(**self.sample_remote_order)
        )

        # Fazer a requisição
        response = self.client.post(
            f"/api/v1/remote-orders/{self.sample_remote_order['id']}/reject",
            json={"reason": "Fora do horário de funcionamento"},
        )

        # Verificar se a resposta foi bem-sucedida
        self.assertEqual(response.status_code, 200)

        # Verificar o conteúdo da resposta
        response_data = response.json()
        self.assertEqual(response_data["external_order_id"], "abc123")

        # Verificar se o serviço foi chamado corretamente
        mock_service.reject_remote_order.assert_called_once()

    @patch("src.remote_orders.router.remote_order_router.remote_order_service")
    def test_list_platform_configs(self, mock_service):
        """Testa o endpoint de listagem de configurações de plataformas."""
        # Configurar o mock do serviço como AsyncMock
        mock_service.list_platform_configs = AsyncMock(
            return_value=[RemotePlatformConfig(**self.sample_platform_config)]
        )

        # Fazer a requisição
        response = self.client.get("/api/v1/remote-platforms/")

        # Verificar se a resposta foi bem-sucedida
        self.assertEqual(response.status_code, 200)

        # Verificar o conteúdo da resposta
        response_data = response.json()
        self.assertEqual(len(response_data), 1)
        self.assertEqual(response_data[0]["platform"], "ifood")

        # Verificar se o serviço foi chamado corretamente
        mock_service.list_platform_configs.assert_called_once()


if __name__ == "__main__":
    unittest.main()
