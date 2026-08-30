#!/bin/bash
# FILE: scripts/restore_db.sh
# Restore PostgreSQL from backup
# Usage: ./restore_db.sh /var/backups/nephr-pro/nephr_pro_backup_20260101_020000.sql.gz

set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo "Example: $0 /var/backups/nephr-pro/nephr_pro_backup_20260101_020000.sql.gz"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

source /opt/nephr-pro/.env 2>/dev/null || true
DB_URL="${DATABASE_URL:-postgresql://nephr:nephr_pass@localhost:5432/nephr_pro}"

echo "[$(date)] WARNING: This will REPLACE the current database."
read -p "Type YES to confirm: " confirm
if [ "$confirm" != "YES" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "[$(date)] Restoring from: $BACKUP_FILE"

# Drop and recreate database
psql "$DB_URL" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='nephr_pro' AND pid <> pg_backend_pid();" 2>/dev/null || true
dropdb --if-exists nephr_pro
createdb nephr_pro

# Restore
gunzip -c "$BACKUP_FILE" | psql "$DB_URL"

echo "[$(date)] Restore complete. Please restart the application."
