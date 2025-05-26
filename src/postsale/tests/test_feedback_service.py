import unittest
from unittest.mock import patch, MagicMock
import json
import asyncio
from datetime import datetime, timedelta

from ..models.feedback_models import (
    Feedback, FeedbackRequest, Benefit, CustomerBenefit,
    FeedbackCreate, FeedbackRequestCreate, BenefitCreate, CustomerBenefitCreate
)
from ..services.feedback_service import FeedbackService, BenefitService, NotificationService


class TestFeedbackService(unittest.TestCase):
    """Testes para o serviço de feedback."""
    
    def setUp(self):
        """Configuração para cada teste."""
        # Mock do repositório
        self.repo_mock = MagicMock()
        self.feedback_service = FeedbackService(repository=self.repo_mock)
        
    @patch('uuid.uuid4', return_value=MagicMock(hex='test-uuid'))
    async def test_create_feedback(self, mock_uuid):
        """Testa a criação de um feedback."""
        # Dados de teste
        feedback_data = FeedbackCreate(
            order_id="order-123",
            restaurant_id="restaurant-456",
            customer_id="customer-789",
            customer_name="João Silva",
            customer_email="joao@example.com",
            customer_phone="+5511999999999",
            overall_rating=5,
            category_ratings={
                "food_quality": 5,
                "service": 4,
                "ambience": 5,
                "price": 4,
                "cleanliness": 5
            },
            comment="Excelente experiência!",
            photos=["data:image/jpeg;base64,/9j/..."],
            source="web"
        )
        
        # Mock do método de repositório
        self.repo_mock.create_feedback.return_value = Feedback(
            id="test-uuid",
            order_id=feedback_data.order_id,
            restaurant_id=feedback_data.restaurant_id,
            customer_id=feedback_data.customer_id,
            customer_name=feedback_data.customer_name,
            customer_email=feedback_data.customer_email,
            customer_phone=feedback_data.customer_phone,
            overall_rating=feedback_data.overall_rating,
            category_ratings=feedback_data.category_ratings,
            comment=feedback_data.comment,
            photos=feedback_data.photos,
            source=feedback_data.source,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Executar método
        result = await self.feedback_service.create_feedback(feedback_data)
        
        # Verificar resultado
        self.assertEqual(result.id, "test-uuid")
        self.assertEqual(result.order_id, feedback_data.order_id)
        self.assertEqual(result.overall_rating, feedback_data.overall_rating)
        
        # Verificar se o método do repositório foi chamado corretamente
        self.repo_mock.create_feedback.assert_called_once()
    
    async def test_get_feedback(self):
        """Testa a obtenção de um feedback pelo ID."""
        # Mock do feedback
        mock_feedback = Feedback(
            id="feedback-123",
            order_id="order-123",
            restaurant_id="restaurant-456",
            customer_id="customer-789",
            customer_name="João Silva",
            customer_email="joao@example.com",
            customer_phone="+5511999999999",
            overall_rating=5,
            category_ratings={
                "food_quality": 5,
                "service": 4,
                "ambience": 5,
                "price": 4,
                "cleanliness": 5
            },
            comment="Excelente experiência!",
            photos=["data:image/jpeg;base64,/9j/..."],
            source="web",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Mock do método de repositório
        self.repo_mock.get_feedback.return_value = mock_feedback
        
        # Executar método
        result = await self.feedback_service.get_feedback("feedback-123")
        
        # Verificar resultado
        self.assertEqual(result.id, "feedback-123")
        
        # Verificar se o método do repositório foi chamado corretamente
        self.repo_mock.get_feedback.assert_called_once_with("feedback-123")
    
    async def test_get_feedbacks_by_restaurant(self):
        """Testa a obtenção de feedbacks por restaurante."""
        # Mock dos feedbacks
        mock_feedbacks = [
            Feedback(
                id="feedback-123",
                order_id="order-123",
                restaurant_id="restaurant-456",
                customer_id="customer-789",
                customer_name="João Silva",
                customer_email="joao@example.com",
                customer_phone="+5511999999999",
                overall_rating=5,
                category_ratings={
                    "food_quality": 5,
                    "service": 4,
                    "ambience": 5,
                    "price": 4,
                    "cleanliness": 5
                },
                comment="Excelente experiência!",
                photos=["data:image/jpeg;base64,/9j/..."],
                source="web",
                created_at=datetime.now(),
                updated_at=datetime.now()
            ),
            Feedback(
                id="feedback-456",
                order_id="order-456",
                restaurant_id="restaurant-456",
                customer_id="customer-123",
                customer_name="Maria Souza",
                customer_email="maria@example.com",
                customer_phone="+5511888888888",
                overall_rating=4,
                category_ratings={
                    "food_quality": 4,
                    "service": 3,
                    "ambience": 5,
                    "price": 3,
                    "cleanliness": 4
                },
                comment="Boa experiência, mas o atendimento poderia ser melhor.",
                photos=[],
                source="web",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
        ]
        
        # Mock do método de repositório
        self.repo_mock.get_feedbacks_by_restaurant.return_value = mock_feedbacks
        
        # Parâmetros de teste
        restaurant_id = "restaurant-456"
        start_date = datetime.now() - timedelta(days=30)
        end_date = datetime.now()
        min_rating = 3
        max_rating = 5
        limit = 10
        offset = 0
        
        # Executar método
        result = await self.feedback_service.get_feedbacks_by_restaurant(
            restaurant_id=restaurant_id,
            start_date=start_date,
            end_date=end_date,
            min_rating=min_rating,
            max_rating=max_rating,
            limit=limit,
            offset=offset
        )
        
        # Verificar resultado
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0].id, "feedback-123")
        self.assertEqual(result[1].id, "feedback-456")
        
        # Verificar se o método do repositório foi chamado corretamente
        self.repo_mock.get_feedbacks_by_restaurant.assert_called_once_with(
            restaurant_id=restaurant_id,
            start_date=start_date,
            end_date=end_date,
            min_rating=min_rating,
            max_rating=max_rating,
            limit=limit,
            offset=offset
        )
    
    @patch('uuid.uuid4', return_value=MagicMock(hex='request-uuid'))
    @patch('secrets.token_urlsafe', return_value='test-token')
    async def test_create_feedback_request(self, mock_token, mock_uuid):
        """Testa a criação de uma solicitação de feedback."""
        # Dados de teste
        request_data = FeedbackRequestCreate(
            order_id="order-123",
            restaurant_id="restaurant-456",
            customer_name="João Silva",
            customer_email="joao@example.com",
            customer_phone="+5511999999999",
            custom_message="Por favor, avalie sua experiência!",
            expiration_days=7
        )
        
        # Mock do método de repositório
        self.repo_mock.create_feedback_request.return_value = FeedbackRequest(
            id="request-uuid",
            order_id=request_data.order_id,
            restaurant_id=request_data.restaurant_id,
            customer_name=request_data.customer_name,
            customer_email=request_data.customer_email,
            customer_phone=request_data.customer_phone,
            custom_message=request_data.custom_message,
            token="test-token",
            status="pending",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            expires_at=datetime.now() + timedelta(days=request_data.expiration_days),
            sent_count=1
        )
        
        # Executar método
        result = await self.feedback_service.create_feedback_request(request_data)
        
        # Verificar resultado
        self.assertEqual(result.id, "request-uuid")
        self.assertEqual(result.token, "test-token")
        self.assertEqual(result.status, "pending")
        self.assertEqual(result.sent_count, 1)
        
        # Verificar se o método do repositório foi chamado corretamente
        self.repo_mock.create_feedback_request.assert_called_once()


class TestBenefitService(unittest.TestCase):
    """Testes para o serviço de benefícios."""
    
    def setUp(self):
        """Configuração para cada teste."""
        # Mock dos repositórios
        self.repo_mock = MagicMock()
        self.feedback_service_mock = MagicMock()
        self.benefit_service = BenefitService(
            repository=self.repo_mock,
            feedback_service=self.feedback_service_mock
        )
    
    @patch('uuid.uuid4', return_value=MagicMock(hex='benefit-uuid'))
    async def test_create_benefit(self, mock_uuid):
        """Testa a criação de um benefício."""
        # Dados de teste
        benefit_data = BenefitCreate(
            name="Desconto de 10%",
            description="Desconto de 10% na próxima compra",
            type="discount",
            value=10.0,
            restaurant_id="restaurant-456",
            min_rating=4,
            expiration_days=30,
            active=True
        )
        
        # Mock do método de repositório
        self.repo_mock.create_benefit.return_value = Benefit(
            id="benefit-uuid",
            name=benefit_data.name,
            description=benefit_data.description,
            type=benefit_data.type,
            value=benefit_data.value,
            restaurant_id=benefit_data.restaurant_id,
            min_rating=benefit_data.min_rating,
            expiration_days=benefit_data.expiration_days,
            active=benefit_data.active,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Executar método
        result = await self.benefit_service.create_benefit(benefit_data)
        
        # Verificar resultado
        self.assertEqual(result.id, "benefit-uuid")
        self.assertEqual(result.name, benefit_data.name)
        self.assertEqual(result.value, benefit_data.value)
        
        # Verificar se o método do repositório foi chamado corretamente
        self.repo_mock.create_benefit.assert_called_once()
    
    async def test_find_eligible_benefit(self):
        """Testa a busca de benefício elegível para um feedback."""
        # Mock do feedback
        mock_feedback = Feedback(
            id="feedback-123",
            order_id="order-123",
            restaurant_id="restaurant-456",
            customer_id="customer-789",
            customer_name="João Silva",
            customer_email="joao@example.com",
            customer_phone="+5511999999999",
            overall_rating=5,
            category_ratings={
                "food_quality": 5,
                "service": 4,
                "ambience": 5,
                "price": 4,
                "cleanliness": 5
            },
            comment="Excelente experiência!",
            photos=["data:image/jpeg;base64,/9j/..."],
            source="web",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Mock do benefício
        mock_benefit = Benefit(
            id="benefit-uuid",
            name="Desconto de 10%",
            description="Desconto de 10% na próxima compra",
            type="discount",
            value=10.0,
            restaurant_id="restaurant-456",
            min_rating=4,
            expiration_days=30,
            active=True,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Mock dos métodos
        self.feedback_service_mock.get_feedback.return_value = mock_feedback
        self.repo_mock.find_eligible_benefit.return_value = mock_benefit
        
        # Executar método
        result = await self.benefit_service.find_eligible_benefit("feedback-123")
        
        # Verificar resultado
        self.assertEqual(result.id, "benefit-uuid")
        
        # Verificar se os métodos foram chamados corretamente
        self.feedback_service_mock.get_feedback.assert_called_once_with("feedback-123")
        self.repo_mock.find_eligible_benefit.assert_called_once_with(
            restaurant_id="restaurant-456",
            rating=5
        )
    
    @patch('uuid.uuid4', return_value=MagicMock(hex='customer-benefit-uuid'))
    @patch('secrets.token_urlsafe', return_value='benefit-code')
    async def test_create_customer_benefit(self, mock_code, mock_uuid):
        """Testa a criação de um benefício para cliente."""
        # Dados de teste
        benefit_data = CustomerBenefitCreate(
            benefit_id="benefit-uuid",
            customer_id="customer-789",
            customer_name="João Silva",
            customer_email="joao@example.com",
            customer_phone="+5511999999999",
            feedback_id="feedback-123",
            order_id="order-123"
        )
        
        # Mock do benefício
        mock_benefit = Benefit(
            id="benefit-uuid",
            name="Desconto de 10%",
            description="Desconto de 10% na próxima compra",
            type="discount",
            value=10.0,
            restaurant_id="restaurant-456",
            min_rating=4,
            expiration_days=30,
            active=True,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Mock dos métodos
        self.repo_mock.get_benefit.return_value = mock_benefit
        self.repo_mock.create_customer_benefit.return_value = CustomerBenefit(
            id="customer-benefit-uuid",
            benefit_id=benefit_data.benefit_id,
            customer_id=benefit_data.customer_id,
            customer_name=benefit_data.customer_name,
            customer_email=benefit_data.customer_email,
            customer_phone=benefit_data.customer_phone,
            feedback_id=benefit_data.feedback_id,
            order_id=benefit_data.order_id,
            code="benefit-code",
            status="active",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            expires_at=datetime.now() + timedelta(days=30),
            claimed_at=None,
            claimed_order_id=None
        )
        
        # Executar método
        result = await self.benefit_service.create_customer_benefit(benefit_data)
        
        # Verificar resultado
        self.assertEqual(result.id, "customer-benefit-uuid")
        self.assertEqual(result.code, "benefit-code")
        self.assertEqual(result.status, "active")
        
        # Verificar se os métodos foram chamados corretamente
        self.repo_mock.get_benefit.assert_called_once_with(benefit_data.benefit_id)
        self.repo_mock.create_customer_benefit.assert_called_once()


class TestNotificationService(unittest.TestCase):
    """Testes para o serviço de notificações."""
    
    def setUp(self):
        """Configuração para cada teste."""
        # Mock do cliente de email e SMS
        self.email_client_mock = MagicMock()
        self.sms_client_mock = MagicMock()
        self.notification_service = NotificationService(
            email_client=self.email_client_mock,
            sms_client=self.sms_client_mock
        )
    
    async def test_send_feedback_request(self):
        """Testa o envio de solicitação de feedback."""
        # Mock da solicitação
        mock_request = FeedbackRequest(
            id="request-uuid",
            order_id="order-123",
            restaurant_id="restaurant-456",
            customer_name="João Silva",
            customer_email="joao@example.com",
            customer_phone="+5511999999999",
            custom_message="Por favor, avalie sua experiência!",
            token="test-token",
            status="pending",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            expires_at=datetime.now() + timedelta(days=7),
            sent_count=1
        )
        
        # URL base
        base_url = "https://restaurant.com"
        
        # Executar método
        await self.notification_service.send_feedback_request(mock_request, base_url)
        
        # Verificar se os métodos foram chamados corretamente
        self.email_client_mock.send_email.assert_called_once()
        self.sms_client_mock.send_sms.assert_called_once()
    
    async def test_send_benefit_notification(self):
        """Testa o envio de notificação de benefício."""
        # Mock do benefício
        mock_benefit = CustomerBenefit(
            id="customer-benefit-uuid",
            benefit_id="benefit-uuid",
            customer_id="customer-789",
            customer_name="João Silva",
            customer_email="joao@example.com",
            customer_phone="+5511999999999",
            feedback_id="feedback-123",
            order_id="order-123",
            code="benefit-code",
            status="active",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            expires_at=datetime.now() + timedelta(days=30),
            claimed_at=None,
            claimed_order_id=None
        )
        
        # URL base
        base_url = "https://restaurant.com"
        
        # Executar método
        await self.notification_service.send_benefit_notification(mock_benefit, base_url)
        
        # Verificar se os métodos foram chamados corretamente
        self.email_client_mock.send_email.assert_called_once()
        self.sms_client_mock.send_sms.assert_called_once()
    
    async def test_send_negative_feedback_alert(self):
        """Testa o envio de alerta para feedback negativo."""
        # Mock do feedback
        mock_feedback = Feedback(
            id="feedback-123",
            order_id="order-123",
            restaurant_id="restaurant-456",
            customer_id="customer-789",
            customer_name="João Silva",
            customer_email="joao@example.com",
            customer_phone="+5511999999999",
            overall_rating=2,
            category_ratings={
                "food_quality": 2,
                "service": 1,
                "ambience": 3,
                "price": 2,
                "cleanliness": 2
            },
            comment="Experiência ruim, não recomendo.",
            photos=[],
            source="web",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Executar método
        await self.notification_service.send_negative_feedback_alert(mock_feedback)
        
        # Verificar se o método foi chamado corretamente
        self.email_client_mock.send_email.assert_called_once()


if __name__ == '__main__':
    unittest.main()
