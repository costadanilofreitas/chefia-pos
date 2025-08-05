import unittest
import uuid
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock

from src.remote_orders.models.remote_order_models import (
    RemoteOrder,
    RemoteOrderStatus,
    RemotePlatform,
)
from src.remote_orders.services.remote_order_service import RemoteOrderService


class TestRemoteOrderService(unittest.TestCase):
    """Testes para o serviço de pedidos remotos."""

    def setUp(self):
        """Configuração inicial para os testes."""
        # Mock do barramento de eventos
        self.event_bus_mock = MagicMock()
        self.event_bus_mock.publish = AsyncMock()

        # Mock do adaptador iFood
        self.ifood_adapter_mock = MagicMock()
        self.ifood_adapter_mock.convert_to_remote_order = AsyncMock()
        self.ifood_adapter_mock.update_order_status = AsyncMock(return_value=True)

        # Patch para o barramento de eventos e adaptadores
        with patch(
            "src.remote_orders.services.remote_order_service.get_event_bus",
            return_value=self.event_bus_mock,
        ):
            self.service = RemoteOrderService()
            self.service._adapters = {RemotePlatform.IFOOD: self.ifood_adapter_mock}

            # Mock para funções de carregamento/salvamento de dados
            self.service._load_remote_orders = MagicMock(return_value=[])
            self.service._save_remote_orders = MagicMock()
            self.service._load_platform_configs = MagicMock(
                return_value=[
                    {
                        "platform": "ifood",
                        "enabled": True,
                        "api_key": "test_key",
                        "api_secret": "test_secret",
                        "webhook_url": "https://example.com/webhook/ifood",
                        "auto_accept": False,
                    }
                ]
            )
            self.service._save_platform_configs = MagicMock()

        # Dados de exemplo
        self.sample_remote_order = RemoteOrder(
            id=str(uuid.uuid4()),
            platform=RemotePlatform.IFOOD,
            external_order_id="abc123",
            status=RemoteOrderStatus.PENDING,
            items=[],
            customer={"name": "Test Customer", "phone": "123456789"},
            payment={
                "method": "CREDIT",
                "status": "PAID",
                "total": 50.0,
                "prepaid": True,
            },
            subtotal=45.0,
            delivery_fee=5.0,
            total=50.0,
            raw_data={},
        )

        # Configurar o mock do adaptador para retornar o pedido de exemplo
        self.ifood_adapter_mock.convert_to_remote_order.return_value = (
            self.sample_remote_order
        )

    def test_process_remote_order(self):
        """Testa o processamento de um pedido remoto."""

        # Definir a função assíncrona de teste
        async def async_test():
            # Configurar o mock para retornar o pedido de exemplo
            self.ifood_adapter_mock.convert_to_remote_order.return_value = (
                self.sample_remote_order
            )

            # Executar a função
            result = await self.service.process_remote_order(
                RemotePlatform.IFOOD, {"id": "abc123", "items": []}
            )

            # Verificar se o processamento foi bem-sucedido
            self.assertEqual(result.platform, RemotePlatform.IFOOD)
            self.assertEqual(result.external_order_id, "abc123")
            self.assertEqual(result.status, RemoteOrderStatus.PENDING)

            # Verificar se o adaptador foi chamado corretamente
            self.ifood_adapter_mock.convert_to_remote_order.assert_called_once()

            # Verificar se o evento foi publicado
            self.event_bus_mock.publish.assert_called_once()

            # Verificar se os dados foram salvos
            self.service._save_remote_orders.assert_called_once()

        # Executar o teste assíncrono
        asyncio.run(async_test())

    def test_accept_remote_order(self):
        """Testa a aceitação de um pedido remoto."""

        # Definir a função assíncrona de teste
        async def async_test():
            # Mock para o serviço de pedidos
            order_service_mock = MagicMock()
            order_service_mock.create_order = AsyncMock(
                return_value=MagicMock(id="internal123")
            )

            # Patch para o serviço de pedidos
            with patch(
                "src.remote_orders.services.remote_order_service.order_service",
                order_service_mock,
            ):
                # Configurar o mock para retornar o pedido de exemplo ao buscar
                self.service.get_remote_order = AsyncMock(
                    return_value=self.sample_remote_order
                )
                self.service.update_remote_order = AsyncMock(
                    return_value=self.sample_remote_order
                )

                # Executar a função
                result = await self.service.accept_remote_order(
                    self.sample_remote_order.id
                )

                # Verificar se a aceitação foi bem-sucedida
                self.assertEqual(result.platform, RemotePlatform.IFOOD)
                self.assertEqual(result.external_order_id, "abc123")

                # Verificar se o serviço de pedidos foi chamado
                order_service_mock.create_order.assert_called_once()

                # Verificar se o pedido remoto foi atualizado
                self.service.update_remote_order.assert_called_once()

                # Verificar se o evento foi publicado
                self.event_bus_mock.publish.assert_called()

        # Executar o teste assíncrono
        asyncio.run(async_test())

    def test_reject_remote_order(self):
        """Testa a rejeição de um pedido remoto."""

        # Definir a função assíncrona de teste
        async def async_test():
            # Configurar o mock para retornar o pedido de exemplo ao buscar
            self.service.get_remote_order = AsyncMock(
                return_value=self.sample_remote_order
            )
            self.service.update_remote_order = AsyncMock(
                return_value=self.sample_remote_order
            )

            # Executar a função
            result = await self.service.reject_remote_order(
                self.sample_remote_order.id, "Fora do horário de funcionamento"
            )

            # Verificar se a rejeição foi bem-sucedida
            self.assertEqual(result.platform, RemotePlatform.IFOOD)
            self.assertEqual(result.external_order_id, "abc123")

            # Verificar se o pedido remoto foi atualizado
            self.service.update_remote_order.assert_called_once()

            # Verificar se o evento foi publicado
            self.event_bus_mock.publish.assert_called()

        # Executar o teste assíncrono
        asyncio.run(async_test())

    def test_handle_order_status_change(self):
        """Testa o tratamento de mudança de status em pedidos internos."""

        # Definir a função assíncrona de teste
        async def async_test():
            # Configurar dados de exemplo para pedidos remotos
            remote_orders = [
                {
                    "id": "remote123",
                    "platform": "ifood",
                    "external_order_id": "abc123",
                    "internal_order_id": "internal123",
                    "status": "accepted",
                    "items": [],
                    "customer": {"name": "Test Customer"},
                    "payment": {"method": "CREDIT", "status": "PAID", "total": 50.0},
                    "subtotal": 45.0,
                    "total": 50.0,
                    "raw_data": {},
                }
            ]

            # Configurar o mock para carregar os pedidos remotos
            self.service._load_remote_orders = MagicMock(return_value=remote_orders)
            self.service.update_remote_order = AsyncMock()

            # Executar a função
            await self.service.handle_order_status_change("internal123", "DELIVERED")

            # Verificar se o pedido remoto foi atualizado
            self.service.update_remote_order.assert_called_once()

        # Executar o teste assíncrono
        asyncio.run(async_test())


if __name__ == "__main__":
    unittest.main()
