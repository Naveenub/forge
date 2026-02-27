#!/usr/bin/env bash
# =============================================================================
# Forge — Database Backup Script
# =============================================================================
# Creates a compressed, timestamped PostgreSQL dump and optionally uploads
# it to S3 / GCS.
#
# Usage:
#   ./scripts/backup.sh                          # local backup
#   ./scripts/backup.sh --upload s3://my-bucket  # backup + S3 upload
#   ./scripts/backup.sh --retention 30           # prune backups older than 30d
#
# Environment:
#   DATABASE_URL   — Postgres DSN (postgresql://user:pass@host:5432/dbname)
#   BACKUP_DIR     — local directory for backup files (default: ./backups)
#   AWS_PROFILE    — optional AWS profile for S3 upload
#   GCS_BUCKET     — optional GCS bucket path for upload
# =============================================================================

set -euo pipefail

# ── Colour output ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
die()     { error "$*"; exit 1; }

# ── Defaults ──────────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS=30
UPLOAD_TARGET=""
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
HOSTNAME_SLUG=$(hostname -s | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-')

# ── Arg parsing ───────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --upload)    UPLOAD_TARGET="$2"; shift 2 ;;
    --retention) RETENTION_DAYS="$2"; shift 2 ;;
    --dir)       BACKUP_DIR="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--upload <s3://bucket|gs://bucket>] [--retention <days>] [--dir <path>]"
      exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

# ── Validate prerequisites ────────────────────────────────────────────────────
command -v pg_dump  &>/dev/null || die "pg_dump not found — install postgresql-client"
command -v gzip     &>/dev/null || die "gzip not found"

[[ -n "${DATABASE_URL:-}" ]] || die "DATABASE_URL environment variable is not set"

# ── Parse DSN ────────────────────────────────────────────────────────────────
# Expected format: postgresql://user:pass@host:port/dbname
DSN_REGEX='^postgresql(\+asyncpg)?://([^:]+):([^@]+)@([^:]+):?([0-9]*)/(.+)$'
if [[ "$DATABASE_URL" =~ $DSN_REGEX ]]; then
  DB_USER="${BASH_REMATCH[2]}"
  DB_PASS="${BASH_REMATCH[3]}"
  DB_HOST="${BASH_REMATCH[4]}"
  DB_PORT="${BASH_REMATCH[5]:-5432}"
  DB_NAME="${BASH_REMATCH[6]}"
else
  die "Cannot parse DATABASE_URL — expected postgresql://user:pass@host:port/dbname"
fi

export PGPASSWORD="$DB_PASS"

# ── Prepare backup directory ──────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="${BACKUP_DIR}/forge_${DB_NAME}_${HOSTNAME_SLUG}_${TIMESTAMP}.sql.gz"

info "Starting backup of database '${DB_NAME}' on ${DB_HOST}:${DB_PORT}"
info "Output: ${BACKUP_FILE}"

# ── Run pg_dump ───────────────────────────────────────────────────────────────
START_TS=$(date +%s)

pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=plain \
  --no-acl \
  --no-owner \
  --clean \
  --if-exists \
  | gzip -9 > "$BACKUP_FILE"

END_TS=$(date +%s)
DURATION=$(( END_TS - START_TS ))
SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
CHECKSUM=$(sha256sum "$BACKUP_FILE" | cut -d' ' -f1)

info "Backup complete in ${DURATION}s — ${SIZE} — SHA256: ${CHECKSUM}"

# ── Write manifest ────────────────────────────────────────────────────────────
MANIFEST_FILE="${BACKUP_DIR}/manifest.json"
MANIFEST_ENTRY=$(cat <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "database": "${DB_NAME}",
  "host": "${DB_HOST}",
  "file": "$(basename "$BACKUP_FILE")",
  "size_human": "${SIZE}",
  "sha256": "${CHECKSUM}",
  "duration_seconds": ${DURATION}
}
EOF
)

# Append to manifest array (jq required for clean JSON; fallback to append)
if command -v jq &>/dev/null; then
  if [[ -f "$MANIFEST_FILE" ]]; then
    jq --argjson entry "$MANIFEST_ENTRY" '. += [$entry]' "$MANIFEST_FILE" > "${MANIFEST_FILE}.tmp"
    mv "${MANIFEST_FILE}.tmp" "$MANIFEST_FILE"
  else
    echo "[$MANIFEST_ENTRY]" | jq '.' > "$MANIFEST_FILE"
  fi
else
  echo "$MANIFEST_ENTRY" >> "${MANIFEST_FILE}.ndjson"
fi

# ── Upload ────────────────────────────────────────────────────────────────────
if [[ -n "$UPLOAD_TARGET" ]]; then
  info "Uploading to ${UPLOAD_TARGET} …"

  if [[ "$UPLOAD_TARGET" == s3://* ]]; then
    command -v aws &>/dev/null || die "aws CLI not found — install awscli"
    aws s3 cp "$BACKUP_FILE" "${UPLOAD_TARGET}/$(basename "$BACKUP_FILE")" \
      --sse aws:kms \
      --storage-class STANDARD_IA
    info "Uploaded to S3: ${UPLOAD_TARGET}/$(basename "$BACKUP_FILE")"

  elif [[ "$UPLOAD_TARGET" == gs://* ]]; then
    command -v gsutil &>/dev/null || die "gsutil not found — install google-cloud-sdk"
    gsutil cp "$BACKUP_FILE" "${UPLOAD_TARGET}/$(basename "$BACKUP_FILE")"
    info "Uploaded to GCS: ${UPLOAD_TARGET}/$(basename "$BACKUP_FILE")"

  else
    warn "Unknown upload scheme '${UPLOAD_TARGET}' — skipping upload"
  fi
fi

# ── Prune old backups ─────────────────────────────────────────────────────────
info "Pruning backups older than ${RETENTION_DAYS} days from ${BACKUP_DIR} …"
find "$BACKUP_DIR" -name "forge_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete
info "Pruning complete"

info "Backup finished successfully ✓"
