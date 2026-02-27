"""
Unit tests for AuthService and security helpers.
All DB calls are mocked — no real database required.
"""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.security import hash_password, verify_password, create_access_token, decode_token


# ─────────────────────────────────────────────────────────────────────────────
# Security helpers (no DB — pure function tests)
# ─────────────────────────────────────────────────────────────────────────────

class TestPasswordHashing:
    def test_hash_and_verify(self):
        pwd = "SuperSecure@2025!"
        hashed = hash_password(pwd)
        assert hashed != pwd
        assert verify_password(pwd, hashed)

    def test_wrong_password_fails(self):
        hashed = hash_password("correct-horse")
        assert not verify_password("battery-staple", hashed)

    def test_unique_salts(self):
        """bcrypt uses random salts → two hashes of same password must differ."""
        pwd = "same-password"
        h1 = hash_password(pwd)
        h2 = hash_password(pwd)
        assert h1 != h2


class TestJWT:
    def test_create_and_decode(self):
        subject = str(uuid.uuid4())
        token = create_access_token(subject)
        decoded = decode_token(token)
        assert decoded["sub"] == subject

    def test_token_has_expiry(self):
        token = create_access_token("user-123")
        decoded = decode_token(token)
        assert "exp" in decoded

    def test_tampered_token_rejected(self):
        from jose import JWTError
        token = create_access_token("user-123")
        tampered = token[:-5] + "XXXXX"
        with pytest.raises((JWTError, Exception)):
            decode_token(tampered)


# ─────────────────────────────────────────────────────────────────────────────
# AuthService
# ─────────────────────────────────────────────────────────────────────────────

class TestAuthService:

    @pytest.fixture
    def mock_session(self):
        session = AsyncMock()
        session.execute = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()
        return session

    @pytest.fixture
    def mock_user(self):
        user = MagicMock()
        user.id = uuid.uuid4()
        user.email = "admin@forge.dev"
        user.username = "admin"
        user.name = "Admin User"
        user.role = "owner"
        user.avatar = None
        user.hashed_password = hash_password("Forge@2025")
        user.is_active = True
        user.is_verified = True
        user.last_login = None
        user.created_at = __import__("datetime").datetime.utcnow()
        return user

    @pytest.mark.asyncio
    async def test_login_success(self, mock_session, mock_user):
        from app.services.auth_service import AuthService
        svc = AuthService(mock_session)

        with patch.object(svc, "_get_user_by_email", return_value=mock_user):
            result = await svc.login("admin@forge.dev", "Forge@2025")

        # login() returns a TokenResponse pydantic model
        assert hasattr(result, "access_token")
        assert hasattr(result, "refresh_token")
        assert result.token_type == "bearer"

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, mock_session, mock_user):
        from app.services.auth_service import AuthService
        from fastapi import HTTPException
        svc = AuthService(mock_session)

        with patch.object(svc, "_get_user_by_email", return_value=mock_user):
            with pytest.raises(HTTPException) as exc_info:
                await svc.login("admin@forge.dev", "WrongPassword123")

        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, mock_session):
        from app.services.auth_service import AuthService
        from fastapi import HTTPException
        svc = AuthService(mock_session)

        with patch.object(svc, "_get_user_by_email", return_value=None):
            with pytest.raises(HTTPException) as exc_info:
                await svc.login("nobody@forge.dev", "password")

        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_login_inactive_user(self, mock_session, mock_user):
        from app.services.auth_service import AuthService
        from fastapi import HTTPException
        mock_user.is_active = False
        svc = AuthService(mock_session)

        with patch.object(svc, "_get_user_by_email", return_value=mock_user):
            with pytest.raises(HTTPException) as exc_info:
                await svc.login("admin@forge.dev", "Forge@2025")

        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_create_api_key(self, mock_session, mock_user):
        from app.services.auth_service import AuthService

        # create_api_key adds to session then refreshes — mock the refresh
        created_key = MagicMock()
        created_key.id = uuid.uuid4()
        created_key.name = "ci-runner"
        created_key.prefix = "fct_xxxx"
        created_key.scopes = ["read", "deploy"]
        created_key.created_at = __import__("datetime").datetime.utcnow()
        mock_session.refresh = AsyncMock(side_effect=lambda obj: None)

        svc = AuthService(mock_session)
        result = await svc.create_api_key(
            user_id=str(mock_user.id),
            name="ci-runner",
            scopes=["read", "deploy"],
        )

        assert "key" in result
        assert result["key"].startswith("fct_")
        assert result["name"] == "ci-runner"
        assert "read" in result["scopes"]

    @pytest.mark.asyncio
    async def test_api_key_minimum_32_chars(self, mock_session, mock_user):
        from app.services.auth_service import AuthService
        mock_session.refresh = AsyncMock()
        svc = AuthService(mock_session)

        result = await svc.create_api_key(
            user_id=str(mock_user.id),
            name="test-key",
            scopes=["read"],
        )

        # "fct_" + 43 chars = 47 total (token_urlsafe(32) → 43 base64url chars)
        assert len(result["key"]) >= 36
