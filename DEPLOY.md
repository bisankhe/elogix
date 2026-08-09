# eLogix HRMS — Complete Deployment Guide
## Domain: elogix.com.np · Datahub Nepal VPS · Ubuntu 24.04 LTS

---

## Server Requirements (Datahub Nepal VPS)
- Ubuntu 24.04 LTS
- 4 vCPU · 8GB RAM · 100GB SSD (minimum)
- PostgreSQL 16 · Redis 7 · Nginx 1.24 · Python 3.12 · Node 20

---

## STEP 1 — Server Initial Setup

```bash
# Login as root to your Datahub Nepal VPS
ssh root@YOUR_SERVER_IP

# Create elogix user
adduser elogix
usermod -aG sudo elogix
usermod -aG www-data elogix

# Update server
apt update && apt upgrade -y
apt install -y nginx postgresql postgresql-contrib redis-server \
    python3.12 python3.12-venv python3-pip nodejs npm certbot \
    python3-certbot-nginx git curl unzip

# Create app directories
mkdir -p /opt/elogix/backend
mkdir -p /var/www/elogix/dist
mkdir -p /var/log/elogix
chown -R elogix:www-data /opt/elogix /var/www/elogix /var/log/elogix
```

---

## STEP 2 — PostgreSQL Database Setup

```bash
sudo -u postgres psql << SQL
CREATE USER elogix_user WITH ENCRYPTED PASSWORD 'CHANGE_DB_PASS';
CREATE DATABASE elogix_hrms OWNER elogix_user;
GRANT ALL PRIVILEGES ON DATABASE elogix_hrms TO elogix_user;
\c elogix_hrms
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SQL

# Apply schemas
sudo -u elogix psql -U elogix_user -d elogix_hrms \
    -f /opt/elogix/backend/database/saas_schema.sql
sudo -u elogix psql -U elogix_user -d elogix_hrms \
    -f /opt/elogix/backend/database/attendance_reports_schema.sql
sudo -u elogix psql -U elogix_user -d elogix_hrms \
    -f /opt/elogix/backend/database/payroll_tax_schema.sql

# Seed eLogix SuperAdmin
sudo -u elogix psql -U elogix_user -d elogix_hrms << SQL
INSERT INTO elogix_admins (id, full_name, email, password_hash, role, is_active)
VALUES (
    gen_random_uuid(),
    'eLogix SuperAdmin',
    'admin@elogix.com.np',
    crypt('CHANGE_SUPERADMIN_PASSWORD', gen_salt('bf', 12)),
    'elogix_superadmin',
    true
);
SQL
```

---

## STEP 3 — Backend Deployment

```bash
# Copy backend files
cp -r /path/to/eLogix_Deploy/backend/* /opt/elogix/backend/
cd /opt/elogix/backend

# Python virtual environment
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
nano .env  # Fill in all CHANGE_ values

# Install systemd service
cp deploy/systemd/elogix.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable elogix
systemctl start elogix
systemctl status elogix  # Should show: active (running)
```

---

## STEP 4 — Frontend Build & Deploy

```bash
# On your LOCAL machine:
cd elogix-frontend
npm install
npm run build        # Creates dist/ folder

# Copy dist to server
scp -r dist/* elogix@YOUR_SERVER_IP:/var/www/elogix/dist/

# Or on server if Node is installed:
cd /opt/elogix/frontend
npm install && npm run build
cp -r dist/* /var/www/elogix/dist/
```

---

## STEP 5 — SSL Certificate (Wildcard for *.elogix.com.np)

```bash
# Wildcard SSL covers: www, api, admin, himalayan, ncell, demo, etc.
certbot certonly --manual \
    --preferred-challenges dns \
    -d elogix.com.np \
    -d "*.elogix.com.np"

# Add DNS TXT record at Mercantile Communication / NpccTLD:
# _acme-challenge.elogix.com.np → (value certbot gives you)

# After certificate issued:
certbot install --nginx
```

---

## STEP 6 — Nginx Configuration

```bash
cp /opt/elogix/backend/deploy/nginx/elogix.conf /etc/nginx/sites-available/elogix
ln -s /etc/nginx/sites-available/elogix /etc/nginx/sites-enabled/elogix
rm -f /etc/nginx/sites-enabled/default
nginx -t          # Must show: syntax is ok
systemctl reload nginx
```

---

## STEP 7 — DNS Records at NpccTLD / Mercantile Communication

Add these DNS records in your domain control panel:

```
Type    Name                          Value                TTL
A       elogix.com.np                YOUR_SERVER_IP       3600
A       www.elogix.com.np            YOUR_SERVER_IP       3600
A       api.elogix.com.np            YOUR_SERVER_IP       3600
A       admin.elogix.com.np          YOUR_SERVER_IP       3600
CNAME   *.elogix.com.np              elogix.com.np        3600
MX      elogix.com.np                mail.elogix.com.np   3600
TXT     elogix.com.np                v=spf1 include:sendgrid.net ~all
```

The CNAME `*.elogix.com.np` makes ALL tenant subdomains work:
- himalayan.elogix.com.np → Himalayan Bank portal
- ncell.elogix.com.np → Ncell portal
- demo.elogix.com.np → Demo portal

---

## STEP 8 — MinIO Object Storage

```bash
# Install MinIO (for HR documents, payslips, photos)
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
mv minio /usr/local/bin/

# Create systemd service for MinIO
cat > /etc/systemd/system/minio.service << EOF
[Unit]
Description=MinIO Object Storage
After=network.target

[Service]
User=elogix
Environment=MINIO_ROOT_USER=CHANGE_MINIO_KEY
Environment=MINIO_ROOT_PASSWORD=CHANGE_MINIO_SECRET
ExecStart=/usr/local/bin/minio server /data/minio --console-address :9001
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl enable minio && systemctl start minio
```

---

## STEP 9 — Create First Tenant (via eLogix SuperAdmin)

1. Open https://admin.elogix.com.np
2. Login: `admin@elogix.com.np` / `CHANGE_SUPERADMIN_PASSWORD`
3. Click **"+ Create Company"**
4. Fill: Company Name, Slug (e.g. `himalayan`), Plan, Admin Email
5. Click **"Provision Company"**
6. System auto-creates:
   - PostgreSQL schema: `elogix_himalayan`
   - 14 default roles
   - Admin user account
   - Welcome email sent to company admin
7. Company portal: https://himalayan.elogix.com.np

---

## SaaS Architecture Summary

```
https://www.elogix.com.np         ← eLogix marketing + login
https://admin.elogix.com.np       ← eLogix SuperAdmin panel
https://api.elogix.com.np         ← Flask REST API (all tenants)
https://himalayan.elogix.com.np   ← Himalayan Bank portal
https://ncell.elogix.com.np       ← Ncell portal
https://demo.elogix.com.np        ← Demo / trial portal
```

**Tenant Isolation Layers:**
1. PostgreSQL RLS — DB blocks cross-tenant queries
2. Flask middleware — every query filtered by g.company_id from JWT
3. JWT — company_id + tenant_slug embedded in every token
4. Frontend — X-Tenant-Id header on every API call

---

## eLogix SuperAdmin Credentials

```
Login ID : admin@elogix.com.np
Password : (set in .env SUPERADMIN_PASSWORD)
URL      : https://admin.elogix.com.np
```

**IMPORTANT:** Change the default password immediately after first login.

---

## Useful Commands

```bash
# Check backend status
systemctl status elogix

# View backend logs
journalctl -u elogix -f

# Restart backend
systemctl restart elogix

# Check nginx
nginx -t && systemctl reload nginx

# Check SSL expiry
certbot certificates

# Renew SSL (add to cron)
0 3 1 * * certbot renew --quiet && systemctl reload nginx

# Database backup
pg_dump -U elogix_user elogix_hrms | gzip > /backup/elogix_$(date +%Y%m%d).sql.gz

# Check all services
systemctl status elogix nginx postgresql redis minio
```

---

*eLogix Technologies · www.elogix.com.np · support@elogix.com.np*
*Datahub Nepal · National ICT Award 2024*
