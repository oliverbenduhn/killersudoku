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

### Save-Queue

`storageService.enqueueGameStateSave(key, state)` ist die einzige
Schreib-Stelle für Spielstände. Sie serialisiert Schreibvorgänge pro
Schlüssel:

- `tail: Promise<void>` wird mit jedem Aufruf verkettet.
- Zwei schnelle Saves laufen nicht mehr parallel — Race-Bedingung
  "Spielstand 15s zurück" (Timer-Auto-Save vs. User-Save) wurde damit
  behoben.
- Errors werden `console.error`'d, nicht geworfen — Aufrufer sind
  fehlertolerant.

`ponytail:` globale Single-File-Queue, nicht pro Hook-Instanz. Reicht für
eine Hook-Instanz pro puzzleId. Bei mehreren parallelen Spielständen
müsste die Queue per Key segmentiert werden — derzeit nicht nötig.

### Lesevorgang

`storageService.loadGameState<T>(key)` lädt ein einzelnes Item, gibt
`null` bei Miss zurück.

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