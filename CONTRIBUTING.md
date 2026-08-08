# Contributing — Killer Sudoku

Dev-Loop für Änderungen am Codebase. Hält jeden Commit verifizierbar und jeden
Reviewer ehrlich. Bindend für Mensch und Agent.

## Voraussetzungen

- Node.js 20+
- npm 10+
- Für Container: Docker + Compose v2

## Setup

```bash
git clone https://github.com/oliverbenduhn/killersudoku.git
cd killersudoku
npm install
```

## Tägliche Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Vite-Dev-Server auf Port 5173, Hot-Reload |
| `npm run typecheck` | TypeScript strict, muss vor jedem Commit passen |
| `npm test` | Jest-Suite (jsdom + ts-jest) |
| `npm run lint:levels` | Level-Validator-Suite — Pflicht nach jeder Level-JSON-Änderung |
| `npm run validate` | typecheck + lint:levels (Standard-Pre-Commit-Check) |
| `npm run build` | Production-Bundle nach `./build/` |
| `npm run serve` | `vite preview` auf Port 8084 (für Production-Smoke) |
| `npm run test:smoke` | Headless Smoke gegen das Production-Bundle (`scripts/probe.mjs`) |

## Workflow pro Änderung

1. **Issue oder Spec.** Ohne GitHub-Issue / TODO-Eintrag / ADR kein Code.
   Hausaufgaben liegen in [`TODO.md`](./TODO.md), Konzepte in
   [`docs/concepts/`](./docs/concepts/), Entscheidungen in
   [`docs/adr/`](./docs/adr/).

2. **Branch.** Vom aktuellen `main` abzweigen:
   `git checkout -b feat/<kurzname>` oder `fix/<kurzname>`.

3. **TDD wo möglich.** Tests werden neben dem Code geschrieben (RED-GREEN-REFACTOR).
   Hook-Tests: Driver-Component mit echtem `useState`, kein `jest.fn()`-Mock
   für State-Slots — der Mock friert Closures ein. Siehe `useCellAnimation.test.tsx`
   als Referenz.

4. **Verifikation.** Vor dem Commit:
   ```bash
   npm run validate
   npm test
   ```

5. **Konventionen.** Siehe [`AGENTS.md`](./AGENTS.md) §5 (Coding), §6 (Drei-Schichten-Render),
   §10 (Anti-Patterns).

6. **Commit.** Conventional Commits. Versions-Tag-Suffix nur bei Releases
   (`feat(0.3.0): ...`, `fix(0.2.3): ...`).

7. **Version bei Release.** **Beide** Dateien synchron anpassen:
   - `package.json` → `"version"`
   - `src/version.ts` → `APP_VERSION`
   - Verifizieren: `grep -n '"version"' package.json src/version.ts`

## Issue-Workflow

Issues leben als GitHub-Issues über `gh` CLI (siehe
[`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md)).
Standardlabels: `needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix` (siehe
[`docs/agents/triage-labels.md`](./docs/agents/triage-labels.md)).

## ADR-Workflow

Architektur-Entscheidungen mit Repo-weitem Effekt werden in `docs/adr/` als
kurze Markdown-Datei festgehalten. Format:

```md
# ADR-NNNN — Kurztitel

Status: accepted | proposed | superseded
Kontext: <was steht zur Wahl>
Entscheidung: <was wurde entschieden>
Konsequenzen: <was folgt daraus, positiv und negativ>
```

Nummern sind monoton steigend. Keine ADRs löschen — superseded ADRs verbleiben
mit Verweis auf den Nachfolger.

## Test-Konventionen (Kurzfassung)

Vollständige Spec: [`docs/TESTING.md`](./docs/TESTING.md).

- `*.test.ts` für pure Funktionen und Services.
- `*.test.tsx` für Komponenten und Hooks, die React brauchen.
- Eine Datei pro Implementierungs-Datei, ko-lokal.
- Keine Snapshot-Tests für UI; lieber `@testing-library`-Queries.
- Keine globalen Setup-Änderungen ohne Diskussion.

## Was nicht passieren darf

- Direkter Commit auf `main` (außer für Hotfixes mit Maintainer-Sign-off).
- Force-Push auf geteilte Branches.
- Commits, die `node_modules/`, `build/` oder den Service-Worker-Cache ändern.
- "Drive-by refactors" in Feature-Branches.
- Neue Persistenz-Keys ohne Eintrag in [`docs/STORAGE.md`](./docs/STORAGE.md).
- Neue Tastatur-Shortcuts ohne Eintrag in [`docs/KEYBOARD-MAP.md`](./docs/KEYBOARD-MAP.md)
  und in `src/components/Board/keyboardShortcuts.ts`.