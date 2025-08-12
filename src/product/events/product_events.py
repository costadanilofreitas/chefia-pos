from src.core.events.event_bus import Event, EventType, get_event_bus
from src.product.models.product import Product, ProductStatus
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


# Eventos relacionados a produtos
async def publish_product_created(product: Product) -> None:
    """Publica evento de criação de produto."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.PRODUCT_CREATED,
        data={
            "product": {
                "id": product.id,
                "name": product.name,
                "price": product.price,
                "type": product.type,
                "status": product.status,
                "categories": product.categories,
            },
            "timestamp": Event.timestamp,
        },
    )
    await event_bus.publish(event)
    logger.info(
        f"Evento de criação de produto publicado: {product.id} - {product.name}"
    )


async def publish_product_updated(
    product: Product, updated_fields: Dict[str, Any]
) -> None:
    """Publica evento de atualização de produto."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.PRODUCT_UPDATED,
        data={
            "product": {
                "id": product.id,
                "name": product.name,
                "price": product.price,
                "type": product.type,
                "status": product.status,
            },
            "updated_fields": updated_fields,
            "timestamp": Event.timestamp,
        },
    )
    await event_bus.publish(event)
    logger.info(
        f"Evento de atualização de produto publicado: {product.id} - campos: {list(updated_fields.keys())}"
    )


async def publish_product_status_changed(
    product: Product, old_status: ProductStatus
) -> None:
    """Publica evento de mudança de status de produto."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.PRODUCT_STATUS_CHANGED,
        data={
            "product": {
                "id": product.id,
                "name": product.name,
                "price": product.price,
                "type": product.type,
                "status": product.status,
            },
            "old_status": old_status,
            "timestamp": Event.timestamp,
        },
    )
    await event_bus.publish(event)
    logger.info(
        f"Evento de mudança de status de produto publicado: {product.id} - {old_status} -> {product.status}"
    )


async def publish_category_created(category: Dict[str, Any]) -> None:
    """Publica evento de criação de categoria."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.CATEGORY_CREATED,
        data={
            "category": {
                "id": category["id"],
                "name": category["name"],
                "type": category["type"],
                "parent_id": category.get("parent_id"),
            },
            "timestamp": Event.timestamp,
        },
    )
    await event_bus.publish(event)
    logger.info(
        f"Evento de criação de categoria publicado: {category['id']} - {category['name']}"
    )


async def publish_category_updated(
    category: Dict[str, Any], updated_fields: Dict[str, Any]
) -> None:
    """Publica evento de atualização de categoria."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.CATEGORY_UPDATED,
        data={
            "category": {
                "id": category["id"],
                "name": category["name"],
                "type": category["type"],
                "parent_id": category.get("parent_id"),
            },
            "updated_fields": updated_fields,
            "timestamp": Event.timestamp,
        },
    )
    await event_bus.publish(event)
    logger.info(
        f"Evento de atualização de categoria publicado: {category['id']} - campos: {list(updated_fields.keys())}"
    )


async def publish_menu_updated(menu: Dict[str, Any]) -> None:
    """Publica evento de atualização de cardápio."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.MENU_UPDATED,
        data={
            "menu": {
                "id": menu["id"],
                "name": menu["name"],
                "is_active": menu["is_active"],
                "categories_count": len(menu["categories"]),
                "products_count": len(menu["products"]),
            },
            "timestamp": Event.timestamp,
        },
    )
    await event_bus.publish(event)
    logger.info(
        f"Evento de atualização de cardápio publicado: {menu['id']} - {menu['name']}"
    )
