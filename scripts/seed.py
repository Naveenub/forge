#!/usr/bin/env python3
"""
Seed script — populates the database with demo workspaces, projects,
pipelines, agents, and user accounts for local development.

Usage:
  cd backend
  python ../scripts/seed.py

Requires DATABASE_URL to be set (reads from .env automatically).
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid
from pathlib import Path

# Load .env from repo root
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://forge:secret@localhost:5432/forge_db")

DEMO_USERS = [
    {"email": "admin@forge.dev",  "password": "Forge@2025", "name": "Jamie Doe",    "role": "OWNER"},
    {"email": "lead@forge.dev",   "password": "Lead@2025",    "name": "Alex Rivera",  "role": "MANAGER"},
    {"email": "dev@forge.dev",    "password": "Dev@2025",     "name": "Sam Park",     "role": "CONTRIBUTOR"},
]

DEMO_WORKSPACES = [
    {"name": "Platform Team",    "color": "#00d4ff", "member_count": 12},
    {"name": "Data Engineering", "color": "#a855f7", "member_count": 7},
    {"name": "Mobile Squad",     "color": "#00e87a", "member_count": 5},
]

DEMO_PROJECTS = {
    "Platform Team": [
        {"name": "E-Commerce Platform", "status": "running",   "progress": 42,  "cloud": "AWS",   "desc": "Full-stack storefront with payments"},
        {"name": "ML Pipeline Service", "status": "completed", "progress": 100, "cloud": "GCP",   "desc": "Real-time ML inference pipeline"},
        {"name": "Auth Microservice",   "status": "waiting",   "progress": 78,  "cloud": "Azure", "desc": "OAuth2 + JWT auth service"},
        {"name": "Analytics Dashboard", "status": "completed", "progress": 100, "cloud": "AWS",   "desc": "Business intelligence platform"},
    ],
    "Data Engineering": [
        {"name": "Kafka Stream Processor", "status": "running",   "progress": 61,  "cloud": "AWS",  "desc": "Real-time event streaming"},
        {"name": "Data Warehouse ETL",     "status": "waiting",   "progress": 55,  "cloud": "GCP",  "desc": "Nightly batch ETL pipeline"},
        {"name": "Feature Store API",      "status": "completed", "progress": 100, "cloud": "AWS",  "desc": "ML feature serving layer"},
    ],
    "Mobile Squad": [
        {"name": "iOS Commerce App",          "status": "running",   "progress": 33,  "cloud": "AWS",   "desc": "Native iOS shopping app"},
        {"name": "Push Notification Service", "status": "completed", "progress": 100, "cloud": "Azure", "desc": "Cross-platform push service"},
    ],
}

PENDING_APPROVALS = [
    {"stage": "Architecture Approval", "project": "Auth Microservice",   "role": "Engineering Head"},
    {"stage": "QA Manager Approval",   "project": "E-Commerce Platform", "role": "QA Manager"},
    {"stage": "Security Clearance",    "project": "ML Pipeline Service", "role": "CISO"},
]


async def seed() -> None:
    print("🌱 Seeding demo data...")
    print()

    # In a real app, this would use SQLAlchemy + the actual models.
    # For now we just print what would be created.
    print(f"  👤 Would create {len(DEMO_USERS)} demo users:")
    for u in DEMO_USERS:
        print(f"     • {u['email']} ({u['role']})")

    print()
    ws_count = len(DEMO_WORKSPACES)
    proj_count = sum(len(p) for p in DEMO_PROJECTS.values())
    print(f"  🏢 Would create {ws_count} workspaces with {proj_count} projects:")
    for ws in DEMO_WORKSPACES:
        projects = DEMO_PROJECTS.get(ws["name"], [])
        print(f"     • {ws['name']} ({len(projects)} projects, {ws['member_count']} members)")

    print()
    print(f"  ⏸  Would create {len(PENDING_APPROVALS)} pending approvals")

    print()
    print("  ⚠️  NOTE: Integrate real DB writes when SQLAlchemy models are fully set up.")
    print("  See backend/app/db/models.py for the schema.")
    print()
    print("✅ Seed complete (dry-run mode)")


if __name__ == "__main__":
    asyncio.run(seed())
