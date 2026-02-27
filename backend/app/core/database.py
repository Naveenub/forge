"""
Async SQLAlchemy engine + session factories.
Provides write (primary) and read (replica) sessions with CQRS split.
Called once at application startup via init_db().
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Engines ───────────────────────────────────────────────────────────────────

_engine_write = None
_engine_read  = None
_WriteSession: async_sessionmaker | None = None
_ReadSession:  async_sessionmaker | None = None


async def init_db() -> None:
    """Create engine pools and verify connectivity."""
    global _engine_write, _engine_read, _WriteSession, _ReadSession

    _engine_write = create_async_engine(
        settings.DATABASE_URL,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_pre_ping=True,
        echo=settings.DEBUG,
    )
    _engine_read = create_async_engine(
        settings.DATABASE_URL_REPLICA or settings.DATABASE_URL,
        pool_size=max(5, settings.DB_POOL_SIZE // 2),
        max_overflow=5,
        pool_pre_ping=True,
        echo=False,
    )

    _WriteSession = async_sessionmaker(_engine_write, class_=AsyncSession, expire_on_commit=False)
    _ReadSession  = async_sessionmaker(_engine_read,  class_=AsyncSession, expire_on_commit=False)

    # Verify connectivity
    async with _engine_write.connect() as conn:
        await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    logger.info("Database connections established (primary + replica)")


async def close_db() -> None:
    if _engine_write:
        await _engine_write.dispose()
    if _engine_read:
        await _engine_read.dispose()
    logger.info("Database connections closed")


# ── Session dependency helpers ────────────────────────────────────────────────

async def get_write_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — write session (primary DB)."""
    async with _WriteSession() as session:  # type: ignore[misc]
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_read_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — read-only session (replica DB)."""
    async with _ReadSession() as session:  # type: ignore[misc]
        yield session


# Alias for backward-compat (routes that import get_db)
get_db = get_write_db


@asynccontextmanager
async def write_session() -> AsyncGenerator[AsyncSession, None]:
    """Context manager for non-FastAPI code (workers, tasks)."""
    async with _WriteSession() as session:  # type: ignore[misc]
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

