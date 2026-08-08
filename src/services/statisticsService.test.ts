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

  // Audit 🚨 #1: Doppel-Inkrement nach Undo einer gelösten Lösung
  test('recordSolve mit gleichem puzzleId zählt nicht doppelt (Undo-Repro)', async () => {
    await recordSolve('medium', 5000, 'level-1');
    // Repro: Solve wird nach Undo nochmal aufgenommen
    const afterUndo = await recordSolve('medium', 5000, 'level-1');

    expect(afterUndo.totalSolved).toBe(1);
    expect(afterUndo.solvedByDifficulty.medium).toBe(1);
    expect(afterUndo.solvedPuzzles).toEqual(['level-1']);

    // Unterschiedliche Puzzles zählen weiterhin normal
    const afterSecondLevel = await recordSolve('medium', 4000, 'level-2');
    expect(afterSecondLevel.totalSolved).toBe(2);
    expect(afterSecondLevel.solvedPuzzles).toEqual(['level-1', 'level-2']);
  });

  test('recordSolve ohne puzzleId verhält sich legacy (immer inkrementieren)', async () => {
    await recordSolve('medium', 5000);
    // Ohne puzzleId keine Idempotenz — alte Aufrufer (z. B. Solver-Hint) dürfen weiter inkrementieren.
    const second = await recordSolve('medium', 5000);
    expect(second.totalSolved).toBe(2);
  });
});