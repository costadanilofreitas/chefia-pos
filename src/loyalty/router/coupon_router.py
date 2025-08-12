from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
import uuid

from ..models.coupon_models import Coupon, CouponCreate, CouponUpdate
from ..services.coupon_service import coupon_service
from src.auth.security import get_current_active_user

router = APIRouter(
    prefix="/api/v1/coupons",
    tags=["Coupons"],
    responses={401: {"description": "Não autorizado"}},
)


def _check_permissions(current_user, required_permissions: List[str]):
    """Check if user has required permissions."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )

    user_permissions = getattr(current_user, "permissions", [])
    for permission in required_permissions:
        if permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required",
            )


@router.post("/", response_model=Coupon, status_code=status.HTTP_201_CREATED)
async def create_coupon_endpoint(
    coupon_create: CouponCreate, current_user=Depends(get_current_active_user)
):
    """Creates a new coupon."""
    _check_permissions(current_user, ["coupons.create"])
    return await coupon_service.create_coupon(coupon_create)


@router.get("/", response_model=List[Coupon])
async def list_coupons_endpoint(
    active_only: bool = False, current_user=Depends(get_current_active_user)
):
    """Lists all coupons, optionally filtering by active status."""
    _check_permissions(current_user, ["coupons.read"])
    return await coupon_service.list_coupons(active_only)


@router.get("/{coupon_id}", response_model=Coupon)
async def get_coupon_endpoint(
    coupon_id: uuid.UUID, current_user=Depends(get_current_active_user)
):
    """Retrieves a specific coupon by ID."""
    _check_permissions(current_user, ["coupons.read"])
    coupon = await coupon_service.get_coupon(coupon_id)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return coupon


@router.get("/code/{code}", response_model=Coupon)
async def get_coupon_by_code_endpoint(
    code: str, current_user=Depends(get_current_active_user)
):
    """Retrieves a specific coupon by code."""
    _check_permissions(current_user, ["coupons.read"])
    coupon = await coupon_service.get_coupon_by_code(code)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return coupon


@router.put("/{coupon_id}", response_model=Coupon)
async def update_coupon_endpoint(
    coupon_id: uuid.UUID,
    coupon_update: CouponUpdate,
    current_user=Depends(get_current_active_user),
):
    """Updates an existing coupon."""
    _check_permissions(current_user, ["coupons.update"])
    coupon = await coupon_service.update_coupon(coupon_id, coupon_update)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return coupon


@router.delete("/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coupon_endpoint(
    coupon_id: uuid.UUID, current_user=Depends(get_current_active_user)
):
    """Deletes a coupon."""
    _check_permissions(current_user, ["coupons.delete"])
    success = await coupon_service.delete_coupon(coupon_id)
    if not success:
        raise HTTPException(status_code=404, detail="Coupon not found")


@router.post("/validate", response_model=dict)
async def validate_coupon_endpoint(
    code: str,
    order_value: float,
    product_id: Optional[uuid.UUID] = None,
    current_user=Depends(get_current_active_user),
):
    """Validates a coupon for use in an order."""
    _check_permissions(current_user, ["coupons.read"])
    return await coupon_service.validate_coupon(code, order_value, product_id)
