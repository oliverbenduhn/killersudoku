// Verfolgt pro Levelnummer, ob ein Level bereits gelöst oder nur
// angefangen wurde — unabhängig vom (asynchronen, localforage-basierten)
// Spielstand, damit die Levelübersicht synchron und ohne 100 Einzel-
// Ladevorgänge markieren kann. Bleibt außerdem erhalten, wenn Spielstände
// über clearAllGameStates() zurückgesetzt werden (siehe storageService.ts).

const SOLVED_KEY = 'killersudoku_solved_levels';
const STARTED_KEY = 'killersudoku_started_levels';

const readSet = (key: string): Set<number> => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : []);
  } catch {
    return new Set();
  }
};

const writeSet = (key: string, values: Set<number>) => {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(values)));
  } catch {
    // localStorage kann in Private-Mode/Quota-Fällen fehlschlagen — Markierung
    // ist rein kosmetisch, ein stiller Fehlschlag ist unkritisch.
  }
};

export const getSolvedLevels = (): Set<number> => readSet(SOLVED_KEY);
export const getStartedLevels = (): Set<number> => readSet(STARTED_KEY);

export const markLevelSolved = (level: number): void => {
  const solved = readSet(SOLVED_KEY);
  if (!solved.has(level)) {
    solved.add(level);
    writeSet(SOLVED_KEY, solved);
  }
  const started = readSet(STARTED_KEY);
  if (started.has(level)) {
    started.delete(level);
    writeSet(STARTED_KEY, started);
  }
};

export const markLevelStarted = (level: number): void => {
  const solved = readSet(SOLVED_KEY);
  if (solved.has(level)) return;
  const started = readSet(STARTED_KEY);
  if (!started.has(level)) {
    started.add(level);
    writeSet(STARTED_KEY, started);
  }
};

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
