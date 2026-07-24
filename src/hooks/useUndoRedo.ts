// useUndoRedo — verwaltet zwei Stacks (past, future) für Undo/Redo.
//
// Reine State-Verwaltung, kennt das Domain-Object nicht. Der Aufrufer
// entscheidet, wann ein Snapshot angelegt wird — üblicherweise vor jedem
// User-Move, der den Brett-Zustand verändert.
//
// ADR-0003: commit speichert das (before, after)-Paar, damit redo den
// ursprünglichen Nachher-Zustand exakt reproduziert (ohne Vertauschung).
//
// Cap auf 50 Einträge pro Stack: eine Killer-Sudoku-Session dauert 5–30
// Minuten, 50 Undo-Schritte reichen für jeden realistischen Fall. Mehr
// wäre Memory-Bloat ohne erkennbaren Nutzen.

import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 50;

export interface UndoRedoPair<T> {
  before: T;
  after: T;
}

export interface UseUndoRedoResult<T> {
  /** Kann undo() etwas rückgängig machen? */
  canUndo: boolean;
  /** Kann redo() etwas wiederherstellen? */
  canRedo: boolean;
  /** (before, after)-Paar auf den Past-Stack. Idempotent, wenn bereits das letzte Paar identisch ist. */
  commit: (pair: UndoRedoPair<T>) => void;
  /** Einen Schritt zurück. Liefert den Vorher-Zustand (before). */
  undo: () => T | null;
  /** Einen Schritt vor. Liefert den Nachher-Zustand (after). */
  redo: () => T | null;
  /** Past + Future leeren (z. B. nach Reset oder Levelwechsel). */
  reset: () => void;
  /** Tiefe der Stacks (für UI/Debug). */
  pastDepth: number;
  futureDepth: number;
}

function pairEquals<T>(a: UndoRedoPair<T>, b: UndoRedoPair<T>): boolean {
  return a.before === b.before && a.after === b.after;
}

export function useUndoRedo<T>(): UseUndoRedoResult<T> {
  const [past, setPast] = useState<UndoRedoPair<T>[]>([]);
  const [future, setFuture] = useState<UndoRedoPair<T>[]>([]);

  // Refs, damit commit/undo/redo den jeweils aktuellen Stand sehen, ohne
  // durch stale-Closures bei React-StrictMode-Doppeleffekt reinzulaufen.
  const pastRef = useRef<UndoRedoPair<T>[]>([]);
  const futureRef = useRef<UndoRedoPair<T>[]>([]);
  pastRef.current = past;
  futureRef.current = future;

  const commit = useCallback((pair: UndoRedoPair<T>) => {
    const currentPast = pastRef.current;
    // Identische Paare nicht doppelt pushen (No-Ops füllen sonst den Stack).
    if (currentPast.length > 0 && pairEquals(currentPast[currentPast.length - 1], pair)) return;

    const next = [...currentPast, pair];
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
    // Vorher-Zustand ist das, was der Aufrufer anwendet. Das vollständige
    // Paar bleibt für Redo erhalten, damit auch ein folgendes Undo wieder
    // denselben Vorher-Zustand kennt (ADR-0003).
    futureRef.current = [...currentFuture, last];
    setFuture((f) => [...f, last]);
    return last.before;
  }, []);

  const redo = useCallback((): T | null => {
    const currentPast = pastRef.current;
    const currentFuture = futureRef.current;
    if (currentFuture.length === 0) return null;
    const pair = currentFuture[currentFuture.length - 1];
    const nextFuture = currentFuture.slice(0, -1);
    futureRef.current = nextFuture;
    setFuture(nextFuture);
    pastRef.current = [...currentPast, pair];
    setPast((p) => [...p, pair]);
    return pair.after;
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
