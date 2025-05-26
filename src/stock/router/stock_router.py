# /home/ubuntu/pos-modern/src/stock/router/stock_router.py

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import uuid

from ..models.stock_models import (
    StockItem, StockItemCreate, StockMovement, StockMovementCreate, StockLevel
)
from ..services.stock_service import stock_service, StockService
# No dependency needed for licensing check as this is a basic module

router = APIRouter(
    prefix="/api/v1/stock",
    tags=["Stock"],
    # dependencies=[Depends(get_licensed_stock_instance)] # Removed licensing dependency
)

# === Stock Items Endpoints ===

@router.post("/items/", response_model=StockItem, status_code=status.HTTP_201_CREATED)
async def create_stock_item_endpoint(
    item_create: StockItemCreate,
    service: StockService = Depends(lambda: stock_service)
):
    """Creates a new stock item."""
    return await service.create_stock_item(item_create)

@router.get("/items/", response_model=List[StockItem])
async def list_stock_items_endpoint(
    service: StockService = Depends(lambda: stock_service)
):
    """Lists all available stock items."""
    return await service.list_stock_items()

@router.get("/items/{item_id}", response_model=StockItem)
async def get_stock_item_endpoint(
    item_id: uuid.UUID,
    service: StockService = Depends(lambda: stock_service)
):
    """Retrieves a specific stock item by its ID."""
    item = await service.get_stock_item(item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock item not found")
    return item

@router.put("/items/{item_id}", response_model=StockItem)
async def update_stock_item_endpoint(
    item_id: uuid.UUID,
    item_update: StockItemBase, # Use base, disallow changing quantity directly here
    service: StockService = Depends(lambda: stock_service)
):
    """Updates a stock item's details (name, unit, threshold). Quantity is updated via movements."""
    updated_item = await service.update_stock_item(item_id, item_update.dict(exclude_unset=True))
    if not updated_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock item not found")
    return updated_item

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_stock_item_endpoint(
    item_id: uuid.UUID,
    service: StockService = Depends(lambda: stock_service)
):
    """Deletes a stock item."""
    deleted = await service.delete_stock_item(item_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock item not found")
    return None

# === Stock Movements Endpoints ===

@router.post("/movements/", response_model=StockMovement, status_code=status.HTTP_201_CREATED)
async def record_stock_movement_endpoint(
    movement_create: StockMovementCreate,
    service: StockService = Depends(lambda: stock_service)
):
    """Records a new stock movement (entry, exit, adjustment)."""
    try:
        return await service.record_movement(movement_create)
    except HTTPException as e:
        # Propagate HTTP exceptions from the service layer (e.g., item not found)
        raise e
    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/movements/", response_model=List[StockMovement])
async def get_stock_movements_endpoint(
    item_id: Optional[uuid.UUID] = None,
    service: StockService = Depends(lambda: stock_service)
):
    """Retrieves the history of stock movements, optionally filtered by stock item ID."""
    return await service.get_movement_history(item_id)

# === Stock Levels & Reports Endpoints ===

@router.get("/levels/", response_model=List[StockLevel])
async def get_stock_levels_endpoint(
    low_stock_only: bool = False,
    service: StockService = Depends(lambda: stock_service)
):
    """Retrieves the current stock levels for all items. Can filter for low stock items."""
    return await service.get_stock_levels(low_stock_only)

