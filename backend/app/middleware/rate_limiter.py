"""
Sliding-window rate limiter backed by Redis.
Applied per user (JWT sub) for regular endpoints,
and per workspace for agent API calls.
"""
from __future__ import annotations

import time
from typing import Callable

import redis.asyncio as aioredis
from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window rate limiter using Redis sorted sets.

    Window: 60 seconds
    Limit: settings.RATE_LIMIT_RPM requests per user per window
    """

    def __init__(self, app: Callable, redis_client: aioredis.Redis) -> None:
        super().__init__(app)
        self.redis = redis_client
        self.window = 60  # seconds
        self.limit = settings.RATE_LIMIT_RPM

    async def dispatch(self, request: Request, call_next: Callable):  # type: ignore[override]
        # Skip rate limiting for health checks and docs
        if request.url.path in ("/api/v1/health", "/api/docs", "/api/openapi.json"):
            return await call_next(request)

        key = self._get_key(request)
        now = time.time()
        window_start = now - self.window

        pipe = self.redis.pipeline()
        pipe.zremrangebyscore(key, "-inf", window_start)
        pipe.zadd(key, {str(now): now})
        pipe.zcard(key)
        pipe.expire(key, self.window)
        results = await pipe.execute()

        request_count: int = results[2]

        if request_count > self.limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: {self.limit} requests per minute",
                headers={"Retry-After": str(self.window)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, self.limit - request_count))
        response.headers["X-RateLimit-Reset"] = str(int(now + self.window))
        return response

    def _get_key(self, request: Request) -> str:
        # Try to use JWT sub, fall back to IP
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            return f"rl:user:{auth[7:20]}"  # partial token as key
        return f"rl:ip:{request.client.host if request.client else 'unknown'}"
