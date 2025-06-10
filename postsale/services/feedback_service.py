from typing import List, Dict, Optional, Any, Union
from datetime import datetime, timedelta
import uuid
import asyncio
from fastapi import HTTPException, status

from ..models.feedback_models import (
    Feedback, FeedbackRequest, Benefit, CustomerBenefit,
    FeedbackCreate, FeedbackRequestCreate, BenefitCreate, CustomerBenefitCreate,
    FeedbackRating, FeedbackCategory, FeedbackRequestStatus, 
    BenefitType, BenefitTrigger, CustomerBenefitStatus, FeedbackAnalytics
)

class FeedbackService:
    """Serviço para gerenciamento de feedback."""
    
    def __init__(self, db_client=None, event_bus=None):
        """Inicializa o serviço com dependências."""
        self.db_client = db_client
        self.event_bus = event_bus
        self._feedbacks = {}  # Armazenamento temporário para desenvolvimento
        self._feedback_requests = {}  # Armazenamento temporário para desenvolvimento
    
    async def create_feedback(self, feedback_data: FeedbackCreate) -> Feedback:
        """Cria um novo feedback."""
        # Validar dados
        if not feedback_data.order_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order ID is required"
            )
        
        # Converter category_ratings de string para enum
        category_ratings = {}
        for category_str, rating in feedback_data.category_ratings.items():
            try:
                category = FeedbackCategory(category_str)
                category_ratings[category] = FeedbackRating(rating)
            except (ValueError, KeyError):
                continue  # Ignorar categorias inválidas
        
        # Criar feedback
        feedback = Feedback(
            order_id=feedback_data.order_id,
            customer_id=feedback_data.customer_id,
            customer_name=feedback_data.customer_name,
            customer_email=feedback_data.customer_email,
            customer_phone=feedback_data.customer_phone,
            overall_rating=FeedbackRating(feedback_data.overall_rating),
            category_ratings=category_ratings,
            comment=feedback_data.comment,
            restaurant_id=feedback_data.restaurant_id,
            source=feedback_data.source
        )
        
        # Persistir feedback
        if self.db_client:
            # Implementar persistência real
            pass
        else:
            # Armazenamento temporário
            self._feedbacks[feedback.id] = feedback
        
        # Publicar evento
        if self.event_bus:
            await self.event_bus.publish(
                "feedback.created",
                {
                    "feedback_id": feedback.id,
                    "order_id": feedback.order_id,
                    "restaurant_id": feedback.restaurant_id,
                    "overall_rating": feedback.overall_rating.value,
                    "timestamp": feedback.created_at.isoformat()
                }
            )
        
        # Atualizar solicitação de feedback, se existir
        await self._update_feedback_request(feedback)
        
        return feedback
    
    async def _update_feedback_request(self, feedback: Feedback) -> None:
        """Atualiza a solicitação de feedback associada."""
        # Buscar solicitações pendentes para o pedido
        requests = await self.get_feedback_requests_by_order(feedback.order_id)
        for request in requests:
            if request.status == FeedbackRequestStatus.PENDING:
                request.status = FeedbackRequestStatus.COMPLETED
                request.completed_at = datetime.utcnow()
                request.feedback_id = feedback.id
                
                # Persistir atualização
                if self.db_client:
                    # Implementar persistência real
                    pass
                else:
                    # Armazenamento temporário
                    self._feedback_requests[request.id] = request
                
                # Publicar evento
                if self.event_bus:
                    await self.event_bus.publish(
                        "feedback_request.completed",
                        {
                            "request_id": request.id,
                            "feedback_id": feedback.id,
                            "order_id": request.order_id,
                            "timestamp": request.completed_at.isoformat()
                        }
                    )
                
                break
    
    async def get_feedback(self, feedback_id: str) -> Feedback:
        """Obtém um feedback pelo ID."""
        if self.db_client:
            # Implementar busca real
            pass
        else:
            # Busca em armazenamento temporário
            feedback = self._feedbacks.get(feedback_id)
            if not feedback:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Feedback with ID {feedback_id} not found"
                )
            return feedback
    
    async def get_feedbacks_by_order(self, order_id: str) -> List[Feedback]:
        """Obtém feedbacks por ID do pedido."""
        if self.db_client:
            # Implementar busca real
            pass
        else:
            # Busca em armazenamento temporário
            feedbacks = [f for f in self._feedbacks.values() if f.order_id == order_id]
            return feedbacks
    
    async def get_feedbacks_by_customer(self, customer_id: str) -> List[Feedback]:
        """Obtém feedbacks por ID do cliente."""
        if self.db_client:
            # Implementar busca real
            pass
        else:
            # Busca em armazenamento temporário
            feedbacks = [f for f in self._feedbacks.values() if f.customer_id == customer_id]
            return feedbacks
    
    async def get_feedbacks_by_restaurant(
        self, 
        restaurant_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        min_rating: Optional[int] = None,
        max_rating: Optional[int] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Feedback]:
        """Obtém feedbacks por ID do restaurante com filtros."""
        if self.db_client:
            # Implementar busca real
            pass
        else:
            # Busca em armazenamento temporário
            feedbacks = [f for f in self._feedbacks.values() if f.restaurant_id == restaurant_id]
            
            # Aplicar filtros
            if start_date:
                feedbacks = [f for f in feedbacks if f.created_at >= start_date]
            if end_date:
                feedbacks = [f for f in feedbacks if f.created_at <= end_date]
            if min_rating:
                feedbacks = [f for f in feedbacks if f.overall_rating.value >= min_rating]
            if max_rating:
                feedbacks = [f for f in feedbacks if f.overall_rating.value <= max_rating]
            
            # Aplicar paginação
            feedbacks = feedbacks[offset:offset+limit]
            
            return feedbacks
    
    async def create_feedback_request(self, request_data: FeedbackRequestCreate) -> FeedbackRequest:
        """Cria uma nova solicitação de feedback."""
        # Validar dados
        if not request_data.order_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order ID is required"
            )
        
        # Verificar se já existe solicitação pendente para o pedido
        existing_requests = await self.get_feedback_requests_by_order(request_data.order_id)
        for request in existing_requests:
            if request.status == FeedbackRequestStatus.PENDING:
                return request  # Retorna a solicitação existente
        
        # Criar solicitação
        expires_at = datetime.utcnow() + timedelta(days=request_data.expiration_days)
        request = FeedbackRequest(
            order_id=request_data.order_id,
            customer_id=request_data.customer_id,
            customer_name=request_data.customer_name,
            customer_email=request_data.customer_email,
            customer_phone=request_data.customer_phone,
            expires_at=expires_at
        )
        
        # Persistir solicitação
        if self.db_client:
            # Implementar persistência real
            pass
        else:
            # Armazenamento temporário
            self._feedback_requests[request.id] = request
        
        # Publicar evento
        if self.event_bus:
            await self.event_bus.publish(
                "feedback_request.created",
                {
                    "request_id": request.id,
                    "order_id": request.order_id,
                    "customer_id": request.customer_id,
                    "access_token": request.access_token,
                    "expires_at": request.expires_at.isoformat(),
                    "timestamp": request.created_at.isoformat()
                }
            )
        
        return request
    
    async def get_feedback_request(self, request_id: str) -> FeedbackRequest:
        """Obtém uma solicitação de feedback pelo ID."""
        if self.db_client:
            # Implementar busca real
            pass
        else:
            # Busca em armazenamento temporário
            request = self._feedback_requests.get(request_id)
            if not request:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Feedback request with ID {request_id} not found"
                )
            return request
    
    async def get_feedback_request_by_token(self, access_token: str) -> FeedbackRequest:
        """Obtém uma solicitação de feedback pelo token de acesso."""
        if self.db_client:
            # Implementar busca real
            pass
        else:
            # Busca em armazenamento temporário
            for request in self._feedback_requests.values():
                if request.access_token == access_token:
                    return request
            
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Feedback request not found"
            )
    
    async def get_feedback_requests_by_order(self, order_id: str) -> List[FeedbackRequest]:
        """Obtém solicitações de feedback por ID do pedido."""
        if self.db_client:
            # Implementar busca real
            pass
        else:
            # Busca em armazenamento temporário
            requests = [r for r in self._feedback_requests.values() if r.order_id == order_id]
            return requests
    
    async def update_feedback_request_status(
        self, 
        request_id: str, 
        status: FeedbackRequestStatus
    ) -> FeedbackRequest:
        """Atualiza o status de uma solicitação de feedback."""
        request = await self.get_feedback_request(request_id)
        request.status = status
        
        if status == FeedbackRequestStatus.COMPLETED:
            request.completed_at = datetime.utcnow()
        
        # Persistir atualização
        if self.db_client:
            # Implementar persistência real
            pass
        else:
            # Armazenamento temporário
            self._feedback_requests[request.id] = request
        
        # Publicar evento
        if self.event_bus:
            await self.event_bus.publish(
                f"feedback_request.{status.value}",
                {
                    "request_id": request.id,
                    "order_id": request.order_id,
                    "status": status.value,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        
        return request
    
    async def send_reminder(self, request_id: str) -> FeedbackRequest:
        """Envia um lembrete para uma solicitação de feedback pendente."""
        request = await self.get_feedback_request(request_id)
        
        if request.status != FeedbackRequestStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot send reminder for non-pending request"
            )
        
        if request.expires_at < datetime.utcnow():
            await self.update_feedback_request_status(request_id, FeedbackRequestStatus.EXPIRED)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot send reminder for expired request"
            )
        
        request.reminder_sent = True
        request.reminder_sent_at = datetime.utcnow()
        
        # Persistir atualização
        if self.db_client:
            # Implementar persistência real
            pass
        else:
            # Armazenamento temporário
            self._feedback_requests[request.id] = request
        
        # Publicar evento
        if self.event_bus:
            await self.event_bus.publish(
                "feedback_request.reminder_sent",
                {
                    "request_id": request.id,
                    "order_id": request.order_id,
                    "customer_id": request.customer_id,
                    "access_token": request.access_token,
                    "timestamp": request.reminder_sent_at.isoformat()
                }
            )
        
        return request
    
    async def process_expired_requests(self) -> int:
        """Processa solicitações expiradas."""
        now = datetime.utcnow()
        count = 0
        
        if self.db_client:
            # Implementar busca real
            pass
        else:
            # Busca em armazenamento temporário
            for request in list(self._feedback_requests.values()):
                if (request.status == FeedbackRequestStatus.PENDING and 
                    request.expires_at < now):
                    await self.update_feedback_request_status(
                        request.id, 
                        FeedbackRequestStatus.EXPIRED
                    )
                    count += 1
        
        return count
    
    async def get_analytics(
        self,
        restaurant_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> FeedbackAnalytics:
        """Gera análises de feedback para um restaurante."""
        # Definir período padrão (último mês)
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Obter feedbacks do período
        feedbacks = await self.get_feedbacks_by_restaurant(
            restaurant_id=restaurant_id,
            start_date=start_date,
            end_date=end_date
        )
        
        if not feedbacks:
            return FeedbackAnalytics(
                total_count=0,
                average_rating=0.0,
                rating_distribution={1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
                category_averages={},
                recent_trend=0.0,
                nps_score=0.0,
                period_start=start_date,
                period_end=end_date,
                restaurant_id=restaurant_id
            )
        
        # Calcular métricas
        total_count = len(feedbacks)
        
        # Distribuição de avaliações
        rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for feedback in feedbacks:
            rating = feedback.overall_rating.value
            rating_distribution[rating] = rating_distribution.get(rating, 0) + 1
        
        # Média geral
        total_rating = sum(f.overall_rating.value for f in feedbacks)
        average_rating = total_rating / total_count if total_count > 0 else 0.0
        
        # Médias por categoria
        category_totals = {}
        category_counts = {}
        for feedback in feedbacks:
            for category, rating in feedback.category_ratings.items():
                cat_str = category.value
                category_totals[cat_str] = category_totals.get(cat_str, 0) + rating.value
                category_counts[cat_str] = category_counts.get(cat_str, 0) + 1
        
        category_averages = {}
        for category, total in category_totals.items():
            count = category_counts.get(category, 0)
            category_averages[category] = total / count if count > 0 else 0.0
        
        # Tendência recente (comparação com período anterior)
        mid_point = start_date + (end_date - start_date) / 2
        recent_feedbacks = [f for f in feedbacks if f.created_at >= mid_point]
        older_feedbacks = [f for f in feedbacks if f.created_at < mid_point]
        
        recent_avg = sum(f.overall_rating.value for f in recent_feedbacks) / len(recent_feedbacks) if recent_feedbacks else 0
        older_avg = sum(f.overall_rating.value for f in older_feedbacks) / len(older_feedbacks) if older_feedbacks else 0
        
        recent_trend = recent_avg - older_avg if older_avg > 0 else 0.0
        
        # NPS (Net Promoter Score)
        promoters = len([f for f in feedbacks if f.overall_rating.value >= 4])
        detractors = len([f for f in feedbacks if f.overall_rating.value <= 2])
        
        nps_score = ((promoters - detractors) / total_count) * 100 if total_count > 0 else 0.0
        
        return FeedbackAnalytics(
            total_count=total_count,
            average_rating=average_rating,
            rating_distribution=rating_distribution,
            category_averages=category_averages,
            recent_trend=recent_trend,
            nps_score=nps_score,
            period_start=start_date,
            period_end=end_date,
            restaurant_id=restaurant_id
        )


class BenefitService:
    """Serviço para gerenciamento de benefícios."""
    
    def __init__(self, db_client=None, event_bus=None, feedback_service=None):
        """Inicializa o serviço com dependências."""
        self.db_client = db_client
        self.event_bus = event_bus
        self.feedback_service = feedback_service
        self._benefits = {}  # Armazenamento temporário para desenvolvimento
        self._customer_benefits = {}  # Armazenamento temporário para desenvolvimento
    
    async def create_benefit(self, benefit_data: BenefitCreate) -> Benefit:
        """Cria um novo benefício."""
        # Validar dados
        if not benefit_data.restaurant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Restaurant ID is required"
            )
        
        # Converter enums
        try:
            benefit_type = BenefitType(benefit_data.type)
            benefit_trigger = BenefitTrigger(benefit_data.trigger)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid benefit type or trigger"
            )
        
        # Validar min_rating para triggers baseados em avaliação
        if benefit_trigger in [BenefitTrigger.POSITIVE_FEEDBACK, BenefitTrigger.NEGATIVE_FEEDBACK]:
            if benefit_data.min_rating is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Minimum rating is required for rating-based triggers"
                )
        
        # Criar benefício
        benefit = Benefit(
            name=benefit_data.name,
            description=benefit_data.description,
            type=benefit_type,
            value=benefit_data.value,
            trigger=benefit_trigger,
            min_rating=benefit_data.min_rating,
            valid_from=benefit_data.valid_from,
            valid_until=benefit_data.valid_until,
            restaurant_id=benefit_data.restaurant_id,
            usage_limit=benefit_data.usage_limit,
            item_id=benefit_data.item_id
        )
        
        # Persistir benefício
        if self.db_client:
            # Implementar persistência real
            pass
        else:
            # Armazenamento temporário
            self._benefits[benefit.id] = benefit
        
        # Publicar evento
        if self.event_bus:
            await self.event_bus.publish(
                "benefit.created",
                {
                    "benefit_id": benefit.id,
                    "name": benefit.name,
                    "type": benefit.type.value,
                    "restaurant_id": benefit.restaurant_id,
                    "timestamp": benefit.created_at.isoformat()
                }
            )
        
        return benefit
    
    async def get_benefit(self, benefit_id: str) -> Benefit:
        """Obtém um benefício pelo ID."""
        if self.db_client:
            # Implementar busca real
            pass
        else:
            # Busca em armazenamento temporário
            benefit = self._benefits.get(benefit_id)
            if not benefit:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Benefit with ID {benefit_id} not found"
                )
            return benefit
    
    async def get_benefits_by_restaurant(
        self, 
        restaurant_id: str,
        active_only: bool = True
    ) -> List[Benefit]:
        """Obtém benefícios por ID do restaurante."""
        if self.db_client:
            # Implementar busca real
            pass
        else:
            # Busca em armazenamento temporário
            benefits = [b for b in self._benefits.values() if b.restaurant_id == restaurant_id]
            
            # Filtrar por ativos
            if active_only:
                now = datetime.utcnow()
                benefits = [
                    b for b in benefits if (
                        b.active and 
                        b.valid_from <= now and 
                        (b.valid_until is None or b.valid_until > now) and
                        (b.usage_limit is None or b.usage_count < b.usage_limit)
                    )
                ]
            
            return benefits
    
    async def update_benefit(self, benefit_id: str, benefit_data: dict) -> Benefit:
        """Atualiza um benefício existente."""
        benefit = await self.get_benefit(benefit_id)
        
        # Atualizar campos
        for key, value in benefit_data.items():
            if hasattr(benefit, key):
                setattr(benefit, key, value)
        
        benefit.updated_at = datetime.utcnow()
        
        # Persistir atualização
        if self.db_client:
            # Implementar persistência real
            pass
        else:
            # Armazenamento temporário
            self._benefits[benefit.id] = benefit
        
        # Publicar evento
        if self.event_bus:
            await self.event_bus.publish(
                "benefit.updated",
                {
                    "benefit_id": benefit.id,
                    "name": benefit.name,
                    "active": benefit.active,
                    "timestamp": benefit.updated_at.isoformat()
                }
            )
        
        return benefit
    
    async def deactivate_benefit(self, benefit_id: str) -> Benefit:
        """Desativa um benefício."""
        return await self.update_benefit(benefit_id, {"active": False})
    
    async def find_eligible_benefit(self, feedback_id: str) -> Optional[Benefit]:
        """Encontra um benefício elegível para um feedback."""
        feedback = await self.feedback_service.get_feedback(feedback_id)
        
        # Obter benefícios ativos do restaurante
        benefits = await self.get_benefits_by_restaurant(
            restaurant_id=feedback.restaurant_id,
            active_only=True
        )
        
        # Filtrar por trigger
        eligible_benefits = []
        for benefit in benefits:
            if benefit.trigger == BenefitTrigger.ANY_FEEDBACK:
                eligible_benefits.append(benefit)
            elif benefit.trigger == BenefitTrigger.POSITIVE_FEEDBACK:
                if feedback.overall_rating.value >= (benefit.min_rating or 4):
                    eligible_benefits.append(benefit)
            elif benefit.trigger == BenefitTrigger.NEGATIVE_FEEDBACK:
                if feedback.overall_rating.value <= (benefit.min_rating or 2):
                    eligible_benefits.append(benefit)
            elif benefit.trigger == BenefitTrigger.FIRST_FEEDBACK:
                # Verificar se é o primeiro feedback do cliente
                if feedback.customer_id:
                    customer_feedbacks = await self.feedback_service.get_feedbacks_by_customer(feedback.customer_id)
                    if len(customer_feedbacks) <= 1:  # Apenas o atual
                        eligible_benefits.append(benefit)
            elif benefit.trigger == BenefitTrigger.REPEAT_CUSTOMER:
                # Verificar se é cliente recorrente
                if feedback.customer_id:
                    customer_feedbacks = await self.feedback_service.get_feedbacks_by_customer(feedback.customer_id)
                    if len(customer_feedbacks) > 1:  # Mais de um feedback
                        eligible_benefits.append(benefit)
        
        # Retornar o benefício de maior valor
        if eligible_benefits:
            return max(eligible_benefits, key=lambda b: b.value)
        
        return None
    
    async def create_customer_benefit(
        self, 
        benefit_data: CustomerBenefitCreate
    ) -> CustomerBenefit:
        """Cria um benefício para um cliente."""
        # Validar dados
        if not benefit_data.benefit_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Benefit ID is required"
            )
        
        if not benefit_data.feedback_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Feedback ID is required"
            )
        
        # Obter benefício
        benefit = await self.get_benefit(benefit_data.benefit_id)
        
        # Verificar se benefício está ativo
        now = datetime.utcnow()
        if not benefit.active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Benefit is not active"
            )
        
        if benefit.valid_from > now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Benefit is not yet valid"
            )
        
        if benefit.valid_until and benefit.valid_until < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Benefit has expired"
            )
        
        if benefit.usage_limit and benefit.usage_count >= benefit.usage_limit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Benefit usage limit reached"
            )
        
        # Criar benefício para cliente
        expires_at = now + timedelta(days=benefit_data.expiration_days)
        customer_benefit = CustomerBenefit(
            benefit_id=benefit_data.benefit_id,
            customer_id=benefit_data.customer_id,
            customer_name=benefit_data.customer_name,
            customer_email=benefit_data.customer_email,
            customer_phone=benefit_data.customer_phone,
            feedback_id=benefit_data.feedback_id,
            order_id=benefit_data.order_id,
            expires_at=expires_at
        )
        
        # Persistir benefício do cliente
        if self.db_client:
            # Implementar persistência real
            pass
        else:
            # Armazenamento temporário
            self._customer_benefits[customer_benefit.id] = customer_benefit
        
        # Incrementar contador de uso do benefício
        benefit.usage_count += 1
        await self.update_benefit(benefit.id, {"usage_count": benefit.usage_count})
        
        # Publicar evento
        if self.event_bus:
            await self.event_bus.publish(
                "customer_benefit.created",
                {
                    "customer_benefit_id": customer_benefit.id,
                    "benefit_id": customer_benefit.benefit_id,
                    "customer_id": customer_benefit.customer_id,
                    "code": customer_benefit.code,
                    "expires_at": customer_benefit.expires_at.isoformat(),
                    "timestamp": customer_benefit.created_at.isoformat()
                }
            )
        
        return customer_benefit
    
    async def get_customer_benefit(self, benefit_id: str) -> CustomerBenefit:
        """Obtém um benefício de cliente pelo ID."""
        if self.db_client:
            # Implementar busca real
            pass
        else:
            # Busca em armazenamento temporário
            benefit = self._customer_benefits.get(benefit_id)
            if not benefit:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Customer benefit with ID {benefit_id} not found"
                )
            return benefit
    
    async def get_customer_benefit_by_code(self, code: str) -> CustomerBenefit:
        """Obtém um benefício de cliente pelo código."""
        if self.db_client:
            # Implementar busca real
            pass
        else:
            # Busca em armazenamento temporário
            for benefit in self._customer_benefits.values():
                if benefit.code == code:
                    return benefit
            
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer benefit not found"
            )
    
    async def get_customer_benefits_by_customer(
        self, 
        customer_id: str,
        active_only: bool = True
    ) -> List[CustomerBenefit]:
        """Obtém benefícios por ID do cliente."""
        if self.db_client:
            # Implementar busca real
            pass
        else:
            # Busca em armazenamento temporário
            benefits = [b for b in self._customer_benefits.values() if b.customer_id == customer_id]
            
            # Filtrar por ativos
            if active_only:
                now = datetime.utcnow()
                benefits = [
                    b for b in benefits if (
                        b.status != CustomerBenefitStatus.CLAIMED and
                        b.status != CustomerBenefitStatus.EXPIRED and
                        b.status != CustomerBenefitStatus.CANCELLED and
                        b.expires_at > now
                    )
                ]
            
            return benefits
    
    async def update_customer_benefit_status(
        self, 
        benefit_id: str, 
        status: CustomerBenefitStatus,
        claimed_order_id: Optional[str] = None
    ) -> CustomerBenefit:
        """Atualiza o status de um benefício de cliente."""
        benefit = await self.get_customer_benefit(benefit_id)
        
        # Validar transição de estado
        if benefit.status == CustomerBenefitStatus.CLAIMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot update status of already claimed benefit"
            )
        
        if benefit.status == CustomerBenefitStatus.EXPIRED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot update status of expired benefit"
            )
        
        if benefit.status == CustomerBenefitStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot update status of cancelled benefit"
            )
        
        # Atualizar status
        benefit.status = status
        
        if status == CustomerBenefitStatus.NOTIFIED:
            benefit.notified_at = datetime.utcnow()
        
        if status == CustomerBenefitStatus.CLAIMED:
            benefit.claimed_at = datetime.utcnow()
            benefit.claimed_order_id = claimed_order_id
        
        # Persistir atualização
        if self.db_client:
            # Implementar persistência real
            pass
        else:
            # Armazenamento temporário
            self._customer_benefits[benefit.id] = benefit
        
        # Publicar evento
        if self.event_bus:
            await self.event_bus.publish(
                f"customer_benefit.{status.value}",
                {
                    "customer_benefit_id": benefit.id,
                    "benefit_id": benefit.benefit_id,
                    "customer_id": benefit.customer_id,
                    "code": benefit.code,
                    "status": status.value,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        
        return benefit
    
    async def process_expired_benefits(self) -> int:
        """Processa benefícios expirados."""
        now = datetime.utcnow()
        count = 0
        
        if self.db_client:
            # Implementar busca real
            pass
        else:
            # Busca em armazenamento temporário
            for benefit in list(self._customer_benefits.values()):
                if (benefit.status not in [CustomerBenefitStatus.CLAIMED, 
                                          CustomerBenefitStatus.EXPIRED,
                                          CustomerBenefitStatus.CANCELLED] and 
                    benefit.expires_at < now):
                    await self.update_customer_benefit_status(
                        benefit.id, 
                        CustomerBenefitStatus.EXPIRED
                    )
                    count += 1
        
        return count
    
    async def claim_benefit(
        self, 
        code: str, 
        order_id: str
    ) -> CustomerBenefit:
        """Resgata um benefício pelo código."""
        benefit = await self.get_customer_benefit_by_code(code)
        
        # Validar estado
        if benefit.status == CustomerBenefitStatus.CLAIMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Benefit has already been claimed"
            )
        
        if benefit.status == CustomerBenefitStatus.EXPIRED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Benefit has expired"
            )
        
        if benefit.status == CustomerBenefitStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Benefit has been cancelled"
            )
        
        if benefit.expires_at < datetime.utcnow():
            await self.update_customer_benefit_status(
                benefit.id, 
                CustomerBenefitStatus.EXPIRED
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Benefit has expired"
            )
        
        # Resgatar benefício
        return await self.update_customer_benefit_status(
            benefit.id,
            CustomerBenefitStatus.CLAIMED,
            claimed_order_id=order_id
        )


class NotificationService:
    """Serviço para envio de notificações relacionadas a feedback."""
    
    def __init__(self, event_bus=None, email_service=None, sms_service=None):
        """Inicializa o serviço com dependências."""
        self.event_bus = event_bus
        self.email_service = email_service
        self.sms_service = sms_service
    
    async def send_feedback_request(self, request: FeedbackRequest, base_url: str) -> bool:
        """Envia uma solicitação de feedback."""
        feedback_url = f"{base_url}/feedback?token={request.access_token}"
        
        # Determinar canais de envio
        channels = []
        if request.customer_email:
            channels.append("email")
        if request.customer_phone:
            channels.append("sms")
        
        if not channels:
            # Sem canais disponíveis
            return False
        
        # Enviar por email
        if "email" in channels and self.email_service:
            try:
                await self.email_service.send_email(
                    to=request.customer_email,
                    subject="Avalie sua experiência",
                    template="feedback_request",
                    context={
                        "customer_name": request.customer_name or "Cliente",
                        "feedback_url": feedback_url,
                        "expires_at": request.expires_at.strftime("%d/%m/%Y")
                    }
                )
            except Exception as e:
                # Logar erro
                print(f"Error sending email: {str(e)}")
        
        # Enviar por SMS
        if "sms" in channels and self.sms_service:
            try:
                await self.sms_service.send_sms(
                    to=request.customer_phone,
                    message=f"Olá! Gostaríamos de saber sua opinião. "
                            f"Avalie sua experiência em: {feedback_url}"
                )
            except Exception as e:
                # Logar erro
                print(f"Error sending SMS: {str(e)}")
        
        # Publicar evento
        if self.event_bus:
            await self.event_bus.publish(
                "notification.feedback_request_sent",
                {
                    "request_id": request.id,
                    "channels": channels,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        
        return True
    
    async def send_benefit_notification(self, benefit: CustomerBenefit, base_url: str) -> bool:
        """Envia uma notificação sobre um benefício concedido."""
        benefit_url = f"{base_url}/benefit?code={benefit.code}"
        
        # Determinar canais de envio
        channels = []
        if benefit.customer_email:
            channels.append("email")
        if benefit.customer_phone:
            channels.append("sms")
        
        if not channels:
            # Sem canais disponíveis
            return False
        
        # Enviar por email
        if "email" in channels and self.email_service:
            try:
                await self.email_service.send_email(
                    to=benefit.customer_email,
                    subject="Você recebeu um benefício!",
                    template="benefit_notification",
                    context={
                        "customer_name": benefit.customer_name or "Cliente",
                        "benefit_code": benefit.code,
                        "benefit_url": benefit_url,
                        "expires_at": benefit.expires_at.strftime("%d/%m/%Y")
                    }
                )
            except Exception as e:
                # Logar erro
                print(f"Error sending email: {str(e)}")
        
        # Enviar por SMS
        if "sms" in channels and self.sms_service:
            try:
                await self.sms_service.send_sms(
                    to=benefit.customer_phone,
                    message=f"Obrigado pelo feedback! Você recebeu um benefício. "
                            f"Código: {benefit.code}. Resgate em: {benefit_url}"
                )
            except Exception as e:
                # Logar erro
                print(f"Error sending SMS: {str(e)}")
        
        # Publicar evento
        if self.event_bus:
            await self.event_bus.publish(
                "notification.benefit_notification_sent",
                {
                    "benefit_id": benefit.id,
                    "channels": channels,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        
        return True
    
    async def send_negative_feedback_alert(self, feedback: Feedback) -> bool:
        """Envia um alerta para feedback negativo."""
        if feedback.overall_rating.value >= 3:
            # Não é um feedback negativo
            return False
        
        # Publicar evento
        if self.event_bus:
            await self.event_bus.publish(
                "notification.negative_feedback_alert",
                {
                    "feedback_id": feedback.id,
                    "order_id": feedback.order_id,
                    "restaurant_id": feedback.restaurant_id,
                    "rating": feedback.overall_rating.value,
                    "comment": feedback.comment,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        
        return True
