"""
Redis client for caching functionality.
"""

import json
import logging
import os
from typing import Any, Optional

import redis.asyncio as redis

logger = logging.getLogger(__name__)


class RedisClient:
    """Redis client for caching operations."""

    def __init__(self) -> None:
        self.redis: Optional[redis.Redis] = None
        self.connected = False

    async def initialize(self) -> None:
        """Initialize Redis connection."""
        try:
            redis_host = os.getenv("REDIS_HOST", "localhost")
            redis_port = int(os.getenv("REDIS_PORT", "6379"))
            redis_password = os.getenv("REDIS_PASSWORD", "posmodern123")

            self.redis = redis.Redis(
                host=redis_host,
                port=redis_port,
                password=redis_password,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )

            # Test connection
            await self.redis.ping()
            self.connected = True
            logger.info("Redis connection established successfully")

        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}")
            self.connected = False

    async def close(self) -> None:
        """Close Redis connection."""
        if self.redis:
            await self.redis.close()
            self.connected = False
            logger.info("Redis connection closed")

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if not self.connected or not self.redis:
            return None

        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Error getting key {key} from Redis: {e}")
            return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache."""
        if not self.connected or not self.redis:
            return False

        try:
            serialized_value = json.dumps(value, default=str)
            if ttl:
                await self.redis.setex(key, ttl, serialized_value)
            else:
                await self.redis.set(key, serialized_value)
            return True
        except Exception as e:
            logger.error(f"Error setting key {key} in Redis: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        if not self.connected or not self.redis:
            return False

        try:
            result = await self.redis.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Error deleting key {key} from Redis: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        if not self.connected or not self.redis:
            return False

        try:
            result = await self.redis.exists(key)
            return result > 0
        except Exception as e:
            logger.error(f"Error checking key {key} in Redis: {e}")
            return False

    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment a numeric value."""
        if not self.connected or not self.redis:
            return None

        try:
            result = await self.redis.incr(key, amount)
            return result
        except Exception as e:
            logger.error(f"Error incrementing key {key} in Redis: {e}")
            return None

    async def expire(self, key: str, ttl: int) -> bool:
        """Set expiration for a key."""
        if not self.connected or not self.redis:
            return False

        try:
            result = await self.redis.expire(key, ttl)
            return result
        except Exception as e:
            logger.error(f"Error setting expiration for key {key} in Redis: {e}")
            return False


# Global instance
_redis_client: Optional[RedisClient] = None


async def get_redis_client() -> RedisClient:
    """Get the global Redis client instance."""
    global _redis_client

    if _redis_client is None:
        _redis_client = RedisClient()
        await _redis_client.initialize()

    return _redis_client


async def close_redis_client() -> None:
    """Close the global Redis client."""
    global _redis_client

    if _redis_client:
        await _redis_client.close()
        _redis_client = None
