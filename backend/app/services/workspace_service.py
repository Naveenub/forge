"""Workspace and Project CRUD service."""
from __future__ import annotations

import re
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Project, Workspace, WorkspaceMember, UserRole
from app.schemas.workspace import WorkspaceCreate, ProjectCreate


# ─────────────────────────────────────────────────────────────────────────────
# WorkspaceService
# ─────────────────────────────────────────────────────────────────────────────

class WorkspaceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── internal ──────────────────────────────────────────────────────────────

    async def _get(self, workspace_id: str | UUID) -> Workspace:
        ws = await self.db.get(Workspace, workspace_id)
        if not ws:
            raise HTTPException(status_code=404, detail="Workspace not found")
        return ws

    # ── public ────────────────────────────────────────────────────────────────

    async def list(self, owner_id: str | UUID) -> list[Workspace]:
        result = await self.db.execute(
            select(Workspace)
            .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id, isouter=True)
            .where(
                (Workspace.owner_id == owner_id) |
                (WorkspaceMember.user_id == owner_id)
            )
            .distinct()
        )
        return list(result.scalars())

    async def create(
        self,
        owner_id: str | UUID,
        name: str,
        description: Optional[str] = None,
        **_kwargs,                     # absorb extra keyword args from tests
    ) -> Workspace:
        if len(name.strip()) < 1:
            raise ValueError("Workspace name must not be empty")

        slug = re.sub(r"[^a-z0-9-]", "-", name.lower())[:50]
        ws = Workspace(
            owner_id=owner_id,
            name=name,
            slug=slug,
            description=description,
        )
        self.db.add(ws)
        await self.db.flush()

        # Owner is automatically a member with OWNER role
        member = WorkspaceMember(workspace_id=ws.id, user_id=owner_id, role=UserRole.OWNER)
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(ws)
        return ws

    async def get(self, workspace_id: str | UUID) -> Workspace:
        return await self._get(workspace_id)

    async def update(self, workspace_id: str | UUID, **fields) -> Workspace:
        ws = await self._get(workspace_id)
        for k, v in fields.items():
            if hasattr(ws, k):
                setattr(ws, k, v)
        await self.db.commit()
        await self.db.refresh(ws)
        return ws

    async def delete(self, workspace_id: str | UUID) -> None:
        ws = await self._get(workspace_id)
        await self.db.delete(ws)
        await self.db.commit()

    # ── backward-compat aliases ───────────────────────────────────────────────

    async def list_workspaces(self, owner_id: str | UUID) -> list[Workspace]:
        return await self.list(owner_id)

    async def get_workspace(self, workspace_id: str | UUID) -> Workspace:
        return await self.get(workspace_id)

    async def create_workspace(self, owner_id: str | UUID, data: WorkspaceCreate) -> Workspace:
        return await self.create(owner_id=owner_id, name=data.name, description=data.description)

    async def update_workspace(self, workspace_id: str | UUID, data: dict) -> Workspace:
        return await self.update(workspace_id, **data)

    async def delete_workspace(self, workspace_id: str | UUID) -> None:
        return await self.delete(workspace_id)


# ─────────────────────────────────────────────────────────────────────────────
# ProjectService
# ─────────────────────────────────────────────────────────────────────────────

class ProjectService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get(self, project_id: str | UUID) -> Project:
        proj = await self.db.get(Project, project_id)
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found")
        return proj

    async def list_for_workspace(self, workspace_id: str | UUID) -> list[Project]:
        result = await self.db.execute(
            select(Project).where(Project.workspace_id == workspace_id)
        )
        return list(result.scalars())

    async def create(
        self,
        workspace_id: str | UUID,
        name: str,
        description: Optional[str] = None,
        tech_stack: Optional[list] = None,
        created_by: Optional[str | UUID] = None,
        **_kwargs,
    ) -> Project:
        # verify workspace exists
        ws = await self.db.get(Workspace, workspace_id)
        if not ws:
            raise HTTPException(status_code=404, detail="Workspace not found")

        proj = Project(
            workspace_id=workspace_id,
            name=name,
            description=description,
            tech_stack=tech_stack or [],
            created_by=created_by or ws.owner_id,
        )
        self.db.add(proj)
        await self.db.flush()
        await self.db.commit()
        await self.db.refresh(proj)
        return proj

    async def get(self, project_id: str | UUID) -> Project:
        return await self._get(project_id)

    async def delete(self, project_id: str | UUID) -> None:
        proj = await self._get(project_id)
        await self.db.delete(proj)
        await self.db.commit()

    # ── backward-compat aliases ───────────────────────────────────────────────

    async def list_projects(self, workspace_id: str | UUID) -> list[Project]:
        return await self.list_for_workspace(workspace_id)

    async def get_project(self, project_id: str | UUID) -> Project:
        return await self.get(project_id)

    async def create_project(self, workspace_id: str | UUID, data: ProjectCreate, created_by=None) -> Project:
        return await self.create(
            workspace_id=workspace_id,
            name=data.name,
            description=data.description,
            tech_stack=data.tech_stack,
            created_by=created_by,
        )

    async def delete_project(self, project_id: str | UUID) -> None:
        return await self.delete(project_id)
