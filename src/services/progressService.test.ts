// jsdom hat eine echte localStorage-Implementierung — kein Mock-Setup
// nötig. Wir putzen einfach vor jedem Test auf.

import {
  getSolvedLevels,
  getStartedLevels,
  markLevelSolved,
  markLevelStarted,
  parseLevelNumber,
} from './progressService';

const SOLVED_KEY = 'killersudoku_solved_levels';
const STARTED_KEY = 'killersudoku_started_levels';

const setJSON = (key: string, value: unknown) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

describe('progressService', () => {
  beforeEach(() => window.localStorage.clear());

  describe('parseLevelNumber', () => {
    test('undefined / leer → null', () => {
      expect(parseLevelNumber()).toBeNull();
      expect(parseLevelNumber('')).toBeNull();
    });

    test('„level-7" → 7', () => {
      expect(parseLevelNumber('level-7')).toBe(7);
    });

    test('„level-1" → 1 (Grenzfall)', () => {
      expect(parseLevelNumber('level-1')).toBe(1);
    });

    test('„level-0" → null (positiv erzwungen)', () => {
      expect(parseLevelNumber('level-0')).toBeNull();
    });

    test('„generated-xyz" → null', () => {
      expect(parseLevelNumber('generated-xyz')).toBeNull();
    });

    test('„level-abc" → null', () => {
      expect(parseLevelNumber('level-abc')).toBeNull();
    });

    test('„level--3" → null (Anker erzwingt Ziffern)', () => {
      expect(parseLevelNumber('level--3')).toBeNull();
    });

    test('„level-12.5" → null (Anker matcht nur rein ganzzahlige)', () => {
      expect(parseLevelNumber('level-12.5')).toBeNull();
    });
  });

  describe('getSolvedLevels / getStartedLevels', () => {
    test('leeres localStorage → leerer Set', () => {
      expect(getSolvedLevels().size).toBe(0);
      expect(getStartedLevels().size).toBe(0);
    });

    test('liest vorhandene Zahlen', () => {
      setJSON(SOLVED_KEY, [1, 2, 3]);
      expect(Array.from(getSolvedLevels())).toEqual([1, 2, 3]);
    });

    test('ignoriert Nicht-Zahlen im Array', () => {
      setJSON(SOLVED_KEY, [1, 'foo', 2, null, 3]);
      expect(Array.from(getSolvedLevels()).sort((a, b) => a - b)).toEqual([1, 2, 3]);
    });

    test('verwirft kaputtes JSON und liefert leeren Set', () => {
      window.localStorage.setItem(SOLVED_KEY, 'kein JSON');
      expect(getSolvedLevels().size).toBe(0);
    });

    test('verwirft Strukturen, die kein Array sind', () => {
      setJSON(SOLVED_KEY, { 1: true });
      expect(getSolvedLevels().size).toBe(0);
    });
  });

  describe('markLevelSolved', () => {
    test('fügt Level hinzu, wenn nicht vorhanden', () => {
      setJSON(STARTED_KEY, [5]);
      markLevelSolved(5);
      expect(JSON.parse(window.localStorage.getItem(SOLVED_KEY) ?? '[]')).toEqual([5]);
      expect(JSON.parse(window.localStorage.getItem(STARTED_KEY) ?? '[]')).toEqual([]);
    });

    test('idempotent: zweiter Aufruf schreibt solved nicht erneut', () => {
      setJSON(SOLVED_KEY, [5]);
      setJSON(STARTED_KEY, []);
      const solvedBefore = window.localStorage.getItem(SOLVED_KEY);
      markLevelSolved(5);
      expect(window.localStorage.getItem(SOLVED_KEY)).toBe(solvedBefore);
    });

    test('level aus started entfernen, wenn vorhanden', () => {
      setJSON(SOLVED_KEY, []);
      setJSON(STARTED_KEY, [3, 5, 7]);
      markLevelSolved(5);
      expect(JSON.parse(window.localStorage.getItem(STARTED_KEY) ?? '[]')).toEqual([3, 7]);
    });

    test('mehrere Markierungen sammeln sich aufsteigend', () => {
      markLevelSolved(2);
      markLevelSolved(5);
      markLevelSolved(1);
      expect(JSON.parse(window.localStorage.getItem(SOLVED_KEY) ?? '[]').sort((a: number, b: number) => a - b)).toEqual([1, 2, 5]);
    });
  });

  describe('markLevelStarted', () => {
    test('fügt Level hinzu, wenn weder solved noch started', () => {
      markLevelStarted(8);
      expect(JSON.parse(window.localStorage.getItem(STARTED_KEY) ?? '[]')).toEqual([8]);
    });

    test('solved-Level wird NICHT als started markiert', () => {
      setJSON(SOLVED_KEY, [4]);
      setJSON(STARTED_KEY, []);
      markLevelStarted(4);
      // 4 darf nicht in der started-Liste landen — die Liste bleibt leer.
      expect(JSON.parse(window.localStorage.getItem(STARTED_KEY) ?? '[]')).toEqual([]);
    });

    test('bereits started → kein erneuter Write', () => {
      setJSON(STARTED_KEY, [4]);
      markLevelStarted(4);
      expect(JSON.parse(window.localStorage.getItem(STARTED_KEY) ?? '[]')).toEqual([4]);
    });
  });

  describe('write-Fehler werden verschluckt', () => {
    test('QuotaExceededError in setItem → kein Throw', () => {
      const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      try {
        expect(() => markLevelSolved(9)).not.toThrow();
        expect(() => markLevelStarted(9)).not.toThrow();
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('read-Fehler werden verschluckt', () => {
    test('getItem-Wurf liefert leeren Set', () => {
      const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      try {
        expect(getSolvedLevels().size).toBe(0);
        expect(getStartedLevels().size).toBe(0);
      } finally {
        spy.mockRestore();
      }
    });
  });
});
