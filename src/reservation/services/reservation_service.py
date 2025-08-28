"""
Reservation Service
Business logic for managing table reservations
"""

from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, date, time, timedelta
from uuid import UUID, uuid4
import asyncio
from collections import defaultdict

from src.reservation.models.reservation_models import (
    Reservation,
    ReservationCreate,
    ReservationUpdate,
    ReservationStatus,
    ReservationSource,
    ReservationSlot,
    ReservationAvailability,
    ReservationStatistics,
    TableAllocation,
    BlockedSlot,
    ReservationSettings,
    RecurrenceType,
    TablePreference
)
from src.waiter.services.table_layout_service import TableLayoutService
from src.queue.services.queue_service import QueueService
from src.database.db_service import DatabaseService
from src.core.event_bus import EventBus
from src.core.exceptions import BusinessException, ConflictException
import logging

logger = logging.getLogger(__name__)


class ReservationService:
    """Service for managing reservations"""
    
    def __init__(
        self,
        db_service: DatabaseService,
        table_service: TableLayoutService,
        queue_service: QueueService,
        event_bus: EventBus
    ):
        self.db = db_service
        self.table_service = table_service
        self.queue_service = queue_service
        self.event_bus = event_bus
        self.settings_cache: Dict[str, ReservationSettings] = {}
        
    async def create_reservation(
        self,
        store_id: str,
        data: ReservationCreate
    ) -> Reservation:
        """Create a new reservation"""
        try:
            # Validate business rules
            settings = await self._get_settings(store_id)
            if not settings.enabled:
                raise BusinessException("Reservation system is disabled")
                
            # Check advance time constraints
            reservation_datetime = datetime.combine(
                data.reservation_date,
                data.reservation_time
            )
            
            now = datetime.now()
            hours_advance = (reservation_datetime - now).total_seconds() / 3600
            
            if hours_advance < settings.min_advance_hours:
                raise BusinessException(
                    f"Reservations must be made at least {settings.min_advance_hours} hours in advance"
                )
                
            if hours_advance > settings.max_advance_days * 24:
                raise BusinessException(
                    f"Reservations cannot be made more than {settings.max_advance_days} days in advance"
                )
                
            # Check party size
            if data.party_size < settings.min_party_size or data.party_size > settings.max_party_size:
                raise BusinessException(
                    f"Party size must be between {settings.min_party_size} and {settings.max_party_size}"
                )
                
            # Check availability
            is_available = await self._check_availability(
                store_id,
                data.reservation_date,
                data.reservation_time,
                data.duration_minutes or settings.default_duration_minutes,
                data.party_size
            )
            
            if not is_available:
                raise ConflictException("No tables available for this time slot")
                
            # Generate confirmation code
            confirmation_code = self._generate_confirmation_code()
            
            # Create reservation
            reservation_id = str(uuid4())
            
            reservation = Reservation(
                id=UUID(reservation_id),
                store_id=store_id,
                customer_name=data.customer_name,
                customer_phone=data.customer_phone,
                customer_email=data.customer_email,
                customer_id=data.customer_id,
                party_size=data.party_size,
                reservation_date=data.reservation_date,
                reservation_time=data.reservation_time,
                duration_minutes=data.duration_minutes or settings.default_duration_minutes,
                table_preferences=data.table_preferences or [],
                special_requests=data.special_requests,
                dietary_restrictions=data.dietary_restrictions,
                celebration_type=data.celebration_type,
                source=data.source,
                status=ReservationStatus.PENDING if settings.require_confirmation else ReservationStatus.CONFIRMED,
                confirmation_code=confirmation_code,
                deposit_amount=data.deposit_amount if settings.require_deposit else None,
                deposit_paid=False,
                deposit_refunded=False,
                notification_sent=False,
                reminder_sent=False,
                recurrence=data.recurrence,
                recurrence_end_date=data.recurrence_end_date,
                assigned_tables=data.assigned_tables or [],
                created_at=datetime.now(),
                updated_at=datetime.now(),
                confirmed_at=datetime.now() if data.auto_confirm else None,
                version=1
            )
            
            # Try to auto-assign tables if requested
            if data.assigned_tables is None:
                allocation = await self._find_best_tables(
                    store_id,
                    reservation.reservation_datetime,
                    data.party_size,
                    data.table_preferences or []
                )
                if allocation:
                    reservation.assigned_tables = allocation.table_ids
                    
            # Save to database
            await self._save_reservation(reservation)
            
            # Handle recurrence
            if data.recurrence != RecurrenceType.NONE and data.recurrence_end_date:
                await self._create_recurring_reservations(
                    reservation,
                    data.recurrence,
                    data.recurrence_end_date
                )
                
            # Send confirmation if auto-confirmed
            if data.auto_confirm or not settings.require_confirmation:
                await self._send_confirmation(reservation)
                
            # Publish event
            await self.event_bus.publish("reservation.created", {
                "reservation_id": str(reservation.id),
                "store_id": store_id,
                "customer_name": reservation.customer_name,
                "party_size": reservation.party_size,
                "datetime": reservation.reservation_datetime.isoformat()
            })
            
            logger.info(f"Created reservation {reservation.id} for {reservation.customer_name}")
            return reservation
            
        except Exception as e:
            logger.error(f"Error creating reservation: {e}")
            raise
            
    async def update_reservation(
        self,
        reservation_id: str,
        data: ReservationUpdate
    ) -> Optional[Reservation]:
        """Update an existing reservation"""
        try:
            # Get existing reservation
            reservation = await self._get_reservation(reservation_id)
            if not reservation:
                return None
                
            # Check if can be modified
            if reservation.status in [ReservationStatus.COMPLETED, ReservationStatus.NO_SHOW]:
                raise BusinessException("Cannot modify completed or no-show reservations")
                
            # Update fields
            update_fields = data.dict(exclude_unset=True)
            
            # If changing date/time, check availability
            if 'reservation_date' in update_fields or 'reservation_time' in update_fields:
                new_date = update_fields.get('reservation_date', reservation.reservation_date)
                new_time = update_fields.get('reservation_time', reservation.reservation_time)
                
                is_available = await self._check_availability(
                    reservation.store_id,
                    new_date,
                    new_time,
                    reservation.duration_minutes,
                    update_fields.get('party_size', reservation.party_size),
                    exclude_reservation_id=reservation_id
                )
                
                if not is_available:
                    raise ConflictException("No tables available for the new time slot")
                    
            # Apply updates
            for field, value in update_fields.items():
                if hasattr(reservation, field):
                    setattr(reservation, field, value)
                    
            # Update timestamps based on status change
            if 'status' in update_fields:
                await self._update_status_timestamps(reservation, update_fields['status'])
                
            reservation.updated_at = datetime.now()
            reservation.version += 1
            
            # Save changes
            await self._save_reservation(reservation)
            
            # Publish event
            await self.event_bus.publish("reservation.updated", {
                "reservation_id": str(reservation.id),
                "store_id": reservation.store_id,
                "updates": update_fields
            })
            
            logger.info(f"Updated reservation {reservation.id}")
            return reservation
            
        except Exception as e:
            logger.error(f"Error updating reservation {reservation_id}: {e}")
            raise
            
    async def update_status(
        self,
        reservation_id: str,
        status: ReservationStatus,
        reason: Optional[str] = None
    ) -> bool:
        """Update reservation status"""
        try:
            reservation = await self._get_reservation(reservation_id)
            if not reservation:
                return False
                
            old_status = reservation.status
            reservation.status = status
            
            # Update timestamps
            await self._update_status_timestamps(reservation, status)
            
            if status == ReservationStatus.CANCELLED:
                reservation.cancellation_reason = reason
                
            reservation.updated_at = datetime.now()
            reservation.version += 1
            
            # Save changes
            await self._save_reservation(reservation)
            
            # Handle status-specific actions
            if status == ReservationStatus.ARRIVED:
                # Check if should be added to queue or seated directly
                if reservation.assigned_tables:
                    await self._seat_reservation(reservation)
                else:
                    await self._add_to_queue(reservation)
                    
            elif status == ReservationStatus.NO_SHOW:
                # Track no-show for customer
                await self._track_no_show(reservation)
                
            # Publish event
            await self.event_bus.publish("reservation.status_changed", {
                "reservation_id": str(reservation.id),
                "store_id": reservation.store_id,
                "old_status": old_status,
                "new_status": status.value,
                "reason": reason
            })
            
            logger.info(f"Updated reservation {reservation_id} status from {old_status} to {status}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating reservation status: {e}")
            raise
            
    async def get_reservation(self, reservation_id: str) -> Optional[Reservation]:
        """Get a reservation by ID"""
        return await self._get_reservation(reservation_id)
        
    async def get_reservations_by_date(
        self,
        store_id: str,
        date_filter: date,
        status_filter: Optional[ReservationStatus] = None
    ) -> List[Reservation]:
        """Get reservations for a specific date"""
        try:
            query = {
                "store_id": store_id,
                "reservation_date": date_filter.isoformat()
            }
            
            if status_filter:
                query["status"] = status_filter.value
                
            results = await self.db.query("reservations", query)
            
            reservations = [
                Reservation(**r) for r in results
            ]
            
            # Sort by time
            reservations.sort(key=lambda r: r.reservation_time)
            
            return reservations
            
        except Exception as e:
            logger.error(f"Error getting reservations by date: {e}")
            return []
            
    async def get_upcoming_reservations(
        self,
        store_id: str,
        hours_ahead: int = 24
    ) -> List[Reservation]:
        """Get upcoming reservations within specified hours"""
        try:
            now = datetime.now()
            end_time = now + timedelta(hours=hours_ahead)
            
            query = {
                "store_id": store_id,
                "status": {"$in": [ReservationStatus.CONFIRMED.value, ReservationStatus.PENDING.value]},
                "reservation_datetime": {
                    "$gte": now.isoformat(),
                    "$lte": end_time.isoformat()
                }
            }
            
            results = await self.db.query("reservations", query)
            
            reservations = [
                Reservation(**r) for r in results
            ]
            
            # Sort by datetime
            reservations.sort(key=lambda r: r.reservation_datetime)
            
            return reservations
            
        except Exception as e:
            logger.error(f"Error getting upcoming reservations: {e}")
            return []
            
    async def check_availability(
        self,
        store_id: str,
        check_date: date,
        party_size: int
    ) -> ReservationAvailability:
        """Check availability for a date"""
        try:
            settings = await self._get_settings(store_id)
            
            # Get operating hours for the day
            day_name = check_date.strftime("%A").lower()
            operating_hours = settings.operating_hours.get(day_name)
            
            if not operating_hours:
                return ReservationAvailability(
                    date=check_date,
                    slots=[],
                    fully_booked=True,
                    restrictions={"reason": "Closed on this day"}
                )
                
            # Generate time slots
            slots = await self._generate_time_slots(
                store_id,
                check_date,
                operating_hours,
                settings.slot_duration_minutes,
                party_size
            )
            
            # Check if fully booked
            available_slots = [s for s in slots if s.is_available]
            fully_booked = len(available_slots) == 0
            
            return ReservationAvailability(
                date=check_date,
                slots=slots,
                fully_booked=fully_booked
            )
            
        except Exception as e:
            logger.error(f"Error checking availability: {e}")
            raise
            
    async def find_table_for_reservation(
        self,
        reservation_id: str
    ) -> Optional[TableAllocation]:
        """Find best table allocation for a reservation"""
        try:
            reservation = await self._get_reservation(reservation_id)
            if not reservation:
                return None
                
            return await self._find_best_tables(
                reservation.store_id,
                reservation.reservation_datetime,
                reservation.party_size,
                reservation.table_preferences or []
            )
            
        except Exception as e:
            logger.error(f"Error finding table for reservation: {e}")
            return None
            
    async def assign_tables(
        self,
        reservation_id: str,
        table_ids: List[str]
    ) -> bool:
        """Manually assign tables to a reservation"""
        try:
            reservation = await self._get_reservation(reservation_id)
            if not reservation:
                return False
                
            # Validate tables are available
            for table_id in table_ids:
                is_available = await self._is_table_available(
                    reservation.store_id,
                    table_id,
                    reservation.reservation_datetime,
                    reservation.duration_minutes
                )
                if not is_available:
                    raise ConflictException(f"Table {table_id} is not available")
                    
            # Assign tables
            reservation.assigned_tables = [UUID(tid) for tid in table_ids]
            reservation.updated_at = datetime.now()
            reservation.version += 1
            
            await self._save_reservation(reservation)
            
            # Publish event
            await self.event_bus.publish("reservation.tables_assigned", {
                "reservation_id": str(reservation.id),
                "table_ids": table_ids
            })
            
            logger.info(f"Assigned tables {table_ids} to reservation {reservation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error assigning tables: {e}")
            raise
            
    async def get_statistics(
        self,
        store_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> ReservationStatistics:
        """Get reservation statistics"""
        try:
            if not start_date:
                start_date = date.today() - timedelta(days=30)
            if not end_date:
                end_date = date.today()
                
            query = {
                "store_id": store_id,
                "reservation_date": {
                    "$gte": start_date.isoformat(),
                    "$lte": end_date.isoformat()
                }
            }
            
            results = await self.db.query("reservations", query)
            
            # Calculate statistics
            total = len(results)
            confirmed = sum(1 for r in results if r["status"] == ReservationStatus.CONFIRMED.value)
            pending = sum(1 for r in results if r["status"] == ReservationStatus.PENDING.value)
            no_shows = sum(1 for r in results if r["status"] == ReservationStatus.NO_SHOW.value)
            cancelled = sum(1 for r in results if r["status"] == ReservationStatus.CANCELLED.value)
            
            # Calculate rates
            no_show_rate = (no_shows / total * 100) if total > 0 else 0
            cancellation_rate = (cancelled / total * 100) if total > 0 else 0
            confirmation_rate = (confirmed / total * 100) if total > 0 else 0
            
            # Period counts
            today_count = sum(1 for r in results if r["reservation_date"] == date.today().isoformat())
            
            week_start = date.today() - timedelta(days=date.today().weekday())
            this_week = sum(1 for r in results if r["reservation_date"] >= week_start.isoformat())
            
            month_start = date.today().replace(day=1)
            this_month = sum(1 for r in results if r["reservation_date"] >= month_start.isoformat())
            
            # Averages
            party_sizes = [r["party_size"] for r in results]
            avg_party_size = sum(party_sizes) / len(party_sizes) if party_sizes else 0
            
            durations = [r.get("duration_minutes", 120) for r in results]
            avg_duration = sum(durations) / len(durations) if durations else 0
            
            # Peak analysis
            hour_counts: Dict[int, int] = defaultdict(int)
            day_counts: Dict[str, int] = defaultdict(int)
            
            for r in results:
                res_time = time.fromisoformat(r["reservation_time"])
                hour_counts[res_time.hour] += 1
                
                res_date = date.fromisoformat(r["reservation_date"])
                day_name = res_date.strftime("%A")
                day_counts[day_name] += 1
                
            peak_hours = sorted(hour_counts.keys(), key=lambda h: hour_counts[h], reverse=True)[:3]
            popular_days = sorted(day_counts.keys(), key=lambda d: day_counts[d], reverse=True)[:3]
            
            # Financial
            total_deposits = sum(r.get("deposit_amount", 0) for r in results if r.get("deposit_paid"))
            pending_deposits = sum(r.get("deposit_amount", 0) for r in results if not r.get("deposit_paid") and r.get("deposit_amount"))
            refunded_deposits = sum(r.get("deposit_amount", 0) for r in results if r.get("deposit_refunded"))
            
            return ReservationStatistics(
                total_reservations=total,
                confirmed=confirmed,
                pending=pending,
                no_shows=no_shows,
                cancelled=cancelled,
                no_show_rate=no_show_rate,
                cancellation_rate=cancellation_rate,
                confirmation_rate=confirmation_rate,
                today=today_count,
                this_week=this_week,
                this_month=this_month,
                average_party_size=avg_party_size,
                average_duration_minutes=avg_duration,
                peak_hours=peak_hours,
                popular_days=popular_days,
                total_deposits=total_deposits,
                pending_deposits=pending_deposits,
                refunded_deposits=refunded_deposits
            )
            
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            raise
            
    async def process_no_shows(self, store_id: str) -> int:
        """Process no-shows for past reservations"""
        try:
            settings = await self._get_settings(store_id)
            cutoff_time = datetime.now() - timedelta(minutes=settings.no_show_grace_minutes)
            
            query = {
                "store_id": store_id,
                "status": ReservationStatus.CONFIRMED.value,
                "reservation_datetime": {"$lt": cutoff_time.isoformat()}
            }
            
            results = await self.db.query("reservations", query)
            
            no_show_count = 0
            for r in results:
                reservation = Reservation(**r)
                await self.update_status(str(reservation.id), ReservationStatus.NO_SHOW)
                no_show_count += 1
                
            logger.info(f"Processed {no_show_count} no-shows for store {store_id}")
            return no_show_count
            
        except Exception as e:
            logger.error(f"Error processing no-shows: {e}")
            return 0
            
    # Private helper methods
    
    async def _get_reservation(self, reservation_id: str) -> Optional[Reservation]:
        """Get reservation from database"""
        try:
            result = await self.db.get("reservations", reservation_id)
            if result:
                return Reservation(**result)
            return None
        except Exception as e:
            logger.error(f"Error getting reservation: {e}")
            return None
            
    async def _save_reservation(self, reservation: Reservation) -> None:
        """Save reservation to database"""
        await self.db.upsert(
            "reservations",
            str(reservation.id),
            reservation.dict()
        )
        
    async def _get_settings(self, store_id: str) -> ReservationSettings:
        """Get reservation settings for store"""
        if store_id in self.settings_cache:
            return self.settings_cache[store_id]
            
        result = await self.db.get("reservation_settings", store_id)
        if result:
            settings = ReservationSettings(**result)
        else:
            settings = ReservationSettings()
            
        self.settings_cache[store_id] = settings
        return settings
        
    async def _check_availability(
        self,
        store_id: str,
        res_date: date,
        res_time: time,
        duration: int,
        party_size: int,
        exclude_reservation_id: Optional[str] = None
    ) -> bool:
        """Check if time slot is available"""
        try:
            # Get all tables
            layout = await self.table_service.get_active_layout("", store_id)
            if not layout:
                return False
                
            total_tables = len(layout.tables)
            
            # Get existing reservations for the time slot
            start_datetime = datetime.combine(res_date, res_time)
            end_datetime = start_datetime + timedelta(minutes=duration)
            
            query = {
                "store_id": store_id,
                "reservation_date": res_date.isoformat(),
                "status": {"$in": [ReservationStatus.CONFIRMED.value, ReservationStatus.PENDING.value]}
            }
            
            if exclude_reservation_id:
                query["id"] = {"$ne": exclude_reservation_id}
                
            results = await self.db.query("reservations", query)
            
            # Check for overlapping reservations
            tables_in_use: set[str] = set()
            for r in results:
                res = Reservation(**r)
                res_start = res.reservation_datetime
                res_end = res_start + timedelta(minutes=res.duration_minutes)
                
                # Check if times overlap
                if res_start < end_datetime and res_end > start_datetime:
                    tables_in_use.update(str(tid) for tid in res.assigned_tables)
                    
            # Check if enough tables available
            available_tables = total_tables - len(tables_in_use)
            
            # Estimate tables needed (rough calculation)
            tables_needed = max(1, party_size // 4)  # Assume 4 people per table
            
            return available_tables >= tables_needed
            
        except Exception as e:
            logger.error(f"Error checking availability: {e}")
            return False
            
    async def _find_best_tables(
        self,
        store_id: str,
        datetime_val: datetime,
        party_size: int,
        preferences: List[TablePreference]
    ) -> Optional[TableAllocation]:
        """Find optimal table allocation"""
        try:
            # Get available tables
            layout = await self.table_service.get_active_layout("", store_id)
            if not layout:
                return None
                
            # Filter by availability and capacity
            available_tables: List[Dict[str, Any]] = []
            for table in layout.tables:
                table_dict = table if isinstance(table, dict) else table.dict()
                if await self._is_table_available(store_id, table_dict["id"], datetime_val, 120):
                    if table_dict.get("capacity", 4) >= party_size or len(available_tables) > 0:
                        available_tables.append(table_dict)
                        
            if not available_tables:
                return None
                
            # Score tables based on preferences
            scored_tables = []
            for table_dict in available_tables:
                score = 0.5  # Base score
                reasons = []
                
                # Check preferences
                for pref in preferences:
                    if pref == TablePreference.WINDOW and table_dict.get("is_window"):
                        score += 0.2
                        reasons.append("Window seat")
                    elif pref == TablePreference.QUIET and table_dict.get("is_quiet"):
                        score += 0.2
                        reasons.append("Quiet area")
                    elif pref == TablePreference.OUTDOOR and table_dict.get("is_outdoor"):
                        score += 0.2
                        reasons.append("Outdoor seating")
                        
                # Capacity match
                if table_dict.get("capacity", 4) == party_size:
                    score += 0.3
                    reasons.append("Perfect size match")
                elif table_dict.get("capacity", 4) == party_size + 1:
                    score += 0.1
                    reasons.append("Good size match")
                    
                scored_tables.append((table_dict, score, reasons))
                
            # Sort by score
            scored_tables.sort(key=lambda x: x[1], reverse=True)
            
            # Select best table(s)
            selected_tables = []
            selected_ids = []
            selected_numbers = []
            total_capacity = 0
            
            for table_dict, score, reasons in scored_tables:
                selected_tables.append(table_dict)
                selected_ids.append(UUID(table_dict["id"]))
                selected_numbers.append(table_dict.get("number", 0))
                total_capacity += table_dict.get("capacity", 4)
                
                if total_capacity >= party_size:
                    break
                    
            if total_capacity < party_size:
                return None
                
            return TableAllocation(
                reservation_id=UUID(str(uuid4())),  # Temporary ID
                table_ids=selected_ids,
                table_numbers=selected_numbers,
                combined=len(selected_tables) > 1,
                score=scored_tables[0][1] if scored_tables else 0,
                reasons=scored_tables[0][2] if scored_tables else []
            )
            
        except Exception as e:
            logger.error(f"Error finding best tables: {e}")
            return None
            
    async def _is_table_available(
        self,
        store_id: str,
        table_id: str,
        datetime_val: datetime,
        duration: int
    ) -> bool:
        """Check if specific table is available"""
        try:
            # Check current status
            # Get table from layout (table_service doesn't have get_table_by_id)
            layout = await self.table_service.get_active_layout("", store_id)
            table = None
            if layout:
                for t in layout.tables:
                    table_dict = t if isinstance(t, dict) else t.dict()
                    if table_dict["id"] == table_id:
                        table = table_dict
                        break
            
            if table and table.get("status") != "AVAILABLE":
                # Only check if it's for current time
                if datetime_val <= datetime.now() + timedelta(minutes=30):
                    return False
                    
            # Check reservations
            query = {
                "store_id": store_id,
                "assigned_tables": {"$contains": table_id},
                "status": {"$in": [ReservationStatus.CONFIRMED.value, ReservationStatus.PENDING.value]},
                "reservation_date": datetime_val.date().isoformat()
            }
            
            results = await self.db.query("reservations", query)
            
            end_time = datetime_val + timedelta(minutes=duration)
            
            for r in results:
                res = Reservation(**r)
                res_start = res.reservation_datetime
                res_end = res_start + timedelta(minutes=res.duration_minutes)
                
                # Check if times overlap
                if res_start < end_time and res_end > datetime_val:
                    return False
                    
            return True
            
        except Exception as e:
            logger.error(f"Error checking table availability: {e}")
            return False
            
    async def _generate_time_slots(
        self,
        store_id: str,
        slot_date: date,
        operating_hours: Dict[str, str],
        slot_duration: int,
        party_size: int
    ) -> List[ReservationSlot]:
        """Generate available time slots"""
        slots = []
        
        try:
            open_time = time.fromisoformat(operating_hours["open"])
            close_time = time.fromisoformat(operating_hours["close"])
            
            current_time = datetime.combine(slot_date, open_time)
            end_time = datetime.combine(slot_date, close_time)
            
            # Handle next day closing (e.g., 00:00)
            if close_time <= open_time:
                end_time += timedelta(days=1)
                
            while current_time < end_time:
                slot_time = current_time.time()
                
                # Check availability for this slot
                is_available = await self._check_availability(
                    store_id,
                    slot_date,
                    slot_time,
                    120,  # Default duration
                    party_size
                )
                
                # Get table counts
                layout = await self.table_service.get_active_layout("", store_id)
                total_tables = len(layout.tables) if layout else 0
                
                # Count available tables for this slot
                available_count = total_tables  # Simplified - should check actual availability
                
                slot = ReservationSlot(
                    date=slot_date,
                    time=slot_time,
                    available_tables=available_count if is_available else 0,
                    total_tables=total_tables,
                    is_available=is_available,
                    min_party_size=1,
                    max_party_size=20
                )
                
                slots.append(slot)
                current_time += timedelta(minutes=slot_duration)
                
        except Exception as e:
            logger.error(f"Error generating time slots: {e}")
            
        return slots
        
    def _generate_confirmation_code(self) -> str:
        """Generate unique confirmation code"""
        import random
        import string
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
    async def _update_status_timestamps(
        self,
        reservation: Reservation,
        new_status: ReservationStatus
    ) -> None:
        """Update status-related timestamps"""
        now = datetime.now()
        
        if new_status == ReservationStatus.CONFIRMED:
            reservation.confirmed_at = now
        elif new_status == ReservationStatus.ARRIVED:
            reservation.arrived_at = now
        elif new_status == ReservationStatus.SEATED:
            reservation.seated_at = now
        elif new_status == ReservationStatus.COMPLETED:
            reservation.completed_at = now
        elif new_status == ReservationStatus.CANCELLED:
            reservation.cancelled_at = now
            
    async def _create_recurring_reservations(
        self,
        parent: Reservation,
        recurrence: RecurrenceType,
        end_date: date
    ) -> None:
        """Create recurring reservation instances"""
        try:
            current_date = parent.reservation_date
            
            while current_date <= end_date:
                # Calculate next date
                if recurrence == RecurrenceType.DAILY:
                    current_date += timedelta(days=1)
                elif recurrence == RecurrenceType.WEEKLY:
                    current_date += timedelta(weeks=1)
                elif recurrence == RecurrenceType.MONTHLY:
                    # Add one month (handle month boundaries)
                    if current_date.month == 12:
                        current_date = current_date.replace(year=current_date.year + 1, month=1)
                    else:
                        current_date = current_date.replace(month=current_date.month + 1)
                else:
                    break
                    
                if current_date > end_date:
                    break
                    
                # Create child reservation
                child = Reservation(
                    **parent.dict(exclude={"id", "reservation_date", "created_at", "updated_at"})
                )
                child.id = UUID(str(uuid4()))
                child.reservation_date = current_date
                child.recurrence_parent_id = parent.id
                child.created_at = datetime.now()
                child.updated_at = datetime.now()
                
                await self._save_reservation(child)
                
        except Exception as e:
            logger.error(f"Error creating recurring reservations: {e}")
            
    async def _send_confirmation(self, reservation: Reservation) -> None:
        """Send reservation confirmation"""
        try:
            # This would integrate with notification service
            logger.info(f"Sending confirmation for reservation {reservation.id}")
            
            # Mark as sent
            reservation.notification_sent = True
            reservation.notification_sent_at = datetime.now()
            await self._save_reservation(reservation)
            
        except Exception as e:
            logger.error(f"Error sending confirmation: {e}")
            
    async def _seat_reservation(self, reservation: Reservation) -> None:
        """Seat a reservation with assigned tables"""
        try:
            # Update table status
            from src.waiter.models.table_layout_models import TableStatus
            for table_id in reservation.assigned_tables:
                await self.table_service.update_table_status(
                    "",  # layout_id not needed for this operation
                    str(table_id),
                    TableStatus.OCCUPIED,
                    order_id=None,
                    waiter_id=None
                )
                
            # Update reservation status
            reservation.status = ReservationStatus.SEATED
            reservation.seated_at = datetime.now()
            await self._save_reservation(reservation)
            
            logger.info(f"Seated reservation {reservation.id} at tables {reservation.assigned_tables}")
            
        except Exception as e:
            logger.error(f"Error seating reservation: {e}")
            
    async def _add_to_queue(self, reservation: Reservation) -> None:
        """Add reservation to queue if no tables assigned"""
        try:
            # Create queue entry from reservation
            from src.queue.models.queue_models import QueueEntryCreate, NotificationMethod
            
            entry = QueueEntryCreate(
                customer_name=reservation.customer_name,
                customer_phone=reservation.customer_phone,
                party_size=reservation.party_size,
                notification_method=NotificationMethod.SMS,
                notes=f"Reservation {reservation.confirmation_code}",
                customer_id=reservation.customer_id if reservation.customer_id else None
            )
            
            queue_entry = await self.queue_service.add_to_queue(
                entry,
                store_id=reservation.store_id,
                user_id=str(reservation.customer_id) if reservation.customer_id else "system",
                terminal_id="reservation-system"
            )
            
            # Link queue entry to reservation
            reservation.queue_entry_id = UUID(str(uuid4()))  # Would get actual ID from queue service
            await self._save_reservation(reservation)
            
            logger.info(f"Added reservation {reservation.id} to queue")
            
        except Exception as e:
            logger.error(f"Error adding to queue: {e}")
            
    async def _track_no_show(self, reservation: Reservation) -> None:
        """Track customer no-show for blacklisting"""
        try:
            if reservation.customer_id:
                # Track no-show count for customer
                # This would integrate with customer service
                logger.info(f"Tracking no-show for customer {reservation.customer_id}")
                
        except Exception as e:
            logger.error(f"Error tracking no-show: {e}")