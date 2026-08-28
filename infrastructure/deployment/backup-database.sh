#!/bin/bash
# ==============================================================================
# Saloon Platform — Automated Production PostgreSQL Backup Script
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/saloon/postgres}"
DATABASE_HOST="${DATABASE_HOST:-localhost}"
DATABASE_PORT="${DATABASE_PORT:-5432}"
DATABASE_USER="${DATABASE_USER:-saloon_prod_user}"
DATABASE_NAME="${DATABASE_NAME:-saloon_prod_db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DATABASE_NAME}_backup_${TIMESTAMP}.sql.gz"

echo "[INFO] [$(date)] Starting automated backup for database: ${DATABASE_NAME}..."

mkdir -p "${BACKUP_DIR}"

# Execute pg_dump with gzip compression
PGPASSWORD="${DATABASE_PASSWORD}" pg_dump \
  -h "${DATABASE_HOST}" \
  -p "${DATABASE_PORT}" \
  -U "${DATABASE_USER}" \
  -d "${DATABASE_NAME}" \
  -F p \
  --no-owner \
  --no-acl \
  | gzip > "${BACKUP_FILE}"

echo "[SUCCESS] [$(date)] Backup completed successfully: ${BACKUP_FILE}"
echo "[INFO] Backup file size: $(du -sh "${BACKUP_FILE}" | cut -f1)"

# Prune backups older than retention window
echo "[INFO] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "${DATABASE_NAME}_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -exec rm -f {} \;

echo "[SUCCESS] [$(date)] Backup and retention cycle finished."
