"""
Unit tests for app.core.dependencies.
Covers _get_current_user_id, Pagination, and optional_user_id
to bring overall coverage above the 75% threshold.
"""
from __future__ import annotations

import uuid

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core.dependencies import Pagination, _get_current_user_id, optional_user_id
from app.core.security import create_access_token


def _creds(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


class TestGetCurrentUserId:
    @pytest.mark.asyncio
    async def test_valid_token_returns_uuid(self):
        uid = str(uuid.uuid4())
        token = create_access_token(uid)
        result = await _get_current_user_id(_creds(token))
        assert result == uuid.UUID(uid)

    @pytest.mark.asyncio
    async def test_no_credentials_raises_401(self):
        with pytest.raises(HTTPException) as exc_info:
            await _get_current_user_id(None)
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_token_raises_401(self):
        with pytest.raises(HTTPException) as exc_info:
            await _get_current_user_id(_creds("not.a.valid.token"))
        assert exc_info.value.status_code == 401


class TestPagination:
    def test_defaults(self):
        p = Pagination()
        assert p.page == 1
        assert p.size == 20
        assert p.offset == 0
        assert p.limit == 20

    def test_page_2(self):
        p = Pagination(page=2, size=10)
        assert p.offset == 10
        assert p.limit == 10

    def test_page_3_size_5(self):
        p = Pagination(page=3, size=5)
        assert p.offset == 10


class TestOptionalUserId:
    @pytest.mark.asyncio
    async def test_no_creds_returns_none(self):
        result = await optional_user_id(None)
        assert result is None

    @pytest.mark.asyncio
    async def test_valid_token_returns_uuid(self):
        uid = str(uuid.uuid4())
        token = create_access_token(uid)
        result = await optional_user_id(_creds(token))
        assert result == uuid.UUID(uid)

    @pytest.mark.asyncio
    async def test_invalid_token_returns_none(self):
        result = await optional_user_id(_creds("garbage"))
        assert result is None