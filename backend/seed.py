#!/usr/bin/env python3
"""
Forge — Development seed script.
Creates demo users, workspaces, projects, and initial data.

Usage:
    python seed.py
    DATABASE_URL=postgresql+asyncpg://... python seed.py
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys

# Allow running from repo root or backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("seed")

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://forge:forge_password@localhost:5432/forge_db",
)


async def seed(db: AsyncSession) -> None:
    from app.core.security import hash_password
    from app.db.models import User, Workspace, WorkspaceMember, Project, UserRole
    import uuid

    logger.info("Seeding database…")

    # ── Demo Users ────────────────────────────────────────────────────────────
    users = [
        {
            "email": "admin@forge.dev",
            "username": "admin",
            "password": "Forge@2025",
            "is_verified": True,
        },
        {
            "email": "lead@forge.dev",
            "username": "lead",
            "password": "Lead@2025",
            "is_verified": True,
        },
        {
            "email": "dev@forge.dev",
            "username": "dev",
            "password": "Dev@2025",
            "is_verified": True,
        },
    ]

    created_users: dict[str, User] = {}
    for u in users:
        user = User(
            id=uuid.uuid4(),
            email=u["email"],
            username=u["username"],
            hashed_password=hash_password(u["password"]),
            is_active=True,
            is_verified=u["is_verified"],
        )
        db.add(user)
        created_users[u["email"]] = user
        logger.info("  Created user: %s", u["email"])

    await db.flush()

    # ── Workspaces ────────────────────────────────────────────────────────────
    admin = created_users["admin@forge.dev"]
    lead  = created_users["lead@forge.dev"]
    dev   = created_users["dev@forge.dev"]

    workspaces_data = [
        {"name": "Platform Team",    "slug": "platform-team",    "owner": admin},
        {"name": "Data Engineering", "slug": "data-engineering",  "owner": lead},
        {"name": "Mobile Squad",     "slug": "mobile-squad",      "owner": dev},
    ]

    created_workspaces: list[Workspace] = []
    for w in workspaces_data:
        ws = Workspace(
            id=uuid.uuid4(),
            name=w["name"],
            slug=w["slug"],
            owner_id=w["owner"].id,
        )
        db.add(ws)
        created_workspaces.append(ws)

        # Owner membership
        db.add(WorkspaceMember(
            id=uuid.uuid4(),
            workspace_id=ws.id,
            user_id=w["owner"].id,
            role=UserRole.OWNER,
        ))
        logger.info("  Created workspace: %s", w["name"])

    await db.flush()

    # ── Projects ──────────────────────────────────────────────────────────────
    platform_ws = created_workspaces[0]
    projects_data = [
        {
            "workspace": platform_ws,
            "name": "E-Commerce Platform",
            "description": "Full-stack storefront with payments",
            "requirements": "Build a scalable e-commerce backend with FastAPI, PostgreSQL, Redis caching, Stripe payments, and Kubernetes deployment on AWS EKS.",
            "created_by": admin,
            "enabled_domains": ["architecture", "development", "testing", "security", "devops"],
            "deployment_enabled": True,
            "target_cloud": "aws",
        },
        {
            "workspace": platform_ws,
            "name": "Auth Microservice",
            "description": "OAuth2 + JWT auth service",
            "requirements": "Build a standalone authentication microservice with OAuth2, JWT refresh tokens, 2FA support, and RBAC.",
            "created_by": admin,
            "enabled_domains": ["architecture", "development", "testing", "security"],
            "deployment_enabled": False,
            "target_cloud": "aws",
        },
    ]

    for p in projects_data:
        project = Project(
            id=uuid.uuid4(),
            workspace_id=p["workspace"].id,
            name=p["name"],
            description=p["description"],
            requirements=p["requirements"],
            enabled_domains=p["enabled_domains"],
            deployment_enabled=p["deployment_enabled"],
            target_cloud=p["target_cloud"],
            created_by=p["created_by"].id,
            status="draft",
        )
        db.add(project)
        logger.info("  Created project: %s", p["name"])

    await db.commit()
    logger.info("✓ Seed complete!")
    logger.info("")
    logger.info("Demo accounts:")
    for u in users:
        logger.info("  %-25s  password: %s", u["email"], u["password"])


async def main() -> None:
    engine = create_async_engine(DATABASE_URL, echo=False)
    SessionFactory = async_sessionmaker(engine, expire_on_commit=False)

    async with SessionFactory() as db:
        await seed(db)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
