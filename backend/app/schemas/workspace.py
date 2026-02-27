"""Pydantic schemas for Workspace and Project endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceCreate(BaseModel):
    name:        str  = Field(..., min_length=1, max_length=80)
    description: Optional[str] = None


class WorkspaceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:            UUID
    name:          str
    description:   Optional[str] = None
    owner_id:      UUID
    project_count: int = 0
    created_at:    datetime


class ProjectCreate(BaseModel):
    name:        str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = None
    tech_stack:  Optional[List[str]] = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:             UUID
    workspace_id:   UUID
    name:           str
    description:    Optional[str] = None
    tech_stack:     List[str] = []
    pipeline_count: int = 0
    created_at:     datetime
