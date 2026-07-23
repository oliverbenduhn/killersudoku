import { useCallback } from 'react';
import { CellPosition, Cage, GameLevel, GameState } from '../types/gameTypes';
import * as GameLogic from '../services/gameLogicService';
import { createEmptyBoard } from '../services/puzzleGeneratorService';
import { recordSolve } from '../services/statisticsService';
import { UseCellAnimationResult } from './useCellAnimation';

export interface UseBoardGameLogicOptions {
  gameState: GameState | null;
  levelData: GameLevel | null;
  cages: Cage[];
  selectedCells: CellPosition[];
  size: number;
  maxHints: number;
  maxMistakes: number;
  isGameOver: boolean;
  updateGameState: (newState: Partial<GameState>) => Promise<void>;
  applyMove: (newState: Partial<GameState>) => Promise<void>;
  clearHistory: () => void;
  resetSelection: () => void;
  animation: UseCellAnimationResult;
  onGameOver: () => void;
  onSolveRecorded: (puzzleId: string) => void;
  showError: (msg: { title: string; description: string; status?: string; duration?: number }) => void;
}

export interface UseBoardGameLogicResult {
  handleNumberSelect: (number: number) => void;
  handleClear: () => void;
  handleReset: () => void;
  handleRevealHint: () => void;
  isCageComplete: (cage: Cage) => boolean;
  isBoardComplete: () => boolean;
}

/**
 * Reine Spiellogik-Operationen für das Board.
 * Komplett frei von DOM-Rendering und Keyboard-Events.
 */
export const useBoardGameLogic = ({
  gameState,
  levelData,
  cages,
  selectedCells,
  size,
  maxHints,
  maxMistakes,
  isGameOver,
  updateGameState,
  applyMove,
  clearHistory,
  resetSelection,
  animation,
  onGameOver,
  onSolveRecorded,
  showError
}: UseBoardGameLogicOptions): UseBoardGameLogicResult => {
  const handleNumberSelect = useCallback(
    (number: number) => {
      if (!gameState || !levelData) return;

      if (isGameOver) {
        showError({
          title: 'Game Over',
          description: 'Du hast das Fehlerlimit erreicht. Bitte starte neu.',
          status: 'error',
          duration: 2500
        });
        return;
      }

      const entry = GameLogic.applyPlayerEntry(
        gameState.cellValues,
        levelData.initialValues,
        selectedCells,
        number,
        cages,
        size
      );
      const anyInvalid = entry.rejectedCells.length > 0;
      const lastCell = anyInvalid
        ? entry.rejectedCells[entry.rejectedCells.length - 1]
        : entry.acceptedCells[entry.acceptedCells.length - 1] ?? null;
      const lastValid = !anyInvalid;

      if (!lastCell) return;

      // Maximal 1 Fehler pro Eingabe-Aktion
      const previousMistakes = gameState.mistakesUsed || 0;
      const updatedMistakes = anyInvalid
        ? Math.min(maxMistakes, previousMistakes + 1)
        : previousMistakes;
      const gameOverNow = updatedMistakes >= maxMistakes;

      applyMove({
        cellValues: entry.cellValues,
        mistakesUsed: updatedMistakes,
        gameOver: gameOverNow
      });

      animation.triggerAnimation(lastCell, number, lastValid);

      if (!isGameOver && gameOverNow) {
        onGameOver();
      }
    },
    [gameState, levelData, cages, selectedCells, size, maxMistakes, isGameOver, applyMove, animation, onGameOver, showError]
  );

  const handleClear = useCallback(() => {
    if (!gameState || !levelData) return;

    if (isGameOver) {
      showError({
        title: 'Game Over',
        description: 'Du kannst keine Änderungen mehr machen.',
        status: 'info',
        duration: 2000
      });
      return;
    }

    const newValues = gameState.cellValues.map(row => [...row]);
    selectedCells.forEach(({ row, col }) => {
      if (levelData.initialValues[row][col] === 0) {
        newValues[row][col] = 0;
      }
    });

    applyMove({ cellValues: newValues });
  }, [gameState, levelData, selectedCells, isGameOver, applyMove, showError]);

  const handleReset = useCallback(() => {
    if (!gameState || !levelData) return;

    // Direkt mit den initialValues neu starten (vermeidet useEffect-Loop)
    const initialValuesCopy = JSON.parse(JSON.stringify(levelData.initialValues));
    updateGameState({
      cellValues: initialValuesCopy,
      mistakesUsed: 0,
      hintsUsed: 0,
      solved: false,
      gameOver: false,
      endTime: undefined,
      startTime: Date.now(),
      elapsedTime: 0
    });

    resetSelection();
    animation.resetAnimation();
    onSolveRecorded(''); // solveRecordedRef zurücksetzen
    clearHistory(); // Reset verwirft die Undo-History, sonst könnte
                    // der User nach Reset auf „Undo" drücken und wäre
                    // wieder vor dem Reset.
  }, [gameState, levelData, updateGameState, resetSelection, animation, onSolveRecorded, clearHistory]);

  const handleRevealHint = useCallback(() => {
    if (!gameState || !levelData) return;

    if (isGameOver) {
      showError({
        title: 'Game Over',
        description: 'Hinweise sind nach Game Over nicht verfügbar.',
        status: 'info',
        duration: 2500
      });
      return;
    }

    const hintsUsed = gameState.hintsUsed || 0;
    if (hintsUsed >= maxHints) {
      showError({
        title: 'Hinweise aufgebraucht',
        description: `Du hast bereits alle ${maxHints} Hinweise genutzt.`,
        status: 'info',
        duration: 3000
      });
      return;
    }

    if (!levelData.solution) {
      showError({
        title: 'Kein Hinweis verfügbar',
        description: 'Für dieses Level ist keine Lösung hinterlegt.',
        status: 'warning',
        duration: 3000
      });
      return;
    }

    // Zielzelle suchen: bevorzugt ausgewählte Zelle, sonst erste leere Zelle.
    let target: CellPosition | null = null;
    if (selectedCells.length > 0) {
      const first = selectedCells[0];
      if (levelData.initialValues[first.row][first.col] === 0) {
        const currentValue = gameState.cellValues[first.row][first.col];
        const solutionValue = levelData.solution[first.row]?.[first.col];
        if (solutionValue && currentValue !== solutionValue) {
          target = first;
        }
      }
    }
    if (!target) {
      for (let r = 0; r < size && !target; r++) {
        for (let c = 0; c < size && !target; c++) {
          if (levelData.initialValues[r][c] === 0) {
            const currentValue = gameState.cellValues[r][c];
            const solutionValue = levelData.solution[r]?.[c];
            if (solutionValue && currentValue !== solutionValue) {
              target = { row: r, col: c };
            }
          }
        }
      }
    }

    if (!target) {
      showError({
        title: 'Keine leere Zelle',
        description: 'Es gibt keine freien Zellen für einen Hinweis.',
        status: 'info',
        duration: 2500
      });
      return;
    }

    const correctValue = levelData.solution[target.row]?.[target.col];
    if (!correctValue) {
      showError({
        title: 'Hinweis fehlgeschlagen',
        description: 'Die Lösung enthält keinen Wert für diese Zelle.',
        status: 'error',
        duration: 3000
      });
      return;
    }

    const newValues = gameState.cellValues.map(row => [...row]);
    newValues[target.row][target.col] = correctValue;

    applyMove({
      cellValues: newValues,
      hintsUsed: hintsUsed + 1
    });

    const isValid = GameLogic.isCellValid(
      gameState.cellValues,
      target.row,
      target.col,
      correctValue,
      cages,
      size
    );
    animation.triggerAnimation(target, correctValue, isValid);
  }, [gameState, levelData, selectedCells, cages, size, maxHints, isGameOver, applyMove, animation, showError]);

  const isCageComplete = useCallback(
    (cage: Cage): boolean => {
      if (!gameState) return false;
      return GameLogic.isCageComplete(gameState.cellValues, cage);
    },
    [gameState]
  );

  const isBoardComplete = useCallback((): boolean => {
    if (!gameState) return false;
    return GameLogic.isBoardComplete(gameState.cellValues, cages, size);
  }, [gameState, cages, size]);

  return {
    handleNumberSelect,
    handleClear,
    handleReset,
    handleRevealHint,
    isCageComplete,
    isBoardComplete
  };
};

/** Hilfsfunktion für das Game-Over-Solve-Recording. */
export const recordBoardSolved = async (
  levelData: GameLevel,
  startTime: number,
  difficulty: string | undefined
): Promise<number> => {
  const finishedAt = Date.now();
  const elapsedMs = Math.max(0, finishedAt - startTime);
  await recordSolve(difficulty ?? levelData.difficulty, elapsedMs);
  return elapsedMs;
};

/** Hilfsfunktion: erstellt ein leeres Spielfeld. */
export const buildEmptyBoard = (size: number): number[][] => createEmptyBoard(size);

export default useBoardGameLogic;
