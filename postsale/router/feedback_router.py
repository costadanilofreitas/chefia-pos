from fastapi import APIRouter, Body, Depends, HTTPException, status, Query, Path
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta

from ..models.feedback_models import (
    Feedback, FeedbackRequest, Benefit, CustomerBenefit,
    FeedbackCreate, FeedbackRequestCreate, BenefitCreate, CustomerBenefitCreate,
    FeedbackAnalytics
)
from ..services.feedback_service import FeedbackService, BenefitService, NotificationService

# Dependências
def get_feedback_service():
    # Em produção, injetar dependências reais
    return FeedbackService()

def get_benefit_service():
    # Em produção, injetar dependências reais
    feedback_service = get_feedback_service()
    return BenefitService(feedback_service=feedback_service)

def get_notification_service():
    # Em produção, injetar dependências reais
    return NotificationService()

# Criar router
router = APIRouter(
    prefix="/postsale",
    tags=["postsale"],
    responses={404: {"description": "Not found"}},
)

# Rotas para feedback
@router.post("/feedback", response_model=dict)
async def create_feedback(
    feedback_data: FeedbackCreate,
    feedback_service: FeedbackService = Depends(get_feedback_service),
    benefit_service: BenefitService = Depends(get_benefit_service),
    notification_service: NotificationService = Depends(get_notification_service)
):
    """Cria um novo feedback."""
    # Criar feedback
    feedback = await feedback_service.create_feedback(feedback_data)
    
    # Verificar se há benefício elegível
    benefit = None
    customer_benefit = None
    try:
        benefit = await benefit_service.find_eligible_benefit(feedback.id)
        if benefit:
            # Criar benefício para o cliente
            customer_benefit = await benefit_service.create_customer_benefit(
                CustomerBenefitCreate(
                    benefit_id=benefit.id,
                    customer_id=feedback.customer_id,
                    customer_name=feedback.customer_name,
                    customer_email=feedback.customer_email,
                    customer_phone=feedback.customer_phone,
                    feedback_id=feedback.id,
                    order_id=feedback.order_id
                )
            )
            
            # Atualizar feedback com o benefício
            feedback.benefit_id = benefit.id
            
            # Enviar notificação sobre o benefício
            base_url = "https://restaurant.com"  # Em produção, obter da configuração
            await notification_service.send_benefit_notification(customer_benefit, base_url)
    except Exception as e:
        # Logar erro, mas não falhar a operação principal
        print(f"Error processing benefit: {str(e)}")
    
    # Enviar alerta para feedback negativo
    if feedback.overall_rating.value <= 2:
        await notification_service.send_negative_feedback_alert(feedback)
    
    return {
        "feedback": feedback,
        "benefit": benefit,
        "customer_benefit": customer_benefit
    }

@router.get("/feedback/{feedback_id}", response_model=dict)
async def get_feedback(
    feedback_id: str = Path(..., description="ID do feedback"),
    feedback_service: FeedbackService = Depends(get_feedback_service)
):
    """Obtém um feedback pelo ID."""
    feedback = await feedback_service.get_feedback(feedback_id)
    return {"feedback": feedback}

@router.get("/feedback/order/{order_id}", response_model=dict)
async def get_feedbacks_by_order(
    order_id: str = Path(..., description="ID do pedido"),
    feedback_service: FeedbackService = Depends(get_feedback_service)
):
    """Obtém feedbacks por ID do pedido."""
    feedbacks = await feedback_service.get_feedbacks_by_order(order_id)
    return {"feedbacks": feedbacks}

@router.get("/feedback/customer/{customer_id}", response_model=dict)
async def get_feedbacks_by_customer(
    customer_id: str = Path(..., description="ID do cliente"),
    feedback_service: FeedbackService = Depends(get_feedback_service)
):
    """Obtém feedbacks por ID do cliente."""
    feedbacks = await feedback_service.get_feedbacks_by_customer(customer_id)
    return {"feedbacks": feedbacks}

@router.get("/feedback/restaurant/{restaurant_id}", response_model=dict)
async def get_feedbacks_by_restaurant(
    restaurant_id: str = Path(..., description="ID do restaurante"),
    start_date: Optional[datetime] = Query(None, description="Data inicial"),
    end_date: Optional[datetime] = Query(None, description="Data final"),
    min_rating: Optional[int] = Query(None, description="Avaliação mínima"),
    max_rating: Optional[int] = Query(None, description="Avaliação máxima"),
    limit: int = Query(100, description="Limite de resultados"),
    offset: int = Query(0, description="Deslocamento para paginação"),
    feedback_service: FeedbackService = Depends(get_feedback_service)
):
    """Obtém feedbacks por ID do restaurante com filtros."""
    feedbacks = await feedback_service.get_feedbacks_by_restaurant(
        restaurant_id=restaurant_id,
        start_date=start_date,
        end_date=end_date,
        min_rating=min_rating,
        max_rating=max_rating,
        limit=limit,
        offset=offset
    )
    return {"feedbacks": feedbacks}

# Rotas para solicitações de feedback
@router.post("/feedback-request", response_model=dict)
async def create_feedback_request(
    request_data: FeedbackRequestCreate,
    feedback_service: FeedbackService = Depends(get_feedback_service),
    notification_service: NotificationService = Depends(get_notification_service)
):
    """Cria uma nova solicitação de feedback."""
    request = await feedback_service.create_feedback_request(request_data)
    
    # Enviar solicitação
    base_url = "https://restaurant.com"  # Em produção, obter da configuração
    await notification_service.send_feedback_request(request, base_url)
    
    return {"request": request}

@router.get("/feedback-request/{request_id}", response_model=dict)
async def get_feedback_request(
    request_id: str = Path(..., description="ID da solicitação"),
    feedback_service: FeedbackService = Depends(get_feedback_service)
):
    """Obtém uma solicitação de feedback pelo ID."""
    request = await feedback_service.get_feedback_request(request_id)
    return {"request": request}

@router.get("/feedback-request/token/{token}", response_model=dict)
async def get_feedback_request_by_token(
    token: str = Path(..., description="Token de acesso"),
    feedback_service: FeedbackService = Depends(get_feedback_service)
):
    """Obtém uma solicitação de feedback pelo token de acesso."""
    request = await feedback_service.get_feedback_request_by_token(token)
    return {"request": request}

@router.post("/feedback-request/{request_id}/reminder", response_model=dict)
async def send_reminder(
    request_id: str = Path(..., description="ID da solicitação"),
    feedback_service: FeedbackService = Depends(get_feedback_service),
    notification_service: NotificationService = Depends(get_notification_service)
):
    """Envia um lembrete para uma solicitação de feedback pendente."""
    request = await feedback_service.send_reminder(request_id)
    
    # Enviar lembrete
    base_url = "https://restaurant.com"  # Em produção, obter da configuração
    await notification_service.send_feedback_request(request, base_url)
    
    return {"request": request}

@router.post("/feedback-request/{request_id}/status/{status}", response_model=dict)
async def update_feedback_request_status(
    request_id: str = Path(..., description="ID da solicitação"),
    status: str = Path(..., description="Novo status"),
    feedback_service: FeedbackService = Depends(get_feedback_service)
):
    """Atualiza o status de uma solicitação de feedback."""
    try:
        request = await feedback_service.update_feedback_request_status(
            request_id=request_id,
            status=status
        )
        return {"request": request}
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {status}"
        )

# Rotas para benefícios
@router.post("/benefit", response_model=dict)
async def create_benefit(
    benefit_data: BenefitCreate,
    benefit_service: BenefitService = Depends(get_benefit_service)
):
    """Cria um novo benefício."""
    benefit = await benefit_service.create_benefit(benefit_data)
    return {"benefit": benefit}

@router.get("/benefit/{benefit_id}", response_model=dict)
async def get_benefit(
    benefit_id: str = Path(..., description="ID do benefício"),
    benefit_service: BenefitService = Depends(get_benefit_service)
):
    """Obtém um benefício pelo ID."""
    benefit = await benefit_service.get_benefit(benefit_id)
    return {"benefit": benefit}

@router.get("/benefit/restaurant/{restaurant_id}", response_model=dict)
async def get_benefits_by_restaurant(
    restaurant_id: str = Path(..., description="ID do restaurante"),
    active_only: bool = Query(True, description="Apenas benefícios ativos"),
    benefit_service: BenefitService = Depends(get_benefit_service)
):
    """Obtém benefícios por ID do restaurante."""
    benefits = await benefit_service.get_benefits_by_restaurant(
        restaurant_id=restaurant_id,
        active_only=active_only
    )
    return {"benefits": benefits}

@router.put("/benefit/{benefit_id}", response_model=dict)
async def update_benefit(
    benefit_id: str = Path(..., description="ID do benefício"),
    benefit_data: dict = Body(..., description="Dados do benefício"),
    benefit_service: BenefitService = Depends(get_benefit_service)
):
    """Atualiza um benefício existente."""
    benefit = await benefit_service.update_benefit(benefit_id, benefit_data)
    return {"benefit": benefit}

@router.post("/benefit/{benefit_id}/deactivate", response_model=dict)
async def deactivate_benefit(
    benefit_id: str = Path(..., description="ID do benefício"),
    benefit_service: BenefitService = Depends(get_benefit_service)
):
    """Desativa um benefício."""
    benefit = await benefit_service.deactivate_benefit(benefit_id)
    return {"benefit": benefit}

# Rotas para benefícios de clientes
@router.post("/customer-benefit", response_model=dict)
async def create_customer_benefit(
    benefit_data: CustomerBenefitCreate,
    benefit_service: BenefitService = Depends(get_benefit_service),
    notification_service: NotificationService = Depends(get_notification_service)
):
    """Cria um benefício para um cliente."""
    customer_benefit = await benefit_service.create_customer_benefit(benefit_data)
    
    # Enviar notificação
    base_url = "https://restaurant.com"  # Em produção, obter da configuração
    await notification_service.send_benefit_notification(customer_benefit, base_url)
    
    return {"customer_benefit": customer_benefit}

@router.get("/customer-benefit/{benefit_id}", response_model=dict)
async def get_customer_benefit(
    benefit_id: str = Path(..., description="ID do benefício"),
    benefit_service: BenefitService = Depends(get_benefit_service)
):
    """Obtém um benefício de cliente pelo ID."""
    benefit = await benefit_service.get_customer_benefit(benefit_id)
    return {"customer_benefit": benefit}

@router.get("/customer-benefit/code/{code}", response_model=dict)
async def get_customer_benefit_by_code(
    code: str = Path(..., description="Código do benefício"),
    benefit_service: BenefitService = Depends(get_benefit_service)
):
    """Obtém um benefício de cliente pelo código."""
    benefit = await benefit_service.get_customer_benefit_by_code(code)
    return {"customer_benefit": benefit}

@router.get("/customer-benefit/customer/{customer_id}", response_model=dict)
async def get_customer_benefits_by_customer(
    customer_id: str = Path(..., description="ID do cliente"),
    active_only: bool = Query(True, description="Apenas benefícios ativos"),
    benefit_service: BenefitService = Depends(get_benefit_service)
):
    """Obtém benefícios por ID do cliente."""
    benefits = await benefit_service.get_customer_benefits_by_customer(
        customer_id=customer_id,
        active_only=active_only
    )
    return {"customer_benefits": benefits}

@router.post("/customer-benefit/{benefit_id}/status/{status}", response_model=dict)
async def update_customer_benefit_status(
    benefit_id: str = Path(..., description="ID do benefício"),
    status: str = Path(..., description="Novo status"),
    claimed_order_id: Optional[str] = Query(None, description="ID do pedido de resgate"),
    benefit_service: BenefitService = Depends(get_benefit_service)
):
    """Atualiza o status de um benefício de cliente."""
    try:
        benefit = await benefit_service.update_customer_benefit_status(
            benefit_id=benefit_id,
            status=status,
            claimed_order_id=claimed_order_id
        )
        return {"customer_benefit": benefit}
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {status}"
        )

@router.post("/customer-benefit/claim", response_model=dict)
async def claim_benefit(
    code: str = Query(..., description="Código do benefício"),
    order_id: str = Query(..., description="ID do pedido"),
    benefit_service: BenefitService = Depends(get_benefit_service)
):
    """Resgata um benefício pelo código."""
    benefit = await benefit_service.claim_benefit(code, order_id)
    return {"customer_benefit": benefit}

# Rotas para análises
@router.get("/analytics/restaurant/{restaurant_id}", response_model=dict)
async def get_analytics(
    restaurant_id: str = Path(..., description="ID do restaurante"),
    start_date: Optional[datetime] = Query(None, description="Data inicial"),
    end_date: Optional[datetime] = Query(None, description="Data final"),
    feedback_service: FeedbackService = Depends(get_feedback_service)
):
    """Gera análises de feedback para um restaurante."""
    analytics = await feedback_service.get_analytics(
        restaurant_id=restaurant_id,
        start_date=start_date,
        end_date=end_date
    )
    return {"analytics": analytics}

# Rotas para manutenção
@router.post("/maintenance/process-expired-requests", response_model=dict)
async def process_expired_requests(
    feedback_service: FeedbackService = Depends(get_feedback_service)
):
    """Processa solicitações expiradas."""
    count = await feedback_service.process_expired_requests()
    return {"processed_count": count}

@router.post("/maintenance/process-expired-benefits", response_model=dict)
async def process_expired_benefits(
    benefit_service: BenefitService = Depends(get_benefit_service)
):
    """Processa benefícios expirados."""
    count = await benefit_service.process_expired_benefits()
    return {"processed_count": count}
