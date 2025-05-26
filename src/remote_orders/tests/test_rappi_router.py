import unittest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
import json

from src.remote_orders.router.rappi_router import router
from src.remote_orders.services.rappi_order_service import RappiOrderService
from src.remote_orders.models.remote_order_models import RemoteOrderStatus, RemoteOrder

class TestRappiRouter(unittest.TestCase):
    """Testes para o router de integração com Rappi."""
    
    def setUp(self):
        """Configuração inicial para os testes."""
        self.client = TestClient(router)
        
        # Mock para o serviço de pedidos Rappi
        self.mock_service = MagicMock()
        self.mock_service.process_rappi_webhook = AsyncMock()
        self.mock_service.get_remote_order = AsyncMock()
        self.mock_service.confirm_remote_order = AsyncMock()
        self.mock_service.reject_remote_order = AsyncMock()
        self.mock_service.update_order_status = AsyncMock()
        self.mock_service.update_product_availability = AsyncMock()
        
        # Patch para o get_rappi_order_service
        self.service_patch = patch('src.remote_orders.router.rappi_router.get_rappi_order_service', return_value=self.mock_service)
        self.mock_get_service = self.service_patch.start()
        
    def tearDown(self):
        """Limpeza após os testes."""
        self.service_patch.stop()
    
    def test_rappi_webhook(self):
        """Testa o endpoint de webhook do Rappi."""
        # Dados de exemplo de webhook
        webhook_data = {
            "eventType": "ORDER_CREATED",
            "restaurant_id": "test_restaurant_id",
            "order": {
                "id": "rappi_order_123",
                "orderNumber": "R12345"
            }
        }
        
        # Mock para o pedido processado
        mock_order = MagicMock()
        self.mock_service.process_rappi_webhook.return_value = mock_order
        
        # Fazer requisição ao endpoint
        response = self.client.post(
            "/api/remote-orders/rappi/webhook",
            json=webhook_data,
            headers={"X-Rappi-Signature": "valid_signature"}
        )
        
        # Verificar resposta
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "success", "message": "Webhook processed successfully"})
        
        # Verificar se o serviço foi chamado corretamente
        self.mock_service.process_rappi_webhook.assert_called_once()
        
    def test_rappi_webhook_no_order(self):
        """Testa o endpoint de webhook do Rappi quando não há pedido para processar."""
        # Dados de exemplo de webhook
        webhook_data = {
            "eventType": "ORDER_STATUS_UPDATED",
            "restaurant_id": "test_restaurant_id",
            "order": {
                "id": "rappi_order_123",
                "status": "DELIVERED"
            }
        }
        
        # Mock para retornar None (nenhum pedido processado)
        self.mock_service.process_rappi_webhook.return_value = None
        
        # Fazer requisição ao endpoint
        response = self.client.post(
            "/api/remote-orders/rappi/webhook",
            json=webhook_data,
            headers={"X-Rappi-Signature": "valid_signature"}
        )
        
        # Verificar resposta
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ignored", "message": "Webhook ignored or no action required"})
        
        # Verificar se o serviço foi chamado corretamente
        self.mock_service.process_rappi_webhook.assert_called_once()
        
    def test_get_rappi_order(self):
        """Testa o endpoint para obter detalhes de um pedido do Rappi."""
        # Mock para o pedido
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
            created_at="2025-05-25T00:00:00Z",
            updated_at="2025-05-25T00:00:00Z",
            raw_data={}
        )
        
        self.mock_service.get_remote_order.return_value = mock_order
        
        # Fazer requisição ao endpoint
        response = self.client.get("/api/remote-orders/rappi/orders/rappi_order_123")
        
        # Verificar resposta
        self.assertEqual(response.status_code, 200)
        
        # Verificar se o serviço foi chamado corretamente
        self.mock_service.get_remote_order.assert_called_once_with("rappi_order_123")
        
    def test_get_rappi_order_not_found(self):
        """Testa o endpoint para obter detalhes de um pedido inexistente."""
        # Mock para retornar None (pedido não encontrado)
        self.mock_service.get_remote_order.return_value = None
        
        # Fazer requisição ao endpoint
        response = self.client.get("/api/remote-orders/rappi/orders/nonexistent_order")
        
        # Verificar resposta
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Order not found"})
        
        # Verificar se o serviço foi chamado corretamente
        self.mock_service.get_remote_order.assert_called_once_with("nonexistent_order")
        
    def test_confirm_rappi_order(self):
        """Testa o endpoint para confirmar um pedido do Rappi."""
        # Mock para retornar sucesso
        self.mock_service.confirm_remote_order.return_value = True
        
        # Fazer requisição ao endpoint
        response = self.client.post("/api/remote-orders/rappi/orders/rappi_order_123/confirm")
        
        # Verificar resposta
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "success", "message": "Order confirmed successfully"})
        
        # Verificar se o serviço foi chamado corretamente
        self.mock_service.confirm_remote_order.assert_called_once_with("rappi_order_123")
        
    def test_confirm_rappi_order_failure(self):
        """Testa o endpoint para confirmar um pedido do Rappi com falha."""
        # Mock para retornar falha
        self.mock_service.confirm_remote_order.return_value = False
        
        # Fazer requisição ao endpoint
        response = self.client.post("/api/remote-orders/rappi/orders/rappi_order_123/confirm")
        
        # Verificar resposta
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"detail": "Failed to confirm order"})
        
        # Verificar se o serviço foi chamado corretamente
        self.mock_service.confirm_remote_order.assert_called_once_with("rappi_order_123")
        
    def test_reject_rappi_order(self):
        """Testa o endpoint para rejeitar um pedido do Rappi."""
        # Mock para retornar sucesso
        self.mock_service.reject_remote_order.return_value = True
        
        # Fazer requisição ao endpoint
        response = self.client.post(
            "/api/remote-orders/rappi/orders/rappi_order_123/reject",
            json={"reason": "Restaurante fechado"}
        )
        
        # Verificar resposta
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "success", "message": "Order rejected successfully"})
        
        # Verificar se o serviço foi chamado corretamente
        self.mock_service.reject_remote_order.assert_called_once_with("rappi_order_123", "Restaurante fechado")
        
    def test_update_rappi_order_status(self):
        """Testa o endpoint para atualizar o status de um pedido do Rappi."""
        # Mock para retornar sucesso
        self.mock_service.update_order_status.return_value = True
        
        # Fazer requisição ao endpoint
        response = self.client.post(
            "/api/remote-orders/rappi/orders/rappi_order_123/status",
            json={"status": "PREPARING"}
        )
        
        # Verificar resposta
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "success", "message": "Order status updated to PREPARING"})
        
        # Verificar se o serviço foi chamado corretamente
        self.mock_service.update_order_status.assert_called_once()
        
    def test_update_rappi_order_status_invalid(self):
        """Testa o endpoint para atualizar o status de um pedido do Rappi com status inválido."""
        # Fazer requisição ao endpoint com status inválido
        response = self.client.post(
            "/api/remote-orders/rappi/orders/rappi_order_123/status",
            json={"status": "INVALID_STATUS"}
        )
        
        # Verificar resposta
        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid status", response.json()["detail"])
        
        # Verificar que o serviço não foi chamado
        self.mock_service.update_order_status.assert_not_called()
        
    def test_update_product_availability(self):
        """Testa o endpoint para atualizar a disponibilidade de um produto no Rappi."""
        # Mock para retornar sucesso
        self.mock_service.update_product_availability.return_value = True
        
        # Fazer requisição ao endpoint
        response = self.client.post(
            "/api/remote-orders/rappi/products/product_123/availability",
            json={"restaurant_id": "test_restaurant_id", "available": True}
        )
        
        # Verificar resposta
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(), 
            {"status": "success", "message": "Product product_123 availability updated to True"}
        )
        
        # Verificar se o serviço foi chamado corretamente
        self.mock_service.update_product_availability.assert_called_once_with(
            "test_restaurant_id",
            "product_123",
            True
        )
        
    def test_update_product_availability_missing_restaurant(self):
        """Testa o endpoint para atualizar a disponibilidade de um produto sem informar o restaurante."""
        # Fazer requisição ao endpoint sem restaurant_id
        response = self.client.post(
            "/api/remote-orders/rappi/products/product_123/availability",
            json={"available": True}
        )
        
        # Verificar resposta
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"detail": "Restaurant ID is required"})
        
        # Verificar que o serviço não foi chamado
        self.mock_service.update_product_availability.assert_not_called()

if __name__ == '__main__':
    unittest.main()
