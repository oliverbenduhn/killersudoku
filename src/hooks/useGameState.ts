import { useState, useEffect, useRef, useCallback } from 'react';
import { loadGameState, enqueueGameStateSave, acquireGameSession } from '../services/storageService';
import { GameState as GlobalGameState, GameLevel } from '../types/gameTypes';
import { loadLevelByNumber } from '../services/levelService';
import { createEmptyBoard } from '../services/puzzleGeneratorService';
import { sanitizePlayerBoard, createEmptyNotes, normalizeNotes, isBoardComplete } from '../services/gameLogicService';
import { useUndoRedo } from './useUndoRedo';

interface GameState extends GlobalGameState {
  startTime: number;
  elapsedTime: number;
  hintsUsed: number;
  mistakesUsed: number;
  gameOver: boolean;
}

type BoardSnapshot = Pick<GameState, 'cellValues' | 'notes'>;

export const useGameState = (puzzleId: string, size: number = 9, providedLevel?: GameLevel | null) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const gameStateRef = useRef<GameState | null>(null);
  const currentPuzzleIdRef = useRef(puzzleId);
  const lastAutoSaveRef = useRef(0);
  const sessionActiveRef = useRef(false);
  const sessionLeaseRef = useRef<Promise<(() => Promise<void>) | null>>(Promise.resolve(null));
  const undo = useUndoRedo<BoardSnapshot>();
  const resetHistory = undo.reset;

  const persist = useCallback(async (state: GameState) => {
    if (!sessionActiveRef.current || state.levelId !== currentPuzzleIdRef.current) return;
    const targetId = currentPuzzleIdRef.current;
    lastAutoSaveRef.current = Date.now();
    try {
      await enqueueGameStateSave(targetId, state);
      if (sessionActiveRef.current && gameStateRef.current === state) setStorageError(null);
    } catch (error) {
      console.error('Spielstand konnte nicht gespeichert werden:', error);
      if (sessionActiveRef.current && currentPuzzleIdRef.current === targetId) {
        setStorageError('Dein Spielstand konnte nicht gespeichert werden. Lass dieses Fenster geöffnet und versuche es erneut.');
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Wait for this hook's previous lease to fully release, including StrictMode cleanup.
    // A previous load already surfaced acquisition failures; retries need a fresh lease.
    const lease = sessionLeaseRef.current.catch(() => null).then(async previous => {
      await previous?.();
      return cancelled || providedLevel === null ? null : acquireGameSession(puzzleId);
    });
    sessionLeaseRef.current = lease;
    currentPuzzleIdRef.current = puzzleId;
    sessionActiveRef.current = false;
    gameStateRef.current = null;
    setGameState(null);
    setIsLoading(true);
    setLoadError(null);
    setStorageError(null);
    resetHistory();

    const loadState = async () => {
      try {
        const release = await lease;
        if (cancelled) { await release?.(); return; }
        if (!release) {
          setLoadError('Dieses Rätsel ist bereits in einem anderen Fenster geöffnet. Schließe es dort und versuche es erneut.');
          return;
        }
        const savedState = await loadGameState(puzzleId);
        const levelMatch = /^level-(\d+)$/.exec(puzzleId);
        const level = providedLevel ?? (levelMatch ? await loadLevelByNumber(Number(levelMatch[1])) : null);
        if (cancelled) return;
        const saved: Record<string, unknown> = savedState && typeof savedState === 'object'
          ? savedState as Record<string, unknown> : {};
        const initialValues = level?.initialValues ?? createEmptyBoard(size);
        const rawValues = Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => {
          const value: unknown = Array.isArray(saved.cellValues) && Array.isArray(saved.cellValues[row])
            ? saved.cellValues[row][col] : 0;
          return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 9 ? value : 0;
        }));
        const cellValues = level ? sanitizePlayerBoard(rawValues, initialValues, level.cages, size) : rawValues;
        const boundedNumber = (value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER) =>
          typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(max, Math.floor(value)) : fallback;
        const hintsUsed = boundedNumber(saved.hintsUsed, 0, 3);
        const mistakesUsed = boundedNumber(saved.mistakesUsed, 0, 3);
        const solved = level ? isBoardComplete(cellValues, level.cages, size) : false;
        const restored: GameState = {
          id: typeof saved.id === 'string' && saved.id ? saved.id : `game_${puzzleId}_${Date.now()}`,
          cellValues,
          notes: normalizeNotes(saved.notes, cellValues, initialValues, size),
          startTime: boundedNumber(saved.startTime, Date.now(), Date.now()),
          elapsedTime: boundedNumber(saved.elapsedTime, 0),
          hintsUsed,
          mistakesUsed,
          gameOver: !solved && mistakesUsed >= 3,
          solved,
          statisticsRecorded: solved && saved.statisticsRecorded === true,
          difficulty: level?.difficulty,
          levelId: puzzleId,
          ...(solved ? { endTime: boundedNumber(saved.endTime, Date.now(), Date.now()) } : {})
        };
        gameStateRef.current = restored;
        sessionActiveRef.current = true;
        setGameState(restored);
        if (savedState) await persist(restored);
      } catch (error) {
        console.error('Spielstand konnte nicht geladen werden:', error);
        if (!cancelled) setLoadError(!navigator.locks
          ? 'Dieser Browser kann den Spielstand nicht sicher speichern. Öffne die App über HTTPS in einem aktuellen Browser.'
          : 'Dein Spielstand konnte nicht geladen werden. Bitte versuche es erneut. Es wurde nichts überschrieben.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    if (providedLevel !== null) void loadState();
    return () => {
      cancelled = true;
      sessionActiveRef.current = false;
      // Acquisition failures are reported by loadState; cleanup has no user action.
      void lease.then(release => release?.(), () => undefined);
    };
  }, [puzzleId, size, providedLevel, loadAttempt, persist, resetHistory]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const current = gameStateRef.current;
      if (!sessionActiveRef.current || !current || current.solved || current.gameOver) return;
      const elapsedTime = Math.max(0, Date.now() - current.startTime);
      if (elapsedTime === current.elapsedTime) return;
      const updated = { ...current, elapsedTime };
      gameStateRef.current = updated;
      setGameState(updated);
      if (Date.now() - lastAutoSaveRef.current >= 15000) void persist(updated);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [persist]);

  const updateGameState = useCallback(async (patch: Partial<GameState>, expectedGameId?: string) => {
    const current = gameStateRef.current;
    if (!sessionActiveRef.current || !current || current.levelId !== puzzleId || (expectedGameId && current.id !== expectedGameId)) return;
    const updated = { ...current, ...patch };
    gameStateRef.current = updated;
    setGameState(updated);
    await persist(updated);
  }, [persist, puzzleId]);

  const applyMove = useCallback(async (patch: Partial<GameState>) => {
    const current = gameStateRef.current;
    if (!current || current.solved || current.gameOver || current.levelId !== puzzleId) return;
    const after = { ...current, ...patch };
    undo.commit({ before: { cellValues: current.cellValues, notes: current.notes }, after: { cellValues: after.cellValues, notes: after.notes } });
    await updateGameState(patch);
  }, [puzzleId, undo.commit, updateGameState]);

  const performUndo = useCallback(async () => {
    const current = gameStateRef.current;
    if (!current || current.solved || current.gameOver || current.levelId !== puzzleId) return;
    const previous = undo.undo();
    if (previous) await updateGameState(previous);
  }, [puzzleId, undo.undo, updateGameState]);

  const performRedo = useCallback(async () => {
    const current = gameStateRef.current;
    if (!current || current.solved || current.gameOver || current.levelId !== puzzleId) return;
    const next = undo.redo();
    if (next) await updateGameState(next);
  }, [puzzleId, undo.redo, updateGameState]);

  return {
    gameState, isLoading, loadError, storageError,
    retryLoad: () => setLoadAttempt(attempt => attempt + 1),
    retrySave: () => { if (gameStateRef.current) void persist(gameStateRef.current); },
    updateGameState, applyMove,
    undo: performUndo, redo: performRedo,
    canUndo: undo.canUndo && !gameState?.solved && !gameState?.gameOver,
    canRedo: undo.canRedo && !gameState?.solved && !gameState?.gameOver,
    clearHistory: resetHistory,
  };
};

export default useGameState;
