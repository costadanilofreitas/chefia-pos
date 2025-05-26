import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import json
import os
import sys
from datetime import datetime

# Adicionar diretório raiz ao path para importar módulos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../')))

from src.payment.models.payment_models import (
    PaymentProvider, PaymentMethod, PaymentStatus, NotificationType,
    Payment, PaymentCreate
)
from src.payment.adapters.asaas_adapter import AsaasAdapter

class AsyncContextManagerMock(AsyncMock):
    """Mock para objetos que suportam o protocolo de gerenciador de contexto assíncrono."""
    async def __aenter__(self):
        return self.aenter_return

    async def __aexit__(self, *args):
        pass

class TestAsaasAdapter(unittest.IsolatedAsyncioTestCase):
    """Testes para o adaptador Asaas."""
    
    def setUp(self):
        """Configuração inicial para os testes."""
        # Mock para resposta HTTP
        self.response_mock = AsyncMock()
        self.response_mock.status = 200
        self.response_mock.json = AsyncMock()
        
        # Mock para session.post que suporta o protocolo de contexto assíncrono
        self.post_mock = AsyncContextManagerMock()
        self.post_mock.aenter_return = self.response_mock
        
        # Mock para session.get que suporta o protocolo de contexto assíncrono
        self.get_mock = AsyncContextManagerMock()
        self.get_mock.aenter_return = self.response_mock
        
        # Mock para aiohttp.ClientSession
        self.session_mock = AsyncMock()
        self.session_mock.post = AsyncMock(return_value=self.post_mock)
        self.session_mock.get = AsyncMock(return_value=self.get_mock)
        
        # Patch para aiohttp.ClientSession
        self.session_patch = patch('aiohttp.ClientSession', return_value=self.session_mock)
        self.session_patch.start()
        
        # Criar adaptador
        self.adapter = AsaasAdapter()
        
        # Configuração do provedor
        self.config = MagicMock(
            provider=PaymentProvider.ASAAS,
            api_key="test_api_key",
            sandbox=True,
            default_notification=NotificationType.EMAIL
        )
    
    def tearDown(self):
        """Limpeza após os testes."""
        self.session_patch.stop()
    
    async def test_create_payment(self):
        """Testa a criação de um pagamento no Asaas."""
        # Configurar mock de resposta para criação de pagamento
        self.response_mock.json.side_effect = [
            # Resposta para criação de cliente
            {"id": "customer_123"},
            # Resposta para criação de pagamento
            {
                "id": "payment_123",
                "status": "PENDING",
                "dueDate": "2025-05-25"
            },
            # Resposta para obtenção de QR Code PIX
            {
                "payload": "pix_key_123",
                "encodedImage": "qrcode_data"
            }
        ]
        
        # Dados para criação de pagamento
        payment_data = PaymentCreate(
            order_id="order_123",
            method=PaymentMethod.PIX,
            amount=100.0,
            notification_type=NotificationType.EMAIL,
            customer_email="cliente@example.com",
            customer_name="Cliente Teste",
            description="Pedido #123",
            external_reference="123"
        )
        
        # Criar pagamento
        result = await self.adapter.create_payment(payment_data, self.config)
        
        # Verificar se as requisições foram feitas corretamente
        self.assertEqual(self.session_mock.post.call_count, 2)  # Cliente e pagamento
        self.assertEqual(self.session_mock.get.call_count, 1)   # QR Code PIX
        
        # Verificar dados do resultado
        self.assertEqual(result["id"], "payment_123")
        self.assertEqual(result["status"], PaymentStatus.PENDING)
        self.assertEqual(result["pix_key"], "pix_key_123")
        self.assertEqual(result["pix_qrcode"], "qrcode_data")
    
    async def test_get_payment_status(self):
        """Testa a obtenção do status de um pagamento no Asaas."""
        # Configurar mock de resposta
        self.response_mock.json.return_value = {
            "id": "payment_123",
            "status": "RECEIVED",
            "paymentDate": "2025-05-24"
        }
        
        # Obter status
        result = await self.adapter.get_payment_status("payment_123", self.config)
        
        # Verificar se a requisição foi feita corretamente
        self.session_mock.get.assert_called_once()
        
        # Verificar dados do resultado
        self.assertEqual(result["id"], "payment_123")
        self.assertEqual(result["status"], PaymentStatus.RECEIVED)
        self.assertIsNotNone(result["payment_date"])
    
    async def test_process_webhook_payment_confirmed(self):
        """Testa o processamento de webhook para pagamento confirmado."""
        # Dados do webhook
        webhook_data = {
            "event": "PAYMENT_CONFIRMED",
            "payment": {
                "id": "payment_123",
                "status": "CONFIRMED",
                "paymentDate": "2025-05-24"
            }
        }
        
        # Processar webhook
        result = await self.adapter.process_webhook(webhook_data)
        
        # Verificar dados do resultado
        self.assertEqual(result.event, "PAYMENT_CONFIRMED")
        self.assertEqual(result.provider_payment_id, "payment_123")
        self.assertEqual(result.status, PaymentStatus.CONFIRMED)
        self.assertIsNotNone(result.payment_date)
    
    async def test_process_webhook_payment_received(self):
        """Testa o processamento de webhook para pagamento recebido."""
        # Dados do webhook
        webhook_data = {
            "event": "PAYMENT_RECEIVED",
            "payment": {
                "id": "payment_123",
                "status": "RECEIVED",
                "paymentDate": "2025-05-24"
            }
        }
        
        # Processar webhook
        result = await self.adapter.process_webhook(webhook_data)
        
        # Verificar dados do resultado
        self.assertEqual(result.event, "PAYMENT_RECEIVED")
        self.assertEqual(result.provider_payment_id, "payment_123")
        self.assertEqual(result.status, PaymentStatus.RECEIVED)
        self.assertIsNotNone(result.payment_date)
    
    async def test_process_webhook_invalid_event(self):
        """Testa o processamento de webhook com evento inválido."""
        # Dados do webhook
        webhook_data = {
            "event": "INVALID_EVENT",
            "payment": {
                "id": "payment_123"
            }
        }
        
        # Processar webhook
        result = await self.adapter.process_webhook(webhook_data)
        
        # Verificar que o resultado é None
        self.assertIsNone(result)
    
    async def test_map_status(self):
        """Testa o mapeamento de status do Asaas para status interno."""
        # Testar mapeamentos
        self.assertEqual(self.adapter._map_status("PENDING"), PaymentStatus.PENDING)
        self.assertEqual(self.adapter._map_status("CONFIRMED"), PaymentStatus.CONFIRMED)
        self.assertEqual(self.adapter._map_status("RECEIVED"), PaymentStatus.RECEIVED)
        self.assertEqual(self.adapter._map_status("OVERDUE"), PaymentStatus.OVERDUE)
        self.assertEqual(self.adapter._map_status("REFUNDED"), PaymentStatus.REFUNDED)
        self.assertEqual(self.adapter._map_status("CANCELLED"), PaymentStatus.CANCELLED)
        self.assertEqual(self.adapter._map_status("FAILED"), PaymentStatus.FAILED)
        
        # Testar status desconhecido
        self.assertEqual(self.adapter._map_status("UNKNOWN"), PaymentStatus.PENDING)

if __name__ == '__main__':
    unittest.main()
