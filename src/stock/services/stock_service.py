# /home/ubuntu/pos-modern/src/stock/services/stock_service.py

from fastapi import HTTPException, status
from typing import List, Optional
import uuid
from datetime import datetime

from ..models.stock_models import (
    StockItem,
    StockItemCreate,
    StockMovement,
    StockMovementCreate,
    StockLevel,
)

# In-memory storage (replace with database interaction)
_stock_items_db: dict[uuid.UUID, StockItem] = {}
_stock_movements_db: list[StockMovement] = []


class StockService:
    """Service layer for managing stock items and movements."""

    async def create_stock_item(self, item_create: StockItemCreate) -> StockItem:
        """Creates a new stock item."""
        item_id = uuid.uuid4()
        stock_item = StockItem(
            id=item_id,
            current_quantity=item_create.initial_quantity,
            last_updated=datetime.utcnow(),
            **item_create.dict(),
        )
        _stock_items_db[item_id] = stock_item

        # Record initial quantity as an 'entry' movement
        if item_create.initial_quantity != 0:
            initial_movement = StockMovementCreate(
                stock_item_id=item_id,
                quantity=item_create.initial_quantity,
                movement_type="entry",
                reason="Initial stock",
            )
            await self.record_movement(initial_movement)
            # Re-fetch item to get updated timestamp from movement
            stock_item = _stock_items_db[item_id]

        return stock_item

    async def get_stock_item(self, item_id: uuid.UUID) -> Optional[StockItem]:
        """Retrieves a stock item by its ID."""
        return _stock_items_db.get(item_id)

    async def list_stock_items(self) -> List[StockItem]:
        """Lists all stock items."""
        return list(_stock_items_db.values())

    async def update_stock_item(
        self, item_id: uuid.UUID, item_update_data: dict
    ) -> Optional[StockItem]:
        """Updates an existing stock item's details (not quantity)."""
        item = await self.get_stock_item(item_id)
        if not item:
            return None

        update_data = item_update_data.copy()
        # Prevent direct quantity updates via this method
        update_data.pop("current_quantity", None)
        update_data.pop("last_updated", None)

        updated_item = item.copy(update=update_data)
        updated_item.last_updated = datetime.utcnow()  # Update timestamp on any change
        _stock_items_db[item_id] = updated_item
        return updated_item

    async def delete_stock_item(self, item_id: uuid.UUID) -> bool:
        """Deletes a stock item."""
        if item_id in _stock_items_db:
            del _stock_items_db[item_id]
            # Optionally, archive or handle related movements
            return True
        return False

    async def record_movement(
        self, movement_create: StockMovementCreate
    ) -> StockMovement:
        """Records a stock movement and updates the item's quantity."""
        item = await self.get_stock_item(movement_create.stock_item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock item with ID {movement_create.stock_item_id} not found",
            )

        movement_id = uuid.uuid4()
        movement = StockMovement(id=movement_id, **movement_create.dict())
        _stock_movements_db.append(movement)

        # Update current quantity
        item.current_quantity += (
            movement.quantity
        )  # Positive for entry, negative for exit/sale/adjustment
        item.last_updated = movement.timestamp
        _stock_items_db[item.id] = item  # Update in DB

        return movement

    async def get_stock_levels(self, low_stock_only: bool = False) -> List[StockLevel]:
        """Gets the current stock levels for all items."""
        levels = []
        for item in _stock_items_db.values():
            is_low = False
            if (
                item.low_stock_threshold is not None
                and item.current_quantity < item.low_stock_threshold
            ):
                is_low = True

            if not low_stock_only or is_low:
                levels.append(
                    StockLevel(
                        stock_item_id=item.id,
                        name=item.name,
                        current_quantity=item.current_quantity,
                        unit=item.unit,
                        low_stock_threshold=item.low_stock_threshold,
                        is_low=is_low,
                    )
                )
        return levels

    async def get_movement_history(
        self, item_id: Optional[uuid.UUID] = None
    ) -> List[StockMovement]:
        """Gets the movement history, optionally filtered by item ID."""
        if item_id:
            return [m for m in _stock_movements_db if m.stock_item_id == item_id]
        return _stock_movements_db


# Instantiate the service
stock_service = StockService()
