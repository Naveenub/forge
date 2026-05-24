"""
conftest.py for unit tests.
Overrides CurrentUserID so routes that require auth work without a real token
in tests that use the module-level TestClient(app).
"""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core.auth import _resolve_user_id
from app.main import app

_TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000099")


def _override_user_id() -> uuid.UUID:
    return _TEST_USER_ID


@pytest.fixture(autouse=True, scope="session")
def override_auth():
    """Override CurrentUserID dependency for all unit tests."""
    app.dependency_overrides[_resolve_user_id] = _override_user_id
    yield
    app.dependency_overrides.pop(_resolve_user_id, None)
