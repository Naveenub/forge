"""Pydantic schemas for Pipeline, Approval, and Artifact endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PipelineCreate(BaseModel):
    name:         Optional[str] = Field(None, max_length=200)
    requirements: Optional[str] = None
    context:      Optional[Dict[str, Any]] = None


class PipelineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:            UUID
    project_id:    UUID
    version:       int
    status:        str
    current_stage: Optional[str] = None
    started_at:    Optional[datetime] = None
    completed_at:  Optional[datetime] = None
    triggered_by:  UUID
    config:        Dict[str, Any] = {}
    created_at:    datetime


class PipelineList(BaseModel):
    items: List[PipelineRead]
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
    decision:      Optional[str] = None
    decided_by:    Optional[UUID] = None
    decided_at:    Optional[datetime] = None
    notes:         Optional[str] = None
    created_at:    datetime


class ApprovalAction(BaseModel):
    comment: Optional[str] = None


class ArtifactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:            UUID
    pipeline_id:   UUID
    stage_id:      UUID
    artifact_type: str
    name:          str
    content:       Optional[str] = None
    checksum:      Optional[str] = None
    version:       int
    is_immutable:  bool
    size_bytes:    int
    created_at:    datetime
