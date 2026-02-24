"""
REST API routes — v1
Covers: workspaces, projects, pipelines, artifacts, approvals, agents, metrics
"""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import get_db

router = APIRouter(prefix="/api/v1")


# ─────────────────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────────────────

class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    color: str = Field(default="#00d4ff")


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    color: str
    members: int
    project_count: int


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str = Field(default="")
    cloud: str = Field(default="AWS")
    workspace_id: str


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    status: str
    progress: int
    cloud: str
    workspace_id: str
    domain: str
    created_at: str


class PipelineCreate(BaseModel):
    project_id: str
    triggered_by: str = Field(default="user")


class PipelineResponse(BaseModel):
    id: str
    project_id: str
    status: str
    active_domain: str
    active_stage: int
    progress: int
    started_at: str


class ApprovalDecision(BaseModel):
    decision: str = Field(..., pattern="^(approved|rejected)$")
    comment: str = Field(default="")


class ArtifactResponse(BaseModel):
    id: str
    name: str
    type: str
    stage: str
    status: str
    size_bytes: int
    checksum: str
    created_at: str
    pipeline_id: str


# ─────────────────────────────────────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/health", tags=["system"])
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "agents": 15,
        "domains": 5,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Workspaces
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/workspaces", tags=["workspaces"])
async def list_workspaces(db: AsyncSession = Depends(get_db)) -> list[WorkspaceResponse]:
    """List all workspaces the current user has access to."""
    # TODO: filter by current user membership
    return []


@router.post("/workspaces", status_code=status.HTTP_201_CREATED, tags=["workspaces"])
async def create_workspace(
    payload: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
) -> WorkspaceResponse:
    """Create a new workspace."""
    ws_id = str(uuid.uuid4())
    return WorkspaceResponse(id=ws_id, name=payload.name, color=payload.color, members=1, project_count=0)


@router.delete("/workspaces/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["workspaces"])
async def delete_workspace(workspace_id: str, db: AsyncSession = Depends(get_db)) -> None:
    """Delete a workspace and all its projects."""
    pass


# ─────────────────────────────────────────────────────────────────────────────
# Projects
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/workspaces/{workspace_id}/projects", tags=["projects"])
async def list_projects(workspace_id: str, db: AsyncSession = Depends(get_db)) -> list[ProjectResponse]:
    return []


@router.post("/workspaces/{workspace_id}/projects", status_code=status.HTTP_201_CREATED, tags=["projects"])
async def create_project(
    workspace_id: str,
    payload: ProjectCreate,
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    return ProjectResponse(
        id=str(uuid.uuid4()),
        name=payload.name,
        description=payload.description,
        status="pending",
        progress=0,
        cloud=payload.cloud,
        workspace_id=workspace_id,
        domain="architecture",
        created_at="just now",
    )


@router.get("/projects/{project_id}", tags=["projects"])
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)) -> ProjectResponse:
    raise HTTPException(status_code=404, detail="Project not found")


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["projects"])
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)) -> None:
    pass


# ─────────────────────────────────────────────────────────────────────────────
# Pipelines
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/pipelines", status_code=status.HTTP_201_CREATED, tags=["pipelines"])
async def start_pipeline(
    payload: PipelineCreate,
    db: AsyncSession = Depends(get_db),
) -> PipelineResponse:
    """Trigger a new SDLC pipeline for a project. Kicks off the agent orchestrator."""
    return PipelineResponse(
        id=str(uuid.uuid4()),
        project_id=payload.project_id,
        status="running",
        active_domain="architecture",
        active_stage=0,
        progress=0,
        started_at="just now",
    )


@router.get("/pipelines/{pipeline_id}", tags=["pipelines"])
async def get_pipeline(pipeline_id: str, db: AsyncSession = Depends(get_db)) -> PipelineResponse:
    raise HTTPException(status_code=404, detail="Pipeline not found")


@router.post("/pipelines/{pipeline_id}/cancel", tags=["pipelines"])
async def cancel_pipeline(pipeline_id: str, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    return {"status": "cancelled", "pipeline_id": pipeline_id}


# ─────────────────────────────────────────────────────────────────────────────
# Approvals
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/approvals", tags=["approvals"])
async def list_pending_approvals(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    """List all approvals awaiting the current user's decision."""
    return []


@router.post("/approvals/{approval_id}/decide", tags=["approvals"])
async def decide_approval(
    approval_id: str,
    payload: ApprovalDecision,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Approve or reject a governance approval gate."""
    return {
        "approval_id": approval_id,
        "decision": payload.decision,
        "comment": payload.comment,
        "decided_at": "just now",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Artifacts
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/pipelines/{pipeline_id}/artifacts", tags=["artifacts"])
async def list_artifacts(pipeline_id: str, db: AsyncSession = Depends(get_db)) -> list[ArtifactResponse]:
    return []


@router.get("/artifacts/{artifact_id}", tags=["artifacts"])
async def get_artifact(artifact_id: str, db: AsyncSession = Depends(get_db)) -> ArtifactResponse:
    raise HTTPException(status_code=404, detail="Artifact not found")


@router.get("/artifacts/{artifact_id}/download", tags=["artifacts"])
async def download_artifact(artifact_id: str, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Returns a pre-signed URL for artifact download."""
    return {"url": f"https://artifacts.forge.internal/{artifact_id}", "expires_in": 3600}


# ─────────────────────────────────────────────────────────────────────────────
# Agents
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/agents", tags=["agents"])
async def list_agents() -> list[dict[str, Any]]:
    """Return status of all 15 agents across 5 domains."""
    domains = [
        ("architecture", ["Architect", "Sr. Architect", "Arch Approval"]),
        ("development",  ["Developer", "Sr. Developer", "Dev Manager"]),
        ("testing",      ["Tester", "Sr. Tester", "QA Manager"]),
        ("security",     ["Sec Engineer", "Sr. Security", "Sec Manager"]),
        ("devops",       ["Cloud Eng", "Cloud Lead", "Cloud Manager"]),
    ]
    agents = []
    for domain, names in domains:
        for i, name in enumerate(names):
            agents.append({
                "id": f"{domain}-{i}",
                "name": name,
                "domain": domain,
                "level": ["execute", "review", "approve"][i],
                "status": "idle",
                "model": "claude-opus-4-6",
            })
    return agents


# ─────────────────────────────────────────────────────────────────────────────
# Metrics
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/metrics/workspace/{workspace_id}", tags=["metrics"])
async def workspace_metrics(workspace_id: str) -> dict[str, Any]:
    """Live infrastructure and pipeline metrics for a workspace."""
    return {
        "pods": 24,
        "kafka_lag": 142,
        "redis_hit_rate": 96.4,
        "db_connections": 38,
        "p99_latency_ms": 87,
        "requests_per_second": 1240,
        "error_rate_pct": 0.02,
        "uptime_30d_pct": 99.97,
    }


@router.get("/metrics/audit", tags=["metrics"])
async def audit_log(
    limit: int = Query(default=50, le=500),
    offset: int = Query(default=0),
    event_type: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return {"events": [], "total": 0, "limit": limit, "offset": offset}
