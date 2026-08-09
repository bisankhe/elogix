#!/bin/bash
# FILE: scripts/setup_server.sh
# Ubuntu 22.04 LTS — one-time server setup for data center deployment
# Run as root: bash setup_server.sh

set -e

APP_USER="nephr"
APP_DIR="/opt/nephr-pro"
LOG_DIR="/var/log/nephr-pro"
BACKUP_DIR="/var/backups/nephr-pro"

echo "======================================================"
echo " NepHR Pro — Data Center Server Setup"
echo " Ubuntu 22.04 LTS"
echo "======================================================"

# ── System updates ──────────────────────────────────────────
echo "[1/10] System update..."
apt-get update -qq && apt-get upgrade -y -qq

# ── Install dependencies ────────────────────────────────────
echo "[2/10] Installing dependencies..."
apt-get install -y -qq \
    curl wget git unzip \
    python3 python3-pip python3-venv \
    postgresql postgresql-contrib \
    redis-server \
    nginx certbot python3-certbot-nginx \
    docker.io docker-compose-plugin \
    ufw fail2ban \
    htop iotop nethogs \
    awscli \
    psutil

# ── Create app user ─────────────────────────────────────────
echo "[3/10] Creating app user..."
useradd -m -s /bin/bash -d /home/$APP_USER $APP_USER 2>/dev/null || true
usermod -aG docker $APP_USER

# ── PostgreSQL setup ─────────────────────────────────────────
echo "[4/10] Configuring PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql
su -c "psql -c \"CREATE USER nephr WITH PASSWORD 'CHANGE_THIS_PASSWORD';\"" postgres 2>/dev/null || true
su -c "psql -c \"CREATE DATABASE nephr_pro OWNER nephr;\"" postgres 2>/dev/null || true
su -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE nephr_pro TO nephr;\"" postgres

# ── Redis setup ──────────────────────────────────────────────
echo "[5/10] Configuring Redis..."
sed -i 's/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
echo "maxmemory 512mb" >> /etc/redis/redis.conf
systemctl restart redis
systemctl enable redis

# ── Firewall ────────────────────────────────────────────────
echo "[6/10] Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# ── Fail2ban (brute force protection) ───────────────────────
echo "[7/10] Configuring Fail2ban..."
systemctl start fail2ban
systemctl enable fail2ban

# ── Create directories ───────────────────────────────────────
echo "[8/10] Creating directories..."
mkdir -p $APP_DIR $LOG_DIR $BACKUP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR $LOG_DIR $BACKUP_DIR

# ── Cron jobs ───────────────────────────────────────────────
echo "[9/10] Setting up cron jobs..."
(crontab -u $APP_USER -l 2>/dev/null; echo "0 2 * * * $APP_DIR/scripts/backup_db.sh >> $LOG_DIR/backup.log 2>&1") | crontab -u $APP_USER -

# ── Nginx ───────────────────────────────────────────────────
echo "[10/10] Configuring Nginx..."
cp $APP_DIR/nginx.conf /etc/nginx/sites-available/nephr-pro
ln -sf /etc/nginx/sites-available/nephr-pro /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
systemctl enable nginx

echo ""
echo "======================================================"
echo " Server setup complete!"
echo ""
echo " Next steps:"
echo " 1. Copy your app files to $APP_DIR"
echo " 2. Edit $APP_DIR/backend/.env with real values"
echo " 3. Run: cd $APP_DIR && docker-compose up -d"
echo " 4. Run: bash $APP_DIR/scripts/setup_ssl.sh yourdomain.com"
echo "======================================================"
