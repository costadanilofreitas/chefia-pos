import unittest
import asyncio

from src.delivery.models.delivery_models import (
    DeliveryOrderStatus,
    CourierStatus,
    CourierType,
    TrackingEventType,
)
from src.delivery.services.delivery_service import (
    delivery_service,
    courier_service,
    zone_service,
)


class TestDeliveryService(unittest.TestCase):
    """Testes para o serviço de delivery."""

    def setUp(self):
        """Configuração inicial para os testes."""
        # Limpar dados de teste
        delivery_service.delivery_orders = {}
        courier_service.couriers = {}
        zone_service.zones = {}

        # Criar zona de teste
        self.test_zone = asyncio.run(
            zone_service.create_zone(
                name="Zona Teste",
                base_fee=5.0,
                min_delivery_time=20,
                max_delivery_time=40,
                polygon=[
                    {"lat": 0, "lng": 0},
                    {"lat": 0, "lng": 1},
                    {"lat": 1, "lng": 1},
                    {"lat": 1, "lng": 0},
                ],
            )
        )

        # Criar entregador de teste
        self.test_courier = asyncio.run(
            courier_service.create_courier(
                name="Entregador Teste",
                phone="11999999999",
                vehicle_type="moto",
                courier_type=CourierType.EMPLOYEE,
            )
        )

    def test_create_delivery_order(self):
        """Testa a criação de um pedido de delivery."""
        # Criar pedido
        delivery_order = asyncio.run(
            delivery_service.create_delivery_order(
                order_id="order123",
                customer_id="customer456",
                address_id="address789",
                delivery_fee=10.0,
            )
        )

        # Verificar se o pedido foi criado corretamente
        self.assertIsNotNone(delivery_order)
        self.assertEqual(delivery_order.order_id, "order123")
        self.assertEqual(delivery_order.customer_id, "customer456")
        self.assertEqual(delivery_order.address_id, "address789")
        self.assertEqual(delivery_order.delivery_fee, 10.0)
        self.assertEqual(delivery_order.status, DeliveryOrderStatus.PENDING)

        # Verificar se o pedido foi armazenado
        self.assertIn(delivery_order.id, delivery_service.delivery_orders)

    def test_assign_courier(self):
        """Testa a atribuição de um entregador a um pedido."""
        # Criar pedido
        delivery_order = asyncio.run(
            delivery_service.create_delivery_order(
                order_id="order123",
                customer_id="customer456",
                address_id="address789",
                delivery_fee=10.0,
            )
        )

        # Atribuir entregador
        updated_order = asyncio.run(
            delivery_service.assign_courier(
                delivery_order_id=delivery_order.id, courier_id=self.test_courier.id
            )
        )

        # Verificar se o pedido foi atualizado corretamente
        self.assertEqual(updated_order.courier_id, self.test_courier.id)
        self.assertEqual(updated_order.status, DeliveryOrderStatus.ASSIGNED)

        # Verificar se o entregador foi atualizado
        courier = asyncio.run(courier_service.get_courier(self.test_courier.id))
        self.assertEqual(courier.status, CourierStatus.BUSY)

    def test_update_order_status(self):
        """Testa a atualização de status de um pedido."""
        # Criar pedido
        delivery_order = asyncio.run(
            delivery_service.create_delivery_order(
                order_id="order123",
                customer_id="customer456",
                address_id="address789",
                delivery_fee=10.0,
            )
        )

        # Atualizar status
        updated_order = asyncio.run(
            delivery_service.update_order_status(
                delivery_order_id=delivery_order.id,
                status=DeliveryOrderStatus.PREPARING,
                notes="Pedido em preparação",
            )
        )

        # Verificar se o status foi atualizado
        self.assertEqual(updated_order.status, DeliveryOrderStatus.PREPARING)

        # Atualizar para entregue
        updated_order = asyncio.run(
            delivery_service.update_order_status(
                delivery_order_id=delivery_order.id,
                status=DeliveryOrderStatus.DELIVERED,
                notes="Pedido entregue",
            )
        )

        # Verificar se o horário de entrega foi registrado
        self.assertIsNotNone(updated_order.actual_delivery_time)

    def test_calculate_delivery_fee(self):
        """Testa o cálculo de taxa de entrega."""
        # Calcular taxa
        fee = asyncio.run(
            delivery_service.calculate_delivery_fee(
                address_id="address789", order_value=50.0
            )
        )

        # Verificar se a taxa foi calculada corretamente
        self.assertEqual(fee, 5.0)  # Taxa base da zona de teste

        # Calcular taxa para pedido abaixo do valor mínimo
        # Configurar valor mínimo na zona
        asyncio.run(
            zone_service.update_zone(
                zone_id=self.test_zone.id, data={"min_order_value": 30.0}
            )
        )

        fee = asyncio.run(
            delivery_service.calculate_delivery_fee(
                address_id="address789", order_value=20.0
            )
        )

        # Verificar se a taxa adicional foi aplicada
        self.assertEqual(fee, 10.0)  # Taxa base + taxa adicional

    def test_estimate_delivery_time(self):
        """Testa a estimativa de tempo de entrega."""
        # Estimar tempo
        time = asyncio.run(
            delivery_service.estimate_delivery_time(address_id="address789")
        )

        # Verificar se o tempo foi estimado corretamente
        self.assertEqual(time, 45)  # (20 + 40) / 2 + 15 (tempo de preparo)

    def test_get_tracking_history(self):
        """Testa a obtenção do histórico de rastreamento."""
        # Criar pedido
        delivery_order = asyncio.run(
            delivery_service.create_delivery_order(
                order_id="order123",
                customer_id="customer456",
                address_id="address789",
                delivery_fee=10.0,
            )
        )

        # Atualizar status
        asyncio.run(
            delivery_service.update_order_status(
                delivery_order_id=delivery_order.id,
                status=DeliveryOrderStatus.PREPARING,
                notes="Pedido em preparação",
            )
        )

        # Obter histórico
        history = asyncio.run(
            delivery_service.get_tracking_history(delivery_order_id=delivery_order.id)
        )

        # Verificar se o histórico foi obtido corretamente
        self.assertGreaterEqual(len(history), 2)  # Pelo menos criação e preparação
        self.assertEqual(history[0].event_type, TrackingEventType.ORDER_CREATED)
        self.assertEqual(history[1].event_type, TrackingEventType.ORDER_ASSIGNED)


class TestCourierService(unittest.TestCase):
    """Testes para o serviço de entregadores."""

    def setUp(self):
        """Configuração inicial para os testes."""
        # Limpar dados de teste
        courier_service.couriers = {}

    def test_create_courier(self):
        """Testa a criação de um entregador."""
        # Criar entregador
        courier = asyncio.run(
            courier_service.create_courier(
                name="Entregador Teste",
                phone="11999999999",
                vehicle_type="moto",
                courier_type=CourierType.EMPLOYEE,
            )
        )

        # Verificar se o entregador foi criado corretamente
        self.assertIsNotNone(courier)
        self.assertEqual(courier.name, "Entregador Teste")
        self.assertEqual(courier.phone, "11999999999")
        self.assertEqual(courier.vehicle_type, "moto")
        self.assertEqual(courier.courier_type, CourierType.EMPLOYEE)
        self.assertEqual(courier.status, CourierStatus.AVAILABLE)

        # Verificar se o entregador foi armazenado
        self.assertIn(courier.id, courier_service.couriers)

    def test_update_courier_status(self):
        """Testa a atualização de status de um entregador."""
        # Criar entregador
        courier = asyncio.run(
            courier_service.create_courier(
                name="Entregador Teste",
                phone="11999999999",
                vehicle_type="moto",
                courier_type=CourierType.EMPLOYEE,
            )
        )

        # Atualizar status
        updated_courier = asyncio.run(
            courier_service.update_courier_status(
                courier_id=courier.id, status=CourierStatus.BUSY
            )
        )

        # Verificar se o status foi atualizado
        self.assertEqual(updated_courier.status, CourierStatus.BUSY)
        self.assertEqual(updated_courier.current_deliveries, 1)

        # Atualizar para disponível
        updated_courier = asyncio.run(
            courier_service.update_courier_after_delivery(courier_id=courier.id)
        )

        # Verificar se o status foi atualizado
        self.assertEqual(updated_courier.status, CourierStatus.AVAILABLE)
        self.assertEqual(updated_courier.current_deliveries, 0)

    def test_update_courier_location(self):
        """Testa a atualização de localização de um entregador."""
        # Criar entregador
        courier = asyncio.run(
            courier_service.create_courier(
                name="Entregador Teste",
                phone="11999999999",
                vehicle_type="moto",
                courier_type=CourierType.EMPLOYEE,
            )
        )

        # Atualizar localização
        location = {"lat": 10.0, "lng": 20.0}
        updated_courier = asyncio.run(
            courier_service.update_courier_location(
                courier_id=courier.id, location=location
            )
        )

        # Verificar se a localização foi atualizada
        self.assertEqual(updated_courier.current_location, location)

    def test_list_couriers(self):
        """Testa a listagem de entregadores."""
        # Criar entregadores
        courier1 = asyncio.run(
            courier_service.create_courier(
                name="Entregador 1",
                phone="11999999991",
                vehicle_type="moto",
                courier_type=CourierType.EMPLOYEE,
            )
        )

        courier2 = asyncio.run(
            courier_service.create_courier(
                name="Entregador 2",
                phone="11999999992",
                vehicle_type="carro",
                courier_type=CourierType.FREELANCER,
            )
        )

        # Atualizar status do segundo entregador
        asyncio.run(
            courier_service.update_courier_status(
                courier_id=courier2.id, status=CourierStatus.BUSY
            )
        )

        # Listar todos os entregadores
        couriers = asyncio.run(courier_service.list_couriers())
        self.assertEqual(len(couriers), 2)

        # Listar apenas entregadores disponíveis
        available_couriers = asyncio.run(
            courier_service.list_couriers(status=CourierStatus.AVAILABLE)
        )
        self.assertEqual(len(available_couriers), 1)
        self.assertEqual(available_couriers[0].id, courier1.id)

        # Listar apenas entregadores freelancers
        freelance_couriers = asyncio.run(
            courier_service.list_couriers(courier_type=CourierType.FREELANCER)
        )
        self.assertEqual(len(freelance_couriers), 1)
        self.assertEqual(freelance_couriers[0].id, courier2.id)


class TestZoneService(unittest.TestCase):
    """Testes para o serviço de zonas de entrega."""

    def setUp(self):
        """Configuração inicial para os testes."""
        # Limpar dados de teste
        zone_service.zones = {}

    def test_create_zone(self):
        """Testa a criação de uma zona de entrega."""
        # Criar zona
        zone = asyncio.run(
            zone_service.create_zone(
                name="Zona Teste",
                base_fee=5.0,
                min_delivery_time=20,
                max_delivery_time=40,
                polygon=[
                    {"lat": 0, "lng": 0},
                    {"lat": 0, "lng": 1},
                    {"lat": 1, "lng": 1},
                    {"lat": 1, "lng": 0},
                ],
            )
        )

        # Verificar se a zona foi criada corretamente
        self.assertIsNotNone(zone)
        self.assertEqual(zone.name, "Zona Teste")
        self.assertEqual(zone.base_fee, 5.0)
        self.assertEqual(zone.min_delivery_time, 20)
        self.assertEqual(zone.max_delivery_time, 40)
        self.assertEqual(len(zone.polygon), 4)

        # Verificar se a zona foi armazenada
        self.assertIn(zone.id, zone_service.zones)

    def test_update_zone(self):
        """Testa a atualização de uma zona de entrega."""
        # Criar zona
        zone = asyncio.run(
            zone_service.create_zone(
                name="Zona Teste",
                base_fee=5.0,
                min_delivery_time=20,
                max_delivery_time=40,
                polygon=[
                    {"lat": 0, "lng": 0},
                    {"lat": 0, "lng": 1},
                    {"lat": 1, "lng": 1},
                    {"lat": 1, "lng": 0},
                ],
            )
        )

        # Atualizar zona
        updated_zone = asyncio.run(
            zone_service.update_zone(
                zone_id=zone.id,
                data={
                    "name": "Zona Atualizada",
                    "base_fee": 7.5,
                    "min_order_value": 30.0,
                },
            )
        )

        # Verificar se a zona foi atualizada corretamente
        self.assertEqual(updated_zone.name, "Zona Atualizada")
        self.assertEqual(updated_zone.base_fee, 7.5)
        self.assertEqual(updated_zone.min_order_value, 30.0)

        # Verificar se os campos não atualizados permaneceram iguais
        self.assertEqual(updated_zone.min_delivery_time, 20)
        self.assertEqual(updated_zone.max_delivery_time, 40)

    def test_list_zones(self):
        """Testa a listagem de zonas de entrega."""
        # Criar zonas
        zone1 = asyncio.run(
            zone_service.create_zone(
                name="Zona 1",
                base_fee=5.0,
                min_delivery_time=20,
                max_delivery_time=40,
                polygon=[
                    {"lat": 0, "lng": 0},
                    {"lat": 0, "lng": 1},
                    {"lat": 1, "lng": 1},
                    {"lat": 1, "lng": 0},
                ],
            )
        )

        zone2 = asyncio.run(
            zone_service.create_zone(
                name="Zona 2",
                base_fee=7.0,
                min_delivery_time=30,
                max_delivery_time=50,
                polygon=[
                    {"lat": 2, "lng": 2},
                    {"lat": 2, "lng": 3},
                    {"lat": 3, "lng": 3},
                    {"lat": 3, "lng": 2},
                ],
            )
        )

        # Desativar a segunda zona
        asyncio.run(
            zone_service.update_zone(zone_id=zone2.id, data={"is_active": False})
        )

        # Listar todas as zonas ativas
        zones = asyncio.run(zone_service.list_zones())
        self.assertEqual(len(zones), 1)
        self.assertEqual(zones[0].id, zone1.id)

        # Listar todas as zonas (ativas e inativas)
        all_zones = asyncio.run(zone_service.list_zones(is_active=False))
        self.assertEqual(len(all_zones), 2)

    def test_get_zone_for_address(self):
        """Testa a obtenção de zona para um endereço."""
        # Criar zona
        zone = asyncio.run(
            zone_service.create_zone(
                name="Zona Teste",
                base_fee=5.0,
                min_delivery_time=20,
                max_delivery_time=40,
                polygon=[
                    {"lat": 0, "lng": 0},
                    {"lat": 0, "lng": 1},
                    {"lat": 1, "lng": 1},
                    {"lat": 1, "lng": 0},
                ],
            )
        )

        # Obter zona para um endereço
        address_zone = asyncio.run(zone_service.get_zone_for_address("address123"))

        # Verificar se a zona foi obtida corretamente
        self.assertIsNotNone(address_zone)
        self.assertEqual(address_zone.id, zone.id)

    def test_check_address_deliverable(self):
        """Testa a verificação se um endereço está em uma zona de entrega."""
        # Criar zona
        zone = asyncio.run(
            zone_service.create_zone(
                name="Zona Teste",
                base_fee=5.0,
                min_delivery_time=20,
                max_delivery_time=40,
                polygon=[
                    {"lat": 0, "lng": 0},
                    {"lat": 0, "lng": 1},
                    {"lat": 1, "lng": 1},
                    {"lat": 1, "lng": 0},
                ],
            )
        )

        # Verificar se um endereço está em uma zona de entrega
        is_deliverable = asyncio.run(
            zone_service.check_address_deliverable("address123")
        )

        # Verificar se o resultado está correto
        self.assertTrue(is_deliverable)


if __name__ == "__main__":
    unittest.main()
