// useUndoRedo — verwaltet zwei Stacks (past, future) für Undo/Redo.
//
// Reine State-Verwaltung, kennt das Domain-Object nicht. Der Aufrufer
// entscheidet, wann ein Snapshot angelegt wird — üblicherweise vor jedem
// User-Move, der den Brett-Zustand verändert.
//
// Cap auf 50 Einträge pro Stack: eine Killer-Sudoku-Session dauert 5–30
// Minuten, 50 Undo-Schritte reichen für jeden realistischen Fall. Mehr
// wäre Memory-Bloat ohne erkennbaren Nutzen.

import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 50;

export interface UseUndoRedoResult<T> {
  /** Kann undo() etwas rückgängig machen? */
  canUndo: boolean;
  /** Kann redo() etwas wiederherstellen? */
  canRedo: boolean;
  /** Snapshot des aktuellen State in den Past-Stack legen. Idempotent für identischen State. */
  commit: (state: T) => void;
  /** Einen Schritt zurück. Gibt den State zurück, mit dem der Aufrufer applyState aufruft. */
  undo: () => T | null;
  /** Einen Schritt vor. Gibt den State zurück. */
  redo: () => T | null;
  /** Past + Future leeren (z. B. nach Reset oder Levelwechsel). */
  reset: () => void;
  /** Tiefe der Stacks (für UI/Debug). */
  pastDepth: number;
  futureDepth: number;
}

export function useUndoRedo<T>(): UseUndoRedoResult<T> {
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);

  // Refs, damit commit/undo/redo den jeweils aktuellen Stand sehen, ohne
  // durch stale-Closures bei React-StrictMode-Doppeleffekt reinzulaufen.
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  pastRef.current = past;
  futureRef.current = future;

  const commit = useCallback((state: T) => {
    const currentPast = pastRef.current;
    // Identische States nicht doppelt pushen (z. B. wenn dieselbe Zelle
    // zweimal hintereinander gesetzt wird, ohne dass sich der State
    // ändert — wir wollen den Undo-Stack nicht mit No-Ops füllen).
    if (currentPast.length > 0 && currentPast[currentPast.length - 1] === state) return;

    const next = [...currentPast, state];
    if (next.length > MAX_HISTORY) next.shift();
    pastRef.current = next;
    setPast(next);
    // Neuer Move invalidiert Redo-Historie (klassische Undo/Redo-Semantik).
    if (futureRef.current.length > 0) {
      futureRef.current = [];
      setFuture([]);
    }
  }, []);

  const undo = useCallback((): T | null => {
    const currentPast = pastRef.current;
    const currentFuture = futureRef.current;
    if (currentPast.length === 0) return null;
    const last = currentPast[currentPast.length - 1];
    const nextPast = currentPast.slice(0, -1);
    pastRef.current = nextPast;
    setPast(nextPast);
    futureRef.current = [...currentFuture, last];
    setFuture((f) => [...f, last]);
    return last;
  }, []);

  const redo = useCallback((): T | null => {
    const currentPast = pastRef.current;
    const currentFuture = futureRef.current;
    if (currentFuture.length === 0) return null;
    const next = currentFuture[currentFuture.length - 1];
    const nextFuture = currentFuture.slice(0, -1);
    futureRef.current = nextFuture;
    setFuture(nextFuture);
    pastRef.current = [...currentPast, next];
    setPast((p) => [...p, next]);
    return next;
  }, []);

  const reset = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    setPast([]);
    setFuture([]);
  }, []);

  return {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    commit,
    undo,
    redo,
    reset,
    pastDepth: past.length,
    futureDepth: future.length,
  };
}
