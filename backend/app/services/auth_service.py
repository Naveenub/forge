"""Authentication & user management service."""
from __future__ import annotations

import secrets
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.db.models import ApiKey, User
from app.schemas.user import TokenResponse, UserRead, UserUpdate


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _get_user_by_email(self, email: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.email == email.lower())
        )
        return result.scalar_one_or_none()

    # ── Auth ──────────────────────────────────────────────────────────────────

    async def login(self, email: str, password: str) -> TokenResponse:
        """Validate credentials and return JWT pair."""
        user = await self._get_user_by_email(email)

        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive",
            )

        await self.db.execute(
            update(User).where(User.id == user.id)
            .values(last_login=datetime.now(UTC))
        )
        await self.db.commit()

        return TokenResponse(
            access_token=create_access_token(str(user.id)),
            refresh_token=create_refresh_token(str(user.id)),
            user=UserRead.model_validate(user),
        )

    async def get_user(self, user_id: UUID) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def update_user(self, user_id: UUID, data: UserUpdate) -> User:
        user = await self.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(user, field, value)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    # ── API Keys ──────────────────────────────────────────────────────────────

    async def create_api_key(
        self,
        user_id: UUID | str,
        name: str = "default",
        scopes: list[str] | None = None,
    ) -> dict:
        """Create a new API key. Returns dict with raw key (shown once only)."""
        raw_key = f"fct_{secrets.token_urlsafe(32)}"
        api_key = ApiKey(
            user_id=user_id,
            name=name,
            key_hash=hash_password(raw_key),
            prefix=raw_key[:12],
            scopes=scopes or ["read"],
        )
        self.db.add(api_key)
        await self.db.flush()
        await self.db.commit()
        await self.db.refresh(api_key)
        return {
            "id":      str(api_key.id),
            "name":    api_key.name,
            "key":     raw_key,
            "prefix":  api_key.prefix,
            "scopes":  api_key.scopes,
            "created_at": api_key.created_at.isoformat(),
        }

    async def list_api_keys(self, user_id: UUID) -> list[ApiKey]:
        result = await self.db.execute(
            select(ApiKey).where(ApiKey.user_id == user_id, ApiKey.revoked == False)  # noqa: E712
        )
        return list(result.scalars())

    async def revoke_api_key(self, key_id: UUID, user_id: UUID) -> None:
        await self.db.execute(
            update(ApiKey)
            .where(ApiKey.id == key_id, ApiKey.user_id == user_id)
            .values(revoked=True)
        )
        await self.db.commit()
