"""Projects API — /api/v1/projects/ and /api/v1/workspaces/{id}/projects/"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserID
from app.core.database import get_write_db, get_read_db
from app.db.models import Project, Pipeline, Workspace
from app.schemas.workspace import ProjectCreate, ProjectRead

router = APIRouter()


def _to_read(p: Project, pipeline_count: int = 0) -> ProjectRead:
    return ProjectRead(
        id=p.id,
        workspace_id=p.workspace_id,
        name=p.name,
        description=p.description,
        tech_stack=p.tech_stack or [],
        pipeline_count=pipeline_count,
        created_at=p.created_at,
    )


@router.get("/workspaces/{workspace_id}/projects", response_model=list[ProjectRead])
async def list_projects(
    workspace_id: UUID,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_read_db),
):
    result = await db.execute(select(Project).where(Project.workspace_id == workspace_id))
    projects = list(result.scalars())

    out = []
    for proj in projects:
        cnt = await db.execute(select(func.count()).where(Pipeline.project_id == proj.id))
        out.append(_to_read(proj, cnt.scalar_one()))
    return out


@router.post("/workspaces/{workspace_id}/projects", response_model=ProjectRead, status_code=201)
async def create_project(
    workspace_id: UUID,
    payload: ProjectCreate,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_write_db),
):
    # Verify workspace exists
    ws_result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    if not ws_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Workspace not found")

    proj = Project(
        workspace_id=workspace_id,
        name=payload.name,
        description=payload.description,
        tech_stack=payload.tech_stack or [],
        created_by=user_id,
    )
    db.add(proj)
    await db.commit()
    await db.refresh(proj)
    return _to_read(proj)


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: UUID,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_read_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    proj = result.scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    cnt = await db.execute(select(func.count()).where(Pipeline.project_id == proj.id))
    return _to_read(proj, cnt.scalar_one())


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: UUID,
    payload: ProjectCreate,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_write_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    proj = result.scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Not found")
    proj.name = payload.name
    proj.description = payload.description
    proj.tech_stack = payload.tech_stack or proj.tech_stack
    await db.commit()
    await db.refresh(proj)
    return _to_read(proj)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_write_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    proj = result.scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(proj)
    await db.commit()
