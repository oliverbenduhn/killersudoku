# Persistenz — Killer Sudoku

Drei Speicherkanäle mit unterschiedlichen Aufgaben. Neue Keys hier eintragen.

## Übersicht

| Kanal | Library | Volumen | Lifetime | Sync? |
|---|---|---|---|---|
| `localStorage` | nativ | winzig (< 5 KB total) | persistent, browsergebunden | sync |
| IndexedDB (via localforage) | localforage 1.10 | 1 Eintrag pro aktivem Puzzle | persistent, browsergebunden | async |
| React-State | React | hängt am Component-Tree | Session | sync |

## localStorage-Keys

| Key | Typ | Eigentümer | Zweck |
|---|---|---|---|
| `killersudoku_current_level` | `string` (Number als String) | `App.tsx` | Zuletzt gespieltes Level, Restore nach Reload |
| `killersudoku_bw` | `"0"` \| `"1"` | `App.tsx` | Schwarz-Weiß-Modus-Toggle |
| `killersudoku_solved_levels` | `number[]` | `progressService.ts` | Set gelöster Level für Levelübersicht |
| `killersudoku_started_levels` | `number[]` | `progressService.ts` | Set angefangener Level (für Punkt-Markierung) |
| `colorScheme` | `warm` / `warmDark` / `ocean` / `forest` | `ColorSchemeProvider` | Farbschema |
| `installPromptDismissed` | Zeitstempel als String | `InstallPrompt` | Installationshinweis eine Woche unterdrücken |
| `killersudoku_tutorial_seen` | `"1"` | `useTutorial.ts` | Tutorial nur beim ersten Besuch zeigen |

Alle Schreibzugriffe laufen durch `try { ... } catch {}` — Safari-Private-Mode
und Quota-Fehler werfen beim Schreiben.

### Konvention

- Strings, niemals Numbers — JSON-Werte werden ohnehin serialisiert.
- Set-Keys als Array gespeichert (`JSON.stringify(Array.from(set))`), beim
  Lesen durch `Set` gefiltert auf `typeof n === 'number'`.
- Niemals still überschreiben ohne den Wert vorher zu lesen — sonst geht
  der Progress verloren.

## IndexedDB (via localforage)

Ein einziger Key-Pfad: `${STORAGE_PREFIX}${puzzleId}`. Inhalt: vollständige
`GameState`-Struktur als JSON.

### Save-Queue und Schreibbesitz

`enqueueGameStateSave` ist der gemeinsame Schreibpfad; `saveGameState` delegiert
darauf. `runStorageOperation` serialisiert auch statistische Read-modify-write-
Operationen und schützt sie mit einem kurzen Web Lock. Fehler werden weitergegeben
und im Hook als sichtbarer, wiederholbarer Speicherfehler behandelt.

`acquireGameSession` hält pro Puzzle einen exklusiven Web Lock für die Lebensdauer
der aktiven Hook-Instanz. Erst nach Abschluss ausstehender Saves wird er freigegeben.
Ein zweites Fenster darf nicht schreiben und zeigt eine Wiederholungsaktion.
Web Locks sind flüchtige Browserkoordination, kein neuer persistenter Kanal.
Browser ohne diese Fähigkeit zeigen eine Fehlermeldung. HTTPS bzw. localhost ist
erforderlich. Siehe ADR 0004.

Die History speichert nur Zellwerte und Notiz-Kandidaten. Verbrauchszähler und
Zeit bleiben beim Undo erhalten. `statisticsRecorded` im Spielstand kennzeichnet
eine erfolgreiche Statistikbuchung; fehlende Buchungen werden nach Reload
idempotent wiederholt. Reset erstellt eine neue Spielinstanz.

### Lesevorgang

`storageService.loadGameState<T>(key)` lädt ein einzelnes Item, gibt
`null` bei Miss zurück. Ein Lesefehler erzeugt keinen leeren Ersatzstand; die Oberfläche bietet Wiederholen an.

`storageService.clearAllGameStates()` löscht **nur** Spielstände (Keys mit
Prefix `GAME_STATE_PREFIX`). Statistik und Progress bleiben unberührt.

### Storage-Prefix-Konstanten (`src/config.ts`)

| Konstante | Wert | Verwendung |
|---|---|---|
| `STORAGE_PREFIX` | `"killersudoku_"` | Prefix für alle localforage-Keys |
| `GAME_STATE_PREFIX` | `"killersudoku_game_"` | Prefix für Spielstand-Keys |

`clearAllGameStates()` filtert mit `startsWith(GAME_STATE_PREFIX)`.

## React-State

Pro Komponente / Hook:

| State | Hook | Lifetime |
|---|---|---|
| `cellValues`, `notes` | `useGameState` | Session + persistiert |
| `pencilMode` | `Board.tsx` | Session, Reset beim Levelwechsel |
| `selectedCell`, `selectedCells` | `useCellSelection` | Drag-Lifetime |
| `past`, `future` (Undo-Stacks) | `useUndoRedo` | Session |
| `blackAndWhiteMode` | `App.tsx` | Persistent |
| `currentLevel` | `App.tsx` | Persistent |

**Regel**: Local UI-State (`pencilMode`, Selection, Drag-Anker) niemals
persistieren. Domain-State (`cellValues`, `notes`, `currentLevel`,
`blackAndWhiteMode`) gehört in die jeweilige Persistenz.

## Wenn ein neuer Key dazukommt

1. Konstante in `src/config.ts` (falls Prefix nötig).
2. Service-Funktion in `src/services/` mit `try/catch`.
3. Eintrag in dieser Datei (Tabelle oben).
4. `npm run typecheck` und `npm test`.

## Wenn der Storage migriert werden muss

Es gibt keine echte Migrations-Routine. Bisherige Strategie:
`sanitizePlayerBoard` in `gameLogicService.ts` schreibt alte Spielstände
beim Laden anhand der aktuellen Hard Constraints auf die aktuellen
Vorgaben zurück. Widersprüchliche User-Einträge werden verworfen.

Das ist absichtlich konservativ — Datenverlust durch aggressive Migration
ist teurer als gelegentliche "deine alte Eingabe wurde verworfen"-Toasts.