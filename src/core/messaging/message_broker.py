"""
RabbitMQ message broker for inter-service communication.
"""

import json
import logging
import os
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

import aio_pika
from aio_pika import Channel, Exchange, Message, Queue
from aio_pika.abc import AbstractRobustConnection

logger = logging.getLogger(__name__)


class MessageBroker:
    """RabbitMQ message broker for event-driven architecture."""

    def __init__(self) -> None:
        self.connection: Optional[AbstractRobustConnection] = None
        self.channel: Optional[Channel] = None
        self.exchanges: Dict[str, Exchange] = {}
        self.queues: Dict[str, Queue] = {}
        self.connected = False

    async def initialize(self) -> None:
        """Initialize RabbitMQ connection."""
        try:
            rabbitmq_url = os.getenv(
                "RABBITMQ_URL", "amqp://posmodern:posmodern123@localhost:5672/"
            )

            self.connection = await aio_pika.connect_robust(rabbitmq_url)
            self.channel = await self.connection.channel()  # type: ignore

            # Declare main exchanges
            await self._declare_exchanges()

            self.connected = True
            logger.info("RabbitMQ connection established successfully")

        except Exception as e:
            logger.warning(f"Failed to connect to RabbitMQ: {e}")
            self.connected = False

    async def _declare_exchanges(self) -> None:
        """Declare main exchanges for the application."""
        exchanges_config = [
            {"name": "pos.events", "type": "topic"},
            {"name": "pos.orders", "type": "topic"},
            {"name": "pos.payments", "type": "topic"},
            {"name": "pos.products", "type": "topic"},
            {"name": "pos.notifications", "type": "fanout"},
        ]

        for exchange_config in exchanges_config:
            exchange = await self.channel.declare_exchange(  # type: ignore
                exchange_config["name"],
                type=aio_pika.ExchangeType(exchange_config["type"]),
                durable=True,
            )
            self.exchanges[exchange_config["name"]] = exchange  # type: ignore
            logger.debug(f"Declared exchange: {exchange_config['name']}")

    async def close(self) -> None:
        """Close RabbitMQ connection."""
        if self.connection:
            await self.connection.close()
            self.connected = False
            logger.info("RabbitMQ connection closed")

    async def publish_event(
        self,
        exchange_name: str,
        routing_key: str,
        event_data: Dict[str, Any],
        message_id: Optional[str] = None,
    ) -> bool:
        """Publish an event to RabbitMQ."""
        if not self.connected or not self.channel:
            logger.warning("Cannot publish event: RabbitMQ not connected")
            return False

        try:
            exchange = self.exchanges.get(exchange_name)
            if not exchange:
                logger.error(f"Exchange {exchange_name} not found")
                return False

            # Prepare message
            message_body = {
                "event_id": message_id or f"evt_{int(datetime.now().timestamp())}",
                "timestamp": datetime.now().isoformat(),
                "routing_key": routing_key,
                "data": event_data,
            }

            message = Message(
                json.dumps(message_body).encode(),
                message_id=message_body["event_id"],  # type: ignore
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            )

            await exchange.publish(message, routing_key=routing_key)
            logger.debug(f"Published event {routing_key} to {exchange_name}")
            return True

        except Exception as e:
            logger.error(f"Error publishing event {routing_key}: {e}")
            return False

    async def create_queue(
        self,
        queue_name: str,
        exchange_name: str,
        routing_keys: List[str],
        callback: Callable,
        durable: bool = True,
    ) -> bool:
        """Create a queue and bind it to an exchange."""
        if not self.connected or not self.channel:
            logger.warning("Cannot create queue: RabbitMQ not connected")
            return False

        try:
            # Declare queue
            queue = await self.channel.declare_queue(queue_name, durable=durable)  # type: ignore

            # Get exchange
            exchange = self.exchanges.get(exchange_name)
            if not exchange:
                logger.error(f"Exchange {exchange_name} not found")
                return False

            # Bind to routing keys
            for routing_key in routing_keys:
                await queue.bind(exchange, routing_key)
                logger.debug(
                    f"Bound queue {queue_name} to {exchange_name} with key {routing_key}"
                )

            # Set up consumer
            await queue.consume(callback)

            self.queues[queue_name] = queue  # type: ignore
            logger.info(f"Created queue {queue_name} with {len(routing_keys)} bindings")
            return True

        except Exception as e:
            logger.error(f"Error creating queue {queue_name}: {e}")
            return False

    async def publish_order_event(
        self, event_type: str, order_data: Dict[str, Any]
    ) -> bool:
        """Publish order-related events."""
        return await self.publish_event("pos.orders", f"order.{event_type}", order_data)

    async def publish_payment_event(
        self, event_type: str, payment_data: Dict[str, Any]
    ) -> bool:
        """Publish payment-related events."""
        return await self.publish_event(
            "pos.payments", f"payment.{event_type}", payment_data
        )

    async def publish_product_event(
        self, event_type: str, product_data: Dict[str, Any]
    ) -> bool:
        """Publish product-related events."""
        return await self.publish_event(
            "pos.products", f"product.{event_type}", product_data
        )

    async def publish_notification(self, notification_data: Dict[str, Any]) -> bool:
        """Publish notifications (fanout to all consumers)."""
        return await self.publish_event(
            "pos.notifications", "", notification_data  # Fanout doesn't use routing key
        )


# Global instance
_message_broker: Optional[MessageBroker] = None


async def get_message_broker() -> MessageBroker:
    """Get the global message broker instance."""
    global _message_broker

    if _message_broker is None:
        _message_broker = MessageBroker()
        await _message_broker.initialize()

    return _message_broker


async def close_message_broker() -> None:
    """Close the global message broker."""
    global _message_broker

    if _message_broker:
        await _message_broker.close()
        _message_broker = None
