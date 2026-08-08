# Tastatur- und Pointer-Map

Quelle der Wahrheit für Shortcuts: `src/components/Board/keyboardShortcuts.ts`
(`KEYBOARD_SHORTCUTS`). Diese Datei ist sowohl Anzeige-Liste (Modal,
Help-Dialog) als auch Eingabe-Liste (verarbeitet in
`src/hooks/useKeyboardShortcuts.ts` für App-weite Shortcuts,
`src/hooks/useBoardKeyboard.ts` für Brett-Shortcuts).

Bei einer neuen Taste: **erst** Eintrag in `KEYBOARD_SHORTCUTS`,
**dann** Handler im passenden Hook, **dann** Eintrag hier.

## Konvention

- `Mod` = `Cmd` auf macOS, `Strg` sonst. Anzeige via `formatShortcutKeys()`.
- Groß-/Kleinschreibung der Buchstaben egal — Listener normalisiert auf
  lowercase.
- `ignoreInInputs: true` = Shortcut wirkt nicht, wenn ein `<input>`,
  `<textarea>`, `<select>` oder `contentEditable`-Element Fokus hat.

## Brett-Shortcuts (mit Selection)

| Tasten | Wirkung | Gruppe | ignoreInInputs |
|---|---|---|---|
| `1`–`9` | Zahl setzen — im Notizmodus (P) als Notiz-Kandidat | Spielzug | ja |
| `0` · `Backspace` · `Delete` | Auswahl löschen — im Notizmodus werden Notizen gelöscht | Spielzug | ja |
| Pfeile · `WASD` | Zellnavigation (Cursor = selectedCell) | Spielzug | ja |
| `Tab` · `Shift+Tab` | Nächste / vorige Zelle mit Wrap-around | Spielzug | ja |
| `Shift`+Pfeil | Rechteck vom Anker bis Cursor (Excel-Style) | Spielzug | ja |

`Shift+Tab` am linken Rand springt zur letzten Zelle der vorigen Zeile;
`Tab` am rechten Rand springt zur ersten Zelle der nächsten Zeile; in der
letzten Zelle wrapt `Tab` zu `{0,0}`.

## Brett-Shortcuts (immer aktiv)

| Tasten | Wirkung | Gruppe | ignoreInInputs |
|---|---|---|---|
| `Esc` | Auswahl aufheben | Spielzug | nein |

## Undo / Redo (Cmd/Strg)

| Tasten | Wirkung | Gruppe | ignoreInInputs |
|---|---|---|---|
| `Mod+Z` | Undo — setzt Brett auf vorigen Snapshot | Spielzug | nein |
| `Mod+Shift+Z` · `Mod+Y` | Redo | Spielzug | nein |

## Modi und Hilfe

| Tasten | Wirkung | Gruppe | ignoreInInputs |
|---|---|---|---|
| `P` | Notizmodus umschalten (Reset beim Levelwechsel) | Modus | ja |
| `F5` | Hint-Overlay (mögliche Werte) an/aus — Browser-Reload wird unterdrückt | Modus | nein |
| `H` | Strategischer Tipp (Toast mit Technik + Wert) | Hilfe | nein |
| `R` | Reveal-Hinweis (verbraucht 1 von 3 — gibt es nicht, wenn Limit erreicht) | Hilfe | nein |
| `?` | Help-Dialog öffnen / schließen | Hilfe | nein |

## Pointer / Maus / Touch

Vereinheitlicht über `PointerEvent` (`onPointerDown` / `Move` / `Up` /
`Cancel`). `setPointerCapture` hält die Bewegung auf der Start-Cell, auch
wenn der Finger/die Maus die Cell-Grenze überschreitet.

| Geste | Wirkung |
|---|---|
| Single-Tap / Single-Click | Selektiert die Cell |
| Drag (Maus oder Touch) | Rechteck-Mehrfachauswahl vom Anker bis Cursor |
| Double-Tap / Doppelklick | Selektiert alle Zellen des Käfigs der Cell |

Die Touch-Behandlung setzt `touch-action: none` auf jeder Cell, damit iOS
nicht scrollt oder Pull-to-Refresh triggert. iOS-Scroll auf der Tab-Liste
läuft separat über den Tab-Container (`overflow-y: auto`).

## E2E-Selektoren (für Playwright / Probe-Skripte)

Stabil pro Layer:

| Was | Selektor |
|---|---|
| Cell-Div | `[data-testid="cell-${row}-${col}"]` |
| Cell-Wert | `[data-testid="value-${row}-${col}"]` |
| Cell-Notizen | `[data-testid="notes-${row}-${col}"]` |
| Board-Root | `[data-board-root="true"]` |
| Aria-Label | `Zeile ${row+1} Spalte ${col+1}[, Wert N][, leer][, vorgegeben][, ungültig][, Notizen …]` |

`data-testid` ist die primäre Quelle; `aria-label` ist Fallback für Screenreader-Tests.

## Was hier nicht erscheint

- Eigene Maus-Buttons (Rechtsklick, Mittelklick) — werden nicht abgefangen,
  Default-Verhalten des Browsers bleibt.
- Touch-Gesten über zwei Finger (Pinch-Zoom etc.) — bewusst ignoriert, um
  Drag-Selection nicht zu stören. App ist nicht zoombar.