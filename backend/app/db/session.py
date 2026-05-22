"""SQLAlchemy async session factory — delegates to core.database engines.

Engines are created lazily by core.database.init_db() during app lifespan,
so no connection is attempted at import time.
"""
from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def _get_write_session_factory():
    from app.core.database import _WriteSession  # noqa: PLC0415
    if _WriteSession is None:
        raise RuntimeError(
            "Database not initialised — ensure init_db() ran in app lifespan before "
            "the first request reaches a DB dependency."
        )
    return _WriteSession


def _get_read_session_factory():
    from app.core.database import _ReadSession  # noqa: PLC0415
    if _ReadSession is None:
        raise RuntimeError(
            "Database not initialised — ensure init_db() ran in app lifespan before "
            "the first request reaches a DB dependency."
        )
    return _ReadSession


async def write_session_dep() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — write (primary) DB session."""
    async with _get_write_session_factory()() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def read_session_dep() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — read (replica) DB session."""
    async with _get_read_session_factory()() as session:
        yield session


# ── Context manager helpers (for non-FastAPI callers e.g. health checks) ─────

@asynccontextmanager
async def get_write_session() -> AsyncGenerator[AsyncSession, None]:
    """Async context manager — write (primary) DB session."""
    async with _get_write_session_factory()() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def get_read_session() -> AsyncGenerator[AsyncSession, None]:
    """Async context manager — read (replica) DB session."""
    async with _get_read_session_factory()() as session:
        yield session
