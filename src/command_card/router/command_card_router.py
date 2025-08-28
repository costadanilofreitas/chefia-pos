"""
Command Card Router
API endpoints for managing command cards and sessions
"""

from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status
from src.auth.auth import get_current_user
from src.command_card.models.command_card_models import (
    CommandCard,
    CommandCardCreate,
    CommandCardStatus,
    CommandCardUpdate,
    CommandConfiguration,
    CommandItem,
    CommandSession,
    CommandSessionCreate,
    CommandSessionUpdate,
    CommandStatistics,
    CommandTransfer,
)
from src.command_card.services.command_card_service import CommandCardService
from src.core.event_bus import get_event_bus
from src.core.exceptions import BusinessException, ConflictException
from src.database.db_service import get_db_service

router = APIRouter(
    prefix="/api/v1/command-cards",
    tags=["command-cards"]
)


def get_command_card_service():
    """Dependency to get command card service"""
    db_service = get_db_service()
    event_bus = get_event_bus()
    return CommandCardService(db_service, event_bus)


# Command Card Management

@router.post("/cards", response_model=CommandCard)
async def create_command_card(
    data: CommandCardCreate,
    store_id: str = Query(..., description="Store ID"),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Create a new command card"""
    try:
        card = await service.create_card(store_id, data, current_user["id"])
        return card
    except ConflictException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating card: {str(e)}"
        )


@router.get("/cards", response_model=List[CommandCard])
async def list_command_cards(
    store_id: str = Query(..., description="Store ID"),
    status_filter: Optional[CommandCardStatus] = Query(None, description="Filter by status"),
    available_only: bool = Query(False, description="Only show available cards"),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """List command cards with optional filters"""
    cards = await service.list_cards(store_id, status_filter, available_only)
    return cards


@router.get("/cards/by-number/{card_number}", response_model=CommandCard)
async def get_card_by_number(
    card_number: str = Path(..., description="Card number"),
    store_id: str = Query(..., description="Store ID"),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Get command card by number"""
    card = await service.get_card_by_number(store_id, card_number)
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    return card


@router.get("/cards/{card_id}", response_model=CommandCard)
async def get_command_card(
    card_id: str = Path(..., description="Card ID"),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Get command card by ID"""
    card = await service.get_card(card_id)
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    return card


@router.put("/cards/{card_id}", response_model=CommandCard)
async def update_command_card(
    card_id: str = Path(..., description="Card ID"),
    data: CommandCardUpdate = Body(...),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Update command card"""
    try:
        card = await service.update_card(card_id, data)
        if not card:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
        return card
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating card: {str(e)}"
        )


@router.post("/cards/{card_id}/mark-lost")
async def mark_card_lost(
    card_id: str = Path(..., description="Card ID"),
    reason: Optional[str] = Body(None, description="Reason for marking as lost"),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Mark a card as lost"""
    success = await service.mark_card_lost(card_id, reason)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    return {"success": True, "message": "Card marked as lost"}


# Session Management

@router.post("/sessions", response_model=CommandSession)
async def start_session(
    data: CommandSessionCreate,
    store_id: str = Query(..., description="Store ID"),
    terminal_id: str = Query(..., description="Terminal ID"),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Start a new command session"""
    try:
        session = await service.start_session(store_id, terminal_id, data)
        return session
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting session: {str(e)}"
        )


@router.get("/sessions/{session_id}", response_model=CommandSession)
async def get_session(
    session_id: str = Path(..., description="Session ID"),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Get command session by ID"""
    session = await service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


@router.get("/cards/{card_id}/active-session", response_model=CommandSession)
async def get_active_session(
    card_id: str = Path(..., description="Card ID"),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Get active session for a card"""
    session = await service.get_active_session_by_card(card_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active session found")
    return session


@router.put("/sessions/{session_id}", response_model=CommandSession)
async def update_session(
    session_id: str = Path(..., description="Session ID"),
    data: CommandSessionUpdate = Body(...),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Update command session"""
    try:
        session = await service.update_session(session_id, data)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        return session
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating session: {str(e)}"
        )


@router.post("/sessions/{session_id}/close")
async def close_session(
    session_id: str = Path(..., description="Session ID"),
    reason: Optional[str] = Body(None, description="Close reason"),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Close command session (ready for payment)"""
    try:
        success = await service.close_session(session_id, reason)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        return {"success": True, "message": "Session closed successfully"}
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error closing session: {str(e)}"
        )


# Item Management

@router.post("/sessions/{session_id}/items", response_model=CommandItem)
async def add_item_to_session(
    session_id: str = Path(..., description="Session ID"),
    product_id: str = Body(..., description="Product ID"),
    quantity: int = Body(..., description="Quantity", ge=1),
    unit_price: float = Body(..., description="Unit price", ge=0),
    terminal_id: str = Query(..., description="Terminal ID"),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Add item to command session"""
    try:
        item = await service.add_item_to_session(
            session_id, product_id, quantity, unit_price,
            current_user["id"], terminal_id
        )
        return item
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding item: {str(e)}"
        )


@router.delete("/sessions/{session_id}/items/{item_id}")
async def remove_item_from_session(
    session_id: str = Path(..., description="Session ID"),
    item_id: str = Path(..., description="Item ID"),
    reason: str = Body(..., description="Cancellation reason"),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Remove/cancel item from session"""
    try:
        success = await service.remove_item_from_session(
            session_id, item_id, reason, current_user["id"]
        )
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        return {"success": True, "message": "Item cancelled successfully"}
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error removing item: {str(e)}"
        )


# Payment

@router.post("/sessions/{session_id}/payment")
async def process_payment(
    session_id: str = Path(..., description="Session ID"),
    payment_amount: float = Body(..., description="Payment amount", ge=0),
    payment_method: str = Body(..., description="Payment method"),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Process payment for session"""
    try:
        success = await service.process_payment(session_id, payment_amount, payment_method)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        return {"success": True, "message": f"Payment of {payment_amount} processed"}
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing payment: {str(e)}"
        )


# Transfer

@router.post("/transfer", response_model=CommandTransfer)
async def transfer_session(
    from_card_id: str = Body(..., description="Source card ID"),
    to_card_id: str = Body(..., description="Target card ID"),
    transfer_all: bool = Body(True, description="Transfer all items"),
    item_ids: Optional[List[str]] = Body(None, description="Specific items to transfer"),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Transfer session between cards"""
    try:
        transfer = await service.transfer_session(
            from_card_id, to_card_id, current_user["id"],
            transfer_all, item_ids
        )
        return transfer
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error transferring session: {str(e)}"
        )


# Statistics

@router.get("/statistics", response_model=CommandStatistics)
async def get_statistics(
    store_id: str = Query(..., description="Store ID"),
    date_filter: Optional[date] = Query(None, description="Filter by date"),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Get command card statistics"""
    try:
        date_val = datetime.combine(date_filter, datetime.min.time()) if date_filter else None
        stats = await service.get_statistics(store_id, date_val)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting statistics: {str(e)}"
        )


# Configuration

@router.get("/configuration", response_model=CommandConfiguration)
async def get_configuration(
    store_id: str = Query(..., description="Store ID"),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Get command card configuration"""
    config = await service._get_config(store_id)
    return config


@router.put("/configuration", response_model=CommandConfiguration)
async def update_configuration(
    store_id: str = Query(..., description="Store ID"),
    config: CommandConfiguration = Body(...),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Update command card configuration"""
    # This would save configuration to database
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented yet")


# Scan endpoint for mobile/tablet scanning

@router.post("/scan")
async def scan_command_card(
    barcode: Optional[str] = Body(None, description="Barcode value"),
    qr_code: Optional[str] = Body(None, description="QR code value"),
    nfc_tag: Optional[str] = Body(None, description="NFC tag value"),
    store_id: str = Query(..., description="Store ID"),
    terminal_id: str = Query(..., description="Terminal ID"),
    service: CommandCardService = Depends(get_command_card_service),
    current_user: dict = Depends(get_current_user)
):
    """Scan command card and get status/session"""
    try:
        # Find card by barcode/QR/NFC
        cards = await service.list_cards(store_id)

        card = None
        for c in cards:
            if barcode and c.barcode == barcode:
                card = c
                break
            elif qr_code and c.qr_code == qr_code:
                card = c
                break
            elif nfc_tag and c.nfc_tag == nfc_tag:
                card = c
                break

        if not card:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

        # Get active session if exists
        session = None
        if card.current_session_id:
            session = await service.get_session(str(card.current_session_id))

        return {
            "card": card,
            "session": session,
            "is_available": card.is_available,
            "has_active_session": session is not None
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error scanning card: {str(e)}"
        )
