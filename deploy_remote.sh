#!/bin/bash

REMOTE_USER="webuser"
REMOTE_HOST="192.168.2.36"
REMOTE_DIR="/var/www/html"
LOCAL_BUILD_DIR="build"
REQUIREMENTS="requirements.txt"
BACKEND_FILES=(backend_fastapi.py yttranskript_api.py)

# Fehlerbehandlung: Skript bei Fehler beenden
set -e
trap 'echo "Fehler bei Zeile $LINENO. Deployment abgebrochen."; exit 1' ERR

# 1. Frontend bauen
if [ -d "src" ]; then
  echo "Baue Frontend lokal..."
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

# 2. Backend-Dateien und requirements.txt übertragen
for file in "${BACKEND_FILES[@]}" "$REQUIREMENTS"
do
  echo "Übertrage $file nach $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR ..."
  scp "$file" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"
  if [ $? -ne 0 ]; then
    echo "Fehler beim Übertragen von $file."
    exit 1
  fi
  echo "$file übertragen."
done

# Übertrage das Service-Unit-File
echo "Übertrage backend.service nach $REMOTE_USER@$REMOTE_HOST:/tmp ..."
scp "backend.service" "$REMOTE_USER@$REMOTE_HOST:/tmp/"
if [ $? -ne 0 ]; then
  echo "Fehler beim Übertragen von backend.service."
  exit 1
fi
echo "backend.service übertragen."

echo "############################################################"
echo "Bitte führe auf dem Remote-Server als root oder mit sudo folgende Befehle aus:"
echo "sudo mv /tmp/backend.service /etc/systemd/system/backend.service"
echo "sudo systemctl daemon-reload"
echo "sudo systemctl enable backend.service"
echo "sudo systemctl restart backend.service"
echo "sudo systemctl status backend.service --no-pager"
echo "############################################################"

# Nach dem Kopieren: Prüfen, ob requirements.txt wirklich auf dem Server ist
ssh "$REMOTE_USER@$REMOTE_HOST" "[ -f $REMOTE_DIR/requirements.txt ]" || { echo '[FEHLER] requirements.txt fehlt auf dem Server! Deployment abgebrochen.'; exit 1; }

# 3. Backend-Abhängigkeiten prüfen und Backend starten (nur installieren, was fehlt)
ssh "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_DIR && \
  MISSING=0 && \
  command -v python3 >/dev/null 2>&1 || { echo '[WARN] python3 nicht gefunden! Bitte installieren.'; MISSING=1; } && \
  command -v pip3 >/dev/null 2>&1 || { echo '[WARN] pip3 nicht gefunden! Bitte installieren.'; MISSING=1; } && \
  python3 -m venv --help >/dev/null 2>&1 || { echo '[WARN] python3-venv nicht gefunden! Bitte installieren.'; MISSING=1; } && \
  if [ \"\$MISSING\" -eq 1 ]; then echo '[FEHLER] Mindestens eine benötigte Python-Komponente fehlt. Backend-Start wird übersprungen.'; exit 1; fi"

# Prüfen, ob virtuelles Environment existiert und ggf. erstellen
ssh "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_DIR && \
  if [ ! -d venv ]; then \
    echo 'Erstelle virtuelles Environment...' && \
    python3 -m venv venv && \
    echo 'Virtuelles Environment erstellt.'; \
  else \
    echo 'Virtuelles Environment existiert bereits.'; \
  fi"

# Abhängigkeiten installieren
ssh "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_DIR && \
  source venv/bin/activate && \
  pip install --upgrade pip && \
  pip install --no-cache-dir -r $REMOTE_DIR/requirements.txt"

# Backend starten
ssh "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_DIR && \
  pkill -f 'uvicorn.*:3000' 2>/dev/null || true && \
  nohup venv/bin/uvicorn backend_fastapi:app --host 0.0.0.0 --port 3000 > backend.log 2>&1 & \
  echo 'Remote-Backend installiert und neu gestartet.'"
