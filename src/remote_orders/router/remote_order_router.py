from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Body, status
from fastapi.responses import JSONResponse

from src.remote_orders.models.remote_order_models import (
    RemoteOrder,
    RemoteOrderStatus,
    RemotePlatform,
    RemotePlatformConfig,
    RemoteOrderCreate,
    RemoteOrderResponse,
)
from src.remote_orders.services.remote_order_service import remote_order_service
from src.auth.security import get_current_user
from src.auth.models import User, Permission

router = APIRouter(prefix="/api/v1", tags=["remote-orders"])


def _check_permissions(user: User, required_permissions: List[str]):
    """Helper function to check user permissions inline."""
    if Permission.ALL in user.permissions:
        return  # User has all permissions
    for perm in required_permissions:
        if perm not in user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissão necessária: {perm}",
            )


@router.post("/remote-orders/webhook/{platform}", response_model=RemoteOrderResponse)
async def receive_webhook(
    platform: str,
    payload: Dict[str, Any] = Body(...),
    x_signature: Optional[str] = Header(None),
):
    """Recebe webhooks das plataformas de pedidos remotos."""
    try:
        # Validar plataforma
        try:
            platform_enum = RemotePlatform(platform)
        except ValueError:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": f"Plataforma {platform} não suportada",
                },
            )

        # Processar o pedido remoto
        remote_order = await remote_order_service.process_remote_order(
            platform_enum, payload
        )

        return {
            "success": True,
            "message": f"Pedido {remote_order.external_order_id} recebido com sucesso",
            "data": {"order_id": remote_order.id},
        }
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code, content={"success": False, "message": e.detail}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Erro ao processar webhook: {str(e)}",
            },
        )


@router.get("/remote-orders/", response_model=List[RemoteOrder])
async def list_remote_orders(
    platform: Optional[str] = None,
    status: Optional[RemoteOrderStatus] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
):
    """Lista pedidos remotos com filtros."""
    _check_permissions(current_user, ["remote_orders.read"])

    platform_enum = None
    if platform:
        try:
            platform_enum = RemotePlatform(platform)
        except ValueError:
            raise HTTPException(
                status_code=400, detail=f"Plataforma {platform} não suportada"
            )

    orders = await remote_order_service.list_remote_orders(
        platform=platform_enum,
        status=status,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )
    return orders


@router.get("/remote-orders/{order_id}", response_model=RemoteOrder)
async def get_remote_order(
    order_id: str, current_user: User = Depends(get_current_user)
):
    """Busca um pedido remoto pelo ID."""
    _check_permissions(current_user, ["remote_orders.read"])

    order = await remote_order_service.get_remote_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido remoto não encontrado")

    return order


@router.post("/remote-orders/{order_id}/accept", response_model=RemoteOrder)
async def accept_remote_order(
    order_id: str, current_user: User = Depends(get_current_user)
):
    """Aceita um pedido remoto e cria um pedido interno."""
    _check_permissions(current_user, ["remote_orders.update"])

    try:
        return await remote_order_service.accept_remote_order(order_id)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao aceitar pedido: {str(e)}")


@router.post("/remote-orders/{order_id}/reject", response_model=RemoteOrder)
async def reject_remote_order(
    order_id: str,
    reason: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
):
    """Rejeita um pedido remoto."""
    _check_permissions(current_user, ["remote_orders.update"])

    try:
        return await remote_order_service.reject_remote_order(order_id, reason)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao rejeitar pedido: {str(e)}"
        )


@router.get("/remote-platforms/", response_model=List[RemotePlatformConfig])
async def list_platform_configs(current_user: User = Depends(get_current_user)):
    """Lista configurações de plataformas remotas."""
    _check_permissions(current_user, ["remote_platforms.read"])

    return await remote_order_service.list_platform_configs()


@router.get("/remote-platforms/{platform}", response_model=RemotePlatformConfig)
async def get_platform_config(
    platform: str, current_user: User = Depends(get_current_user)
):
    """Obtém configuração de uma plataforma remota."""
    _check_permissions(current_user, ["remote_platforms.read"])

    try:
        platform_enum = RemotePlatform(platform)
    except ValueError:
        raise HTTPException(
            status_code=400, detail=f"Plataforma {platform} não suportada"
        )

    config = await remote_order_service.get_platform_config(platform_enum)
    if not config:
        raise HTTPException(
            status_code=404,
            detail=f"Configuração para plataforma {platform} não encontrada",
        )

    return config


@router.put("/remote-platforms/{platform}", response_model=RemotePlatformConfig)
async def update_platform_config(
    platform: str,
    config_data: RemotePlatformConfig,
    current_user: User = Depends(get_current_user),
):
    """Atualiza configuração de uma plataforma remota."""
    _check_permissions(current_user, ["remote_platforms.update"])

    try:
        platform_enum = RemotePlatform(platform)
    except ValueError:
        raise HTTPException(
            status_code=400, detail=f"Plataforma {platform} não suportada"
        )

    if config_data.platform != platform_enum:
        raise HTTPException(
            status_code=400,
            detail=f"Plataforma na URL ({platform}) não corresponde à plataforma nos dados ({config_data.platform})",
        )

    return await remote_order_service.update_platform_config(config_data)


@router.post("/remote-orders/test", response_model=RemoteOrder)
async def create_test_remote_order(
    order_data: RemoteOrderCreate, current_user: User = Depends(get_current_user)
):
    """Cria um pedido remoto de teste."""
    _check_permissions(current_user, ["remote_orders.create"])

    # Converter para formato de webhook da plataforma
    platform = order_data.platform
    adapter = remote_order_service._adapters.get(platform)
    if not adapter:
        raise HTTPException(
            status_code=400,
            detail=f"Adaptador para plataforma {platform} não encontrado",
        )

    # Criar dados simulados de webhook
    webhook_data = {
        "id": order_data.external_order_id,
        "items": [item.dict() for item in order_data.items],
        "customer": order_data.customer.dict(),
        "payments": [order_data.payment.dict()],
        "subTotal": order_data.subtotal,
        "deliveryFee": order_data.delivery_fee,
        "discount": order_data.discount,
        "totalPrice": order_data.total,
        "notes": order_data.notes,
        "scheduledFor": (
            order_data.scheduled_for.isoformat() if order_data.scheduled_for else None
        ),
        "raw_data": order_data.raw_data or {},
    }

    # Processar como se fosse um webhook real
    return await remote_order_service.process_remote_order(platform, webhook_data)


@router.post("/remote-orders/{order_id}/dispatch", response_model=RemoteOrder)
async def dispatch_remote_order(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """Despacha um pedido remoto (marca como enviado para entrega)."""
    _check_permissions(current_user, ["remote_orders.update"])
    
    try:
        return await remote_order_service.dispatch_remote_order(order_id)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao despachar pedido: {str(e)}")

@router.post("/remote-orders/{order_id}/cancel", response_model=RemoteOrder)
async def cancel_remote_order(
    order_id: str,
    reason: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user)
):
    """Cancela um pedido remoto já aceito."""
    _check_permissions(current_user, ["remote_orders.update"])
    
    try:
        return await remote_order_service.cancel_remote_order(order_id, reason)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao cancelar pedido: {str(e)}")

@router.post("/remote-orders/{order_id}/ready", response_model=RemoteOrder)
async def mark_order_ready(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """Marca um pedido como pronto para entrega."""
    _check_permissions(current_user, ["remote_orders.update"])
    
    try:
        return await remote_order_service.mark_order_ready(order_id)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao marcar pedido como pronto: {str(e)}")

@router.get("/remote-orders/stats/summary")
async def get_orders_summary(
    current_user: User = Depends(get_current_user)
):
    """Obtém resumo estatístico dos pedidos remotos."""
    _check_permissions(current_user, ["remote_orders.read"])
    
    try:
        return await remote_order_service.get_orders_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter resumo: {str(e)}")

@router.get("/remote-orders/stats/by-platform")
async def get_stats_by_platform(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Obtém estatísticas por plataforma."""
    _check_permissions(current_user, ["remote_orders.read"])
    
    try:
        return await remote_order_service.get_stats_by_platform(start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter estatísticas: {str(e)}")

@router.post("/remote-orders/bulk-action")
async def bulk_action_orders(
    action: str = Body(...),
    order_ids: List[str] = Body(...),
    reason: Optional[str] = Body(None),
    current_user: User = Depends(get_current_user)
):
    """Executa ação em lote em múltiplos pedidos."""
    _check_permissions(current_user, ["remote_orders.update"])
    
    valid_actions = ["accept", "reject", "cancel", "dispatch", "ready"]
    if action not in valid_actions:
        raise HTTPException(
            status_code=400, 
            detail=f"Ação inválida. Ações válidas: {', '.join(valid_actions)}"
        )
    
    try:
        return await remote_order_service.bulk_action_orders(action, order_ids, reason)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na ação em lote: {str(e)}")

