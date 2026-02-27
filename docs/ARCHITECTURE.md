# Architecture

## Overview

Forge is a multi-layer platform:

```
Browser → React Dashboard → FastAPI → Agent Orchestrator → Anthropic API
                                   ↕
                              PostgreSQL + Redis + Kafka
```

## Backend Layers

### API Layer (`app/api/v1/`)
- FastAPI with async handlers
- OpenAPI docs auto-generated at `/api/docs`
- WebSocket endpoint at `/ws/{pipeline_id}` for real-time log streaming
- JWT authentication on all routes except `/health`

### Agent Orchestrator (`app/agents/orchestrator.py`)
- Manages 15 Claude agents across 5 domains
- Each domain: Execute → Review → Approve (3 levels)
- State machine enforces no domain skipping
- Artifacts are SHA-256 locked after approval

### Database (`app/db/models.py`)
- PostgreSQL (primary) + read replica
- Event Sourcing: `EventStore` table is append-only
- Immutable artifacts table with checksum verification
- Alembic for migrations

### Caching (`Redis`)
- Session storage for WebSocket connections
- Rate limit counters (sliding window)
- Pipeline state cache (write-through)

### Message Queue (`Kafka`)
- `pipeline.events` — all state transitions
- `agent.logs` — streaming log entries
- `governance.approvals` — approval requests + decisions
- Consumer group: `forge-workers`

## Scaling

| Component | Min | Max | Trigger |
|-----------|-----|-----|---------|
| Backend pods | 3 | 50 | CPU > 70% |
| Worker pods | 5 | 100 | Kafka lag > 1000 |
| DB connections | 20 | 200 | Pool pressure |

## Security

- All artifacts SHA-256 locked after approval
- JWT HS256, 30-minute access tokens
- Rate limiting: 1000 RPM per user
- OWASP Top 10 scan on every pipeline
- Audit log: immutable, 90-day retention
- No Anthropic API key stored in DB — env-only
