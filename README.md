```
███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
█████╗  ██║   ██║██████╔╝██║  ███╗█████╗
██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝
██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

  ⬡ Autonomous AI Software Platform
 
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 
 
  15 agents · 5 domains · 0 manual handoffs
  Architecture → Dev → Testing → Security → DevOps
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688.svg)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg)](https://docker.com)

---

What is this?

The Forge replaces your entire engineering review chain with 15 specialized Claude-powered AI agents organized across 5 domains. Each domain enforces a strict Execute → Review → Approve governance hierarchy - no stage proceeds without a sign-off.

```
Requirements → Architecture → Development → Testing → Security → DevOps → Production → 3 agents → 3 agents → 3 agents → 3 agents → 3 agents
```

Agent Domains

| Domain        | Agents                                    | Responsibility                    |
|---------------|-------------------------------------------|-----------------------------------|
| Architecture  | Architect · Sr. Architect · Arch Approval | Design, schema, API contracts     |
| Development   | Developer · Sr. Developer · Dev Manager   | Code generation, review, approval |
| Testing       | Tester · Sr. Tester · QA Manager          | Test suites, coverage, QA gate    |
| Security      | Sec Engineer · Sr. Security · Sec Manager | OWASP scan, SAST, clearance       |
| DevOps        | Cloud Eng · Cloud Lead · Cloud Manager    | Docker, K8s, Helm, CI/CD, deploy  |

---

Quick Start

Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+
- Anthropic API key

1. Clone & configure

```bash
git clone https://github.com/your-org/forge.git
cd forge
cp .env.example .env
Edit .env and add your ANTHROPIC_API_KEY
```

2. Start with Docker Compose

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

3. Local development

```bash
Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
forge/
├── 🖥  frontend/                         ◄  React 18 + Vite Dashboard
│   ├── src/
│   │   ├── App.jsx                       ◄  Full dashboard · auth · all views
│   │   ├── main.jsx                      ◄  Entry point
│   │   ├── components/                   ◄  Shared UI atoms
│   │   ├── hooks/                        ◄  Custom React hooks
│   │   └── utils/                        ◄  Helpers & constants
│   ├── public/
│   │   └── favicon.svg
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── .eslintrc.cjs
├── ⚙️  backend/                           ◄  FastAPI · Async · CQRS
│   ├── app/
│   │   ├── main.py                       ◄  FastAPI entry · middleware · lifespan
│   │   │
│   │   ├── 🤖 agents/                    ◄  THE ENGINE
│   │   │   ├── orchestrator.py           ◄  15 Claude agents · 5 domain hierarchy
│   │   │   └── pipeline_engine.py        ◄  State machine · Execute→Review→Approve
│   │   ├── 🔌 api/v1/
│   │   │   ├── routes.py                 ◄  REST · workspaces/projects/pipelines
│   │   │   └── websocket.py              ◄  Real-time log streaming
│   │   ├── 🏛  core/
│   │   │   └── config.py                 ◄  Pydantic settings · env validation
│   │   ├── 🗄  db/
│   │   │   └── models.py                 ◄  SQLAlchemy · Event sourcing · Artifacts
│   │   └── 🛡  middleware/
│   │       ├── rate_limiter.py           ◄  Redis sliding-window · 1000 RPM
│   │       └── audit.py                  ◄  Immutable audit log · append-only
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── test_routes.py            ◄  20+ API endpoint tests
│   │   │   └── test_orchestrator.py      ◄  Agent logic · governance · artifacts
│   │   └── integration/
│   │       └── test_pipeline_flow.py     ◄  Full E2E pipeline flow
│   ├── pyproject.toml                    ◄  Ruff · mypy · pytest · 85% cov min
│   └── requirements.txt
├── 🏗  infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml            ◄  Full stack · Postgres · Redis · Kafka
│   │   └── Dockerfile.backend            ◄  Multi-stage · non-root · slim
│   ├── k8s/
│   │   └── deployment.yaml              ◄  HPA · PDB · NetworkPolicy · Ingress
│   ├── helm/forge/
│   │   ├── Chart.yaml
│   │   └── values.yaml                  ◄  3→50 pods · autoscaling · TLS
│   └── monitoring/
│       └── prometheus.yml               ◄  Metrics · alerts · Grafana-ready
├── 🔁 .github/
│   ├── workflows/
│   │   ├── deploy.yml                   ◄  Blue-green · health check · rollback
│   │   └── pr-checks.yml               ◄  Lint · typecheck · SAST · tests · build
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
├── 📜 docs/
│   ├── ARCHITECTURE.md                  ◄  System design · scaling · security
│   ├── AGENTS.md                        ◄  All 15 agents · prompts · governance
│   └── API.md                           ◄  Full endpoint reference · examples
├── ⚡ scripts/
│   ├── setup.sh                         ◄  One-command dev setup
│   ├── seed.py                          ◄  Demo workspaces · projects · users
│   └── health_check.sh                  ◄  Verify all services are live
├── README.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── LICENSE                              ◄  Apache 2.0
├── .env.example                         ◄  All 30+ vars documented
├── .gitignore
└── docker-compose.yml                   ◄  Root shortcut

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  56 files  ·  5 layers  ·  React → FastAPI → Agents → Postgres → K8s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Architecture

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⬡  F O R G E  ─  SYSTEM ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BROWSER LAYER
┌────────────────────────────────────────────────────────────────────────────┐
│  ⬡ FORGE DASHBOARD  (React 18 + Vite)                                      │
│                                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   PIPELINE   │  │  ARTIFACTS   │  │   MONITOR    │  │   SETTINGS   │    │
│  │──────────────│  │──────────────│  │──────────────│  │──────────────│    │
│  │ Agent Tree   │  │ Code Viewer  │  │ Live Metrics │  │ Agent Config │    │
│  │ Log Stream   │  │ SHA Locks    │  │ SLA / HPA    │  │ Governance   │    │
│  │ Approvals    │  │ Download     │  │ DB Stats     │  │ 5-Tab Panel  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                            │
│  Account  ·  Profile  ·  2FA  ·  API Keys  ·  Audit Log                    │
└───────────────────────────────────┬────────────────────────────────────────┘
                                    │
                                    │  HTTPS (REST) + WSS (WebSocket)
                                    ▼
INGRESS LAYER
┌───────────────────────────────────────────────────────────────────────────────┐
│  NGINX INGRESS                                                                │
│  ───────────────────────────────────────────────────────────────────────────  │
│  TLS Termination · Rate Limiting · Route/api → backend · Route/ws → websocket │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                    │
                                    ▼
API LAYER  (FastAPI · Python 3.11 · Async · 3 → 50 Pods via HPA)
┌───────────────────────────────────────────────────────────────────┐
│  REST ENDPOINTS:                                                  │
│    /api/v1/workspaces                                             │
│    /api/v1/projects                                               │
│    /api/v1/pipelines                                              │
│    /api/v1/agents                                                 │
│    /api/v1/artifacts                                              │
│    /api/v1/approvals                                              │
│    /api/v1/metrics                                                │
│                                                                   │
│  WEBSOCKET:                                                       │
│    /ws/{pipeline_id}                                              │
│      • Agent log fan-out                                          │
│      • Pipeline state streaming                                   │
│      • Approval push notifications                                │
│                                                                   │
│  MIDDLEWARE STACK:                                                │
│    JWT Auth  →  Redis Rate Limiter (1000 RPM)  →  Audit Logger    │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
AGENT ORCHESTRATOR  ─  THE ENGINE
┌─────────────────────────────────────────────────────────────────────────────┐
│  REQUIREMENTS  ───────────────────────────────────────────────►  PRODUCTION │
│                                                                             │
│  ARCHITECTURE DOMAIN                                                        │
│    ① Architect                                                              │
│    ② Sr. Architect                                                          │
│    ③ Architecture Approval                                                  │
│       → Schema · API Contracts · Blueprint Lock                             │
│                                                                             │
│  DEVELOPMENT DOMAIN                                                         │
│    ④ Developer                                                              │
│    ⑤ Sr. Developer                                                          │
│    ⑥ Development Manager                                                    │
│       → Code Gen · Review · Release Tag                                     │
│                                                                             │
│  TESTING DOMAIN                                                             │
│    ⑦ Tester                                                                 │
│    ⑧ Sr. Tester                                                             │
│    ⑨ QA Manager                                                             │
│       → Unit + Integration · Coverage Gate · QA Clearance                   │
│                                                                             │
│  SECURITY DOMAIN                                                            │
│    ⑩ Security Engineer                                                      │
│    ⑪ Sr. Security Engineer                                                  │
│    ⑫ Security Manager                                                       │
│       → OWASP · SAST · Dependency Scan · Prod Clearance                     │
│                                                                             │
│  DEVOPS DOMAIN  (Optional Per Project)                                      │
│    ⑬ Cloud Engineer                                                         │
│    ⑭ Cloud Lead                                                             │
│    ⑮ Cloud Manager                                                          │
│       → Docker · K8s · Helm · CI/CD · Blue-Green · Rollback                 │
│                                                                             │
│  Every agent invokes:  Claude Opus 4.6  via  Anthropic API                  │
└───────────────────────┬──────────────────────────┬──────────────────────────┘
                        │                          │
                        ▼                          ▼
                  EXTERNAL AI                 EVENT STREAM
            ┌────────────────────┐   ┌────────────────────────────┐
            │  ANTHROPIC API     │   │  KAFKA CLUSTER (3 Brokers) │
            │────────────────────│   │────────────────────────────│
            │  claude-opus-4-6   │   │  pipeline.events           │
            │  8192 tokens       │   │  agent.logs                │
            │  300s timeout      │   │  governance.approvals      │
            └─────────┬──────────┘   └─────────────┬──────────────┘
                      │                            │
                      └──────────────┬─────────────┘
                                     ▼
DATA LAYER
┌─────────────────────────┬─────────────────────────┬──────────────────────────┐
│ POSTGRESQL              │ REDIS                   │ OBJECT STORAGE           │
│─────────────────────────│─────────────────────────│──────────────────────────│
│ Primary (Writes)        │ Session Cache           │ Artifact Blobs           │
│ Replica (Reads)         │ Rate Limit Counters     │ SHA-256 Locked           │
│ pipelines               │ WS Connections          │ Immutable After Approval │
│ artifacts (locked)      │ Pipeline State (TTL)    │ Pre-Signed URLs          │
│ audit_events            │                         │                          │
│ event_store (append)    │                         │                          │
│ workspaces              │                         │                          │
│ projects                │                         │                          │
│ approvals               │                         │                          │
└─────────────────────────┴─────────────────────────┴──────────────────────────┘
                                     │
                                     ▼
OBSERVABILITY & CI/CD
┌─────────────────────────┬─────────────────────────┬──────────────────────────┐
│ PROMETHEUS              │ GRAFANA                 │ GITHUB ACTIONS           │
│─────────────────────────│─────────────────────────│──────────────────────────│
│ /metrics scrape         │ Pipeline Dashboards     │ PR: Lint + Typecheck     │
│ HPA triggers            │ Agent Performance       │     SAST + Tests         │
│ Kafka lag alerts        │ SLA / Uptime            │     Build Validation     │
│ p99 latency             │ Kafka Lag View          │ Push: Blue-Green Deploy  │
│ Error rate              │ DB Pool Metrics         │      Health + Rollback   │
└─────────────────────────┴─────────────────────────┴──────────────────────────┘
                                     │
                                     ▼
GOVERNANCE FLOW
┌────────────────────────────────────────────────────────────────────┐
|   DROP REQUIREMENTS                                                |
|           │                                                        |
|           ▼                                                        |
|        EXECUTE                                                     |
|           │                                                        |
|           ▼                                                        |
|         REVIEW                                                     |
|           │                                                        |
|           ▼                                                        |
|        APPROVE ────────┬────────► REJECT                           |
|           │            │                                           |
|           │            └────► PIPELINE HALTED → HUMAN DECISION     |
|           ▼                                                        |
|      NEXT DOMAIN                                                   |
|           │                                                        |
|           ▼                                                        |
|     ARTIFACT LOCKED (SHA-256 · Immutable · 90-Day Audit Trail)     |
|           │                                                        |
|           ▼                                                        |
|   DEPLOY TO PRODUCTION ✓                                           |
└────────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
React → FastAPI → 15 Agents → Anthropic → Kafka → Postgres → Redis → K8s HA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Key Decisions

- CQRS - writes go to primary DB, reads from replica
- Event Sourcing - `EventStore` table is append-only; all state changes are events  
- Hierarchical governance - each domain has Execute/Review/Approve; no stage skips
- Immutable artifacts - once approved, artifacts are SHA-256 locked
- HPA scaling - 3→50 backend pods, 5→100 worker pods based on CPU + Kafka lag

---

Configuration

Copy `.env.example` to `.env` and fill in:

```env
Required
ANTHROPIC_API_KEY=sk-ant-...

Database
DATABASE_URL=postgresql+asyncpg://forge:secret@localhost:5432/forge
REDIS_URL=redis://localhost:6379/0

Kafka
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

Auth
JWT_SECRET=change-me-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

See `.env.example` for the full list.

---

Demo Accounts

| Email             | Password     | Role        |
|-------------------|--------------|-------------|
| `admin@forge.dev` | `Forge@2025` | OWNER       |
| `lead@forge.dev`  | `Lead@2025`  | MANAGER     |
| `dev@forge.dev`   | `Dev@2025`   | CONTRIBUTOR |

---

Deployment

Kubernetes (Production)

```bash
Create namespace and secrets
kubectl create namespace forge
kubectl create secret generic forge-secrets \
  --from-literal=anthropic-api-key=$ANTHROPIC_API_KEY \
  --from-literal=jwt-secret=$JWT_SECRET \
  -n forge

Deploy
kubectl apply -f infrastructure/k8s/ -n forge

Watch rollout
kubectl rollout status deployment/forge-backend -n forge
```

Helm

```bash
helm upgrade --install forge infrastructure/helm/forge \
  --namespace forge \
  --set anthropicApiKey=$ANTHROPIC_API_KEY \
  --set image.tag=latest
```

GitHub Actions CI/CD

Push to `develop` → staging deployment  
Create a release tag → blue-green production deployment with health checks and auto-rollback

---

Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit with conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
4. Push and open a PR - CI runs lint, type-check, security scan, and tests

---

License

MIT - see [LICENSE](LICENSE)
