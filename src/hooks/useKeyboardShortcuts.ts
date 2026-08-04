// useKeyboardShortcuts — ein window-Listener für alle App-Shortcuts.
//
// Bewusst ein einziger Listener pro Effect, nicht fünf getrennte.
// Spart fünf addEventListener/removeEventListener-Paare und macht
// die Modifier- und Input-Feld-Prüfung an genau einer Stelle nachvollziehbar.
//
// ponytail: Handler-Liste ist klein und linear — kein Dispatch-Table,
// keine Generic-Inferenz. Bei Wachstum auf > 12 Shortcuts lohnt sich
// ein zentrales Shortcut-Registry mit Bind-Lookup.

import { useEffect } from 'react';

export interface ShortcutHandlers {
  onTogglePencil: () => void;
  onToggleHints: () => void;
  onHint: () => void;
  onRevealHint: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearSelection: () => void;
  onOpenHelp: () => void;
}

const isInputFocused = (): boolean => {
  if (typeof document === 'undefined') return false;
  const a = document.activeElement as HTMLElement | null;
  if (!a) return false;
  const tag = a.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (a.isContentEditable) return true;
  return false;
};

/**
 * Matcher-Helper: matched ein KeyboardEvent auf einen "Key-Spec".
 * "Mod" = Cmd (Mac) oder Ctrl (sonst). Groß-/Kleinschreibung egal für Buchstaben.
 */
const matchesKey = (e: KeyboardEvent, spec: string, mod: boolean): boolean => {
  const parts = spec.split('+').map((p) => p.trim());
  let wantsMod = false;
  let key = '';
  for (const p of parts) {
    if (p === 'Mod') wantsMod = true;
    else key = p;
  }
  if (wantsMod !== mod) return false;
  if (key === '') return false;
  if (key.length === 1) {
    return e.key.toLowerCase() === key.toLowerCase();
  }
  // Sonderzeichen wie "?", "Escape" usw.
  return e.key === key || e.key === 'Escape' && key === 'Esc' || key === 'Tab' && e.key === 'Tab';
};

export const useKeyboardShortcuts = (handlers: ShortcutHandlers): void => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // eslint-disable-next-line no-console
      console.log('[DEBUG] keyDown', e.key, 'active=', document.activeElement?.tagName, 'repeat=', e.repeat);
      // Doppel-Trigger bei Halten unterdrücken.
      if (e.repeat) return;
      const inInput = isInputFocused();
      const mod = e.ctrlKey || e.metaKey;

      // eslint-disable-next-line no-console
      console.log('[DEBUG] inInput=', inInput, 'mod=', mod, 'key=', e.key);
      // Hilfs-Routing: jeder Branch prüft seine Input-Feld-Regel selbst,
      // damit "?" und Esc auch im Level-Input (Header) wirken.
      // eslint-disable-next-line no-console
      console.log('[DEBUG] checking P');
      // Bleistiftmodus (P) — Input-Felder ignorieren (Header-Level-Input);
      // Modifier (Ctrl/Meta/Alt) ebenfalls, weil Browser-Defaults (PWA,
      // Cmd+P drucken) nicht kollidieren dürfen.
      if (!inInput && !mod && !e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handlers.onTogglePencil();
        return;
      }
      // Hint-Overlay (F5) — Browser versucht sonst die Seite neu zu laden,
      // daher preventDefault zwingend.
      if (!inInput && e.key === 'F5') {
        e.preventDefault();
        handlers.onToggleHints();
        return;
      }
      // Strategischer Tipp (H) — auch im Level-Input ok, weil's nur ein Toast ist.
      if (!inInput && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        handlers.onHint();
        return;
      }
      // Reveal-Hinweis (R)
      if (!inInput && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        handlers.onRevealHint();
        return;
      }
      // Esc: Auswahl aufheben ODER (im Level-Input) Default-Verhalten des Inputs.
      if (!inInput && e.key === 'Escape') {
        e.preventDefault();
        handlers.onClearSelection();
        return;
      }
      // ? öffnet Hilfe (Shift+/ auf DE-Layout = "?").
      // Bewusst nur ohne Modifier — Browser-Default Ctrl+? uninteressant.
      if (!inInput && e.key === '?' && !mod) {
        e.preventDefault();
        handlers.onOpenHelp();
        return;
      }
      // Mod+Z = Undo, Mod+Shift+Z ODER Mod+Y = Redo.
      if (!inInput && mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) handlers.onRedo();
        else handlers.onUndo();
        return;
      }
      if (!inInput && mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handlers.onRedo();
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
};

// matchesKey bleibt exportiert für Unit-Tests, falls jemand die
// Matching-Semantik prüfen will (z. B. Tastatur-Layout-Wechsel).
export { matchesKey };
