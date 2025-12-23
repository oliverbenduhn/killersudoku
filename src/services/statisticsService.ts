import localforage from 'localforage';

const STORAGE_PREFIX = process.env.REACT_APP_STORAGE_PREFIX || 'killersudoku_';
const STATS_KEY = `${STORAGE_PREFIX}stats`;

export interface GameStatistics {
  totalSolved: number;
  totalTimeMs: number;
  solvedByDifficulty: Record<string, number>;
  bestTimeMsByDifficulty: Record<string, number>;
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
  const normalizedElapsed = Math.max(0, Math.floor(elapsedMs));

  const updatedStats: GameStatistics = {
    ...stats,
    totalSolved: stats.totalSolved + 1,
    totalTimeMs: stats.totalTimeMs + normalizedElapsed,
    solvedByDifficulty: {
      ...stats.solvedByDifficulty,
      [difficultyKey]: (stats.solvedByDifficulty[difficultyKey] || 0) + 1
    },
    bestTimeMsByDifficulty: {
      ...stats.bestTimeMsByDifficulty,
      [difficultyKey]:
        stats.bestTimeMsByDifficulty[difficultyKey] &&
        stats.bestTimeMsByDifficulty[difficultyKey] <= normalizedElapsed
          ? stats.bestTimeMsByDifficulty[difficultyKey]
          : normalizedElapsed
    },
    lastSolvedAt: Date.now()
  };

  await saveStatistics(updatedStats);
  return updatedStats;
};

