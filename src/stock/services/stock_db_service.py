"""
Database-backed stock service replacing file-based storage
"""

# Database configuration
import os
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import Depends, HTTPException, status
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from ..models.db_models import MovementTypeEnum
from ..models.stock_models import (
    StockItem,
    StockItemCreate,
    StockLevel,
    StockMovement,
    StockMovementCreate,
)
from ..repositories.stock_repository import StockRepository

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{os.getenv('DB_USER', 'posmodern')}:{os.getenv('DB_PASSWORD', 'posmodern123')}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5432')}/{os.getenv('DB_NAME', 'posmodern')}",
)

# Create engine and session factory
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class StockDatabaseService:
    """Database-backed service for stock management."""

    def __init__(self, db: Session):
        self.repository = StockRepository(db)

    def _convert_db_to_pydantic_item(self, db_item) -> StockItem:
        """Convert database stock item to Pydantic model."""
        return StockItem(
            id=db_item.id,
            name=db_item.name,
            unit=db_item.unit,
            current_quantity=db_item.current_quantity,
            low_stock_threshold=db_item.low_stock_threshold,
            product_id=uuid.UUID(db_item.product_id) if db_item.product_id else None,
            ingredient_id=(
                uuid.UUID(db_item.ingredient_id) if db_item.ingredient_id else None
            ),
            last_updated=db_item.last_updated,
        )

    def _convert_db_to_pydantic_movement(self, db_movement) -> StockMovement:
        """Convert database stock movement to Pydantic model."""
        return StockMovement(
            id=db_movement.id,
            stock_item_id=db_movement.stock_item_id,
            quantity=db_movement.quantity,
            movement_type=db_movement.movement_type.value,
            reason=db_movement.reason,
            timestamp=db_movement.timestamp,
        )

    async def create_stock_item(self, item_create: StockItemCreate) -> StockItem:
        """Creates a new stock item."""
        try:
            # Check if item with same name already exists
            existing_items, _ = self.repository.list_stock_items(limit=1000)
            for existing_item in existing_items:
                if existing_item.name.lower() == item_create.name.lower():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Stock item with name '{item_create.name}' already exists",
                    )

            db_item = self.repository.create_stock_item(
                name=item_create.name,
                unit=item_create.unit,
                initial_quantity=item_create.initial_quantity,
                low_stock_threshold=item_create.low_stock_threshold,
                product_id=(
                    str(item_create.product_id) if item_create.product_id else None
                ),
                ingredient_id=(
                    str(item_create.ingredient_id)
                    if item_create.ingredient_id
                    else None
                ),
            )

            # Record initial quantity as an 'entry' movement if quantity > 0
            if item_create.initial_quantity > 0:
                self.repository.create_stock_movement(
                    stock_item_id=uuid.UUID(str(db_item.id)),
                    quantity=item_create.initial_quantity,
                    movement_type=MovementTypeEnum.ENTRY,
                    quantity_before=0,
                    quantity_after=item_create.initial_quantity,
                    reason="Initial stock",
                )

            return self._convert_db_to_pydantic_item(db_item)

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating stock item: {str(e)}",
            ) from e

    async def get_stock_item(self, item_id: uuid.UUID) -> Optional[StockItem]:
        """Retrieves a stock item by its ID."""
        try:
            db_item = self.repository.get_stock_item_by_id(item_id)
            if not db_item:
                return None
            return self._convert_db_to_pydantic_item(db_item)

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting stock item: {str(e)}",
            ) from e

    async def list_stock_items(
        self,
        active_only: bool = True,
        low_stock_only: bool = False,
        category_id: Optional[str] = None,
    ) -> List[StockItem]:
        """Lists stock items with filters."""
        try:
            db_items, _ = self.repository.list_stock_items(
                is_active=active_only if active_only else None,
                low_stock_only=low_stock_only,
                category_id=category_id,
                limit=1000,
            )

            return [self._convert_db_to_pydantic_item(item) for item in db_items]

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error listing stock items: {str(e)}",
            ) from e

    async def update_stock_item(
        self, item_id: uuid.UUID, item_update_data: dict
    ) -> Optional[StockItem]:
        """Updates an existing stock item's details (not quantity)."""
        try:
            db_item = self.repository.update_stock_item(item_id, item_update_data)
            if not db_item:
                return None
            return self._convert_db_to_pydantic_item(db_item)

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating stock item: {str(e)}",
            ) from e

    async def delete_stock_item(self, item_id: uuid.UUID) -> bool:
        """Deletes a stock item."""
        try:
            return self.repository.delete_stock_item(item_id)

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deleting stock item: {str(e)}",
            ) from e

    async def record_movement(
        self, movement_create: StockMovementCreate
    ) -> StockMovement:
        """Records a stock movement and updates the item's quantity."""
        try:
            # Verify stock item exists
            db_item = self.repository.get_stock_item_by_id(
                movement_create.stock_item_id
            )
            if not db_item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Stock item with ID {movement_create.stock_item_id} not found",
                )

            # Convert movement type string to enum
            movement_type_enum = MovementTypeEnum(movement_create.movement_type)

            # Update stock quantity and create movement
            updated_item = self.repository.update_stock_quantity(
                item_id=movement_create.stock_item_id,
                quantity_change=movement_create.quantity,
                movement_type=movement_type_enum,
                reason=movement_create.reason,
            )

            if not updated_item:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update stock quantity",
                )

            # Get the created movement (last one for this item)
            movements, _ = self.repository.get_stock_movements(
                stock_item_id=movement_create.stock_item_id, limit=1
            )

            if not movements:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Movement was not created",
                )

            # Check for low stock and create alert if needed
            await self._check_low_stock_alert(updated_item)

            return self._convert_db_to_pydantic_movement(movements[0])

        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
            ) from e
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error recording movement: {str(e)}",
            ) from e

    async def get_stock_levels(self, low_stock_only: bool = False) -> List[StockLevel]:
        """Gets the current stock levels for all items."""
        try:
            if low_stock_only:
                db_items = self.repository.get_low_stock_items()
            else:
                db_items, _ = self.repository.list_stock_items(
                    is_active=True, is_tracked=True, limit=1000
                )

            levels = []
            for item in db_items:
                is_low = False
                if (
                    item.low_stock_threshold is not None
                    and item.current_quantity < item.low_stock_threshold
                ):
                    is_low = True

                levels.append(
                    StockLevel(
                        stock_item_id=uuid.UUID(str(item.id)),
                        name=str(item.name),
                        current_quantity=float(item.current_quantity),
                        unit=str(item.unit),
                        low_stock_threshold=(
                            float(item.low_stock_threshold)
                            if item.low_stock_threshold is not None
                            else None
                        ),
                        is_low=is_low,
                    )
                )

            return levels

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting stock levels: {str(e)}",
            ) from e

    async def get_movement_history(
        self, item_id: Optional[uuid.UUID] = None, limit: int = 100, offset: int = 0
    ) -> List[StockMovement]:
        """Gets the movement history, optionally filtered by item ID."""
        try:
            db_movements, _ = self.repository.get_stock_movements(
                stock_item_id=item_id, limit=limit, offset=offset
            )

            return [
                self._convert_db_to_pydantic_movement(movement)
                for movement in db_movements
            ]

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting movement history: {str(e)}",
            ) from e

    # Additional database-specific methods
    async def get_stock_by_sku(self, sku: str) -> Optional[StockItem]:
        """Get stock item by SKU."""
        try:
            db_item = self.repository.get_stock_item_by_sku(sku)
            if not db_item:
                return None
            return self._convert_db_to_pydantic_item(db_item)

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting stock by SKU: {str(e)}",
            ) from e

    async def get_stock_by_barcode(self, barcode: str) -> Optional[StockItem]:
        """Get stock item by barcode."""
        try:
            db_item = self.repository.get_stock_item_by_barcode(barcode)
            if not db_item:
                return None
            return self._convert_db_to_pydantic_item(db_item)

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting stock by barcode: {str(e)}",
            ) from e

    async def get_stock_alerts(
        self, acknowledged: bool = False
    ) -> List[Dict[str, Any]]:
        """Get stock alerts."""
        try:
            db_alerts = self.repository.get_active_alerts(acknowledged=acknowledged)

            alerts = []
            for alert in db_alerts:
                # Get stock item details
                db_item = self.repository.get_stock_item_by_id(
                    uuid.UUID(str(alert.stock_item_id))
                )
                if db_item:
                    alerts.append(
                        {
                            "id": str(alert.id),
                            "stock_item_id": str(alert.stock_item_id),
                            "stock_item_name": db_item.name,
                            "alert_type": alert.alert_type,
                            "severity": alert.severity,
                            "current_quantity": alert.current_quantity,
                            "threshold_quantity": alert.threshold_quantity,
                            "message": alert.message,
                            "created_at": alert.created_at.isoformat(),
                            "is_acknowledged": alert.is_acknowledged,
                        }
                    )

            return alerts

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting stock alerts: {str(e)}",
            ) from e

    async def acknowledge_alert(
        self, alert_id: uuid.UUID, acknowledged_by: str
    ) -> bool:
        """Acknowledge a stock alert."""
        try:
            db_alert = self.repository.acknowledge_alert(alert_id, acknowledged_by)
            return db_alert is not None

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error acknowledging alert: {str(e)}",
            ) from e

    async def get_stock_summary(self) -> Dict[str, Any]:
        """Get stock value and movement summary."""
        try:
            # Get value summary
            value_summary = self.repository.get_stock_value_summary()

            # Get recent movements summary (last 30 days)
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            movement_summary = self.repository.get_movement_summary(
                from_date=thirty_days_ago
            )

            # Get expiring batches (next 7 days)
            expiring_batches = self.repository.get_stock_batches(
                expiring_soon=True, days_ahead=7
            )

            # Get active alerts count
            active_alerts = self.repository.get_active_alerts(acknowledged=False)

            return {
                "stock_value": value_summary,
                "recent_movements": movement_summary,
                "expiring_batches_count": len(expiring_batches),
                "active_alerts_count": len(active_alerts),
                "last_updated": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting stock summary: {str(e)}",
            ) from e

    async def _check_low_stock_alert(self, db_item) -> None:
        """Check if item needs a low stock alert."""
        try:
            if (
                db_item.low_stock_threshold is not None
                and db_item.current_quantity < db_item.low_stock_threshold
            ):

                # Determine alert type and severity
                if db_item.current_quantity <= 0:
                    alert_type = "out_of_stock"
                    severity = "critical"
                    message = f"{db_item.name} is out of stock"
                else:
                    alert_type = "low_stock"
                    severity = (
                        "high"
                        if db_item.current_quantity
                        <= (db_item.low_stock_threshold * 0.5)
                        else "medium"
                    )
                    message = f"{db_item.name} is low in stock ({db_item.current_quantity} {db_item.unit} remaining)"

                self.repository.create_stock_alert(
                    stock_item_id=db_item.id,
                    alert_type=alert_type,
                    severity=severity,
                    current_quantity=db_item.current_quantity,
                    threshold_quantity=db_item.low_stock_threshold,
                    message=message,
                    suggested_action=(
                        "Reorder stock"
                        if alert_type == "low_stock"
                        else "Urgent reorder required"
                    ),
                )

        except Exception as e:
            # Log error but don't raise to avoid interrupting main flow
            print(f"Error creating stock alert: {str(e)}")


# Dependency function to get the service
def get_stock_service(db: Session = Depends(get_db)) -> StockDatabaseService:
    """Get StockDatabaseService instance with database session."""
    return StockDatabaseService(db)
