#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Forge — Service Health Check
# Usage: ./scripts/health_check.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✓${NC} $*"; }
fail() { echo -e "  ${RED}✗${NC} $*"; FAILURES=$((FAILURES+1)); }
info() { echo -e "${CYAN}$*${NC}"; }

FAILURES=0
API_BASE="${API_BASE:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

echo ""
info "⬡ Forge — Health Check"
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── API ───────────────────────────────────────────────────────────────────
info "API ($API_BASE)"
if curl -sf "$API_BASE/api/v1/health" >/dev/null 2>&1; then
  HEALTH=$(curl -sf "$API_BASE/api/v1/health")
  ok "Health endpoint → $HEALTH"
else
  fail "Cannot reach $API_BASE/api/v1/health"
fi

if curl -sf "$API_BASE/api/docs" >/dev/null 2>&1; then
  ok "Swagger docs → $API_BASE/api/docs"
else
  fail "Swagger docs not reachable"
fi

echo ""

# ── Frontend ─────────────────────────────────────────────────────────────
info "Frontend ($FRONTEND_URL)"
if curl -sf "$FRONTEND_URL" >/dev/null 2>&1; then
  ok "Dashboard is reachable"
else
  fail "Cannot reach $FRONTEND_URL"
fi

echo ""

# ── Docker services ───────────────────────────────────────────────────────
info "Docker Services"
if command -v docker >/dev/null 2>&1; then
  for svc in postgres redis kafka; do
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "$svc"; then
      ok "$svc container running"
    else
      fail "$svc container not found"
    fi
  done
else
  echo -e "  ${YELLOW}!${NC} Docker not available — skipping container checks"
fi

echo ""

# ── Agent API ────────────────────────────────────────────────────────────
info "Agents"
if curl -sf "$API_BASE/api/v1/agents" >/dev/null 2>&1; then
  COUNT=$(curl -sf "$API_BASE/api/v1/agents" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
  ok "$COUNT agents registered"
else
  fail "Cannot reach agents endpoint"
fi

echo ""
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAILURES" -eq 0 ]; then
  echo -e "${GREEN}  All checks passed ✓${NC}"
else
  echo -e "${RED}  $FAILURES check(s) failed ✗${NC}"
  exit 1
fi
echo ""
