import unittest
import asyncio
import sys
import os
from datetime import datetime

# Adicionar diretório raiz ao path para importações
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))


class EndToEndTestCase(unittest.TestCase):
    """Testes end-to-end para validar fluxos completos do sistema."""

    async def asyncSetUp(self):
        """Configuração assíncrona para os testes."""
        # Inicializar serviços necessários
        from src.core.events.event_bus import get_event_bus

        self.event_bus = get_event_bus()

        # Configurar ambiente de teste
        # ...

    async def asyncTearDown(self):
        """Limpeza assíncrona após os testes."""
        # Limpar recursos
        # ...

    async def test_complete_order_flow(self):
        """Testa o fluxo completo de um pedido, do início ao fim."""
        # 1. Criar um pedido
        from src.order.services.order_service import OrderService

        order_service = OrderService()

        order_data = {
            "customer_id": "test-customer-123",
            "items": [
                {"product_id": "product-1", "quantity": 2, "unit_price": 10.0},
                {"product_id": "product-2", "quantity": 1, "unit_price": 15.0},
            ],
            "table_id": "table-1",
            "waiter_id": "waiter-1",
        }

        order = await order_service.create_order(order_data)
        self.assertIsNotNone(order)
        self.assertEqual(len(order.items), 2)

        # 2. Processar o pedido no KDS
        from src.kds.services.kds_intelligence_service import KDSIntelligenceService

        kds_service = KDSIntelligenceService()

        await kds_service.process_new_order(order.id)

        # Verificar se os itens foram adicionados ao KDS
        kds_order = await kds_service.get_order(order.id)
        self.assertIsNotNone(kds_order)

        # 3. Atualizar status dos itens
        for item in kds_order.items:
            await kds_service.update_item_status(order.id, item.id, "PREPARING")
            await kds_service.update_item_status(order.id, item.id, "READY")

        # 4. Finalizar o pedido
        await order_service.update_order_status(order.id, "READY_FOR_PAYMENT")

        # 5. Processar pagamento
        from src.payment.services.payment_service import PaymentService

        payment_service = PaymentService()

        payment_data = {
            "order_id": order.id,
            "amount": 35.0,  # 2 * 10.0 + 1 * 15.0
            "method": "credit_card",
            "card_info": {
                "number": "4111111111111111",
                "expiry": "12/25",
                "cvv": "123",
                "holder_name": "Test User",
            },
        }

        payment = await payment_service.process_payment(payment_data)
        self.assertIsNotNone(payment)
        self.assertEqual(payment.status, "COMPLETED")

        # 6. Verificar status final do pedido
        updated_order = await order_service.get_order(order.id)
        self.assertEqual(updated_order.status, "COMPLETED")

    async def test_remote_order_integration(self):
        """Testa a integração com pedidos remotos (iFood, Rappi)."""
        # 1. Simular recebimento de pedido do iFood
        from src.remote_orders.adapters.ifood_adapter import IFoodAdapter
        from src.remote_orders.services.remote_order_service import RemoteOrderService

        ifood_adapter = IFoodAdapter()
        remote_order_service = RemoteOrderService()

        # Dados simulados de um pedido do iFood
        ifood_order_data = {
            "id": "ifood-order-123",
            "reference": "REF123",
            "shortReference": "R123",
            "createdAt": datetime.now().isoformat(),
            "type": "DELIVERY",
            "customer": {
                "id": "customer-123",
                "name": "Cliente Teste",
                "phone": "11999999999",
                "documentNumber": "12345678900",
            },
            "items": [
                {
                    "id": "item-1",
                    "name": "Hambúrguer",
                    "quantity": 1,
                    "price": 25.0,
                    "subItems": [],
                },
                {
                    "id": "item-2",
                    "name": "Batata Frita",
                    "quantity": 1,
                    "price": 10.0,
                    "subItems": [],
                },
            ],
            "totalPrice": 35.0,
            "deliveryAddress": {
                "streetName": "Rua Teste",
                "streetNumber": "123",
                "neighborhood": "Bairro",
                "city": "São Paulo",
                "state": "SP",
                "postalCode": "01234567",
                "complement": "Apto 123",
            },
        }

        # Processar pedido
        remote_order = await ifood_adapter.process_new_order(ifood_order_data)
        self.assertIsNotNone(remote_order)

        # Verificar se o pedido foi convertido corretamente
        internal_order = await remote_order_service.get_order_by_external_id(
            "ifood-order-123"
        )
        self.assertIsNotNone(internal_order)
        self.assertEqual(len(internal_order.items), 2)

        # 2. Atualizar status do pedido
        await remote_order_service.update_order_status(internal_order.id, "CONFIRMED")

        # Verificar se o status foi atualizado
        updated_order = await remote_order_service.get_order(internal_order.id)
        self.assertEqual(updated_order.status, "CONFIRMED")

        # 3. Simular recebimento de pedido do Rappi
        from src.remote_orders.adapters.rappi_adapter import RappiAdapter

        rappi_adapter = RappiAdapter()

        # Dados simulados de um pedido do Rappi
        rappi_order_data = {
            "order_id": "rappi-order-123",
            "external_order_id": "R456",
            "created_at": datetime.now().isoformat(),
            "delivery_type": "DELIVERY",
            "customer": {
                "name": "Cliente Rappi",
                "phone": "11988888888",
                "document": "98765432100",
            },
            "products": [
                {
                    "id": "prod-1",
                    "name": "Pizza",
                    "quantity": 1,
                    "unit_price": 40.0,
                    "options": [],
                }
            ],
            "total_amount": 40.0,
            "shipping_address": {
                "street": "Avenida Teste",
                "number": "456",
                "neighborhood": "Centro",
                "city": "São Paulo",
                "state": "SP",
                "zip_code": "04567890",
                "complement": "Bloco B",
            },
        }

        # Processar pedido
        rappi_remote_order = await rappi_adapter.process_new_order(rappi_order_data)
        self.assertIsNotNone(rappi_remote_order)

        # Verificar se o pedido foi convertido corretamente
        rappi_internal_order = await remote_order_service.get_order_by_external_id(
            "rappi-order-123"
        )
        self.assertIsNotNone(rappi_internal_order)
        self.assertEqual(len(rappi_internal_order.items), 1)

    async def test_waiter_table_layout(self):
        """Testa o fluxo de trabalho do módulo de garçom com layout de mesas."""
        # 1. Criar um layout de mesas
        from src.waiter.services.table_layout_service import TableLayoutService

        table_layout_service = TableLayoutService()

        layout_data = {
            "name": "Layout Principal",
            "restaurant_id": "restaurant-123",
            "tables": [
                {
                    "id": "table-1",
                    "name": "Mesa 1",
                    "x": 100,
                    "y": 100,
                    "width": 80,
                    "height": 80,
                    "shape": "circle",
                    "seats": 4,
                },
                {
                    "id": "table-2",
                    "name": "Mesa 2",
                    "x": 200,
                    "y": 100,
                    "width": 80,
                    "height": 80,
                    "shape": "circle",
                    "seats": 4,
                },
                {
                    "id": "table-3",
                    "name": "Mesa 3",
                    "x": 300,
                    "y": 100,
                    "width": 120,
                    "height": 80,
                    "shape": "rectangle",
                    "seats": 6,
                },
            ],
        }

        layout = await table_layout_service.create_layout(layout_data)
        self.assertIsNotNone(layout)
        self.assertEqual(len(layout.tables), 3)

        # 2. Atualizar uma mesa
        updated_table_data = {
            "id": "table-1",
            "name": "Mesa 1 (Atualizada)",
            "x": 120,
            "y": 120,
            "width": 100,
            "height": 100,
            "shape": "circle",
            "seats": 6,
        }

        await table_layout_service.update_table(
            layout.id, "table-1", updated_table_data
        )

        # Verificar se a mesa foi atualizada
        updated_layout = await table_layout_service.get_layout(layout.id)
        updated_table = next(
            (t for t in updated_layout.tables if t.id == "table-1"), None
        )
        self.assertIsNotNone(updated_table)
        self.assertEqual(updated_table.name, "Mesa 1 (Atualizada)")
        self.assertEqual(updated_table.seats, 6)

        # 3. Criar um pedido para uma mesa
        from src.order.services.order_service import OrderService

        order_service = OrderService()

        order_data = {
            "customer_id": "test-customer-456",
            "items": [{"product_id": "product-3", "quantity": 1, "unit_price": 30.0}],
            "table_id": "table-1",
            "waiter_id": "waiter-2",
        }

        order = await order_service.create_order(order_data)
        self.assertIsNotNone(order)

        # 4. Verificar se o pedido está associado à mesa
        table_orders = await table_layout_service.get_table_orders("table-1")
        self.assertGreaterEqual(len(table_orders), 1)
        self.assertIn(order.id, [o.id for o in table_orders])

        # 5. Transferir pedido para outra mesa
        await table_layout_service.transfer_order(order.id, "table-1", "table-2")

        # Verificar se o pedido foi transferido
        table1_orders = await table_layout_service.get_table_orders("table-1")
        table2_orders = await table_layout_service.get_table_orders("table-2")

        self.assertNotIn(order.id, [o.id for o in table1_orders])
        self.assertIn(order.id, [o.id for o in table2_orders])

    async def test_split_payment(self):
        """Testa o fluxo de pagamento com split (rateio)."""
        # 1. Configurar split payment
        from src.payment.services.split_payment_service import SplitPaymentService

        split_service = SplitPaymentService()

        split_config_data = {
            "restaurant_id": "restaurant-123",
            "platform_fee_percentage": 5.0,
            "recipients": [
                {
                    "name": "Restaurante Principal",
                    "document": "12345678000190",
                    "bank_account": {
                        "bank_code": "341",
                        "agency": "1234",
                        "account": "56789-0",
                        "account_type": "CHECKING",
                    },
                    "percentage": 95.0,
                }
            ],
            "active": True,
        }

        split_config = await split_service.create_split_config(split_config_data)
        self.assertIsNotNone(split_config)

        # 2. Processar pagamento com split
        from src.payment.services.payment_service import PaymentService

        payment_service = PaymentService()

        # Criar um pedido primeiro
        from src.order.services.order_service import OrderService

        order_service = OrderService()

        order_data = {
            "customer_id": "test-customer-789",
            "items": [{"product_id": "product-4", "quantity": 1, "unit_price": 50.0}],
            "table_id": "table-3",
            "waiter_id": "waiter-3",
        }

        order = await order_service.create_order(order_data)

        # Processar pagamento com split
        payment_data = {
            "order_id": order.id,
            "amount": 50.0,
            "method": "credit_card",
            "card_info": {
                "number": "4111111111111111",
                "expiry": "12/25",
                "cvv": "123",
                "holder_name": "Test User",
            },
            "use_split": True,
            "split_config_id": split_config.id,
        }

        payment = await payment_service.process_payment(payment_data)
        self.assertIsNotNone(payment)
        self.assertEqual(payment.status, "COMPLETED")

        # 3. Verificar detalhes do split
        split_details = await split_service.get_payment_split_details(payment.id)
        self.assertIsNotNone(split_details)

        # Verificar valores
        self.assertEqual(split_details.total_amount, 50.0)
        self.assertEqual(split_details.platform_fee, 2.5)  # 5% de 50.0

        # Verificar destinatário
        self.assertEqual(len(split_details.recipients), 1)
        self.assertEqual(split_details.recipients[0].amount, 47.5)  # 95% de 50.0


def run_end_to_end_tests():
    """Executa os testes end-to-end."""
    # Configurar test suite
    test_suite = unittest.TestSuite()
    test_suite.addTest(unittest.makeSuite(EndToEndTestCase))

    # Configurar runner
    runner = unittest.TextTestRunner(verbosity=2)

    # Executar testes assíncronos
    loop = asyncio.get_event_loop()

    # Executar setup assíncrono
    test_case = EndToEndTestCase()
    loop.run_until_complete(test_case.asyncSetUp())

    # Executar testes
    for test_name in [
        "test_complete_order_flow",
        "test_remote_order_integration",
        "test_waiter_table_layout",
        "test_split_payment",
    ]:
        test_method = getattr(test_case, test_name)
        loop.run_until_complete(test_method())

    # Executar teardown assíncrono
    loop.run_until_complete(test_case.asyncTearDown())

    # Fechar loop
    loop.close()

    return test_case


if __name__ == "__main__":
    print(f"Iniciando testes end-to-end do POS Modern em {datetime.now().isoformat()}")
    print("=" * 80)

    # Executar testes end-to-end
    test_case = run_end_to_end_tests()

    print("=" * 80)
    print(f"Testes end-to-end concluídos em {datetime.now().isoformat()}")
