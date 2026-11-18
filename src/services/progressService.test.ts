// jsdom hat eine echte localStorage-Implementierung — kein Mock-Setup
// nötig. Wir putzen einfach vor jedem Test auf.

import {
  readProgress,
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
      expect(readProgress().solved.size).toBe(0);
      expect(readProgress().started.size).toBe(0);
    });

    test('liest vorhandene Zahlen', () => {
      setJSON(SOLVED_KEY, [1, 2, 3]);
      expect(Array.from(readProgress().solved)).toEqual([1, 2, 3]);
    });

    test('ignoriert Nicht-Zahlen im Array', () => {
      setJSON(SOLVED_KEY, [1, 'foo', 2, null, 3]);
      expect(Array.from(readProgress().solved).sort((a, b) => a - b)).toEqual([1, 2, 3]);
    });

    test('verwirft kaputtes JSON und liefert leeren Set', () => {
      window.localStorage.setItem(SOLVED_KEY, 'kein JSON');
      expect(readProgress().solved.size).toBe(0);
    });

    test('verwirft Strukturen, die kein Array sind', () => {
      setJSON(SOLVED_KEY, { 1: true });
      expect(readProgress().solved.size).toBe(0);
    });
  });

  test('preserves legacy markers and updates each level independently', () => {
    setJSON(SOLVED_KEY, [1]);
    setJSON(STARTED_KEY, [2, 3]);
    markLevelStarted(4);
    markLevelSolved(2);
    markLevelSolved(5);
    markLevelStarted(2);
    markLevelStarted(1);
    expect(readProgress()).toEqual({ solved: new Set([1, 2, 5]), started: new Set([3, 4]) });
    expect(localStorage.getItem(SOLVED_KEY)).toBe('[1]');
    expect(localStorage.getItem(STARTED_KEY)).toBe('[2,3]');
    expect(localStorage.getItem('killersudoku_progress:2')).toBe('solved');
    expect(localStorage.getItem('killersudoku_progress:4')).toBe('started');
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
        expect(readProgress().solved.size).toBe(0);
        expect(readProgress().started.size).toBe(0);
      } finally {
        spy.mockRestore();
      }
    });
  });
});
