#!/bin/bash
# FILE: backend/docker-entrypoint.sh
# eLogix HRMS — Docker Entrypoint
# Fixed: App path, Gunicorn chdir, and uniform DB env loading

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()   { echo -e "$(date '+%H:%M:%S') ${GREEN}[elogix]${NC} $1"; }
warn()  { echo -e "$(date '+%H:%M:%S') ${YELLOW}[warn]${NC}  $1"; }
error() { echo -e "$(date '+%H:%M:%S') ${RED}[error]${NC} $1"; }

# ── Must run from project root (/opt/elogix) where alembic.ini lives ─
cd /opt/elogix
log "Working directory: $(pwd)"

if [ ! -f "alembic.ini" ]; then
    error "alembic.ini NOT FOUND at $(pwd)/alembic.ini"
    ls -la
    exit 1
fi

# ── Load environment ──────────────────────────────────────────────────
for env_file in ".env" "backend/.env"; do
    if [ -f "$env_file" ]; then
        log "Loading environment from $env_file"
        set -a; source "$env_file"; set +a
        break
    fi
done

# ── DB connection vars ────────────────────────────────────────────────
DB_HOST="${DB_HOST:-${POSTGRES_HOST:-elogix_db}}"
DB_PORT="${DB_PORT:-${POSTGRES_PORT:-5432}}"
DB_USER="${POSTGRES_USER:-${DB_USER:-nephr_user}}"
DB_NAME="${POSTGRES_DB:-${DB_NAME:-nephr_pro}}"
DB_PASSWORD="${POSTGRES_PASSWORD:-${DB_PASSWORD:-NeoHRMS2026!}}"

log "Database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

# ── Wait for PostgreSQL ───────────────────────────────────────────────
log "Waiting for PostgreSQL..."
MAX_RETRIES=30
RETRY=0
until PGPASSWORD="$DB_PASSWORD" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q 2>/dev/null; do
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge $MAX_RETRIES ]; then
        error "PostgreSQL not ready after $MAX_RETRIES attempts"
        error "DB_HOST=$DB_HOST DB_PORT=$DB_PORT DB_USER=$DB_USER DB_NAME=$DB_NAME"
        exit 1
    fi
    warn "Waiting... $RETRY/$MAX_RETRIES"
    sleep 2
done
log "✅ PostgreSQL is ready"

# ── Check table count ─────────────────────────────────────────────────
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" \
    -U "$DB_USER" -d "$DB_NAME" -t \
    -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" \
    2>/dev/null | tr -d ' ') || TABLE_COUNT=0

log "Database has $TABLE_COUNT existing tables"

# ── Run alembic migrations ────────────────────────────────────────────
log "Running: alembic upgrade head"
if python -m alembic upgrade head 2>&1; then
    log "✅ Migrations complete"
else
    warn "alembic upgrade head failed — trying to autogenerate initial migration"
    if [ -z "$(ls -A alembic/versions/ 2>/dev/null)" ]; then
        log "No migration files found — generating initial schema..."
        python -m alembic revision --autogenerate -m "initial_schema" && \
        python -m alembic upgrade head && \
        log "✅ Initial migration created and applied" || \
        warn "Migration failed — continuing startup anyway"
    fi
fi

# ── Verify version ────────────────────────────────────────────────────
VERSION=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" \
    -U "$DB_USER" -d "$DB_NAME" -t \
    -c "SELECT version_num FROM alembic_version LIMIT 1;" \
    2>/dev/null | tr -d ' ') || VERSION="unknown"
log "DB schema version: ${VERSION:-none}"

# ── Create tenant upload dirs ─────────────────────────────────────────
mkdir -p uploads logs

PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" \
    -U "$DB_USER" -d "$DB_NAME" -t \
    -c "SELECT slug FROM tenant_companies WHERE status IN ('active','trial');" \
    2>/dev/null | while read slug; do
    slug=$(echo "$slug" | tr -d ' \r')
    [ -n "$slug" ] && mkdir -p "uploads/$slug/"{employees,applicants,company,exports}
done

log "✅ Upload directories ready"

# ── Start application ─────────────────────────────────────────────────
COMMAND="${1:-gunicorn}"
case "$COMMAND" in
    gunicorn)
        WORKERS="${GUNICORN_WORKERS:-4}"
        log "Starting Gunicorn: $WORKERS workers on :5000"
        exec python -m gunicorn \
            --workers "$WORKERS" \
            --threads "${GUNICORN_THREADS:-2}" \
            --worker-class gthread \
            --timeout "${GUNICORN_TIMEOUT:-120}" \
            --bind "0.0.0.0:5000" \
            --access-logfile "-" \
            --error-logfile "-" \
            --log-level "info" \
            --forwarded-allow-ips "*" \
            "run:app"
        ;;
    flask)
        exec python run.py ;;
    migrate-only)
        log "Migration-only mode complete"; exit 0 ;;
    *)
        exec "$@" ;;
esac
