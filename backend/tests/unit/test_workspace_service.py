"""Unit tests for WorkspaceService and ProjectService."""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest


class TestWorkspaceService:

    @pytest.fixture
    def mock_session(self):
        session = AsyncMock()
        session.execute = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()
        session.delete = AsyncMock()
        session.get = AsyncMock()
        return session

    def _make_workspace(self):
        ws = MagicMock()
        ws.id = uuid.uuid4()
        ws.name = "Platform Team"
        ws.slug = "platform-team"
        ws.owner_id = uuid.uuid4()
        ws.description = None
        return ws

    @pytest.mark.asyncio
    async def test_create_workspace(self, mock_session):
        owner_id = str(uuid.uuid4())
        from app.services.workspace_service import WorkspaceService
        svc = WorkspaceService(mock_session)

        ws = await svc.create(owner_id=owner_id, name="Backend Team")

        assert ws is not None
        assert mock_session.add.call_count >= 1   # workspace + member
        mock_session.flush.assert_awaited()

    @pytest.mark.asyncio
    async def test_create_workspace_name_too_short(self, mock_session):
        from app.services.workspace_service import WorkspaceService
        svc = WorkspaceService(mock_session)

        with pytest.raises((ValueError, Exception)):
            await svc.create(owner_id=str(uuid.uuid4()), name="")

    @pytest.mark.asyncio
    async def test_list_workspaces(self, mock_session):
        workspaces = [self._make_workspace() for _ in range(3)]
        result_mock = MagicMock()
        result_mock.scalars.return_value.__iter__ = MagicMock(return_value=iter(workspaces))
        mock_session.execute.return_value = result_mock

        from app.services.workspace_service import WorkspaceService
        svc = WorkspaceService(mock_session)

        result = await svc.list(owner_id=str(uuid.uuid4()))
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_get_workspace(self, mock_session):
        ws = self._make_workspace()
        mock_session.get.return_value = ws

        from app.services.workspace_service import WorkspaceService
        svc = WorkspaceService(mock_session)

        result = await svc.get(str(ws.id))
        assert result is ws

    @pytest.mark.asyncio
    async def test_get_nonexistent_workspace_raises(self, mock_session):
        from fastapi import HTTPException
        mock_session.get.return_value = None

        from app.services.workspace_service import WorkspaceService
        svc = WorkspaceService(mock_session)

        with pytest.raises(HTTPException) as exc_info:
            await svc.get(str(uuid.uuid4()))

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_workspace(self, mock_session):
        ws = self._make_workspace()
        mock_session.get.return_value = ws

        from app.services.workspace_service import WorkspaceService
        svc = WorkspaceService(mock_session)

        await svc.delete(str(ws.id))
        mock_session.delete.assert_awaited_once_with(ws)
        mock_session.commit.assert_awaited()


class TestProjectService:

    @pytest.fixture
    def mock_session(self):
        session = AsyncMock()
        session.execute = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()
        session.delete = AsyncMock()
        session.get = AsyncMock()
        return session

    def _make_project(self):
        p = MagicMock()
        p.id = uuid.uuid4()
        p.name = "E-Commerce Platform"
        p.workspace_id = uuid.uuid4()
        p.status = "draft"
        return p

    @pytest.mark.asyncio
    async def test_create_project(self, mock_session):
        workspace_id = str(uuid.uuid4())
        ws_mock = MagicMock()
        ws_mock.owner_id = uuid.uuid4()
        mock_session.get.return_value = ws_mock  # workspace exists

        from app.services.workspace_service import ProjectService
        svc = ProjectService(mock_session)

        proj = await svc.create(workspace_id=workspace_id, name="My New Service")

        assert proj is not None
        mock_session.add.assert_called_once()

    @pytest.mark.asyncio
    async def test_list_projects_for_workspace(self, mock_session):
        projects = [self._make_project() for _ in range(4)]
        result_mock = MagicMock()
        result_mock.scalars.return_value.__iter__ = MagicMock(return_value=iter(projects))
        mock_session.execute.return_value = result_mock

        from app.services.workspace_service import ProjectService
        svc = ProjectService(mock_session)

        result = await svc.list_for_workspace(str(uuid.uuid4()))
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_delete_project(self, mock_session):
        proj = self._make_project()
        mock_session.get.return_value = proj

        from app.services.workspace_service import ProjectService
        svc = ProjectService(mock_session)

        await svc.delete(str(proj.id))
        mock_session.delete.assert_awaited_once_with(proj)
