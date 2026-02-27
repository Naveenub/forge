"""Pydantic schemas for User and auth endpoints."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    email:    str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:          UUID
    email:       str
    username:    str
    name:        str
    role:        str
    avatar:      str | None = None
    is_active:   bool
    is_verified: bool
    last_login:  datetime | None = None
    created_at:  datetime


class UserUpdate(BaseModel):
    name:     str | None = Field(None, max_length=255)
    username: str | None = Field(None, max_length=100)
    avatar:   str | None = Field(None, max_length=4)


class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"  # noqa: S105
    user:          UserRead


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password:     str = Field(..., min_length=8)


class ApiKeyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:         UUID
    name:       str
    prefix:     str
    scopes:     list[str]
    revoked:    bool
    last_used:  datetime | None = None
    created_at: datetime


class ApiKeyCreated(ApiKeyRead):
    """Includes the raw key — returned only on creation, never again."""
    key: str
