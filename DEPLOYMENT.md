# Deployment

Diese PWA wird über die statische `build/`-Ausgabe ausgeliefert. Es braucht
keinen App-Server, kein Node.js zur Laufzeit — nur einen HTTP-File-Server.

## Lokal servieren

```bash
npm install          # einmalig
npm run build        # produziert ./build/
npm run serve        # python3 -m http.server 8084 --bind 0.0.0.0 --directory build
```

Server lauscht auf `0.0.0.0:8084`, also auch auf der LAN-IP des Hosts.

## Im Heimnetz hinter Caddy

Die `killer.benduhn.de`-Subdomain wird vom Caddy-Reverse-Proxy (Teddy)
auf den Container-Host `docker-03` (`192.168.50.43:8084`) geleitet. Wenn die
PWA stattdessen **direkt von diesem Host** (`192.168.50.61:8084`) ausgeliefert
werden soll, ändere die Caddy-Config wie folgt:

```caddyfile
killer.benduhn.de {
    reverse_proxy 192.168.50.61:8084
}
```

Der `npm run serve`-Prozess muss dazu dauerhaft laufen — als systemd-Service,
in einer tmux/Screen-Session, oder als Docker-Container mit `--network host`
und Port-Mapping `8084:8084`.

## Vorheriger Stand

Vor der Umstellung lief die App als Docker-Container auf `docker-03`, gebaut
aus diesem Repo mit `docker compose build && up -d`. Das Dockerfile ist
weiterhin funktional und kann genutzt werden, wenn der Dienst auf `docker-03`
verbleiben soll.
