import unittest
from unittest.mock import patch, MagicMock
import asyncio
from fastapi.testclient import TestClient

from ..models.seat_models import (
    Seat,
    SeatStatus,
    SeatCreate,
    SeatUpdate,
    SeatOrderItemCreate,
    SeatPaymentCreate,
)
from ..services.seat_service import SeatService, SeatOrderService, SeatPaymentService
from ..services.partial_payment_service import PaymentSessionService, BillSplitService
from ..router.seat_router import router


class TestSeatService(unittest.TestCase):
    """Testes unitários para o serviço de assentos."""

    def setUp(self):
        """Configuração inicial para os testes."""
        self.seat_service = SeatService()

        # Criar alguns assentos para teste
        loop = asyncio.get_event_loop()
        self.seat1 = loop.run_until_complete(
            self.seat_service.create_seat(
                SeatCreate(table_id="table123", number=1, name="Assento 1")
            )
        )
        self.seat2 = loop.run_until_complete(
            self.seat_service.create_seat(
                SeatCreate(table_id="table123", number=2, name="Assento 2")
            )
        )

    def test_create_seat(self):
        """Testa a criação de um assento."""
        loop = asyncio.get_event_loop()
        seat = loop.run_until_complete(
            self.seat_service.create_seat(
                SeatCreate(table_id="table123", number=3, name="Assento 3")
            )
        )

        self.assertEqual(seat.table_id, "table123")
        self.assertEqual(seat.number, 3)
        self.assertEqual(seat.name, "Assento 3")
        self.assertEqual(seat.status, SeatStatus.AVAILABLE)

    def test_get_seat(self):
        """Testa a obtenção de um assento pelo ID."""
        loop = asyncio.get_event_loop()
        seat = loop.run_until_complete(self.seat_service.get_seat(self.seat1.id))

        self.assertEqual(seat.id, self.seat1.id)
        self.assertEqual(seat.name, "Assento 1")

    def test_get_seats_by_table(self):
        """Testa a obtenção de assentos por mesa."""
        loop = asyncio.get_event_loop()
        seats = loop.run_until_complete(
            self.seat_service.get_seats_by_table("table123")
        )

        self.assertEqual(len(seats), 2)
        self.assertEqual(seats[0].table_id, "table123")
        self.assertEqual(seats[1].table_id, "table123")

    def test_update_seat(self):
        """Testa a atualização de um assento."""
        loop = asyncio.get_event_loop()
        updated_seat = loop.run_until_complete(
            self.seat_service.update_seat(
                self.seat1.id,
                SeatUpdate(name="Assento Atualizado", status=SeatStatus.OCCUPIED),
            )
        )

        self.assertEqual(updated_seat.id, self.seat1.id)
        self.assertEqual(updated_seat.name, "Assento Atualizado")
        self.assertEqual(updated_seat.status, SeatStatus.OCCUPIED)

    def test_delete_seat(self):
        """Testa a remoção de um assento."""
        loop = asyncio.get_event_loop()

        # Criar um assento para remover
        seat = loop.run_until_complete(
            self.seat_service.create_seat(
                SeatCreate(table_id="table123", number=4, name="Assento para Remover")
            )
        )

        # Remover o assento
        loop.run_until_complete(self.seat_service.delete_seat(seat.id))

        # Verificar se o assento foi removido
        with self.assertRaises(Exception):
            loop.run_until_complete(self.seat_service.get_seat(seat.id))


class TestSeatOrderService(unittest.TestCase):
    """Testes unitários para o serviço de associação de itens a assentos."""

    def setUp(self):
        """Configuração inicial para os testes."""
        self.seat_service = SeatService()
        self.seat_order_service = SeatOrderService(self.seat_service)

        # Criar alguns assentos para teste
        loop = asyncio.get_event_loop()
        self.seat1 = loop.run_until_complete(
            self.seat_service.create_seat(
                SeatCreate(table_id="table123", number=1, name="Assento 1")
            )
        )

    def test_assign_item_to_seat(self):
        """Testa a associação de um item a um assento."""
        loop = asyncio.get_event_loop()
        item = loop.run_until_complete(
            self.seat_order_service.assign_item_to_seat(
                SeatOrderItemCreate(
                    order_item_id="item123", seat_id=self.seat1.id, quantity=2
                )
            )
        )

        self.assertEqual(item.order_item_id, "item123")
        self.assertEqual(item.seat_id, self.seat1.id)
        self.assertEqual(item.quantity, 2)

    def test_get_items_by_seat(self):
        """Testa a obtenção de itens por assento."""
        loop = asyncio.get_event_loop()

        # Associar alguns itens ao assento
        loop.run_until_complete(
            self.seat_order_service.assign_item_to_seat(
                SeatOrderItemCreate(
                    order_item_id="item123", seat_id=self.seat1.id, quantity=2
                )
            )
        )
        loop.run_until_complete(
            self.seat_order_service.assign_item_to_seat(
                SeatOrderItemCreate(
                    order_item_id="item456", seat_id=self.seat1.id, quantity=1
                )
            )
        )

        # Obter itens do assento
        items = loop.run_until_complete(
            self.seat_order_service.get_items_by_seat(self.seat1.id)
        )

        self.assertEqual(len(items), 2)
        self.assertEqual(items[0].order_item_id, "item123")
        self.assertEqual(items[1].order_item_id, "item456")

    def test_get_seats_by_item(self):
        """Testa a obtenção de assentos por item."""
        loop = asyncio.get_event_loop()

        # Criar outro assento
        seat2 = loop.run_until_complete(
            self.seat_service.create_seat(
                SeatCreate(table_id="table123", number=2, name="Assento 2")
            )
        )

        # Associar o mesmo item a ambos os assentos
        loop.run_until_complete(
            self.seat_order_service.assign_item_to_seat(
                SeatOrderItemCreate(
                    order_item_id="item789", seat_id=self.seat1.id, quantity=1
                )
            )
        )
        loop.run_until_complete(
            self.seat_order_service.assign_item_to_seat(
                SeatOrderItemCreate(
                    order_item_id="item789", seat_id=seat2.id, quantity=1
                )
            )
        )

        # Obter assentos do item
        items = loop.run_until_complete(
            self.seat_order_service.get_seats_by_item("item789")
        )

        self.assertEqual(len(items), 2)
        self.assertEqual(items[0].seat_id, self.seat1.id)
        self.assertEqual(items[1].seat_id, seat2.id)

    def test_remove_item_from_seat(self):
        """Testa a remoção de um item de um assento."""
        loop = asyncio.get_event_loop()

        # Associar item ao assento
        loop.run_until_complete(
            self.seat_order_service.assign_item_to_seat(
                SeatOrderItemCreate(
                    order_item_id="item123", seat_id=self.seat1.id, quantity=2
                )
            )
        )

        # Remover item do assento
        loop.run_until_complete(
            self.seat_order_service.remove_item_from_seat(self.seat1.id, "item123")
        )

        # Verificar se o item foi removido
        items = loop.run_until_complete(
            self.seat_order_service.get_items_by_seat(self.seat1.id)
        )

        self.assertEqual(len(items), 0)


class TestSeatPaymentService(unittest.TestCase):
    """Testes unitários para o serviço de pagamentos por assento."""

    def setUp(self):
        """Configuração inicial para os testes."""
        self.seat_service = SeatService()
        self.payment_service = MagicMock()
        self.session_service = MagicMock(spec=PaymentSessionService)
        self.split_service = MagicMock(spec=BillSplitService)
        self.seat_payment_service = SeatPaymentService(
            self.seat_service, self.session_service, self.split_service
        )

        # Criar alguns assentos para teste
        loop = asyncio.get_event_loop()
        self.seat1 = loop.run_until_complete(
            self.seat_service.create_seat(
                SeatCreate(table_id="table123", number=1, name="Assento 1")
            )
        )

    def test_create_seat_payment(self):
        """Testa a associação de um pagamento a um assento."""
        loop = asyncio.get_event_loop()
        payment = loop.run_until_complete(
            self.seat_payment_service.create_seat_payment(
                SeatPaymentCreate(
                    payment_id="payment123", seat_id=self.seat1.id, amount=50.0
                )
            )
        )

        self.assertEqual(payment.payment_id, "payment123")
        self.assertEqual(payment.seat_id, self.seat1.id)
        self.assertEqual(payment.amount, 50.0)

    def test_get_payments_by_seat(self):
        """Testa a obtenção de pagamentos por assento."""
        loop = asyncio.get_event_loop()

        # Associar alguns pagamentos ao assento
        loop.run_until_complete(
            self.seat_payment_service.create_seat_payment(
                SeatPaymentCreate(
                    payment_id="payment123", seat_id=self.seat1.id, amount=50.0
                )
            )
        )
        loop.run_until_complete(
            self.seat_payment_service.create_seat_payment(
                SeatPaymentCreate(
                    payment_id="payment456", seat_id=self.seat1.id, amount=25.0
                )
            )
        )

        # Obter pagamentos do assento
        payments = loop.run_until_complete(
            self.seat_payment_service.get_payments_by_seat(self.seat1.id)
        )

        self.assertEqual(len(payments), 2)
        self.assertEqual(payments[0].payment_id, "payment123")
        self.assertEqual(payments[1].payment_id, "payment456")

    def test_create_seat_group(self):
        """Testa a criação de um grupo de assentos."""
        loop = asyncio.get_event_loop()

        # Criar outro assento
        seat2 = loop.run_until_complete(
            self.seat_service.create_seat(
                SeatCreate(table_id="table123", number=2, name="Assento 2")
            )
        )

        # Criar grupo
        group = loop.run_until_complete(
            self.seat_payment_service.create_seat_group(
                {"name": "Grupo de Teste", "seat_ids": [self.seat1.id, seat2.id]}
            )
        )

        self.assertEqual(group.name, "Grupo de Teste")
        self.assertEqual(len(group.seat_ids), 2)
        self.assertIn(self.seat1.id, group.seat_ids)
        self.assertIn(seat2.id, group.seat_ids)


class TestSeatAPI(unittest.TestCase):
    """Testes de integração para a API de assentos."""

    @patch("fastapi.Depends")
    def setUp(self, mock_depends):
        """Configuração inicial para os testes."""
        self.client = TestClient(router)

        # Mock para os serviços
        self.seat_service = MagicMock(spec=SeatService)
        self.seat_order_service = MagicMock(spec=SeatOrderService)
        self.seat_payment_service = MagicMock(spec=SeatPaymentService)

        # Configurar retornos dos mocks
        self.seat_service.create_seat.return_value = Seat(
            id="seat123",
            table_id="table123",
            number=1,
            name="Assento 1",
            status=SeatStatus.AVAILABLE,
        )

        self.seat_service.get_seat.return_value = Seat(
            id="seat123",
            table_id="table123",
            number=1,
            name="Assento 1",
            status=SeatStatus.AVAILABLE,
        )

        self.seat_service.get_seats_by_table.return_value = [
            Seat(
                id="seat123",
                table_id="table123",
                number=1,
                name="Assento 1",
                status=SeatStatus.AVAILABLE,
            ),
            Seat(
                id="seat456",
                table_id="table123",
                number=2,
                name="Assento 2",
                status=SeatStatus.OCCUPIED,
            ),
        ]

        # Configurar dependências
        mock_depends.side_effect = lambda x: {
            get_seat_service: self.seat_service,
            get_seat_order_service: self.seat_order_service,
            get_seat_payment_service: self.seat_payment_service,
        }.get(x, x)

    def test_create_seat(self):
        """Testa a criação de um assento via API."""
        response = self.client.post(
            "/payment/seats/",
            json={"table_id": "table123", "number": 1, "name": "Assento 1"},
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["seat"]["id"], "seat123")
        self.assertEqual(data["seat"]["name"], "Assento 1")

    def test_get_seat(self):
        """Testa a obtenção de um assento via API."""
        response = self.client.get("/payment/seats/seat123")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["seat"]["id"], "seat123")
        self.assertEqual(data["seat"]["name"], "Assento 1")

    def test_get_seats_by_table(self):
        """Testa a obtenção de assentos por mesa via API."""
        response = self.client.get("/payment/seats/table/table123")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["seats"]), 2)
        self.assertEqual(data["seats"][0]["id"], "seat123")
        self.assertEqual(data["seats"][1]["id"], "seat456")


if __name__ == "__main__":
    unittest.main()
