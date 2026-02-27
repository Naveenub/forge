"""
Prometheus metrics for Forge backend.

Exposes /metrics in Prometheus text format.
Tracks HTTP request counts, latency histograms, active WebSocket connections,
pipeline throughput, agent task queue depth, and DB pool utilization.

Usage in main.py:
    from app.core.metrics import setup_metrics, metrics_router
    setup_metrics(app)
    app.include_router(metrics_router)
"""
from __future__ import annotations

import time
from typing import Callable

from fastapi import APIRouter, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.routing import Match

from app.core.logging import get_logger

logger = get_logger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Metric definitions (lazy import to gracefully degrade if prometheus_client absent)
# ─────────────────────────────────────────────────────────────────────────────

_METRICS_AVAILABLE = False
_http_requests_total = None
_http_request_duration_seconds = None
_http_requests_in_progress = None
_ws_connections_active = None
_pipeline_runs_total = None
_agent_tasks_total = None
_agent_task_duration_seconds = None
_db_pool_size = None
_db_pool_checked_out = None


def _init_prometheus() -> bool:
    global _METRICS_AVAILABLE
    global _http_requests_total, _http_request_duration_seconds, _http_requests_in_progress
    global _ws_connections_active, _pipeline_runs_total, _agent_tasks_total
    global _agent_task_duration_seconds, _db_pool_size, _db_pool_checked_out

    try:
        from prometheus_client import (
            Counter, Gauge, Histogram, REGISTRY,
            CollectorRegistry, multiprocess
        )

        _http_requests_total = Counter(
            "http_requests_total",
            "Total HTTP requests",
            ["method", "endpoint", "status"],
        )
        _http_request_duration_seconds = Histogram(
            "http_request_duration_seconds",
            "HTTP request duration in seconds",
            ["method", "endpoint"],
            buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        )
        _http_requests_in_progress = Gauge(
            "http_requests_in_progress",
            "Number of HTTP requests currently being processed",
            ["method", "endpoint"],
        )
        _ws_connections_active = Gauge(
            "websocket_connections_active",
            "Number of active WebSocket connections",
        )
        _pipeline_runs_total = Counter(
            "pipeline_runs_total",
            "Total pipeline runs",
            ["status"],
        )
        _agent_tasks_total = Counter(
            "agent_tasks_total",
            "Total agent tasks executed",
            ["domain", "level", "status"],
        )
        _agent_task_duration_seconds = Histogram(
            "agent_task_duration_seconds",
            "Agent task duration in seconds",
            ["domain", "level"],
            buckets=[1, 5, 15, 30, 60, 120, 300, 600],
        )
        _db_pool_size = Gauge("db_pool_size", "Database connection pool size")
        _db_pool_checked_out = Gauge(
            "db_pool_checked_out",
            "Database connections currently checked out",
        )

        _METRICS_AVAILABLE = True
        logger.info("Prometheus metrics initialized")
        return True

    except ImportError:
        logger.warning(
            "prometheus_client not installed — /metrics endpoint will return 503. "
            "Install with: pip install prometheus-client"
        )
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Middleware
# ─────────────────────────────────────────────────────────────────────────────

def _get_route_path(request: Request) -> str:
    """Extract parameterised route path (e.g. /api/v1/pipelines/{id})."""
    for route in request.app.routes:
        match, _ = route.matches(request.scope)
        if match == Match.FULL:
            return route.path
    return request.url.path


class PrometheusMiddleware(BaseHTTPMiddleware):
    """Instrument every HTTP request with latency + count metrics."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not _METRICS_AVAILABLE:
            return await call_next(request)

        path = _get_route_path(request)
        method = request.method

        _http_requests_in_progress.labels(method=method, endpoint=path).inc()
        start = time.perf_counter()
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        except Exception:
            raise
        finally:
            duration = time.perf_counter() - start
            _http_requests_total.labels(
                method=method, endpoint=path, status=str(status_code)
            ).inc()
            _http_request_duration_seconds.labels(
                method=method, endpoint=path
            ).observe(duration)
            _http_requests_in_progress.labels(method=method, endpoint=path).dec()


# ─────────────────────────────────────────────────────────────────────────────
# /metrics router
# ─────────────────────────────────────────────────────────────────────────────

metrics_router = APIRouter(tags=["observability"])


@metrics_router.get("/metrics", include_in_schema=False)
async def prometheus_metrics() -> Response:
    """Expose metrics in Prometheus text format."""
    if not _METRICS_AVAILABLE:
        return Response(
            content="# prometheus_client not installed\n",
            status_code=503,
            media_type="text/plain",
        )

    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Public helpers — called by service layer
# ─────────────────────────────────────────────────────────────────────────────

def record_pipeline_run(status: str) -> None:
    if _METRICS_AVAILABLE and _pipeline_runs_total:
        _pipeline_runs_total.labels(status=status).inc()


def record_agent_task(domain: str, level: str, status: str, duration: float) -> None:
    if _METRICS_AVAILABLE:
        if _agent_tasks_total:
            _agent_tasks_total.labels(domain=domain, level=level, status=status).inc()
        if _agent_task_duration_seconds:
            _agent_task_duration_seconds.labels(domain=domain, level=level).observe(duration)


def inc_ws_connections(delta: int = 1) -> None:
    if _METRICS_AVAILABLE and _ws_connections_active:
        _ws_connections_active.inc(delta)


def dec_ws_connections() -> None:
    if _METRICS_AVAILABLE and _ws_connections_active:
        _ws_connections_active.dec()


# ─────────────────────────────────────────────────────────────────────────────
# Setup entry point
# ─────────────────────────────────────────────────────────────────────────────

def setup_metrics(app) -> None:  # noqa: ANN001
    """Add Prometheus middleware and initialise collectors."""
    _init_prometheus()
    app.add_middleware(PrometheusMiddleware)
    logger.info("Prometheus metrics middleware registered")
