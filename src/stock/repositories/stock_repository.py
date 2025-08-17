# Stock repository for database operations

import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, asc, desc, func
from sqlalchemy.orm import Session, joinedload

from ..models.db_models import (
    MovementTypeEnum,
    StockAdjustmentDB,
    StockAdjustmentItemDB,
    StockAlertDB,
    StockBatchDB,
    StockItemDB,
    StockMovementDB,
)


class StockRepository:
    """Repository for stock-related database operations."""

    def __init__(self, db: Session):
        self.db = db

    # Stock Item operations
    def create_stock_item(
        self, name: str, unit: str, initial_quantity: float = 0.0, **kwargs
    ) -> StockItemDB:
        """Create a new stock item."""

        db_item = StockItemDB(
            name=name,
            unit=unit,
            current_quantity=initial_quantity,
            available_quantity=initial_quantity,
            **kwargs,
        )

        self.db.add(db_item)
        self.db.commit()
        self.db.refresh(db_item)
        return db_item

    def get_stock_item_by_id(self, item_id: uuid.UUID) -> Optional[StockItemDB]:
        """Get stock item by ID with movements."""
        return (
            self.db.query(StockItemDB)
            .options(joinedload(StockItemDB.movements), joinedload(StockItemDB.batches))
            .filter(StockItemDB.id == item_id)
            .first()
        )

    def get_stock_item_by_sku(self, sku: str) -> Optional[StockItemDB]:
        """Get stock item by SKU."""
        return self.db.query(StockItemDB).filter(StockItemDB.sku == sku).first()

    def get_stock_item_by_barcode(self, barcode: str) -> Optional[StockItemDB]:
        """Get stock item by barcode."""
        return self.db.query(StockItemDB).filter(StockItemDB.barcode == barcode).first()

    def list_stock_items(
        self,
        is_active: Optional[bool] = None,
        is_tracked: Optional[bool] = None,
        category_id: Optional[str] = None,
        low_stock_only: bool = False,
        limit: int = 100,
        offset: int = 0,
        order_by: str = "name",
    ) -> Tuple[List[StockItemDB], int]:
        """List stock items with filters and pagination."""

        query = self.db.query(StockItemDB)

        if is_active is not None:
            query = query.filter(StockItemDB.is_active == is_active)

        if is_tracked is not None:
            query = query.filter(StockItemDB.is_tracked == is_tracked)

        if category_id:
            query = query.filter(StockItemDB.category_id == category_id)

        if low_stock_only:
            query = query.filter(
                and_(
                    StockItemDB.low_stock_threshold.isnot(None),
                    StockItemDB.current_quantity < StockItemDB.low_stock_threshold,
                )
            )

        # Get total count
        total = query.count()

        # Apply ordering
        if order_by == "name":
            query = query.order_by(asc(StockItemDB.name))
        elif order_by == "quantity":
            query = query.order_by(desc(StockItemDB.current_quantity))
        elif order_by == "updated":
            query = query.order_by(desc(StockItemDB.last_updated))
        else:
            query = query.order_by(asc(StockItemDB.name))

        # Apply pagination
        items = query.offset(offset).limit(limit).all()

        return items, total

    def update_stock_item(
        self, item_id: uuid.UUID, updates: Dict[str, Any]
    ) -> Optional[StockItemDB]:
        """Update stock item."""

        db_item = self.db.query(StockItemDB).filter(StockItemDB.id == item_id).first()

        if not db_item:
            return None

        # Don't allow direct quantity updates through this method
        updates.pop("current_quantity", None)
        updates.pop("available_quantity", None)
        updates.pop("reserved_quantity", None)

        for field, value in updates.items():
            if hasattr(db_item, field):
                setattr(db_item, field, value)

        setattr(db_item, 'updated_at', datetime.utcnow())
        setattr(db_item, 'last_updated', datetime.utcnow())
        self.db.commit()
        self.db.refresh(db_item)
        return db_item

    def delete_stock_item(self, item_id: uuid.UUID) -> bool:
        """Delete stock item."""
        db_item = self.db.query(StockItemDB).filter(StockItemDB.id == item_id).first()

        if not db_item:
            return False

        self.db.delete(db_item)
        self.db.commit()
        return True

    def update_stock_quantity(
        self,
        item_id: uuid.UUID,
        quantity_change: float,
        movement_type: MovementTypeEnum,
        reason: Optional[str] = None,
        **kwargs,
    ) -> Optional[StockItemDB]:
        """Update stock quantity and create movement record."""

        db_item = self.db.query(StockItemDB).filter(StockItemDB.id == item_id).first()

        if not db_item:
            return None

        # Calculate new quantities
        old_quantity = float(db_item.current_quantity)
        new_quantity = old_quantity + quantity_change

        # Prevent negative stock (unless it's an adjustment)
        if new_quantity < 0 and movement_type != MovementTypeEnum.ADJUSTMENT:
            raise ValueError(
                f"Insufficient stock. Available: {old_quantity}, Required: {abs(quantity_change)}"
            )

        # Update quantities
        setattr(db_item, 'current_quantity', max(0, new_quantity))
        available = float(db_item.current_quantity) - float(db_item.reserved_quantity)
        setattr(db_item, 'available_quantity', max(0, available))
        setattr(db_item, 'last_updated', datetime.utcnow())
        setattr(db_item, 'updated_at', datetime.utcnow())

        # Update total value if unit cost is available
        if db_item.unit_cost:
            setattr(db_item, 'total_value', float(db_item.current_quantity * db_item.unit_cost))

        # Create movement record
        self.create_stock_movement(
            stock_item_id=item_id,
            quantity=quantity_change,
            movement_type=movement_type,
            quantity_before=float(old_quantity),
            quantity_after=float(db_item.current_quantity),
            reason=reason,
            **kwargs,
        )

        self.db.commit()
        self.db.refresh(db_item)
        return db_item

    # Stock Movement operations
    def create_stock_movement(
        self,
        stock_item_id: uuid.UUID,
        quantity: float,
        movement_type: MovementTypeEnum,
        quantity_before: float,
        quantity_after: float,
        **kwargs,
    ) -> StockMovementDB:
        """Create stock movement record."""

        db_movement = StockMovementDB(
            stock_item_id=stock_item_id,
            quantity=quantity,
            movement_type=movement_type,
            quantity_before=quantity_before,
            quantity_after=quantity_after,
            **kwargs,
        )

        self.db.add(db_movement)
        self.db.commit()
        self.db.refresh(db_movement)
        return db_movement

    def get_stock_movements(
        self,
        stock_item_id: Optional[uuid.UUID] = None,
        movement_type: Optional[MovementTypeEnum] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[StockMovementDB], int]:
        """Get stock movements with filters and pagination."""

        query = self.db.query(StockMovementDB).options(
            joinedload(StockMovementDB.stock_item)
        )

        if stock_item_id:
            query = query.filter(StockMovementDB.stock_item_id == stock_item_id)

        if movement_type:
            query = query.filter(StockMovementDB.movement_type == movement_type)

        if from_date:
            query = query.filter(StockMovementDB.timestamp >= from_date)

        if to_date:
            query = query.filter(StockMovementDB.timestamp <= to_date)

        # Get total count
        total = query.count()

        # Apply pagination and ordering
        movements = (
            query.order_by(desc(StockMovementDB.timestamp))
            .offset(offset)
            .limit(limit)
            .all()
        )

        return movements, total

    # Stock Batch operations
    def create_stock_batch(
        self,
        stock_item_id: uuid.UUID,
        batch_number: str,
        initial_quantity: float,
        **kwargs,
    ) -> StockBatchDB:
        """Create stock batch."""

        db_batch = StockBatchDB(
            stock_item_id=stock_item_id,
            batch_number=batch_number,
            initial_quantity=initial_quantity,
            current_quantity=initial_quantity,
            **kwargs,
        )

        self.db.add(db_batch)
        self.db.commit()
        self.db.refresh(db_batch)
        return db_batch

    def get_stock_batches(
        self,
        stock_item_id: Optional[uuid.UUID] = None,
        is_active: Optional[bool] = None,
        expiring_soon: bool = False,
        days_ahead: int = 7,
    ) -> List[StockBatchDB]:
        """Get stock batches with filters."""

        query = self.db.query(StockBatchDB).options(joinedload(StockBatchDB.stock_item))

        if stock_item_id:
            query = query.filter(StockBatchDB.stock_item_id == stock_item_id)

        if is_active is not None:
            query = query.filter(StockBatchDB.is_active == is_active)

        if expiring_soon:
            expiry_date = datetime.utcnow() + timedelta(days=days_ahead)
            query = query.filter(
                and_(
                    StockBatchDB.expiration_date.isnot(None),
                    StockBatchDB.expiration_date <= expiry_date,
                    StockBatchDB.is_expired == False,
                )
            )

        return query.order_by(asc(StockBatchDB.expiration_date)).all()

    # Stock Alert operations
    def create_stock_alert(
        self,
        stock_item_id: uuid.UUID,
        alert_type: str,
        current_quantity: float,
        **kwargs,
    ) -> StockAlertDB:
        """Create stock alert."""

        # Check if similar alert already exists
        existing_alert = (
            self.db.query(StockAlertDB)
            .filter(
                and_(
                    StockAlertDB.stock_item_id == stock_item_id,
                    StockAlertDB.alert_type == alert_type,
                    StockAlertDB.is_active == True,
                    StockAlertDB.is_acknowledged == False,
                )
            )
            .first()
        )

        if existing_alert:
            # Update existing alert
            setattr(existing_alert, 'current_quantity', current_quantity)
            setattr(existing_alert, 'created_at', datetime.utcnow())
            self.db.commit()
            self.db.refresh(existing_alert)
            return existing_alert

        # Create new alert
        db_alert = StockAlertDB(
            stock_item_id=stock_item_id,
            alert_type=alert_type,
            current_quantity=current_quantity,
            **kwargs,
        )

        self.db.add(db_alert)
        self.db.commit()
        self.db.refresh(db_alert)
        return db_alert

    def get_active_alerts(
        self,
        stock_item_id: Optional[uuid.UUID] = None,
        alert_type: Optional[str] = None,
        acknowledged: Optional[bool] = False,
    ) -> List[StockAlertDB]:
        """Get active stock alerts."""

        query = self.db.query(StockAlertDB).filter(StockAlertDB.is_active)

        if stock_item_id:
            query = query.filter(StockAlertDB.stock_item_id == stock_item_id)

        if alert_type:
            query = query.filter(StockAlertDB.alert_type == alert_type)

        if acknowledged is not None:
            query = query.filter(StockAlertDB.is_acknowledged == acknowledged)

        return query.order_by(desc(StockAlertDB.created_at)).all()

    def acknowledge_alert(
        self, alert_id: uuid.UUID, acknowledged_by: str
    ) -> Optional[StockAlertDB]:
        """Acknowledge stock alert."""

        db_alert = (
            self.db.query(StockAlertDB).filter(StockAlertDB.id == alert_id).first()
        )

        if not db_alert:
            return None

        setattr(db_alert, 'is_acknowledged', True)
        setattr(db_alert, 'acknowledged_by', acknowledged_by)
        setattr(db_alert, 'acknowledged_at', datetime.utcnow())

        self.db.commit()
        self.db.refresh(db_alert)
        return db_alert

    # Stock Adjustment operations
    def create_stock_adjustment(
        self, adjustment_number: str, adjustment_type: str, created_by: str, **kwargs
    ) -> StockAdjustmentDB:
        """Create stock adjustment."""

        db_adjustment = StockAdjustmentDB(
            adjustment_number=adjustment_number,
            adjustment_type=adjustment_type,
            created_by=created_by,
            **kwargs,
        )

        self.db.add(db_adjustment)
        self.db.commit()
        self.db.refresh(db_adjustment)
        return db_adjustment

    def add_adjustment_item(
        self,
        adjustment_id: uuid.UUID,
        stock_item_id: uuid.UUID,
        system_quantity: float,
        physical_quantity: float,
        **kwargs,
    ) -> StockAdjustmentItemDB:
        """Add item to stock adjustment."""

        variance_quantity = physical_quantity - system_quantity

        db_item = StockAdjustmentItemDB(
            adjustment_id=adjustment_id,
            stock_item_id=stock_item_id,
            system_quantity=system_quantity,
            physical_quantity=physical_quantity,
            variance_quantity=variance_quantity,
            **kwargs,
        )

        self.db.add(db_item)
        self.db.commit()
        self.db.refresh(db_item)
        return db_item

    def get_stock_adjustment_by_id(
        self, adjustment_id: uuid.UUID
    ) -> Optional[StockAdjustmentDB]:
        """Get stock adjustment by ID with items."""
        return (
            self.db.query(StockAdjustmentDB)
            .options(joinedload(StockAdjustmentDB.adjustment_items))
            .filter(StockAdjustmentDB.id == adjustment_id)
            .first()
        )

    # Analytics and reporting
    def get_low_stock_items(
        self, threshold_multiplier: float = 1.0
    ) -> List[StockItemDB]:
        """Get items with low stock."""
        return (
            self.db.query(StockItemDB)
            .filter(
                and_(
                    StockItemDB.is_active,
                    StockItemDB.is_tracked,
                    StockItemDB.low_stock_threshold.isnot(None),
                    StockItemDB.current_quantity
                    <= (StockItemDB.low_stock_threshold * threshold_multiplier),
                )
            )
            .order_by(asc(StockItemDB.current_quantity))
            .all()
        )

    def get_stock_value_summary(self) -> Dict[str, Any]:
        """Get stock value summary."""

        # Total stock value
        total_value = (
            self.db.query(func.sum(StockItemDB.total_value))
            .filter(and_(StockItemDB.is_active, StockItemDB.total_value.isnot(None)))
            .scalar()
            or 0.0
        )

        # Count of items
        total_items = self.db.query(StockItemDB).filter(StockItemDB.is_active).count()

        # Low stock items count
        low_stock_count = len(self.get_low_stock_items())

        # Out of stock items count
        out_of_stock_count = (
            self.db.query(StockItemDB)
            .filter(
                and_(
                    StockItemDB.is_active,
                    StockItemDB.is_tracked,
                    StockItemDB.current_quantity <= 0,
                )
            )
            .count()
        )

        return {
            "total_value": total_value,
            "total_items": total_items,
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count,
        }

    def get_movement_summary(
        self, from_date: Optional[datetime] = None, to_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get movement summary for a date range."""

        query = self.db.query(StockMovementDB)

        if from_date:
            query = query.filter(StockMovementDB.timestamp >= from_date)

        if to_date:
            query = query.filter(StockMovementDB.timestamp <= to_date)

        # Count by movement type
        movements_by_type = {}
        type_counts = (
            query.group_by(StockMovementDB.movement_type)
            .with_entities(
                StockMovementDB.movement_type, func.count(StockMovementDB.id)
            )
            .all()
        )

        for movement_type, count in type_counts:
            movements_by_type[movement_type.value] = count

        # Total movements
        total_movements = query.count()

        return {
            "total_movements": total_movements,
            "movements_by_type": movements_by_type,
            "date_from": from_date.isoformat() if from_date else None,
            "date_to": to_date.isoformat() if to_date else None,
        }
