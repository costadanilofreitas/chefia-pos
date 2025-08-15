"""
Repository for cashier operations.
"""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import and_, desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database.connection import DatabaseManager

from ..models.cashier import (
    Cashier,
    CashierClose,
    CashierCreate,
    CashierOperation,
    CashierOperationResponse,
    CashierStatus,
    CashierSummary,
    CashierWithdrawal,
    OperationType,
    PaymentMethod,
)
from ..models.db_models import Cashier as DBCashier
from ..models.db_models import CashierOperation as DBCashierOperation
from ..models.db_models import CashierWithdrawal as DBCashierWithdrawal


class CashierRepository:
    """Repository for cashier operations."""

    def __init__(self):
        self.db_manager = DatabaseManager()

    async def create_cashier(
        self, cashier_data: CashierCreate, operator_id: UUID
    ) -> Cashier:
        """Create a new cashier."""
        async with self.db_manager.get_session() as session:
            now = datetime.utcnow()

            db_cashier = DBCashier(
                cashier_id=uuid4(),
                client_id="default",
                store_id="default",
                terminal_id=cashier_data.terminal_id,
                business_day_id=UUID(cashier_data.business_day_id),
                status=CashierStatus.OPEN.value,
                current_operator_id=operator_id,
                opening_balance=Decimal(str(cashier_data.opening_balance)),
                current_balance=Decimal(str(cashier_data.opening_balance)),
                expected_balance=Decimal(str(cashier_data.opening_balance)),
                opened_at=now,
                notes=cashier_data.notes,
            )

            session.add(db_cashier)
            await session.commit()
            await session.refresh(db_cashier)

            # Log opening operation
            await self._log_operation(
                session,
                db_cashier.cashier_id,
                OperationType.OPENING,
                Decimal(str(cashier_data.opening_balance)),
                operator_id,
                balance_before=Decimal("0.0"),
                balance_after=Decimal(str(cashier_data.opening_balance)),
                notes="Cashier opened",
            )

            return self._db_to_model(db_cashier)

    async def get_cashier_by_id(self, cashier_id: UUID) -> Optional[Cashier]:
        """Get cashier by ID."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                select(DBCashier).where(DBCashier.cashier_id == cashier_id)
            )
            db_cashier = result.scalar_one_or_none()

            if db_cashier:
                return self._db_to_model(db_cashier)
            return None

    async def get_cashier_by_terminal(
        self, terminal_id: str, business_day_id: UUID
    ) -> Optional[Cashier]:
        """Get cashier by terminal and business day."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                select(DBCashier).where(
                    and_(
                        DBCashier.terminal_id == terminal_id,
                        DBCashier.business_day_id == business_day_id,
                        DBCashier.client_id == "default",
                        DBCashier.store_id == "default",
                    )
                )
            )
            db_cashier = result.scalar_one_or_none()

            if db_cashier:
                return self._db_to_model(db_cashier)
            return None

    async def get_open_cashiers(self, business_day_id: UUID) -> List[Cashier]:
        """Get all open cashiers for a business day."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                select(DBCashier).where(
                    and_(
                        DBCashier.business_day_id == business_day_id,
                        DBCashier.status == CashierStatus.OPEN.value,
                        DBCashier.client_id == "default",
                        DBCashier.store_id == "default",
                    )
                )
            )
            db_cashiers = result.scalars().all()

            return [self._db_to_model(db_cashier) for db_cashier in db_cashiers]

    async def close_cashier(
        self, cashier_id: UUID, close_data: CashierClose
    ) -> Optional[Cashier]:
        """Close a cashier."""
        async with self.db_manager.get_session() as session:
            now = datetime.utcnow()

            # Calculate cash difference
            cash_difference = close_data.physical_cash_amount - (
                await self._get_expected_cash_balance(session, cashier_id)
            )

            await session.execute(
                update(DBCashier)
                .where(DBCashier.cashier_id == cashier_id)
                .values(
                    status=CashierStatus.CLOSED.value,
                    physical_cash_amount=Decimal(str(close_data.physical_cash_amount)),
                    cash_difference=cash_difference,
                    closed_at=now,
                    notes=close_data.notes or DBCashier.notes,
                )
            )
            await session.commit()

            # Log closing operation
            await self._log_operation(
                session,
                cashier_id,
                OperationType.CLOSING,
                Decimal(str(close_data.physical_cash_amount)),
                UUID(close_data.operator_id),
                balance_before=await self._get_current_balance(session, cashier_id),
                balance_after=Decimal(str(close_data.physical_cash_amount)),
                notes=close_data.notes or "Cashier closed",
            )

            return await self.get_cashier_by_id(cashier_id)

    async def record_operation(
        self, cashier_id: UUID, operation: CashierOperation
    ) -> CashierOperationResponse:
        """Record a cashier operation."""
        async with self.db_manager.get_session() as session:
            # Get current balance
            current_balance = await self._get_current_balance(session, cashier_id)

            # Calculate new balance
            if operation.operation_type in [OperationType.SALE, OperationType.DEPOSIT]:
                new_balance = current_balance + Decimal(str(operation.amount))
            elif operation.operation_type in [
                OperationType.WITHDRAWAL,
                OperationType.REFUND,
            ]:
                new_balance = current_balance - Decimal(str(operation.amount))
            else:
                new_balance = current_balance

            # Update cashier balance
            await session.execute(
                update(DBCashier)
                .where(DBCashier.cashier_id == cashier_id)
                .values(current_balance=new_balance, expected_balance=new_balance)
            )

            # Log operation
            operation_record = await self._log_operation(
                session,
                cashier_id,
                operation.operation_type,
                Decimal(str(operation.amount)),
                UUID(operation.operator_id),
                balance_before=current_balance,
                balance_after=new_balance,
                payment_method=operation.payment_method,
                related_entity_id=(
                    UUID(operation.related_entity_id)
                    if operation.related_entity_id
                    else None
                ),
                notes=operation.notes,
            )

            await session.commit()

            return CashierOperationResponse(
                id=str(operation_record.operation_id),
                cashier_id=str(cashier_id),
                operation_type=operation.operation_type,
                amount=float(operation.amount),
                operator_id=operation.operator_id,
                payment_method=operation.payment_method,
                related_entity_id=operation.related_entity_id,
                balance_before=float(current_balance),
                balance_after=float(new_balance),
                created_at=operation_record.created_at.isoformat(),
                notes=operation.notes,
            )

    async def record_withdrawal(
        self, cashier_id: UUID, withdrawal: CashierWithdrawal
    ) -> CashierOperationResponse:
        """Record a cashier withdrawal."""
        async with self.db_manager.get_session() as session:
            # Record as operation first
            operation = CashierOperation(
                operation_type=OperationType.WITHDRAWAL,
                amount=withdrawal.amount,
                operator_id=withdrawal.operator_id,
                notes=withdrawal.notes,
            )

            operation_response = await self.record_operation(cashier_id, operation)

            # Record withdrawal details
            db_withdrawal = DBCashierWithdrawal(
                withdrawal_id=uuid4(),
                cashier_id=cashier_id,
                operation_id=UUID(operation_response.id),
                amount=Decimal(str(withdrawal.amount)),
                operator_id=UUID(withdrawal.operator_id),
                authorized_by=(
                    UUID(withdrawal.authorized_by) if withdrawal.authorized_by else None
                ),
                reason=withdrawal.reason,
                notes=withdrawal.notes,
            )

            session.add(db_withdrawal)
            await session.commit()

            return operation_response

    async def list_cashiers(
        self,
        business_day_id: Optional[UUID] = None,
        terminal_id: Optional[str] = None,
        status: Optional[CashierStatus] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[CashierSummary]:
        """List cashiers with filters."""
        async with self.db_manager.get_session() as session:
            query = select(DBCashier).where(
                and_(DBCashier.client_id == "default", DBCashier.store_id == "default")
            )

            if business_day_id:
                query = query.where(DBCashier.business_day_id == business_day_id)
            if terminal_id:
                query = query.where(DBCashier.terminal_id == terminal_id)
            if status:
                query = query.where(DBCashier.status == status.value)

            query = (
                query.order_by(desc(DBCashier.opened_at)).limit(limit).offset(offset)
            )

            result = await session.execute(query)
            db_cashiers = result.scalars().all()

            return [self._db_to_summary(db_cashier) for db_cashier in db_cashiers]

    async def get_cashier_operations(self, cashier_id: UUID) -> List[Dict[str, Any]]:
        """Get operations for a cashier."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                select(DBCashierOperation)
                .where(DBCashierOperation.cashier_id == cashier_id)
                .order_by(DBCashierOperation.created_at)
            )
            operations = result.scalars().all()

            return [
                {
                    "operation_id": str(op.operation_id),
                    "operation_type": op.operation_type,
                    "amount": float(op.amount),
                    "operator_id": str(op.operator_id),
                    "payment_method": op.payment_method,
                    "related_entity_id": (
                        str(op.related_entity_id) if op.related_entity_id else None
                    ),
                    "balance_before": float(op.balance_before),
                    "balance_after": float(op.balance_after),
                    "notes": op.notes,
                    "created_at": op.created_at.isoformat(),
                }
                for op in operations
            ]

    async def _get_current_balance(
        self, session: AsyncSession, cashier_id: UUID
    ) -> Decimal:
        """Get current balance for a cashier."""
        result = await session.execute(
            select(DBCashier.current_balance).where(DBCashier.cashier_id == cashier_id)
        )
        balance = result.scalar_one_or_none()
        return balance or Decimal("0.0")

    async def _get_expected_cash_balance(
        self, session: AsyncSession, cashier_id: UUID
    ) -> Decimal:
        """Get expected cash balance for a cashier."""
        result = await session.execute(
            select(DBCashier.expected_balance).where(DBCashier.cashier_id == cashier_id)
        )
        balance = result.scalar_one_or_none()
        return balance or Decimal("0.0")

    async def _log_operation(
        self,
        session: AsyncSession,
        cashier_id: UUID,
        operation_type: OperationType,
        amount: Decimal,
        operator_id: UUID,
        balance_before: Decimal,
        balance_after: Decimal,
        payment_method: Optional[PaymentMethod] = None,
        related_entity_id: Optional[UUID] = None,
        notes: Optional[str] = None,
    ) -> DBCashierOperation:
        """Log a cashier operation."""
        operation = DBCashierOperation(
            operation_id=uuid4(),
            cashier_id=cashier_id,
            operation_type=operation_type.value,
            amount=amount,
            operator_id=operator_id,
            payment_method=payment_method.value if payment_method else None,
            related_entity_id=related_entity_id,
            balance_before=balance_before,
            balance_after=balance_after,
            notes=notes,
        )
        session.add(operation)
        await session.flush()
        return operation

    def _db_to_model(self, db_cashier: DBCashier) -> Cashier:
        """Convert database model to Pydantic model."""
        return Cashier(
            id=str(db_cashier.cashier_id),
            terminal_id=db_cashier.terminal_id,
            business_day_id=str(db_cashier.business_day_id),
            status=CashierStatus(db_cashier.status),
            current_operator_id=(
                str(db_cashier.current_operator_id)
                if db_cashier.current_operator_id
                else None
            ),
            opening_balance=float(db_cashier.opening_balance),
            current_balance=float(db_cashier.current_balance),
            expected_balance=float(db_cashier.expected_balance),
            physical_cash_amount=(
                float(db_cashier.physical_cash_amount)
                if db_cashier.physical_cash_amount
                else None
            ),
            cash_difference=(
                float(db_cashier.cash_difference)
                if db_cashier.cash_difference
                else None
            ),
            opened_at=(
                db_cashier.opened_at.isoformat() if db_cashier.opened_at else None
            ),
            closed_at=(
                db_cashier.closed_at.isoformat() if db_cashier.closed_at else None
            ),
            created_at=db_cashier.created_at.isoformat(),
            updated_at=db_cashier.updated_at.isoformat(),
            notes=db_cashier.notes,
        )

    def _db_to_summary(self, db_cashier: DBCashier) -> CashierSummary:
        """Convert database model to summary model."""
        return CashierSummary(
            id=str(db_cashier.cashier_id),
            terminal_id=db_cashier.terminal_id,
            business_day_id=str(db_cashier.business_day_id),
            status=CashierStatus(db_cashier.status),
            current_operator_id=(
                str(db_cashier.current_operator_id)
                if db_cashier.current_operator_id
                else None
            ),
            current_balance=float(db_cashier.current_balance),
            opened_at=(
                db_cashier.opened_at.isoformat() if db_cashier.opened_at else None
            ),
            closed_at=(
                db_cashier.closed_at.isoformat() if db_cashier.closed_at else None
            ),
        )
