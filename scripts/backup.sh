#!/usr/bin/env bash
# =============================================================================
# backup.sh — Backup Acumen Playbook databases and Strapi uploads
# Usage: ./scripts/backup.sh
# Exit codes: 0 = success, 1 = failure
# =============================================================================
set -euo pipefail

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
BACKUP_DIR="${BACKUP_DIR:-/backups}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-acumen-playbook}"
POSTGRES_CONTAINER="${COMPOSE_PROJECT}-postgres-1"
STRAPI_CONTAINER="${COMPOSE_PROJECT}-strapi-1"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u -Iseconds)] Starting backup — timestamp: ${TIMESTAMP}"

# -------------------------------------------------------------------------
# Dump Strapi database
# -------------------------------------------------------------------------
STRAPI_DUMP="${BACKUP_DIR}/acumen_strapi_${TIMESTAMP}.sql.gz"
echo "[$(date -u -Iseconds)] Dumping acumen_strapi..."
if docker exec "${POSTGRES_CONTAINER}" pg_dump -U strapi_user -d acumen_strapi | gzip > "${STRAPI_DUMP}"; then
  echo "[$(date -u -Iseconds)] acumen_strapi dump OK: ${STRAPI_DUMP}"
else
  echo "[$(date -u -Iseconds)] ERROR: Failed to dump acumen_strapi" >&2
  exit 1
fi

# -------------------------------------------------------------------------
# Dump Wiki.js database
# -------------------------------------------------------------------------
WIKIJS_DUMP="${BACKUP_DIR}/acumen_wikijs_${TIMESTAMP}.sql.gz"
echo "[$(date -u -Iseconds)] Dumping acumen_wikijs..."
if docker exec "${POSTGRES_CONTAINER}" pg_dump -U wikijs_user -d acumen_wikijs | gzip > "${WIKIJS_DUMP}"; then
  echo "[$(date -u -Iseconds)] acumen_wikijs dump OK: ${WIKIJS_DUMP}"
else
  echo "[$(date -u -Iseconds)] ERROR: Failed to dump acumen_wikijs" >&2
  exit 1
fi

# -------------------------------------------------------------------------
# Archive Strapi uploads volume
# -------------------------------------------------------------------------
UPLOADS_ARCHIVE="${BACKUP_DIR}/strapi_uploads_${TIMESTAMP}.tar.gz"
echo "[$(date -u -Iseconds)] Archiving Strapi uploads..."
if docker exec "${STRAPI_CONTAINER}" tar -czf - -C /opt/app/public uploads > "${UPLOADS_ARCHIVE}"; then
  echo "[$(date -u -Iseconds)] Uploads archive OK: ${UPLOADS_ARCHIVE}"
else
  echo "[$(date -u -Iseconds)] ERROR: Failed to archive Strapi uploads" >&2
  exit 1
fi

# -------------------------------------------------------------------------
# Prune backups older than 30 days
# -------------------------------------------------------------------------
echo "[$(date -u -Iseconds)] Pruning backups older than 30 days..."
find "${BACKUP_DIR}" -name "*.sql.gz" -o -name "*.tar.gz" | xargs -r ls -t | tail -n +91 | xargs -r rm -f
echo "[$(date -u -Iseconds)] Pruning complete."

echo "[$(date -u -Iseconds)] Backup completed successfully."
exit 0
