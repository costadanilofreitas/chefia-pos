import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import json
import os
import sys
from datetime import datetime, timedelta

# Adicionar diretório raiz ao path para importar módulos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../')))

from src.payment.models.payment_models import (
    PaymentProvider, PaymentMethod, PaymentStatus, NotificationType,
    Payment, PaymentCreate
)
from src.payment.services.payment_service import PaymentService
from src.payment.adapters.asaas_adapter import AsaasAdapter

# Mock para OrderUpdate
class OrderUpdate:
    def __init__(self, payment_status=None, payment_method=None):
        self.payment_status = payment_status
        self.payment_method = payment_method

# Mock para OrderService
class MockOrderService:
    def __init__(self):
        self.update_order = AsyncMock()

# Patch OrderService e OrderUpdate no sys.modules
sys.modules['src.order.services.order_service'] = MagicMock()
sys.modules['src.order.services.order_service'].OrderService = MockOrderService
sys.modules['src.product.models.product'] = MagicMock()
sys.modules['src.product.models.product'].OrderUpdate = OrderUpdate
sys.modules['src.product.models.product'].PaymentStatus = MagicMock(PAID="PAID")

class TestPaymentService(unittest.IsolatedAsyncioTestCase):
    """Testes para o serviço de pagamento."""
    
    def setUp(self):
        """Configuração inicial para os testes."""
        # Mock para o adaptador Asaas
        self.asaas_adapter_mock = AsyncMock(spec=AsaasAdapter)
        
        # Mock para o barramento de eventos
        self.event_bus_mock = MagicMock()
        self.event_bus_mock.publish = AsyncMock()
        
        # Patch para get_event_bus
        self.event_bus_patch = patch('src.payment.services.payment_service.get_event_bus', 
                                    return_value=self.event_bus_mock)
        self.event_bus_patch.start()
        
        # Criar serviço de pagamento
        self.payment_service = PaymentService()
        
        # Substituir o adaptador diretamente na instância
        self.payment_service.adapters = {
            PaymentProvider.ASAAS: self.asaas_adapter_mock
        }
        
        # Mock para métodos internos
        self.payment_service._get_provider_config = MagicMock(return_value=MagicMock(
            provider=PaymentProvider.ASAAS,
            api_key="test_api_key",
            sandbox=True,
            default_notification=NotificationType.EMAIL
        ))
        self.payment_service._save_payment = MagicMock()
        self.payment_service._load_payments = MagicMock(return_value=[])
    
    def tearDown(self):
        """Limpeza após os testes."""
        self.event_bus_patch.stop()
    
    async def test_create_payment(self):
        """Testa a criação de um pagamento."""
        # Configurar mock do adaptador
        self.asaas_adapter_mock.create_payment.return_value = {
            "id": "payment_123",
            "status": PaymentStatus.PENDING,
            "pix_key": "pix_key_123",
            "pix_qrcode": "qrcode_data",
            "pix_qrcode_image": "qrcode_image_data",
            "pix_expiration_date": datetime.now() + timedelta(days=1),
            "payment_url": "https://example.com/payment"
        }
        
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
        payment = await self.payment_service.create_payment(payment_data)
        
        # Verificar se o adaptador foi chamado corretamente
        self.asaas_adapter_mock.create_payment.assert_called_once()
        
        # Verificar se o pagamento foi salvo
        self.payment_service._save_payment.assert_called_once()
        
        # Verificar se o evento foi publicado
        self.event_bus_mock.publish.assert_called_once()
        
        # Verificar dados do pagamento
        self.assertEqual(payment.order_id, "order_123")
        self.assertEqual(payment.provider, PaymentProvider.ASAAS)
        self.assertEqual(payment.provider_payment_id, "payment_123")
        self.assertEqual(payment.method, PaymentMethod.PIX)
        self.assertEqual(payment.amount, 100.0)
        self.assertEqual(payment.status, PaymentStatus.PENDING)
        self.assertEqual(payment.pix_key, "pix_key_123")
        self.assertEqual(payment.notification_type, NotificationType.EMAIL)
        self.assertEqual(payment.customer_email, "cliente@example.com")
        self.assertEqual(payment.customer_name, "Cliente Teste")
        self.assertEqual(payment.description, "Pedido #123")
        self.assertEqual(payment.external_reference, "123")
    
    async def test_update_payment_status(self):
        """Testa a atualização do status de um pagamento."""
        # Mock para get_payment
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
        self.payment_service.get_payment = AsyncMock(return_value=payment)
        
        # Atualizar status
        updated_payment = await self.payment_service.update_payment_status(
            "payment_id_123", 
            PaymentStatus.CONFIRMED,
            datetime.now()
        )
        
        # Verificar se o pagamento foi atualizado
        self.assertEqual(updated_payment.status, PaymentStatus.CONFIRMED)
        self.assertIsNotNone(updated_payment.paid_at)
        
        # Verificar se o evento foi publicado
        self.event_bus_mock.publish.assert_called_once()
    
    async def test_process_webhook(self):
        """Testa o processamento de webhook."""
        # Mock para o adaptador
        webhook_data = MagicMock(
            event="PAYMENT_CONFIRMED",
            provider_payment_id="provider_payment_123",
            status=PaymentStatus.CONFIRMED,
            payment_date=datetime.now()
        )
        self.asaas_adapter_mock.process_webhook.return_value = webhook_data
        
        # Mock para get_payment_by_provider_id
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
        self.payment_service.get_payment_by_provider_id = AsyncMock(return_value=payment)
        
        # Mock para update_payment_status
        self.payment_service.update_payment_status = AsyncMock(return_value=payment)
        
        # Processar webhook
        result = await self.payment_service.process_webhook(
            PaymentProvider.ASAAS,
            {"event": "PAYMENT_CONFIRMED", "payment": {"id": "provider_payment_123"}}
        )
        
        # Verificar se o adaptador foi chamado corretamente
        self.asaas_adapter_mock.process_webhook.assert_called_once()
        
        # Verificar se o pagamento foi buscado
        self.payment_service.get_payment_by_provider_id.assert_called_once_with("provider_payment_123")
        
        # Verificar se o status foi atualizado
        self.payment_service.update_payment_status.assert_called_once()
        
        # Verificar resultado
        self.assertEqual(result, payment)
    
    async def test_check_payment_status(self):
        """Testa a verificação de status de um pagamento."""
        # Mock para get_payment
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
        self.payment_service.get_payment = AsyncMock(return_value=payment)
        
        # Mock para o adaptador
        self.asaas_adapter_mock.get_payment_status.return_value = {
            "id": "provider_payment_123",
            "status": PaymentStatus.CONFIRMED,
            "payment_date": datetime.now()
        }
        
        # Mock para update_payment_status
        updated_payment = Payment(**payment.dict())
        updated_payment.status = PaymentStatus.CONFIRMED
        updated_payment.paid_at = datetime.now()
        self.payment_service.update_payment_status = AsyncMock(return_value=updated_payment)
        
        # Verificar status
        result = await self.payment_service.check_payment_status("payment_id_123")
        
        # Verificar se o adaptador foi chamado corretamente
        self.asaas_adapter_mock.get_payment_status.assert_called_once()
        
        # Verificar se o status foi atualizado
        self.payment_service.update_payment_status.assert_called_once()
        
        # Verificar resultado
        self.assertEqual(result.status, PaymentStatus.CONFIRMED)
        self.assertIsNotNone(result.paid_at)

if __name__ == '__main__':
    unittest.main()
