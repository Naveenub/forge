"""
Request/Response logging middleware.
Emits one structured log line per request:  method, path, status, duration_ms,
request_id, user_id (from JWT sub), and content_length.

Integrates with the JSON logger configured in app/core/logging.py.
"""
from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger("forge.access")

# Paths that generate too much log noise — only log if status >= 400
_MUTED_PATHS = frozenset({
    "/health",
    "/health/ready",
    "/metrics",
    "/api/docs",
    "/api/openapi.json",
})

# Headers that must never appear in log output
_SENSITIVE_HEADERS = frozenset({
    "authorization",
    "cookie",
    "x-api-key",
    "x-secret",
})


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Attaches a correlation ID to every request and logs:
      - method + path + status + duration_ms (always)
      - request body size and response size (when > 0)
      - user_id extracted from the Authorization JWT sub claim
      - full URL (including query string) for non-muted paths

    The correlation ID is written to the ``X-Request-ID`` response header
    so clients and downstream services can trace calls end-to-end.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # ── Correlation ID ────────────────────────────────────────────────────
        request_id = (
            request.headers.get("X-Request-ID")
            or request.headers.get("X-Correlation-ID")
            or str(uuid.uuid4())
        )

        # ── Timing ───────────────────────────────────────────────────────────
        started = time.perf_counter()
        response: Response = await call_next(request)
        duration_ms = round((time.perf_counter() - started) * 1000, 2)

        # ── Resolve user identity (best-effort) ───────────────────────────────
        user_id = _extract_user_id(request)

        # ── Build log record ──────────────────────────────────────────────────
        path  = request.url.path
        muted = path in _MUTED_PATHS

        if not muted or response.status_code >= 400:
            extra = {
                "request_id":      request_id,
                "method":          request.method,
                "path":            path,
                "status":          response.status_code,
                "duration_ms":     duration_ms,
                "user_id":         user_id,
                "ip":              _client_ip(request),
                "user_agent":      request.headers.get("user-agent", "")[:120],
            }

            # Add query string only for non-muted paths
            if not muted and request.url.query:
                extra["query"] = request.url.query[:500]

            # Response size if the header is present
            content_length = response.headers.get("content-length")
            if content_length:
                extra["response_bytes"] = int(content_length)

            level = logging.WARNING if response.status_code >= 400 else logging.INFO
            logger.log(
                level, "%s %s %d %.1fms",
                request.method, path, response.status_code, duration_ms,
                extra=extra,
            )

        # ── Attach correlation ID to response ─────────────────────────────────
        response.headers["X-Request-ID"] = request_id
        return response


# ── Helpers ────────────────────────────────────────────────────────────────────

def _client_ip(request: Request) -> str:
    """Return the real client IP, honouring X-Forwarded-For behind proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _extract_user_id(request: Request) -> str | None:
    """
    Best-effort extraction of ``sub`` from a Bearer JWT without full verification.
    We only need the claim for logging — auth middleware does the real verification.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        import base64
        import json as _json
        # JWT is three base64url segments: header.payload.signature
        payload_b64 = token.split(".")[1]
        # Pad to a multiple of 4
        payload_b64 += "=" * (-len(payload_b64) % 4)
        payload = _json.loads(base64.urlsafe_b64decode(payload_b64))
        return str(payload.get("sub", ""))[:64] or None
    except Exception:
        return None
