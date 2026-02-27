```
███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
█████╗  ██║   ██║██████╔╝██║  ███╗█████╗
██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝
██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

⬡ Autonomous AI Software Platform
---
``` 
15 agents · 5 domains · 0 manual handoffs
Architecture → Dev → Testing → Security → DevOps
```  
---

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688.svg)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg)](https://docker.com)

---

## What is this?

The **Forge** replaces your entire engineering review chain with 15 specialized Claude-powered AI agents organized across 5 domains. Each domain enforces a strict Execute → Review → Approve governance hierarchy - no stage proceeds without a sign-off.

```
Requirements → Architecture  →  Development  →  Testing   →  Security  →  DevOps  →  Production
                ↑ 3 agents      ↑ 3 agents      ↑ 3 agents   ↑ 3 agents   ↑ 3 agents
```

### Agent Domains

| Domain            | Agents                                    | Responsibility                    |
| ----------------- | ----------------------------------------- | --------------------------------- |
| **Architecture**  | Architect · Sr. Architect · Arch Approval | Design, schema, API contracts     |
| **Development**   | Developer · Sr. Developer · Dev Manager   | Code generation, review, approval |
| **Testing**       | Tester · Sr. Tester · QA Manager          | Test suites, coverage, QA gate    |
| **Security**      | Sec Engineer · Sr. Security · Sec Manager | OWASP scan, SAST, clearance       |
| **DevOps**        | Cloud Eng · Cloud Lead · Cloud Manager    | Docker, K8s, Helm, CI/CD, deploy  |

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
Edit .env and add your ANTHROPIC_API_KEY
```

### 2. Start with Docker Compose

```bash
cd infrastructure/docker
docker compose up -d
```

| Service            | URL                            |
|--------------------|--------------------------------|
| Frontend Dashboard | http://localhost:3000          |
| API                | http://localhost:8000          |
| API Docs (Swagger) | http://localhost:8000/api/docs |
| Grafana            | http://localhost:3001          |
| Prometheus         | http://localhost:9090          |

### 3. Local development

```bash
Backend
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
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── config.yml
│   ├── workflows/
│   │   ├── deploy.yml              # CD: build → push → helm upgrade
│   │   └── pr-checks.yml           # CI: lint, test, scan, build
│   └── PULL_REQUEST_TEMPLATE.md
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── orchestrator.py     # 15 Claude AI agent classes (exec/review/approval)
│   │   │   └── pipeline_engine.py  # PipelineStateMachine, stage runner, artifact saver
│   │   ├── api/v1/
│   │   │   ├── auth.py             # /auth — login, refresh, API keys
│   │   │   ├── workspaces.py       # /workspaces — CRUD
│   │   │   ├── projects.py         # /projects — CRUD + pipeline trigger
│   │   │   ├── pipelines.py        # /pipelines — status, cancel, retry, approve
│   │   │   ├── agents.py           # /agents — live agent status
│   │   │   ├── artifacts.py        # /artifacts — download, list
│   │   │   ├── websocket.py        # /ws — real-time pipeline events
│   │   │   ├── health.py           # /health — liveness + readiness
│   │   │   └── routes.py           # legacy stub routes
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic settings (env-driven)
│   │   │   ├── security.py         # JWT encode/decode, bcrypt hashing
│   │   │   ├── auth.py             # FastAPI Depends: CurrentUserID, RequireRole
│   │   │   ├── database.py         # Async engine, read/write session factories
│   │   │   ├── redis_client.py     # Redis pool, get/set helpers
│   │   │   ├── kafka_client.py     # AIOKafka producer + consumer factory
│   │   │   ├── events.py           # In-process EventBus (pub/sub for WebSocket)
│   │   │   ├── logging.py          # structlog JSON logger, request_id injection
│   │   │   ├── metrics.py          # Prometheus counters/histograms/gauges
│   │   │   ├── telemetry.py        # OpenTelemetry tracer setup (optional)
│   │   │   ├── middleware.py       # Re-exports: RateLimit, Audit, Security
│   │   │   └── notifications.py    # Slack + SMTP fire-and-forget notifications
│   │   ├── db/
│   │   │   ├── models.py           # All ORM models: User, Workspace, Project,
│   │   │   └── session.py          # write_session() async context manager
│   │   ├── middleware/
│   │   │   ├── audit.py            # AuditMiddleware — logs every mutating request
│   │   │   ├── logging.py          # RequestLoggingMiddleware — access log + JWT decode
│   │   │   └── rate_limiter.py     # RateLimitMiddleware — Redis sliding window
│   │   ├── schemas/
│   │   │   ├── user.py             # UserRead, TokenResponse, ApiKeyRead/Created
│   │   │   ├── pipeline.py         # PipelineCreate/Read/List, ApprovalRead/Action
│   │   │   └── workspace.py        # WorkspaceCreate/Read, ProjectCreate/Read
│   │   ├── services/
│   │   │   ├── auth_service.py     # AuthService: login, refresh, API key CRUD
│   │   │   ├── pipeline_service.py # PipelineService: create, cancel, approve, reject
│   │   │   └── workspace_service.py# WorkspaceService + ProjectService CRUD
│   │   ├── workers/
│   │   │   └── pipeline_worker.py  # Kafka consumer → PipelineStateMachine runner
│   │   └── main.py                 # FastAPI app factory, middleware stack, routers
│   ├── alembic/                    # Alembic migration runtime (env.py + script.py.mako)
│   │   └── versions/
│   │       └── 001_initial_schema.py
│   ├── migrations/                 # Standalone migration copy (CI-friendly)
│   │   └── versions/
│   │       └── 001_initial_schema.py
│   ├── tests/
│   │   ├── conftest.py             # Async SQLite fixtures, mock services
│   │   ├── unit/                   # 9 unit test modules
│   │   │   ├── test_auth_service.py
│   │   │   ├── test_pipeline_service.py
│   │   │   ├── test_workspace_service.py
│   │   │   ├── test_orchestrator.py
│   │   │   ├── test_agents.py
│   │   │   ├── test_artifacts.py
│   │   │   ├── test_middleware.py
│   │   │   ├── test_routes.py
│   │   │   └── test_security.py
│   │   └── integration/
│   │       └── test_pipeline_flow.py
│   ├── pyproject.toml              # ruff, mypy, pytest, coverage config
│   ├── requirements.txt
│   └── requirements-dev.txt
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── manifest.json
│   │   ├── robots.txt
│   │   └── 404.html
│   ├── src/
│   │   ├── components/             # 21 UI components
│   │   │   ├── AgentCard.jsx       ├── ApprovalCard.jsx
│   │   │   ├── ArtifactViewer.jsx  ├── Avatar.jsx
│   │   │   ├── Button.jsx          ├── Dropdown.jsx
│   │   │   ├── EmptyState.jsx      ├── ErrorBoundary.jsx
│   │   │   ├── Input.jsx           ├── LoadingSpinner.jsx
│   │   │   ├── LogStream.jsx       ├── MetricCard.jsx
│   │   │   ├── Modal.jsx           ├── Navbar.jsx
│   │   │   ├── PipelineCard.jsx    ├── Sidebar.jsx
│   │   │   ├── Skeleton.jsx        ├── StatusBadge.jsx
│   │   │   ├── Table.jsx           ├── Toast.jsx
│   │   │   └── WorkspaceCard.jsx
│   │   ├── hooks/                  # 8 custom hooks
│   │   │   ├── useAgents.js        ├── useArtifacts.js
│   │   │   ├── useAuth.js          ├── useMetrics.js
│   │   │   ├── usePipeline.js      ├── useUtils.js
│   │   │   ├── useWebSocket.js     └── useWorkspace.js
│   │   ├── utils/                  # 7 utilities
│   │   │   ├── api.js              ├── constants.js
│   │   │   ├── errors.js           ├── formatters.js
│   │   │   ├── storage.js          ├── validators.js
│   │   │   └── formatters.test.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── vitest.config.js
├── infrastructure/
│   ├── docker/
│   │   ├── Dockerfile.backend
│   │   ├── Dockerfile.frontend
│   │   ├── nginx.conf
│   │   ├── nginx/
│   │   │   └── nginx.conf
│   │   ├── postgres/
│   │   │   ├── init.sql
│   │   │   └── pg_hba.conf
│   │   └── monitoring/
│   │       ├── prometheus.yml
│   │       └── grafana/
│   │           ├── dashboards/
│   │           |   └── dashboards.yml
│   │           └── datasources/
│   │               └── datasources.yml
│   ├── helm/forge/                 # Helm chart
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   ├── values.staging.yaml
│   │   ├── values.production.yaml
│   │   └── templates/
│   │       ├── deployment.yaml
│   │       ├── service.yaml
│   │       ├── ingress.yaml
│   │       ├── configmap.yaml
│   │       ├── secrets.yaml
│   │       ├── hpa.yaml
│   │       ├── cronjob.yaml
│   │       ├── serviceaccount.yaml
│   │       ├── servicemonitor.yaml
│   │       ├── _helpers.tpl
│   │       └── NOTES.txt
│   ├── k8s/                        # Raw Kubernetes manifests
│   │   ├── namespace.yaml
│   │   ├── deployment.yaml
│   │   ├── configmap.yaml
│   │   ├── secrets.yaml
│   │   ├── ingress.yaml
│   │   ├── hpa.yaml
│   │   ├── networkpolicy.yaml
│   │   ├── pdb.yaml
│   │   └── rbac.yaml
│   └── monitoring/
│       ├── prometheus.yml
│       ├── alertmanager.yml
│       ├── alerts.yml
│       └── grafana/
│           ├── forge-dashboard.json
│           ├── datasources.yml
│           ├── dashboards/
│           |   └── dashboards.yml
│           └── datasources/
|               └──datasources.yml
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── AGENTS.md
│   ├── DEPLOYMENT.md
│   ├── RUNBOOK.md
│   └── SECURITY.md
├── scripts/
│   ├── setup.sh
│   ├── seed.py
│   ├── backup.sh
│   ├── restore.sh
│   └── health_check.sh
├── docker-compose.yml
├── docker-compose.override.yml
├── Makefile
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
└── LICENSE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  146 files  ·  6 layers  ·  React → FastAPI → Agents → Postgres → K8s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Architecture

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⬡  F O R G E  ─  SYSTEM ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╔══════════════════════════════════════════════════════════════════════════════════╗
║                              FORGE  —  AI SDLC Platform                          ║
╚══════════════════════════════════════════════════════════════════════════════════╝

  Browser / API Client
  ┌──────────────────────────────────────────┐
  │  React SPA  (Vite + JSX)                 │
  │                                          │
  │  hooks/         components/   utils/     │
  │  useAuth        AgentCard     api.js     │
  │  usePipeline    PipelineCard  ws.js      │
  │  useWebSocket   ArtifactView  formatters │
  └──────────┬──────────────┬────────────────┘
             │ HTTPS/REST   │ WSS
             ▼              ▼
  ┌───────────────────────────────────────────────────────────────────────┐
  │                        NGINX  (reverse proxy / TLS)                   │
  │          /api/*  →  backend:8000      /*  →  frontend:3000            │
  └──────────────────────┬────────────────────────────────────────────────┘
                         │
  ┌──────────────────────▼────────────────────────────────────────────────┐
  │                   FastAPI  Application  (Uvicorn / Python 3.12)       │
  │                                                                       │
  │  Middleware Stack (innermost → outermost)                             │
  │  ┌──────────────────────────────────────────────────────────────┐     │
  │  │       SecurityMiddleware  →  RateLimitMiddleware  →          │     │
  │  │       AuditMiddleware     →  RequestLoggingMiddleware        │     │
  │  └──────────────────────────────────────────────────────────────┘     │
  │                                                                       │
  │  API Routers  /api/v1/                                                │
  │  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌─────────┐ ┌───────────┐   │
  │  │  /auth   │ │/workspaces │ │/projects │ │/pipeline│ │ /agents   │   │
  │  │  /apikey │ │  /members  │ │          │ │/approve │ │/artifacts │   │
  │  └──────────┘ └────────────┘ └──────────┘ └─────────┘ └───────────┘   │
  │  ┌──────────┐ ┌───────────┐                                           │
  │  │ /health  │ │    /ws    │  ← WebSocket: EventBus broadcasts         │
  │  └──────────┘ └───────────┘                                           │
  │                                                                       │
  │  Service Layer                                                        │
  │  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────────┐    │
  │  │  AuthService  │  │ PipelineService  │  │  WorkspaceService    │    │
  │  │  login        │  │  create/cancel   │  │  ProjectService      │    │
  │  │  refresh      │  │  approve/reject  │  │  CRUD + membership   │    │
  │  │  api_key CRUD │  │  list/get        │  │                      │    │
  │  └───────────────┘  └──────────────────┘  └──────────────────────┘    │
  └──────────────────────────────────┬────────────────────────────────────┘
                                     │
          ┌──────────────────────────┼─────────────────────────────┐
          │                          │                             │
          ▼                          ▼                             ▼
  ┌──────────────┐         ┌───────────────────┐         ┌─────────────────┐
  │  PostgreSQL  │         │     Redis         │         │     Kafka       │
  │  (asyncpg)   │         │  (redis-py async) │         │   (aiokafka)    │
  │              │         │                   │         │                 │
  │  users       │         │  • Rate limiting  │         │  pipeline.run   │
  │  workspaces  │         │  • Session cache  │         │  pipeline.event │
  │  projects    │         │  • WS heartbeat   │         │  agent.result   │
  │  pipelines   │         │  • API key cache  │         │                 │
  │  stages      │         └───────────────────┘         └────────┬────────┘
  │  artifacts   │                                                │
  │  approvals   │                                                │ consume
  │  audit_logs  │                  ┌─────────────────────────────▼──────────┐
  │  api_keys    │                  │         Pipeline  Worker               │
  │  event_store │                  │                                        │
  └──────────────┘                  │  Kafka consumer → PipelineStateMachine |
                                    │                                        │
                                    │  ┌───────────────────────────────┐     │
                                    │  │    AI  Agent  Pipeline        │     │
                                    │  │                               │     │
                                    │  │  ┌────────────────────────┐   │     │
                                    │  │  │  ARCHITECTURE  Domain  │   │     │
                                    │  │  │  [Exec] → [Review] →   |   |     |
                                    |  |  |       [Approve]│       |   |     |
                                    │  │  ├────────────────────────┤   │     │
                                    │  │  │  DEVELOPMENT  Domain   │   │     │
                                    │  │  │  [Exec] → [Review] →   |   |     |
                                    |  |  |      [Approve]         │   |     |
                                    │  │  ├────────────────────────┤   │     │
                                    │  │  │  TESTING  Domain       │   │     │
                                    │  │  │  [Exec] → [Review] →   |   |     |
                                    |  |  |      [Approve]         │   |     |
                                    │  │  ├────────────────────────┤   │     │
                                    │  │  │  SECURITY  Domain      │   │     │
                                    │  │  │  [Exec] → [Review] →   |   |     |
                                    |  |  |       [Approve]        │   |     |
                                    │  │  ├────────────────────────┤   │     │
                                    │  │  │  DEVOPS  Domain (opt)  │   │     │
                                    │  │  │  [Exec] → [Review] →   |   |     |
                                    |  |  |       [Approve]        │   |     |
                                    │  │  └────────────────────────┘   │     │
                                    │  │         ↓ each agent calls    │     │
                                    │  │    anthropic.messages.create  │     │
                                    │  └───────────────────────────────┘     │
                                    └────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────────┐
  │                     APPROVAL  GATE  (human-in-the-loop)                   │
  │                                                                           │
  │  Agent auto-approves → OK → next stage                                    │
  │  Agent rejects      → HTTPException → ApprovalRequest created             │
  │                        → Slack / Email notification                       │
  │                        → Human reviews via /api/v1/pipelines/{id}/approve │
  │                        → Pipeline resumes or terminates                   │
  └───────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────┐
  │                          OBSERVABILITY  STACK                            │
  │                                                                          │
  │  FastAPI app                Prometheus              Grafana              │
  │  ┌─────────────┐             ┌───────────┐            ┌──────────┐       │
  │  │ /metrics    │ ──scrape──▶│ TSDB       │──query───▶│Dashboard │       │
  │  │ structlog   │             │ alerts    │            │Alerts    │       │
  │  │ OTel traces │             └───────────┘            └──────────┘       │
  │  └─────────────┘                 ↓                                       │
  │                          Alertmanager                                    │
  │                          (Slack/PD)                                      │
  └──────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────┐
  │                          DEPLOYMENT  TARGETS                             │
  │                                                                          │
  │  Local Dev          Staging / Prod (K8s)       CI/CD                     │
  │  ┌────────────┐     ┌──────────────────────┐   ┌───────────────────────┐ │
  │  │docker-     │     │ Helm Chart           │   │ GitHub Actions        │ │
  │  │compose.yml │     │ ├── deployment.yaml  │   │ pr-checks.yml         │ │
  │  │            │     │ ├── hpa.yaml         │   │  ruff / mypy / pytest │ │
  │  │postgres    │     │ ├── ingress.yaml     │   │  docker build         │ │
  │  │redis       │     │ ├── servicemonitor   │   │  trivy scan           │ │
  │  │kafka       │     │ └── configmap.yaml   │   │ deploy.yml            │ │
  │  │backend     │     │                      │   │  helm upgrade         │ │
  │  │frontend    │     │ values.yaml          │   │  --atomic             │ │
  │  │prometheus  │     │ values.staging.yaml  │   └───────────────────────┘ │
  │  │grafana     │     │ values.production    │                             │
  │  └────────────┘     └──────────────────────┘                             │
  └──────────────────────────────────────────────────────────────────────────┘

  Data Flow Summary
  ─────────────────
  User triggers pipeline
    → POST /api/v1/projects/{id}/pipelines
    → PipelineService.create() saves Pipeline row
    → Kafka message published: pipeline.run
    → Pipeline Worker consumes message
    → PipelineStateMachine.run() iterates 15 stages
    → Each stage: AI agent calls Claude API → result saved as Artifact
    → Approval agents vote; human gate created if rejected
    → EventBus publishes stage updates → WebSocket → browser
    → On completion: all artifacts immutable, pipeline.status = COMPLETED

```

### Key Decisions

- **CQRS** - writes go to primary DB, reads from replica
- **Event Sourcing** - `EventStore` table is append-only; all state changes are events  
- **Hierarchical governance** - each domain has Execute/Review/Approve; no stage skips
- **Immutable artifacts** - once approved, artifacts are SHA-256 locked
- **HPA scaling** - 3→50 backend pods, 5→100 worker pods based on CPU + Kafka lag

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

| Email             | Password     | Role        |
|-------------------|--------------|-------------|
| `admin@forge.dev` | `Forge@2025` | OWNER       |
| `lead@forge.dev`  | `Lead@2025`  | MANAGER     |
| `dev@forge.dev`   | `Dev@2025`   | CONTRIBUTOR |

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
4. Push and open a PR - CI runs lint, type-check, security scan, and tests

---

## License

MIT - see [LICENSE](LICENSE)
