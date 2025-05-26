from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from typing import List, Dict, Any, Optional
from datetime import datetime

from ..models.supplier_models import (
    Supplier, 
    SupplierCreate, 
    SupplierUpdate, 
    SupplierQuery,
    PurchaseOrder,
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderStatus
)
from ..services.supplier_service import supplier_service
from src.auth.security import get_current_user
from src.auth.models import User, Permission
from src.logging.services.log_service import log_info, log_error, LogSource

router = APIRouter(prefix="/api/v1", tags=["suppliers"])

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

# Supplier endpoints
@router.post("/suppliers", response_model=Supplier)
async def create_supplier(
    supplier_data: SupplierCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new supplier."""
    _check_permissions(current_user, ["supplier.write"])
    
    return await supplier_service.create_supplier(
        supplier_data=supplier_data,
        user_id=current_user.id,
        user_name=current_user.username
    )

@router.get("/suppliers/{supplier_id}", response_model=Supplier)
async def get_supplier(
    supplier_id: str = Path(..., description="The ID of the supplier to get"),
    current_user: User = Depends(get_current_user)
):
    """Get a supplier by ID."""
    _check_permissions(current_user, ["supplier.read"])
    
    supplier = await supplier_service.get_supplier(supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier not found: {supplier_id}"
        )
    
    return supplier

@router.put("/suppliers/{supplier_id}", response_model=Supplier)
async def update_supplier(
    supplier_data: SupplierUpdate,
    supplier_id: str = Path(..., description="The ID of the supplier to update"),
    current_user: User = Depends(get_current_user)
):
    """Update a supplier."""
    _check_permissions(current_user, ["supplier.write"])
    
    updated_supplier = await supplier_service.update_supplier(
        supplier_id=supplier_id,
        supplier_data=supplier_data,
        user_id=current_user.id,
        user_name=current_user.username
    )
    
    if not updated_supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier not found: {supplier_id}"
        )
    
    return updated_supplier

@router.delete("/suppliers/{supplier_id}", response_model=Dict[str, Any])
async def delete_supplier(
    supplier_id: str = Path(..., description="The ID of the supplier to delete"),
    current_user: User = Depends(get_current_user)
):
    """Delete a supplier (mark as inactive)."""
    _check_permissions(current_user, ["supplier.write"])
    
    success = await supplier_service.delete_supplier(
        supplier_id=supplier_id,
        user_id=current_user.id,
        user_name=current_user.username
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete supplier: {supplier_id}. It may have active purchase orders."
        )
    
    return {"success": True, "message": "Supplier marked as inactive"}

@router.post("/suppliers/query", response_model=List[Supplier])
async def query_suppliers(
    query: SupplierQuery,
    current_user: User = Depends(get_current_user)
):
    """Query suppliers based on criteria."""
    _check_permissions(current_user, ["supplier.read"])
    
    return await supplier_service.query_suppliers(query)

@router.get("/suppliers/stats", response_model=Dict[str, Any])
async def get_supplier_statistics(
    current_user: User = Depends(get_current_user)
):
    """Get statistics about suppliers."""
    _check_permissions(current_user, ["supplier.read"])
    
    return await supplier_service.get_supplier_statistics()

# Purchase Order endpoints
@router.post("/purchase-orders", response_model=PurchaseOrder)
async def create_purchase_order(
    order_data: PurchaseOrderCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new purchase order."""
    _check_permissions(current_user, ["supplier.write"])
    
    try:
        return await supplier_service.create_purchase_order(
            order_data=order_data,
            user_id=current_user.id,
            user_name=current_user.username
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/purchase-orders/{order_id}", response_model=PurchaseOrder)
async def get_purchase_order(
    order_id: str = Path(..., description="The ID of the purchase order to get"),
    current_user: User = Depends(get_current_user)
):
    """Get a purchase order by ID."""
    _check_permissions(current_user, ["supplier.read"])
    
    order = await supplier_service.get_purchase_order(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Purchase order not found: {order_id}"
        )
    
    return order

@router.put("/purchase-orders/{order_id}", response_model=PurchaseOrder)
async def update_purchase_order(
    order_data: PurchaseOrderUpdate,
    order_id: str = Path(..., description="The ID of the purchase order to update"),
    current_user: User = Depends(get_current_user)
):
    """Update a purchase order."""
    _check_permissions(current_user, ["supplier.write"])
    
    updated_order = await supplier_service.update_purchase_order(
        order_id=order_id,
        order_data=order_data,
        user_id=current_user.id,
        user_name=current_user.username
    )
    
    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Purchase order not found or cannot be updated: {order_id}"
        )
    
    return updated_order

@router.put("/purchase-orders/{order_id}/status/{status}", response_model=PurchaseOrder)
async def change_purchase_order_status(
    order_id: str = Path(..., description="The ID of the purchase order"),
    status: PurchaseOrderStatus = Path(..., description="The new status"),
    current_user: User = Depends(get_current_user)
):
    """Change the status of a purchase order."""
    _check_permissions(current_user, ["supplier.write"])
    
    updated_order = await supplier_service.change_purchase_order_status(
        order_id=order_id,
        new_status=status,
        user_id=current_user.id,
        user_name=current_user.username
    )
    
    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change status of purchase order: {order_id} to {status}"
        )
    
    return updated_order

@router.get("/purchase-orders", response_model=List[PurchaseOrder])
async def query_purchase_orders(
    supplier_id: Optional[str] = Query(None, description="Filter by supplier ID"),
    status: Optional[PurchaseOrderStatus] = Query(None, description="Filter by status"),
    start_date: Optional[datetime] = Query(None, description="Filter by creation date (start)"),
    end_date: Optional[datetime] = Query(None, description="Filter by creation date (end)"),
    limit: int = Query(100, description="Maximum number of results"),
    offset: int = Query(0, description="Offset for pagination"),
    current_user: User = Depends(get_current_user)
):
    """Query purchase orders based on criteria."""
    _check_permissions(current_user, ["supplier.read"])
    
    return await supplier_service.query_purchase_orders(
        supplier_id=supplier_id,
        status=status,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )

@router.get("/purchase-orders/stats", response_model=Dict[str, Any])
async def get_purchase_order_statistics(
    current_user: User = Depends(get_current_user)
):
    """Get statistics about purchase orders."""
    _check_permissions(current_user, ["supplier.read"])
    
    return await supplier_service.get_purchase_order_statistics()
