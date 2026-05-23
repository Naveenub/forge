"""
Unit tests for Auth API routes (/api/v1/auth/*).
All DB interactions are mocked via dependency overrides.
"""
from __future__ import annotations

import uuid
from datetime import datetime, UTC
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, create_refresh_token, hash_password
from app.main import app
from app.core.database import get_read_db, get_write_db


def _make_user(active=True):
    user = MagicMock()
    user.id = uuid.uuid4()
    user.email = "test@forge.dev"
    user.username = "testuser"
    user.name = "Test User"
    user.role = "contributor"
    user.avatar = None
    user.hashed_password = hash_password("Correct@123")
    user.is_active = active
    user.is_verified = True
    user.last_login = None
    user.created_at = datetime.now(UTC)
    return user


def _mock_db_with_user(user):
    async def _dep():
        session = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = user
        result.scalars.return_value = []
        session.execute = AsyncMock(return_value=result)
        session.commit = AsyncMock()
        session.refresh = AsyncMock()
        session.add = MagicMock()
        yield session
    return _dep


def _mock_db_no_user():
    async def _dep():
        session = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        result.scalars.return_value = []
        session.execute = AsyncMock(return_value=result)
        session.commit = AsyncMock()
        yield session
    return _dep


class TestLoginRoute:
    def test_login_success(self):
        user = _make_user()
        app.dependency_overrides[get_write_db] = _mock_db_with_user(user)
        client = TestClient(app)
        resp = client.post("/api/v1/auth/login", json={
            "email": "test@forge.dev", "password": "Correct@123"
        })
        app.dependency_overrides.pop(get_write_db, None)
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self):
        user = _make_user()
        app.dependency_overrides[get_write_db] = _mock_db_with_user(user)
        client = TestClient(app)
        resp = client.post("/api/v1/auth/login", json={
            "email": "test@forge.dev", "password": "WrongPassword!"
        })
        app.dependency_overrides.pop(get_write_db, None)
        assert resp.status_code == 401

    def test_login_nonexistent_user(self):
        app.dependency_overrides[get_write_db] = _mock_db_no_user()
        client = TestClient(app)
        resp = client.post("/api/v1/auth/login", json={
            "email": "nobody@forge.dev", "password": "password"
        })
        app.dependency_overrides.pop(get_write_db, None)
        assert resp.status_code == 401

    def test_login_missing_fields(self):
        app.dependency_overrides[get_write_db] = _mock_db_no_user()
        client = TestClient(app)
        resp = client.post("/api/v1/auth/login", json={"email": "x@y.com"})
        app.dependency_overrides.pop(get_write_db, None)
        assert resp.status_code == 422


class TestLogoutRoute:
    def test_logout_with_valid_token(self):
        client = TestClient(app)
        token = create_access_token(str(uuid.uuid4()))
        resp = client.post("/api/v1/auth/logout",
                           headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 204

    def test_logout_without_token(self):
        client = TestClient(app)
        resp = client.post("/api/v1/auth/logout")
        assert resp.status_code == 401


class TestRefreshRoute:
    def test_refresh_with_valid_token(self):
        user = _make_user()
        app.dependency_overrides[get_read_db] = _mock_db_with_user(user)
        client = TestClient(app)
        refresh = create_refresh_token(str(user.id))
        resp = client.post(f"/api/v1/auth/refresh?refresh={refresh}")
        app.dependency_overrides.pop(get_read_db, None)
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_refresh_with_access_token_fails(self):
        app.dependency_overrides[get_read_db] = _mock_db_no_user()
        client = TestClient(app)
        access = create_access_token(str(uuid.uuid4()))
        resp = client.post(f"/api/v1/auth/refresh?refresh={access}")
        app.dependency_overrides.pop(get_read_db, None)
        assert resp.status_code == 401

    def test_refresh_invalid_token(self):
        app.dependency_overrides[get_read_db] = _mock_db_no_user()
        client = TestClient(app)
        resp = client.post("/api/v1/auth/refresh?refresh=notavalidtoken")
        app.dependency_overrides.pop(get_read_db, None)
        assert resp.status_code == 401


class TestMeRoute:
    def test_get_me_success(self):
        user = _make_user()
        app.dependency_overrides[get_read_db] = _mock_db_with_user(user)
        client = TestClient(app)
        token = create_access_token(str(user.id))
        resp = client.get("/api/v1/auth/me",
                          headers={"Authorization": f"Bearer {token}"})
        app.dependency_overrides.pop(get_read_db, None)
        assert resp.status_code == 200
        assert resp.json()["email"] == "test@forge.dev"

    def test_get_me_unauthenticated(self):
        client = TestClient(app)
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_get_me_user_not_found(self):
        app.dependency_overrides[get_read_db] = _mock_db_no_user()
        client = TestClient(app)
        token = create_access_token(str(uuid.uuid4()))
        resp = client.get("/api/v1/auth/me",
                          headers={"Authorization": f"Bearer {token}"})
        app.dependency_overrides.pop(get_read_db, None)
        assert resp.status_code == 404


class TestApiKeysRoute:
    def test_list_api_keys(self):
        app.dependency_overrides[get_read_db] = _mock_db_no_user()
        client = TestClient(app)
        token = create_access_token(str(uuid.uuid4()))
        resp = client.get("/api/v1/auth/api-keys",
                          headers={"Authorization": f"Bearer {token}"})
        app.dependency_overrides.pop(get_read_db, None)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_api_key(self):
        created_key = MagicMock()
        created_key.id = uuid.uuid4()
        created_key.name = "ci"
        created_key.prefix = "fct_xxxxxxxxxxxx"
        created_key.scopes = ["read"]
        created_key.created_at = datetime.now(UTC)
        created_key.revoked = False
        created_key.user_id = uuid.uuid4()

        async def _db():
            session = AsyncMock()
            result = MagicMock()
            result.scalar_one_or_none.return_value = None
            result.scalars.return_value = []
            session.execute = AsyncMock(return_value=result)
            session.commit = AsyncMock()
            session.add = MagicMock()
            session.refresh = AsyncMock(side_effect=lambda obj: (
                setattr(obj, 'id', uuid.uuid4()),
                setattr(obj, 'revoked', False),
                setattr(obj, 'created_at', datetime.now(UTC)),
            ) and None)
            yield session

        app.dependency_overrides[get_write_db] = _db
        client = TestClient(app)
        token = create_access_token(str(uuid.uuid4()))
        resp = client.post("/api/v1/auth/api-keys?name=ci",
                           headers={"Authorization": f"Bearer {token}"})
        app.dependency_overrides.pop(get_write_db, None)
        assert resp.status_code == 201
        assert resp.json()["key"].startswith("fct_")

    def test_revoke_api_key(self):
        app.dependency_overrides[get_write_db] = _mock_db_no_user()
        client = TestClient(app)
        token = create_access_token(str(uuid.uuid4()))
        key_id = uuid.uuid4()
        resp = client.delete(f"/api/v1/auth/api-keys/{key_id}",
                             headers={"Authorization": f"Bearer {token}"})
        app.dependency_overrides.pop(get_write_db, None)
        assert resp.status_code == 204