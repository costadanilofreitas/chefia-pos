from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Optional, Any
from datetime import datetime

from src.auth.security import get_current_user
from src.auth.models import User
from src.delivery.models.delivery_models import (
    DeliveryOrder,
    DeliveryOrderStatus,
    DeliveryCourier,
    CourierStatus,
    CourierType,
    DeliveryRoute,
    DeliveryZone,
    DeliveryTracking,
    CreateDeliveryOrderRequest,
    UpdateDeliveryOrderRequest,
    UpdateDeliveryOrderStatusRequest,
    AssignCourierRequest,
    CreateCourierRequest,
    UpdateCourierStatusRequest,
    UpdateCourierLocationRequest,
    CreateZoneRequest,
    CreateTrackingEventRequest,
    CheckAddressRequest,
)
from src.delivery.services.delivery_service import (
    delivery_service,
    courier_service,
    zone_service,
)

router = APIRouter(prefix="/api/v1", tags=["delivery"])


# Endpoints para pedidos de delivery
@router.post("/delivery/orders/", response_model=DeliveryOrder)
async def create_delivery_order(
    order_data: CreateDeliveryOrderRequest,
    current_user: User = Depends(get_current_user),
):
    """Cria um novo pedido de delivery."""
    try:
        delivery_order = await delivery_service.create_delivery_order(
            order_id=order_data.order_id,
            customer_id=order_data.customer_id,
            address_id=order_data.address_id,
            delivery_fee=order_data.delivery_fee,
            delivery_notes=order_data.delivery_notes,
            payment_on_delivery=order_data.payment_on_delivery,
            payment_amount=order_data.payment_amount,
            payment_method=order_data.payment_method,
            priority=order_data.priority,
        )
        return delivery_order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar pedido de delivery: {str(e)}"
        )


@router.get("/delivery/orders/{order_id}", response_model=DeliveryOrder)
async def get_delivery_order(
    order_id: str, current_user: User = Depends(get_current_user)
):
    """Obtém um pedido de delivery pelo ID."""
    delivery_order = await delivery_service.get_delivery_order(order_id)
    if not delivery_order:
        raise HTTPException(
            status_code=404, detail=f"Pedido de delivery {order_id} não encontrado"
        )
    return delivery_order


@router.put("/delivery/orders/{order_id}/status", response_model=DeliveryOrder)
async def update_delivery_order_status(
    order_id: str,
    status_data: UpdateDeliveryOrderStatusRequest,
    current_user: User = Depends(get_current_user),
):
    """Atualiza o status de um pedido de delivery."""
    try:
        delivery_order = await delivery_service.update_order_status(
            delivery_order_id=order_id,
            status=status_data.status,
            notes=status_data.notes,
        )
        return delivery_order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar status do pedido: {str(e)}"
        )


@router.post("/delivery/orders/{order_id}/assign", response_model=DeliveryOrder)
async def assign_courier_to_order(
    order_id: str,
    courier_data: AssignCourierRequest,
    current_user: User = Depends(get_current_user),
):
    """Atribui um entregador a um pedido."""
    try:
        delivery_order = await delivery_service.assign_courier(
            delivery_order_id=order_id, courier_id=courier_data.courier_id
        )
        return delivery_order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atribuir entregador: {str(e)}"
        )


@router.get("/delivery/orders/", response_model=List[DeliveryOrder])
async def list_delivery_orders(
    status: Optional[str] = None,
    courier_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """Lista pedidos de delivery com filtros."""
    try:
        # Converter strings para enums e datas
        status_enum = DeliveryOrderStatus(status) if status else None
        from_date_obj = datetime.fromisoformat(from_date) if from_date else None
        to_date_obj = datetime.fromisoformat(to_date) if to_date else None

        orders = await delivery_service.list_delivery_orders(
            status=status_enum,
            courier_id=courier_id,
            customer_id=customer_id,
            from_date=from_date_obj,
            to_date=to_date_obj,
        )
        return orders
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar pedidos: {str(e)}")


@router.put("/delivery/orders/{order_id}", response_model=DeliveryOrder)
async def update_delivery_order(
    order_id: str,
    order_data: UpdateDeliveryOrderRequest,
    current_user: User = Depends(get_current_user),
):
    """Atualiza um pedido de delivery."""
    try:
        # Verificar se o pedido existe
        delivery_order = await delivery_service.get_delivery_order(order_id)
        if not delivery_order:
            raise HTTPException(
                status_code=404, detail=f"Pedido de delivery {order_id} não encontrado"
            )

        # Atualizar campos fornecidos
        update_data = order_data.dict(exclude_unset=True)

        # Simular atualização (implementar no service)
        for field, value in update_data.items():
            setattr(delivery_order, field, value)

        delivery_order.updated_at = datetime.now()

        # Salvar no service (implementar método update_delivery_order no service)
        # updated_order = await delivery_service.update_delivery_order(order_id, update_data)

        return delivery_order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar pedido: {str(e)}"
        )


@router.delete("/delivery/orders/{order_id}")
async def delete_delivery_order(
    order_id: str, current_user: User = Depends(get_current_user)
):
    """Cancela/exclui um pedido de delivery."""
    try:
        # Verificar se o pedido existe
        delivery_order = await delivery_service.get_delivery_order(order_id)
        if not delivery_order:
            raise HTTPException(
                status_code=404, detail=f"Pedido de delivery {order_id} não encontrado"
            )

        # Cancelar o pedido em vez de excluir
        cancelled_order = await delivery_service.update_order_status(
            delivery_order_id=order_id,
            status=DeliveryOrderStatus.CANCELLED,
            notes="Pedido cancelado via API",
        )

        return {
            "message": f"Pedido {order_id} cancelado com sucesso",
            "status": "cancelled",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao cancelar pedido: {str(e)}"
        )


# Endpoints para entregadores
@router.post("/delivery/couriers/", response_model=DeliveryCourier)
async def create_courier(
    courier_data: CreateCourierRequest, current_user: User = Depends(get_current_user)
):
    """Cria um novo entregador."""
    try:
        courier = await courier_service.create_courier(
            name=courier_data.name,
            phone=courier_data.phone,
            email=courier_data.email,
            vehicle_type=courier_data.vehicle_type,
            vehicle_plate=courier_data.vehicle_plate,
            courier_type=courier_data.courier_type,
            employee_id=courier_data.employee_id,
            max_deliveries=courier_data.max_deliveries,
            notes=courier_data.notes,
        )
        return courier
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar entregador: {str(e)}"
        )


@router.get("/delivery/couriers/{courier_id}", response_model=DeliveryCourier)
async def get_courier(courier_id: str, current_user: User = Depends(get_current_user)):
    """Obtém um entregador pelo ID."""
    courier = await courier_service.get_courier(courier_id)
    if not courier:
        raise HTTPException(
            status_code=404, detail=f"Entregador {courier_id} não encontrado"
        )
    return courier


@router.put("/delivery/couriers/{courier_id}/status", response_model=DeliveryCourier)
async def update_courier_status(
    courier_id: str,
    status_data: UpdateCourierStatusRequest,
    current_user: User = Depends(get_current_user),
):
    """Atualiza o status de um entregador."""
    try:
        courier = await courier_service.update_courier_status(
            courier_id=courier_id, status=status_data.status
        )
        return courier
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao atualizar status do entregador: {str(e)}"
        )


@router.put("/delivery/couriers/{courier_id}/location", response_model=DeliveryCourier)
async def update_courier_location(
    courier_id: str,
    location_data: UpdateCourierLocationRequest,
    current_user: User = Depends(get_current_user),
):
    """Atualiza a localização de um entregador."""
    try:
        location = {"lat": location_data.latitude, "lng": location_data.longitude}
        courier = await courier_service.update_courier_location(
            courier_id=courier_id, location=location
        )
        return courier
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao atualizar localização do entregador: {str(e)}",
        )


@router.get("/delivery/couriers/", response_model=List[DeliveryCourier])
async def list_couriers(
    status: Optional[str] = None,
    courier_type: Optional[str] = None,
    is_active: bool = True,
    current_user: User = Depends(get_current_user),
):
    """Lista entregadores com filtros."""
    try:
        # Converter strings para enums
        status_enum = CourierStatus(status) if status else None
        type_enum = CourierType(courier_type) if courier_type else None

        couriers = await courier_service.list_couriers(
            status=status_enum, courier_type=type_enum, is_active=is_active
        )
        return couriers
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao listar entregadores: {str(e)}"
        )


@router.get(
    "/delivery/couriers/{courier_id}/deliveries", response_model=List[DeliveryOrder]
)
async def get_courier_deliveries(
    courier_id: str, current_user: User = Depends(get_current_user)
):
    """Obtém as entregas atuais de um entregador."""
    try:
        deliveries = await courier_service.get_courier_current_deliveries(courier_id)
        return deliveries
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter entregas do entregador: {str(e)}"
        )


@router.get(
    "/delivery/couriers/{courier_id}/performance", response_model=Dict[str, Any]
)
async def get_courier_performance(
    courier_id: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """Obtém métricas de desempenho de um entregador."""
    try:
        # Converter strings para datas
        from_date_obj = datetime.fromisoformat(from_date) if from_date else None
        to_date_obj = datetime.fromisoformat(to_date) if to_date else None

        performance = await courier_service.get_courier_performance(
            courier_id=courier_id, from_date=from_date_obj, to_date=to_date_obj
        )
        return performance
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter desempenho do entregador: {str(e)}"
        )


# Endpoints para zonas de entrega
@router.post("/delivery/zones/", response_model=DeliveryZone)
async def create_zone(
    zone_data: CreateZoneRequest, current_user: User = Depends(get_current_user)
):
    """Cria uma nova zona de entrega."""
    try:
        zone = await zone_service.create_zone(
            name=zone_data.name,
            description=zone_data.description,
            base_fee=zone_data.base_fee,
            min_delivery_time=zone_data.min_delivery_time,
            max_delivery_time=zone_data.max_delivery_time,
            polygon=zone_data.polygon,
            additional_fee_per_km=zone_data.additional_fee_per_km,
            min_order_value=zone_data.min_order_value,
        )
        return zone
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar zona de entrega: {str(e)}"
        )


@router.get("/delivery/zones/{zone_id}", response_model=DeliveryZone)
async def get_zone(zone_id: str, current_user: User = Depends(get_current_user)):
    """Obtém uma zona de entrega pelo ID."""
    zone = await zone_service.get_zone(zone_id)
    if not zone:
        raise HTTPException(
            status_code=404, detail=f"Zona de entrega {zone_id} não encontrada"
        )
    return zone


@router.get("/delivery/zones/", response_model=List[DeliveryZone])
async def list_zones(
    is_active: bool = True, current_user: User = Depends(get_current_user)
):
    """Lista zonas de entrega."""
    try:
        zones = await zone_service.list_zones(is_active=is_active)
        return zones
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao listar zonas de entrega: {str(e)}"
        )


@router.post("/delivery/check-address", response_model=Dict[str, Any])
async def check_address_deliverable(
    address_data: CheckAddressRequest, current_user: User = Depends(get_current_user)
):
    """Verifica se um endereço está em uma zona de entrega."""
    try:
        is_deliverable = await zone_service.check_address_deliverable(
            address_data.address_id
        )

        result = {
            "is_deliverable": is_deliverable,
            "address_id": address_data.address_id,
        }

        if is_deliverable and address_data.order_value:
            # Calcular taxa de entrega
            delivery_fee = await delivery_service.calculate_delivery_fee(
                address_id=address_data.address_id, order_value=address_data.order_value
            )

            # Estimar tempo de entrega
            delivery_time = await delivery_service.estimate_delivery_time(
                address_id=address_data.address_id
            )

            result["delivery_fee"] = delivery_fee
            result["estimated_delivery_time"] = delivery_time

        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao verificar endereço: {str(e)}"
        )


# Endpoints para rastreamento
@router.get("/delivery/tracking/{order_id}", response_model=List[DeliveryTracking])
async def get_tracking_history(
    order_id: str, current_user: User = Depends(get_current_user)
):
    """Obtém o histórico de rastreamento de um pedido."""
    try:
        tracking_history = await delivery_service.get_tracking_history(order_id)
        return tracking_history
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter histórico de rastreamento: {str(e)}"
        )


@router.post("/delivery/tracking/{order_id}", response_model=DeliveryTracking)
async def create_tracking_event(
    order_id: str,
    event_data: CreateTrackingEventRequest,
    current_user: User = Depends(get_current_user),
):
    """Cria um evento de rastreamento."""
    try:
        location = None
        if event_data.latitude is not None and event_data.longitude is not None:
            location = {"lat": event_data.latitude, "lng": event_data.longitude}

        tracking_event = await delivery_service.create_tracking_event(
            delivery_order_id=order_id,
            event_type=event_data.event_type,
            location=location,
            notes=event_data.notes,
        )
        return tracking_event
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao criar evento de rastreamento: {str(e)}"
        )


# Endpoints públicos (sem autenticação)
@router.get("/public/delivery/tracking/{tracking_code}", response_model=Dict[str, Any])
async def public_track_order(tracking_code: str):
    """Endpoint público para rastreamento de pedido pelo cliente."""
    try:
        # Obter pedido pelo código de rastreamento
        delivery_order = await delivery_service.get_delivery_order_by_tracking(
            tracking_code
        )

        if not delivery_order:
            raise HTTPException(
                status_code=404,
                detail=f"Pedido com código de rastreamento {tracking_code} não encontrado",
            )

        # Obter histórico de rastreamento
        tracking_history = await delivery_service.get_tracking_history(
            delivery_order.id
        )

        # Preparar resposta
        response = {
            "tracking_code": tracking_code,
            "status": delivery_order.status,
            "estimated_delivery_time": delivery_order.estimated_delivery_time.isoformat(),
            "actual_delivery_time": (
                delivery_order.actual_delivery_time.isoformat()
                if delivery_order.actual_delivery_time
                else None
            ),
            "events": [
                {
                    "type": event.event_type,
                    "timestamp": event.timestamp.isoformat(),
                    "notes": event.notes,
                }
                for event in tracking_history
            ],
        }

        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao rastrear pedido: {str(e)}"
        )


# Rotas para otimização de rotas
@router.post("/delivery/routes/optimize", response_model=List[DeliveryRoute])
async def optimize_routes(current_user: User = Depends(get_current_user)):
    """Otimiza rotas para entregas pendentes."""
    try:
        routes = await delivery_service.optimize_routes()
        return routes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao otimizar rotas: {str(e)}")
