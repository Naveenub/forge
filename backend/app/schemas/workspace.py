"""Pydantic schemas for Workspace and Project endpoints."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceCreate(BaseModel):
    name:        str  = Field(..., min_length=1, max_length=80)
    description: str | None = None


class WorkspaceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:            UUID
    name:          str
    description:   str | None = None
    owner_id:      UUID
    project_count: int = 0
    created_at:    datetime


class ProjectCreate(BaseModel):
    name:        str = Field(..., min_length=1, max_length=120)
    description: str | None = None
    tech_stack:  list[str] | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:             UUID
    workspace_id:   UUID
    name:           str
    description:    str | None = None
    tech_stack:     list[str] = []
    pipeline_count: int = 0
    created_at:     datetime
