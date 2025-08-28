"""
Command Card Service
Business logic for managing command cards and sessions
"""

import logging
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID, uuid4

from src.command_card.models.command_card_models import (
    CommandCard,
    CommandCardCreate,
    CommandCardStatus,
    CommandCardUpdate,
    CommandConfiguration,
    CommandItem,
    CommandSession,
    CommandSessionCreate,
    CommandSessionStatus,
    CommandSessionUpdate,
    CommandStatistics,
    CommandTransfer,
)
from src.core.event_bus import EventBus
from src.core.exceptions import BusinessException, ConflictException
from src.database.db_service import DatabaseService
from src.order.services.order_service import OrderService
from src.payment.services.payment_service import PaymentService

logger = logging.getLogger(__name__)


class CommandCardService:
    """Service for managing command cards"""

    def __init__(
        self,
        db_service: DatabaseService,
        event_bus: EventBus,
        order_service: Optional[OrderService] = None,
        payment_service: Optional[PaymentService] = None
    ):
        self.db = db_service
        self.event_bus = event_bus
        self.order_service = order_service
        self.payment_service = payment_service
        self.config_cache: Dict[str, CommandConfiguration] = {}

    # Command Card Management

    async def create_card(
        self,
        store_id: str,
        data: CommandCardCreate,
        created_by: str
    ) -> CommandCard:
        """Create a new command card"""
        try:
            # Check for duplicates
            existing = await self._find_card_by_number(store_id, data.card_number)
            if existing:
                raise ConflictException(f"Card number {data.card_number} already exists")

            # Create card
            card_id = str(uuid4())
            card = CommandCard(
                id=UUID(card_id),
                store_id=store_id,
                card_number=data.card_number,
                card_type=data.card_type,
                barcode=data.barcode,
                qr_code=data.qr_code,
                nfc_tag=data.nfc_tag,
                description=data.description,
                status=data.initial_status,
                times_used=0,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                created_by=UUID(created_by),
                metadata=data.metadata or {},
                version=1
            )

            # Save to database
            await self._save_card(card)

            # Publish event
            await self.event_bus.publish("command_card.created", {
                "card_id": str(card.id),
                "card_number": card.card_number,
                "store_id": store_id
            })

            logger.info(f"Created command card {card.card_number}")
            return card

        except Exception as e:
            logger.error(f"Error creating command card: {e}")
            raise

    async def get_card(self, card_id: str) -> Optional[CommandCard]:
        """Get command card by ID"""
        result = await self.db.get("command_cards", card_id)
        if result:
            return CommandCard(**result)
        return None

    async def get_card_by_number(
        self,
        store_id: str,
        card_number: str
    ) -> Optional[CommandCard]:
        """Get command card by number"""
        return await self._find_card_by_number(store_id, card_number)

    async def update_card(
        self,
        card_id: str,
        data: CommandCardUpdate
    ) -> Optional[CommandCard]:
        """Update command card"""
        try:
            card = await self.get_card(card_id)
            if not card:
                return None

            # Update fields
            update_fields = data.dict(exclude_unset=True)
            for field, value in update_fields.items():
                if hasattr(card, field):
                    setattr(card, field, value)

            card.updated_at = datetime.now()
            card.version += 1

            # Save changes
            await self._save_card(card)

            # Publish event
            await self.event_bus.publish("command_card.updated", {
                "card_id": str(card.id),
                "updates": update_fields
            })

            return card

        except Exception as e:
            logger.error(f"Error updating card {card_id}: {e}")
            raise

    async def list_cards(
        self,
        store_id: str,
        status_filter: Optional[CommandCardStatus] = None,
        available_only: bool = False
    ) -> List[CommandCard]:
        """List command cards with optional filters"""
        try:
            query = {"store_id": store_id}

            if status_filter:
                query["status"] = status_filter.value
            elif available_only:
                query["status"] = CommandCardStatus.AVAILABLE.value

            results = await self.db.query("command_cards", query)

            cards = [CommandCard(**r) for r in results]

            # Sort by card number
            cards.sort(key=lambda c: c.card_number)

            return cards

        except Exception as e:
            logger.error(f"Error listing cards: {e}")
            return []

    async def mark_card_lost(
        self,
        card_id: str,
        reason: Optional[str] = None
    ) -> bool:
        """Mark a card as lost"""
        try:
            card = await self.get_card(card_id)
            if not card:
                return False

            # Check if in use
            if card.status == CommandCardStatus.IN_USE:
                # Close any active session first
                if card.current_session_id:
                    await self.close_session(str(card.current_session_id))

            # Update status
            card.status = CommandCardStatus.LOST
            card.updated_at = datetime.now()

            if reason:
                card.metadata["lost_reason"] = reason
                card.metadata["lost_date"] = datetime.now().isoformat()

            await self._save_card(card)

            # Publish event
            await self.event_bus.publish("command_card.lost", {
                "card_id": str(card.id),
                "reason": reason
            })

            logger.info(f"Marked card {card.card_number} as lost")
            return True

        except Exception as e:
            logger.error(f"Error marking card lost: {e}")
            return False

    # Session Management

    async def start_session(
        self,
        store_id: str,
        terminal_id: str,
        data: CommandSessionCreate
    ) -> CommandSession:
        """Start a new command session"""
        try:
            # Get card
            card = await self.get_card(str(data.card_id))
            if not card:
                raise BusinessException("Card not found")

            # Check card availability
            if not card.is_available:
                raise ConflictException(f"Card {card.card_number} is not available")

            # Check for existing active session
            if card.current_session_id:
                existing = await self.get_session(str(card.current_session_id))
                if existing and existing.status == CommandSessionStatus.ACTIVE:
                    raise ConflictException("Card already has an active session")

            # Create session
            session_id = str(uuid4())
            session = CommandSession(
                id=UUID(session_id),
                card_id=data.card_id,
                status=CommandSessionStatus.ACTIVE,
                customer_name=data.customer_name,
                customer_phone=data.customer_phone,
                customer_id=data.customer_id,
                table_id=data.table_id,
                waiter_id=data.waiter_id,
                people_count=data.people_count,
                payment_responsibility=data.payment_responsibility,
                notes=data.notes,
                credit_amount=data.initial_credit or 0,
                credit_limit=data.credit_limit,
                require_authorization=data.require_authorization,
                authorized_by=data.authorized_by,
                authorization_timestamp=datetime.now() if data.authorized_by else None,
                started_at=datetime.now(),
                store_id=store_id,
                terminal_id=terminal_id,
                metadata={},
                version=1
            )

            # Save session
            await self._save_session(session)

            # Update card
            card.status = CommandCardStatus.IN_USE
            card.current_session_id = session.id
            card.assigned_table_id = data.table_id
            card.assigned_customer_id = data.customer_id
            card.last_used_at = datetime.now()
            card.times_used += 1
            await self._save_card(card)

            # Publish event
            await self.event_bus.publish("command_session.started", {
                "session_id": str(session.id),
                "card_id": str(card.id),
                "card_number": card.card_number,
                "store_id": store_id
            })

            logger.info(f"Started session {session.id} for card {card.card_number}")
            return session

        except Exception as e:
            logger.error(f"Error starting session: {e}")
            raise

    async def get_session(self, session_id: str) -> Optional[CommandSession]:
        """Get command session by ID"""
        result = await self.db.get("command_sessions", session_id)
        if result:
            return CommandSession(**result)
        return None

    async def get_active_session_by_card(
        self,
        card_id: str
    ) -> Optional[CommandSession]:
        """Get active session for a card"""
        try:
            query = {
                "card_id": card_id,
                "status": CommandSessionStatus.ACTIVE.value
            }

            results = await self.db.query("command_sessions", query)

            if results:
                return CommandSession(**results[0])

            return None

        except Exception as e:
            logger.error(f"Error getting active session: {e}")
            return None

    async def update_session(
        self,
        session_id: str,
        data: CommandSessionUpdate
    ) -> Optional[CommandSession]:
        """Update command session"""
        try:
            session = await self.get_session(session_id)
            if not session:
                return None

            # Check if can be modified
            if session.status in [CommandSessionStatus.PAID, CommandSessionStatus.CANCELLED]:
                raise BusinessException("Cannot modify completed session")

            # Update fields
            update_fields = data.dict(exclude_unset=True)
            for field, value in update_fields.items():
                if hasattr(session, field):
                    setattr(session, field, value)

            session.version += 1

            # Save changes
            await self._save_session(session)

            # Publish event
            await self.event_bus.publish("command_session.updated", {
                "session_id": str(session.id),
                "updates": update_fields
            })

            return session

        except Exception as e:
            logger.error(f"Error updating session {session_id}: {e}")
            raise

    async def add_item_to_session(
        self,
        session_id: str,
        product_id: str,
        quantity: int,
        unit_price: float,
        added_by: str,
        terminal_id: str
    ) -> CommandItem:
        """Add item to command session"""
        try:
            session = await self.get_session(session_id)
            if not session:
                raise BusinessException("Session not found")

            if session.status != CommandSessionStatus.ACTIVE:
                raise BusinessException("Session is not active")

            # Check credit limit if applicable
            if session.credit_limit:
                new_total = session.total_amount + (quantity * unit_price)
                if new_total > session.credit_limit:
                    raise BusinessException(f"Credit limit of {session.credit_limit} would be exceeded")

            # Create item
            item = CommandItem(
                id=UUID(str(uuid4())),
                session_id=UUID(session_id),
                card_id=session.card_id,
                product_id=UUID(product_id),
                product_name="",  # Would be fetched from product service
                product_code="",  # Would be fetched from product service
                quantity=quantity,
                unit_price=unit_price,
                total_price=quantity * unit_price,
                status="PENDING",
                added_by=UUID(added_by),
                added_at=datetime.now(),
                terminal_id=terminal_id
            )

            # Save item
            await self.db.upsert("command_items", str(item.id), item.dict())

            # Update session totals
            session.total_amount += item.total_price
            session.item_count += quantity
            session.order_ids.append(item.id)
            await self._save_session(session)

            # Publish event
            await self.event_bus.publish("command_item.added", {
                "item_id": str(item.id),
                "session_id": str(session.id),
                "product_id": product_id,
                "quantity": quantity,
                "total": item.total_price
            })

            logger.info(f"Added item to session {session_id}")
            return item

        except Exception as e:
            logger.error(f"Error adding item to session: {e}")
            raise

    async def remove_item_from_session(
        self,
        session_id: str,
        item_id: str,
        reason: str,
        cancelled_by: str
    ) -> bool:
        """Remove/cancel item from session"""
        try:
            session = await self.get_session(session_id)
            if not session:
                return False

            # Get item
            item_result = await self.db.get("command_items", item_id)
            if not item_result:
                return False

            item = CommandItem(**item_result)

            # Check if can be cancelled
            if item.status in ["DELIVERED", "CANCELLED"]:
                raise BusinessException("Cannot cancel delivered or already cancelled item")

            # Update item
            item.status = "CANCELLED"
            item.cancelled_at = datetime.now()
            item.cancelled_by = UUID(cancelled_by)
            item.cancellation_reason = reason

            await self.db.upsert("command_items", item_id, item.dict())

            # Update session totals
            session.total_amount -= item.total_price
            session.item_count -= item.quantity
            await self._save_session(session)

            # Publish event
            await self.event_bus.publish("command_item.cancelled", {
                "item_id": item_id,
                "session_id": session_id,
                "reason": reason
            })

            logger.info(f"Cancelled item {item_id} from session {session_id}")
            return True

        except Exception as e:
            logger.error(f"Error removing item: {e}")
            return False

    async def close_session(
        self,
        session_id: str,
        close_reason: Optional[str] = None
    ) -> bool:
        """Close command session (ready for payment)"""
        try:
            session = await self.get_session(session_id)
            if not session:
                return False

            if session.status != CommandSessionStatus.ACTIVE:
                raise BusinessException("Session is not active")

            # Update session
            session.status = CommandSessionStatus.CLOSED
            session.closed_at = datetime.now()

            if close_reason:
                session.metadata["close_reason"] = close_reason

            await self._save_session(session)

            # Update card status
            card = await self.get_card(str(session.card_id))
            if card:
                card.status = CommandCardStatus.AVAILABLE
                card.current_session_id = None
                card.assigned_table_id = None
                card.assigned_customer_id = None
                await self._save_card(card)

            # Publish event
            await self.event_bus.publish("command_session.closed", {
                "session_id": str(session.id),
                "card_id": str(session.card_id),
                "total_amount": session.total_amount,
                "balance_due": session.balance_due
            })

            logger.info(f"Closed session {session_id}")
            return True

        except Exception as e:
            logger.error(f"Error closing session: {e}")
            return False

    async def process_payment(
        self,
        session_id: str,
        payment_amount: float,
        payment_method: str
    ) -> bool:
        """Process payment for session"""
        try:
            session = await self.get_session(session_id)
            if not session:
                return False

            if session.status == CommandSessionStatus.PAID:
                raise BusinessException("Session already paid")

            # Update payment
            session.paid_amount += payment_amount

            # Check if fully paid
            if session.balance_due <= 0:
                session.status = CommandSessionStatus.PAID
                session.paid_at = datetime.now()

            await self._save_session(session)

            # If using payment service
            if self.payment_service:
                # Create payment record
                pass

            # Publish event
            await self.event_bus.publish("command_session.payment", {
                "session_id": str(session.id),
                "payment_amount": payment_amount,
                "payment_method": payment_method,
                "is_paid": session.is_paid
            })

            logger.info(f"Processed payment of {payment_amount} for session {session_id}")
            return True

        except Exception as e:
            logger.error(f"Error processing payment: {e}")
            return False

    async def transfer_session(
        self,
        from_card_id: str,
        to_card_id: str,
        authorized_by: str,
        transfer_all: bool = True,
        item_ids: Optional[List[str]] = None
    ) -> CommandTransfer:
        """Transfer session between cards"""
        try:
            # Get source session
            from_session = await self.get_active_session_by_card(from_card_id)
            if not from_session:
                raise BusinessException("No active session on source card")

            # Get target card
            to_card = await self.get_card(to_card_id)
            if not to_card or not to_card.is_available:
                raise BusinessException("Target card not available")

            # Create transfer record
            transfer = CommandTransfer(
                id=UUID(str(uuid4())),
                from_card_id=UUID(from_card_id),
                to_card_id=UUID(to_card_id),
                from_session_id=from_session.id,
                transfer_all=transfer_all,
                item_ids=[UUID(i) for i in item_ids] if item_ids else None,
                authorized_by=UUID(authorized_by),
                requested_at=datetime.now(),
                status="PENDING"
            )

            # Perform transfer
            if transfer_all:
                # Transfer entire session
                from_session.card_id = UUID(to_card_id)
                await self._save_session(from_session)

                # Update cards
                from_card = await self.get_card(from_card_id)
                if from_card:
                    from_card.status = CommandCardStatus.AVAILABLE
                    from_card.current_session_id = None
                    await self._save_card(from_card)

                to_card.status = CommandCardStatus.IN_USE
                to_card.current_session_id = from_session.id
                await self._save_card(to_card)

            else:
                # Transfer specific items
                # Would need to create new session and move items
                pass

            # Update transfer
            transfer.status = "COMPLETED"
            transfer.completed_at = datetime.now()

            # Save transfer
            await self.db.upsert("command_transfers", str(transfer.id), transfer.dict())

            # Publish event
            await self.event_bus.publish("command_session.transferred", {
                "transfer_id": str(transfer.id),
                "from_card": from_card_id,
                "to_card": to_card_id
            })

            logger.info(f"Transferred session from {from_card_id} to {to_card_id}")
            return transfer

        except Exception as e:
            logger.error(f"Error transferring session: {e}")
            raise

    async def get_statistics(
        self,
        store_id: str,
        date_filter: Optional[datetime] = None
    ) -> CommandStatistics:
        """Get command card statistics"""
        try:
            if not date_filter:
                date_filter = datetime.now().replace(hour=0, minute=0, second=0)

            # Get all cards
            cards = await self.list_cards(store_id)

            # Count by status
            status_counts = defaultdict(int)
            for card in cards:
                status_counts[card.status] += 1

            # Get today's sessions
            query = {
                "store_id": store_id,
                "started_at": {"$gte": date_filter.isoformat()}
            }

            sessions = await self.db.query("command_sessions", query)

            # Calculate statistics
            active_sessions = sum(1 for s in sessions if s["status"] == CommandSessionStatus.ACTIVE.value)
            total_revenue = sum(s.get("paid_amount", 0) for s in sessions)
            pending_payments = sum(s.get("balance_due", 0) for s in sessions if s["status"] == CommandSessionStatus.CLOSED.value)

            # Calculate averages
            if sessions:
                avg_duration = sum(s.get("duration_minutes", 0) for s in sessions) / len(sessions)
                avg_value = sum(s.get("total_amount", 0) for s in sessions) / len(sessions)
                avg_items = sum(s.get("item_count", 0) for s in sessions) / len(sessions)
            else:
                avg_duration = 0
                avg_value = 0
                avg_items = 0

            # Card turnover rate
            if cards and len(sessions) > 0:
                turnover_rate = len(sessions) / len(cards)
            else:
                turnover_rate = 0

            return CommandStatistics(
                total_cards=len(cards),
                available_cards=status_counts[CommandCardStatus.AVAILABLE],
                in_use_cards=status_counts[CommandCardStatus.IN_USE],
                lost_cards=status_counts[CommandCardStatus.LOST],
                damaged_cards=status_counts[CommandCardStatus.DAMAGED],
                total_sessions_today=len(sessions),
                active_sessions=active_sessions,
                average_session_duration=avg_duration,
                average_session_value=avg_value,
                total_revenue_today=total_revenue,
                pending_payments=pending_payments,
                average_items_per_session=avg_items,
                card_turnover_rate=turnover_rate
            )

        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            raise

    # Private helper methods

    async def _find_card_by_number(
        self,
        store_id: str,
        card_number: str
    ) -> Optional[CommandCard]:
        """Find card by number"""
        try:
            query = {
                "store_id": store_id,
                "card_number": card_number.strip().upper()
            }

            results = await self.db.query("command_cards", query)

            if results:
                return CommandCard(**results[0])

            return None

        except Exception as e:
            logger.error(f"Error finding card: {e}")
            return None

    async def _save_card(self, card: CommandCard) -> None:
        """Save command card to database"""
        await self.db.upsert("command_cards", str(card.id), card.dict())

    async def _save_session(self, session: CommandSession) -> None:
        """Save command session to database"""
        await self.db.upsert("command_sessions", str(session.id), session.dict())

    async def _get_config(self, store_id: str) -> CommandConfiguration:
        """Get command configuration for store"""
        if store_id in self.config_cache:
            return self.config_cache[store_id]

        result = await self.db.get("command_configurations", store_id)
        if result:
            config = CommandConfiguration(**result)
        else:
            config = CommandConfiguration()

        self.config_cache[store_id] = config
        return config
