# /home/ubuntu/pos-modern/src/kiosk/events/kiosk_events.py

from src.core.events.event_bus import EventType, Event
from typing import Any, Dict

# Kiosk event type constants
KIOSK_CONFIG_CREATED = "kiosk_config_created"
KIOSK_CONFIG_UPDATED = "kiosk_config_updated"
KIOSK_CONFIG_DELETED = "kiosk_config_deleted"
KIOSK_SESSION_STARTED = "kiosk_session_started"
KIOSK_SESSION_UPDATED = "kiosk_session_updated"
KIOSK_SESSION_ENDED = "kiosk_session_ended"
KIOSK_ORDER_CREATED = "kiosk_order_created"

def create_kiosk_event(event_subtype: str, data: Dict[str, Any], metadata: Dict[str, Any] = None) -> Event:
    """Helper function to create kiosk events."""
    if metadata is None:
        metadata = {}
    
    # Add kiosk-specific metadata
    metadata["source"] = "kiosk"
    metadata["event_subtype"] = event_subtype
    
    # Use SYSTEM_CONFIG_CHANGED as the base event type
    return Event(
        event_type=EventType.SYSTEM_CONFIG_CHANGED,
        data=data,
        metadata=metadata
    )