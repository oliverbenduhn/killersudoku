import { useState, useRef, useEffect, useCallback } from 'react';
import { CellPosition } from '../types/gameTypes';

export interface UseCellAnimationResult {
  lastEnteredCell: CellPosition | null;
  lastEnteredValue: number;
  lastEnteredValid: boolean;
  animating: boolean;
  triggerAnimation: (cell: CellPosition, value: number, valid: boolean) => void;
  resetAnimation: () => void;
}

const ANIMATION_DURATION_MS = 500;

/**
 * Kapselt die Eingabe-Animation (Erfolg / Fehler / Shake).
 * Räumt den Timer beim Unmount auf, damit kein setState auf unmounted Component läuft.
 */
export const useCellAnimation = (): UseCellAnimationResult => {
  const [lastEnteredCell, setLastEnteredCell] = useState<CellPosition | null>(null);
  const [lastEnteredValue, setLastEnteredValue] = useState<number>(0);
  const [lastEnteredValid, setLastEnteredValid] = useState<boolean>(true);
  const [animating, setAnimating] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const triggerAnimation = useCallback((cell: CellPosition, value: number, valid: boolean) => {
    setLastEnteredCell(cell);
    setLastEnteredValue(value);
    setLastEnteredValid(valid);
    setAnimating(true);

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setAnimating(false);
      timerRef.current = null;
    }, ANIMATION_DURATION_MS);
  }, []);

  const resetAnimation = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setLastEnteredCell(null);
    setLastEnteredValue(0);
    setLastEnteredValid(true);
    setAnimating(false);
  }, []);

  return {
    lastEnteredCell,
    lastEnteredValue,
    lastEnteredValid,
    animating,
    triggerAnimation,
    resetAnimation
  };
};

export default useCellAnimation;