from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional, Dict, Any

from ..models.kiosk_models import KioskConfig, KioskSession, KioskOrder, KioskAnalytics
from ..services.kiosk_service import kiosk_service
from src.auth.security import get_current_user
from src.auth.models import User, Permission

router = APIRouter(prefix="/api/v1", tags=["kiosk"])


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


# Kiosk Configuration Endpoints
@router.post("/kiosk/config", response_model=KioskConfig)
async def create_kiosk_config(
    config_data: KioskConfig, current_user: User = Depends(get_current_user)
):
    """Creates a new kiosk configuration."""
    _check_permissions(current_user, ["kiosk.manage"])
    return await kiosk_service.create_kiosk_config(config_data)


@router.get("/kiosk/config/{kiosk_id}", response_model=KioskConfig)
async def get_kiosk_config(
    kiosk_id: str, current_user: User = Depends(get_current_user)
):
    """Gets a kiosk configuration by ID."""
    _check_permissions(current_user, ["kiosk.read"])
    config = await kiosk_service.get_kiosk_config(kiosk_id)
    if not config:
        raise HTTPException(status_code=404, detail="Kiosk configuration not found")
    return config


@router.get("/kiosk/config", response_model=List[KioskConfig])
async def list_kiosk_configs(current_user: User = Depends(get_current_user)):
    """Lists all kiosk configurations."""
    _check_permissions(current_user, ["kiosk.read"])
    return await kiosk_service.list_kiosk_configs()


@router.put("/kiosk/config/{kiosk_id}", response_model=KioskConfig)
async def update_kiosk_config(
    kiosk_id: str,
    config_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """Updates a kiosk configuration."""
    _check_permissions(current_user, ["kiosk.manage"])
    config = await kiosk_service.update_kiosk_config(kiosk_id, config_data)
    if not config:
        raise HTTPException(status_code=404, detail="Kiosk configuration not found")
    return config


@router.delete("/kiosk/config/{kiosk_id}", status_code=204)
async def delete_kiosk_config(
    kiosk_id: str, current_user: User = Depends(get_current_user)
):
    """Deletes a kiosk configuration."""
    _check_permissions(current_user, ["kiosk.manage"])
    success = await kiosk_service.delete_kiosk_config(kiosk_id)
    if not success:
        raise HTTPException(status_code=404, detail="Kiosk configuration not found")
    return None


# Kiosk Session Endpoints
@router.post("/kiosk/{kiosk_id}/session", response_model=KioskSession)
async def start_kiosk_session(kiosk_id: str):
    """Starts a new kiosk session. No authentication required for public kiosk."""
    try:
        return await kiosk_service.start_kiosk_session(kiosk_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/kiosk/session/{session_id}/activity", response_model=KioskSession)
async def update_session_activity(session_id: str):
    """Updates the last activity timestamp for a session. No authentication required for public kiosk."""
    session = await kiosk_service.update_session_activity(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.put("/kiosk/session/{session_id}/end", response_model=KioskSession)
async def end_kiosk_session(
    session_id: str, order_id: Optional[str] = None, completed: bool = False
):
    """Ends a kiosk session. No authentication required for public kiosk."""
    session = await kiosk_service.end_kiosk_session(session_id, order_id, completed)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


# Kiosk Order Endpoint
@router.post("/kiosk/session/{session_id}/order", response_model=Dict[str, Any])
async def create_order_from_kiosk(session_id: str, order_data: KioskOrder):
    """Creates an order from a kiosk session. No authentication required for public kiosk."""
    try:
        return await kiosk_service.create_order_from_kiosk(session_id, order_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating order: {str(e)}")


# Kiosk Analytics Endpoints
@router.get("/kiosk/{kiosk_id}/analytics", response_model=List[KioskAnalytics])
async def get_kiosk_analytics(
    kiosk_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """Gets analytics for a kiosk within a date range."""
    _check_permissions(current_user, ["kiosk.read"])
    return await kiosk_service.get_kiosk_analytics(kiosk_id, start_date, end_date)
