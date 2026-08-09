#!/bin/bash
# ============================================================
#  eLogix HRMS — Datahub Nepal Deployment Script
#  eLogix Technologies · www.elogix.com
#  Usage: bash deploy.sh [--fresh | --update]
# ============================================================
set -e

ELOGIX_DIR="/var/www/elogix-hrms"
LOG_DIR="/var/log/elogix"
BACKUP_DIR="/var/backups/elogix"
REPO="https://github.com/elogix/elogix-hrms.git"

echo "🚀 eLogix HRMS Deployment — www.elogix.com"
echo "============================================"

# Create directories
mkdir -p $LOG_DIR $BACKUP_DIR
chown -R www-data:www-data $LOG_DIR $BACKUP_DIR

if [ "$1" == "--fresh" ]; then
    echo "📦 Fresh install..."
    apt update && apt upgrade -y
    apt install -y nginx postgresql-16 redis-server python3-pip \
        python3-venv nodejs npm git certbot python3-certbot-nginx \
        ufw fail2ban htop curl

    # Firewall
    ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable

    # PostgreSQL
    sudo -u postgres psql -c "CREATE DATABASE elogix_hrms;" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE USER elogix_user WITH PASSWORD 'eLogix@Datahub2025!';" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE elogix_hrms TO elogix_user;" 2>/dev/null || true

    # Clone repo
    git clone $REPO $ELOGIX_DIR || true
fi

echo "📥 Updating eLogix HRMS code..."
cd $ELOGIX_DIR
git pull origin main || true

# Backend dependencies
echo "🐍 Installing eLogix Python dependencies..."
cd $ELOGIX_DIR/backend
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

# Database migrations
echo "🗄  Running eLogix DB migrations..."
./venv/bin/flask db upgrade || true

# Frontend build
echo "⚛  Building eLogix React frontend..."
cd $ELOGIX_DIR/frontend
npm ci --production
npm run build
chown -R www-data:www-data dist/

# Nginx config
echo "🌐 Configuring eLogix Nginx..."
cp $ELOGIX_DIR/backend/deploy/nginx/elogix.conf /etc/nginx/sites-available/elogix.conf
ln -sf /etc/nginx/sites-available/elogix.conf /etc/nginx/sites-enabled/elogix.conf
nginx -t && systemctl reload nginx

# Systemd services
echo "⚙  Installing eLogix systemd services..."
for svc in elogix-backend elogix-celery elogix-celery-beat; do
    cp $ELOGIX_DIR/backend/deploy/systemd/${svc}.service /etc/systemd/system/
done
systemctl daemon-reload
systemctl enable elogix-backend elogix-celery elogix-celery-beat
systemctl restart elogix-backend elogix-celery elogix-celery-beat

echo ""
echo "✅ eLogix HRMS deployed successfully!"
echo "   Portal:  https://www.elogix.com"
echo "   Health:  https://www.elogix.com/api/health"
echo "   Logs:    $LOG_DIR"
echo ""
echo "   Check status: systemctl status elogix-backend"
