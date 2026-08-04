// Single-Source-of-Truth für Tastatur-Shortcuts.
//
// `KEYBOARD_SHORTCUTS` ist die Anzeige-Liste (Modal + Doku) UND die
// Eingabe-Liste (window-Listener). Keys kommen in der Form, die
// `KeyboardEvent.key` liefert — lowercase für Buchstaben, Sonderzeichen
// unverändert (z. B. "?", "ArrowUp"). Modifier (`mod` = Cmd auf Mac,
// Strg sonst) werden in der Anzeige als ⌘/Ctrl gerendert und im
// Handler via `e.ctrlKey || e.metaKey` geprüft.
//
// ponytail: bewusst keine Abstraktion mit "ModifierSet"/"KeycodeMap".
// Die Liste ist 8 Einträge groß, jedes Item ist ein Datensatz.

export interface Shortcut {
  /** Anzeige-Schlüssel, z. B. "p", "?", "Mod+Z". */
  keys: string;
  label: string;
  /** Wo der Shortcut wirkt — gruppiert die Anzeige. */
  group: 'Spielzug' | 'Hilfe' | 'Modus';
  /** true = muss in einem Eingabefeld (INPUT/TEXTAREA/SELECT/contentEditable)
   *  unterdrückt werden, false = immer aktiv. */
  ignoreInInputs: boolean;
  /** true = Shortcut nur aktiv, wenn eine Zelle ausgewählt ist. */
  needsSelection?: boolean;
}

export const KEYBOARD_SHORTCUTS: ReadonlyArray<Shortcut> = [
  { keys: '1–9', label: 'Zahl setzen — im Notizmodus als Notiz', group: 'Spielzug', ignoreInInputs: true, needsSelection: true },
  { keys: '0 · Backspace · Delete', label: 'Auswahl löschen', group: 'Spielzug', ignoreInInputs: true, needsSelection: true },
  { keys: 'Pfeile / WASD', label: 'Zellnavigation', group: 'Spielzug', ignoreInInputs: true, needsSelection: true },
  { keys: 'Tab · Shift+Tab', label: 'Nächste / vorige Zelle', group: 'Spielzug', ignoreInInputs: true, needsSelection: true },
  { keys: 'Esc', label: 'Auswahl aufheben', group: 'Spielzug', ignoreInInputs: false },
  { keys: 'Mod+Z', label: 'Rückgängig', group: 'Spielzug', ignoreInInputs: false },
  { keys: 'Mod+Shift+Z · Mod+Y', label: 'Wiederherstellen', group: 'Spielzug', ignoreInInputs: false },
  { keys: 'P', label: 'Notizmodus an/aus', group: 'Modus', ignoreInInputs: true },
  { keys: 'F5', label: 'Mögliche-Werte-Hinweise an/aus', group: 'Modus', ignoreInInputs: false },
  { keys: 'H', label: 'Strategischer Tipp (zeigt Toast)', group: 'Hilfe', ignoreInInputs: false },
  { keys: 'R', label: 'Hinweis aufdecken (verbraucht 1 von 3)', group: 'Hilfe', ignoreInInputs: false },
  { keys: '?', label: 'Diese Hilfe anzeigen', group: 'Hilfe', ignoreInInputs: false },
];

/** Plattform-aware Anzeige für "Mod" (Cmd auf macOS, Ctrl sonst). */
export const MOD_LABEL: string =
  typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
    ? '⌘'
    : 'Strg';

/** Ersetzt "Mod" im Anzeige-String durch das plattform-spezifische Label. */
export const formatShortcutKeys = (keys: string): string => keys.replace(/\bMod\b/g, MOD_LABEL);
