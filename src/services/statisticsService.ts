import localforage from 'localforage';
import { STORAGE_PREFIX } from '../config';
import type { Difficulty } from '../types/gameTypes';
const STATS_KEY = `${STORAGE_PREFIX}stats`;

export interface GameStatistics {
  totalSolved: number;
  totalTimeMs: number;
  solvedByDifficulty: Partial<Record<Difficulty, number>>;
  bestTimeMsByDifficulty: Partial<Record<Difficulty, number>>;
  lastSolvedAt?: number;
  /** Set von Puzzle-IDs, für die bereits ein Solve gezählt wurde. Verhindert
   *  Doppel-Inkrement, falls recordSolve für dasselbe Puzzle zweimal aufgerufen
   *  wird (Undo-Repro: Solve → Undo → Solve). Wird beim Lesen ohne diese Felder
   *  mit leerem Set initialisiert — alte Statistiken werden so behandelt, als
   *  hätte es nie eine zweite Aufzeichnung gegeben. */
  solvedPuzzles?: string[];
}

const defaultStats: GameStatistics = {
  totalSolved: 0,
  totalTimeMs: 0,
  solvedByDifficulty: {},
  bestTimeMsByDifficulty: {}
};

export const loadStatistics = async (): Promise<GameStatistics> => {
  const stored = await localforage.getItem<GameStatistics>(STATS_KEY);
  if (!stored) {
    return { ...defaultStats };
  }
  return {
    ...defaultStats,
    ...stored,
    solvedByDifficulty: stored.solvedByDifficulty || {},
    bestTimeMsByDifficulty: stored.bestTimeMsByDifficulty || {}
  };
};

export const saveStatistics = async (stats: GameStatistics): Promise<void> => {
  await localforage.setItem(STATS_KEY, stats);
};

export const recordSolve = async (
  difficulty: string | undefined,
  elapsedMs: number,
  puzzleId?: string
): Promise<GameStatistics> => {
  const stats = await loadStatistics();
  // Idempotenz-Guard: derselbe Puzzle-ID wurde in dieser Statistik-Lifetime
  // bereits gezählt. Verhindert Doppel-Inkrement nach Undo einer gelösten
  // Lösung (Audit-Finding 🚨 #1).
  if (puzzleId && (stats.solvedPuzzles || []).includes(puzzleId)) {
    return stats;
  }
  const difficultyKey = difficulty || 'unknown';
  // Bugfix: 0ms als Bestzeit verhindern (theoretisch möglich, aber unsinnig).
  // Echte Solver brauchen mindestens eine Sekunde.
  const normalizedElapsed = Math.max(1, Math.floor(elapsedMs));

  const previousBest = stats.bestTimeMsByDifficulty[difficultyKey as Difficulty];
  const newBest =
    previousBest === undefined || previousBest > normalizedElapsed
      ? normalizedElapsed
      : previousBest;

  const prevSolved = stats.solvedByDifficulty[difficultyKey as Difficulty] ?? 0;

  const updatedStats: GameStatistics = {
    ...stats,
    totalSolved: stats.totalSolved + 1,
    totalTimeMs: stats.totalTimeMs + normalizedElapsed,
    solvedByDifficulty: {
      ...stats.solvedByDifficulty,
      [difficultyKey]: prevSolved + 1
    },
    bestTimeMsByDifficulty: {
      ...stats.bestTimeMsByDifficulty,
      [difficultyKey]: newBest
    },
    lastSolvedAt: Date.now(),
    solvedPuzzles: puzzleId
      ? [...(stats.solvedPuzzles || []), puzzleId]
      : stats.solvedPuzzles
  };

  await saveStatistics(updatedStats);
  return updatedStats;
};

