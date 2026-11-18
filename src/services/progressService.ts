// Verfolgt pro Levelnummer, ob ein Level bereits gelöst oder nur
// angefangen wurde — unabhängig vom (asynchronen, localforage-basierten)
// Spielstand, damit die Levelübersicht synchron und ohne 100 Einzel-
// Ladevorgänge markieren kann. Bleibt außerdem erhalten, wenn Spielstände
// über clearAllGameStates() zurückgesetzt werden (siehe storageService.ts).

import { TOTAL_LEVELS } from './levelService';

const SOLVED_KEY = 'killersudoku_solved_levels';
const STARTED_KEY = 'killersudoku_started_levels';
const progressKey = (level: number) => `killersudoku_progress:${level}`;
const isLevel = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= TOTAL_LEVELS;

const readSet = (key: string): Set<number> => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter(isLevel) : []);
  } catch {
    return new Set();
  }
};

export const readProgress = () => {
  const solved = readSet(SOLVED_KEY);
  const started = readSet(STARTED_KEY);
  try {
    for (let level = 1; level <= TOTAL_LEVELS; level++) {
      const status = localStorage.getItem(progressKey(level));
      if (status === 'solved') solved.add(level);
      if (status === 'started') started.add(level);
    }
  } catch {
    // Progress markers are cosmetic; the game save has its own error UI.
  }
  for (const level of solved) started.delete(level);
  return { solved, started };
};

// Writers already hold the per-puzzle lease. Separate keys avoid a shared
// read-modify-write across puzzles; legacy sets are only read.
const markLevel = (level: number, status: 'started' | 'solved') => {
  if (!isLevel(level)) return;
  try {
    const key = progressKey(level);
    const current = localStorage.getItem(key);
    if (current === status || current === 'solved') return;
    if (status === 'started' && readSet(SOLVED_KEY).has(level)) return;
    localStorage.setItem(key, status);
  } catch {
    // Progress markers are cosmetic; the game save has its own error UI.
  }
};

export const markLevelSolved = (level: number): void => markLevel(level, 'solved');
export const markLevelStarted = (level: number): void => markLevel(level, 'started');

// Extrahiert die Levelnummer aus puzzleId-Strings wie "level-3". Generierte
// Zufallslevel ("generated-...") liefern null, da sie nicht Teil der
// nummerierten Levelliste sind und daher nicht markiert werden.
export const parseLevelNumber = (puzzleId?: string): number | null => {
  if (!puzzleId) return null;
  const match = /^level-(\d+)$/.exec(puzzleId);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
};
