from fastapi import APIRouter, Depends, HTTPException, Query, Path
from typing import Dict, Optional, Any
import logging

from ..models.payment_models import PaymentMethod
from ..models.partial_payment_models import (
    PaymentSessionCreate,
    PaymentSessionUpdate,
    PartialPaymentCreate,
    BillSplitCreate,
    EqualSplitRequest,
    CustomSplitRequest,
)
from ..services.partial_payment_service import PaymentSessionService, BillSplitService
from ..services.payment_service import PaymentService

router = APIRouter(
    prefix="/payment/partial",
    tags=["partial-payment"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)


# Dependências
def get_payment_service():
    return PaymentService()


def get_session_service(payment_service: PaymentService = Depends(get_payment_service)):
    return PaymentSessionService(payment_service)


def get_split_service(
    session_service: PaymentSessionService = Depends(get_session_service),
):
    return BillSplitService(session_service)


# Rotas para sessões de pagamento
@router.post("/sessions", response_model=Dict[str, Any])
async def create_payment_session(
    session_data: PaymentSessionCreate,
    session_service: PaymentSessionService = Depends(get_session_service),
):
    """
    Cria uma nova sessão de pagamento para um pedido.
    """
    try:
        session = await session_service.create_session(
            order_id=session_data.order_id, total_amount=session_data.total_amount
        )
        return {"session": session.dict()}
    except Exception as e:
        logger.error(f"Erro ao criar sessão de pagamento: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar sessão de pagamento: {str(e)}"
        )


@router.get("/sessions/{session_id}", response_model=Dict[str, Any])
async def get_payment_session(
    session_id: str = Path(..., description="ID da sessão de pagamento"),
    session_service: PaymentSessionService = Depends(get_session_service),
):
    """
    Obtém detalhes de uma sessão de pagamento.
    """
    try:
        session = await session_service.get_session(session_id)
        payments = await session_service.get_payments_by_session(session_id)
        return {"session": session.dict(), "payments": [p.dict() for p in payments]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter sessão de pagamento: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter sessão de pagamento: {str(e)}"
        )


@router.get("/sessions/order/{order_id}", response_model=Dict[str, Any])
async def get_sessions_by_order(
    order_id: str = Path(..., description="ID do pedido"),
    session_service: PaymentSessionService = Depends(get_session_service),
):
    """
    Obtém todas as sessões de pagamento para um pedido.
    """
    try:
        sessions = await session_service.get_sessions_by_order(order_id)
        return {"sessions": [s.dict() for s in sessions]}
    except Exception as e:
        logger.error(f"Erro ao obter sessões de pagamento: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter sessões de pagamento: {str(e)}"
        )


@router.patch("/sessions/{session_id}", response_model=Dict[str, Any])
async def update_payment_session(
    session_data: PaymentSessionUpdate,
    session_id: str = Path(..., description="ID da sessão de pagamento"),
    session_service: PaymentSessionService = Depends(get_session_service),
):
    """
    Atualiza uma sessão de pagamento.
    """
    try:
        session = await session_service.update_session(
            session_id=session_id,
            paid_amount=session_data.paid_amount,
            status=session_data.status,
        )
        return {"session": session.dict()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar sessão de pagamento: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar sessão de pagamento: {str(e)}"
        )


@router.post("/sessions/{session_id}/close", response_model=Dict[str, Any])
async def close_payment_session(
    session_id: str = Path(..., description="ID da sessão de pagamento"),
    session_service: PaymentSessionService = Depends(get_session_service),
):
    """
    Fecha uma sessão de pagamento.
    """
    try:
        session = await session_service.close_session(session_id)
        return {"session": session.dict(), "status": "closed"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao fechar sessão de pagamento: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao fechar sessão de pagamento: {str(e)}"
        )


@router.post("/sessions/{session_id}/cancel", response_model=Dict[str, Any])
async def cancel_payment_session(
    session_id: str = Path(..., description="ID da sessão de pagamento"),
    session_service: PaymentSessionService = Depends(get_session_service),
):
    """
    Cancela uma sessão de pagamento.
    """
    try:
        session = await session_service.cancel_session(session_id)
        return {"session": session.dict(), "status": "cancelled"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao cancelar sessão de pagamento: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao cancelar sessão de pagamento: {str(e)}"
        )


# Rotas para pagamentos parciais
@router.post("/payments", response_model=Dict[str, Any])
async def create_partial_payment(
    payment_data: PartialPaymentCreate,
    session_service: PaymentSessionService = Depends(get_session_service),
):
    """
    Cria um novo pagamento parcial.
    """
    try:
        payment = await session_service.add_partial_payment(
            session_id=payment_data.session_id,
            method=payment_data.method,
            amount=payment_data.amount,
            customer_name=payment_data.customer_name,
            customer_email=payment_data.customer_email,
            customer_phone=payment_data.customer_phone,
            description=payment_data.description,
            metadata=payment_data.metadata,
        )

        # Obter sessão atualizada
        session = await session_service.get_session(payment_data.session_id)

        return {
            "payment": payment.dict(),
            "session": session.dict(),
            "remaining": session.remaining_amount,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar pagamento parcial: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar pagamento parcial: {str(e)}"
        )


@router.get("/payments/session/{session_id}", response_model=Dict[str, Any])
async def get_payments_by_session(
    session_id: str = Path(..., description="ID da sessão de pagamento"),
    session_service: PaymentSessionService = Depends(get_session_service),
):
    """
    Obtém todos os pagamentos de uma sessão.
    """
    try:
        payments = await session_service.get_payments_by_session(session_id)
        return {"payments": [p.dict() for p in payments]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter pagamentos: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter pagamentos: {str(e)}"
        )


# Rotas para divisão de conta
@router.post("/splits", response_model=Dict[str, Any])
async def create_bill_split(
    split_data: BillSplitCreate,
    split_service: BillSplitService = Depends(get_split_service),
):
    """
    Cria uma nova divisão de conta.
    """
    try:
        split = await split_service.create_split(
            session_id=split_data.session_id,
            split_method=split_data.split_method,
            number_of_parts=split_data.number_of_parts,
        )
        return {"split": split.dict()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar divisão de conta: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar divisão de conta: {str(e)}"
        )


@router.get("/splits/{split_id}", response_model=Dict[str, Any])
async def get_bill_split(
    split_id: str = Path(..., description="ID da divisão de conta"),
    split_service: BillSplitService = Depends(get_split_service),
):
    """
    Obtém detalhes de uma divisão de conta.
    """
    try:
        split = await split_service.get_split(split_id)
        parts = await split_service.get_split_parts(split_id)
        return {"split": split.dict(), "parts": [p.dict() for p in parts]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter divisão de conta: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter divisão de conta: {str(e)}"
        )


@router.get("/splits/session/{session_id}", response_model=Dict[str, Any])
async def get_split_by_session(
    session_id: str = Path(..., description="ID da sessão de pagamento"),
    split_service: BillSplitService = Depends(get_split_service),
):
    """
    Obtém a divisão de conta para uma sessão.
    """
    try:
        split = await split_service.get_split_by_session(session_id)
        if not split:
            return {"split": None, "parts": []}

        parts = await split_service.get_split_parts(split.id)
        return {"split": split.dict(), "parts": [p.dict() for p in parts]}
    except Exception as e:
        logger.error(f"Erro ao obter divisão de conta: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter divisão de conta: {str(e)}"
        )


@router.post("/splits/equal", response_model=Dict[str, Any])
async def create_equal_split(
    split_data: EqualSplitRequest,
    split_service: BillSplitService = Depends(get_split_service),
):
    """
    Cria uma divisão igualitária.
    """
    try:
        result = await split_service.create_equal_split(
            session_id=split_data.session_id,
            number_of_parts=split_data.number_of_parts,
            names=split_data.names,
        )
        return {
            "split": result["split"].dict(),
            "parts": [p.dict() for p in result["parts"]],
            "amount_per_part": result["amount_per_part"],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar divisão igualitária: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar divisão igualitária: {str(e)}"
        )


@router.post("/splits/custom", response_model=Dict[str, Any])
async def create_custom_split(
    split_data: CustomSplitRequest,
    split_service: BillSplitService = Depends(get_split_service),
):
    """
    Cria uma divisão personalizada.
    """
    try:
        result = await split_service.create_custom_split(
            session_id=split_data.session_id, parts=split_data.parts
        )
        return {
            "split": result["split"].dict(),
            "parts": [p.dict() for p in result["parts"]],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar divisão personalizada: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar divisão personalizada: {str(e)}"
        )


@router.post("/splits/parts/{part_id}/pay", response_model=Dict[str, Any])
async def pay_split_part(
    part_id: str = Path(..., description="ID da parte da divisão"),
    method: PaymentMethod = Query(..., description="Método de pagamento"),
    customer_name: Optional[str] = Query(None, description="Nome do cliente"),
    customer_email: Optional[str] = Query(None, description="Email do cliente"),
    customer_phone: Optional[str] = Query(None, description="Telefone do cliente"),
    split_service: BillSplitService = Depends(get_split_service),
):
    """
    Paga uma parte da divisão.
    """
    try:
        result = await split_service.pay_split_part(
            part_id=part_id,
            method=method,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
        )
        return {
            "part": result["part"].dict(),
            "payment": result["payment"].dict(),
            "session": result["session"].dict(),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao pagar parte da divisão: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao pagar parte da divisão: {str(e)}"
        )
