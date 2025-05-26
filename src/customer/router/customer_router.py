# /home/ubuntu/pos-modern/src/customer/router/customer_router.py

from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional
import uuid

from ..models.customer_models import (
    Customer, CustomerCreate, CustomerUpdate, Address, PurchaseHistoryEntry, Loyalty,
    Coupon, CouponCreate, CouponUpdate, CouponRedemption, PointsRedemption
)
from ..services.customer_service import customer_service, CustomerService
from src.auth.security import get_current_user
from src.auth.models import User, Permission

router = APIRouter(
    prefix="/api/v1/customers",
    tags=["Customers"],
)

def _check_permissions(user: User, required_permissions: List[str]):
    """Helper function to check user permissions inline."""
    if Permission.ALL in user.permissions:
        return # User has all permissions
    for perm in required_permissions:
        if perm not in user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissão necessária: {perm}"
            )

# === Customer Endpoints ===

@router.post("/", response_model=Customer, status_code=status.HTTP_201_CREATED)
async def create_customer_endpoint(
    customer_create: CustomerCreate,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Creates a new customer."""
    _check_permissions(current_user, ["customers.create"])
    return await service.create_customer(customer_create)

@router.get("/", response_model=List[Customer])
async def list_customers_endpoint(
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Lists all customers, optionally filtering by name, phone, or email."""
    _check_permissions(current_user, ["customers.read"])
    return await service.list_customers(search)

@router.get("/{customer_id}", response_model=Customer)
async def get_customer_endpoint(
    customer_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Retrieves a specific customer by their ID."""
    _check_permissions(current_user, ["customers.read"])
    customer = await service.get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer

@router.put("/{customer_id}", response_model=Customer)
async def update_customer_endpoint(
    customer_id: uuid.UUID,
    customer_update: CustomerUpdate,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Updates basic customer details (name, phone, email)."""
    _check_permissions(current_user, ["customers.update"])
    updated_customer = await service.update_customer(customer_id, customer_update)
    if not updated_customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return updated_customer

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer_endpoint(
    customer_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Deletes a customer."""
    _check_permissions(current_user, ["customers.delete"])
    deleted = await service.delete_customer(customer_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return None

# === Address Endpoints ===

@router.post("/{customer_id}/addresses/", response_model=Customer)
async def add_customer_address_endpoint(
    customer_id: uuid.UUID,
    address: Address,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Adds a new address to a customer."""
    _check_permissions(current_user, ["customers.update"])
    customer = await service.add_address(customer_id, address)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer

@router.put("/{customer_id}/addresses/{address_id}", response_model=Customer)
async def update_customer_address_endpoint(
    customer_id: uuid.UUID,
    address_id: uuid.UUID,
    address_update: Address, # Send the full updated address object
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Updates an existing address for a customer."""
    _check_permissions(current_user, ["customers.update"])
    try:
        customer = await service.update_address(customer_id, address_id, address_update)
        if not customer:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found") # Should not happen if service raises
        return customer
    except HTTPException as e:
        raise e # Propagate 404 if address not found
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/{customer_id}/addresses/{address_id}", response_model=Customer)
async def delete_customer_address_endpoint(
    customer_id: uuid.UUID,
    address_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Deletes an address from a customer."""
    _check_permissions(current_user, ["customers.update"])
    try:
        customer = await service.delete_address(customer_id, address_id)
        if not customer:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found") # Should not happen if service raises
        return customer
    except HTTPException as e:
        raise e # Propagate 404 if address not found
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# === Loyalty Endpoints ===

@router.patch("/{customer_id}/loyalty/", response_model=Loyalty)
async def update_customer_loyalty_points_endpoint(
    customer_id: uuid.UUID,
    points_change: int = Body(..., embed=True, description="Number of points to add (positive) or subtract (negative)"),
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Updates the loyalty points for a customer."""
    _check_permissions(current_user, ["customers.update"])
    loyalty = await service.update_loyalty_points(customer_id, points_change)
    if not loyalty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return loyalty

@router.get("/{customer_id}/loyalty/calculate-discount", response_model=dict)
async def calculate_points_discount_endpoint(
    customer_id: uuid.UUID,
    points_to_redeem: int,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Calculates the discount amount for a given number of points."""
    _check_permissions(current_user, ["customers.read"])
    try:
        return await service.calculate_points_discount(customer_id, points_to_redeem)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# === Purchase History Endpoints ===

@router.post("/{customer_id}/purchases/", response_model=Customer)
async def add_customer_purchase_history_endpoint(
    customer_id: uuid.UUID,
    purchase: PurchaseHistoryEntry,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Adds a purchase record to the customer's history. Should typically be called internally when an order is completed."""
    _check_permissions(current_user, ["customers.update"])
    customer = await service.add_purchase_history(customer_id, purchase)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer

# === Coupon Management Endpoints ===

@router.post("/coupons/", response_model=Coupon, status_code=status.HTTP_201_CREATED)
async def create_coupon_endpoint(
    coupon_create: CouponCreate,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Creates a new coupon."""
    _check_permissions(current_user, ["coupons.create"])
    try:
        return await service.create_coupon(coupon_create)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/coupons/", response_model=List[Coupon])
async def list_coupons_endpoint(
    active_only: bool = False,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Lists all coupons, optionally filtering by active status."""
    _check_permissions(current_user, ["coupons.read"])
    return await service.list_coupons(active_only)

@router.get("/coupons/{coupon_id}", response_model=Coupon)
async def get_coupon_endpoint(
    coupon_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Retrieves a specific coupon by its ID."""
    _check_permissions(current_user, ["coupons.read"])
    coupon = await service.get_coupon(coupon_id)
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    return coupon

@router.get("/coupons/code/{code}", response_model=Coupon)
async def get_coupon_by_code_endpoint(
    code: str,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Retrieves a specific coupon by its code."""
    _check_permissions(current_user, ["coupons.read"])
    coupon = await service.get_coupon_by_code(code)
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    return coupon

@router.put("/coupons/{coupon_id}", response_model=Coupon)
async def update_coupon_endpoint(
    coupon_id: uuid.UUID,
    coupon_update: CouponUpdate,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Updates a coupon."""
    _check_permissions(current_user, ["coupons.update"])
    updated_coupon = await service.update_coupon(coupon_id, coupon_update)
    if not updated_coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    return updated_coupon

@router.delete("/coupons/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coupon_endpoint(
    coupon_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Deletes a coupon."""
    _check_permissions(current_user, ["coupons.delete"])
    deleted = await service.delete_coupon(coupon_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    return None

@router.post("/coupons/validate", response_model=dict)
async def validate_coupon_endpoint(
    code: str,
    order_value: float,
    product_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(lambda: customer_service)
):
    """Validates a coupon and calculates the discount amount."""
    _check_permissions(current_user, ["coupons.read"])
    try:
        return await service.validate_coupon(code, order_value, product_id)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
