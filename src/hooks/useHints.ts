import { useState, useEffect, useCallback } from 'react';
import { CellPosition, Cage, GameState } from '../types/gameTypes';
import { getPossibleValues } from '../services/gameLogicService';

export interface UseHintsResult {
  showHints: boolean;
  possibleValues: number[];
  toggleHints: () => void;
  /** Vom Hint-System berechnete mögliche Werte, mit Flag für ungültigen aktuellen Wert. */
  refreshHints: (cell: CellPosition, gameState: GameState, cages: Cage[], size: number) => void;
}

/**
 * Verwaltet das Hint-System: An/Aus-Schalter + Liste der möglichen Werte.
 *
 * Hinweise werden via F5 oder einen externen Trigger aktiviert.
 * Die eigentliche Berechnung passiert in `getPossibleValues` (gameLogicService).
 */
export const useHints = (): UseHintsResult => {
  const [showHints, setShowHints] = useState(false);
  const [possibleValues, setPossibleValues] = useState<number[]>([]);

  const refreshHints = useCallback(
    (cell: CellPosition, gameState: GameState, cages: Cage[], size: number) => {
      const result = getPossibleValues(
        gameState.cellValues,
        cell.row,
        cell.col,
        cages,
        size
      );
      setPossibleValues(Array.isArray(result) ? result : result.values);
    },
    []
  );

  useEffect(() => {
    if (!showHints) {
      setPossibleValues([]);
    }
  }, [showHints]);

  const toggleHints = useCallback(() => {
    setShowHints(prev => !prev);
  }, []);

  return {
    showHints,
    possibleValues,
    toggleHints,
    refreshHints
  };
};

export default useHints;