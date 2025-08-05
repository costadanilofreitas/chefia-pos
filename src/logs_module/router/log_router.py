from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional

from ..models.log_models import LogEntry, LogQuery, LogStats, LogConfig, LogSource
from ..services.log_service import log_service, log_info, log_error
from src.auth.security import get_current_user
from src.auth.models import User, Permission

router = APIRouter(prefix="/api/v1", tags=["logging"])


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


@router.post("/logs", response_model=LogEntry)
async def create_log_entry(
    entry: LogEntry, current_user: User = Depends(get_current_user)
):
    """Create a new log entry."""
    _check_permissions(current_user, ["logs.write"])

    # Add user information if not provided
    if not entry.user_id and current_user:
        entry.user_id = current_user.id
        entry.user_name = current_user.username

    return await log_service.log(entry)


@router.post("/logs/query", response_model=List[LogEntry])
async def query_logs(query: LogQuery, current_user: User = Depends(get_current_user)):
    """Query logs based on criteria."""
    _check_permissions(current_user, ["logs.read"])

    # Log this query for audit purposes
    await log_info(
        message=f"Log query executed by {current_user.username}",
        source=LogSource.SYSTEM,
        module="logging",
        user_id=current_user.id,
        user_name=current_user.username,
        details={"query": query.dict()},
    )

    return await log_service.query_logs(query)


@router.post("/logs/stats", response_model=LogStats)
async def get_log_stats(
    query: Optional[LogQuery] = None, current_user: User = Depends(get_current_user)
):
    """Get statistics about logs."""
    _check_permissions(current_user, ["logs.read"])
    return await log_service.get_log_stats(query)


@router.get("/logs/config", response_model=LogConfig)
async def get_log_config(current_user: User = Depends(get_current_user)):
    """Get the current log configuration."""
    _check_permissions(current_user, ["logs.admin"])
    return await log_service.get_log_config()


@router.put("/logs/config", response_model=LogConfig)
async def update_log_config(
    config: LogConfig, current_user: User = Depends(get_current_user)
):
    """Update the log configuration."""
    _check_permissions(current_user, ["logs.admin"])

    # Log this configuration change
    await log_info(
        message=f"Log configuration updated by {current_user.username}",
        source=LogSource.SYSTEM,
        module="logging",
        user_id=current_user.id,
        user_name=current_user.username,
        details={"new_config": config.dict()},
    )

    return await log_service.update_log_config(config)


@router.delete("/logs", response_model=Dict[str, Any])
async def clear_logs(
    days_to_keep: int = Query(
        0, description="Number of days of logs to keep (0 means clear all)"
    ),
    current_user: User = Depends(get_current_user),
):
    """Clear logs older than the specified number of days."""
    _check_permissions(current_user, ["logs.admin"])

    # Log this action
    await log_warning(
        message=f"Log clearing initiated by {current_user.username}, keeping {days_to_keep} days",
        source=LogSource.SYSTEM,
        module="logging",
        user_id=current_user.id,
        user_name=current_user.username,
    )

    result = await log_service.clear_logs(days_to_keep)

    # Log the result
    await log_info(
        message=f"Log clearing completed: {result['files_removed']} files, {result['entries_removed']} entries removed",
        source=LogSource.SYSTEM,
        module="logging",
        user_id=current_user.id,
        user_name=current_user.username,
        details=result,
    )

    return result


@router.post("/logs/export", response_model=Dict[str, str])
async def export_logs(
    query: LogQuery,
    format: str = Query("json", description="Export format (json, csv, or txt)"),
    current_user: User = Depends(get_current_user),
):
    """Export logs to a file."""
    _check_permissions(current_user, ["logs.read"])

    if format not in ["json", "csv", "txt"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported export format: {format}",
        )

    # Log this export
    await log_info(
        message=f"Log export initiated by {current_user.username} in {format} format",
        source=LogSource.SYSTEM,
        module="logging",
        user_id=current_user.id,
        user_name=current_user.username,
        details={"query": query.dict(), "format": format},
    )

    try:
        export_path = await log_service.export_logs(query, format)

        return {"success": True, "file_path": export_path, "format": format}
    except Exception as e:
        # Log the error
        await log_error(
            message=f"Log export failed: {str(e)}",
            source=LogSource.SYSTEM,
            module="logging",
            user_id=current_user.id,
            user_name=current_user.username,
            details={"error": str(e)},
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export logs: {str(e)}",
        )
