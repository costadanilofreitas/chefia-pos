"""
Repository for order operations.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import and_, delete, desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database.connection import DatabaseManager
from src.core.models.core_models import (
    Order,
    OrderCreate,
    OrderItem,
    OrderItemCreate,
    OrderStatus,
    OrderType,
    OrderUpdate,
    PaymentStatus,
)

from ..models.db_models import (
    Order as DBOrder,
)
from ..models.db_models import (
    OrderHistory as DBOrderHistory,
)
from ..models.db_models import (
    OrderItem as DBOrderItem,
)


class OrderRepository:
    """Repository for order operations."""

    def __init__(self):
        self.db_manager = DatabaseManager()

    async def create_order(self, order_data: OrderCreate) -> Order:
        """Create a new order."""
        async with self.db_manager.get_session() as session:
            # Generate order number
            order_number = (
                f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
            )

            db_order = DBOrder(
                order_id=uuid4(),
                client_id="default",
                store_id="default",
                order_number=order_number,
                status=OrderStatus.PENDING.value,
                order_type=(
                    order_data.order_type.value
                    if hasattr(order_data, "order_type")
                    else OrderType.DINE_IN.value
                ),
                customer_id=(
                    UUID(order_data.customer_id)
                    if hasattr(order_data, "customer_id") and order_data.customer_id
                    else None
                ),
                waiter_id=(
                    UUID(order_data.waiter_id)
                    if hasattr(order_data, "waiter_id") and order_data.waiter_id
                    else None
                ),
                table_id=(
                    UUID(order_data.table_id)
                    if hasattr(order_data, "table_id") and order_data.table_id
                    else None
                ),
                business_day_id=(
                    UUID(order_data.business_day_id)
                    if hasattr(order_data, "business_day_id")
                    and order_data.business_day_id
                    else None
                ),
                cashier_id=(
                    UUID(order_data.cashier_id)
                    if hasattr(order_data, "cashier_id") and order_data.cashier_id
                    else None
                ),
                subtotal=Decimal("0.0"),
                tax=Decimal("0.0"),
                discount=Decimal("0.0"),
                service_fee=Decimal("0.0"),
                delivery_fee=Decimal("0.0"),
                total=Decimal("0.0"),
                payment_status=PaymentStatus.PENDING.value,
                notes=getattr(order_data, "notes", None),
                delivery_address=getattr(order_data, "delivery_address", None),
                estimated_preparation_time=getattr(
                    order_data, "estimated_preparation_time", None
                ),
            )

            session.add(db_order)
            await session.flush()

            # Add order items if provided
            total_amount = Decimal("0.0")
            if hasattr(order_data, "items") and order_data.items:
                for item_data in order_data.items:
                    await self._add_order_item(session, UUID(str(db_order.order_id)), item_data)
                    item_subtotal = Decimal(str(item_data.unit_price)) * Decimal(str(item_data.quantity))
                    total_amount += item_subtotal

            # Update totals
            db_order.subtotal = total_amount
            db_order.total = total_amount

            # Log order creation
            await self._log_order_history(
                session,
                UUID(str(db_order.order_id)),
                None,
                OrderStatus.PENDING.value,
                getattr(order_data, "created_by", None) or "system",
                "Order created",
            )

            await session.commit()
            await session.refresh(db_order)

            return await self._db_order_to_model(session, db_order)

    async def get_order_by_id(self, order_id: UUID) -> Optional[Order]:
        """Get order by ID."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                select(DBOrder).where(DBOrder.order_id == order_id)
            )
            db_order = result.scalar_one_or_none()

            if db_order:
                return await self._db_order_to_model(session, db_order)
            return None

    async def get_order_by_number(self, order_number: str) -> Optional[Order]:
        """Get order by order number."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                select(DBOrder).where(
                    and_(
                        DBOrder.order_number == order_number,
                        DBOrder.client_id == "default",
                        DBOrder.store_id == "default",
                    )
                )
            )
            db_order = result.scalar_one_or_none()

            if db_order:
                return await self._db_order_to_model(session, db_order)
            return None

    async def update_order(
        self, order_id: UUID, order_data: OrderUpdate
    ) -> Optional[Order]:
        """Update order."""
        async with self.db_manager.get_session() as session:
            update_data = {
                k: v
                for k, v in order_data.dict(exclude_unset=True).items()
                if v is not None
            }

            # Convert enum values
            old_status = None
            if "status" in update_data:
                # Get current status for history
                result = await session.execute(
                    select(DBOrder.status).where(DBOrder.order_id == order_id)
                )
                old_status = result.scalar_one_or_none()
                update_data["status"] = update_data["status"].value

            if "payment_status" in update_data:
                update_data["payment_status"] = update_data["payment_status"].value
            if "order_type" in update_data:
                update_data["order_type"] = update_data["order_type"].value

            # Convert UUIDs
            for field in [
                "customer_id",
                "waiter_id",
                "table_id",
                "business_day_id",
                "cashier_id",
            ]:
                if field in update_data and update_data[field]:
                    update_data[field] = UUID(update_data[field])

            # Convert decimals
            for field in [
                "subtotal",
                "tax",
                "discount",
                "service_fee",
                "delivery_fee",
                "total",
            ]:
                if field in update_data:
                    update_data[field] = Decimal(str(update_data[field]))

            if update_data:
                await session.execute(
                    update(DBOrder)
                    .where(DBOrder.order_id == order_id)
                    .values(**update_data)
                )

                # Log status change if occurred
                if "status" in update_data and old_status:
                    await self._log_order_history(
                        session,
                        order_id,
                        old_status,
                        update_data["status"],
                        getattr(order_data, "updated_by", "system"),
                        f"Status changed from {old_status} to {update_data['status']}",
                    )

                await session.commit()

            return await self.get_order_by_id(order_id)

    async def delete_order(self, order_id: UUID) -> bool:
        """Delete order."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                delete(DBOrder).where(DBOrder.order_id == order_id)
            )
            await session.commit()
            return result.rowcount > 0

    async def list_orders(
        self,
        status: Optional[OrderStatus] = None,
        payment_status: Optional[PaymentStatus] = None,
        customer_id: Optional[UUID] = None,
        business_day_id: Optional[UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Order]:
        """List orders with filters."""
        async with self.db_manager.get_session() as session:
            query = select(DBOrder).where(
                and_(DBOrder.client_id == "default", DBOrder.store_id == "default")
            )

            if status:
                query = query.where(DBOrder.status == status.value)
            if payment_status:
                query = query.where(DBOrder.payment_status == payment_status.value)
            if customer_id:
                query = query.where(DBOrder.customer_id == customer_id)
            if business_day_id:
                query = query.where(DBOrder.business_day_id == business_day_id)
            if start_date:
                query = query.where(DBOrder.created_at >= start_date)
            if end_date:
                query = query.where(DBOrder.created_at <= end_date)

            query = query.order_by(desc(DBOrder.created_at)).limit(limit).offset(offset)

            result = await session.execute(query)
            db_orders = result.scalars().all()

            orders = []
            for db_order in db_orders:
                order = await self._db_order_to_model(session, db_order)
                orders.append(order)

            return orders

    async def add_order_item(
        self, order_id: UUID, item_data: OrderItemCreate
    ) -> OrderItem:
        """Add item to order."""
        async with self.db_manager.get_session() as session:
            order_item = await self._add_order_item(session, order_id, item_data)

            # Update order totals
            await self._update_order_totals(session, order_id)

            await session.commit()
            await session.refresh(order_item)

            return self._db_order_item_to_model(order_item)

    async def get_order_items(self, order_id: UUID) -> List[OrderItem]:
        """Get all items for an order."""
        async with self.db_manager.get_session() as session:
            result = await session.execute(
                select(DBOrderItem)
                .where(DBOrderItem.order_id == order_id)
                .order_by(DBOrderItem.created_at)
            )
            db_items = result.scalars().all()

            return [self._db_order_item_to_model(db_item) for db_item in db_items]

    async def _add_order_item(
        self, session: AsyncSession, order_id: UUID, item_data: OrderItemCreate
    ) -> DBOrderItem:
        """Add an order item (internal method)."""
        db_item = DBOrderItem(
            item_id=uuid4(),
            order_id=order_id,
            product_id=UUID(item_data.product_id),
            product_name=(
                item_data.product_name
                if hasattr(item_data, "product_name")
                else "Product"
            ),
            quantity=Decimal(str(item_data.quantity)),
            unit_price=Decimal(str(item_data.unit_price)),
            subtotal=Decimal(str(item_data.unit_price)) * Decimal(str(item_data.quantity)),
            status=OrderStatus.PENDING.value,
            notes=getattr(item_data, "notes", None),
            customizations=getattr(item_data, "customizations", None),
            preparation_time=getattr(item_data, "preparation_time", None),
        )

        session.add(db_item)
        await session.flush()
        return db_item

    async def _update_order_totals(self, session: AsyncSession, order_id: UUID) -> None:
        """Update order totals based on items."""
        result = await session.execute(
            select(func.sum(DBOrderItem.subtotal)).where(
                DBOrderItem.order_id == order_id
            )
        )
        subtotal = result.scalar() or Decimal("0.0")

        await session.execute(
            update(DBOrder)
            .where(DBOrder.order_id == order_id)
            .values(
                subtotal=subtotal,
                total=subtotal,  # Simple total for now, can add taxes/fees later
            )
        )

    async def _log_order_history(
        self,
        session: AsyncSession,
        order_id: UUID,
        previous_status: Optional[str],
        new_status: str,
        changed_by: str,
        reason: Optional[str] = None,
    ) -> None:
        """Log order status change."""
        history = DBOrderHistory(
            history_id=uuid4(),
            order_id=order_id,
            previous_status=previous_status,
            new_status=new_status,
            changed_by=UUID(changed_by) if changed_by != "system" else None,
            reason=reason,
        )
        session.add(history)
        await session.flush()

    async def _db_order_to_model(
        self, session: AsyncSession, db_order: DBOrder
    ) -> Order:
        """Convert database order to Pydantic model."""
        # Get order items
        items_result = await session.execute(
            select(DBOrderItem)
            .where(DBOrderItem.order_id == db_order.order_id)
            .order_by(DBOrderItem.created_at)
        )
        db_items = items_result.scalars().all()
        items = [self._db_order_item_to_model(db_item) for db_item in db_items]

        return Order(
            id=str(db_order.order_id),
            order_number=str(db_order.order_number) if db_order.order_number else None,
            status=OrderStatus(str(db_order.status)),
            order_type=(
                OrderType(str(db_order.order_type))
                if db_order.order_type
                else OrderType.DINE_IN
            ),
            customer_id=str(db_order.customer_id) if db_order.customer_id else "",
            waiter_id=str(db_order.waiter_id) if db_order.waiter_id else "",
            # table_id and business_day_id are not in the Order model
            # table_id=str(db_order.table_id) if db_order.table_id else None,
            # business_day_id=(
            #     str(db_order.business_day_id) if db_order.business_day_id else None
            # ),
            cashier_id=str(db_order.cashier_id) if db_order.cashier_id else None,
            subtotal=float(db_order.subtotal),
            tax=float(db_order.tax),
            discount=float(db_order.discount),
            # service_fee is not in the Order model
            # service_fee=float(db_order.service_fee) if db_order.service_fee else 0.0,
            delivery_fee=float(db_order.delivery_fee) if db_order.delivery_fee else 0.0,
            total=float(db_order.total),
            payment_status=PaymentStatus(str(db_order.payment_status)),
            payment_method=str(db_order.payment_method) if db_order.payment_method else None,
            notes=str(db_order.notes) if db_order.notes else "",
            delivery_address=dict(db_order.delivery_address) if db_order.delivery_address else {},
            # estimated_preparation_time is not in the Order model
            # estimated_preparation_time=db_order.estimated_preparation_time,
            items=items,
            created_at=db_order.created_at.isoformat() if db_order.created_at else "",
            updated_at=db_order.updated_at.isoformat() if db_order.updated_at else "",
        )

    def _db_order_item_to_model(self, db_item: DBOrderItem) -> OrderItem:
        """Convert database order item to Pydantic model."""
        return OrderItem(
            id=str(db_item.item_id),
            product_id=str(db_item.product_id),
            product_name=str(db_item.product_name),
            quantity=int(float(db_item.quantity)),
            unit_price=float(db_item.unit_price),
            total_price=float(db_item.subtotal),  # OrderItem uses total_price not subtotal
            # status is not in the OrderItem model
            # status=OrderStatus(str(db_item.status)),
            notes=str(db_item.notes) if db_item.notes else "",
            customizations=list(db_item.customizations) if db_item.customizations else [],
            # preparation_time is not in the OrderItem model
            # preparation_time=db_item.preparation_time,
            created_at=db_item.created_at.isoformat() if db_item.created_at else "",
            updated_at=db_item.updated_at.isoformat() if db_item.updated_at else "",
        )
