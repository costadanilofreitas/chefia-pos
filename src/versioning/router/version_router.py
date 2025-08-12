from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any

from ..models.version_models import (
    SystemVersion,
    UpdateRequest,
    UpdateResult,
    UpdateCheckResult,
)
from ..services.version_service import version_service
from src.auth.security import get_current_user
from src.auth.models import User, Permission

router = APIRouter(prefix="/api/v1", tags=["versioning"])


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


@router.get("/version", response_model=SystemVersion)
async def get_current_version(current_user: User = Depends(get_current_user)):
    """Get the current system version information."""
    _check_permissions(current_user, ["system.read"])
    return await version_service.get_current_version()


@router.get("/version/check", response_model=UpdateCheckResult)
async def check_for_updates(
    force: bool = False, current_user: User = Depends(get_current_user)
):
    """
    Check if updates are available.

    Args:
        force: If True, bypass the update check interval
    """
    _check_permissions(current_user, ["system.read"])
    return await version_service.check_for_updates(force)


@router.post("/version/update", response_model=UpdateResult)
async def update_system(
    request: UpdateRequest, current_user: User = Depends(get_current_user)
):
    """
    Update the system to the specified version.

    Args:
        request: The update request
    """
    _check_permissions(current_user, ["system.update"])
    return await version_service.update_system(request)


@router.post("/version/restore/{backup_path:path}", response_model=UpdateResult)
async def restore_backup(
    backup_path: str, current_user: User = Depends(get_current_user)
):
    """
    Restore the system from a backup.

    Args:
        backup_path: Path to the backup directory
    """
    _check_permissions(current_user, ["system.update"])
    return await version_service.restore_backup(backup_path)


@router.put("/version/auto-update/{enabled}", response_model=SystemVersion)
async def set_auto_update(
    enabled: bool, current_user: User = Depends(get_current_user)
):
    """
    Enable or disable automatic updates.

    Args:
        enabled: Whether automatic updates should be enabled
    """
    _check_permissions(current_user, ["system.update"])
    return await version_service.set_auto_update(enabled)


@router.put("/version/check-interval/{hours}", response_model=SystemVersion)
async def set_update_check_interval(
    hours: int, current_user: User = Depends(get_current_user)
):
    """
    Set the interval for checking for updates.

    Args:
        hours: Number of hours between update checks
    """
    _check_permissions(current_user, ["system.update"])
    return await version_service.set_update_check_interval(hours)


@router.get("/version/history", response_model=List[Dict[str, Any]])
async def get_update_history(current_user: User = Depends(get_current_user)):
    """Get the update history."""
    _check_permissions(current_user, ["system.read"])
    return await version_service.get_update_history()
