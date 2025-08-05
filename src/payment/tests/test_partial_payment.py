import unittest
from unittest.mock import patch, MagicMock
import asyncio
from fastapi.testclient import TestClient
from datetime import datetime

from ..models.payment_models import PaymentMethod, PaymentStatus
from ..models.partial_payment_models import (
    PaymentSession, PaymentSessionStatus, PartialPayment,
    BillSplit, BillSplitMethod, BillSplitPart
)
from ..services.partial_payment_service import PaymentSessionService, BillSplitService
from ..services.payment_service import PaymentService
from ..router.partial_payment_router import router

class TestPartialPaymentService(unittest.TestCase):
    """Testes unitários para o serviço de pagamento parcial."""
    
    def setUp(self):
        """Configuração inicial para os testes."""
        self.payment_service = MagicMock(spec=PaymentService)
        self.session_service = PaymentSessionService(self.payment_service)
        self.split_service = BillSplitService(self.session_service)
        
        # Configurar mock para o serviço de pagamento
        self.payment_service.create_payment.return_value = MagicMock(
            id="payment123",
            order_id="order123",
            method=PaymentMethod.PIX,
            amount=50.0,
            status=PaymentStatus.CONFIRMED,
            created_at=datetime.utcnow()
        )
        
        # Criar sessão de teste
        loop = asyncio.get_event_loop()
        self.session = loop.run_until_complete(
            self.session_service.create_session("order123", 100.0)
        )
    
    def test_create_session(self):
        """Testa a criação de uma sessão de pagamento."""
        self.assertEqual(self.session.order_id, "order123")
        self.assertEqual(self.session.total_amount, 100.0)
        self.assertEqual(self.session.paid_amount, 0.0)
        self.assertEqual(self.session.remaining_amount, 100.0)
        self.assertEqual(self.session.status, PaymentSessionStatus.OPEN)
    
    def test_add_partial_payment(self):
        """Testa a adição de um pagamento parcial."""
        loop = asyncio.get_event_loop()
        payment = loop.run_until_complete(
            self.session_service.add_partial_payment(
                self.session.id,
                PaymentMethod.PIX,
                50.0,
                "Cliente Teste"
            )
        )
        
        # Verificar se o pagamento foi criado corretamente
        self.assertEqual(payment.session_id, self.session.id)
        self.assertEqual(payment.amount, 50.0)
        self.assertEqual(payment.method, PaymentMethod.PIX)
        self.assertTrue(payment.is_partial)
        
        # Verificar se a sessão foi atualizada
        updated_session = loop.run_until_complete(
            self.session_service.get_session(self.session.id)
        )
        self.assertEqual(updated_session.paid_amount, 50.0)
        self.assertEqual(updated_session.remaining_amount, 50.0)
    
    def test_create_equal_split(self):
        """Testa a criação de uma divisão igualitária."""
        loop = asyncio.get_event_loop()
        result = loop.run_until_complete(
            self.split_service.create_equal_split(
                self.session.id,
                2,
                ["Pessoa 1", "Pessoa 2"]
            )
        )
        
        # Verificar se a divisão foi criada corretamente
        split = result["split"]
        parts = result["parts"]
        
        self.assertEqual(split.session_id, self.session.id)
        self.assertEqual(split.split_method, BillSplitMethod.EQUAL)
        self.assertEqual(split.number_of_parts, 2)
        
        # Verificar se as partes foram criadas corretamente
        self.assertEqual(len(parts), 2)
        self.assertEqual(parts[0].name, "Pessoa 1")
        self.assertEqual(parts[1].name, "Pessoa 2")
        self.assertEqual(parts[0].amount, 50.0)
        self.assertEqual(parts[1].amount, 50.0)
    
    def test_create_custom_split(self):
        """Testa a criação de uma divisão personalizada."""
        loop = asyncio.get_event_loop()
        result = loop.run_until_complete(
            self.split_service.create_custom_split(
                self.session.id,
                [
                    {"name": "Pessoa 1", "amount": 60.0},
                    {"name": "Pessoa 2", "amount": 40.0}
                ]
            )
        )
        
        # Verificar se a divisão foi criada corretamente
        split = result["split"]
        parts = result["parts"]
        
        self.assertEqual(split.session_id, self.session.id)
        self.assertEqual(split.split_method, BillSplitMethod.CUSTOM)
        self.assertEqual(split.number_of_parts, 2)
        
        # Verificar se as partes foram criadas corretamente
        self.assertEqual(len(parts), 2)
        self.assertEqual(parts[0].name, "Pessoa 1")
        self.assertEqual(parts[1].name, "Pessoa 2")
        self.assertEqual(parts[0].amount, 60.0)
        self.assertEqual(parts[1].amount, 40.0)
    
    def test_pay_split_part(self):
        """Testa o pagamento de uma parte da divisão."""
        loop = asyncio.get_event_loop()
        
        # Criar divisão
        result = loop.run_until_complete(
            self.split_service.create_equal_split(
                self.session.id,
                2,
                ["Pessoa 1", "Pessoa 2"]
            )
        )
        
        parts = result["parts"]
        
        # Pagar uma parte
        payment_result = loop.run_until_complete(
            self.split_service.pay_split_part(
                parts[0].id,
                PaymentMethod.PIX,
                "Pessoa 1"
            )
        )
        
        # Verificar se a parte foi marcada como paga
        self.assertTrue(payment_result["part"].is_paid)
        self.assertIsNotNone(payment_result["part"].payment_id)
        
        # Verificar se a sessão foi atualizada
        self.assertEqual(payment_result["session"].paid_amount, 50.0)
        self.assertEqual(payment_result["session"].remaining_amount, 50.0)


class TestPartialPaymentAPI(unittest.TestCase):
    """Testes de integração para a API de pagamento parcial."""
    
    @patch('fastapi.Depends')
    def setUp(self, mock_depends):
        """Configuração inicial para os testes."""
        self.client = TestClient(router)
        
        # Mock para os serviços
        self.payment_service = MagicMock(spec=PaymentService)
        self.session_service = MagicMock(spec=PaymentSessionService)
        self.split_service = MagicMock(spec=BillSplitService)
        
        # Configurar retornos dos mocks
        self.session_service.create_session.return_value = PaymentSession(
            id="session123",
            order_id="order123",
            total_amount=100.0,
            paid_amount=0.0,
            remaining_amount=100.0,
            status=PaymentSessionStatus.OPEN
        )
        
        self.session_service.get_session.return_value = PaymentSession(
            id="session123",
            order_id="order123",
            total_amount=100.0,
            paid_amount=0.0,
            remaining_amount=100.0,
            status=PaymentSessionStatus.OPEN
        )
        
        self.session_service.get_payments_by_session.return_value = []
        
        # Configurar dependências
        mock_depends.side_effect = lambda x: {
            get_payment_service: self.payment_service,
            get_session_service: self.session_service,
            get_split_service: self.split_service
        }.get(x, x)
    
    def test_create_payment_session(self):
        """Testa a criação de uma sessão de pagamento via API."""
        response = self.client.post(
            "/payment/partial/sessions",
            json={"order_id": "order123", "total_amount": 100.0}
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["session"]["order_id"], "order123")
        self.assertEqual(data["session"]["total_amount"], 100.0)
    
    def test_get_payment_session(self):
        """Testa a obtenção de uma sessão de pagamento via API."""
        response = self.client.get("/payment/partial/sessions/session123")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["session"]["id"], "session123")
        self.assertEqual(data["session"]["order_id"], "order123")
    
    def test_add_partial_payment(self):
        """Testa a adição de um pagamento parcial via API."""
        # Configurar mock para adicionar pagamento
        self.session_service.add_partial_payment.return_value = PartialPayment(
            id="payment123",
            order_id="order123",
            session_id="session123",
            method=PaymentMethod.PIX,
            amount=50.0,
            status=PaymentStatus.CONFIRMED,
            created_at=datetime.utcnow(),
            is_partial=True,
            percentage_of_total=50.0
        )
        
        # Configurar mock para obter sessão atualizada
        self.session_service.get_session.return_value = PaymentSession(
            id="session123",
            order_id="order123",
            total_amount=100.0,
            paid_amount=50.0,
            remaining_amount=50.0,
            status=PaymentSessionStatus.OPEN
        )
        
        response = self.client.post(
            "/payment/partial/payments",
            json={
                "session_id": "session123",
                "method": "pix",
                "amount": 50.0,
                "customer_name": "Cliente Teste"
            }
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["payment"]["id"], "payment123")
        self.assertEqual(data["payment"]["amount"], 50.0)
        self.assertEqual(data["session"]["paid_amount"], 50.0)
        self.assertEqual(data["session"]["remaining_amount"], 50.0)
    
    def test_create_equal_split(self):
        """Testa a criação de uma divisão igualitária via API."""
        # Configurar mock para criar divisão
        split = BillSplit(
            id="split123",
            session_id="session123",
            split_method=BillSplitMethod.EQUAL,
            number_of_parts=2
        )
        
        parts = [
            BillSplitPart(
                id=f"part{i}",
                split_id="split123",
                name=f"Pessoa {i+1}",
                amount=50.0
            )
            for i in range(2)
        ]
        
        self.split_service.create_equal_split.return_value = {
            "split": split,
            "parts": parts,
            "amount_per_part": 50.0
        }
        
        response = self.client.post(
            "/payment/partial/splits/equal",
            json={
                "session_id": "session123",
                "number_of_parts": 2,
                "names": ["Pessoa 1", "Pessoa 2"]
            }
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["split"]["id"], "split123")
        self.assertEqual(len(data["parts"]), 2)
        self.assertEqual(data["amount_per_part"], 50.0)


if __name__ == '__main__':
    unittest.main()
