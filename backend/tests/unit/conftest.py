"""
conftest.py for unit tests.
Provides a pre-seeded session factory so that module-level TestClient(app)
instances (e.g. in test_routes.py) get a working DB without running lifespan.

Auth override is NOT autouse — tests in test_auth_routes.py manage their own
auth state and must be able to test unauthenticated flows.
"""
from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.auth import _resolve_user_id
from app.main import app

_TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000099")


def _override_user_id() -> uuid.UUID:
    return _TEST_USER_ID


@pytest.fixture(autouse=False, scope="session")
def override_auth():
    """Override CurrentUserID dependency. Opt-in only — do NOT use in auth tests."""
    app.dependency_overrides[_resolve_user_id] = _override_user_id
    yield
    app.dependency_overrides.pop(_resolve_user_id, None)
