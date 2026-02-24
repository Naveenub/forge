# ⬡ Forge

> Autonomous multi-agent SDLC automation platform powered by Claude AI

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688.svg)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg)](https://docker.com)

---

## What is this?

The **Forge** replaces your entire engineering review chain with 15 specialized Claude-powered AI agents organized across 5 domains. Each domain enforces a strict **Execute → Review → Approve** governance hierarchy — no stage proceeds without a sign-off.

```
Requirements → Architecture → Development → Testing → Security → DevOps → Production
                ↑ 3 agents      ↑ 3 agents    ↑ 3 agents  ↑ 3 agents  ↑ 3 agents
```

### Agent Domains

| Domain | Agents | Responsibility |
|--------|--------|----------------|
| **Architecture** | Architect · Sr. Architect · Arch Approval | Design, schema, API contracts |
| **Development** | Developer · Sr. Developer · Dev Manager | Code generation, review, approval |
| **Testing** | Tester · Sr. Tester · QA Manager | Test suites, coverage, QA gate |
| **Security** | Sec Engineer · Sr. Security · Sec Manager | OWASP scan, SAST, clearance |
| **DevOps** | Cloud Eng · Cloud Lead · Cloud Manager | Docker, K8s, Helm, CI/CD, deploy |

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+
- Anthropic API key

### 1. Clone & configure

```bash
git clone https://github.com/your-org/forge.git
cd forge
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 2. Start with Docker Compose

```bash
cd infrastructure/docker
docker compose up -d
```

| Service | URL |
|---------|-----|
| Frontend Dashboard | http://localhost:3000 |
| API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/api/docs |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |

### 3. Local development

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
forge/
├── frontend/                  # React 18 + Vite dashboard
│   ├── src/
│   │   ├── App.jsx            # Main dashboard (all views)
│   │   ├── components/        # Shared UI components
│   │   ├── hooks/             # Custom React hooks
│   │   └── utils/             # Helpers & constants
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend/                   # FastAPI + Python
│   ├── app/
│   │   ├── main.py            # FastAPI entry point
│   │   ├── agents/
│   │   │   ├── orchestrator.py    # 15 Claude agents
│   │   │   └── pipeline_engine.py # State machine
│   │   ├── api/v1/
│   │   │   └── websocket.py   # Real-time WebSocket
│   │   ├── core/
│   │   │   └── config.py      # Settings & env
│   │   ├── db/
│   │   │   └── models.py      # SQLAlchemy models
│   │   └── middleware/        # Rate limiting, audit, security
│   ├── tests/
│   └── requirements.txt
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   └── Dockerfile.backend
│   ├── k8s/
│   │   └── deployment.yaml    # HPA, PDB, NetworkPolicy
│   ├── helm/forge/          # Helm chart
│   └── monitoring/
│       └── prometheus.yml
│
├── scripts/
│   ├── setup.sh               # One-command dev setup
│   ├── seed.py                # Seed demo data
│   └── health_check.sh        # Check all services
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── AGENTS.md
│   └── API.md
│
├── .github/
│   ├── workflows/
│   │   ├── deploy.yml         # CI/CD blue-green deploy
│   │   └── pr-checks.yml      # PR quality gates
│   └── ISSUE_TEMPLATE/
│
├── .env.example
├── .gitignore
└── docker-compose.yml         # Root shortcut → infrastructure/docker
```

---

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │         React Dashboard              │
                    │  Pipeline · Artifacts · Monitor      │
                    │  Settings · Audit · API Keys · 2FA  │
                    └──────────────┬──────────────────────┘
                                   │ WebSocket + REST
                    ┌──────────────▼──────────────────────┐
                    │         FastAPI Backend              │
                    │  CQRS · Event Sourcing · RBAC        │
                    └──┬───────┬──────────┬───────────────┘
                       │       │          │
              ┌────────▼─┐ ┌───▼───┐ ┌───▼─────┐
              │PostgreSQL│ │ Redis │ │  Kafka  │
              │(primary+ │ │(cache)│ │(events) │
              │ replica) │ └───────┘ └─────────┘
              └──────────┘
                       │
              ┌────────▼──────────────────────┐
              │      Agent Orchestrator        │
              │  15 Claude agents · 5 domains  │
              │  Anthropic API (claude-opus-4-6)│
              └────────────────────────────────┘
```

### Key Decisions

- **CQRS** — writes go to primary DB, reads from replica
- **Event Sourcing** — `EventStore` table is append-only; all state changes are events  
- **Hierarchical governance** — each domain has Execute/Review/Approve; no stage skips
- **Immutable artifacts** — once approved, artifacts are SHA-256 locked
- **HPA scaling** — 3→50 backend pods, 5→100 worker pods based on CPU + Kafka lag

---

## Configuration

Copy `.env.example` to `.env` and fill in:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Database
DATABASE_URL=postgresql+asyncpg://forge:secret@localhost:5432/forge
REDIS_URL=redis://localhost:6379/0

# Kafka
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Auth
JWT_SECRET=change-me-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

See `.env.example` for the full list.

---

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@forge.dev` | `Forge@2025` | OWNER |
| `lead@forge.dev` | `Lead@2025` | MANAGER |
| `dev@forge.dev` | `Dev@2025` | CONTRIBUTOR |

---

## Deployment

### Kubernetes (Production)

```bash
# Create namespace and secrets
kubectl create namespace forge
kubectl create secret generic forge-secrets \
  --from-literal=anthropic-api-key=$ANTHROPIC_API_KEY \
  --from-literal=jwt-secret=$JWT_SECRET \
  -n forge

# Deploy
kubectl apply -f infrastructure/k8s/ -n forge

# Watch rollout
kubectl rollout status deployment/forge-backend -n forge
```

### Helm

```bash
helm upgrade --install forge infrastructure/helm/forge \
  --namespace forge \
  --set anthropicApiKey=$ANTHROPIC_API_KEY \
  --set image.tag=latest
```

### GitHub Actions CI/CD

Push to `develop` → staging deployment  
Create a release tag → blue-green production deployment with health checks and auto-rollback

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit with conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
4. Push and open a PR — CI runs lint, type-check, security scan, and tests

---

## License

MIT — see [LICENSE](LICENSE)
