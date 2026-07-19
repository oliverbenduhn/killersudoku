# Deployment

Diese PWA wird über die statische `build/`-Ausgabe ausgeliefert. Es braucht
keinen App-Server, kein Node.js zur Laufzeit — nur einen HTTP-File-Server.

## Build

```bash
npm install          # einmalig
npm run build        # produziert ./build/
```

## Variante A — systemd-Service (empfohlen für Dauerlauf)

Im Repo liegt `deploy/killersudoku.service` plus `deploy/install.sh`. Der
Service läuft als User `oliver`, serviert `build/` auf Port 8084, restartet
bei Crash.

```bash
# nach jedem 'git pull' + 'npm run build':
sudo bash deploy/install.sh
```

Wenn sich am Pfad zum Repo oder am Usernamen etwas ändert: die `.service`-Datei
editieren, dann nochmal `bash deploy/install.sh` — das Skript ist idempotent.

### Logs ansehen

```bash
journalctl -u killersudoku -f
```

## Variante B — tmux

```bash
tmux new -d -s killersudoku 'cd /home/oliver/killersudoku && npm run serve'
```

Stoppen mit `tmux kill-session -t killersudoku`. Logs in der tmux-Session.

## Im Heimnetz hinter Caddy (Teddy)

Die `killer.benduhn.de`-Subdomain wird vom Caddy-Reverse-Proxy auf diesen Host
umgestellt. Auf docker-03 in der Caddy-Config:

```diff
killer.benduhn.de {
-    reverse_proxy 192.168.50.43:8084
+    reverse_proxy 192.168.50.61:8084
}
```

`caddy reload` — fertig. Browser-Cache leeren (DevTools → Application →
Service Workers → Unregister + Hard-Reload), sonst zeigt Chrome die alte
CRA-Version aus dem SW-Cache.

## Vorheriger Stand

Vor der Umstellung lief die App als Docker-Container auf `docker-03`, gebaut
aus diesem Repo mit `docker compose build && up -d`. Das Dockerfile bleibt
funktional und kann genutzt werden, wenn der Dienst dort verbleiben soll —
dann ändert sich am Caddy nichts.
