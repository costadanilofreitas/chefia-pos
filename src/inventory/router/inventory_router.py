from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid
from datetime import datetime

from ..models.inventory_models import (
    InventoryItem, InventoryItemCreate, InventoryItemUpdate,
    InventoryTransaction, InventoryTransactionCreate, TransactionType, TransactionStatus,
    InventoryLoss, InventoryLossCreate, LossReason,
    InventoryCount, InventoryCountCreate, InventoryCountStatus
)
from ..services.inventory_service import InventoryService

# Create router
router = APIRouter(
    prefix="/inventory",
    tags=["inventory"],
    responses={404: {"description": "Not found"}}
)

# Dependency to get inventory service
async def get_inventory_service():
    # In a real application, this would include database connection and other dependencies
    return InventoryService()

# === Inventory Item Endpoints ===
@router.post("/items", response_model=InventoryItem, status_code=status.HTTP_201_CREATED)
async def create_inventory_item(
    item_create: InventoryItemCreate,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Creates a new inventory item."""
    return await inventory_service.create_inventory_item(item_create)

@router.get("/items", response_model=List[InventoryItem])
async def list_inventory_items(
    category_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    low_stock_only: bool = False,
    active_only: bool = True,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Lists inventory items with optional filtering."""
    return await inventory_service.list_inventory_items(
        category_id=category_id,
        search=search,
        low_stock_only=low_stock_only,
        active_only=active_only
    )

@router.get("/items/{item_id}", response_model=InventoryItem)
async def get_inventory_item(
    item_id: uuid.UUID,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Retrieves an inventory item by its ID."""
    item = await inventory_service.get_inventory_item(item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory item with ID {item_id} not found"
        )
    return item

@router.put("/items/{item_id}", response_model=InventoryItem)
async def update_inventory_item(
    item_id: uuid.UUID,
    item_update: InventoryItemUpdate,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Updates an inventory item."""
    updated_item = await inventory_service.update_inventory_item(item_id, item_update)
    if not updated_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory item with ID {item_id} not found"
        )
    return updated_item

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory_item(
    item_id: uuid.UUID,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Deletes an inventory item (soft delete)."""
    success = await inventory_service.delete_inventory_item(item_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory item with ID {item_id} not found"
        )
    return None

# === Inventory Transaction Endpoints ===
@router.post("/transactions", response_model=InventoryTransaction, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_create: InventoryTransactionCreate,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Creates a new inventory transaction."""
    return await inventory_service.create_transaction(transaction_create)

@router.get("/transactions", response_model=List[InventoryTransaction])
async def list_transactions(
    item_id: Optional[uuid.UUID] = None,
    transaction_type: Optional[TransactionType] = None,
    status: Optional[TransactionStatus] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Lists inventory transactions with optional filtering."""
    return await inventory_service.list_transactions(
        item_id=item_id,
        transaction_type=transaction_type,
        status=status,
        start_date=start_date,
        end_date=end_date
    )

@router.get("/transactions/{transaction_id}", response_model=InventoryTransaction)
async def get_transaction(
    transaction_id: uuid.UUID,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Retrieves a transaction by its ID."""
    transaction = await inventory_service.get_transaction(transaction_id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction with ID {transaction_id} not found"
        )
    return transaction

@router.post("/transactions/{transaction_id}/approve", response_model=InventoryTransaction)
async def approve_transaction(
    transaction_id: uuid.UUID,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Approves a pending inventory transaction."""
    # In a real application, get the current user's ID
    approver_id = uuid.uuid4()
    return await inventory_service.approve_transaction(transaction_id, approver_id)

@router.post("/transactions/{transaction_id}/reject", response_model=InventoryTransaction)
async def reject_transaction(
    transaction_id: uuid.UUID,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Rejects a pending inventory transaction."""
    # In a real application, get the current user's ID
    approver_id = uuid.uuid4()
    return await inventory_service.reject_transaction(transaction_id, approver_id)

# === Inventory Loss Endpoints ===
@router.post("/losses", response_model=InventoryLoss, status_code=status.HTTP_201_CREATED)
async def report_loss(
    loss_create: InventoryLossCreate,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Reports an inventory loss."""
    return await inventory_service.report_loss(loss_create)

@router.get("/losses", response_model=List[InventoryLoss])
async def list_losses(
    item_id: Optional[uuid.UUID] = None,
    reason: Optional[LossReason] = None,
    status: Optional[TransactionStatus] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Lists inventory losses with optional filtering."""
    return await inventory_service.list_losses(
        item_id=item_id,
        reason=reason,
        status=status,
        start_date=start_date,
        end_date=end_date
    )

@router.get("/losses/{loss_id}", response_model=InventoryLoss)
async def get_loss(
    loss_id: uuid.UUID,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Retrieves a loss record by its ID."""
    loss = await inventory_service.get_loss(loss_id)
    if not loss:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Loss record with ID {loss_id} not found"
        )
    return loss

@router.post("/losses/{loss_id}/approve", response_model=InventoryLoss)
async def approve_loss(
    loss_id: uuid.UUID,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Approves a pending inventory loss."""
    # In a real application, get the current user's ID
    approver_id = uuid.uuid4()
    return await inventory_service.approve_loss(loss_id, approver_id)

@router.post("/losses/{loss_id}/reject", response_model=InventoryLoss)
async def reject_loss(
    loss_id: uuid.UUID,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Rejects a pending inventory loss."""
    # In a real application, get the current user's ID
    approver_id = uuid.uuid4()
    return await inventory_service.reject_loss(loss_id, approver_id)

# === Inventory Count Endpoints ===
@router.post("/counts", response_model=InventoryCount, status_code=status.HTTP_201_CREATED)
async def create_inventory_count(
    count_create: InventoryCountCreate,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Creates a new inventory count."""
    return await inventory_service.create_inventory_count(count_create)

@router.get("/counts", response_model=List[InventoryCount])
async def list_inventory_counts(
    status: Optional[InventoryCountStatus] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Lists inventory counts with optional filtering."""
    return await inventory_service.list_inventory_counts(
        status=status,
        start_date=start_date,
        end_date=end_date
    )

@router.get("/counts/{count_id}", response_model=InventoryCount)
async def get_inventory_count(
    count_id: uuid.UUID,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Retrieves an inventory count by its ID."""
    count = await inventory_service.get_inventory_count(count_id)
    if not count:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory count with ID {count_id} not found"
        )
    return count

@router.post("/counts/{count_id}/submit", response_model=InventoryCount)
async def submit_inventory_count(
    count_id: uuid.UUID,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Submits an inventory count for approval."""
    return await inventory_service.submit_inventory_count(count_id)

@router.post("/counts/{count_id}/approve", response_model=InventoryCount)
async def approve_inventory_count(
    count_id: uuid.UUID,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Approves an inventory count and applies adjustments."""
    # In a real application, get the current user's ID
    approver_id = uuid.uuid4()
    return await inventory_service.approve_inventory_count(count_id, approver_id)

@router.post("/counts/{count_id}/reject", response_model=InventoryCount)
async def reject_inventory_count(
    count_id: uuid.UUID,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Rejects an inventory count."""
    # In a real application, get the current user's ID
    approver_id = uuid.uuid4()
    return await inventory_service.reject_inventory_count(count_id, approver_id)
