# Doku — Killer Sudoku

Inhaltsverzeichnis der gesamten Dokumentation. Wer sich hier verirrt:
die Repo-Wurzel-Dateien sind für Menschen, `AGENTS.md` ist für KI-Agenten,
`docs/` ist der Detail-Trail.

## Einstieg (Root)

| Datei | Zielgruppe | Zweck |
|---|---|---|
| [`README.md`](../README.md) | Mensch | Projektzweck, Tech-Stack, Quickstart, Deployment-Übersicht |
| [`AGENTS.md`](../AGENTS.md) | KI-Agenten | Strikt formuliertes Regelwerk für Code-Arbeit |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Mensch | Dev-Loop, Tests, Lint, Versions-Pflege |
| [`CLAUDE.md`](../CLAUDE.md) | KI-Skill-Loader | Skill-Verträge, die diese Repo nutzt |
| [`CONTEXT.md`](../CONTEXT.md) | beide | Domänen-Glossar (verbindlich) |
| [`DEPLOYMENT.md`](../DEPLOYMENT.md) | Mensch | Build, systemd, Docker, Caddy-Setup |
| [`TODO.md`](../TODO.md) | Mensch | Offene Hausaufgaben (Rohform, GitHub-Issues sind kanonisch) |

## Tiefen-Doku

| Datei | Zweck |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Tech-Stack-Schichten, Datenfluss, Render-Schichten, Hook-Composition |
| [`DATA-MODEL.md`](./DATA-MODEL.md) | Domain-Typen, Level-JSON-Schema, GameState, Invarianten |
| [`KEYBOARD-MAP.md`](./KEYBOARD-MAP.md) | Shortcuts, Pointer-Gesten, E2E-Selektoren |
| [`STORAGE.md`](./STORAGE.md) | localStorage-Keys, IndexedDB-Kontrakt, Save-Queue |
| [`TESTING.md`](./TESTING.md) | Jest-Konventionen, Suites, Hook-Test-Pattern |
| [`PWA.md`](./PWA.md) | Service Worker, Offline, Installierbarkeit |

## Konzepte

| Datei | Zweck |
|---|---|
| [`concepts/level-generation.md`](./concepts/level-generation.md) | Wie Killer-Sudoku-Level erzeugt und validiert werden |

## Architektur-Entscheidungen (`adr/`)

| Nr. | Titel | Status |
|---|---|---|
| [0001](./adr/0001-svg-overlay-board-rendering.md) | SVG-Overlay-Board-Rendering | accepted |
| [0002](./adr/0002-einerkäfig-quote.md) | Einerkäfig-Quote | accepted |
| [0003](./adr/0003-undo-redo-post-change-snapshot.md) | Undo/Redo Post-Change-Snapshot | accepted |

ADRs sind chronologisch nummeriert. Keine löschen — superseded-ADRs bleiben
mit Verweis auf den Nachfolger.

## Skill-Verträge (`agents/`)

Diese Ebene ist **nicht** Teil des Mensch-TOC. Sie definiert, wie
Engineering-Skills (Codex, Claude, lokale Agenten) das Repo konsumieren.
Vollständige Liste siehe [`agents/`](./agents/):

- `domain.md` — Wie Skills die Domain-Doku nutzen
- `issue-tracker.md` — GitHub-`gh`-Workflow
- `triage-labels.md` — Label-Vokabular

## Historische Specs (`superpowers/`)

Design-Specs vergangener Sessions. Nicht verbindlich, aber wertvoll für
"warum sieht es heute so aus"-Recherchen. Lieber hier nachschlagen, als
eine Diskussion zu wiederholen.

## Was hier nicht steht

- **API-Doku.** Die App hat keine API.
- **Cron-/Hintergrund-Job-Doku.** Die App hat keine.
- **Deployment-Playbooks** über das hinaus, was in `DEPLOYMENT.md` steht.
  Provisioning pro Host ist out of scope.
- **Marketing-Copy.** Die App ist ein Hobbyprojekt ohne Marketing.

## Wenn etwas fehlt

- Spec / Konzept → [`docs/concepts/`](./concepts/) oder neuer ADR.
- Konvention / Anti-Pattern → [`AGENTS.md`](../AGENTS.md).
- Repo-Struktur / Domain → [`CONTEXT.md`](../CONTEXT.md).
- Build- / Deployment-Schritt → [`DEPLOYMENT.md`](../DEPLOYMENT.md).