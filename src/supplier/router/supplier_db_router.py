"""Database-backed supplier router."""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..models.supplier_models import (
    PurchaseOrder,
    PurchaseOrderCreate,
    PurchaseOrderStatus,
    PurchaseOrderUpdate,
    Supplier,
    SupplierCreate,
    SupplierProduct,
    SupplierQuery,
    SupplierUpdate,
)
from ..services.supplier_db_service import SupplierDBService, get_supplier_service

router = APIRouter(prefix="/api/v1/suppliers", tags=["suppliers-db"])


# Supplier endpoints
@router.post("/", response_model=Supplier, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    supplier_create: SupplierCreate,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Create a new supplier."""
    return await service.create_supplier(supplier_create)


@router.get("/", response_model=List[Supplier])
async def list_suppliers(
    name: Optional[str] = Query(None, description="Filter by name or trading name"),
    document: Optional[str] = Query(None, description="Filter by document"),
    category: Optional[str] = Query(None, description="Filter by category"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    min_rating: Optional[int] = Query(None, description="Minimum rating (1-5)"),
    city: Optional[str] = Query(None, description="Filter by city"),
    state: Optional[str] = Query(None, description="Filter by state"),
    limit: int = Query(100, ge=1, le=1000, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    service: SupplierDBService = Depends(get_supplier_service),
):
    """List suppliers with optional filters."""
    query = SupplierQuery(
        name=name,
        document=document,
        category=category,
        is_active=is_active,
        min_rating=min_rating,
        city=city,
        state=state,
        limit=limit,
        offset=offset,
    )
    return await service.list_suppliers(query)


@router.get("/{supplier_id}", response_model=Supplier)
async def get_supplier(
    supplier_id: str,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Get supplier by ID."""
    supplier = await service.get_supplier(supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )
    return supplier


@router.put("/{supplier_id}", response_model=Supplier)
async def update_supplier(
    supplier_id: str,
    supplier_update: SupplierUpdate,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Update supplier."""
    supplier = await service.update_supplier(supplier_id, supplier_update)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )
    return supplier


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(
    supplier_id: str,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Delete supplier (soft delete)."""
    success = await service.delete_supplier(supplier_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )


@router.get("/document/{document}", response_model=Supplier)
async def get_supplier_by_document(
    document: str,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Get supplier by document (CNPJ/CPF)."""
    supplier = await service.get_supplier_by_document(document)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )
    return supplier


# Supplier Product endpoints
@router.post(
    "/{supplier_id}/products",
    response_model=SupplierProduct,
    status_code=status.HTTP_201_CREATED,
)
async def add_supplier_product(
    supplier_id: str,
    product_id: str,
    product_name: str,
    unit_price: float,
    supplier_code: Optional[str] = None,
    min_order_quantity: int = 1,
    lead_time_days: int = 7,
    is_preferred: bool = False,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Add a product to a supplier."""
    return await service.add_supplier_product(
        supplier_id=supplier_id,
        product_id=product_id,
        product_name=product_name,
        supplier_code=supplier_code,
        unit_price=unit_price,
        min_order_quantity=min_order_quantity,
        lead_time_days=lead_time_days,
        is_preferred=is_preferred,
    )


@router.get("/{supplier_id}/products", response_model=List[SupplierProduct])
async def get_supplier_products(
    supplier_id: str,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Get products for a supplier."""
    return await service.get_supplier_products(supplier_id)


@router.get("/products/{product_id}/suppliers", response_model=List[SupplierProduct])
async def get_product_suppliers(
    product_id: str,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Get suppliers for a product."""
    return await service.get_product_suppliers(product_id)


@router.put("/{supplier_id}/products/{product_id}", response_model=SupplierProduct)
async def update_supplier_product(
    supplier_id: str,
    product_id: str,
    unit_price: Optional[float] = None,
    supplier_code: Optional[str] = None,
    min_order_quantity: Optional[int] = None,
    lead_time_days: Optional[int] = None,
    is_preferred: Optional[bool] = None,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Update supplier product relationship."""
    supplier_product = await service.update_supplier_product(
        supplier_id=supplier_id,
        product_id=product_id,
        unit_price=unit_price,
        supplier_code=supplier_code,
        min_order_quantity=min_order_quantity,
        lead_time_days=lead_time_days,
        is_preferred=is_preferred,
    )
    if not supplier_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier product relationship not found",
        )
    return supplier_product


@router.delete(
    "/{supplier_id}/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def remove_supplier_product(
    supplier_id: str,
    product_id: str,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Remove product from supplier."""
    success = await service.remove_supplier_product(supplier_id, product_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier product relationship not found",
        )


# Purchase Order endpoints
@router.post(
    "/purchase-orders",
    response_model=PurchaseOrder,
    status_code=status.HTTP_201_CREATED,
)
async def create_purchase_order(
    purchase_order_create: PurchaseOrderCreate,
    created_by: str = Query(..., description="User ID who is creating the order"),
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Create a new purchase order."""
    return await service.create_purchase_order(purchase_order_create, created_by)


@router.get("/purchase-orders", response_model=List[PurchaseOrder])
async def list_purchase_orders(
    supplier_id: Optional[str] = Query(None, description="Filter by supplier ID"),
    status: Optional[PurchaseOrderStatus] = Query(None, description="Filter by status"),
    created_by: Optional[str] = Query(None, description="Filter by creator"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    limit: int = Query(100, ge=1, le=1000, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    service: SupplierDBService = Depends(get_supplier_service),
):
    """List purchase orders with optional filters."""
    return await service.list_purchase_orders(
        supplier_id=supplier_id,
        status=status,
        created_by=created_by,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )


@router.get("/purchase-orders/{order_id}", response_model=PurchaseOrder)
async def get_purchase_order(
    order_id: str,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Get purchase order by ID."""
    purchase_order = await service.get_purchase_order(order_id)
    if not purchase_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )
    return purchase_order


@router.get("/purchase-orders/number/{order_number}", response_model=PurchaseOrder)
async def get_purchase_order_by_number(
    order_number: str,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Get purchase order by order number."""
    purchase_order = await service.get_purchase_order_by_number(order_number)
    if not purchase_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )
    return purchase_order


@router.put("/purchase-orders/{order_id}", response_model=PurchaseOrder)
async def update_purchase_order(
    order_id: str,
    purchase_order_update: PurchaseOrderUpdate,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Update purchase order (only in DRAFT status)."""
    purchase_order = await service.update_purchase_order(
        order_id, purchase_order_update
    )
    if not purchase_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )
    return purchase_order


@router.delete("/purchase-orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_purchase_order(
    order_id: str,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Delete purchase order (only in DRAFT status)."""
    success = await service.delete_purchase_order(order_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found or cannot be deleted",
        )


# Purchase Order Status Management
@router.post("/purchase-orders/{order_id}/send", response_model=PurchaseOrder)
async def send_purchase_order(
    order_id: str,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Send purchase order to supplier."""
    purchase_order = await service.send_purchase_order(order_id)
    if not purchase_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )
    return purchase_order


@router.post("/purchase-orders/{order_id}/confirm", response_model=PurchaseOrder)
async def confirm_purchase_order(
    order_id: str,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Confirm purchase order from supplier."""
    purchase_order = await service.confirm_purchase_order(order_id)
    if not purchase_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )
    return purchase_order


@router.post("/purchase-orders/{order_id}/receive", response_model=PurchaseOrder)
async def receive_purchase_order(
    order_id: str,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Mark purchase order as received."""
    purchase_order = await service.receive_purchase_order(order_id)
    if not purchase_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )
    return purchase_order


@router.post("/purchase-orders/{order_id}/cancel", response_model=PurchaseOrder)
async def cancel_purchase_order(
    order_id: str,
    service: SupplierDBService = Depends(get_supplier_service),
):
    """Cancel purchase order."""
    purchase_order = await service.cancel_purchase_order(order_id)
    if not purchase_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )
    return purchase_order
