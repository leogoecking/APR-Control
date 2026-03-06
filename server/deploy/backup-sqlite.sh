#!/usr/bin/env bash
set -euo pipefail

DB_PATH="${APR_CONTROL_DB_PATH:-/var/lib/apr-control/app.db}"
BACKUP_DIR="${APR_CONTROL_BACKUP_DIR:-/var/backups/apr-control}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/app-$TIMESTAMP.db'"
find "$BACKUP_DIR" -type f -name 'app-*.db' -mtime +14 -delete
