"""
Autonomous Forge - Backend API
FastAPI application with WebSocket support, CQRS, and event sourcing
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.core.config import settings
from app.core.database import init_db
from app.core.redis_client import init_redis
from app.core.kafka_client import init_kafka
from app.api.v1 import auth, workspaces, projects, pipelines, agents, artifacts, websocket
from app.core.middleware import RateLimitMiddleware, AuditMiddleware, SecurityMiddleware
from app.workers.pipeline_worker import start_pipeline_worker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle management"""
    logger.info("Initializing Forge...")
    await init_db()
    await init_redis()
    await init_kafka()
    asyncio.create_task(start_pipeline_worker())
    logger.info("All systems operational. Factory ready.")
    yield
    logger.info("Shutting down Forge...")


app = FastAPI(
    title="Autonomous Forge",
    description="Multi-Agent Hierarchical SDLC Automation Platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Middleware stack
app.add_middleware(SecurityMiddleware)
app.add_middleware(AuditMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)

# API Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(workspaces.router, prefix="/api/v1/workspaces", tags=["Workspaces"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["Projects"])
app.include_router(pipelines.router, prefix="/api/v1/pipelines", tags=["Pipelines"])
app.include_router(agents.router, prefix="/api/v1/agents", tags=["Agents"])
app.include_router(artifacts.router, prefix="/api/v1/artifacts", tags=["Artifacts"])
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "forge", "version": "1.0.0"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        workers=4,
        loop="uvloop",
    )
