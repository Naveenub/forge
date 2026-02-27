"""Reusable FastAPI dependency functions."""
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.session import read_session_dep, write_session_dep

bearer = HTTPBearer(auto_error=False)


# ── DB sessions ───────────────────────────────────────────────────────────────

WriteDB = Annotated[AsyncSession, Depends(write_session_dep)]
ReadDB  = Annotated[AsyncSession, Depends(read_session_dep)]


# ── Current user ──────────────────────────────────────────────────────────────

async def _get_current_user_id(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> UUID:
    if not creds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_token(creds.credentials)
        uid = payload.get("sub")
        if not uid:
            raise ValueError
        return UUID(uid)
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


CurrentUserID = Annotated[UUID, Depends(_get_current_user_id)]


# ── Pagination ────────────────────────────────────────────────────────────────

class Pagination:
    def __init__(
        self,
        page: int  = Query(1,   ge=1,   description="Page number"),
        size: int  = Query(20,  ge=1,   le=100, description="Items per page"),
    ):
        self.page   = page
        self.size   = size
        self.offset = (page - 1) * size
        self.limit  = size


PaginationDep = Annotated[Pagination, Depends(Pagination)]


# ── Optional auth (public endpoints) ─────────────────────────────────────────

async def optional_user_id(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> UUID | None:
    if not creds:
        return None
    try:
        payload = decode_token(creds.credentials)
        uid = payload.get("sub")
        return UUID(uid) if uid else None
    except Exception:
        return None


OptionalUserID = Annotated[UUID | None, Depends(optional_user_id)]
