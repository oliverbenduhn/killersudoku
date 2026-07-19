#!/bin/bash
# Installiert die Killer-Sudoku-systemd-Unit.
# Idempotent: jeder Lauf ist sicher.

set -euo pipefail

SERVICE_NAME="killersudoku"
SERVICE_SRC="$(dirname "$0")/${SERVICE_NAME}.service"
SERVICE_DST="/etc/systemd/system/${SERVICE_NAME}.service"

[ -f "$SERVICE_SRC" ] || { echo "❌ $SERVICE_SRC nicht gefunden" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || { echo "❌ Bitte als root ausführen (sudo $0)" >&2; exit 1; }

# User oliver muss existieren (oder anpassen).
id oliver &>/dev/null || { echo "❌ User 'oliver' existiert nicht" >&2; exit 1; }

# Build muss da sein.
[ -f "/home/oliver/killersudoku/build/index.html" ] \
  || { echo "❌ /home/oliver/killersudoku/build/index.html fehlt. Erst 'npm run build' ausführen." >&2; exit 1; }

cp "$SERVICE_SRC" "$SERVICE_DST"
chmod 644 "$SERVICE_DST"

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"
systemctl restart "${SERVICE_NAME}.service"

sleep 1
if systemctl is-active --quiet "${SERVICE_NAME}.service"; then
  echo "✓ ${SERVICE_NAME} läuft"
  systemctl status "${SERVICE_NAME}.service" --no-pager
else
  echo "❌ ${SERVICE_NAME} ist nicht aktiv. Logs:" >&2
  journalctl -u "${SERVICE_NAME}.service" --no-pager -n 30 >&2
  exit 1
fi
