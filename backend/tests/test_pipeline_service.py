"""
Unit tests for PipelineService.
Validates creation, state transitions, approval gating, and cancellation.
"""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.models import PipelineStatus


class TestPipelineService:

    @pytest.fixture
    def mock_session(self):
        session = AsyncMock()
        session.execute = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()
        session.get = AsyncMock()
        return session

    def _make_pipeline(self, status=PipelineStatus.RUNNING):
        p = MagicMock()
        p.id = uuid.uuid4()
        p.project_id = uuid.uuid4()
        p.status = status
        p.current_stage = "architecture"
        p.created_at = __import__("datetime").datetime.utcnow()
        return p

    def _make_approval(self, status="pending"):
        a = MagicMock()
        a.id = uuid.uuid4()
        a.status = status
        a.pipeline_id = uuid.uuid4()
        return a

    # ── create ────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_create_pipeline(self, mock_session):
        project_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())

        # db.get(Project, ...) returns a mock project
        project_mock = MagicMock()
        project_mock.id = project_id
        mock_session.get.return_value = project_mock

        from app.services.pipeline_service import PipelineService
        svc = PipelineService(mock_session)

        with patch("asyncio.create_task"):
            pipeline = await svc.create(project_id=project_id, triggered_by=user_id)

        assert pipeline is not None
        mock_session.add.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_pipeline_missing_project(self, mock_session):
        from fastapi import HTTPException
        mock_session.get.return_value = None  # project not found

        from app.services.pipeline_service import PipelineService
        svc = PipelineService(mock_session)

        with pytest.raises(HTTPException) as exc_info:
            await svc.create(project_id=str(uuid.uuid4()), triggered_by="user")

        assert exc_info.value.status_code == 404

    # ── cancel ────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_cancel_running_pipeline(self, mock_session):
        pipeline = self._make_pipeline(status=PipelineStatus.RUNNING)
        mock_session.get.return_value = pipeline

        from app.services.pipeline_service import PipelineService
        svc = PipelineService(mock_session)

        result = await svc.cancel(str(pipeline.id))
        # cancel sets status to FAILED (with completed_at)
        assert result.status == PipelineStatus.FAILED

    @pytest.mark.asyncio
    async def test_cancel_pending_pipeline(self, mock_session):
        pipeline = self._make_pipeline(status=PipelineStatus.PENDING)
        mock_session.get.return_value = pipeline

        from app.services.pipeline_service import PipelineService
        svc = PipelineService(mock_session)

        result = await svc.cancel(str(pipeline.id))
        assert result.status == PipelineStatus.FAILED

    @pytest.mark.asyncio
    async def test_cancel_completed_pipeline_raises(self, mock_session):
        from fastapi import HTTPException
        pipeline = self._make_pipeline(status=PipelineStatus.COMPLETED)
        mock_session.get.return_value = pipeline

        from app.services.pipeline_service import PipelineService
        svc = PipelineService(mock_session)

        with pytest.raises(HTTPException) as exc_info:
            await svc.cancel(str(pipeline.id))

        assert exc_info.value.status_code == 400

    # ── approvals ─────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_approve_gate(self, mock_session):
        approval = self._make_approval(status="pending")
        mock_session.get.side_effect = [approval, None]  # approval, then pipeline lookup

        from app.services.pipeline_service import PipelineService
        svc = PipelineService(mock_session)

        result = await svc.approve(
            approval_id=str(approval.id),
            decided_by="user-123",
            comment="LGTM",
        )

        assert result.status == "approved"
        assert result.decision == "approved"

    @pytest.mark.asyncio
    async def test_reject_gate(self, mock_session):
        approval = self._make_approval(status="pending")
        pipeline = self._make_pipeline(status=PipelineStatus.WAITING_APPROVAL)
        mock_session.get.side_effect = [approval, pipeline]

        from app.services.pipeline_service import PipelineService
        svc = PipelineService(mock_session)

        result = await svc.reject(
            approval_id=str(approval.id),
            decided_by="user-123",
            comment="Security issues found",
        )

        assert result.status == "rejected"
        assert result.decision == "rejected"

    @pytest.mark.asyncio
    async def test_approve_already_decided_raises(self, mock_session):
        from fastapi import HTTPException
        approval = self._make_approval(status="approved")
        mock_session.get.return_value = approval

        from app.services.pipeline_service import PipelineService
        svc = PipelineService(mock_session)

        with pytest.raises(HTTPException) as exc_info:
            await svc.approve(str(approval.id), "user", None)

        assert exc_info.value.status_code == 400

    # ── list / get ────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_list_for_project(self, mock_session):
        pipelines = [self._make_pipeline() for _ in range(3)]
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = pipelines  # not used
        result_mock.scalars.return_value.__iter__ = MagicMock(return_value=iter(pipelines))
        mock_session.execute.return_value = result_mock

        from app.services.pipeline_service import PipelineService
        svc = PipelineService(mock_session)

        result = await svc.list_for_project(project_id=str(uuid.uuid4()))
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_get_nonexistent_pipeline_raises(self, mock_session):
        from fastapi import HTTPException
        mock_session.get.return_value = None

        from app.services.pipeline_service import PipelineService
        svc = PipelineService(mock_session)

        with pytest.raises(HTTPException) as exc_info:
            await svc.get(str(uuid.uuid4()))

        assert exc_info.value.status_code == 404
