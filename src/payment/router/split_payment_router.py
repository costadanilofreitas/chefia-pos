from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging

from src.payment.models.split_models import (
    SplitConfig,
    SplitConfigCreate,
    SplitConfigUpdate,
    SplitPaymentRecord,
)
from src.payment.services.split_payment_service import get_split_payment_service
from src.payment.models.payment_models import PaymentCreate
from src.auth.auth import get_current_user

router = APIRouter(prefix="/api/payment/split", tags=["split-payment"])
logger = logging.getLogger(__name__)


@router.post("/configs", response_model=SplitConfig)
async def create_split_config(
    config_data: SplitConfigCreate, current_user=Depends(get_current_user)
):
    """
    Cria uma nova configuração de rateio de pagamento.
    """
    try:
        split_service = get_split_payment_service()
        return await split_service.create_split_config(config_data)
    except ValueError as e:
        logger.error(f"Erro ao criar configuração de rateio: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro interno ao criar configuração de rateio: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Erro interno ao criar configuração de rateio"
        )


@router.get("/configs/{config_id}", response_model=SplitConfig)
async def get_split_config(config_id: str, current_user=Depends(get_current_user)):
    """
    Obtém uma configuração de rateio pelo ID.
    """
    split_service = get_split_payment_service()
    config = await split_service.get_split_config(config_id)

    if not config:
        raise HTTPException(
            status_code=404, detail="Configuração de rateio não encontrada"
        )

    return config


@router.get("/configs", response_model=List[SplitConfig])
async def get_split_configs(
    restaurant_id: str,
    store_id: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    """
    Obtém configurações de rateio por restaurante e loja.
    """
    split_service = get_split_payment_service()
    return await split_service.get_split_configs_by_restaurant(restaurant_id, store_id)


@router.put("/configs/{config_id}", response_model=SplitConfig)
async def update_split_config(
    config_id: str,
    config_data: SplitConfigUpdate,
    current_user=Depends(get_current_user),
):
    """
    Atualiza uma configuração de rateio.
    """
    try:
        split_service = get_split_payment_service()
        config = await split_service.update_split_config(config_id, config_data)

        if not config:
            raise HTTPException(
                status_code=404, detail="Configuração de rateio não encontrada"
            )

        return config
    except ValueError as e:
        logger.error(f"Erro ao atualizar configuração de rateio: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro interno ao atualizar configuração de rateio: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Erro interno ao atualizar configuração de rateio"
        )


@router.delete("/configs/{config_id}", response_model=dict)
async def delete_split_config(config_id: str, current_user=Depends(get_current_user)):
    """
    Exclui uma configuração de rateio.
    """
    split_service = get_split_payment_service()
    success = await split_service.delete_split_config(config_id)

    if not success:
        raise HTTPException(
            status_code=404, detail="Configuração de rateio não encontrada"
        )

    return {"message": "Configuração de rateio excluída com sucesso"}


@router.post("/payments", response_model=dict)
async def create_payment_with_split(
    payment_data: PaymentCreate,
    split_config_id: str = Query(..., description="ID da configuração de rateio"),
    current_user=Depends(get_current_user),
):
    """
    Cria um pagamento com rateio.
    """
    try:
        split_service = get_split_payment_service()
        result = await split_service.create_payment_with_split(
            payment_data, split_config_id
        )
        return result
    except ValueError as e:
        logger.error(f"Erro ao criar pagamento com rateio: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro interno ao criar pagamento com rateio: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Erro interno ao criar pagamento com rateio"
        )


@router.get("/payments/{payment_id}", response_model=SplitPaymentRecord)
async def get_split_payment(payment_id: str, current_user=Depends(get_current_user)):
    """
    Obtém o registro de rateio de um pagamento.
    """
    split_service = get_split_payment_service()
    record = await split_service.get_split_payment_record(payment_id)

    if not record:
        raise HTTPException(
            status_code=404, detail="Registro de pagamento com rateio não encontrado"
        )

    return record


@router.put("/payments/{payment_id}/status", response_model=SplitPaymentRecord)
async def update_split_payment_status(
    payment_id: str, current_user=Depends(get_current_user)
):
    """
    Atualiza o status das transferências de um pagamento com rateio.
    """
    split_service = get_split_payment_service()
    record = await split_service.update_split_payment_status(payment_id)

    if not record:
        raise HTTPException(
            status_code=404, detail="Registro de pagamento com rateio não encontrado"
        )

    return record


@router.get("/payments", response_model=List[SplitPaymentRecord])
async def get_split_payments_by_config(
    split_config_id: str, current_user=Depends(get_current_user)
):
    """
    Obtém pagamentos com rateio por configuração.
    """
    split_service = get_split_payment_service()
    return await split_service.get_split_payments_by_config(split_config_id)
