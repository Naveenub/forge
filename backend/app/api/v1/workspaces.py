"""Workspaces API — /api/v1/workspaces/"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserID
from app.core.database import get_write_db, get_read_db
from app.db.models import Workspace, WorkspaceMember, Project, UserRole
from app.schemas.workspace import WorkspaceCreate, WorkspaceRead

router = APIRouter()


@router.get("", response_model=list[WorkspaceRead])
async def list_workspaces(
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_read_db),
):
    """Return all workspaces the current user owns or is a member of."""
    result = await db.execute(
        select(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id, isouter=True)
        .where(
            (Workspace.owner_id == user_id) |
            (WorkspaceMember.user_id == user_id)
        )
        .distinct()
    )
    workspaces = list(result.scalars())

    out = []
    for ws in workspaces:
        count_result = await db.execute(
            select(func.count()).where(Project.workspace_id == ws.id)
        )
        out.append(WorkspaceRead(
            id=ws.id,
            name=ws.name,
            description=ws.description,
            owner_id=ws.owner_id,
            created_at=ws.created_at,
            project_count=count_result.scalar_one(),
        ))
    return out


@router.post("", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    payload: WorkspaceCreate,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_write_db),
):
    import re
    slug = re.sub(r"[^a-z0-9-]", "-", payload.name.lower())[:50]
    ws = Workspace(owner_id=user_id, name=payload.name, slug=slug, description=payload.description)
    db.add(ws)
    # Owner is also a member with OWNER role
    await db.flush()
    member = WorkspaceMember(workspace_id=ws.id, user_id=user_id, role=UserRole.OWNER)
    db.add(member)
    await db.commit()
    await db.refresh(ws)
    return WorkspaceRead(
        id=ws.id, name=ws.name, description=ws.description,
        owner_id=ws.owner_id, created_at=ws.created_at, project_count=0,
    )


@router.get("/{workspace_id}", response_model=WorkspaceRead)
async def get_workspace(
    workspace_id: UUID,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_read_db),
):
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    count_result = await db.execute(select(func.count()).where(Project.workspace_id == ws.id))
    return WorkspaceRead(
        id=ws.id, name=ws.name, description=ws.description,
        owner_id=ws.owner_id, created_at=ws.created_at,
        project_count=count_result.scalar_one(),
    )


@router.patch("/{workspace_id}", response_model=WorkspaceRead)
async def update_workspace(
    workspace_id: UUID,
    payload: WorkspaceCreate,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_write_db),
):
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Not found")
    if ws.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only the owner can update this workspace")
    ws.name = payload.name
    ws.description = payload.description
    await db.commit()
    await db.refresh(ws)
    return WorkspaceRead(
        id=ws.id, name=ws.name, description=ws.description,
        owner_id=ws.owner_id, created_at=ws.created_at, project_count=0,
    )


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: UUID,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_write_db),
):
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Not found")
    if ws.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this workspace")
    await db.delete(ws)
    await db.commit()
