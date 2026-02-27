"""
Middleware aggregator.
main.py imports RateLimitMiddleware, AuditMiddleware, SecurityMiddleware from here.
"""
from __future__ import annotations

import time
import uuid
from typing import Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.middleware.rate_limiter import RateLimitMiddleware  # noqa: F401
from app.middleware.audit import AuditMiddleware              # noqa: F401


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Adds security response headers to every reply.

    Headers added:
    - X-Content-Type-Options
    - X-Frame-Options
    - X-XSS-Protection
    - Strict-Transport-Security
    - Referrer-Policy
    - Permissions-Policy
    - Cache-Control  (for API responses only)
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"]        = "DENY"
        response.headers["X-XSS-Protection"]       = "1; mode=block"
        response.headers["Referrer-Policy"]        = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"]     = "geolocation=(), microphone=(), camera=()"
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"

        # Disable caching for API responses
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"]        = "no-cache"

        return response
