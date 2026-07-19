import localforage from 'localforage';
import { STORAGE_PREFIX } from '../config';
const STATS_KEY = `${STORAGE_PREFIX}stats`;

// Bugfix: Type-Safety für Schwierigkeitsstufen.
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'unknown';

export interface GameStatistics {
  totalSolved: number;
  totalTimeMs: number;
  solvedByDifficulty: Partial<Record<Difficulty, number>>;
  bestTimeMsByDifficulty: Partial<Record<Difficulty, number>>;
  lastSolvedAt?: number;
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
  elapsedMs: number
): Promise<GameStatistics> => {
  const stats = await loadStatistics();
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
    lastSolvedAt: Date.now()
  };

  await saveStatistics(updatedStats);
  return updatedStats;
};

