# /home/ubuntu/pos-modern/src/kiosk/events/kiosk_events.py

from enum import Enum
from src.core.events.event_bus import EventType

# Add kiosk-related event types to the global EventType enum
EventType.KIOSK_CONFIG_CREATED = "kiosk_config_created"
EventType.KIOSK_CONFIG_UPDATED = "kiosk_config_updated"
EventType.KIOSK_CONFIG_DELETED = "kiosk_config_deleted"
EventType.KIOSK_SESSION_STARTED = "kiosk_session_started"
EventType.KIOSK_SESSION_UPDATED = "kiosk_session_updated"
EventType.KIOSK_SESSION_ENDED = "kiosk_session_ended"
EventType.KIOSK_ORDER_CREATED = "kiosk_order_created"
