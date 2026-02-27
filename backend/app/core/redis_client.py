"""
Async Redis client with connection pool.
Provides session cache, rate limiting, and WebSocket state.
"""
from __future__ import annotations

import logging
from collections.abc import AsyncGenerator

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis: aioredis.Redis | None = None


async def init_redis() -> None:
    """Create Redis connection pool and verify connectivity."""
    global _redis

    _redis = aioredis.from_url(
        settings.REDIS_URL,
        max_connections=settings.REDIS_MAX_CONNECTIONS,
        decode_responses=True,
        socket_timeout=5,
        socket_connect_timeout=5,
        retry_on_timeout=True,
        health_check_interval=30,
    )

    await _redis.ping()
    logger.info("Redis connection established")


async def close_redis() -> None:
    if _redis:
        await _redis.aclose()
    logger.info("Redis connection closed")


def get_redis_client() -> aioredis.Redis:
    """Return the module-level Redis client (not a dependency)."""
    if _redis is None:
        raise RuntimeError("Redis not initialized — call init_redis() first")
    return _redis


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    """FastAPI dependency — yields the shared Redis client."""
    if _redis is None:
        raise RuntimeError("Redis not initialized")
    yield _redis


# ── Cache helpers ─────────────────────────────────────────────────────────────

async def cache_get(key: str) -> str | None:
    return await _redis.get(key) if _redis else None  # type: ignore[union-attr]


async def cache_set(key: str, value: str, ttl: int = 300) -> None:
    if _redis:
        await _redis.setex(key, ttl, value)


async def cache_delete(key: str) -> None:
    if _redis:
        await _redis.delete(key)


async def cache_delete_pattern(pattern: str) -> int:
    """Delete all keys matching pattern. Returns count deleted."""
    if not _redis:
        return 0
    keys = await _redis.keys(pattern)
    if keys:
        return await _redis.delete(*keys)
    return 0
