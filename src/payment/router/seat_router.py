from fastapi import APIRouter, Depends, HTTPException, Path
from typing import Dict, Any
import logging

from ..models.seat_models import (
    SeatCreate,
    SeatUpdate,
    SeatOrderItemCreate,
    SeatPaymentCreate,
    SeatGroupCreate,
    SeatBillSplitRequest,
)
from ..services.seat_service import SeatService, SeatOrderService, SeatPaymentService
from ..services.partial_payment_service import PaymentSessionService, BillSplitService
from ..services.payment_service import PaymentService

router = APIRouter(
    prefix="/payment/seats",
    tags=["seat-payment"],
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


def get_seat_service():
    return SeatService()


def get_seat_order_service(seat_service: SeatService = Depends(get_seat_service)):
    return SeatOrderService(seat_service)


def get_seat_payment_service(
    seat_service: SeatService = Depends(get_seat_service),
    session_service: PaymentSessionService = Depends(get_session_service),
    split_service: BillSplitService = Depends(get_split_service),
):
    return SeatPaymentService(seat_service, session_service, split_service)


# Rotas para assentos
@router.post("/", response_model=Dict[str, Any])
async def create_seat(
    seat_data: SeatCreate, seat_service: SeatService = Depends(get_seat_service)
):
    """
    Cria um novo assento.
    """
    try:
        seat = await seat_service.create_seat(seat_data)
        return {"seat": seat.dict()}
    except Exception as e:
        logger.error(f"Erro ao criar assento: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao criar assento: {str(e)}")


@router.get("/{seat_id}", response_model=Dict[str, Any])
async def get_seat(
    seat_id: str = Path(..., description="ID do assento"),
    seat_service: SeatService = Depends(get_seat_service),
):
    """
    Obtém detalhes de um assento.
    """
    try:
        seat = await seat_service.get_seat(seat_id)
        return {"seat": seat.dict()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter assento: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter assento: {str(e)}")


@router.get("/table/{table_id}", response_model=Dict[str, Any])
async def get_seats_by_table(
    table_id: str = Path(..., description="ID da mesa"),
    seat_service: SeatService = Depends(get_seat_service),
):
    """
    Obtém todos os assentos de uma mesa.
    """
    try:
        seats = await seat_service.get_seats_by_table(table_id)
        return {"seats": [s.dict() for s in seats]}
    except Exception as e:
        logger.error(f"Erro ao obter assentos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter assentos: {str(e)}")


@router.patch("/{seat_id}", response_model=Dict[str, Any])
async def update_seat(
    seat_data: SeatUpdate,
    seat_id: str = Path(..., description="ID do assento"),
    seat_service: SeatService = Depends(get_seat_service),
):
    """
    Atualiza um assento.
    """
    try:
        seat = await seat_service.update_seat(seat_id, seat_data)
        return {"seat": seat.dict()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar assento: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar assento: {str(e)}"
        )


@router.delete("/{seat_id}", response_model=Dict[str, Any])
async def delete_seat(
    seat_id: str = Path(..., description="ID do assento"),
    seat_service: SeatService = Depends(get_seat_service),
):
    """
    Remove um assento.
    """
    try:
        await seat_service.delete_seat(seat_id)
        return {"message": "Assento removido com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao remover assento: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao remover assento: {str(e)}"
        )


# Rotas para associação de itens a assentos
@router.post("/items", response_model=Dict[str, Any])
async def assign_item_to_seat(
    item_data: SeatOrderItemCreate,
    seat_order_service: SeatOrderService = Depends(get_seat_order_service),
):
    """
    Associa um item de pedido a um assento.
    """
    try:
        item = await seat_order_service.assign_item_to_seat(item_data)
        return {"item": item.dict()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao associar item ao assento: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao associar item ao assento: {str(e)}"
        )


@router.get("/{seat_id}/items", response_model=Dict[str, Any])
async def get_items_by_seat(
    seat_id: str = Path(..., description="ID do assento"),
    seat_order_service: SeatOrderService = Depends(get_seat_order_service),
):
    """
    Obtém todos os itens associados a um assento.
    """
    try:
        items = await seat_order_service.get_items_by_seat(seat_id)
        return {"items": [i.dict() for i in items]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter itens do assento: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter itens do assento: {str(e)}"
        )


@router.get("/items/{order_item_id}", response_model=Dict[str, Any])
async def get_seats_by_item(
    order_item_id: str = Path(..., description="ID do item de pedido"),
    seat_order_service: SeatOrderService = Depends(get_seat_order_service),
):
    """
    Obtém todos os assentos associados a um item.
    """
    try:
        items = await seat_order_service.get_seats_by_item(order_item_id)
        return {"items": [i.dict() for i in items]}
    except Exception as e:
        logger.error(f"Erro ao obter assentos do item: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter assentos do item: {str(e)}"
        )


@router.delete("/{seat_id}/items/{order_item_id}", response_model=Dict[str, Any])
async def remove_item_from_seat(
    seat_id: str = Path(..., description="ID do assento"),
    order_item_id: str = Path(..., description="ID do item de pedido"),
    seat_order_service: SeatOrderService = Depends(get_seat_order_service),
):
    """
    Remove a associação entre um item e um assento.
    """
    try:
        await seat_order_service.remove_item_from_seat(seat_id, order_item_id)
        return {"message": "Item removido do assento com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao remover item do assento: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao remover item do assento: {str(e)}"
        )


@router.get("/{seat_id}/order/{order_id}", response_model=Dict[str, Any])
async def get_items_by_order_and_seat(
    seat_id: str = Path(..., description="ID do assento"),
    order_id: str = Path(..., description="ID do pedido"),
    seat_order_service: SeatOrderService = Depends(get_seat_order_service),
):
    """
    Obtém todos os itens de um pedido associados a um assento.
    """
    try:
        items = await seat_order_service.get_items_by_order_and_seat(order_id, seat_id)
        return {"items": items}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter itens do pedido e assento: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter itens do pedido e assento: {str(e)}"
        )


# Rotas para pagamentos por assento
@router.post("/payments", response_model=Dict[str, Any])
async def create_seat_payment(
    payment_data: SeatPaymentCreate,
    seat_payment_service: SeatPaymentService = Depends(get_seat_payment_service),
):
    """
    Associa um pagamento a um assento.
    """
    try:
        payment = await seat_payment_service.create_seat_payment(payment_data)
        return {"payment": payment.dict()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao associar pagamento ao assento: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao associar pagamento ao assento: {str(e)}"
        )


@router.get("/{seat_id}/payments", response_model=Dict[str, Any])
async def get_payments_by_seat(
    seat_id: str = Path(..., description="ID do assento"),
    seat_payment_service: SeatPaymentService = Depends(get_seat_payment_service),
):
    """
    Obtém todos os pagamentos associados a um assento.
    """
    try:
        payments = await seat_payment_service.get_payments_by_seat(seat_id)
        return {"payments": [p.dict() for p in payments]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter pagamentos do assento: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter pagamentos do assento: {str(e)}"
        )


@router.get("/payments/{payment_id}", response_model=Dict[str, Any])
async def get_seats_by_payment(
    payment_id: str = Path(..., description="ID do pagamento"),
    seat_payment_service: SeatPaymentService = Depends(get_seat_payment_service),
):
    """
    Obtém todos os assentos associados a um pagamento.
    """
    try:
        payments = await seat_payment_service.get_seats_by_payment(payment_id)
        return {"payments": [p.dict() for p in payments]}
    except Exception as e:
        logger.error(f"Erro ao obter assentos do pagamento: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter assentos do pagamento: {str(e)}"
        )


# Rotas para grupos de assentos
@router.post("/groups", response_model=Dict[str, Any])
async def create_seat_group(
    group_data: SeatGroupCreate,
    seat_payment_service: SeatPaymentService = Depends(get_seat_payment_service),
):
    """
    Cria um grupo de assentos para pagamento conjunto.
    """
    try:
        group = await seat_payment_service.create_seat_group(group_data)
        return {"group": group.dict()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar grupo de assentos: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar grupo de assentos: {str(e)}"
        )


@router.get("/groups/{group_id}", response_model=Dict[str, Any])
async def get_seat_group(
    group_id: str = Path(..., description="ID do grupo"),
    seat_payment_service: SeatPaymentService = Depends(get_seat_payment_service),
):
    """
    Obtém detalhes de um grupo de assentos.
    """
    try:
        group = await seat_payment_service.get_seat_group(group_id)
        return {"group": group.dict()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter grupo de assentos: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter grupo de assentos: {str(e)}"
        )


@router.get("/{seat_id}/groups", response_model=Dict[str, Any])
async def get_groups_by_seat(
    seat_id: str = Path(..., description="ID do assento"),
    seat_payment_service: SeatPaymentService = Depends(get_seat_payment_service),
):
    """
    Obtém todos os grupos que contêm um assento.
    """
    try:
        groups = await seat_payment_service.get_groups_by_seat(seat_id)
        return {"groups": [g.dict() for g in groups]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter grupos do assento: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter grupos do assento: {str(e)}"
        )


# Rota para divisão de conta por assentos
@router.post("/split", response_model=Dict[str, Any])
async def create_seat_bill_split(
    split_data: SeatBillSplitRequest,
    seat_payment_service: SeatPaymentService = Depends(get_seat_payment_service),
):
    """
    Cria uma divisão de conta baseada em assentos.
    """
    try:
        result = await seat_payment_service.create_seat_bill_split(
            session_id=split_data.session_id,
            seat_ids=split_data.seat_ids,
            include_shared_items=split_data.include_shared_items,
        )
        return {
            "split": result["split"].dict(),
            "parts": [p.dict() for p in result["parts"]],
            "seat_assignments": result["seat_assignments"],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar divisão por assentos: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar divisão por assentos: {str(e)}"
        )
