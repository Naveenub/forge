.PHONY: help dev dev-backend dev-frontend test lint format build docker-up docker-down migrate seed health

PYTHON  := python3
UV      := uv
NODE    := node
NPM     := npm

# ── Help ──────────────────────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Development ───────────────────────────────────────────────────────────────

dev: docker-up ## Start full dev stack (Docker + backend + frontend)
	@make -j2 dev-backend dev-frontend

dev-backend: ## Run FastAPI dev server
	cd backend && \
	  source .venv/bin/activate && \
	  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Run Vite dev server
	cd frontend && $(NPM) run dev

# ── Install ───────────────────────────────────────────────────────────────────

install: ## Install all dependencies
	@echo "→ Backend"
	cd backend && python3 -m venv .venv && \
	  source .venv/bin/activate && \
	  pip install --upgrade pip && \
	  pip install -r requirements.txt
	@echo "→ Frontend"
	cd frontend && $(NPM) ci

# ── Testing ───────────────────────────────────────────────────────────────────

test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend tests
	cd backend && source .venv/bin/activate && \
	  pytest tests/ -v --tb=short --cov=app --cov-report=term-missing

test-frontend: ## Run frontend tests
	cd frontend && $(NPM) test

test-ci: ## Run tests in CI mode (fail on coverage < 85%)
	cd backend && source .venv/bin/activate && \
	  pytest tests/ --cov=app --cov-fail-under=85 -q

# ── Lint & Format ─────────────────────────────────────────────────────────────

lint: lint-backend lint-frontend ## Lint everything

lint-backend: ## Lint backend (ruff + mypy)
	cd backend && source .venv/bin/activate && \
	  ruff check . && mypy app/

lint-frontend: ## Lint frontend (eslint)
	cd frontend && $(NPM) run lint

format: ## Auto-format backend code
	cd backend && source .venv/bin/activate && \
	  ruff format . && ruff check --fix .

# ── Build ─────────────────────────────────────────────────────────────────────

build: ## Build frontend production bundle
	cd frontend && $(NPM) run build

build-docker: ## Build Docker images
	docker build -f infrastructure/docker/Dockerfile.backend -t forge-backend:latest ./backend
	docker build -f infrastructure/docker/Dockerfile.frontend -t forge-frontend:latest ./frontend

# ── Docker ────────────────────────────────────────────────────────────────────

docker-up: ## Start Docker services (Postgres, Redis, Kafka)
	docker compose -f infrastructure/docker/docker-compose.yml up -d
	@echo "Waiting for Postgres..."
	@sleep 3

docker-down: ## Stop Docker services
	docker compose -f infrastructure/docker/docker-compose.yml down

docker-logs: ## Tail Docker service logs
	docker compose -f infrastructure/docker/docker-compose.yml logs -f

docker-clean: ## Stop and remove volumes
	docker compose -f infrastructure/docker/docker-compose.yml down -v

# ── Database ──────────────────────────────────────────────────────────────────

migrate: ## Run Alembic migrations
	cd backend && source .venv/bin/activate && \
	  alembic upgrade head

migrate-create: ## Create a new migration (usage: make migrate-create MSG="add users table")
	cd backend && source .venv/bin/activate && \
	  alembic revision --autogenerate -m "$(MSG)"

seed: ## Seed development data
	cd backend && source .venv/bin/activate && \
	  python ../scripts/seed.py

# ── Health ────────────────────────────────────────────────────────────────────

health: ## Check all service health
	@bash scripts/health_check.sh

# ── K8s / Helm ────────────────────────────────────────────────────────────────

helm-lint: ## Lint Helm chart
	helm lint infrastructure/helm/forge/

helm-dry-run: ## Dry-run Helm install
	helm install forge infrastructure/helm/forge/ --dry-run --debug

k8s-apply: ## Apply K8s manifests (namespace + config first)
	kubectl apply -f infrastructure/k8s/namespace.yaml
	kubectl apply -f infrastructure/k8s/configmap.yaml
	kubectl apply -f infrastructure/k8s/deployment.yaml

# ── Security ──────────────────────────────────────────────────────────────────

security-scan: ## Run SAST and dependency audit
	cd backend && source .venv/bin/activate && \
	  bandit -r app/ -ll && \
	  safety check

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean: ## Remove build artifacts and caches
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .mypy_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true
	rm -rf frontend/dist frontend/node_modules/.vite
	@echo "Clean ✓"

# ── Database Ops ─────────────────────────────────────────────────────────────

migrate-prod: ## Run migrations in production (requires KUBECONFIG + namespace)
	kubectl -n forge exec deploy/forge-backend -- alembic upgrade head

backup: ## Backup database (set DATABASE_URL env first)
	@bash scripts/backup.sh

backup-upload: ## Backup and upload to S3 (set DATABASE_URL + S3_BUCKET env)
	@bash scripts/backup.sh --upload s3://$(S3_BUCKET)

restore: ## Restore database from backup file (usage: make restore FILE=./backups/forge_db_xxx.sql.gz)
	@bash scripts/restore.sh --file $(FILE)

backup-list: ## List available local backups
	@bash scripts/restore.sh --list
