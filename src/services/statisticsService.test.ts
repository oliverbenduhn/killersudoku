import { loadStatistics, recordSolve, saveStatistics } from './statisticsService';

// localforage muss vor jedem Test zurückgesetzt werden, weil Tests sonst
// sich gegenseitig beeinflussen.
const resetStore = async () => {
  const localforage = require('localforage').default;
  await localforage.clear();
};

describe('statisticsService', () => {
  beforeEach(async () => {
    await resetStore();
  });

  test('loadStatistics liefert Default-Werte bei leerem Store', async () => {
    const stats = await loadStatistics();
    expect(stats.totalSolved).toBe(0);
    expect(stats.totalTimeMs).toBe(0);
    expect(stats.solvedByDifficulty).toEqual({});
    expect(stats.bestTimeMsByDifficulty).toEqual({});
  });

  test('recordSolve zählt einen Solve', async () => {
    const updated = await recordSolve('medium', 5000);
    expect(updated.totalSolved).toBe(1);
    expect(updated.totalTimeMs).toBe(5000);
    expect(updated.solvedByDifficulty.medium).toBe(1);
    expect(updated.bestTimeMsByDifficulty.medium).toBe(5000);
  });

  test('recordSolve aktualisiert Bestzeit nur wenn neue Zeit besser ist', async () => {
    await recordSolve('hard', 10000);
    await recordSolve('hard', 8000);
    await recordSolve('hard', 12000);

    const stats = await loadStatistics();
    expect(stats.bestTimeMsByDifficulty.hard).toBe(8000);
    expect(stats.totalSolved).toBe(3);
  });

  test('recordSolve akzeptiert undefined als "unknown"', async () => {
    const updated = await recordSolve(undefined, 1000);
    expect(updated.solvedByDifficulty.unknown).toBe(1);
  });

  test('recordSolve verhindert 0ms-Bestzeit (Bugfix)', async () => {
    const updated = await recordSolve('expert', 0);
    expect(updated.bestTimeMsByDifficulty.expert).toBe(1);
  });

  test('recordSolve setzt lastSolvedAt', async () => {
    const before = Date.now();
    const updated = await recordSolve('easy', 2000);
    expect(updated.lastSolvedAt).toBeGreaterThanOrEqual(before);
  });

  test('saveStatistics/loadStatistics round-trip', async () => {
    const data = {
      totalSolved: 5,
      totalTimeMs: 30000,
      solvedByDifficulty: { medium: 3, hard: 2 },
      bestTimeMsByDifficulty: { medium: 4000, hard: 9000 },
      lastSolvedAt: 12345
    };
    await saveStatistics(data);
    const loaded = await loadStatistics();
    expect(loaded).toEqual(data);
  });
});