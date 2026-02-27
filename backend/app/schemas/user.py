"""Pydantic schemas for User and auth endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, ConfigDict


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
    avatar:      Optional[str] = None
    is_active:   bool
    is_verified: bool
    last_login:  Optional[datetime] = None
    created_at:  datetime


class UserUpdate(BaseModel):
    name:     Optional[str] = Field(None, max_length=255)
    username: Optional[str] = Field(None, max_length=100)
    avatar:   Optional[str] = Field(None, max_length=4)


class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    user:          UserRead


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password:     str = Field(..., min_length=8)


class ApiKeyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:         UUID
    name:       str
    prefix:     str
    scopes:     List[str]
    revoked:    bool
    last_used:  Optional[datetime] = None
    created_at: datetime


class ApiKeyCreated(ApiKeyRead):
    """Includes the raw key — returned only on creation, never again."""
    key: str
