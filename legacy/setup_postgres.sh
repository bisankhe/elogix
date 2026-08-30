#!/bin/bash
# ============================================================
# eLogix HRMS — PostgreSQL Production Setup Script
# Run on Datahub Nepal VPS as root or sudo user
# Usage: bash setup_postgres.sh
# eLogix Technologies · www.elogix.com.np
# ============================================================

set -e

DB_USER="elogix_prod"
DB_PASS="Yb5cnpltBSxA9TiGFWTU2NWEORmH"
DB_NAME="elogix_hrms_prod"

echo "=================================================="
echo " eLogix HRMS — PostgreSQL Setup"
echo "=================================================="

# ── Create PostgreSQL user and database ───────────────────────
echo "Creating database user and database..."
sudo -u postgres psql << SQL
-- Create user
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;

-- Create database
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
GRANT CREATE ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Create elogix_admin role (bypasses RLS — for SuperAdmin)
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'elogix_admin') THEN
    CREATE ROLE elogix_admin;
  END IF;
END
\$\$;
GRANT elogix_admin TO ${DB_USER};

-- Create elogix_tenant role (subject to RLS — for tenant queries)
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'elogix_tenant') THEN
    CREATE ROLE elogix_tenant;
  END IF;
END
\$\$;

\echo 'Database setup complete'
SQL

echo "✅ PostgreSQL user '${DB_USER}' created"
echo "✅ Database '${DB_NAME}' created"

# ── Update pg_hba.conf for local connections ──────────────────
echo ""
echo "Verifying pg_hba.conf..."
PG_HBA=$(sudo -u postgres psql -t -c "SHOW hba_file" | tr -d '[:space:]')
echo "   pg_hba.conf: $PG_HBA"
# Add local md5 auth if not present
if ! sudo grep -q "${DB_USER}" "$PG_HBA" 2>/dev/null; then
  echo "local   ${DB_NAME}   ${DB_USER}   md5" | sudo tee -a "$PG_HBA"
  sudo systemctl reload postgresql
  echo "✅ pg_hba.conf updated"
fi

# ── Test connection ───────────────────────────────────────────
echo ""
echo "Testing connection..."
if PGPASSWORD="${DB_PASS}" psql -U "${DB_USER}" -d "${DB_NAME}" -h localhost -c "SELECT 1" > /dev/null 2>&1; then
  echo "✅ Connection successful: ${DB_USER}@localhost/${DB_NAME}"
else
  echo "❌ Connection failed — check pg_hba.conf and restart postgresql"
  echo "   Run: sudo systemctl restart postgresql"
fi

# ── Print DATABASE_URL ────────────────────────────────────────
echo ""
echo "=================================================="
echo " Add this to /opt/elogix/backend/.env:"
echo "=================================================="
echo ""
echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
echo "DB_HOST=localhost"
echo "DB_PORT=5432"
echo "DB_NAME=${DB_NAME}"
echo "DB_USER=${DB_USER}"
echo "DB_PASS=${DB_PASS}"
echo ""
echo "Done! Next step: cd /opt/elogix && python -m flask db upgrade"
