"""SQLAlchemy async session factory."""
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# ── Engines ───────────────────────────────────────────────────────────────────

engine_write = create_async_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

engine_read = create_async_engine(
    settings.DATABASE_URL_REPLICA or settings.DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    echo=False,
)


# ── Session factories ─────────────────────────────────────────────────────────

AsyncWriteSession = async_sessionmaker(
    engine_write,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

AsyncReadSession = async_sessionmaker(
    engine_read,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# ── Base ──────────────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


# ── Dependency helpers ────────────────────────────────────────────────────────

@asynccontextmanager
async def get_write_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncWriteSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def get_read_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncReadSession() as session:
        yield session


async def write_session_dep() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — write (primary) DB."""
    async with AsyncWriteSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def read_session_dep() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — read (replica) DB."""
    async with AsyncReadSession() as session:
        yield session
