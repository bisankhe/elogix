#!/bin/bash
# FILE: scripts/backup_db.sh
# PostgreSQL backup — run this daily via cron on the data center server
# Cron: 0 2 * * * /opt/nephr-pro/scripts/backup_db.sh >> /var/log/nephr-pro/backup.log 2>&1

set -e

# Load environment
source /opt/nephr-pro/.env 2>/dev/null || true

DB_URL="${DATABASE_URL:-postgresql://nephr:nephr_pass@localhost:5432/nephr_pro}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/nephr-pro}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="nephr_pro_backup_${DATE}.sql.gz"

echo "[$(date)] Starting backup: $FILENAME"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Run pg_dump and compress
pg_dump "$DB_URL" | gzip > "$BACKUP_DIR/$FILENAME"

SIZE=$(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "[$(date)] Backup complete: $FILENAME ($SIZE)"

# Delete backups older than retention days
find "$BACKUP_DIR" -name "nephr_pro_backup_*.sql.gz" \
     -mtime "+$RETENTION_DAYS" -delete
echo "[$(date)] Cleaned up backups older than $RETENTION_DAYS days"

# Optional: upload to remote storage (S3 or SFTP)
if [ -n "$AWS_S3_BUCKET" ]; then
    aws s3 cp "$BACKUP_DIR/$FILENAME" "s3://$AWS_S3_BUCKET/database-backups/$FILENAME"
    echo "[$(date)] Uploaded to S3: s3://$AWS_S3_BUCKET/database-backups/$FILENAME"
fi

echo "[$(date)] Backup job finished successfully"
