#!/bin/bash
# FILE: backend/deploy/scripts/deploy.sh
# eLogix HRMS — Production Deployment Script
# Run this on the VPS after pushing new code
# Usage: bash deploy.sh [--skip-build] [--skip-db]
# eLogix Technologies · www.elogix.com.np

set -euo pipefail
IFS=$'\n\t'

# ── Config ────────────────────────────────────────────────────────────
APP_DIR="/var/www/elogix"
BACKEND_DIR="$APP_DIR/backend"
DIST_DIR="$APP_DIR/dist"
VENV_DIR="$BACKEND_DIR/venv"
LOG_DIR="/var/log/elogix"
UPLOADS_DIR="$APP_DIR/uploads"
BACKUP_DIR="/var/backups/elogix"
NGINX_CONF="/etc/nginx/sites-available/elogix"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'

log()    { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
ok()     { echo -e "${GREEN}✅ $1${NC}"; }
warn()   { echo -e "${YELLOW}⚠️  $1${NC}"; }
error()  { echo -e "${RED}❌ $1${NC}"; exit 1; }

SKIP_BUILD=false
SKIP_DB=false

for arg in "$@"; do
    case $arg in
        --skip-build) SKIP_BUILD=true ;;
        --skip-db)    SKIP_DB=true ;;
    esac
done

# ─────────────────────────────────────────────────────────────────────
log "═══════════════════════════════════════════"
log "  eLogix HRMS — Production Deploy $TIMESTAMP"
log "═══════════════════════════════════════════"

# ── Step 1: Pre-flight checks ─────────────────────────────────────────
log "Step 1: Pre-flight checks..."

[ -d "$APP_DIR" ]     || error "App directory $APP_DIR not found. Run setup_server.sh first."
[ -f "$BACKEND_DIR/.env" ] || error ".env file missing at $BACKEND_DIR/.env"
which nginx   > /dev/null || error "nginx not installed"
which psql    > /dev/null || error "postgresql-client not installed"
which gunicorn > /dev/null || ( source "$VENV_DIR/bin/activate" && which gunicorn > /dev/null ) || error "gunicorn not found in venv"

# Load environment variables
set -a; source "$BACKEND_DIR/.env"; set +a
ok "Pre-flight checks passed"

# ── Step 2: Backup database ───────────────────────────────────────────
log "Step 2: Backing up database..."
mkdir -p "$BACKUP_DIR"
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "${DB_HOST:-localhost}" \
    -U "${POSTGRES_USER:-elogix}" \
    -d "${POSTGRES_DB:-elogix_prod}" \
    -F c \
    -f "$BACKUP_DIR/backup_$TIMESTAMP.dump" \
    && ok "Database backed up to $BACKUP_DIR/backup_$TIMESTAMP.dump" \
    || warn "Database backup failed — continuing"

# Keep only last 7 daily backups
find "$BACKUP_DIR" -name "backup_*.dump" -mtime +7 -delete 2>/dev/null || true

# ── Step 3: Pull latest code ──────────────────────────────────────────
log "Step 3: Pulling latest code..."
cd "$APP_DIR"
git fetch origin main
git reset --hard origin/main
ok "Code updated to $(git rev-parse --short HEAD)"

# ── Step 4: Build frontend ────────────────────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
    log "Step 4: Building React frontend..."
    cd "$APP_DIR"

    # Install/update node dependencies
    npm ci --prefer-offline || npm install
    ok "npm dependencies up to date"

    # Build production bundle
    npm run build
    ok "Frontend built → $DIST_DIR"

    # Verify critical files exist
    [ -f "$DIST_DIR/index.html" ]       || error "index.html missing from dist/"
    ls "$DIST_DIR/assets/"*.js > /dev/null || error "No JS bundle in dist/assets/"
    ls "$DIST_DIR/assets/"*.css > /dev/null || error "No CSS bundle in dist/assets/"

    # Verify Logo is in dist (fixes the image 404 on server)
    if ls "$DIST_DIR/assets/Logo"*.png > /dev/null 2>&1; then
        ok "Logo found in dist/assets/"
    else
        warn "Logo not in dist/assets/! Checking src/assets..."
        if [ -f "$APP_DIR/src/assets/Logo.png" ]; then
            cp "$APP_DIR/src/assets/Logo.png" "$DIST_DIR/assets/"
            warn "Manually copied Logo.png to dist/assets/ — check vite.config.js"
        else
            error "Logo.png not found anywhere — frontend will show broken image"
        fi
    fi
else
    log "Step 4: Skipping frontend build (--skip-build)"
fi

# ── Step 5: Backend dependencies ──────────────────────────────────────
log "Step 5: Installing backend dependencies..."
cd "$BACKEND_DIR"
source "$VENV_DIR/bin/activate"
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
ok "Python dependencies installed"

# ── Step 6: Database migrations ───────────────────────────────────────
if [ "$SKIP_DB" = false ]; then
    log "Step 6: Running database migrations..."
    cd "$APP_DIR"  # alembic.ini is at project root
    source "$VENV_DIR/bin/activate"

    # Check if alembic_version table exists (first deploy vs upgrade)
    TABLES=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
        -h "${DB_HOST:-localhost}" \
        -U "${POSTGRES_USER:-elogix}" \
        -d "${POSTGRES_DB:-elogix_prod}" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='alembic_version';" 2>/dev/null | tr -d ' ')

    if [ "$TABLES" = "0" ]; then
        log "  First deploy — initialising schema from saas_schema.sql..."
        PGPASSWORD="$POSTGRES_PASSWORD" psql \
            -h "${DB_HOST:-localhost}" \
            -U "${POSTGRES_USER:-elogix}" \
            -d "${POSTGRES_DB:-elogix_prod}" \
            -f "$BACKEND_DIR/database/saas_schema.sql"
        ok "Schema initialised"
    fi

    alembic upgrade head
    ok "Database migrations complete"

    # Verify alembic_version now has rows
    VERSION=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
        -h "${DB_HOST:-localhost}" \
        -U "${POSTGRES_USER:-elogix}" \
        -d "${POSTGRES_DB:-elogix_prod}" \
        -t -c "SELECT version_num FROM alembic_version;" 2>/dev/null | tr -d ' ')
    log "  DB version: $VERSION"
else
    log "Step 6: Skipping database migrations (--skip-db)"
fi

# ── Step 7: Ensure upload directories exist ───────────────────────────
log "Step 7: Setting up upload directories..."
mkdir -p "$UPLOADS_DIR"
mkdir -p "$LOG_DIR"

# Create per-tenant upload dirs for existing tenants
if PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "${DB_HOST:-localhost}" \
    -U "${POSTGRES_USER:-elogix}" \
    -d "${POSTGRES_DB:-elogix_prod}" \
    -t -c "SELECT slug FROM tenant_companies WHERE status IN ('active','trial');" 2>/dev/null | grep -q '.'; then

    PGPASSWORD="$POSTGRES_PASSWORD" psql \
        -h "${DB_HOST:-localhost}" \
        -U "${POSTGRES_USER:-elogix}" \
        -d "${POSTGRES_DB:-elogix_prod}" \
        -t -c "SELECT slug FROM tenant_companies WHERE status IN ('active','trial');" 2>/dev/null | \
    while read slug; do
        slug=$(echo "$slug" | tr -d ' ')
        if [ -n "$slug" ]; then
            mkdir -p "$UPLOADS_DIR/$slug/"{employees,applicants,company,exports}
            ok "Upload dir ready: uploads/$slug/"
        fi
    done
fi

# Fix permissions
chown -R www-data:www-data "$UPLOADS_DIR" 2>/dev/null || true
chown -R www-data:www-data "$DIST_DIR"    2>/dev/null || true
chmod -R 755 "$UPLOADS_DIR"
ok "Upload directories ready"

# ── Step 8: Update nginx config ───────────────────────────────────────
log "Step 8: Updating nginx configuration..."
cp "$APP_DIR/nginx.conf" "$NGINX_CONF"
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/elogix 2>/dev/null || true

# Test nginx config
nginx -t && ok "nginx configuration valid" || error "nginx config test FAILED — check errors above"

# ── Step 9: Restart services ──────────────────────────────────────────
log "Step 9: Restarting services..."

# Reload nginx (graceful — no downtime)
systemctl reload nginx && ok "nginx reloaded" || error "nginx reload failed"

# Restart Flask/Gunicorn
systemctl restart elogix-backend && ok "eLogix backend restarted" || error "Backend restart failed"

# Restart Celery workers (if used)
if systemctl is-enabled elogix-celery > /dev/null 2>&1; then
    systemctl restart elogix-celery      && ok "Celery worker restarted"
    systemctl restart elogix-celery-beat && ok "Celery beat restarted"
fi

# ── Step 10: Post-deploy health check ────────────────────────────────
log "Step 10: Health checks..."
sleep 3

# Check API health
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://elogix.com.np/api/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    ok "API health check passed (HTTP $HTTP_CODE)"
else
    warn "API health check returned HTTP $HTTP_CODE — check backend logs"
fi

# Check if index.html is being served
HTML_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://elogix.com.np/ 2>/dev/null || echo "000")
if [ "$HTML_CODE" = "200" ]; then
    ok "Frontend health check passed (HTTP $HTML_CODE)"
else
    warn "Frontend returned HTTP $HTML_CODE"
fi

# Check if Logo is loading (the image bug fix)
LOGO_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://elogix.com.np/assets/Logo-CyteoIDf.png" 2>/dev/null || echo "000")
if [ "$LOGO_CODE" = "200" ]; then
    ok "Logo image check passed (HTTP $LOGO_CODE)"
else
    warn "Logo returned HTTP $LOGO_CODE — check nginx /assets/ location block"
fi

# ── Done ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ eLogix HRMS Deploy Complete!${NC}"
echo -e "${GREEN}  Commit: $(git rev-parse --short HEAD)${NC}"
echo -e "${GREEN}  Time:   $TIMESTAMP${NC}"
echo -e "${GREEN}  URL:    https://elogix.com.np${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
log "Logs: journalctl -u elogix-backend -f"
