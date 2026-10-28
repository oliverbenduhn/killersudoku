import localforage from 'localforage';
import { STORAGE_PREFIX } from '../config';
import type { Difficulty } from '../types/gameTypes';
import { runStorageOperation } from './storageService';
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
  const stored: unknown = await localforage.getItem(STATS_KEY);
  if (!stored || typeof stored !== 'object') return { ...defaultStats, solvedByDifficulty: {}, bestTimeMsByDifficulty: {} };
  const record = stored as Record<string, unknown>;
  const nonnegative = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
  const normalizeTimes = (value: unknown): Partial<Record<Difficulty, number>> => {
    if (!value || typeof value !== 'object') return {};
    const result: Partial<Record<Difficulty, number>> = {};
    for (const difficulty of ['easy', 'medium', 'hard', 'expert', 'unknown'] as const) {
      const number = (value as Record<string, unknown>)[difficulty];
      if (typeof number === 'number' && Number.isFinite(number) && number >= 0) result[difficulty] = number;
    }
    return result;
  };
  return {
    totalSolved: Math.floor(nonnegative(record.totalSolved)),
    totalTimeMs: nonnegative(record.totalTimeMs),
    solvedByDifficulty: normalizeTimes(record.solvedByDifficulty),
    bestTimeMsByDifficulty: normalizeTimes(record.bestTimeMsByDifficulty),
    ...(typeof record.lastSolvedAt === 'number' && Number.isFinite(record.lastSolvedAt)
      ? { lastSolvedAt: record.lastSolvedAt } : {}),
    ...(Array.isArray(record.solvedPuzzles)
      ? { solvedPuzzles: [...new Set(record.solvedPuzzles.filter((id): id is string => typeof id === 'string'))] } : {})
  };
};

export const saveStatistics = async (stats: GameStatistics): Promise<void> => {
  await runStorageOperation('stats', async () => { await localforage.setItem(STATS_KEY, stats); });
};

export const recordSolve = async (
  difficulty: string | undefined,
  elapsedMs: number,
  puzzleId?: string
): Promise<GameStatistics> => runStorageOperation('stats', async () => {
  const stats = await loadStatistics();
  // Idempotenz-Guard: derselbe Puzzle-ID wurde in dieser Statistik-Lifetime
  // bereits gezählt. Verhindert Doppel-Inkrement nach Undo einer gelösten
  // Lösung (Audit-Finding 🚨 #1).
  if (puzzleId && (stats.solvedPuzzles || []).includes(puzzleId)) {
    return stats;
  }
  const difficultyKey: Difficulty = ['easy', 'medium', 'hard', 'expert'].includes(difficulty ?? '')
    ? difficulty as Difficulty : 'unknown';
  // Keep legacy zero-duration completions finite and positive.
  const normalizedElapsed = Number.isFinite(elapsedMs) ? Math.max(1, Math.floor(elapsedMs)) : 1;

  const previousBest = stats.bestTimeMsByDifficulty[difficultyKey];
  const newBest =
    previousBest === undefined || previousBest > normalizedElapsed
      ? normalizedElapsed
      : previousBest;

  const prevSolved = stats.solvedByDifficulty[difficultyKey] ?? 0;

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

  await localforage.setItem(STATS_KEY, updatedStats);
  return updatedStats;
});
