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

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# ── Ensure env vars are set before any app module is imported ─────────────────
# These are required by app.core.config at import time.
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("DATABASE_URL_REPLICA", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")

from app.db.models import Base  # noqa: E402  (must come after env setup)


# ── Event loop ────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop_policy():
    return asyncio.DefaultEventLoopPolicy()


# ── In-memory SQLite engine (unit tests) ─────────────────────────────────────

@pytest.fixture(scope="session")
async def engine():
    _engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield _engine
    await _engine.dispose()


@pytest.fixture
async def db(engine) -> AsyncGenerator[AsyncSession, None]:
    """Yield a per-test AsyncSession that is always rolled back."""
    SessionFactory = async_sessionmaker(engine, expire_on_commit=False)
    async with SessionFactory() as session:
        yield session
        await session.rollback()


# ── FastAPI app + HTTP client ─────────────────────────────────────────────────

@pytest.fixture
def app(db) -> FastAPI:
    """Return the FastAPI app with overridden DB dependencies."""
    from app.main import app as _app
    # Override the dependency callables that routes actually use (from dependencies.py).
    # These are imported as write_session_dep / read_session_dep from app.db.session,
    # then re-exported as WriteDB / ReadDB via Annotated[..., Depends(...)].
    from app.db.session import write_session_dep, read_session_dep

    async def override_db():
        yield db

    _app.dependency_overrides[write_session_dep] = override_db
    _app.dependency_overrides[read_session_dep] = override_db
    yield _app
    _app.dependency_overrides.clear()


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
