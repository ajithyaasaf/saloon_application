#!/bin/bash
# ==============================================================================
# Saloon Platform — Production PostgreSQL Safe Restore Script
# ==============================================================================
set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "[ERROR] Usage: $0 <path_to_backup_file.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "[ERROR] Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

DATABASE_HOST="${DATABASE_HOST:-localhost}"
DATABASE_PORT="${DATABASE_PORT:-5432}"
DATABASE_USER="${DATABASE_USER:-saloon_prod_user}"
DATABASE_NAME="${DATABASE_NAME:-saloon_prod_db}"

echo "[WARNING] [$(date)] You are about to restore database '${DATABASE_NAME}' from file: ${BACKUP_FILE}"
echo "[WARNING] This will overwrite existing data. Type 'CONFIRM_RESTORE' to proceed:"
read -r CONFIRMATION

if [ "${CONFIRMATION}" != "CONFIRM_RESTORE" ]; then
    echo "[ABORTED] Restore canceled by user."
    exit 0
fi

echo "[INFO] [$(date)] Commencing database restore..."

gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${DATABASE_PASSWORD}" psql \
  -h "${DATABASE_HOST}" \
  -p "${DATABASE_PORT}" \
  -U "${DATABASE_USER}" \
  -d "${DATABASE_NAME}" \
  --single-transaction \
  --set ON_ERROR_STOP=on

echo "[SUCCESS] [$(date)] Database restore completed successfully."
