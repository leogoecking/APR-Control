#!/usr/bin/env bash
set -euo pipefail

APP_ROOT=/opt/apr-control
SERVICE_USER=aprcontrol
DB_DIR=/var/lib/apr-control
BACKUP_DIR=/var/backups/apr-control

apt-get update
apt-get install -y curl ca-certificates sqlite3
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs
id -u "$SERVICE_USER" >/dev/null 2>&1 || useradd --system --home "$APP_ROOT" --shell /usr/sbin/nologin "$SERVICE_USER"
mkdir -p "$APP_ROOT" "$DB_DIR" "$BACKUP_DIR"
chown -R "$SERVICE_USER":"$SERVICE_USER" "$APP_ROOT" "$DB_DIR" "$BACKUP_DIR"
cd "$APP_ROOT"
npm install
npm run build
APR_CONTROL_DATA_DIR="$DB_DIR" npm run migrate:legacy
cp server/deploy/apr-control.service /etc/systemd/system/apr-control.service
cp server/deploy/backup-sqlite.sh /usr/local/bin/apr-control-backup
chmod +x /usr/local/bin/apr-control-backup
systemctl daemon-reload
systemctl enable --now apr-control
