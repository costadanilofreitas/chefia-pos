import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import os
import sys
from datetime import datetime

# Adicionar diretório raiz ao path para importar módulos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../')))

from src.payment.models.payment_models import (
    PaymentProvider, PaymentMethod, PaymentStatus, NotificationType,
    Payment
)
from src.payment.router.payment_router import router
from fastapi.testclient import TestClient
from fastapi import FastAPI, Depends

# Mock para o get_current_user
async def mock_get_current_user():
    return {"id": "user_123", "name": "Test User"}

# Patch the router's dependency
app = FastAPI()
for route in router.routes:
    if hasattr(route, "dependencies"):
        # Replace any dependency that uses get_current_user with our mock
        new_dependencies = []
        for dependency in route.dependencies:
            if getattr(dependency, "dependency", None) and "get_current_user" in str(dependency.dependency):
                new_dependencies.append(Depends(mock_get_current_user))
            else:
                new_dependencies.append(dependency)
        route.dependencies = new_dependencies

app.include_router(router)

class TestPaymentRouter(unittest.IsolatedAsyncioTestCase):
    """Testes para os endpoints da API de pagamento."""
    
    def setUp(self):
        """Configuração inicial para os testes."""
        # Mock para o serviço de pagamento
        self.payment_service_mock = MagicMock()
        self.payment_service_mock.create_payment = AsyncMock()
        self.payment_service_mock.get_payment = AsyncMock()
        self.payment_service_mock.get_payments_by_order = AsyncMock()
        self.payment_service_mock.process_webhook = AsyncMock()
        self.payment_service_mock.check_payment_status = AsyncMock()
        self.payment_service_mock.create_provider_config = AsyncMock()
        self.payment_service_mock.update_provider_config = AsyncMock()
        self.payment_service_mock.get_provider_config = AsyncMock()
        
        # Patch para get_payment_service
        self.service_patch = patch('src.payment.router.payment_router.get_payment_service', 
                                  return_value=self.payment_service_mock)
        self.service_patch.start()
        
        # Criar cliente de teste
        self.client = TestClient(app)
        
        # Headers de autenticação para todas as requisições
        self.auth_headers = {"Authorization": "Bearer dummy_token"}
    
    def tearDown(self):
        """Limpeza após os testes."""
        self.service_patch.stop()
    
    async def test_create_payment(self):
        """Testa a criação de um pagamento via API."""
        # Configurar mock do serviço
        payment = Payment(
            id="payment_id_123",
            order_id="order_123",
            provider=PaymentProvider.ASAAS,
            provider_payment_id="provider_payment_123",
            method=PaymentMethod.PIX,
            amount=100.0,
            status=PaymentStatus.PENDING,
            notification_type=NotificationType.EMAIL,
            pix_key="pix_key_123",
            pix_qrcode="qrcode_data",
            pix_qrcode_image="qrcode_image_data"
        )
        self.payment_service_mock.create_payment.return_value = payment
        
        # Dados para criação de pagamento
        payment_data = {
            "order_id": "order_123",
            "method": "pix",
            "amount": 100.0,
            "notification_type": "email",
            "customer_email": "cliente@example.com",
            "customer_name": "Cliente Teste",
            "description": "Pedido #123",
            "external_reference": "123"
        }
        
        # Fazer requisição
        response = self.client.post("/api/v1/payments/", json=payment_data, headers=self.auth_headers)
        
        # Verificar resposta
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], "payment_id_123")
        self.assertEqual(data["order_id"], "order_123")
        self.assertEqual(data["method"], "pix")
        self.assertEqual(data["amount"], 100.0)
        self.assertEqual(data["status"], "pending")
        self.assertEqual(data["pix_key"], "pix_key_123")
    
    async def test_get_payment(self):
        """Testa a obtenção de um pagamento via API."""
        # Configurar mock do serviço
        payment = Payment(
            id="payment_id_123",
            order_id="order_123",
            provider=PaymentProvider.ASAAS,
            provider_payment_id="provider_payment_123",
            method=PaymentMethod.PIX,
            amount=100.0,
            status=PaymentStatus.PENDING,
            notification_type=NotificationType.EMAIL
        )
        self.payment_service_mock.get_payment.return_value = payment
        
        # Fazer requisição
        response = self.client.get("/api/v1/payments/payment_id_123", headers=self.auth_headers)
        
        # Verificar resposta
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], "payment_id_123")
        self.assertEqual(data["order_id"], "order_123")
    
    async def test_get_payment_not_found(self):
        """Testa a obtenção de um pagamento inexistente via API."""
        # Configurar mock do serviço
        self.payment_service_mock.get_payment.return_value = None
        
        # Fazer requisição
        response = self.client.get("/api/v1/payments/nonexistent_id", headers=self.auth_headers)
        
        # Verificar resposta
        self.assertEqual(response.status_code, 404)
    
    async def test_get_payments_by_order(self):
        """Testa a obtenção de pagamentos por pedido via API."""
        # Configurar mock do serviço
        payments = [
            Payment(
                id="payment_id_123",
                order_id="order_123",
                provider=PaymentProvider.ASAAS,
                provider_payment_id="provider_payment_123",
                method=PaymentMethod.PIX,
                amount=100.0,
                status=PaymentStatus.PENDING,
                notification_type=NotificationType.EMAIL
            ),
            Payment(
                id="payment_id_456",
                order_id="order_123",
                provider=PaymentProvider.ASAAS,
                provider_payment_id="provider_payment_456",
                method=PaymentMethod.PIX,
                amount=50.0,
                status=PaymentStatus.CONFIRMED,
                notification_type=NotificationType.EMAIL
            )
        ]
        self.payment_service_mock.get_payments_by_order.return_value = payments
        
        # Fazer requisição
        response = self.client.get("/api/v1/payments/order/order_123", headers=self.auth_headers)
        
        # Verificar resposta
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["id"], "payment_id_123")
        self.assertEqual(data[1]["id"], "payment_id_456")
    
    async def test_asaas_webhook(self):
        """Testa o endpoint de webhook do Asaas."""
        # Configurar mock do serviço
        self.payment_service_mock.process_webhook.return_value = None
        
        # Dados do webhook
        webhook_data = {
            "event": "PAYMENT_CONFIRMED",
            "payment": {
                "id": "payment_123",
                "status": "CONFIRMED",
                "paymentDate": "2025-05-24"
            }
        }
        
        # Fazer requisição
        response = self.client.post("/api/v1/payments/webhook/asaas", json=webhook_data)
        
        # Verificar resposta
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["success"], True)
        
        # Verificar se o serviço foi chamado corretamente
        self.payment_service_mock.process_webhook.assert_called_once_with(
            PaymentProvider.ASAAS, webhook_data
        )
    
    async def test_check_payment_status(self):
        """Testa a verificação de status de um pagamento via API."""
        # Configurar mock do serviço
        payment = Payment(
            id="payment_id_123",
            order_id="order_123",
            provider=PaymentProvider.ASAAS,
            provider_payment_id="provider_payment_123",
            method=PaymentMethod.PIX,
            amount=100.0,
            status=PaymentStatus.CONFIRMED,
            notification_type=NotificationType.EMAIL,
            paid_at=datetime.now()
        )
        self.payment_service_mock.check_payment_status.return_value = payment
        
        # Fazer requisição
        response = self.client.get("/api/v1/payments/payment_id_123/check", headers=self.auth_headers)
        
        # Verificar resposta
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], "payment_id_123")
        self.assertEqual(data["status"], "confirmed")
        self.assertIsNotNone(data["paid_at"])

if __name__ == '__main__':
    unittest.main()
