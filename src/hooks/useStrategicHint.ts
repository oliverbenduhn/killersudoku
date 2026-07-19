// useStrategicHint — verbindet die hintEngine mit dem UI.
//
// Speichert den zuletzt angefragten Hint, sodass die UI ihn rendern kann
// (Toast, Sidebar-Highlight). Reine Funktion + State, kein Side-Effect
// auf gameState. Wer den Hint-Wert eintragen will, macht das separat.

import { useState, useCallback } from 'react';
import { CellPosition, Cage } from '../types/gameTypes';
import { findNextHint, Hint } from '../services/hintEngine';

export interface UseStrategicHintResult {
  /** Zuletzt angefragter Hint. null = noch nichts angefragt, oder Engine fand nichts. */
  currentHint: Hint | null;
  /** Berechnet einen neuen Hint aus dem aktuellen Brett-Zustand. */
  requestHint: (cellValues: number[][], cages: Cage[]) => Hint | null;
  /** Verwirft den angezeigten Hint (z. B. nach Toast-Timeout). */
  clearHint: () => void;
}

export function useStrategicHint(): UseStrategicHintResult {
  const [currentHint, setCurrentHint] = useState<Hint | null>(null);

  const requestHint = useCallback((cellValues: number[][], cages: Cage[]): Hint | null => {
    const hint = findNextHint(cellValues, cages);
    setCurrentHint(hint);
    return hint;
  }, []);

  const clearHint = useCallback(() => setCurrentHint(null), []);

  return { currentHint, requestHint, clearHint };
}
