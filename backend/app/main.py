"""
Autonomous Forge - Backend API
FastAPI application with WebSocket support, CQRS, event sourcing,
structured logging, Prometheus metrics, and OpenTelemetry tracing.
"""
from __future__ import annotations

import asyncio
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.core.config import settings
from app.core.logging import configure_logging, get_logger, new_request_id
from app.core.database import init_db
from app.core.redis_client import init_redis
from app.core.kafka_client import init_kafka
from app.core.metrics import setup_metrics, metrics_router
from app.core.telemetry import setup_tracing
from app.api.v1 import auth, workspaces, projects, pipelines, agents, artifacts, websocket
from app.api.v1.health import router as health_router
from app.api.v1.routes import router as v1_router
from app.core.middleware import RateLimitMiddleware, AuditMiddleware, SecurityMiddleware
from app.workers.pipeline_worker import start_pipeline_worker

# Initialise structured logging before anything else
configure_logging(
    level="DEBUG" if settings.DEBUG else "INFO",
    json_logs=not settings.DEBUG,
)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    t0 = time.perf_counter()
    logger.info("Forge initialising…")
    await init_db()
    await init_redis()
    await init_kafka()
    asyncio.create_task(start_pipeline_worker())
    elapsed = round((time.perf_counter() - t0) * 1000, 1)
    logger.info("All systems operational", extra={"startup_ms": elapsed})
    yield
    logger.info("Forge shutting down…")


app = FastAPI(
    title="Autonomous Forge",
    description="Multi-Agent Hierarchical SDLC Automation Platform",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Metrics (before other middleware)
setup_metrics(app)

# Distributed tracing
setup_tracing(app, service_name="forge-backend")

# Middleware stack
app.add_middleware(SecurityMiddleware)
app.add_middleware(AuditMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=settings.RATE_LIMIT_RPM)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    rid = request.headers.get("X-Request-ID") or new_request_id()
    response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    return response


# Routers
app.include_router(health_router)
app.include_router(metrics_router)
app.include_router(auth.router,       prefix="/api/v1/auth",       tags=["Authentication"])
app.include_router(workspaces.router, prefix="/api/v1/workspaces", tags=["Workspaces"])
app.include_router(projects.router,   prefix="/api/v1/projects",   tags=["Projects"])
app.include_router(pipelines.router,  prefix="/api/v1/pipelines",  tags=["Pipelines"])
app.include_router(agents.router,     prefix="/api/v1/agents",     tags=["Agents"])
app.include_router(artifacts.router,  prefix="/api/v1/artifacts",  tags=["Artifacts"])
app.include_router(websocket.router,  prefix="/ws",                tags=["WebSocket"])
app.include_router(v1_router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    logger.warning("Request validation failed", extra={"path": str(request.url), "errors": exc.errors()})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error", "errors": exc.errors()},
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc: Any) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": f"Resource not found: {request.url.path}"})


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception", extra={"path": str(request.url), "error": str(exc)}, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=1 if settings.DEBUG else 4,
        loop="uvloop",
        access_log=False,
    )
