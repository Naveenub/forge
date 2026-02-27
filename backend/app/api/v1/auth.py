"""Authentication API — /api/v1/auth/"""
from __future__ import annotations

import secrets
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserID
from app.core.database import get_read_db, get_write_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.models import ApiKey, User
from app.schemas.user import (
    ApiKeyCreated,
    ApiKeyRead,
    ChangePasswordRequest,
    LoginRequest,
    TokenResponse,
    UserRead,
    UserUpdate,
)

router = APIRouter()


# ── Login / Logout ────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_write_db)):
    result = await db.execute(
        select(User).where(User.email == payload.email.lower(), User.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    await db.execute(
        update(User).where(User.id == user.id)
        .values(last_login=datetime.now(UTC))
    )
    await db.commit()

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=UserRead.model_validate(user),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(user_id: CurrentUserID):
    # Stateless JWT — client discards token.
    # Production: add jti to Redis denylist here.
    return None


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh: str = Query(...), db: AsyncSession = Depends(get_read_db)):
    try:
        payload = decode_token(refresh)
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
        user_id = UUID(payload["sub"])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=UserRead.model_validate(user),
    )


# ── Current user ──────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserRead)
async def get_me(user_id: CurrentUserID, db: AsyncSession = Depends(get_read_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserRead.model_validate(user)


@router.patch("/me", response_model=UserRead)
async def update_me(
    payload: UserUpdate,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_write_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_write_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = hash_password(payload.new_password)
    await db.commit()


# ── API Keys ──────────────────────────────────────────────────────────────────

@router.get("/api-keys", response_model=list[ApiKeyRead])
async def list_api_keys(user_id: CurrentUserID, db: AsyncSession = Depends(get_read_db)):
    result = await db.execute(
        select(ApiKey).where(ApiKey.user_id == user_id, ApiKey.revoked == False)  # noqa: E712
    )
    return [ApiKeyRead.model_validate(k) for k in result.scalars()]


@router.post("/api-keys", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_write_db),
    name: str = Query(default="default"),
):
    raw = f"fct_{secrets.token_urlsafe(32)}"
    key = ApiKey(
        user_id=user_id,
        name=name,
        key_hash=hash_password(raw),
        prefix=raw[:12],
        scopes=["read"],
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)
    return ApiKeyCreated(**ApiKeyRead.model_validate(key).model_dump(), key=raw)


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: UUID,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_write_db),
):
    await db.execute(
        update(ApiKey)
        .where(ApiKey.id == key_id, ApiKey.user_id == user_id)
        .values(revoked=True)
    )
    await db.commit()
