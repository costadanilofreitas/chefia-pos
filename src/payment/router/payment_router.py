from typing import List
from fastapi import APIRouter, HTTPException, Depends, Request

from src.payment.models.payment_models import (
    PaymentProvider, ProviderConfig, ProviderConfigCreate, ProviderConfigUpdate,
    Payment, PaymentCreate
)
from src.payment.services.payment_service import get_payment_service
from src.auth.auth import get_current_user  # Updated import path

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])

@router.post("/", response_model=Payment)
async def create_payment(payment_data: PaymentCreate, current_user = Depends(get_current_user)):
    """Cria um novo pagamento."""
    payment_service = get_payment_service()
    return await payment_service.create_payment(payment_data)

@router.get("/{payment_id}", response_model=Payment)
async def get_payment(payment_id: str, current_user = Depends(get_current_user)):
    """Obtém detalhes de um pagamento."""
    payment_service = get_payment_service()
    payment = await payment_service.get_payment(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    return payment

@router.get("/order/{order_id}", response_model=List[Payment])
async def get_payments_by_order(order_id: str, current_user = Depends(get_current_user)):
    """Obtém pagamentos por ID de pedido."""
    payment_service = get_payment_service()
    return await payment_service.get_payments_by_order(order_id)

@router.post("/webhook/asaas", status_code=200)
async def asaas_webhook(request: Request):
    """Webhook para receber notificações do Asaas."""
    data = await request.json()
    payment_service = get_payment_service()
    await payment_service.process_webhook(PaymentProvider.ASAAS, data)
    return {"success": True}

@router.get("/{payment_id}/check", response_model=Payment)
async def check_payment_status(payment_id: str, current_user = Depends(get_current_user)):
    """Verifica o status de um pagamento diretamente no provedor."""
    payment_service = get_payment_service()
    payment = await payment_service.check_payment_status(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    return payment

@router.post("/config", response_model=ProviderConfig)
async def create_provider_config(config_data: ProviderConfigCreate, current_user = Depends(get_current_user)):
    """Cria uma nova configuração de provedor."""
    payment_service = get_payment_service()
    return await payment_service.create_provider_config(config_data)

@router.put("/config/{provider}", response_model=ProviderConfig)
async def update_provider_config(provider: PaymentProvider, config_data: ProviderConfigUpdate, 
                                current_user = Depends(get_current_user)):
    """Atualiza uma configuração de provedor."""
    payment_service = get_payment_service()
    config = await payment_service.update_provider_config(provider, config_data)
    if not config:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")
    return config

@router.get("/config/{provider}", response_model=ProviderConfig)
async def get_provider_config(provider: PaymentProvider, current_user = Depends(get_current_user)):
    """Obtém uma configuração de provedor."""
    payment_service = get_payment_service()
    config = await payment_service.get_provider_config(provider)
    if not config:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")
    return config
