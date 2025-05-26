import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import json
import uuid
from datetime import datetime

from src.remote_orders.models.remote_order_models import (
    RemoteOrder, RemoteOrderStatus, RemotePlatform
)
from src.product.models.product import Order, OrderStatus
from src.order.services.order_service import order_service
from src.remote_orders.services.remote_order_service import remote_order_service

class TestRemoteOrderIntegration(unittest.TestCase):
    """Testes de integração entre o módulo de pedidos remotos e o fluxo de pedidos existente."""
    
    def setUp(self):
        """Configuração inicial para os testes."""
        # Mock do serviço de pedidos
        self.order_service_mock = MagicMock()
        self.order_service_mock.create_order = AsyncMock()
        self.order_service_mock.update_order = AsyncMock()
        self.order_service_mock.get_order = AsyncMock()
        
        # Mock do barramento de eventos
        self.event_bus_mock = MagicMock()
        self.event_bus_mock.publish = AsyncMock()
        self.event_bus_mock.subscribe = AsyncMock()
        
        # Dados de exemplo
        self.sample_remote_order = RemoteOrder(
            id=str(uuid.uuid4()),
            platform=RemotePlatform.IFOOD,
            external_order_id="abc123",
            status=RemoteOrderStatus.PENDING,
            items=[
                {
                    "id": "item1",
                    "name": "X-Burger",
                    "quantity": 2,
                    "unit_price": 15.90,
                    "total_price": 31.80,
                    "notes": "Sem cebola"
                }
            ],
            customer={
                "name": "João Silva",
                "phone": "11999999999",
                "email": "joao@example.com",
                "document": "12345678900"
            },
            payment={
                "method": "CREDIT",
                "status": "PAID",
                "total": 31.80,
                "prepaid": True
            },
            subtotal=31.80,
            delivery_fee=5.00,
            total=36.80,
            raw_data={}
        )
        
        self.sample_internal_order = Order(
            id=str(uuid.uuid4()),
            customer_id="12345678900",
            customer_name="João Silva",
            order_number="123",
            order_type="DELIVERY",
            status=OrderStatus.PENDING,
            payment_status="PAID",
            items=[
                {
                    "id": "item1",
                    "product_id": "prod1",
                    "product_name": "X-Burger",
                    "quantity": 2,
                    "unit_price": 15.90,
                    "total_price": 31.80,
                    "notes": "Sem cebola"
                }
            ],
            subtotal=31.80,
            tax=0.0,
            discount=0.0,
            total=36.80,
            delivery_fee=5.00,
            notes="Pedido iFood #abc123"
        )
    
    @patch('asyncio.run')
    @patch('src.remote_orders.services.remote_order_service.order_service')
    @patch('src.remote_orders.services.remote_order_service.get_event_bus')
    def test_remote_order_to_internal_order_flow(self, mock_get_event_bus, mock_order_service, mock_run):
        """Testa o fluxo completo de conversão de pedido remoto para pedido interno."""
        # Configurar mocks
        mock_get_event_bus.return_value = self.event_bus_mock
        mock_order_service.create_order.return_value = self.sample_internal_order
        
        # Configurar o serviço de pedidos remotos para usar os mocks
        remote_order_service._adapters = {
            RemotePlatform.IFOOD: MagicMock(
                convert_to_remote_order=AsyncMock(return_value=self.sample_remote_order),
                update_order_status=AsyncMock(return_value=True)
            )
        }
        
        # Configurar funções de carregamento/salvamento de dados
        remote_order_service._load_remote_orders = MagicMock(return_value=[])
        remote_order_service._save_remote_orders = MagicMock()
        remote_order_service._load_platform_configs = MagicMock(return_value=[
            {
                "platform": "ifood",
                "enabled": True,
                "api_key": "test_key",
                "api_secret": "test_secret",
                "webhook_url": "https://example.com/webhook/ifood",
                "auto_accept": True
            }
        ])
        
        # Configurar o mock para executar a função assíncrona
        async def async_process():
            # Processar um pedido remoto
            remote_order = await remote_order_service.process_remote_order(
                RemotePlatform.IFOOD, 
                {"id": "abc123", "items": []}
            )
            return remote_order
        
        mock_run.side_effect = lambda x: x
        
        # Executar a função
        result = asyncio.run(async_process())
        
        # Verificar se o processamento foi bem-sucedido
        self.assertEqual(result.platform, RemotePlatform.IFOOD)
        self.assertEqual(result.external_order_id, "abc123")
        
        # Verificar se o pedido interno foi criado (devido ao auto_accept=True)
        mock_order_service.create_order.assert_called_once()
        
        # Verificar se os eventos foram publicados
        self.event_bus_mock.publish.assert_called()
    
    @patch('asyncio.run')
    @patch('src.remote_orders.services.remote_order_service.order_service')
    @patch('src.remote_orders.services.remote_order_service.get_event_bus')
    def test_internal_order_status_update_propagation(self, mock_get_event_bus, mock_order_service, mock_run):
        """Testa a propagação de atualizações de status de pedidos internos para pedidos remotos."""
        # Configurar mocks
        mock_get_event_bus.return_value = self.event_bus_mock
        
        # Configurar o serviço de pedidos remotos para usar os mocks
        remote_order_service._adapters = {
            RemotePlatform.IFOOD: MagicMock(
                update_order_status=AsyncMock(return_value=True)
            )
        }
        
        # Configurar funções de carregamento/salvamento de dados
        remote_order_service._load_remote_orders = MagicMock(return_value=[
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
                "raw_data": {}
            }
        ])
        remote_order_service._save_remote_orders = MagicMock()
        remote_order_service.update_remote_order = AsyncMock()
        
        # Configurar o mock para executar a função assíncrona
        async def async_handle():
            # Simular uma atualização de status de pedido interno
            await remote_order_service.handle_order_status_change("internal123", OrderStatus.DELIVERED)
        
        mock_run.side_effect = lambda x: x
        
        # Executar a função
        asyncio.run(async_handle())
        
        # Verificar se o pedido remoto foi atualizado
        remote_order_service.update_remote_order.assert_called_once()
    
    @patch('asyncio.run')
    @patch('src.remote_orders.services.remote_order_service.order_service')
    @patch('src.remote_orders.services.remote_order_service.get_event_bus')
    def test_error_handling_during_order_processing(self, mock_get_event_bus, mock_order_service, mock_run):
        """Testa o tratamento de erros durante o processamento de pedidos remotos."""
        # Configurar mocks
        mock_get_event_bus.return_value = self.event_bus_mock
        mock_order_service.create_order.side_effect = Exception("Erro simulado")
        
        # Configurar o serviço de pedidos remotos para usar os mocks
        remote_order_service._adapters = {
            RemotePlatform.IFOOD: MagicMock(
                convert_to_remote_order=AsyncMock(return_value=self.sample_remote_order),
                update_order_status=AsyncMock(return_value=True)
            )
        }
        
        # Configurar funções de carregamento/salvamento de dados
        remote_order_service._load_remote_orders = MagicMock(return_value=[
            self.sample_remote_order.dict()
        ])
        remote_order_service._save_remote_orders = MagicMock()
        remote_order_service._load_platform_configs = MagicMock(return_value=[
            {
                "platform": "ifood",
                "enabled": True,
                "api_key": "test_key",
                "api_secret": "test_secret",
                "webhook_url": "https://example.com/webhook/ifood",
                "auto_accept": True
            }
        ])
        remote_order_service.get_remote_order = AsyncMock(return_value=self.sample_remote_order)
        remote_order_service.update_remote_order = AsyncMock()
        
        # Configurar o mock para executar a função assíncrona
        async def async_accept():
            try:
                # Tentar aceitar um pedido remoto (deve falhar)
                await remote_order_service.accept_remote_order(self.sample_remote_order.id)
                return False  # Não deveria chegar aqui
            except Exception:
                return True  # Deveria lançar exceção
        
        mock_run.side_effect = lambda x: x
        
        # Executar a função
        result = asyncio.run(async_accept())
        
        # Verificar se a exceção foi capturada
        self.assertTrue(result)
        
        # Verificar se o pedido remoto foi atualizado para status de erro
        remote_order_service.update_remote_order.assert_called_once()
        
        # Verificar se o evento de erro foi publicado
        self.event_bus_mock.publish.assert_called()

if __name__ == '__main__':
    import asyncio
    unittest.main()
