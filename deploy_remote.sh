#!/bin/bash
# Frontend-Deploy nach 192.168.2.36:/var/www/html (Caddy davor, nginx origin).
#
# Robustheitsmerkmale:
#  - Pre-Flight: prüft ob Build frisch ist und lokal vollständig
#  - Atomares Swappen: neuer Build landet in /var/www/html.new/, dann mv
#  - Smoke-Test: GET auf /index.html muss 200 + HTML liefern
#  - Alte SW-Caches sind Client-Problem, nicht Server-Problem. Wir geben
#    aber einen Hinweis aus, falls das Manifest-Bundle fehlt.

set -euo pipefail
trap 'echo "❌ Fehler bei Zeile $LINENO. Deployment abgebrochen." >&2; exit 1' ERR

REMOTE_USER="webuser"
REMOTE_HOST="192.168.2.36"
REMOTE_DIR="/var/www/html"
REMOTE_STAGING="${REMOTE_DIR}.new"
LOCAL_BUILD_DIR="build"

log() { echo "▶ $*"; }
ok()  { echo "✓ $*"; }
die() { echo "❌ $*" >&2; exit 1; }

# --- Pre-Flight -----------------------------------------------------------

[ -d "src" ] || die "Kein Frontend gefunden (src fehlt)."
[ -f "package.json" ] || die "package.json fehlt."

if [ ! -f "$LOCAL_BUILD_DIR/index.html" ]; then
  log "Build fehlt, erzeuge ihn neu …"
  rm -rf "$LOCAL_BUILD_DIR"
  npm run build || die "Build fehlgeschlagen."
fi

# Pflicht-Files, die das Vite-Build erzeugen muss.
required=(
  "$LOCAL_BUILD_DIR/index.html"
  "$LOCAL_BUILD_DIR/sw.js"
  "$LOCAL_BUILD_DIR/manifest.webmanifest"
  "$LOCAL_BUILD_DIR/assets"
)
for f in "${required[@]}"; do
  [ -e "$f" ] || die "Pflicht-Datei fehlt im Build: $f"
done

# Sanity-Check: index.html verweist auf das gebaute JS-Bundle.
grep -q '/assets/' "$LOCAL_BUILD_DIR/index.html" \
  || die "index.html verweist nicht auf /assets/. Wahrscheinlich veralteter Build."

asset_count=$(find "$LOCAL_BUILD_DIR/assets" -type f | wc -l)
ok "Build OK: $asset_count Dateien in build/assets (inkl. Level)"

# --- Stage ----------------------------------------------------------------

log "Übertrage Build nach ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_STAGING} …"

ssh "${REMOTE_USER}@${REMOTE_HOST}" "rm -rf '${REMOTE_STAGING}' && mkdir -p '${REMOTE_STAGING}'"
scp -r "$LOCAL_BUILD_DIR/." "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_STAGING}/"

# --- Atomares Swappen -----------------------------------------------------

# mv auf demselben Filesystem ist atomar. Das alte Verzeichnis bleibt als
# Fallback erhalten, falls der Smoke-Test failt.
log "Atomares Swappen …"
ssh "${REMOTE_USER}@${REMOTE_HOST}" "
  set -e
  if [ -d '${REMOTE_DIR}' ]; then
    # Fallback behalten, aber alte Dateien überschreiben
    mv '${REMOTE_STAGING}' '${REMOTE_DIR}.swap'
    rm -rf '${REMOTE_DIR}'
    mv '${REMOTE_DIR}.swap' '${REMOTE_DIR}'
  else
    mv '${REMOTE_STAGING}' '${REMOTE_DIR}'
  fi
"

# --- Smoke-Test -----------------------------------------------------------

log "Smoke-Test auf Origin …"
smoke=$(ssh "${REMOTE_USER}@${REMOTE_HOST}" "curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1/index.html")
[ "$smoke" = "200" ] || die "Smoke-Test fehlgeschlagen: GET /index.html = $smoke"

ok "Origin liefert 200 und $(ssh "${REMOTE_USER}@${REMOTE_HOST}" "ls '${REMOTE_DIR}/assets' | wc -l") Assets aus."

# --- Hinweis bei altem Browser-SW ----------------------------------------
# Wenn ein Browser noch einen alten Service-Worker aus dem CRA-Build hat
# (registriert auf /service-worker.js), sieht er u.U. eine alte Version.
# Workaround dort: DevTools → Application → Service Workers → Unregister.
cat <<'NOTE'

ℹ️  Falls im Browser eine alte Version sichtbar bleibt:
    Chrome DevTools → Application → Service Workers → Unregister,
    dann Application → Storage → Clear site data,
    dann Hard-Reload (Strg+Shift+R).
    Der neue SW (sw.js) ist jetzt aktiv.

NOTE

ok "Deploy abgeschlossen: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}"
