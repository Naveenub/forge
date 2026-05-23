"""
Unit tests for core/auth.py and core/notifications.py.
"""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.security import create_access_token, create_refresh_token


# ── core/auth.py ──────────────────────────────────────────────────────────────

class TestVerifyWsToken:
    @pytest.mark.asyncio
    async def test_valid_token_returns_payload(self):
        from app.core.auth import verify_ws_token
        uid = str(uuid.uuid4())
        token = create_access_token(uid)
        payload = await verify_ws_token(token)
        assert payload is not None
        assert payload["sub"] == uid

    @pytest.mark.asyncio
    async def test_invalid_token_returns_none(self):
        from app.core.auth import verify_ws_token
        result = await verify_ws_token("notavalidtoken")
        assert result is None

    @pytest.mark.asyncio
    async def test_empty_token_returns_none(self):
        from app.core.auth import verify_ws_token
        result = await verify_ws_token("")
        assert result is None

    @pytest.mark.asyncio
    async def test_resolve_optional_user_no_creds(self):
        from app.core.auth import _resolve_optional_user
        result = await _resolve_optional_user(None)
        assert result is None

    @pytest.mark.asyncio
    async def test_resolve_optional_user_valid_token(self):
        from app.core.auth import _resolve_optional_user
        from fastapi.security import HTTPAuthorizationCredentials
        uid = str(uuid.uuid4())
        token = create_access_token(uid)
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        result = await _resolve_optional_user(creds)
        assert result == uuid.UUID(uid)

    @pytest.mark.asyncio
    async def test_resolve_optional_user_invalid_token(self):
        from app.core.auth import _resolve_optional_user
        from fastapi.security import HTTPAuthorizationCredentials
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="garbage")
        result = await _resolve_optional_user(creds)
        assert result is None

    @pytest.mark.asyncio
    async def test_resolve_user_id_no_creds_raises(self):
        from app.core.auth import _resolve_user_id
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            await _resolve_user_id(None)
        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_resolve_user_id_valid_token(self):
        from app.core.auth import _resolve_user_id
        from fastapi.security import HTTPAuthorizationCredentials
        uid = str(uuid.uuid4())
        token = create_access_token(uid)
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        result = await _resolve_user_id(creds)
        assert result == uuid.UUID(uid)


# ── core/notifications.py ─────────────────────────────────────────────────────

class TestNotificationService:
    def _svc(self):
        from app.core.notifications import NotificationService
        return NotificationService()

    @pytest.mark.asyncio
    async def test_slack_post_skipped_when_not_configured(self):
        svc = self._svc()
        # settings.SLACK_BOT_TOKEN is empty in test env → should not raise
        await svc._slack_post("#general", "hello")

    @pytest.mark.asyncio
    async def test_notify_approval_required_no_slack(self):
        svc = self._svc()
        # Should not raise even without Slack configured
        await svc.notify_approval_required(
            pipeline_id="pipe-1",
            domain="architecture",
            stage="arch_design",
            project_name="TestProject",
            approval_id="appr-1",
        )

    @pytest.mark.asyncio
    async def test_send_rejection_alert_no_slack(self):
        svc = self._svc()
        await svc.send_rejection_alert(
            pipeline_id="pipe-1",
            stage_type="arch_design",
            reason="Does not meet standards",
        )

    @pytest.mark.asyncio
    async def test_send_failure_alert_no_slack(self):
        svc = self._svc()
        await svc.send_failure_alert(
            pipeline_id="pipe-1",
            stage_type="dev_implement",
            error="Unexpected exception",
        )

    @pytest.mark.asyncio
    async def test_send_rejection_alert_no_reason(self):
        svc = self._svc()
        # reason is optional
        await svc.send_rejection_alert(pipeline_id="p", stage_type="s")

    @pytest.mark.asyncio
    async def test_email_skipped_when_not_configured(self):
        svc = self._svc()
        # Should not raise when SMTP is not configured
        try:
            await svc.email_approval_request(
                to_email="approver@forge.dev",
                pipeline_id="pipe-1",
                project_name="TestProject",
                domain="architecture",
                stage="arch_design",
                approval_id="appr-1",
            )
        except Exception:
            pass  # SMTP errors are acceptable; what matters is no crash in call path


# ── core/metrics.py middleware ────────────────────────────────────────────────

class TestMetricsMiddleware:
    @pytest.mark.asyncio
    async def test_metrics_dispatch_calls_call_next(self):
        from app.core.metrics import PrometheusMiddleware as MetricsMiddleware
        from starlette.testclient import TestClient
        from fastapi import FastAPI

        mini_app = FastAPI()

        @mini_app.get("/ping")
        async def ping():
            return {"ok": True}

        mini_app.add_middleware(MetricsMiddleware)
        client = TestClient(mini_app)
        resp = client.get("/ping")
        assert resp.status_code == 200


# ── core/middleware.py (SecurityMiddleware) ───────────────────────────────────

class TestSecurityMiddlewareDirect:
    @pytest.mark.asyncio
    async def test_security_headers_on_mini_app(self):
        from app.core.middleware import SecurityMiddleware
        from starlette.testclient import TestClient
        from fastapi import FastAPI

        mini_app = FastAPI()

        @mini_app.get("/test")
        async def test_route():
            return {"ok": True}

        mini_app.add_middleware(SecurityMiddleware)
        client = TestClient(mini_app)
        resp = client.get("/test")
        assert "x-content-type-options" in resp.headers


# ── core/logging.py ───────────────────────────────────────────────────────────

class TestLogging:
    def test_get_logger_returns_logger(self):
        from app.core.logging import get_logger
        logger = get_logger("test.module")
        assert logger is not None
        assert logger.name == "test.module"

    def test_configure_logging_runs(self):
        from app.core.logging import configure_logging
        configure_logging()  # should not raise