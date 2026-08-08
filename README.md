# Killer Sudoku

Ein spielerisches Killer-Sudoku als Progressive Web App: klassisches 9×9-Sudoku
plus Käfige mit Pflichtsummen, optionalem Bleistiftmodus und Offline-Spiel über
Service Worker.

Live: [killer.benduhn.de](https://killer.benduhn.de) ·
[killer.obxy.de](https://killer.obxy.de).
Domain-Glossar: [`CONTEXT.md`](./CONTEXT.md).

## Tech-Stack

| Schicht | Technologie |
|---|---|
| UI-Framework | React 18.2 |
| Sprache | TypeScript 5.5 (strict) |
| Komponenten-Bibliothek | Chakra UI 2.8 + Emotion 11 |
| Animationen | framer-motion 11 |
| Persistenz | localforage 1.10 (IndexedDB) + `localStorage` (kleine Flags) |
| Build / Dev-Server | Vite 5 + `@vitejs/plugin-react` |
| PWA | `vite-plugin-pwa` 0.21 (Workbox, `autoUpdate`) |
| Tests | Jest 29 + ts-jest + `@testing-library/react` 16 (jsdom) |
| E2E (optional) | Playwright |
| Container (Fallback) | Multi-stage Dockerfile, nginx 1.27-alpine |

## Voraussetzungen

- Node.js 20+
- npm 10+
- Für Container-Deployment: Docker + Compose v2

## Quickstart

```bash
git clone https://github.com/oliverbenduhn/killersudoku.git
cd killersudoku
npm install
npm run dev          # http://localhost:5173
```

Production-Build:

```bash
npm run build        # produziert ./build/
npm run serve        # vite preview auf Port 8084
```

## Verifikation

```bash
npm run typecheck          # TypeScript strict, keine Fehler
npm run lint:levels        # Level-Validator-Suite (Puzzle-Integrität)
npm test                   # Jest-Suite
npm run validate           # typecheck + lint:levels
```

## Deployment

Ausführliche Schritte: [`DEPLOYMENT.md`](./DEPLOYMENT.md). Kurzfassung:

- **Empfohlen (Dauerlauf)**: `build/` per systemd-Service auf Port 8084.
  `sudo bash deploy/install.sh` nach jedem `npm run build`.
- **Fallback (Container)**: `docker compose build && docker compose up -d`,
  exponiert Port 8084 → Container-Port 80 mit nginx + Healthcheck.
- **Tunnel/Test**: `tmux new -d -s killersudoku 'npm run serve'`.
- **Reverse-Proxy**: Caddy auf `docker-03` zeigt
  `killer.benduhn.de → <host>:8084`.

## Versions-Pflege

`APP_VERSION` lebt in **zwei Dateien**, beide synchron halten:

- `package.json` → `"version"`
- `src/version.ts` → `APP_VERSION`

Vor jedem Release: `grep -n '"version"' package.json src/version.ts`.

## Projektstruktur

```
src/
  components/      # UI (Board, LevelSelector, NumberPad, common/*)
  hooks/           # React-Hooks mit ko-lokalen Tests
  services/        # Browser-I/O (Storage, Level-Loader, Game-Logic)
  utils/           # Pure Funktionen (keine I/O, kein DOM)
  types/           # Domain-Typen — Single Source of Truth
public/
  assets/levels/   # 100 hand-erstellte Puzzle als JSON
docs/
  adr/             # Architektur-Entscheidungen
  agents/          # Skill-Verträge (Sub-Agenten)
  superpowers/     # Historische Design-Specs
```

## Spielregeln kurz

- 9×9-Standard-Sudoku plus Käfige.
- Innerhalb jedes Käfigs summieren sich die Zellen auf die Käfigsumme.
- Keine Ziffer darf in einem Käfig doppelt vorkommen.
- Modi: klassisch, Bleistift (Notizen), Schwarz-Weiß-Darstellung.
- Tastatur, Maus und Touch werden voll unterstützt; Shortcuts siehe
  Help-Dialog (`?`) im Spiel.

## Mitwirken

Issues leben als [GitHub-Issues](https://github.com/oliverbenduhn/killersudoku/issues).
Offene Hausaufgaben: [`TODO.md`](./TODO.md). ADR-Konventionen siehe
[`docs/adr/`](./docs/adr/). Domänen-Vokabular bindend: [`CONTEXT.md`](./CONTEXT.md).

## Lizenz

Privates Projekt. Keine Lizenzdatei im Repo. Externe Nutzung derzeit nicht
vorgesehen.