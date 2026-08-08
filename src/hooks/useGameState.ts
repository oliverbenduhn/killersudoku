import { useState, useEffect, useRef } from 'react';
import { loadGameState, enqueueGameStateSave } from '../services/storageService';
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
  // Ref, damit der Hydration-Effect den aktuellen puzzleId mit dem
  // asynchronen Lade-Pfad abgleichen kann (Race-Bedingung beim schnellen
  // Levelwechsel).
  const currentPuzzleIdRef = useRef<string>(puzzleId);
  const gameStateRef = useRef<GameState | null>(null);
  const lastAutoSaveRef = useRef<number>(0);

  // Undo/Redo über getrennten Mini-Hook. Stacks leben nur im RAM — bei
  // Reload ist die History leer (acceptable: Auto-Save speichert den
  // aktuellen Stand, nicht den Stack).
  const undo = useUndoRedo<GameState>();

  // 🟠 Audit #21: cancelled-Flag im Effect-Return, damit der StrictMode-
  // Doppeleffekt den zweiten Mount nicht in die loadState-Pipeline lässt.
  // Z.81-Aufruf von enqueueGameStateSave liegt INNERHALB des if-Blocks
  // mit currentPuzzleIdRef.current === puzzleId — der bildet die Race-
  // Wache für die await-Grenze; jetzt zusätzlich cancelled-Wache für
  // den StrictMode-ReMount während der await-Phase.
  useEffect(() => {
    currentPuzzleIdRef.current = puzzleId;
    let cancelled = false;

    const loadState = async () => {
      try {
        setIsLoading(true);

        const savedState = await loadGameState(puzzleId);

        if (cancelled) return;

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
                if (cancelled) return;
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
            if (cancelled) return;
            enqueueGameStateSave(puzzleId, restored);
            setGameState(restored);
          }
        } else {
          if (currentPuzzleIdRef.current === puzzleId) {
            const levelMatch = puzzleId.match(/level-(\d+)/);

            if (levelMatch && levelMatch[1]) {
              try {
                const levelNumber = parseInt(levelMatch[1], 10);
                const levelData = await loadLevelByNumber(levelNumber);
                if (cancelled) return;

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
        if (!cancelled && currentPuzzleIdRef.current === puzzleId) {
          createEmptyGameState();
        }
      } finally {
        if (!cancelled && currentPuzzleIdRef.current === puzzleId) {
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

    return () => {
      cancelled = true;
    };
  }, [puzzleId]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // 🟠 Audit #19: Timer-Effect auf []-Dep umgestellt. Vorher [gameState]
  // → Cleanup + Rebuild jede Sekunde (Timer ruft selbst setGameState).
  // Jetzt: Interval einmal beim Mount, jeder Tick liest den aktuellen
  // Stand aus gameStateRef (synchron, kein Stale-Closure). Stop-Bedingung
  // (solved / gameOver / null) wird im tick selbst geprüft, damit der
  // Interval bei Game-Ende sauber via clearInterval beendet wird.
  useEffect(() => {
    const interval = window.setInterval(() => {
      const currentState = gameStateRef.current;
      if (!currentState || currentState.solved || currentState.gameOver) {
        window.clearInterval(interval);
        return;
      }

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
        enqueueGameStateSave(targetPuzzleId, updatedState);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const updateGameState = async (newState: Partial<GameState>) => {
    if (!gameState) return;

    const updatedState = {
      ...gameState,
      ...newState
    };

    setGameState(updatedState);

    // Bugfix: Sofort persistieren statt auf den 15s-Timer zu warten.
    // Vorher konnten bis zu 15 Sekunden Spielverlust beim Tab-Close entstehen.
    lastAutoSaveRef.current = Date.now();
    return enqueueGameStateSave(currentPuzzleIdRef.current, updatedState);
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
    lastAutoSaveRef.current = Date.now();
    enqueueGameStateSave(currentPuzzleIdRef.current, previous);
  };

  const performRedo = async () => {
    const next = undo.redo();
    if (!next) return;
    setGameState(next);
    lastAutoSaveRef.current = Date.now();
    enqueueGameStateSave(currentPuzzleIdRef.current, next);
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
