"""
Repository for business day operations.
"""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import and_, desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database.connection import DatabaseManager

from ..models.business_day import (
    BusinessDay,
    BusinessDayClose,
    BusinessDayCreate,
    BusinessDaySummary,
    BusinessDayUpdate,
    DayStatus,
)
from ..models.db_models import BusinessDay as DBBusinessDay
from ..models.db_models import BusinessDayOperation


class BusinessDayRepository:
    """Repository for business day operations."""

    def __init__(self):
        self.db_manager = DatabaseManager()

    async def create_business_day(
        self, business_day_data: BusinessDayCreate, opened_by: UUID
    ) -> BusinessDay:
        """Create a new business day."""
        async with self.db_manager.get_session() as session:
            now = datetime.utcnow()

            db_business_day = DBBusinessDay(
                business_day_id=uuid4(),
                client_id="default",
                store_id="default",
                date=business_day_data.date,
                status=DayStatus.OPEN.value,
                opened_by=opened_by,
                opened_at=now,
                total_sales=Decimal("0.0"),
                total_orders=0,
                notes=business_day_data.notes,
            )

            session.add(db_business_day)
            await session.commit()
            await session.refresh(db_business_day)

            # Log operation
            await self._log_operation(
                session,
                str(db_business_day.business_day_id),
                "open",
                opened_by,
                notes="Business day opened",
            )

            return self._db_to_model(db_business_day)

    async def get_business_day_by_id(
        self, business_day_id: UUID
    ) -> Optional[BusinessDay]:
        """Get business day by ID."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                select(DBBusinessDay).where(
                    DBBusinessDay.business_day_id == business_day_id
                )
            )
            db_business_day = result.scalar_one_or_none()

            if db_business_day:
                return self._db_to_model(db_business_day)
            return None

    async def get_business_day_by_date(self, date_str: str) -> Optional[BusinessDay]:
        """Get business day by date."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                select(DBBusinessDay).where(
                    and_(
                        DBBusinessDay.date == date_str,
                        DBBusinessDay.client_id == "default",
                        DBBusinessDay.store_id == "default",
                    )
                )
            )
            db_business_day = result.scalar_one_or_none()

            if db_business_day:
                return self._db_to_model(db_business_day)
            return None

    async def get_current_business_day(self) -> Optional[BusinessDay]:
        """Get current open business day."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                select(DBBusinessDay)
                .where(
                    and_(
                        DBBusinessDay.status == DayStatus.OPEN.value,
                        DBBusinessDay.client_id == "default",
                        DBBusinessDay.store_id == "default",
                    )
                )
                .order_by(desc(DBBusinessDay.opened_at))
            )
            db_business_day = result.scalar_one_or_none()

            if db_business_day:
                return self._db_to_model(db_business_day)
            return None

    async def close_business_day(
        self, business_day_id: UUID, close_data: BusinessDayClose
    ) -> Optional[BusinessDay]:
        """Close a business day."""
        async with self.db_manager.get_session() as session:
            now = datetime.utcnow()

            await session.execute(
                update(DBBusinessDay)
                .where(DBBusinessDay.business_day_id == business_day_id)
                .values(
                    status=DayStatus.CLOSED.value,
                    closed_by=UUID(close_data.closed_by),
                    closed_at=now,
                    notes=close_data.notes or DBBusinessDay.notes,
                )
            )
            await session.commit()

            # Log operation
            await self._log_operation(
                session,
                str(business_day_id),
                "close",
                UUID(close_data.closed_by),
                notes=close_data.notes or "Business day closed",
            )

            return await self.get_business_day_by_id(business_day_id)

    async def update_business_day(
        self, business_day_id: UUID, update_data: BusinessDayUpdate
    ) -> Optional[BusinessDay]:
        """Update business day."""
        async with self.db_manager.get_session() as session:
            update_values = {
                k: v
                for k, v in update_data.dict(exclude_unset=True).items()
                if v is not None
            }

            if update_values:
                await session.execute(
                    update(DBBusinessDay)
                    .where(DBBusinessDay.business_day_id == business_day_id)
                    .values(**update_values)
                )
                await session.commit()

            return await self.get_business_day_by_id(business_day_id)

    async def update_sales_totals(
        self, business_day_id: UUID, total_sales: Decimal, total_orders: int
    ) -> None:
        """Update business day sales totals."""
        async with self.db_manager.get_session() as session:
            await session.execute(
                update(DBBusinessDay)
                .where(DBBusinessDay.business_day_id == business_day_id)
                .values(total_sales=total_sales, total_orders=total_orders)
            )
            await session.commit()

    async def list_business_days(
        self,
        client_id: str = "default",
        store_id: str = "default",
        status: Optional[DayStatus] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[BusinessDaySummary]:
        """List business days with filters."""
        async with self.db_manager.get_session() as session:
            query = select(DBBusinessDay).where(
                and_(
                    DBBusinessDay.client_id == client_id,
                    DBBusinessDay.store_id == store_id,
                )
            )

            if status:
                query = query.where(DBBusinessDay.status == status.value)
            if start_date:
                query = query.where(DBBusinessDay.date >= start_date)
            if end_date:
                query = query.where(DBBusinessDay.date <= end_date)

            query = query.order_by(desc(DBBusinessDay.date)).limit(limit).offset(offset)

            result = await session.execute(query)
            db_business_days = result.scalars().all()

            return [self._db_to_summary(db_bd) for db_bd in db_business_days]

    async def get_business_day_operations(
        self, business_day_id: UUID
    ) -> List[Dict[str, Any]]:
        """Get operations for a business day."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                select(BusinessDayOperation)
                .where(BusinessDayOperation.business_day_id == business_day_id)
                .order_by(BusinessDayOperation.created_at)
            )
            operations = result.scalars().all()

            return [
                {
                    "operation_id": str(op.operation_id),
                    "operation_type": op.operation_type,
                    "operator_id": str(op.operator_id),
                    "amount": float(op.amount) if op.amount else None,
                    "notes": op.notes,
                    "created_at": op.created_at.isoformat(),
                }
                for op in operations
            ]

    async def _log_operation(
        self,
        session: AsyncSession,
        business_day_id: str,
        operation_type: str,
        operator_id: UUID,
        amount: Optional[Decimal] = None,
        notes: Optional[str] = None,
    ) -> None:
        """Log a business day operation."""
        operation = BusinessDayOperation(
            operation_id=uuid4(),
            business_day_id=UUID(business_day_id),
            operation_type=operation_type,
            operator_id=operator_id,
            amount=amount,
            notes=notes,
        )
        session.add(operation)
        await session.flush()

    def _db_to_model(self, db_business_day: DBBusinessDay) -> BusinessDay:
        """Convert database model to Pydantic model."""
        return BusinessDay(
            id=str(db_business_day.business_day_id),
            date=str(db_business_day.date),
            status=DayStatus(db_business_day.status),
            opened_by=str(db_business_day.opened_by),
            closed_by=(
                str(db_business_day.closed_by) if db_business_day.closed_by else None
            ),
            opened_at=db_business_day.opened_at.isoformat(),
            closed_at=(
                db_business_day.closed_at.isoformat()
                if db_business_day.closed_at
                else None
            ),
            total_sales=float(db_business_day.total_sales),
            total_orders=int(db_business_day.total_orders),
            notes=str(db_business_day.notes) if db_business_day.notes else None,
            created_at=db_business_day.created_at.isoformat(),
            updated_at=db_business_day.updated_at.isoformat(),
        )

    def _db_to_summary(self, db_business_day: DBBusinessDay) -> BusinessDaySummary:
        """Convert database model to summary model."""
        return BusinessDaySummary(
            id=str(db_business_day.business_day_id),
            date=str(db_business_day.date),
            status=DayStatus(db_business_day.status),
            opened_at=db_business_day.opened_at.isoformat(),
            closed_at=(
                db_business_day.closed_at.isoformat()
                if db_business_day.closed_at
                else None
            ),
            total_sales=float(db_business_day.total_sales),
            total_orders=int(db_business_day.total_orders),
        )
