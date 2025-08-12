import unittest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime

from src.remote_orders.services.rappi_order_service import RappiOrderService
from src.remote_orders.models.remote_order_models import RemoteOrderStatus, RemoteOrder
from src.core.events.event_bus import Event


class TestRappiOrderService(unittest.TestCase):
    """Testes para o serviço de pedidos Rappi."""

    def setUp(self):
        """Configuração inicial para os testes."""
        self.event_bus = MagicMock()
        self.event_bus.publish = AsyncMock()
        self.event_bus.subscribe = MagicMock()

        self.payment_service = MagicMock()
        self.payment_service.register_refund = AsyncMock()

        self.service = RappiOrderService(self.event_bus, self.payment_service)

        # Mock para o adaptador Rappi
        self.mock_adapter = MagicMock()
        self.mock_adapter.__aenter__ = AsyncMock(return_value=self.mock_adapter)
        self.mock_adapter.__aexit__ = AsyncMock(return_value=None)
        self.mock_adapter.process_webhook = AsyncMock()
        self.mock_adapter.validate_webhook_signature = AsyncMock(return_value=True)
        self.mock_adapter.update_order_status = AsyncMock(return_value=True)
        self.mock_adapter.reject_order = AsyncMock(return_value=True)
        self.mock_adapter.request_refund = AsyncMock(return_value=True)
        self.mock_adapter.notify_customer = AsyncMock(return_value=True)

        # Patch para o RappiAdapter
        self.adapter_patch = patch(
            "src.remote_orders.services.rappi_order_service.RappiAdapter",
            return_value=self.mock_adapter,
        )
        self.mock_rappi_adapter = self.adapter_patch.start()

        # Mock para métodos do serviço
        self.service.get_rappi_configuration = AsyncMock(
            return_value={
                "api_key": "test_api_key",
                "api_secret": "test_api_secret",
                "restaurant_id": "test_restaurant_id",
                "store_id": "test_store_id",
                "auto_accept": True,
            }
        )
        self.service.save_remote_order = AsyncMock()
        self.service.update_remote_order = AsyncMock()
        self.service.get_remote_order = AsyncMock()

    def tearDown(self):
        """Limpeza após os testes."""
        self.adapter_patch.stop()

    async def test_process_rappi_webhook_valid(self):
        """Testa o processamento de webhook válido do Rappi."""
        # Dados de exemplo de webhook
        webhook_data = {
            "eventType": "ORDER_CREATED",
            "restaurant_id": "test_restaurant_id",
            "order": {"id": "rappi_order_123", "orderNumber": "R12345"},
        }

        # Mock para o pedido processado
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

        self.mock_adapter.process_webhook.return_value = mock_order
        self.service.save_remote_order.return_value = mock_order

        # Processar webhook
        result = await self.service.process_rappi_webhook(
            webhook_data, "valid_signature"
        )

        # Verificar se o adaptador foi chamado corretamente
        self.mock_adapter.validate_webhook_signature.assert_called_once()
        self.mock_adapter.process_webhook.assert_called_once_with(webhook_data)

        # Verificar se o pedido foi salvo
        self.service.save_remote_order.assert_called_once_with(mock_order)

        # Verificar se o evento foi publicado
        self.event_bus.publish.assert_called_once()

        # Verificar resultado
        self.assertEqual(result, mock_order)

    async def test_process_rappi_webhook_invalid_signature(self):
        """Testa o processamento de webhook com assinatura inválida."""
        # Dados de exemplo de webhook
        webhook_data = {
            "eventType": "ORDER_CREATED",
            "restaurant_id": "test_restaurant_id",
            "order": {"id": "rappi_order_123", "orderNumber": "R12345"},
        }

        # Configurar mock para retornar assinatura inválida
        self.mock_adapter.validate_webhook_signature.return_value = False

        # Processar webhook
        result = await self.service.process_rappi_webhook(
            webhook_data, "invalid_signature"
        )

        # Verificar que a validação foi chamada
        self.mock_adapter.validate_webhook_signature.assert_called_once()

        # Verificar que o processamento não continuou
        self.mock_adapter.process_webhook.assert_not_called()
        self.service.save_remote_order.assert_not_called()
        self.event_bus.publish.assert_not_called()

        # Verificar resultado
        self.assertIsNone(result)

    async def test_confirm_remote_order(self):
        """Testa a confirmação de um pedido remoto."""
        # Mock para o pedido
        mock_order = MagicMock()
        mock_order.id = "rappi_order_123"
        mock_order.external_id = "rappi_order_123"
        mock_order.source = "rappi"
        mock_order.restaurant_id = "test_restaurant_id"
        mock_order.store_id = "test_store_id"
        mock_order.status = RemoteOrderStatus.PENDING

        self.service.get_remote_order.return_value = mock_order

        # Confirmar pedido
        result = await self.service.confirm_remote_order("rappi_order_123")

        # Verificar se o adaptador foi chamado corretamente
        self.mock_adapter.update_order_status.assert_called_once_with(
            "rappi_order_123", RemoteOrderStatus.CONFIRMED
        )

        # Verificar se o pedido foi atualizado
        self.service.update_remote_order.assert_called_once()

        # Verificar se o evento foi publicado
        self.event_bus.publish.assert_called_once()

        # Verificar resultado
        self.assertTrue(result)

    async def test_reject_remote_order(self):
        """Testa a rejeição de um pedido remoto."""
        # Mock para o pedido
        mock_order = MagicMock()
        mock_order.id = "rappi_order_123"
        mock_order.external_id = "rappi_order_123"
        mock_order.source = "rappi"
        mock_order.restaurant_id = "test_restaurant_id"
        mock_order.store_id = "test_store_id"
        mock_order.status = RemoteOrderStatus.PENDING
        mock_order.payment = MagicMock(online=True, total=38.80)

        self.service.get_remote_order.return_value = mock_order

        # Patch para o método process_refund
        with patch.object(
            self.service, "process_refund", AsyncMock(return_value=True)
        ) as mock_process_refund:
            # Rejeitar pedido
            result = await self.service.reject_remote_order(
                "rappi_order_123", "Restaurante fechado"
            )

            # Verificar se o adaptador foi chamado corretamente
            self.mock_adapter.reject_order.assert_called_once_with(
                "rappi_order_123", "Restaurante fechado"
            )

            # Verificar se o pedido foi atualizado
            self.service.update_remote_order.assert_called_once()

            # Verificar se o evento foi publicado
            self.event_bus.publish.assert_called_once()

            # Verificar se o reembolso foi processado
            mock_process_refund.assert_called_once_with(
                mock_order, "Restaurante fechado"
            )

            # Verificar resultado
            self.assertTrue(result)

    async def test_process_refund(self):
        """Testa o processamento de reembolso de um pedido."""
        # Mock para o pedido
        mock_order = MagicMock()
        mock_order.id = "rappi_order_123"
        mock_order.external_id = "rappi_order_123"
        mock_order.restaurant_id = "test_restaurant_id"
        mock_order.store_id = "test_store_id"
        mock_order.payment = MagicMock(online=True, total=38.80)

        # Processar reembolso
        result = await self.service.process_refund(mock_order, "Pedido cancelado")

        # Verificar se o adaptador foi chamado corretamente
        self.mock_adapter.request_refund.assert_called_once_with(
            "rappi_order_123", "Pedido cancelado", 38.80
        )

        # Verificar se o serviço de pagamento foi chamado
        self.payment_service.register_refund.assert_called_once_with(
            order_id="rappi_order_123",
            amount=38.80,
            reason="Pedido cancelado",
            source="rappi",
        )

        # Verificar se o evento foi publicado
        self.event_bus.publish.assert_called_once()

        # Verificar resultado
        self.assertTrue(result)

    async def test_notify_customer_status_change(self):
        """Testa a notificação do cliente sobre mudança de status do pedido."""
        # Mock para o pedido
        mock_order = MagicMock()
        mock_order.id = "rappi_order_123"
        mock_order.external_id = "rappi_order_123"
        mock_order.restaurant_id = "test_restaurant_id"

        # Testar diferentes status
        status_messages = {
            RemoteOrderStatus.CONFIRMED: "Seu pedido foi confirmado e está sendo preparado!",
            RemoteOrderStatus.REJECTED: "Infelizmente seu pedido foi rejeitado. Entre em contato para mais informações.",
            RemoteOrderStatus.PREPARING: "Seu pedido está sendo preparado!",
            RemoteOrderStatus.READY: "Seu pedido está pronto e será entregue em breve!",
            RemoteOrderStatus.DELIVERING: "Seu pedido saiu para entrega!",
            RemoteOrderStatus.DELIVERED: "Seu pedido foi entregue. Bom apetite!",
        }

        for status, expected_message in status_messages.items():
            # Resetar mock
            self.mock_adapter.notify_customer.reset_mock()

            # Notificar cliente
            result = await self.service.notify_customer_status_change(
                mock_order, status
            )

            # Verificar se o adaptador foi chamado corretamente
            self.mock_adapter.notify_customer.assert_called_once_with(
                "rappi_order_123", expected_message
            )

            # Verificar resultado
            self.assertTrue(result)

    async def test_handle_order_status_change(self):
        """Testa o handler de eventos de mudança de status de pedidos."""
        # Criar evento de exemplo
        event = Event(
            data={
                "order_id": "rappi_order_123",
                "source": "rappi",
                "status": RemoteOrderStatus.CONFIRMED.value,
                "previous_status": RemoteOrderStatus.PENDING.value,
            }
        )

        # Chamar handler
        await self.service.handle_order_status_change(event)

        # Verificar que o handler não causou erros
        # (Implementação real dependeria da lógica específica do negócio)

    async def test_handle_confirmation_timeout(self):
        """Testa o handler de eventos de timeout de confirmação de pedidos."""
        # Mock para o pedido
        mock_order = MagicMock()
        mock_order.id = "rappi_order_123"
        mock_order.source = "rappi"
        mock_order.status = RemoteOrderStatus.PENDING

        self.service.get_remote_order.return_value = mock_order

        # Patch para o método reject_remote_order
        with patch.object(
            self.service, "reject_remote_order", AsyncMock(return_value=True)
        ) as mock_reject:
            # Criar evento de exemplo
            event = Event(data={"order_id": "rappi_order_123"})

            # Chamar handler
            await self.service.handle_confirmation_timeout(event)

            # Verificar se o pedido foi rejeitado
            mock_reject.assert_called_once_with(
                "rappi_order_123", "Tempo de confirmação expirado"
            )


if __name__ == "__main__":
    unittest.main()
