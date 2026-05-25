"""Pipeline orchestration service — creates, queries, and governs pipelines."""
from __future__ import annotations

import asyncio
from datetime import datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ApprovalRequest, Artifact, Pipeline, PipelineStatus


class PipelineService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── CRUD ──────────────────────────────────────────────────────────────────

    async def create(self, project_id: str | UUID, triggered_by: str | UUID) -> Pipeline:
        from app.db.models import Project
        proj = await self.db.get(Project, project_id)
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found")

        pipeline = Pipeline(
            project_id=project_id,
            triggered_by=triggered_by,
            status=PipelineStatus.PENDING,
        )
        self.db.add(pipeline)
        await self.db.flush()
        await self.db.commit()
        await self.db.refresh(pipeline)

        # Non-blocking kick-off
        asyncio.create_task(self._start_orchestrator(str(pipeline.id)))
        return pipeline

    async def _start_orchestrator(self, pipeline_id: str) -> None:
        from app.agents.pipeline_engine import PipelineStateMachine
        from app.core.database import write_session
        async with write_session() as db:
            sm = PipelineStateMachine(pipeline_id, db)
            await sm.run()

    async def get(self, pipeline_id: str | UUID) -> Pipeline:
        pipeline = await self.db.get(Pipeline, pipeline_id)
        if not pipeline:
            raise HTTPException(status_code=404, detail="Pipeline not found")
        return pipeline

    async def list_for_project(
        self,
        project_id: str | UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Pipeline]:
        result = await self.db.execute(
            select(Pipeline)
            .where(Pipeline.project_id == project_id)
            .order_by(desc(Pipeline.created_at))
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars())

    async def cancel(self, pipeline_id: str | UUID) -> Pipeline:
        pipeline = await self.get(pipeline_id)
        if pipeline.status not in (
            PipelineStatus.PENDING, PipelineStatus.RUNNING, PipelineStatus.WAITING_APPROVAL
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cannot cancel pipeline in status '{pipeline.status}'"
                    " — only pending/running/waiting can be cancelled"
                ),
            )
        pipeline.status = PipelineStatus.CANCELLED  # type: ignore[assignment]
        pipeline.completed_at = datetime.utcnow()  # type: ignore[assignment]
        await self.db.commit()
        await self.db.refresh(pipeline)
        return pipeline

    async def retry(self, pipeline_id: str | UUID) -> Pipeline:
        pipeline = await self.get(pipeline_id)
        retriable = (PipelineStatus.FAILED, PipelineStatus.REJECTED, PipelineStatus.CANCELLED)
        if pipeline.status not in retriable:
            raise HTTPException(
                status_code=400,
                detail="Only failed or rejected pipelines can be retried",
            )
        pipeline.status = PipelineStatus.PENDING  # type: ignore[assignment]
        pipeline.current_stage = None  # type: ignore[assignment]
        pipeline.started_at = None  # type: ignore[assignment]
        pipeline.completed_at = None  # type: ignore[assignment]
        await self.db.commit()
        await self.db.refresh(pipeline)
        asyncio.create_task(self._start_orchestrator(str(pipeline.id)))
        return pipeline

    # ── Approvals ─────────────────────────────────────────────────────────────

    async def list_pending_approvals(self) -> list[ApprovalRequest]:
        result = await self.db.execute(
            select(ApprovalRequest)
            .where(ApprovalRequest.status == "pending")
            .order_by(desc(ApprovalRequest.created_at))
        )
        return list(result.scalars())

    async def approve(
        self,
        approval_id: str | UUID,
        decided_by: str | UUID,
        comment: str | None = None,
    ) -> ApprovalRequest:
        return await self._decide(approval_id, decided_by, "approved", comment)

    async def reject(
        self,
        approval_id: str | UUID,
        decided_by: str | UUID,
        comment: str | None = None,
    ) -> ApprovalRequest:
        return await self._decide(approval_id, decided_by, "rejected", comment)

    async def _decide(
        self,
        approval_id: str | UUID,
        decided_by: str | UUID,
        decision: str,
        comment: str | None,
    ) -> ApprovalRequest:
        approval = await self.db.get(ApprovalRequest, approval_id)
        if not approval:
            raise HTTPException(status_code=404, detail="Approval not found")
        if approval.status != "pending":
            raise HTTPException(status_code=400, detail="Approval already decided")

        approval.status     = decision  # type: ignore[assignment]
        approval.decision   = decision  # type: ignore[assignment]
        approval.decided_by = decided_by  # type: ignore[assignment]
        approval.decided_at = datetime.utcnow()  # type: ignore[assignment]
        approval.notes      = comment  # type: ignore[assignment]

        if decision == "rejected":
            pipeline = await self.db.get(Pipeline, approval.pipeline_id)
            if pipeline:
                pipeline.status = PipelineStatus.REJECTED  # type: ignore[assignment]
                pipeline.completed_at = datetime.utcnow()  # type: ignore[assignment]

        await self.db.commit()
        await self.db.refresh(approval)
        return approval

    # ── Artifacts ─────────────────────────────────────────────────────────────

    async def list_artifacts(self, pipeline_id: str | UUID) -> list[Artifact]:
        result = await self.db.execute(
            select(Artifact)
            .where(Artifact.pipeline_id == pipeline_id)
            .order_by(Artifact.created_at)
        )
        return list(result.scalars())