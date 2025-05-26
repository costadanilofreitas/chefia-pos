from fastapi import HTTPException, status, Depends
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import logging

from ..models.inventory_models import (
    InventoryItem, InventoryItemCreate, InventoryItemUpdate,
    InventoryTransaction, InventoryTransactionCreate, TransactionType, TransactionStatus,
    InventoryLoss, InventoryLossCreate, LossReason,
    InventoryCount, InventoryCountCreate, InventoryCountStatus,
    FinancialEntry, FinancialEntryType
)

# Import financial service for integration
from src.accounts.services.accounts_service import AccountsService

# Setup logging
logger = logging.getLogger(__name__)

# In-memory storage (replace with database interaction)
_inventory_items_db: Dict[uuid.UUID, InventoryItem] = {}
_inventory_transactions_db: Dict[uuid.UUID, InventoryTransaction] = {}
_inventory_losses_db: Dict[uuid.UUID, InventoryLoss] = {}
_inventory_counts_db: Dict[uuid.UUID, InventoryCount] = {}
_financial_entries_db: Dict[uuid.UUID, FinancialEntry] = {}

class InventoryService:
    """Service layer for managing inventory items, transactions, losses, and counts."""
    
    def __init__(self, accounts_service: AccountsService = None):
        """Initialize with optional accounts service for financial integration."""
        self.accounts_service = accounts_service
    
    # === Inventory Item Management ===
    async def create_inventory_item(self, item_create: InventoryItemCreate) -> InventoryItem:
        """Creates a new inventory item."""
        item_id = uuid.uuid4()
        now = datetime.utcnow()
        
        # Calculate initial value
        initial_value = item_create.initial_stock * item_create.cost_per_unit
        
        item = InventoryItem(
            id=item_id,
            current_stock=item_create.initial_stock,
            cost_per_unit=item_create.cost_per_unit,
            value=initial_value,
            created_at=now,
            updated_at=now,
            last_stock_update=now if item_create.initial_stock > 0 else None,
            **item_create.dict(exclude={"initial_stock"})
        )
        
        _inventory_items_db[item_id] = item
        
        # Create initial transaction if initial stock > 0
        if item_create.initial_stock > 0:
            await self.create_transaction(InventoryTransactionCreate(
                item_id=item_id,
                quantity=item_create.initial_stock,
                transaction_type=TransactionType.INITIAL,
                notes="Initial stock setup",
                unit_cost=item_create.cost_per_unit
            ))
        
        return item
    
    async def get_inventory_item(self, item_id: uuid.UUID) -> Optional[InventoryItem]:
        """Retrieves an inventory item by its ID."""
        return _inventory_items_db.get(item_id)
    
    async def list_inventory_items(
        self, 
        category_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        low_stock_only: bool = False,
        active_only: bool = True
    ) -> List[InventoryItem]:
        """Lists inventory items with optional filtering."""
        items = list(_inventory_items_db.values())
        
        # Apply filters
        if category_id:
            items = [item for item in items if item.category_id == category_id]
        
        if search:
            search_lower = search.lower()
            items = [
                item for item in items
                if search_lower in item.name.lower() or
                   (item.sku and search_lower in item.sku.lower()) or
                   (item.barcode and search_lower in item.barcode.lower()) or
                   (item.description and search_lower in item.description.lower())
            ]
        
        if low_stock_only:
            items = [item for item in items if item.current_stock <= item.reorder_point]
        
        if active_only:
            items = [item for item in items if item.is_active]
        
        return items
    
    async def update_inventory_item(self, item_id: uuid.UUID, item_update: InventoryItemUpdate) -> Optional[InventoryItem]:
        """Updates an inventory item."""
        item = await self.get_inventory_item(item_id)
        if not item:
            return None
        
        update_data = item_update.dict(exclude_unset=True)
        if not update_data:
            return item  # No changes requested
        
        # Handle cost_per_unit update specially to recalculate value
        if "cost_per_unit" in update_data:
            new_cost = update_data["cost_per_unit"]
            update_data["value"] = item.current_stock * new_cost
        
        updated_item = item.copy(update=update_data)
        updated_item.updated_at = datetime.utcnow()
        
        _inventory_items_db[item_id] = updated_item
        return updated_item
    
    async def delete_inventory_item(self, item_id: uuid.UUID) -> bool:
        """Deletes an inventory item (soft delete by setting is_active=False)."""
        item = await self.get_inventory_item(item_id)
        if not item:
            return False
        
        # Soft delete by setting is_active to False
        item.is_active = False
        item.updated_at = datetime.utcnow()
        _inventory_items_db[item_id] = item
        
        return True
    
    # === Inventory Transaction Management ===
    async def create_transaction(self, transaction_create: InventoryTransactionCreate) -> InventoryTransaction:
        """Creates a new inventory transaction."""
        item = await self.get_inventory_item(transaction_create.item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory item with ID {transaction_create.item_id} not found"
            )
        
        # Get unit cost from item if not provided
        unit_cost = transaction_create.unit_cost if transaction_create.unit_cost is not None else item.cost_per_unit
        
        # Calculate stock changes based on transaction type
        previous_stock = item.current_stock
        quantity = transaction_create.quantity
        
        # Determine if this is an addition or reduction
        is_addition = transaction_create.transaction_type in [
            TransactionType.PURCHASE, 
            TransactionType.RETURN, 
            TransactionType.INITIAL
        ]
        
        is_reduction = transaction_create.transaction_type in [
            TransactionType.SALE, 
            TransactionType.LOSS, 
            TransactionType.PRODUCTION
        ]
        
        # For adjustments, determine based on quantity sign
        if transaction_create.transaction_type == TransactionType.ADJUSTMENT:
            is_addition = quantity > 0
            is_reduction = quantity < 0
            # Use absolute value for calculations
            quantity = abs(quantity)
        
        # Calculate new stock
        if is_addition:
            new_stock = previous_stock + quantity
            value_change = quantity * unit_cost
        elif is_reduction:
            if previous_stock < quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock. Current: {previous_stock}, Requested: {quantity}"
                )
            new_stock = previous_stock - quantity
            value_change = -(quantity * unit_cost)  # Negative for reductions
        else:
            # For transfers or other types, handle specially
            new_stock = previous_stock
            value_change = 0
        
        # Create transaction
        transaction_id = uuid.uuid4()
        now = datetime.utcnow()
        
        transaction = InventoryTransaction(
            id=transaction_id,
            previous_stock=previous_stock,
            new_stock=new_stock,
            value_change=value_change,
            unit_cost=unit_cost,
            created_at=now,
            updated_at=now,
            **transaction_create.dict()
        )
        
        # For certain transaction types, auto-approve
        auto_approve_types = [
            TransactionType.PURCHASE,
            TransactionType.SALE,
            TransactionType.INITIAL
        ]
        
        if transaction.transaction_type in auto_approve_types:
            transaction.status = TransactionStatus.APPROVED
            transaction.approved_at = now
            # In a real system, this would be the current user's ID
            transaction.approved_by = uuid.uuid4()
            
            # Update item stock immediately
            await self._update_item_stock(item, new_stock, unit_cost)
        
        _inventory_transactions_db[transaction_id] = transaction
        
        # Create financial entry for certain transaction types
        if transaction.status == TransactionStatus.APPROVED:
            if transaction.transaction_type == TransactionType.PURCHASE:
                await self._create_financial_entry(
                    entry_type=FinancialEntryType.INVENTORY_PURCHASE,
                    reference_id=transaction_id,
                    reference_type="transaction",
                    amount=value_change,
                    description=f"Inventory purchase: {item.name} x {quantity}",
                    is_posted=True
                )
        
        return transaction
    
    async def get_transaction(self, transaction_id: uuid.UUID) -> Optional[InventoryTransaction]:
        """Retrieves a transaction by its ID."""
        return _inventory_transactions_db.get(transaction_id)
    
    async def list_transactions(
        self,
        item_id: Optional[uuid.UUID] = None,
        transaction_type: Optional[TransactionType] = None,
        status: Optional[TransactionStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[InventoryTransaction]:
        """Lists inventory transactions with optional filtering."""
        transactions = list(_inventory_transactions_db.values())
        
        # Apply filters
        if item_id:
            transactions = [t for t in transactions if t.item_id == item_id]
        
        if transaction_type:
            transactions = [t for t in transactions if t.transaction_type == transaction_type]
        
        if status:
            transactions = [t for t in transactions if t.status == status]
        
        if start_date:
            transactions = [t for t in transactions if t.created_at >= start_date]
        
        if end_date:
            transactions = [t for t in transactions if t.created_at <= end_date]
        
        # Sort by created_at (newest first)
        transactions.sort(key=lambda t: t.created_at, reverse=True)
        
        return transactions
    
    async def approve_transaction(self, transaction_id: uuid.UUID, approver_id: uuid.UUID) -> InventoryTransaction:
        """Approves a pending inventory transaction."""
        transaction = await self.get_transaction(transaction_id)
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction with ID {transaction_id} not found"
            )
        
        if transaction.status != TransactionStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transaction is not in PENDING status. Current status: {transaction.status}"
            )
        
        # Update transaction status
        transaction.status = TransactionStatus.APPROVED
        transaction.approved_by = approver_id
        transaction.approved_at = datetime.utcnow()
        transaction.updated_at = datetime.utcnow()
        
        _inventory_transactions_db[transaction_id] = transaction
        
        # Update item stock
        item = await self.get_inventory_item(transaction.item_id)
        await self._update_item_stock(item, transaction.new_stock, transaction.unit_cost)
        
        # Create financial entry if needed
        if transaction.transaction_type == TransactionType.PURCHASE:
            await self._create_financial_entry(
                entry_type=FinancialEntryType.INVENTORY_PURCHASE,
                reference_id=transaction_id,
                reference_type="transaction",
                amount=transaction.value_change,
                description=f"Inventory purchase: {item.name} x {transaction.quantity}",
                is_posted=True
            )
        elif transaction.transaction_type == TransactionType.ADJUSTMENT and transaction.value_change != 0:
            await self._create_financial_entry(
                entry_type=FinancialEntryType.INVENTORY_ADJUSTMENT,
                reference_id=transaction_id,
                reference_type="transaction",
                amount=transaction.value_change,
                description=f"Inventory adjustment: {item.name}",
                is_posted=True
            )
        
        return transaction
    
    async def reject_transaction(self, transaction_id: uuid.UUID, approver_id: uuid.UUID) -> InventoryTransaction:
        """Rejects a pending inventory transaction."""
        transaction = await self.get_transaction(transaction_id)
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction with ID {transaction_id} not found"
            )
        
        if transaction.status != TransactionStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transaction is not in PENDING status. Current status: {transaction.status}"
            )
        
        # Update transaction status
        transaction.status = TransactionStatus.REJECTED
        transaction.approved_by = approver_id
        transaction.approved_at = datetime.utcnow()
        transaction.updated_at = datetime.utcnow()
        
        _inventory_transactions_db[transaction_id] = transaction
        
        return transaction
    
    # === Inventory Loss Management ===
    async def report_loss(self, loss_create: InventoryLossCreate) -> InventoryLoss:
        """Reports an inventory loss."""
        item = await self.get_inventory_item(loss_create.item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory item with ID {loss_create.item_id} not found"
            )
        
        if loss_create.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Loss quantity must be greater than zero"
            )
        
        if item.current_stock < loss_create.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock. Current: {item.current_stock}, Requested: {loss_create.quantity}"
            )
        
        # Calculate loss value
        loss_value = loss_create.quantity * item.cost_per_unit
        
        # Create loss record
        loss_id = uuid.uuid4()
        now = datetime.utcnow()
        
        loss = InventoryLoss(
            id=loss_id,
            value=loss_value,
            created_at=now,
            updated_at=now,
            **loss_create.dict()
        )
        
        _inventory_losses_db[loss_id] = loss
        
        # Create corresponding inventory transaction (pending)
        transaction = await self.create_transaction(InventoryTransactionCreate(
            item_id=loss_create.item_id,
            quantity=loss_create.quantity,
            transaction_type=TransactionType.LOSS,
            reference_id=loss_id,
            reference_type="loss",
            notes=f"Loss due to {loss_create.reason}: {loss_create.notes or ''}",
            unit_cost=item.cost_per_unit
        ))
        
        # Link transaction to loss
        loss.transaction_id = transaction.id
        _inventory_losses_db[loss_id] = loss
        
        return loss
    
    async def get_loss(self, loss_id: uuid.UUID) -> Optional[InventoryLoss]:
        """Retrieves a loss record by its ID."""
        return _inventory_losses_db.get(loss_id)
    
    async def list_losses(
        self,
        item_id: Optional[uuid.UUID] = None,
        reason: Optional[LossReason] = None,
        status: Optional[TransactionStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[InventoryLoss]:
        """Lists inventory losses with optional filtering."""
        losses = list(_inventory_losses_db.values())
        
        # Apply filters
        if item_id:
            losses = [l for l in losses if l.item_id == item_id]
        
        if reason:
            losses = [l for l in losses if l.reason == reason]
        
        if status:
            losses = [l for l in losses if l.status == status]
        
        if start_date:
            losses = [l for l in losses if l.created_at >= start_date]
        
        if end_date:
            losses = [l for l in losses if l.created_at <= end_date]
        
        # Sort by created_at (newest first)
        losses.sort(key=lambda l: l.created_at, reverse=True)
        
        return losses
    
    async def approve_loss(self, loss_id: uuid.UUID, approver_id: uuid.UUID) -> InventoryLoss:
        """Approves a pending inventory loss."""
        loss = await self.get_loss(loss_id)
        if not loss:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Loss record with ID {loss_id} not found"
            )
        
        if loss.status != TransactionStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Loss is not in PENDING status. Current status: {loss.status}"
            )
        
        # Update loss status
        loss.status = TransactionStatus.APPROVED
        loss.approved_by = approver_id
        loss.approved_at = datetime.utcnow()
        loss.updated_at = datetime.utcnow()
        
        _inventory_losses_db[loss_id] = loss
        
        # Approve the corresponding transaction
        if loss.transaction_id:
            await self.approve_transaction(loss.transaction_id, approver_id)
        
        # Create financial entry for the loss
        financial_entry = await self._create_financial_entry(
            entry_type=FinancialEntryType.INVENTORY_LOSS,
            reference_id=loss_id,
            reference_type="loss",
            amount=loss.value,
            description=f"Inventory loss due to {loss.reason}: {loss.notes or ''}",
            is_posted=True
        )
        
        # Link financial entry to loss
        loss.financial_entry_id = financial_entry.id
        _inventory_losses_db[loss_id] = loss
        
        return loss
    
    async def reject_loss(self, loss_id: uuid.UUID, approver_id: uuid.UUID) -> InventoryLoss:
        """Rejects a pending inventory loss."""
        loss = await self.get_loss(loss_id)
        if not loss:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Loss record with ID {loss_id} not found"
            )
        
        if loss.status != TransactionStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Loss is not in PENDING status. Current status: {loss.status}"
            )
        
        # Update loss status
        loss.status = TransactionStatus.REJECTED
        loss.approved_by = approver_id
        loss.approved_at = datetime.utcnow()
        loss.updated_at = datetime.utcnow()
        
        _inventory_losses_db[loss_id] = loss
        
        # Reject the corresponding transaction
        if loss.transaction_id:
            await self.reject_transaction(loss.transaction_id, approver_id)
        
        return loss
    
    # === Inventory Count Management ===
    async def create_inventory_count(self, count_create: InventoryCountCreate) -> InventoryCount:
        """Creates a new inventory count."""
        # Validate items
        for item_count in count_create.items:
            item = await self.get_inventory_item(item_count.item_id)
            if not item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Inventory item with ID {item_count.item_id} not found"
                )
        
        # Process count items
        count_items = []
        total_variance = 0
        total_value_variance = 0
        
        for item_count in count_create.items:
            item = await self.get_inventory_item(item_count.item_id)
            
            # Calculate variance
            variance = item_count.actual_quantity - item_count.expected_quantity
            variance_percentage = (variance / item_count.expected_quantity * 100) if item_count.expected_quantity > 0 else 0
            value_variance = variance * item.cost_per_unit
            
            count_item = {
                "id": uuid.uuid4(),
                "item_id": item_count.item_id,
                "expected_quantity": item_count.expected_quantity,
                "actual_quantity": item_count.actual_quantity,
                "notes": item_count.notes,
                "variance": variance,
                "variance_percentage": variance_percentage,
                "value_variance": value_variance
            }
            
            count_items.append(count_item)
            total_variance += variance
            total_value_variance += value_variance
        
        # Create inventory count
        count_id = uuid.uuid4()
        now = datetime.utcnow()
        
        count = InventoryCount(
            id=count_id,
            items=count_items,
            total_variance=total_variance,
            total_value_variance=total_value_variance,
            created_at=now,
            updated_at=now,
            **count_create.dict(exclude={"items"})
        )
        
        _inventory_counts_db[count_id] = count
        
        return count
    
    async def get_inventory_count(self, count_id: uuid.UUID) -> Optional[InventoryCount]:
        """Retrieves an inventory count by its ID."""
        return _inventory_counts_db.get(count_id)
    
    async def list_inventory_counts(
        self,
        status: Optional[InventoryCountStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[InventoryCount]:
        """Lists inventory counts with optional filtering."""
        counts = list(_inventory_counts_db.values())
        
        # Apply filters
        if status:
            counts = [c for c in counts if c.status == status]
        
        if start_date:
            counts = [c for c in counts if c.count_date >= start_date]
        
        if end_date:
            counts = [c for c in counts if c.count_date <= end_date]
        
        # Sort by count_date (newest first)
        counts.sort(key=lambda c: c.count_date, reverse=True)
        
        return counts
    
    async def submit_inventory_count(self, count_id: uuid.UUID) -> InventoryCount:
        """Submits an inventory count for approval."""
        count = await self.get_inventory_count(count_id)
        if not count:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory count with ID {count_id} not found"
            )
        
        if count.status != InventoryCountStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Inventory count is not in DRAFT status. Current status: {count.status}"
            )
        
        # Update count status
        count.status = InventoryCountStatus.SUBMITTED
        count.updated_at = datetime.utcnow()
        
        _inventory_counts_db[count_id] = count
        
        return count
    
    async def approve_inventory_count(self, count_id: uuid.UUID, approver_id: uuid.UUID) -> InventoryCount:
        """Approves an inventory count and applies adjustments."""
        count = await self.get_inventory_count(count_id)
        if not count:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory count with ID {count_id} not found"
            )
        
        if count.status != InventoryCountStatus.SUBMITTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Inventory count is not in SUBMITTED status. Current status: {count.status}"
            )
        
        # Update count status
        count.status = InventoryCountStatus.APPROVED
        count.approved_by = approver_id
        count.approved_at = datetime.utcnow()
        count.updated_at = datetime.utcnow()
        
        _inventory_counts_db[count_id] = count
        
        # Apply adjustments for each item
        for count_item in count.items:
            if count_item.variance == 0:
                continue  # Skip items with no variance
            
            item = await self.get_inventory_item(count_item.item_id)
            
            # Create adjustment transaction
            await self.create_transaction(InventoryTransactionCreate(
                item_id=count_item.item_id,
                quantity=abs(count_item.variance),  # Use absolute value
                transaction_type=TransactionType.ADJUSTMENT,
                reference_id=count_id,
                reference_type="count",
                notes=f"Inventory count adjustment: {count_item.notes or ''}",
                unit_cost=item.cost_per_unit
            ))
        
        # Create financial entry for the count if there's a value variance
        if count.total_value_variance != 0:
            await self._create_financial_entry(
                entry_type=FinancialEntryType.INVENTORY_ADJUSTMENT,
                reference_id=count_id,
                reference_type="count",
                amount=count.total_value_variance,
                description=f"Inventory count adjustment: {count.name}",
                is_posted=True
            )
        
        return count
    
    async def reject_inventory_count(self, count_id: uuid.UUID, approver_id: uuid.UUID) -> InventoryCount:
        """Rejects an inventory count."""
        count = await self.get_inventory_count(count_id)
        if not count:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory count with ID {count_id} not found"
            )
        
        if count.status != InventoryCountStatus.SUBMITTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Inventory count is not in SUBMITTED status. Current status: {count.status}"
            )
        
        # Update count status
        count.status = InventoryCountStatus.REJECTED
        count.approved_by = approver_id
        count.approved_at = datetime.utcnow()
        count.updated_at = datetime.utcnow()
        
        _inventory_counts_db[count_id] = count
        
        return count
    
    # === Helper Methods ===
    async def _update_item_stock(self, item: InventoryItem, new_stock: float, unit_cost: float) -> InventoryItem:
        """Updates an item's stock level and recalculates value."""
        item.current_stock = new_stock
        item.cost_per_unit = unit_cost  # Update cost per unit
        item.value = new_stock * unit_cost  # Recalculate value
        item.last_stock_update = datetime.utcnow()
        item.updated_at = datetime.utcnow()
        
        _inventory_items_db[item.id] = item
        
        # Check if stock is below reorder point
        if item.current_stock <= item.reorder_point:
            logger.warning(f"Item {item.name} (ID: {item.id}) is below reorder point. Current stock: {item.current_stock}, Reorder point: {item.reorder_point}")
            # In a real system, this could trigger notifications or automatic reordering
        
        return item
    
    async def _create_financial_entry(
        self,
        entry_type: FinancialEntryType,
        reference_id: uuid.UUID,
        reference_type: str,
        amount: float,
        description: str,
        is_posted: bool = False
    ) -> FinancialEntry:
        """Creates a financial entry and optionally posts it to the financial system."""
        entry_id = uuid.uuid4()
        now = datetime.utcnow()
        
        # In a real system, this would be determined based on configuration or business rules
        account_id = uuid.uuid4()
        
        entry = FinancialEntry(
            id=entry_id,
            entry_type=entry_type,
            reference_id=reference_id,
            reference_type=reference_type,
            amount=amount,
            description=description,
            account_id=account_id,
            created_at=now,
            is_posted=False
        )
        
        _financial_entries_db[entry_id] = entry
        
        # Post to financial system if requested
        if is_posted and self.accounts_service:
            try:
                # In a real system, this would call the accounts service to post the entry
                # await self.accounts_service.post_entry(entry)
                
                # Simulate successful posting
                entry.is_posted = True
                entry.posted_at = now
                _financial_entries_db[entry_id] = entry
                
                logger.info(f"Financial entry {entry_id} posted successfully: {description}")
            except Exception as e:
                logger.error(f"Failed to post financial entry {entry_id}: {str(e)}")
                # In a real system, this might trigger a notification or retry mechanism
        
        return entry
