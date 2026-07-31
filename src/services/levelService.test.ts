import { TOTAL_LEVELS, loadLevelByNumber, loadNextLevel, loadPreviousLevel } from './levelService';

describe('levelService', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  describe('TOTAL_LEVELS', () => {
    test('ist 100', () => {
      expect(TOTAL_LEVELS).toBe(100);
    });
  });

  describe('loadLevelByNumber', () => {
    test('wirft für 0 (out of range)', async () => {
      await expect(loadLevelByNumber(0)).rejects.toThrow(/Ungültige Levelnummer/);
    });

    test('wirft für 101 (out of range)', async () => {
      await expect(loadLevelByNumber(101)).rejects.toThrow(/Ungültige Levelnummer/);
    });

    test('wirft für negative Werte', async () => {
      await expect(loadLevelByNumber(-5)).rejects.toThrow(/Ungültige Levelnummer/);
    });

    test('lädt level_N.json und setzt levelNumber explizit', async () => {
      const fetchedLevel = {
        id: 'level-7',
        cages: [],
        initialValues: [],
        solution: [],
        levelNumber: 99, // wird überschrieben
      };
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(fetchedLevel),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const level = await loadLevelByNumber(7);
      expect(fetchMock).toHaveBeenCalledWith('/assets/levels/level_7.json');
      expect(level).toBe(fetchedLevel);
      expect(level.levelNumber).toBe(7);
    });

    test('wirft bei HTTP-Fehler', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.reject(new Error('no body')),
      }) as unknown as typeof fetch;

      await expect(loadLevelByNumber(7)).rejects.toThrow(/Level konnte nicht geladen/);
    });

    test('propagiert Netzwerkfehler', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('NetworkError')) as unknown as typeof fetch;
      await expect(loadLevelByNumber(7)).rejects.toThrow('NetworkError');
    });
  });

  describe('loadNextLevel', () => {
    test('gibt aktuelles+1 zurück', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ cages: [], initialValues: [], solution: [] }),
      }) as unknown as typeof fetch;

      const lvl = await loadNextLevel(5);
      expect(lvl.levelNumber).toBe(6);
    });

    test('am oberen Ende wrappt zu 1', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ cages: [], initialValues: [], solution: [] }),
      }) as unknown as typeof fetch;

      const lvl = await loadNextLevel(100);
      expect(lvl.levelNumber).toBe(1);
    });
  });

  describe('loadPreviousLevel', () => {
    test('gibt aktuelles-1 zurück', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ cages: [], initialValues: [], solution: [] }),
      }) as unknown as typeof fetch;

      const lvl = await loadPreviousLevel(5);
      expect(lvl.levelNumber).toBe(4);
    });

    test('am unteren Ende wrappt zu TOTAL_LEVELS', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ cages: [], initialValues: [], solution: [] }),
      }) as unknown as typeof fetch;

      const lvl = await loadPreviousLevel(1);
      expect(lvl.levelNumber).toBe(100);
    });
  });
});
