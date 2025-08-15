import unittest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from src.remote_orders.adapters.rappi_adapter import RappiAdapter
from src.remote_orders.models.remote_order_models import RemoteOrder, RemoteOrderStatus


class TestRappiAdapter(unittest.TestCase):
    """Testes para o adaptador Rappi."""

    def setUp(self):
        """Configuração inicial para os testes."""
        self.config = {
            "api_key": "test_api_key",
            "api_secret": "test_api_secret",
            "restaurant_id": "test_restaurant_id",
            "store_id": "test_store_id",
        }

        self.mock_session = MagicMock()
        self.mock_response = MagicMock()
        self.mock_response.status = 200
        self.mock_response.json = AsyncMock(return_value={})
        self.mock_response.text = AsyncMock(return_value="")

        self.mock_session.get = AsyncMock(return_value=self.mock_response)
        self.mock_session.post = AsyncMock(return_value=self.mock_response)
        self.mock_session.put = AsyncMock(return_value=self.mock_response)

        # Patch para o ClientSession
        self.session_patch = patch(
            "aiohttp.ClientSession", return_value=self.mock_session
        )
        self.mock_client_session = self.session_patch.start()

    def tearDown(self):
        """Limpeza após os testes."""
        self.session_patch.stop()

    async def test_convert_to_remote_order(self):
        """Testa a conversão de um pedido do formato Rappi para o formato interno."""
        # Dados de exemplo de um pedido Rappi
        rappi_order = {
            "id": "rappi_order_123",
            "orderNumber": "R12345",
            "customer": {
                "id": "customer_123",
                "name": "Cliente Teste",
                "email": "cliente@teste.com",
                "phone": "+5511999999999",
                "address": {
                    "street": "Rua Teste",
                    "number": "123",
                    "complement": "Apto 45",
                    "neighborhood": "Bairro Teste",
                    "city": "São Paulo",
                    "state": "SP",
                    "zipcode": "01234-567",
                },
            },
            "items": [
                {
                    "id": "item_1",
                    "name": "X-Burger",
                    "quantity": 1,
                    "unitPrice": 25.90,
                    "totalPrice": 25.90,
                    "notes": "Sem cebola",
                    "options": [],
                },
                {
                    "id": "item_2",
                    "name": "Batata Frita",
                    "quantity": 1,
                    "unitPrice": 12.90,
                    "totalPrice": 12.90,
                    "notes": "",
                    "options": [],
                },
            ],
            "payment": {
                "method": "credit_card",
                "status": "approved",
                "total": 38.80,
                "currency": "BRL",
                "online": True,
            },
            "delivery": {
                "type": "delivery",
                "address": {
                    "street": "Rua Teste",
                    "number": "123",
                    "complement": "Apto 45",
                    "neighborhood": "Bairro Teste",
                    "city": "São Paulo",
                    "state": "SP",
                    "zipcode": "01234-567",
                },
                "notes": "",
                "estimatedTime": 30,
            },
            "totalAmount": 38.80,
        }

        # Criar adaptador e converter pedido
        adapter = RappiAdapter(self.config)
        remote_order = await adapter.convert_to_remote_order(rappi_order)

        # Verificar se a conversão foi correta
        self.assertEqual(remote_order.external_id, "rappi_order_123")
        self.assertEqual(remote_order.source, "rappi")
        self.assertEqual(remote_order.restaurant_id, "test_restaurant_id")
        self.assertEqual(remote_order.store_id, "test_store_id")
        self.assertEqual(remote_order.order_number, "R12345")
        self.assertEqual(remote_order.status, RemoteOrderStatus.PENDING)

        # Verificar cliente
        self.assertEqual(remote_order.customer.name, "Cliente Teste")
        self.assertEqual(remote_order.customer.email, "cliente@teste.com")

        # Verificar itens
        self.assertEqual(len(remote_order.items), 2)
        self.assertEqual(remote_order.items[0].name, "X-Burger")
        self.assertEqual(remote_order.items[0].quantity, 1)
        self.assertEqual(remote_order.items[0].unit_price, 25.90)

        # Verificar pagamento
        self.assertEqual(remote_order.payment.method, "credit_card")
        self.assertEqual(remote_order.payment.total, 38.80)
        self.assertTrue(remote_order.payment.online)

        # Verificar entrega
        self.assertEqual(remote_order.delivery.type, "delivery")
        self.assertEqual(remote_order.delivery.estimated_time, 30)

    async def test_convert_status_to_rappi(self):
        """Testa a conversão de status interno para o formato da API Rappi."""
        adapter = RappiAdapter(self.config)

        # Testar conversão de diferentes status
        self.assertEqual(
            await adapter.convert_status_to_rappi(RemoteOrderStatus.PENDING), "PENDING"
        )
        self.assertEqual(
            await adapter.convert_status_to_rappi(RemoteOrderStatus.CONFIRMED),
            "CONFIRMED",
        )
        self.assertEqual(
            await adapter.convert_status_to_rappi(RemoteOrderStatus.REJECTED),
            "REJECTED",
        )
        self.assertEqual(
            await adapter.convert_status_to_rappi(RemoteOrderStatus.PREPARING),
            "PREPARING",
        )
        self.assertEqual(
            await adapter.convert_status_to_rappi(RemoteOrderStatus.READY), "READY"
        )
        self.assertEqual(
            await adapter.convert_status_to_rappi(RemoteOrderStatus.DELIVERING),
            "DELIVERING",
        )
        self.assertEqual(
            await adapter.convert_status_to_rappi(RemoteOrderStatus.DELIVERED),
            "DELIVERED",
        )
        self.assertEqual(
            await adapter.convert_status_to_rappi(RemoteOrderStatus.CANCELLED),
            "CANCELLED",
        )

    async def test_get_order(self):
        """Testa a obtenção de detalhes de um pedido da API Rappi."""
        # Configurar mock para retornar dados de pedido
        mock_order_data = {"id": "rappi_order_123", "status": "PENDING"}
        self.mock_response.json = AsyncMock(return_value=mock_order_data)

        async with RappiAdapter(self.config) as adapter:
            order_data = await adapter.get_order("rappi_order_123")

            # Verificar se a chamada foi feita corretamente
            self.mock_session.get.assert_called_once()
            self.assertEqual(order_data, mock_order_data)

    async def test_update_order_status(self):
        """Testa a atualização de status de um pedido na API Rappi."""
        # Configurar mock para retornar sucesso
        self.mock_response.status = 200

        async with RappiAdapter(self.config) as adapter:
            success = await adapter.update_order_status(
                "rappi_order_123", RemoteOrderStatus.CONFIRMED
            )

            # Verificar se a chamada foi feita corretamente
            self.mock_session.put.assert_called_once()
            self.assertTrue(success)

            # Verificar payload enviado
            call_args = self.mock_session.put.call_args
            self.assertIn("json", call_args[1])
            self.assertEqual(call_args[1]["json"]["status"], "CONFIRMED")

    async def test_reject_order(self):
        """Testa a rejeição de um pedido na API Rappi."""
        # Configurar mock para retornar sucesso
        self.mock_response.status = 200

        async with RappiAdapter(self.config) as adapter:
            success = await adapter.reject_order(
                "rappi_order_123", "Restaurante fechado"
            )

            # Verificar se a chamada foi feita corretamente
            self.mock_session.post.assert_called_once()
            self.assertTrue(success)

            # Verificar payload enviado
            call_args = self.mock_session.post.call_args
            self.assertIn("json", call_args[1])
            self.assertEqual(call_args[1]["json"]["reason"], "Restaurante fechado")

    async def test_process_webhook_order_created(self):
        """Testa o processamento de webhook de criação de pedido."""
        # Dados de exemplo de webhook
        webhook_data = {
            "eventType": "ORDER_CREATED",
            "order": {
                "id": "rappi_order_123",
                "orderNumber": "R12345",
                "customer": {"name": "Cliente Teste"},
                "items": [{"id": "item_1", "name": "X-Burger", "quantity": 1}],
            },
        }

        adapter = RappiAdapter(self.config)

        # Patch para o método convert_to_remote_order
        mock_order = RemoteOrder(
            id="rappi_order_123",
            external_id="rappi_order_123",
            source="rappi",
            restaurant_id="test_restaurant_id",
            store_id="test_store_id",
            order_number="R12345",
            status=RemoteOrderStatus.PENDING,
            customer={},
            items=[],
            payment={},
            delivery={},
            total_amount=0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            raw_data={},
        )

        with patch.object(
            adapter, "convert_to_remote_order", return_value=mock_order
        ) as mock_convert:
            result = await adapter.process_webhook(webhook_data)

            # Verificar se a conversão foi chamada
            mock_convert.assert_called_once_with(webhook_data["order"])

            # Verificar resultado
            self.assertEqual(result, mock_order)

    async def test_process_webhook_unknown_event(self):
        """Testa o processamento de webhook com tipo de evento desconhecido."""
        # Dados de exemplo de webhook
        webhook_data = {"eventType": "UNKNOWN_EVENT", "data": {}}

        adapter = RappiAdapter(self.config)
        result = await adapter.process_webhook(webhook_data)

        # Verificar que retorna None para eventos desconhecidos
        self.assertIsNone(result)

    async def test_validate_webhook_signature(self):
        """Testa a validação de assinatura de webhook."""
        adapter = RappiAdapter(self.config)

        # Criar uma assinatura válida
        import hashlib
        import hmac

        payload = '{"eventType":"ORDER_CREATED"}'
        expected_signature = hmac.new(
            self.config["api_secret"].encode(), payload.encode(), hashlib.sha256
        ).hexdigest()

        # Testar assinatura válida
        is_valid = await adapter.validate_webhook_signature(expected_signature, payload)
        self.assertTrue(is_valid)

        # Testar assinatura inválida
        is_valid = await adapter.validate_webhook_signature(
            "invalid_signature", payload
        )
        self.assertFalse(is_valid)

    async def test_request_refund(self):
        """Testa a solicitação de reembolso para um pedido."""
        # Configurar mock para retornar sucesso
        self.mock_response.status = 200

        async with RappiAdapter(self.config) as adapter:
            # Testar reembolso total
            success = await adapter.request_refund(
                "rappi_order_123", "Pedido cancelado pelo cliente"
            )

            # Verificar se a chamada foi feita corretamente
            self.mock_session.post.assert_called_once()
            self.assertTrue(success)

            # Verificar payload enviado
            call_args = self.mock_session.post.call_args
            self.assertIn("json", call_args[1])
            self.assertEqual(
                call_args[1]["json"]["reason"], "Pedido cancelado pelo cliente"
            )
            self.assertNotIn("amount", call_args[1]["json"])

            # Resetar mock
            self.mock_session.post.reset_mock()

            # Testar reembolso parcial
            success = await adapter.request_refund(
                "rappi_order_123", "Item faltando", 12.90
            )

            # Verificar se a chamada foi feita corretamente
            self.mock_session.post.assert_called_once()
            self.assertTrue(success)

            # Verificar payload enviado
            call_args = self.mock_session.post.call_args
            self.assertIn("json", call_args[1])
            self.assertEqual(call_args[1]["json"]["reason"], "Item faltando")
            self.assertEqual(call_args[1]["json"]["amount"], 12.90)


if __name__ == "__main__":
    unittest.main()
