#!/bin/bash
# FILE: scripts/vps_deploy.sh
# eLogix HRMS — VPS Deployment Script (Datahub Yeti Cloud)
# Run on the VPS as root or deploy user
# Usage: bash scripts/vps_deploy.sh [--fresh]
# eLogix Technologies · www.elogix.com.np

set -euo pipefail

DEPLOY_DIR="/opt/elogix"
REPO="https://github.com/bisankhe/elogix.git"
BRANCH="main"

echo "=========================================="
echo "eLogix HRMS — VPS Deployment"
echo "$(date)"
echo "=========================================="

# ── 1. Install system deps (first run only) ──────────────────────────
if ! command -v docker &>/dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
fi

if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null; then
    echo "📦 Installing Docker Compose..."
    apt-get install -y docker-compose-plugin
fi

# ── 2. Setup deployment directory ────────────────────────────────────
mkdir -p $DEPLOY_DIR
cd $DEPLOY_DIR

# ── 3. Clone or pull latest code ─────────────────────────────────────
if [ ! -d "$DEPLOY_DIR/.git" ]; then
    echo "📥 Cloning repository..."
    git clone $REPO .
else
    echo "📥 Pulling latest code..."
    git fetch origin
    git reset --hard origin/$BRANCH
fi

# ── 4. Verify .env exists ────────────────────────────────────────────
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    echo "❌ ERROR: .env file not found!"
    echo "   Copy env_production.txt to $DEPLOY_DIR/.env and fill in values"
    exit 1
fi

# ── 5. Setup database init script ────────────────────────────────────
cat > $DEPLOY_DIR/database/init.sh << 'INITEOF'
#!/bin/bash
# Load all SQL schema files in order
echo "🗄️  Initialising eLogix database..."
for f in /docker-entrypoint-initdb.d/schemas/*.sql; do
    [ -f "$f" ] && psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$f" \
        && echo "  ✅ $f" || echo "  ⚠️  $f (may already exist)"
done
echo "✅ Database init complete"
INITEOF
chmod +x $DEPLOY_DIR/database/init.sh

# ── 6. Build and start services ──────────────────────────────────────
echo "🏗️  Building Docker images..."
docker compose build --no-cache

echo "🚀 Starting services..."
docker compose up -d --remove-orphans

# ── 7. Wait for PostgreSQL ────────────────────────────────────────────
echo "⏳ Waiting for PostgreSQL..."
for i in $(seq 1 30); do
    if docker compose exec postgres pg_isready -U "${POSTGRES_USER:-elogix_prod}" &>/dev/null; then
        echo "✅ PostgreSQL ready"
        break
    fi
    sleep 2
done

# ── 8. Run database migrations ────────────────────────────────────────
echo "🗄️  Running Alembic migrations..."
docker compose exec backend alembic upgrade head || true

# ── 9. Health checks ──────────────────────────────────────────────────
echo "🏥 Health checks..."
sleep 10

# Backend
if curl -sf http://localhost/api/health | grep -q '"status":"ok"'; then
    echo "✅ Backend healthy"
else
    echo "❌ Backend unhealthy"
    docker compose logs --tail 50 backend
fi

# Celery
if docker compose exec celery_worker celery -A celery_app.celery inspect ping -t 5 &>/dev/null; then
    echo "✅ Celery worker healthy"
else
    echo "⚠️  Celery worker not responding (may still be starting)"
fi

# ── 10. Show status ───────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "Container status:"
docker compose ps
echo ""
echo "✅ Deployment complete!"
echo "🌐 App:    https://elogix.com.np"
echo "🌸 Flower: https://elogix.com.np/flower/"
echo "=========================================="
