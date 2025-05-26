from src.core.events.event_bus import Event, EventType, get_event_bus
from src.business_day.models.business_day import BusinessDay, DayStatus
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Eventos relacionados ao dia de operação
async def publish_business_day_opened(business_day: BusinessDay) -> None:
    """Publica evento de abertura de dia de operação."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.DAY_OPENED,
        data={
            'business_day': {
                'id': business_day.id,
                'date': business_day.date,
                'opened_by': business_day.opened_by,
                'opened_at': business_day.opened_at
            },
            'timestamp': Event.timestamp,
        }
    )
    await event_bus.publish(event)
    logger.info(f"Evento de abertura de dia publicado: {business_day.id} - {business_day.date}")


async def publish_business_day_closed(business_day: BusinessDay) -> None:
    """Publica evento de fechamento de dia de operação."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.DAY_CLOSED,
        data={
            'business_day': {
                'id': business_day.id,
                'date': business_day.date,
                'closed_by': business_day.closed_by,
                'closed_at': business_day.closed_at,
                'total_sales': business_day.total_sales,
                'total_orders': business_day.total_orders
            },
            'timestamp': Event.timestamp,
        }
    )
    await event_bus.publish(event)
    logger.info(f"Evento de fechamento de dia publicado: {business_day.id} - {business_day.date}")


async def publish_business_day_updated(business_day: BusinessDay, updated_fields: Dict[str, Any]) -> None:
    """Publica evento de atualização de dia de operação."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.SYSTEM_CONFIG_CHANGED,
        data={
            'business_day': {
                'id': business_day.id,
                'date': business_day.date,
                'status': business_day.status
            },
            'updated_fields': updated_fields,
            'timestamp': Event.timestamp,
        }
    )
    await event_bus.publish(event)
    logger.info(f"Evento de atualização de dia publicado: {business_day.id} - campos: {list(updated_fields.keys())}")
