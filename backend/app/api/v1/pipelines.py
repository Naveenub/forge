"""Pipelines API — /api/v1/pipelines/ + approval + artifact sub-resources"""
from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserID
from app.core.database import get_read_db, get_write_db
from app.db.models import (
    ApprovalRequest,
    Artifact,
    Pipeline,
    PipelineStatus,
    Project,
)
from app.schemas.pipeline import (
    ApprovalAction,
    ApprovalRead,
    ArtifactRead,
    PipelineCreate,
    PipelineList,
    PipelineRead,
)

router = APIRouter()


# ── Pipelines ─────────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/pipelines", response_model=PipelineList)
async def list_pipelines(
    project_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user_id: CurrentUserID = None,
    db: AsyncSession = Depends(get_read_db),
):
    offset = (page - 1) * size
    q = select(Pipeline).where(Pipeline.project_id == project_id)

    total_q = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_q.scalar_one()

    result = await db.execute(q.order_by(desc(Pipeline.created_at)).offset(offset).limit(size))
    items = [PipelineRead.model_validate(p) for p in result.scalars()]
    return PipelineList(items=items, total=total, page=page, size=size)


@router.post("/projects/{project_id}/pipelines", response_model=PipelineRead, status_code=201)
async def create_pipeline(
    project_id: UUID,
    payload: PipelineCreate,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_write_db),
):
    proj_q = await db.execute(select(Project).where(Project.id == project_id))
    if not proj_q.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    pipeline = Pipeline(
        project_id=project_id,
        status=PipelineStatus.PENDING,
        triggered_by=user_id,
        config=payload.context or {},
    )
    db.add(pipeline)
    await db.commit()
    await db.refresh(pipeline)

    # Kick off pipeline orchestration in background
    asyncio.create_task(_run_pipeline(str(pipeline.id)))

    return PipelineRead.model_validate(pipeline)


async def _run_pipeline(pipeline_id: str) -> None:
    from app.agents.pipeline_engine import PipelineStateMachine
    from app.core.database import write_session
    async with write_session() as db:
        sm = PipelineStateMachine(pipeline_id, db)
        await sm.run()


@router.get("/{pipeline_id}", response_model=PipelineRead)
async def get_pipeline(
    pipeline_id: UUID,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_read_db),
):
    result = await db.execute(select(Pipeline).where(Pipeline.id == pipeline_id))
    pipeline = result.scalar_one_or_none()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return PipelineRead.model_validate(pipeline)


@router.post("/{pipeline_id}/cancel", response_model=PipelineRead)
async def cancel_pipeline(
    pipeline_id: UUID,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_write_db),
):
    result = await db.execute(select(Pipeline).where(Pipeline.id == pipeline_id))
    pipeline = result.scalar_one_or_none()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Not found")
    cancellable = (PipelineStatus.PENDING, PipelineStatus.RUNNING, PipelineStatus.WAITING_APPROVAL)
    if pipeline.status not in cancellable:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel pipeline in status '{pipeline.status}'",
        )
    pipeline.status = PipelineStatus.FAILED
    pipeline.completed_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(pipeline)
    return PipelineRead.model_validate(pipeline)


@router.post("/{pipeline_id}/retry", response_model=PipelineRead)
async def retry_pipeline(
    pipeline_id: UUID,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_write_db),
):
    result = await db.execute(select(Pipeline).where(Pipeline.id == pipeline_id))
    pipeline = result.scalar_one_or_none()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Not found")
    if pipeline.status not in (PipelineStatus.FAILED, PipelineStatus.REJECTED):
        raise HTTPException(
            status_code=400,
            detail="Only failed or rejected pipelines can be retried",
        )
    pipeline.status = PipelineStatus.PENDING
    pipeline.current_stage = None
    pipeline.started_at = None
    pipeline.completed_at = None
    await db.commit()
    await db.refresh(pipeline)
    asyncio.create_task(_run_pipeline(str(pipeline.id)))
    return PipelineRead.model_validate(pipeline)


# ── Approvals ─────────────────────────────────────────────────────────────────

@router.get("/approvals/pending", response_model=list[ApprovalRead])
async def list_pending_approvals(
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_read_db),
):
    result = await db.execute(
        select(ApprovalRequest)
        .where(ApprovalRequest.status == "pending")
        .order_by(desc(ApprovalRequest.created_at))
    )
    return [ApprovalRead.model_validate(a) for a in result.scalars()]


@router.post("/approvals/{approval_id}/approve", response_model=ApprovalRead)
async def approve(
    approval_id: UUID,
    payload: ApprovalAction,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_write_db),
):
    return await _decide(db, approval_id, user_id, "approved", payload.comment)


@router.post("/approvals/{approval_id}/reject", response_model=ApprovalRead)
async def reject(
    approval_id: UUID,
    payload: ApprovalAction,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_write_db),
):
    return await _decide(db, approval_id, user_id, "rejected", payload.comment)


async def _decide(
    db: AsyncSession,
    approval_id: UUID,
    user_id: UUID,
    decision: str,
    comment: str | None,
) -> ApprovalRead:
    result = await db.execute(select(ApprovalRequest).where(ApprovalRequest.id == approval_id))
    approval = result.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != "pending":
        raise HTTPException(status_code=400, detail="Approval already decided")

    approval.decision   = decision
    approval.status     = decision
    approval.decided_by = user_id
    approval.decided_at = datetime.now(UTC)
    approval.notes      = comment

    if decision == "rejected":
        pipe_q = await db.execute(select(Pipeline).where(Pipeline.id == approval.pipeline_id))
        pipeline = pipe_q.scalar_one_or_none()
        if pipeline:
            pipeline.status = PipelineStatus.REJECTED
            pipeline.completed_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(approval)
    return ApprovalRead.model_validate(approval)


# ── Artifacts ─────────────────────────────────────────────────────────────────

@router.get("/{pipeline_id}/artifacts", response_model=list[ArtifactRead])
async def list_artifacts(
    pipeline_id: UUID,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_read_db),
):
    result = await db.execute(
        select(Artifact).where(Artifact.pipeline_id == pipeline_id)
        .order_by(Artifact.created_at)
    )
    return [ArtifactRead.model_validate(a) for a in result.scalars()]
