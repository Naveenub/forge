"""Agents API — /api/v1/agents/ — live status of all 15 agents"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserID
from app.core.database import get_read_db
from app.db.models import AgentDomain, AgentLevel, PipelineStage, PipelineStatus

router = APIRouter()

_AGENT_CATALOG = [
    # (domain, level, display_name)
    (AgentDomain.ARCHITECTURE, AgentLevel.EXECUTION, "Architect Agent"),
    (AgentDomain.ARCHITECTURE, AgentLevel.REVIEW,    "Senior Architect Agent"),
    (AgentDomain.ARCHITECTURE, AgentLevel.APPROVAL,  "Architecture Approval Agent"),
    (AgentDomain.DEVELOPMENT,  AgentLevel.EXECUTION, "Developer Agent"),
    (AgentDomain.DEVELOPMENT,  AgentLevel.REVIEW,    "Senior Developer Agent"),
    (AgentDomain.DEVELOPMENT,  AgentLevel.APPROVAL,  "Development Manager Agent"),
    (AgentDomain.TESTING,      AgentLevel.EXECUTION, "Tester Agent"),
    (AgentDomain.TESTING,      AgentLevel.REVIEW,    "Senior Tester Agent"),
    (AgentDomain.TESTING,      AgentLevel.APPROVAL,  "QA Manager Agent"),
    (AgentDomain.SECURITY,     AgentLevel.EXECUTION, "Security Engineer Agent"),
    (AgentDomain.SECURITY,     AgentLevel.REVIEW,    "Senior Security Agent"),
    (AgentDomain.SECURITY,     AgentLevel.APPROVAL,  "Security Manager Agent"),
    (AgentDomain.DEVOPS,       AgentLevel.EXECUTION, "Cloud Engineer Agent"),
    (AgentDomain.DEVOPS,       AgentLevel.REVIEW,    "Cloud Team Lead Agent"),
    (AgentDomain.DEVOPS,       AgentLevel.APPROVAL,  "Cloud Manager Agent"),
]


@router.get("", summary="List all 15 agents with live status")
async def list_agents(
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_read_db),
):
    # Find any currently-running stages to overlay live status
    running_q = await db.execute(
        select(PipelineStage).where(
            PipelineStage.status == PipelineStatus.RUNNING
        )
    )
    running_stages = {
        (s.agent_domain, s.agent_level): s for s in running_q.scalars()
    }

    agents = []
    for domain, level, name in _AGENT_CATALOG:
        stage = running_stages.get((domain, level))
        agents.append({
            "id":           f"{domain.value}-{level.value}",
            "name":         name,
            "domain":       domain.value,
            "level":        level.value,
            "status":       "running" if stage else "idle",
            "pipeline_id":  str(stage.pipeline_id) if stage else None,
            "started_at":   stage.started_at.isoformat() if stage and stage.started_at else None,
            "model":        "claude-opus-4-6",
            "max_tokens":   8192,
            "timeout_s":    300,
        })

    return agents


@router.get("/status", summary="Aggregate agent pool status")
async def agent_status(user_id: CurrentUserID, db: AsyncSession = Depends(get_read_db)):
    running_q = await db.execute(
        select(PipelineStage).where(PipelineStage.status == PipelineStatus.RUNNING)
    )
    running = list(running_q.scalars())
    return {
        "total":   len(_AGENT_CATALOG),
        "running": len(running),
        "idle":    len(_AGENT_CATALOG) - len(running),
        "model":   "claude-opus-4-6",
    }
