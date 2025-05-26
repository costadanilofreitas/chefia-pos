import unittest
import json
import uuid
import asyncio
from datetime import datetime
from unittest.mock import patch, MagicMock, AsyncMock

from src.remote_orders.models.remote_order_models import (
    RemoteOrder, RemoteOrderStatus, RemotePlatform, 
    RemotePlatformConfig, RemoteOrderItem, RemoteOrderCustomer,
    RemoteOrderPayment
)
from src.remote_orders.adapters.ifood_adapter import IFoodAdapter

class TestIFoodAdapter(unittest.TestCase):
    """Testes para o adaptador iFood."""
    
    def setUp(self):
        """Configuração inicial para os testes."""
        self.adapter = IFoodAdapter()
        self.config = RemotePlatformConfig(
            platform=RemotePlatform.IFOOD,
            enabled=True,
            api_key="test_api_key",
            api_secret="test_api_secret",
            webhook_url="https://example.com/webhook/ifood",
            auto_accept=False
        )
        
        # Dados de exemplo do iFood
        self.ifood_order_data = {
            "id": "abc123",
            "displayId": "123456",
            "orderType": "DELIVERY",
            "orderTiming": "IMMEDIATE",
            "createdAt": datetime.now().isoformat(),
            "items": [
                {
                    "id": "item1",
                    "name": "X-Burger",
                    "quantity": 2,
                    "unitPrice": 15.90,
                    "totalPrice": 31.80,
                    "notes": "Sem cebola",
                    "options": [
                        {
                            "id": "opt1",
                            "name": "Bacon extra",
                            "price": 3.00
                        }
                    ]
                },
                {
                    "id": "item2",
                    "name": "Refrigerante",
                    "quantity": 1,
                    "unitPrice": 5.00,
                    "totalPrice": 5.00
                }
            ],
            "customer": {
                "id": "cust123",
                "name": "João Silva",
                "phone": "11999999999",
                "email": "joao@example.com",
                "documentNumber": "12345678900"
            },
            "deliveryAddress": {
                "streetName": "Rua Exemplo",
                "streetNumber": "123",
                "neighborhood": "Centro",
                "city": "São Paulo",
                "state": "SP",
                "postalCode": "01234567",
                "complement": "Apto 42"
            },
            "payments": [
                {
                    "method": "CREDIT",
                    "status": "PAID",
                    "prepaid": True,
                    "value": 36.80
                }
            ],
            "subTotal": 36.80,
            "deliveryFee": 5.00,
            "discount": 0.00,
            "totalPrice": 41.80
        }
    
    def test_convert_to_remote_order(self):
        """Testa a conversão de dados do iFood para o formato interno."""
        # Definir a função assíncrona de teste
        async def async_test():
            # Executar a função
            remote_order = await self.adapter.convert_to_remote_order(self.ifood_order_data, self.config)
            
            # Verificar se a conversão foi bem-sucedida
            self.assertEqual(remote_order.platform, RemotePlatform.IFOOD)
            self.assertEqual(remote_order.external_order_id, "abc123")
            self.assertEqual(remote_order.status, RemoteOrderStatus.PENDING)
            
            # Verificar itens
            self.assertEqual(len(remote_order.items), 2)
            self.assertEqual(remote_order.items[0].name, "X-Burger")
            self.assertEqual(remote_order.items[0].quantity, 2)
            self.assertEqual(remote_order.items[0].unit_price, 15.90)
            self.assertEqual(remote_order.items[0].notes, "Sem cebola")
            
            # Verificar cliente
            self.assertEqual(remote_order.customer.name, "João Silva")
            self.assertEqual(remote_order.customer.phone, "11999999999")
            self.assertEqual(remote_order.customer.document, "12345678900")
            
            # Verificar pagamento
            self.assertEqual(remote_order.payment.method, "CREDIT")
            self.assertEqual(remote_order.payment.status, "PAID")
            self.assertTrue(remote_order.payment.prepaid)
            
            # Verificar valores
            self.assertEqual(remote_order.subtotal, 36.80)
            self.assertEqual(remote_order.delivery_fee, 5.00)
            self.assertEqual(remote_order.total, 41.80)
        
        # Executar o teste assíncrono
        asyncio.run(async_test())
    
    def test_update_order_status(self):
        """Testa a atualização de status de um pedido no iFood."""
        # Definir a função assíncrona de teste
        async def async_test():
            # Criar um pedido remoto de exemplo
            remote_order = RemoteOrder(
                id=str(uuid.uuid4()),
                platform=RemotePlatform.IFOOD,
                external_order_id="abc123",
                status=RemoteOrderStatus.ACCEPTED,
                items=[
                    RemoteOrderItem(
                        id="item1",
                        name="X-Burger",
                        quantity=2,
                        unit_price=15.90,
                        total_price=31.80
                    )
                ],
                customer=RemoteOrderCustomer(
                    name="João Silva",
                    phone="11999999999"
                ),
                payment=RemoteOrderPayment(
                    method="CREDIT",
                    status="PAID",
                    total=31.80,
                    prepaid=True
                ),
                subtotal=31.80,
                total=31.80,
                raw_data={}
            )
            
            # Executar a função
            result = await self.adapter.update_order_status(remote_order, self.config)
            
            # Verificar se a atualização foi bem-sucedida
            self.assertTrue(result)
        
        # Executar o teste assíncrono
        asyncio.run(async_test())
    
    def test_authenticate(self):
        """Testa a autenticação com a API do iFood."""
        # Definir a função assíncrona de teste
        async def async_test():
            # Executar a função
            token = await self.adapter.authenticate(self.config)
            
            # Verificar se a autenticação retornou um token
            self.assertIsNotNone(token)
            self.assertTrue(isinstance(token, str))
        
        # Executar o teste assíncrono
        asyncio.run(async_test())
    
    def test_verify_webhook_signature(self):
        """Testa a verificação de assinatura de webhook do iFood."""
        # Definir a função assíncrona de teste
        async def async_test():
            # Executar a função
            result = await self.adapter.verify_webhook_signature(
                "test_signature", 
                json.dumps(self.ifood_order_data), 
                self.config
            )
            
            # Verificar se a verificação foi bem-sucedida
            self.assertTrue(result)
        
        # Executar o teste assíncrono
        asyncio.run(async_test())

if __name__ == '__main__':
    unittest.main()
