import { useState, useEffect } from 'react';
import { saveGameState, loadGameState } from '../services/storageService';

interface GameState {
  cellValues: number[][];
  startTime: number;
  elapsedTime: number;
  difficulty: string;
  hintsUsed: number;
}

export const useGameState = (puzzleId: string) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadState = async () => {
      try {
        const savedState = await loadGameState(puzzleId);
        if (savedState) {
          setGameState(savedState as GameState);
        } else {
          // Initialisiere einen neuen Spielstand
          setGameState({
            cellValues: Array(9).fill(null).map(() => Array(9).fill(0)),
            startTime: Date.now(),
            elapsedTime: 0,
            difficulty: 'normal',
            hintsUsed: 0
          });
        }
      } catch (error) {
        console.error('Fehler beim Laden des Spielstands:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadState();
  }, [puzzleId]);

  const updateGameState = async (newState: Partial<GameState>) => {
    if (!gameState) return;

    const updatedState = {
      ...gameState,
      ...newState
    };

    setGameState(updatedState);
    try {
      await saveGameState(puzzleId, updatedState);
    } catch (error) {
      console.error('Fehler beim Speichern des Spielstands:', error);
    }
  };

  return {
    gameState,
    isLoading,
    updateGameState
  };
};

export default useGameState;