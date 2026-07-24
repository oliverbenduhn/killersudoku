import { useState, useEffect, useRef } from 'react';
import { saveGameState, loadGameState } from '../services/storageService';
import { GameState as GlobalGameState, GameLevel } from '../types/gameTypes';
import { loadLevelByNumber } from '../services/levelService';
import { createEmptyBoard } from '../services/puzzleGeneratorService';
import { sanitizePlayerBoard, createEmptyNotes, normalizeNotes } from '../services/gameLogicService';
import { useUndoRedo } from './useUndoRedo';

// Lokale Erweiterung des GameState-Interfaces mit zusätzlichen Eigenschaften für den Hook
interface GameState extends GlobalGameState {
  startTime: number;
  elapsedTime: number;
  hintsUsed: number;
  mistakesUsed: number;
  gameOver: boolean;
}

export const useGameState = (puzzleId: string, size: number = 9) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Ref zum Verfolgen der letzten Speicheroperation
  const saveOperationRef = useRef<Promise<void>>(Promise.resolve());
  // Ref zum Verfolgen der aktuellen puzzleId
  const currentPuzzleIdRef = useRef<string>(puzzleId);
  const gameStateRef = useRef<GameState | null>(null);
  const lastAutoSaveRef = useRef<number>(0);

  // Undo/Redo über getrennten Mini-Hook. Stacks leben nur im RAM — bei
  // Reload ist die History leer (acceptable: Auto-Save speichert den
  // aktuellen Stand, nicht den Stack).
  const undo = useUndoRedo<GameState>();

  useEffect(() => {
    currentPuzzleIdRef.current = puzzleId;

    const loadState = async () => {
      try {
        setIsLoading(true);

        await saveOperationRef.current;

        const savedState = await loadGameState(puzzleId);

        if (savedState) {
          if (currentPuzzleIdRef.current === puzzleId) {
            const saved = savedState as Partial<GameState>;
            const savedCellValues = Array.isArray(saved.cellValues)
              ? saved.cellValues
              : createEmptyBoard(size);
            let restored = {
              ...saved,
              id: typeof saved.id === 'string' ? saved.id : `game_${puzzleId}_${Date.now()}`,
              cellValues: savedCellValues,
              notes: normalizeNotes(saved.notes, savedCellValues, createEmptyBoard(size), size),
              startTime: typeof saved.startTime === 'number' ? saved.startTime : Date.now(),
              elapsedTime: typeof saved.elapsedTime === 'number' ? saved.elapsedTime : 0,
              hintsUsed: typeof saved.hintsUsed === 'number' ? saved.hintsUsed : 0,
              mistakesUsed: typeof saved.mistakesUsed === 'number' ? saved.mistakesUsed : 0,
              gameOver: saved.gameOver === true,
              levelId: puzzleId
            };
            const levelMatch = puzzleId.match(/level-(\d+)/);
            if (levelMatch?.[1]) {
              try {
                const levelData = await loadLevelByNumber(parseInt(levelMatch[1], 10));
                const cellValues = sanitizePlayerBoard(
                  restored.cellValues,
                  levelData.initialValues,
                  levelData.cages,
                  size
                );
                const notes = normalizeNotes(
                  restored.notes,
                  cellValues,
                  levelData.initialValues,
                  size
                );
                restored = { ...restored, cellValues, notes };
              } catch (error) {
                console.error('Gespeicherter Spielstand konnte nicht validiert werden:', error);
              }
            }
            await saveGameState(puzzleId, restored);
            setGameState(restored);
          }
        } else {
          if (currentPuzzleIdRef.current === puzzleId) {
            const levelMatch = puzzleId.match(/level-(\d+)/);

            if (levelMatch && levelMatch[1]) {
              try {
                const levelNumber = parseInt(levelMatch[1], 10);
                const levelData = await loadLevelByNumber(levelNumber);

                if (levelData && levelData.initialValues) {
                  const newGameState: GameState = {
                    id: `game_${puzzleId}_${Date.now()}`,
                    cellValues: JSON.parse(JSON.stringify(levelData.initialValues)),
                    notes: createEmptyNotes(size),
                    startTime: Date.now(),
                    elapsedTime: 0,
                    difficulty: levelData.difficulty,
                    hintsUsed: 0,
                    mistakesUsed: 0,
                    gameOver: false,
                    levelId: puzzleId
                  };
                  setGameState(newGameState);
                } else {
                  createEmptyGameState();
                }
              } catch (error) {
                console.error('Fehler beim Laden der Level-Daten:', error);
                createEmptyGameState();
              }
            } else {
              createEmptyGameState();
            }
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden des Spielstands:', error);
        if (currentPuzzleIdRef.current === puzzleId) {
          createEmptyGameState();
        }
      } finally {
        if (currentPuzzleIdRef.current === puzzleId) {
          setIsLoading(false);
        }
      }
    };

    const createEmptyGameState = () => {
      const emptyState: GameState = {
        id: `game_${puzzleId}_${Date.now()}`,
        cellValues: createEmptyBoard(size),
        notes: createEmptyNotes(size),
        startTime: Date.now(),
        elapsedTime: 0,
        difficulty: undefined,
        hintsUsed: 0,
        mistakesUsed: 0,
        gameOver: false,
        levelId: puzzleId
      };
      setGameState(emptyState);
    };

    loadState();
    undo.reset();
  }, [puzzleId]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (!gameState || gameState.solved || gameState.gameOver) return;

    const tick = () => {
      const currentState = gameStateRef.current;
      if (!currentState) return;

      const now = Date.now();
      const startTime = currentState.startTime || now;
      const elapsedTime = Math.max(0, now - startTime);

      if (elapsedTime === currentState.elapsedTime) return;

      // Bugfix: Timer-Updates nur im lokalen State, kein direkter Save hier.
      // updateGameState() (für echte Eingaben) speichert ohnehin sofort.
      // Auto-Save für elapsedTime nur, wenn lange keine Eingabe erfolgte
      // (max. 1 Save/15s, um IndexedDB nicht zu fluten).
      const updatedState = {
        ...currentState,
        elapsedTime
      };
      gameStateRef.current = updatedState;
      setGameState(updatedState);

      if (now - lastAutoSaveRef.current >= 15000) {
        lastAutoSaveRef.current = now;
        const targetPuzzleId = currentPuzzleIdRef.current;
        saveOperationRef.current = (async () => {
          try {
            await saveOperationRef.current;
            if (targetPuzzleId === currentPuzzleIdRef.current) {
              await saveGameState(targetPuzzleId, updatedState);
            }
          } catch (error) {
            console.error('Fehler beim automatischen Speichern:', error);
          }
        })();
      }
    };

    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [gameState]);

  const updateGameState = async (newState: Partial<GameState>) => {
    if (!gameState) return;

    const updatedState = {
      ...gameState,
      ...newState
    };

    setGameState(updatedState);

    // Bugfix: Sofort persistieren statt auf den 15s-Timer zu warten.
    // Vorher konnten bis zu 15 Sekunden Spielverlust beim Tab-Close entstehen.
    const saveOperation = (async () => {
      try {
        const targetPuzzleId = currentPuzzleIdRef.current;
        await saveOperationRef.current;
        if (targetPuzzleId === currentPuzzleIdRef.current) {
          await saveGameState(targetPuzzleId, updatedState);
        }
      } catch (error) {
        console.error('Fehler beim Speichern des Spielstands:', error);
      }
    })();

    saveOperationRef.current = saveOperation;
    lastAutoSaveRef.current = Date.now();

    return saveOperation;
  };

  /**
   * Wendet einen User-Move an UND macht vorher einen Snapshot in die
   * Undo-History. Aufrufer, die echte Brett-Mutationen sind
   * (Zahleneingabe, Hinweis-Reveal), MÜSSEN dies statt updateGameState
   * nutzen. Aufrufer, die nur Metadaten ändern (Timer-Tick), bleiben bei
   * updateGameState.
   *
   * ADR-0003: commit speichert (before, after) als Paar, damit redo den
   * ursprünglichen Nachher-Zustand exakt reproduziert.
   */
  const applyMove = async (newState: Partial<GameState>) => {
    if (!gameState) return;
    // Snapshot vor der Mutation. Wenn gameStateRef.current veraltet ist
    // (React-StrictMode-Doppeleffekt), nutzen wir den State-Snapshot aus
    // gameStateRef als Fallback.
    const snapshotSource = gameStateRef.current ?? gameState;
    // Nachher-Zustand synchron materialisieren, damit der Redo-Stack
    // nach dem await den korrekten Wert hat (unabhängig von React-Batching).
    const afterState = { ...snapshotSource, ...newState };
    undo.commit({ before: snapshotSource, after: afterState });
    await updateGameState(newState);
  };

  /**
   * Macht den letzten Move rückgängig. Setzt den GameState auf den
   * vorherigen Snapshot zurück, persistiert, leert Redo-Logik intern.
   */
  const performUndo = async () => {
    const previous = undo.undo();
    if (!previous) return;
    setGameState(previous);
    const saveOperation = (async () => {
      try {
        const targetPuzzleId = currentPuzzleIdRef.current;
        await saveOperationRef.current;
        if (targetPuzzleId === currentPuzzleIdRef.current) {
          await saveGameState(targetPuzzleId, previous);
        }
      } catch (error) {
        console.error('Fehler beim Speichern nach Undo:', error);
      }
    })();
    saveOperationRef.current = saveOperation;
    lastAutoSaveRef.current = Date.now();
  };

  const performRedo = async () => {
    const next = undo.redo();
    if (!next) return;
    setGameState(next);
    const saveOperation = (async () => {
      try {
        const targetPuzzleId = currentPuzzleIdRef.current;
        await saveOperationRef.current;
        if (targetPuzzleId === currentPuzzleIdRef.current) {
          await saveGameState(targetPuzzleId, next);
        }
      } catch (error) {
        console.error('Fehler beim Speichern nach Redo:', error);
      }
    })();
    saveOperationRef.current = saveOperation;
    lastAutoSaveRef.current = Date.now();
  };

  return {
    gameState,
    isLoading,
    updateGameState,
    applyMove,
    undo: performUndo,
    redo: performRedo,
    canUndo: undo.canUndo,
    canRedo: undo.canRedo,
    clearHistory: undo.reset,
  };
};

export default useGameState;
