import unittest
from unittest.mock import MagicMock, patch
import asyncio
import json
from datetime import datetime

from ..router.terminal_router import router
from ..models.terminal_models import (
    TerminalConfig,
    TerminalSession,
    OfflineOrder,
    TerminalType,
    TerminalStatus,
    TerminalCapabilities,
)
from ..services.terminal_service import TerminalService
from fastapi.testclient import TestClient
from fastapi import FastAPI

app = FastAPI()
app.include_router(router)
client = TestClient(app)


class TestTerminalRouter(unittest.TestCase):
    def setUp(self):
        # Mock do serviço de terminal
        self.terminal_service_mock = MagicMock(spec=TerminalService)

        # Configuração de teste
        self.test_config = TerminalConfig(
            id="test-terminal-1",
            name="Terminal de Teste",
            type=TerminalType.CIELO_LIO_V3,
            capabilities=TerminalCapabilities(
                screen_size="5.0",
                resolution="720x1280",
                touch_screen=True,
                printer=True,
                nfc=True,
                camera=False,
                barcode_scanner=True,
                wifi=True,
                mobile_data=True,
                bluetooth=False,
                battery_powered=True,
                memory="2GB",
                storage="16GB",
            ),
            api_key="test-api-key",
            api_secret="test-api-secret",
            merchant_id="test-merchant",
            terminal_id="test-terminal-id",
            restaurant_id="test-restaurant",
            store_id="test-store",
        )

        # Sessão de teste
        self.test_session = TerminalSession(
            id="test-session-1",
            terminal_id="test-terminal-1",
            waiter_id="test-waiter-1",
            status=TerminalStatus.ONLINE,
            started_at=datetime.now(),
            last_activity=datetime.now(),
            last_sync=datetime.now(),
            pending_orders=[],
            battery_level=80,
            signal_strength=90,
            metadata={},
        )

        # Pedido offline de teste
        self.test_order = OfflineOrder(
            id="test-order-1",
            terminal_id="test-terminal-1",
            waiter_id="test-waiter-1",
            table_id="test-table-1",
            items=[
                {"product_id": "prod-1", "name": "Água", "price": 5.00, "quantity": 2},
                {
                    "product_id": "prod-2",
                    "name": "Refrigerante",
                    "price": 7.00,
                    "quantity": 1,
                },
            ],
            total=17.00,
            created_at=datetime.now(),
            synced=False,
            synced_at=None,
            server_order_id=None,
            metadata={},
        )

    @patch("src.waiter.router.terminal_router.TerminalService")
    def test_get_terminal_configs(self, mock_service_class):
        # Configurar o mock
        mock_service = mock_service_class.return_value
        mock_service.get_terminal_configs.return_value = asyncio.Future()
        mock_service.get_terminal_configs.return_value.set_result([self.test_config])

        # Fazer a requisição
        response = client.get(
            "/api/waiter/terminal/configs?restaurant_id=test-restaurant&store_id=test-store"
        )

        # Verificar a resposta
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["id"], self.test_config.id)

        # Verificar se o serviço foi chamado corretamente
        mock_service.get_terminal_configs.assert_called_once_with(
            "test-restaurant", "test-store"
        )

    @patch("src.waiter.router.terminal_router.TerminalService")
    def test_get_terminal_config(self, mock_service_class):
        # Configurar o mock
        mock_service = mock_service_class.return_value
        mock_service.get_terminal_config.return_value = asyncio.Future()
        mock_service.get_terminal_config.return_value.set_result(self.test_config)

        # Fazer a requisição
        response = client.get(f"/api/waiter/terminal/configs/{self.test_config.id}")

        # Verificar a resposta
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.test_config.id)
        self.assertEqual(response.json()["name"], self.test_config.name)

        # Verificar se o serviço foi chamado corretamente
        mock_service.get_terminal_config.assert_called_once_with(self.test_config.id)

    @patch("src.waiter.router.terminal_router.TerminalService")
    def test_create_terminal_config(self, mock_service_class):
        # Configurar o mock
        mock_service = mock_service_class.return_value
        mock_service.create_terminal_config.return_value = asyncio.Future()
        mock_service.create_terminal_config.return_value.set_result(self.test_config)

        # Fazer a requisição
        response = client.post(
            "/api/waiter/terminal/configs", json=json.loads(self.test_config.json())
        )

        # Verificar a resposta
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.test_config.id)

        # Verificar se o serviço foi chamado corretamente
        mock_service.create_terminal_config.assert_called_once()

    @patch("src.waiter.router.terminal_router.TerminalService")
    def test_update_terminal_config(self, mock_service_class):
        # Configurar o mock
        mock_service = mock_service_class.return_value
        mock_service.update_terminal_config.return_value = asyncio.Future()
        mock_service.update_terminal_config.return_value.set_result(self.test_config)

        # Fazer a requisição
        response = client.put(
            f"/api/waiter/terminal/configs/{self.test_config.id}",
            json=json.loads(self.test_config.json()),
        )

        # Verificar a resposta
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.test_config.id)

        # Verificar se o serviço foi chamado corretamente
        mock_service.update_terminal_config.assert_called_once()

    @patch("src.waiter.router.terminal_router.TerminalService")
    def test_delete_terminal_config(self, mock_service_class):
        # Configurar o mock
        mock_service = mock_service_class.return_value
        mock_service.delete_terminal_config.return_value = asyncio.Future()
        mock_service.delete_terminal_config.return_value.set_result(True)

        # Fazer a requisição
        response = client.delete(f"/api/waiter/terminal/configs/{self.test_config.id}")

        # Verificar a resposta
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["success"], True)

        # Verificar se o serviço foi chamado corretamente
        mock_service.delete_terminal_config.assert_called_once_with(self.test_config.id)

    @patch("src.waiter.router.terminal_router.TerminalService")
    def test_create_terminal_session(self, mock_service_class):
        # Configurar o mock
        mock_service = mock_service_class.return_value
        mock_service.create_terminal_session.return_value = asyncio.Future()
        mock_service.create_terminal_session.return_value.set_result(self.test_session)

        # Fazer a requisição
        response = client.post(
            "/api/waiter/terminal/sessions?terminal_id=test-terminal-1&waiter_id=test-waiter-1"
        )

        # Verificar a resposta
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.test_session.id)
        self.assertEqual(response.json()["terminal_id"], self.test_session.terminal_id)
        self.assertEqual(response.json()["waiter_id"], self.test_session.waiter_id)

        # Verificar se o serviço foi chamado corretamente
        mock_service.create_terminal_session.assert_called_once_with(
            "test-terminal-1", "test-waiter-1"
        )

    @patch("src.waiter.router.terminal_router.TerminalService")
    def test_get_terminal_session(self, mock_service_class):
        # Configurar o mock
        mock_service = mock_service_class.return_value
        mock_service.get_terminal_session.return_value = asyncio.Future()
        mock_service.get_terminal_session.return_value.set_result(self.test_session)

        # Fazer a requisição
        response = client.get(f"/api/waiter/terminal/sessions/{self.test_session.id}")

        # Verificar a resposta
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.test_session.id)

        # Verificar se o serviço foi chamado corretamente
        mock_service.get_terminal_session.assert_called_once_with(self.test_session.id)

    @patch("src.waiter.router.terminal_router.TerminalService")
    def test_update_terminal_status(self, mock_service_class):
        # Configurar o mock
        mock_service = mock_service_class.return_value
        mock_service.update_terminal_status.return_value = asyncio.Future()
        mock_service.update_terminal_status.return_value.set_result(self.test_session)

        # Fazer a requisição
        response = client.put(
            f"/api/waiter/terminal/sessions/{self.test_session.id}/status?status=busy&battery_level=75&signal_strength=80"
        )

        # Verificar a resposta
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.test_session.id)

        # Verificar se o serviço foi chamado corretamente
        mock_service.update_terminal_status.assert_called_once_with(
            self.test_session.id, TerminalStatus.BUSY, 75, 80
        )

    @patch("src.waiter.router.terminal_router.TerminalService")
    def test_create_offline_order(self, mock_service_class):
        # Configurar o mock
        mock_service = mock_service_class.return_value
        mock_service.create_offline_order.return_value = asyncio.Future()
        mock_service.create_offline_order.return_value.set_result(self.test_order)

        # Fazer a requisição
        response = client.post(
            "/api/waiter/terminal/offline/orders",
            json=json.loads(self.test_order.json()),
        )

        # Verificar a resposta
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.test_order.id)

        # Verificar se o serviço foi chamado corretamente
        mock_service.create_offline_order.assert_called_once()

    @patch("src.waiter.router.terminal_router.TerminalService")
    def test_get_offline_orders(self, mock_service_class):
        # Configurar o mock
        mock_service = mock_service_class.return_value
        mock_service.get_offline_orders.return_value = asyncio.Future()
        mock_service.get_offline_orders.return_value.set_result([self.test_order])

        # Fazer a requisição
        response = client.get(
            "/api/waiter/terminal/offline/orders?terminal_id=test-terminal-1&synced=false"
        )

        # Verificar a resposta
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["id"], self.test_order.id)

        # Verificar se o serviço foi chamado corretamente
        mock_service.get_offline_orders.assert_called_once_with(
            "test-terminal-1", False
        )

    @patch("src.waiter.router.terminal_router.TerminalService")
    def test_sync_terminal_data(self, mock_service_class):
        # Configurar o mock
        mock_service = mock_service_class.return_value
        mock_service.sync_terminal_data.return_value = asyncio.Future()
        mock_service.sync_terminal_data.return_value.set_result(
            {
                "success": True,
                "synced_at": datetime.now().isoformat(),
                "synced_orders": 1,
                "pending_orders": 0,
                "terminal_status": "online",
            }
        )

        # Fazer a requisição
        response = client.post(
            "/api/waiter/terminal/sync?terminal_id=test-terminal-1&session_id=test-session-1"
        )

        # Verificar a resposta
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["success"], True)

        # Verificar se o serviço foi chamado corretamente
        mock_service.sync_terminal_data.assert_called_once_with(
            "test-terminal-1", "test-session-1"
        )


if __name__ == "__main__":
    unittest.main()
