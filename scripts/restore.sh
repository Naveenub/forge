#!/usr/bin/env bash
# =============================================================================
# Forge — Database Restore Script
# =============================================================================
# Restores a PostgreSQL backup created by backup.sh.
#
# Usage:
#   ./scripts/restore.sh --file ./backups/forge_db_20250225_120000.sql.gz
#   ./scripts/restore.sh --file s3://my-bucket/forge_db_20250225_120000.sql.gz
#   ./scripts/restore.sh --list              # list available local backups
#
# Environment:
#   DATABASE_URL   — target Postgres DSN
#   BACKUP_DIR     — local backup directory (default: ./backups)
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
die()   { error "$*"; exit 1; }

BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_FILE=""
LIST_MODE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)  BACKUP_FILE="$2"; shift 2 ;;
    --list)  LIST_MODE=true; shift ;;
    -h|--help)
      echo "Usage: $0 --file <path-or-s3-uri> | --list"
      exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

# ── List mode ─────────────────────────────────────────────────────────────────
if $LIST_MODE; then
  info "Available backups in ${BACKUP_DIR}:"
  echo ""
  find "$BACKUP_DIR" -name "forge_*.sql.gz" -printf "%T@ %Tc  %s bytes  %p\n" 2>/dev/null \
    | sort -rn \
    | awk '{print NR". "$2" "$3"  "$4" "$5"  "$6}' \
    || echo "  (no backups found)"
  exit 0
fi

[[ -n "$BACKUP_FILE" ]] || die "No backup file specified. Use --file <path> or --list"

# ── Prerequisites ─────────────────────────────────────────────────────────────
command -v psql    &>/dev/null || die "psql not found — install postgresql-client"
command -v gunzip  &>/dev/null || die "gunzip not found"
[[ -n "${DATABASE_URL:-}" ]] || die "DATABASE_URL not set"

# ── Parse DSN ─────────────────────────────────────────────────────────────────
DSN_REGEX='^postgresql(\+asyncpg)?://([^:]+):([^@]+)@([^:]+):?([0-9]*)/(.+)$'
if [[ "$DATABASE_URL" =~ $DSN_REGEX ]]; then
  DB_USER="${BASH_REMATCH[2]}"
  DB_PASS="${BASH_REMATCH[3]}"
  DB_HOST="${BASH_REMATCH[4]}"
  DB_PORT="${BASH_REMATCH[5]:-5432}"
  DB_NAME="${BASH_REMATCH[6]}"
else
  die "Cannot parse DATABASE_URL"
fi

export PGPASSWORD="$DB_PASS"

# ── Download from remote if needed ───────────────────────────────────────────
LOCAL_FILE="$BACKUP_FILE"
CLEANUP_TEMP=false

if [[ "$BACKUP_FILE" == s3://* ]]; then
  command -v aws &>/dev/null || die "aws CLI not found"
  TMP_FILE=$(mktemp --suffix=".sql.gz")
  info "Downloading from S3: ${BACKUP_FILE}"
  aws s3 cp "$BACKUP_FILE" "$TMP_FILE"
  LOCAL_FILE="$TMP_FILE"
  CLEANUP_TEMP=true

elif [[ "$BACKUP_FILE" == gs://* ]]; then
  command -v gsutil &>/dev/null || die "gsutil not found"
  TMP_FILE=$(mktemp --suffix=".sql.gz")
  info "Downloading from GCS: ${BACKUP_FILE}"
  gsutil cp "$BACKUP_FILE" "$TMP_FILE"
  LOCAL_FILE="$TMP_FILE"
  CLEANUP_TEMP=true
fi

[[ -f "$LOCAL_FILE" ]] || die "Backup file not found: ${LOCAL_FILE}"

# ── Verify checksum if manifest exists ───────────────────────────────────────
MANIFEST="${BACKUP_DIR}/manifest.json"
FILENAME=$(basename "$LOCAL_FILE")
if [[ -f "$MANIFEST" ]] && command -v jq &>/dev/null; then
  EXPECTED_HASH=$(jq -r --arg f "$FILENAME" '.[] | select(.file == $f) | .sha256' "$MANIFEST" 2>/dev/null || echo "")
  if [[ -n "$EXPECTED_HASH" ]]; then
    ACTUAL_HASH=$(sha256sum "$LOCAL_FILE" | cut -d' ' -f1)
    if [[ "$ACTUAL_HASH" != "$EXPECTED_HASH" ]]; then
      die "Checksum mismatch! Expected ${EXPECTED_HASH}, got ${ACTUAL_HASH}. Aborting restore."
    fi
    info "Checksum verified ✓"
  fi
fi

# ── Safety prompt ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${YELLOW}⚠  WARNING: This will DESTROY and replace the current database!${NC}"
echo -e "   Target: ${BOLD}${DB_NAME}${NC} on ${DB_HOST}:${DB_PORT}"
echo -e "   File:   $(basename "$BACKUP_FILE")"
echo ""
read -rp "Type 'yes' to confirm: " CONFIRM
[[ "$CONFIRM" == "yes" ]] || die "Restore cancelled"

# ── Drop & recreate database ──────────────────────────────────────────────────
info "Terminating existing connections to '${DB_NAME}' …"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" \
  > /dev/null 2>&1 || true

# ── Restore ───────────────────────────────────────────────────────────────────
START_TS=$(date +%s)
info "Restoring from $(basename "$BACKUP_FILE") …"

gunzip -c "$LOCAL_FILE" | psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --echo-errors \
  -v ON_ERROR_STOP=1

END_TS=$(date +%s)
DURATION=$(( END_TS - START_TS ))

info "Restore complete in ${DURATION}s ✓"

# ── Run migrations to ensure schema is current ───────────────────────────────
if command -v alembic &>/dev/null; then
  info "Running Alembic migrations to ensure schema is up to date …"
  alembic upgrade head
  info "Migrations applied ✓"
fi

# ── Cleanup ───────────────────────────────────────────────────────────────────
if $CLEANUP_TEMP && [[ -f "$TMP_FILE" ]]; then
  rm -f "$TMP_FILE"
fi

info "Database restore finished successfully ✓"
