#!/bin/bash
# eLogix HRMS — Datahub Nepal Backup Script
# Run: crontab -e → 0 2 * * * /var/www/elogix-hrms/backend/deploy/scripts/backup.sh

BACKUP_DIR="/var/backups/elogix"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="/var/log/elogix"
RETAIN_DAYS=30

mkdir -p $BACKUP_DIR

echo "[$(date)] eLogix backup starting..." >> $LOG_DIR/backup.log

# DB backup
pg_dump -U elogix_user elogix_hrms \
  | gzip -9 > $BACKUP_DIR/elogix_db_${TIMESTAMP}.sql.gz
echo "[$(date)] DB backup: elogix_db_${TIMESTAMP}.sql.gz" >> $LOG_DIR/backup.log

# Uploads backup
tar -czf $BACKUP_DIR/elogix_uploads_${TIMESTAMP}.tar.gz \
  /var/www/elogix-hrms/uploads/ 2>/dev/null || true

# Remove old backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETAIN_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETAIN_DAYS -delete

echo "[$(date)] eLogix backup complete." >> $LOG_DIR/backup.log
