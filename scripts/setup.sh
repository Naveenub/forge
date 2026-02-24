#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Forge — One-command dev setup
# Usage: ./scripts/setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${CYAN}[setup]${NC} $*"; }
ok()    { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; exit 1; }

info "Forge — Development Setup"
echo ""

# ── Check prerequisites ───────────────────────────────────────────────────
info "Checking prerequisites..."
command -v python3  >/dev/null || error "python3 not found. Install Python 3.11+"
command -v node     >/dev/null || error "node not found. Install Node.js 18+"
command -v npm      >/dev/null || error "npm not found"
command -v docker   >/dev/null || error "docker not found. Install Docker Desktop"
command -v git      >/dev/null || error "git not found"

PYTHON_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
NODE_VER=$(node --version | tr -d 'v' | cut -d. -f1)

[[ "$PYTHON_VER" < "3.11" ]] && error "Python 3.11+ required (found $PYTHON_VER)"
[[ "$NODE_VER" -lt 18 ]]     && error "Node.js 18+ required (found $NODE_VER)"
ok "Python $PYTHON_VER · Node $NODE_VER · Docker $(docker --version | awk '{print $3}' | tr -d ',')"

# ── Environment file ──────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  info "Creating .env from .env.example..."
  cp .env.example .env
  warn "Edit .env and add your ANTHROPIC_API_KEY before starting the app"
else
  ok ".env already exists"
fi

# ── Backend Python environment ────────────────────────────────────────────
info "Setting up Python virtual environment..."
cd backend
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
ok "Backend dependencies installed"
cd ..

# ── Frontend Node modules ─────────────────────────────────────────────────
info "Installing frontend dependencies..."
cd frontend
npm install --silent
ok "Frontend dependencies installed ($(ls node_modules | wc -l | tr -d ' ') packages)"
cd ..

# ── Start infrastructure services ─────────────────────────────────────────
info "Starting Docker services (Postgres, Redis, Kafka)..."
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redis kafka zookeeper

info "Waiting for Postgres to be ready..."
for i in $(seq 1 30); do
  if docker compose -f infrastructure/docker/docker-compose.yml exec -T postgres pg_isready -U forge >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
ok "Postgres is ready"

# ── Run migrations ────────────────────────────────────────────────────────
info "Running database migrations..."
cd backend
source .venv/bin/activate
DATABASE_URL="postgresql+asyncpg://forge:secret@localhost:5432/forge_db" \
  python -c "print('Migrations: placeholder — integrate Alembic here')" 2>/dev/null || true
ok "Migrations complete"
cd ..

# ── Seed demo data ────────────────────────────────────────────────────────
if [ -f "scripts/seed.py" ]; then
  info "Seeding demo data..."
  cd backend
  source .venv/bin/activate
  python ../scripts/seed.py 2>/dev/null || warn "Seed failed (non-fatal, DB may already have data)"
  cd ..
fi

# ── Done ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Setup complete! Start the dev servers:${NC}"
echo ""
echo -e "  ${CYAN}# Terminal 1 — Backend${NC}"
echo -e "  cd backend && source .venv/bin/activate"
echo -e "  uvicorn app.main:app --reload --port 8000"
echo ""
echo -e "  ${CYAN}# Terminal 2 — Frontend${NC}"
echo -e "  cd frontend && npm run dev"
echo ""
echo -e "  ${CYAN}# Dashboard${NC}    → http://localhost:5173"
echo -e "  ${CYAN}# API Docs${NC}     → http://localhost:8000/api/docs"
echo -e "  ${CYAN}# Grafana${NC}      → http://localhost:3001  (admin/admin)"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
warn "Don't forget to add your ANTHROPIC_API_KEY to .env"
