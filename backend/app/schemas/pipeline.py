"""Pydantic schemas for Pipeline, Approval, and Artifact endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PipelineCreate(BaseModel):
    name:         str | None = Field(None, max_length=200)
    requirements: str | None = None
    context:      dict[str, Any] | None = None


class PipelineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:            UUID
    project_id:    UUID
    version:       int
    status:        str
    current_stage: str | None = None
    started_at:    datetime | None = None
    completed_at:  datetime | None = None
    triggered_by:  UUID
    config:        dict[str, Any] = {}
    created_at:    datetime


class PipelineList(BaseModel):
    items: list[PipelineRead]
    total: int
    page:  int
    size:  int


class ApprovalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:            UUID
    pipeline_id:   UUID
    stage_id:      UUID
    requested_by:  UUID
    required_role: str
    status:        str
    decision:      str | None = None
    decided_by:    UUID | None = None
    decided_at:    datetime | None = None
    notes:         str | None = None
    created_at:    datetime


class ApprovalAction(BaseModel):
    comment: str | None = None


class ArtifactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:            UUID
    pipeline_id:   UUID
    stage_id:      UUID
    artifact_type: str
    name:          str
    content:       str | None = None
    checksum:      str | None = None
    version:       int
    is_immutable:  bool
    size_bytes:    int
    created_at:    datetime
