"""
Pytest fixtures shared across all tests.
Provides in-memory SQLite (unit) and real PostgreSQL (integration) databases,
async HTTP clients, and mocked external services.
"""
from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncGenerator
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

# ── Ensure env vars are set before any app module is imported ─────────────────
# These are required by app.core.config at import time.
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("DATABASE_URL_REPLICA", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
os.environ.setdefault("TESTING", "true")

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.db.models import Base  # noqa: E402  (must come after env setup)

# ── Module-level session factory ──────────────────────────────────────────────
# Several test modules (test_routes.py, test_auth_routes.py) create a
# TestClient(app) at *import time*, before any pytest fixture can run.
# We must seed _WriteSession / _ReadSession in app.core.database right here
# so those clients have a working DB when their test methods call DB routes.
_unit_db_url = "sqlite+aiosqlite:///:memory:"
_test_engine = create_async_engine(
    _unit_db_url,
    connect_args={"check_same_thread": False},
)
_TestSessionFactory = async_sessionmaker(_test_engine, expire_on_commit=False)

import app.core.database as _core_db  # noqa: E402

_core_db._WriteSession = _TestSessionFactory
_core_db._ReadSession  = _TestSessionFactory


# ── Event loop ────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop_policy():
    return asyncio.DefaultEventLoopPolicy()


# ── Integration test engine (PostgreSQL or SQLite depending on env) ────────────

def _make_integration_engine():
    """
    For integration tests we use the real DATABASE_URL if it points to
    PostgreSQL; otherwise fall back to a separate in-memory SQLite instance.

    Fix: use NullPool for asyncpg-backed engines so each connection is
    freshly created and never shared across concurrent coroutines, which
    causes the 'another operation is in progress' InterfaceError.
    """
    db_url = os.environ.get("DATABASE_URL", _unit_db_url)
    if "postgresql" in db_url or "postgres" in db_url:
        from sqlalchemy.pool import NullPool
        return create_async_engine(db_url, echo=False, poolclass=NullPool)
    # SQLite fallback: use a separate file-based DB to avoid sharing state
    return create_async_engine(
        "sqlite+aiosqlite:///./test_integration.db",
        connect_args={"check_same_thread": False},
    )


# ── Integration engine (created lazily inside fixture) ────────────────────────

@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def engine():
    """
    Session-scoped engine for integration tests.
    Created lazily inside the fixture so the event loop exists when aiosqlite
    opens its connection — avoids teardown hangs from loop/connection mismatch.
    """
    _engine = _make_integration_engine()
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield _engine
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    try:
        await asyncio.wait_for(_engine.dispose(), timeout=5.0)
    except asyncio.TimeoutError:
        pass


@pytest_asyncio.fixture(loop_scope="session")
async def db(engine) -> AsyncGenerator[AsyncSession, None]:
    """Yield a per-test AsyncSession with full schema isolation.

    Drops and recreates all tables before each test so tests can't bleed
    into each other via unique constraints or leftover rows.

    The session factory is created here (not at module level) so it binds
    to the same event loop as the session-scoped engine fixture, avoiding
    "Future attached to a different loop" errors on teardown.
    """
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.connect() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        await conn.commit()

    async with session_factory() as session:
        yield session
        await session.rollback()


# ── FastAPI app + HTTP client ─────────────────────────────────────────────────

@pytest.fixture
def app(db) -> FastAPI:
    """Return the FastAPI app with overridden DB dependencies."""
    from app.main import app as _app
    from app.db.session import write_session_dep, read_session_dep

    async def override_db():
        yield db

    _app.dependency_overrides[write_session_dep] = override_db
    _app.dependency_overrides[read_session_dep] = override_db
    yield _app
    # Use pop() instead of clear() to avoid wiping overrides set by other
    # test modules (e.g. the module-level mocks in test_agents.py).
    _app.dependency_overrides.pop(write_session_dep, None)
    _app.dependency_overrides.pop(read_session_dep, None)


@pytest_asyncio.fixture
async def client(app) -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac


# ── Auth helpers ──────────────────────────────────────────────────────────────

@pytest.fixture
def auth_headers(client) -> dict[str, str]:
    """Return Authorization headers for a test user."""
    from app.core.security import create_access_token
    import uuid
    token = create_access_token(str(uuid.uuid4()))
    return {"Authorization": f"Bearer {token}"}


# ── Mocked external services ──────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def mock_anthropic():
    """Mock Anthropic API calls — prevents real API hits in all tests."""
    with patch("anthropic.AsyncAnthropic") as mock_cls:
        client = MagicMock()
        client.messages.create = AsyncMock(return_value=MagicMock(
            content=[MagicMock(text='{"approved": true, "summary": "Mock response"}')]
        ))
        mock_cls.return_value = client
        yield client


@pytest.fixture(autouse=True)
def mock_redis():
    """Mock Redis client."""
    with patch("app.core.redis_client._redis") as mock_redis:
        mock_redis.pipeline = MagicMock(return_value=AsyncMock(
            execute=AsyncMock(return_value=[0, 0, 0, 0])
        ))
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.set = AsyncMock(return_value=True)
        mock_redis.delete = AsyncMock(return_value=1)
        yield mock_redis


@pytest.fixture(autouse=True)
def mock_kafka():
    """Mock Kafka producer."""
    with patch("app.core.kafka_client._producer") as mock_producer:
        mock_producer.send_and_wait = AsyncMock(return_value=None)
        yield mock_producer


# ── Sample data factories ─────────────────────────────────────────────────────

@pytest.fixture
def sample_workspace_payload() -> dict[str, Any]:
    return {"name": "Test Workspace", "description": "Unit test workspace"}


@pytest.fixture
def sample_project_payload() -> dict[str, Any]:
    return {
        "name": "Test Project",
        "description": "A test project",
        "requirements": "Build a REST API with authentication",
        "tech_stack": {"backend": "FastAPI", "db": "PostgreSQL"},
    }


@pytest.fixture
def sample_pipeline_payload(sample_project_payload) -> dict[str, Any]:
    return {"project_id": "00000000-0000-0000-0000-000000000001"}
