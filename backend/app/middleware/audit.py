"""
Immutable audit logging middleware.
Every state-changing request (POST, PUT, PATCH, DELETE) is recorded
as an append-only event in the audit_events table.
"""
from __future__ import annotations

import json
import time
import uuid
from collections.abc import Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SKIP_PATHS = {"/api/v1/health", "/api/docs", "/api/openapi.json", "/ws"}


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.method not in WRITE_METHODS or request.url.path in SKIP_PATHS:
            return await call_next(request)

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        event = {
            "id": str(uuid.uuid4()),
            "method": request.method,
            "path": str(request.url.path),
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", ""),
        }

        # In production, write to DB + Kafka. Here we just log to stdout.
        print(f"[AUDIT] {json.dumps(event)}")

        response.headers["X-Request-Id"] = event["id"]
        return response
