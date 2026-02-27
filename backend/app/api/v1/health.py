"""
Health check endpoints for Kubernetes probes and monitoring dashboards.

GET /health          — liveness probe  (instant, no I/O)
GET /health/ready    — readiness probe (checks DB, Redis, Kafka)
GET /health/startup  — startup probe   (verifies migrations ran)
GET /health/version  — version info
"""
from __future__ import annotations

import sys
import time
from typing import Any

import sqlalchemy as sa
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["health"])

_startup_time = time.time()


# ── Liveness ──────────────────────────────────────────────────────────────────

@router.get("/health", summary="Liveness probe")
async def liveness() -> dict[str, Any]:
    """Returns 200 instantly. No DB/external calls — used by K8s to restart unhealthy pods."""
    return {
        "status": "ok",
        "uptime_seconds": round(time.time() - _startup_time, 1),
    }


# ── Readiness ─────────────────────────────────────────────────────────────────

@router.get("/health/ready", summary="Readiness probe")
async def readiness() -> JSONResponse:
    """Returns 200 only when all critical dependencies are reachable."""
    checks: dict[str, Any] = {}
    ok = True

    # ── PostgreSQL ────────────────────────────────────────────────────────────
    try:
        from app.db.session import get_write_session
        async with get_write_session() as session:
            await session.execute(sa.text("SELECT 1"))
        checks["postgres"] = {"status": "ok"}
    except Exception as exc:
        checks["postgres"] = {"status": "error", "detail": str(exc)}
        ok = False

    # ── Redis ─────────────────────────────────────────────────────────────────
    try:
        from app.core.redis_client import get_redis_client
        r = get_redis_client()
        await r.ping()
        checks["redis"] = {"status": "ok"}
    except Exception as exc:
        checks["redis"] = {"status": "error", "detail": str(exc)}
        ok = False

    # ── Kafka (degraded-only — Kafka outage doesn't block readiness) ──────────
    try:
        from app.core.kafka_client import get_producer
        _ = get_producer()  # raises if not initialised
        checks["kafka"] = {"status": "ok"}
    except Exception as exc:
        checks["kafka"] = {"status": "degraded", "detail": str(exc)}

    http_status = status.HTTP_200_OK if ok else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=http_status,
        content={
            "status": "ready" if ok else "not_ready",
            "checks": checks,
            "uptime_seconds": round(time.time() - _startup_time, 1),
        },
    )


# ── Startup ───────────────────────────────────────────────────────────────────

@router.get("/health/startup", summary="Startup probe")
async def startup_probe() -> JSONResponse:
    """
    K8s startup probe — verifies Alembic migrations have run.
    Called once per pod start before liveness/readiness take over.
    """
    try:
        from app.db.session import get_write_session
        async with get_write_session() as session:
            result = await session.execute(
                sa.text("SELECT version_num FROM alembic_version LIMIT 1")
            )
            version = result.scalar_one_or_none()
        return JSONResponse(
            status_code=200,
            content={
                "status":            "started",
                "migration_version": version,
                "uptime_seconds":    round(time.time() - _startup_time, 1),
            },
        )
    except Exception as exc:
        logger.error("Startup probe failed", extra={"error": str(exc)})
        return JSONResponse(
            status_code=503,
            content={"status": "not_started", "detail": str(exc)},
        )


# ── Version ───────────────────────────────────────────────────────────────────

@router.get("/health/version", summary="Version info", include_in_schema=False)
async def version_info() -> dict[str, Any]:
    from app.core.config import settings
    return {
        "name":    settings.APP_NAME,
        "version": settings.VERSION,
        "python":  sys.version,
    }
