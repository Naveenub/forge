"""
Authentication helpers used by route dependencies and WebSocket handlers.
Wraps security.py to provide FastAPI-ready callables.
"""
from __future__ import annotations

import logging
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.core.database import get_read_db

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)


# ── FastAPI dependency ────────────────────────────────────────────────────────

async def _resolve_user_id(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> UUID:
    if not creds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_token(creds.credentials)
        sub = payload.get("sub")
        if not sub:
            raise ValueError("No subject in token")
        return UUID(sub)
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


CurrentUserID = Annotated[UUID, Depends(_resolve_user_id)]


async def _resolve_optional_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> UUID | None:
    if not creds:
        return None
    try:
        payload = decode_token(creds.credentials)
        sub = payload.get("sub")
        return UUID(sub) if sub else None
    except Exception:
        return None


OptionalUserID = Annotated[UUID | None, Depends(_resolve_optional_user)]


# ── WebSocket auth ────────────────────────────────────────────────────────────

async def verify_ws_token(token: str) -> dict | None:
    """
    Verify a JWT passed as a query parameter in WebSocket upgrade.
    Returns the decoded payload or None if invalid.
    """
    if not token:
        return None
    try:
        payload = decode_token(token)
        if not payload.get("sub"):
            return None
        return payload
    except JWTError:
        logger.debug("WebSocket token verification failed")
        return None


# ── Role helpers ──────────────────────────────────────────────────────────────

def require_roles(*roles: str):
    """Dependency factory — raises 403 if user role is not in allowed set."""
    async def checker(user_id: CurrentUserID, db: AsyncSession = Depends(get_read_db)):
        from app.db.models import User
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or user.role.value not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return Depends(checker)
