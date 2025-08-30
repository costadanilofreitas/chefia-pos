"""
Reservation Router
API endpoints for managing table reservations
"""

from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query
from src.auth.auth import get_current_user
from src.core.events.event_bus import get_event_bus
from src.core.exceptions import BusinessException, ConflictException
from src.core.database.db_service import get_db_service
from src.queue.services.queue_service import QueueService
from src.reservation.models.reservation_models import (
    BlockedSlot,
    Reservation,
    ReservationAvailability,
    ReservationCreate,
    ReservationSettings,
    ReservationStatistics,
    ReservationStatus,
    ReservationUpdate,
    TableAllocation,
)
from src.reservation.services.reservation_service import ReservationService
from src.waiter.services.table_layout_service import TableLayoutService

router = APIRouter(
    prefix="/api/v1/reservations",
    tags=["reservations"]
)


def get_reservation_service():
    """Dependency to get reservation service"""
    db_service = get_db_service()
    table_service = TableLayoutService(db_service)
    queue_service = QueueService(db_service, get_event_bus())
    event_bus = get_event_bus()
    return ReservationService(db_service, table_service, queue_service, event_bus)


# Reservation CRUD operations

@router.post("/", response_model=Reservation)
async def create_reservation(
    data: ReservationCreate,
    store_id: str = Query(..., description="Store ID"),
    service: ReservationService = Depends(get_reservation_service),
    current_user: dict = Depends(get_current_user)
):
    """Create a new reservation"""
    try:
        reservation = await service.create_reservation(store_id, data)
        return reservation
    except BusinessException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating reservation: {str(e)}")


@router.get("/{reservation_id}", response_model=Reservation)
async def get_reservation(
    reservation_id: str = Path(..., description="Reservation ID"),
    service: ReservationService = Depends(get_reservation_service),
    current_user: dict = Depends(get_current_user)
):
    """Get a reservation by ID"""
    reservation = await service.get_reservation(reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return reservation


@router.put("/{reservation_id}", response_model=Reservation)
async def update_reservation(
    reservation_id: str = Path(..., description="Reservation ID"),
    data: ReservationUpdate = Body(...),
    service: ReservationService = Depends(get_reservation_service),
    current_user: dict = Depends(get_current_user)
):
    """Update a reservation"""
    try:
        reservation = await service.update_reservation(reservation_id, data)
        if not reservation:
            raise HTTPException(status_code=404, detail="Reservation not found")
        return reservation
    except BusinessException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating reservation: {str(e)}")


@router.patch("/{reservation_id}/status")
async def update_reservation_status(
    reservation_id: str = Path(..., description="Reservation ID"),
    status: ReservationStatus = Body(..., description="New status"),
    reason: Optional[str] = Body(None, description="Reason for status change"),
    service: ReservationService = Depends(get_reservation_service),
    current_user: dict = Depends(get_current_user)
):
    """Update reservation status"""
    try:
        success = await service.update_status(reservation_id, status, reason)
        if not success:
            raise HTTPException(status_code=404, detail="Reservation not found")
        return {"success": True, "message": f"Status updated to {status.value}"}
    except BusinessException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating status: {str(e)}")


@router.delete("/{reservation_id}")
async def cancel_reservation(
    reservation_id: str = Path(..., description="Reservation ID"),
    reason: Optional[str] = Query(None, description="Cancellation reason"),
    service: ReservationService = Depends(get_reservation_service),
    current_user: dict = Depends(get_current_user)
):
    """Cancel a reservation"""
    try:
        success = await service.update_status(
            reservation_id,
            ReservationStatus.CANCELLED,
            reason
        )
        if not success:
            raise HTTPException(status_code=404, detail="Reservation not found")
        return {"success": True, "message": "Reservation cancelled"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cancelling reservation: {str(e)}")


# Query endpoints

@router.get("/", response_model=List[Reservation])
async def get_reservations(
    store_id: str = Query(..., description="Store ID"),
    date_filter: Optional[date] = Query(None, description="Filter by date"),
    status: Optional[ReservationStatus] = Query(None, description="Filter by status"),
    service: ReservationService = Depends(get_reservation_service),
    current_user: dict = Depends(get_current_user)
):
    """Get reservations with optional filters"""
    if date_filter:
        reservations = await service.get_reservations_by_date(
            store_id, date_filter, status
        )
    else:
        # Get today's reservations by default
        reservations = await service.get_reservations_by_date(
            store_id, date.today(), status
        )
    return reservations


@router.get("/upcoming", response_model=List[Reservation])
async def get_upcoming_reservations(
    store_id: str = Query(..., description="Store ID"),
    hours: int = Query(24, description="Hours to look ahead", ge=1, le=168),
    service: ReservationService = Depends(get_reservation_service),
    current_user: dict = Depends(get_current_user)
):
    """Get upcoming reservations within specified hours"""
    reservations = await service.get_upcoming_reservations(store_id, hours)
    return reservations


@router.get("/by-customer/{customer_id}", response_model=List[Reservation])
async def get_customer_reservations(
    customer_id: str = Path(..., description="Customer ID"),
    store_id: str = Query(..., description="Store ID"),
    include_past: bool = Query(False, description="Include past reservations"),
    service: ReservationService = Depends(get_reservation_service),
    current_user: dict = Depends(get_current_user)
):
    """Get reservations for a specific customer"""
    # This would be implemented in the service
    raise HTTPException(status_code=501, detail="Not implemented yet")


# Availability checking

@router.get("/availability", response_model=ReservationAvailability)
async def check_availability(
    store_id: str = Query(..., description="Store ID"),
    check_date: date = Query(..., description="Date to check"),
    party_size: int = Query(..., description="Party size", ge=1, le=20),
    service: ReservationService = Depends(get_reservation_service)
):
    """Check availability for a specific date and party size"""
    try:
        availability = await service.check_availability(
            store_id, check_date, party_size
        )
        return availability
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking availability: {str(e)}")


@router.get("/availability/week")
async def check_week_availability(
    store_id: str = Query(..., description="Store ID"),
    start_date: date = Query(..., description="Start date"),
    party_size: int = Query(..., description="Party size", ge=1, le=20),
    service: ReservationService = Depends(get_reservation_service)
):
    """Check availability for a week"""
    try:
        availability = []
        for i in range(7):
            check_date = start_date + timedelta(days=i)
            day_availability = await service.check_availability(
                store_id, check_date, party_size
            )
            availability.append(day_availability)
        return availability
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking availability: {str(e)}")


# Table management

@router.get("/{reservation_id}/tables", response_model=TableAllocation)
async def find_tables_for_reservation(
    reservation_id: str = Path(..., description="Reservation ID"),
    service: ReservationService = Depends(get_reservation_service),
    current_user: dict = Depends(get_current_user)
):
    """Find optimal table allocation for a reservation"""
    allocation = await service.find_table_for_reservation(reservation_id)
    if not allocation:
        raise HTTPException(status_code=404, detail="No suitable tables found")
    return allocation


@router.post("/{reservation_id}/tables")
async def assign_tables(
    reservation_id: str = Path(..., description="Reservation ID"),
    table_ids: List[str] = Body(..., description="Table IDs to assign"),
    service: ReservationService = Depends(get_reservation_service),
    current_user: dict = Depends(get_current_user)
):
    """Manually assign tables to a reservation"""
    try:
        success = await service.assign_tables(reservation_id, table_ids)
        if not success:
            raise HTTPException(status_code=404, detail="Reservation not found")
        return {"success": True, "message": "Tables assigned successfully"}
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error assigning tables: {str(e)}")


# Guest actions

@router.post("/{reservation_id}/confirm")
async def confirm_reservation(
    reservation_id: str = Path(..., description="Reservation ID"),
    confirmation_code: str = Body(..., description="Confirmation code"),
    service: ReservationService = Depends(get_reservation_service)
):
    """Confirm a reservation with confirmation code"""
    reservation = await service.get_reservation(reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if reservation.confirmation_code != confirmation_code:
        raise HTTPException(status_code=400, detail="Invalid confirmation code")

    success = await service.update_status(reservation_id, ReservationStatus.CONFIRMED)
    if success:
        return {"success": True, "message": "Reservation confirmed"}
    else:
        raise HTTPException(status_code=500, detail="Error confirming reservation")


@router.post("/{reservation_id}/check-in")
async def check_in_reservation(
    reservation_id: str = Path(..., description="Reservation ID"),
    confirmation_code: str = Body(..., description="Confirmation code"),
    service: ReservationService = Depends(get_reservation_service),
    current_user: dict = Depends(get_current_user)
):
    """Check in for a reservation"""
    reservation = await service.get_reservation(reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if reservation.confirmation_code != confirmation_code:
        raise HTTPException(status_code=400, detail="Invalid confirmation code")

    # Check if within acceptable time window (e.g., 30 minutes before)
    now = datetime.now()
    if reservation.reservation_datetime > now + timedelta(minutes=30):
        raise HTTPException(status_code=400, detail="Too early to check in")

    success = await service.update_status(reservation_id, ReservationStatus.ARRIVED)
    if success:
        return {"success": True, "message": "Checked in successfully"}
    else:
        raise HTTPException(status_code=500, detail="Error checking in")


# Statistics and reporting

@router.get("/statistics", response_model=ReservationStatistics)
async def get_reservation_statistics(
    store_id: str = Query(..., description="Store ID"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    service: ReservationService = Depends(get_reservation_service),
    current_user: dict = Depends(get_current_user)
):
    """Get reservation statistics"""
    try:
        stats = await service.get_statistics(store_id, start_date, end_date)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting statistics: {str(e)}")


# Batch operations

@router.post("/process-no-shows")
async def process_no_shows(
    store_id: str = Query(..., description="Store ID"),
    service: ReservationService = Depends(get_reservation_service),
    current_user: dict = Depends(get_current_user)
):
    """Process no-shows for past reservations"""
    try:
        count = await service.process_no_shows(store_id)
        return {"success": True, "processed": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing no-shows: {str(e)}")


# Settings management

@router.get("/settings", response_model=ReservationSettings)
async def get_reservation_settings(
    store_id: str = Query(..., description="Store ID"),
    service: ReservationService = Depends(get_reservation_service),
    current_user: dict = Depends(get_current_user)
):
    """Get reservation settings for a store"""
    settings = await service._get_settings(store_id)
    return settings


@router.put("/settings", response_model=ReservationSettings)
async def update_reservation_settings(
    store_id: str = Query(..., description="Store ID"),
    settings: ReservationSettings = Body(...),
    service: ReservationService = Depends(get_reservation_service),
    current_user: dict = Depends(get_current_user)
):
    """Update reservation settings for a store"""
    # This would save settings to database
    raise HTTPException(status_code=501, detail="Not implemented yet")


# Blocked slots management

@router.post("/blocked-slots", response_model=BlockedSlot)
async def create_blocked_slot(
    data: BlockedSlot = Body(...),
    service: ReservationService = Depends(get_reservation_service),
    current_user: dict = Depends(get_current_user)
):
    """Block a time slot for reservations"""
    # This would create a blocked slot in database
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.delete("/blocked-slots/{slot_id}")
async def delete_blocked_slot(
    slot_id: str = Path(..., description="Blocked slot ID"),
    service: ReservationService = Depends(get_reservation_service),
    current_user: dict = Depends(get_current_user)
):
    """Remove a blocked time slot"""
    # This would delete blocked slot from database
    raise HTTPException(status_code=501, detail="Not implemented yet")
