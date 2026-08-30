#!/bin/bash
# FILE: backend/docker-entrypoint.sh
# eLogix HRMS — Docker Entrypoint
# FIXED: gunicorn was pointing to "run:app" — file is app.py so correct is "app:app"
# eLogix Technologies · www.elogix.com.np

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()   { echo -e "$(date '+%H:%M:%S') ${GREEN}[elogix]${NC} $1"; }
warn()  { echo -e "$(date '+%H:%M:%S') ${YELLOW}[warn]${NC}  $1"; }
error() { echo -e "$(date '+%H:%M:%S') ${RED}[error]${NC} $1"; }

cd /opt/elogix
log "Working directory: $(pwd)"

[ -f "alembic.ini" ] || { error "alembic.ini not found at $(pwd)"; exit 1; }

# Load env
for env_file in ".env" "backend/.env"; do
    [ -f "$env_file" ] && { log "Loading $env_file"; set -a; source "$env_file"; set +a; break; }
done

DB_HOST="${DB_HOST:-${POSTGRES_HOST:-localhost}}"
DB_PORT="${DB_PORT:-${POSTGRES_PORT:-5432}}"
DB_USER="${POSTGRES_USER:-${DB_USER:-elogix_prod}}"
DB_NAME="${POSTGRES_DB:-${DB_NAME:-elogix_hrms_prod}}"
DB_PASSWORD="${POSTGRES_PASSWORD:-${DB_PASS:-${DB_PASSWORD:-}}}"

log "Database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

# Wait for PostgreSQL
log "Waiting for PostgreSQL..."
RETRY=0; MAX_RETRIES=30
until PGPASSWORD="$DB_PASSWORD" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q 2>/dev/null; do
    RETRY=$((RETRY+1))
    [ $RETRY -ge $MAX_RETRIES ] && { error "PostgreSQL not ready after $MAX_RETRIES attempts"; exit 1; }
    warn "Waiting... $RETRY/$MAX_RETRIES"; sleep 2
done
log "✅ PostgreSQL ready"

# Migrations
log "Running alembic upgrade head..."
if python -m alembic upgrade head 2>&1; then
    log "✅ Migrations complete"
else
    warn "Migration failed — continuing startup"
fi

mkdir -p uploads logs
log "✅ Directories ready"

# Start
COMMAND="${1:-gunicorn}"
case "$COMMAND" in
    gunicorn)
        WORKERS="${GUNICORN_WORKERS:-4}"
        log "Starting Gunicorn ($WORKERS workers) on :5000"
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
            --chdir backend \
            "app:app"
        ;;
    flask)
        exec python backend/app.py ;;
    migrate-only)
        log "Migration-only done"; exit 0 ;;
    *)
        exec "$@" ;;
esac
