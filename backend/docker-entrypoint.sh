#!/bin/bash
# FILE: backend/docker-entrypoint.sh
# eLogix HRMS — Docker Container Entrypoint
# FIX: Runs alembic from /opt/elogix/ (project root) NOT /opt/elogix/backend/
# because alembic.ini lives at the project root.
# eLogix Technologies · www.elogix.com.np

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()   { echo -e "$(date '+%H:%M:%S') ${GREEN}[elogix]${NC} $1"; }
warn()  { echo -e "$(date '+%H:%M:%S') ${YELLOW}[warn]${NC}  $1"; }
error() { echo -e "$(date '+%H:%M:%S') ${RED}[error]${NC} $1"; }

# ── Working directory MUST be project root ────────────────────────────
# alembic.ini is at /opt/elogix/alembic.ini
# If WORKDIR in Dockerfile is set correctly this is already /opt/elogix
cd /opt/elogix
log "Working directory: $(pwd)"

# ── Verify alembic.ini exists ─────────────────────────────────────────
if [ ! -f "alembic.ini" ]; then
    error "alembic.ini NOT FOUND at $(pwd)/alembic.ini"
    error "Contents of $(pwd):"
    ls -la
    error "This is the cause of: FAILED: No config file 'alembic.ini' found"
    error "Fix: Make sure WORKDIR in Dockerfile is /opt/elogix (project root), not /opt/elogix/backend"
    exit 1
fi
log "✅ alembic.ini found at $(pwd)/alembic.ini"

# ── Load environment ──────────────────────────────────────────────────
# Try both root .env and backend/.env
for env_file in ".env" "backend/.env"; do
    if [ -f "$env_file" ]; then
        log "Loading environment from $env_file"
        set -a; source "$env_file"; set +a
        break
    fi
done

# Set defaults if not in env
DB_HOST="${DB_HOST:-${POSTGRES_HOST:-elogix_db}}"
DB_PORT="${DB_PORT:-${POSTGRES_PORT:-5432}}"
DB_USER="${DB_USER:-${POSTGRES_USER:-elogix}}"
DB_NAME="${DB_NAME:-${POSTGRES_DB:-elogix_prod}}"
DB_PASS="${DB_PASSWORD:-${POSTGRES_PASSWORD:-}}"

log "Database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

# ── Wait for PostgreSQL ───────────────────────────────────────────────
log "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
MAX_RETRIES=30
RETRY=0
until PGPASSWORD="$DB_PASS" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q 2>/dev/null; do
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge $MAX_RETRIES ]; then
        error "PostgreSQL not ready after ${MAX_RETRIES} attempts. Check:"
        error "  DB_HOST=$DB_HOST  DB_PORT=$DB_PORT  DB_USER=$DB_USER"
        error "  Is the database container running? (docker ps)"
        error "  Is the database name correct? (POSTGRES_DB=$DB_NAME)"
        exit 1
    fi
    warn "  Waiting for DB... attempt $RETRY/$MAX_RETRIES"
    sleep 2
done
log "✅ PostgreSQL is ready"

# ── Check if schema needs initialisation ─────────────────────────────
log "Checking database schema..."
TABLE_COUNT=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')

if [ "${TABLE_COUNT:-0}" = "0" ]; then
    log "Empty database detected — initialising schema from saas_schema.sql..."
    if [ -f "backend/database/saas_schema.sql" ]; then
        PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -f "backend/database/saas_schema.sql" \
            && log "✅ Schema initialised from saas_schema.sql" \
            || { warn "Schema init from SQL had errors — continuing with alembic"; }
    else
        warn "saas_schema.sql not found — skipping manual init"
    fi
else
    log "Database has $TABLE_COUNT existing tables"
fi

# ── Run Alembic migrations ────────────────────────────────────────────
# CRITICAL: Run from /opt/elogix/ (project root) where alembic.ini is
log "Running database migrations (alembic upgrade head)..."
log "  From directory: $(pwd)"
log "  alembic.ini:    $(pwd)/alembic.ini"

if python -m alembic upgrade head 2>&1; then
    log "✅ Database migrations complete"
else
    ALEMBIC_EXIT=$?
    warn "Alembic returned exit code $ALEMBIC_EXIT"

    # Check if it's just "nothing to do" (already at head)
    CURRENT=$(python -m alembic current 2>/dev/null || echo "unknown")
    log "  Current alembic version: $CURRENT"

    if echo "$CURRENT" | grep -q "head"; then
        log "✅ Already at head — no migrations needed"
    else
        error "Migration failed. Check alembic logs above."
        # Don't exit — let the app start anyway (better to serve than to crash)
        warn "Continuing startup despite migration issues..."
    fi
fi

# ── Verify alembic_version ────────────────────────────────────────────
VERSION=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -t -c "SELECT version_num FROM alembic_version LIMIT 1;" 2>/dev/null | tr -d ' ' || echo "unknown")
log "  DB schema version: ${VERSION:-none}"

# ── Create tenant upload directories ─────────────────────────────────
log "Setting up upload directories..."
mkdir -p uploads logs
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -t -c "SELECT slug FROM tenant_companies WHERE status IN ('active','trial');" 2>/dev/null | \
while read slug; do
    slug=$(echo "$slug" | tr -d ' \r')
    if [ -n "$slug" ]; then
        mkdir -p "uploads/$slug/employees" "uploads/$slug/applicants" \
                 "uploads/$slug/company"   "uploads/$slug/exports"
    fi
done
log "✅ Upload directories ready"

# ── Start the application ─────────────────────────────────────────────
COMMAND="${1:-gunicorn}"

case "$COMMAND" in
    gunicorn)
        WORKERS="${GUNICORN_WORKERS:-4}"
        THREADS="${GUNICORN_THREADS:-2}"
        TIMEOUT="${GUNICORN_TIMEOUT:-120}"
        log "Starting Gunicorn: $WORKERS workers × $THREADS threads on :5000"
        exec python -m gunicorn \
            --workers "$WORKERS" \
            --threads "$THREADS" \
            --worker-class gthread \
            --timeout "$TIMEOUT" \
            --bind "0.0.0.0:5000" \
            --access-logfile "-" \
            --error-logfile "-" \
            --log-level "info" \
            --forwarded-allow-ips "*" \
            --chdir backend \
            "app:app"
        ;;
    flask)
        log "Starting Flask development server on :5000"
        exec python backend/app.py
        ;;
    celery-worker)
        log "Starting Celery worker..."
        exec python -m celery -A backend.tasks worker --loglevel=info
        ;;
    celery-beat)
        log "Starting Celery beat scheduler..."
        exec python -m celery -A backend.tasks beat --loglevel=info
        ;;
    migrate-only)
        log "Migration-only mode — exiting after migrations"
        exit 0
        ;;
    shell)
        log "Starting Python shell..."
        exec python
        ;;
    *)
        log "Running custom command: $*"
        exec "$@"
        ;;
esac
