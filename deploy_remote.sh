#!/bin/bash

REMOTE_USER="webuser"
REMOTE_HOST="192.168.2.36"
REMOTE_DIR="/var/www/html"
LOCAL_BUILD_DIR="build"

# Fehlerbehandlung: Skript bei Fehler beenden
set -e
trap 'echo "Fehler bei Zeile $LINENO. Deployment abgebrochen."; exit 1' ERR

# 1. Frontend bauen
if [ -d "src" ]; then
  echo "Baue Frontend lokal..."
  # Build-Verzeichnis vor dem Bauen löschen, um alte Dateien zu entfernen
  rm -rf "$LOCAL_BUILD_DIR"
  if npm run build; then
    echo "Build erfolgreich. Übertrage nach $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR ..."
    # 2. Remote-Zielverzeichnis leeren und Build kopieren (ohne sudo, da webuser Rechte hat)
    ssh "$REMOTE_USER@$REMOTE_HOST" "rm -rf $REMOTE_DIR/* && mkdir -p $REMOTE_DIR"
    if scp -r "$LOCAL_BUILD_DIR/"* "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"; then
      echo "Frontend-Deployment abgeschlossen."
    else
      echo "Fehler beim Kopieren der Dateien auf den Remote-Server."
      exit 1
    fi
  else
    echo "Build fehlgeschlagen. Kein Deployment."
    exit 1
  fi
else
  echo "Kein Frontend gefunden (src fehlt)."
  exit 1
fi
