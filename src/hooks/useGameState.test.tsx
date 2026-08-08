import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useGameState } from './useGameState';
import { enqueueGameStateSave, loadGameState } from '../services/storageService';

// Audit 🔴 #2: useGameState hatte keinen dedizierten Unit-Test. Mindest-
// Coverage: Hydration (leer + gespeichert), Save-Queue-Ordering,
// Undo-Snapshot, Timer-Auto-Save-Throttling.
describe('useGameState', () => {
  const realFetch = global.fetch;
  const emptyBoard = (): number[][] =>
    Array.from({ length: 9 }, () => Array(9).fill(0));
  const emptyNotes = (): number[][][] =>
    Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): number[] => []));
  const makeLevel = (number: number) => ({
    id: `level-${number}`,
    levelNumber: number,
    initialValues: emptyBoard(),
    solution: emptyBoard(),
    cages: [{ id: 'c1', cells: [{ row: 0, col: 0 }], sum: 1, color: 'blue.100' }],
  });
  const mockFetchForLevel = (level: object) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(level),
    }) as unknown as typeof fetch;
  };

  beforeEach(async () => {
    // In-Memory-localforage (siehe setupTests.ts) pro Test leeren.
    await require('localforage').default.clear();
  });

  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  test('Hydration: leerer Store liefert initial-State aus levelData.initialValues', async () => {
    const level = makeLevel(1);
    mockFetchForLevel(level);

    const { result } = renderHook(() => useGameState('level-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.gameState).not.toBeNull();
    expect(result.current.gameState!.cellValues).toEqual(emptyBoard());
    expect(result.current.gameState!.levelId).toBe('level-1');
    expect(result.current.gameState!.hintsUsed).toBe(0);
    expect(result.current.gameState!.mistakesUsed).toBe(0);
    expect(result.current.gameState!.gameOver).toBe(false);
  });

  test('Hydration: gespeicherter State wird geladen und re-sanitisiert', async () => {
    const level = makeLevel(2);
    mockFetchForLevel(level);

    // Erstmalig Speichern vorbereiten — raw-Form via enqueueGameStateSave
    // (Production-Pfad), damit der Hydration-Branch im Hook triggert.
    const saved = {
      id: 'game-restored',
      cellValues: emptyBoard(),
      notes: emptyNotes(),
      mistakesUsed: 1,
      hintsUsed: 2,
      gameOver: false,
      levelId: 'level-2',
    };
    await enqueueGameStateSave('level-2', saved);

    const { result } = renderHook(() => useGameState('level-2'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.gameState).not.toBeNull();
    expect(result.current.gameState!.id).toBe('game-restored');
    expect(result.current.gameState!.mistakesUsed).toBe(1);
    expect(result.current.gameState!.hintsUsed).toBe(2);
    // Re-Sanitisierung via sanitizePlayerBoard → cellValues bleibt befüllt.
    expect(result.current.gameState!.cellValues).toEqual(emptyBoard());
  });

  test('updateGameState schreibt den aktualisierten State in die Save-Queue', async () => {
    const level = makeLevel(3);
    mockFetchForLevel(level);

    const { result } = renderHook(() => useGameState('level-3'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateGameState({ hintsUsed: 7 });
    });

    // Save wurde tatsächlich persistiert; Wert ist der zuletzt geschriebene.
    const persisted = await loadGameState<{ hintsUsed: number }>('level-3');
    expect(persisted?.hintsUsed).toBe(7);
  });

  test('applyMove erzeugt Undo-Snapshot vor der Mutation', async () => {
    const level = makeLevel(4);
    mockFetchForLevel(level);
    const { result } = renderHook(() => useGameState('level-4'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const before = result.current.gameState!.hintsUsed;
    expect(result.current.canUndo).toBe(false);

    await act(async () => {
      await result.current.applyMove({ hintsUsed: before + 1 });
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.gameState!.hintsUsed).toBe(before + 1);

    await act(async () => {
      await result.current.undo();
    });

    expect(result.current.gameState!.hintsUsed).toBe(before);
  });

  test('updateGameState ohne applyMove flusht nicht in den Undo-Stack', async () => {
    const level = makeLevel(5);
    mockFetchForLevel(level);
    const { result } = renderHook(() => useGameState('level-5'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // updateGameState (Metadaten) — bewusst KEIN Undo-Snapshot.
    await act(async () => {
      await result.current.updateGameState({ hintsUsed: 5 });
    });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.gameState!.hintsUsed).toBe(5);
  });

  // 🟠 Audit #19: Timer-UseEffect mit []-Dep, läuft weiter über
  // gameState-Änderungen hinweg (User-Moves dürfen den Interval nicht
  // resetten) und stoppt bei solved/gameOver.
  test('🟠 #19 Timer läuft nach User-Move weiter (kein Rebuild-Reset)', async () => {
    jest.useFakeTimers();
    const level = makeLevel(6);
    mockFetchForLevel(level);
    const { result } = renderHook(() => useGameState('level-6'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Drei Timer-Ticks.
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await waitFor(() => {
      expect(result.current.gameState!.elapsedTime).toBeGreaterThanOrEqual(3000);
    });
    const elapsedAfterTicks = result.current.gameState!.elapsedTime;

    // User-Move (applyMove → setGameState). Vor dem Fix hätte der
    // [gameState]-Dep den Interval hier cleanup+rebuild gemacht und der
    // nächste Tick wäre erst danach geschlagen worden. Mit []-Dep läuft
    // der Interval ungestört weiter, nächster Tick zählt sofort weiter.
    await act(async () => {
      await result.current.applyMove({ hintsUsed: 1 });
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    await waitFor(() => {
      expect(result.current.gameState!.elapsedTime).toBeGreaterThanOrEqual(
        elapsedAfterTicks + 2000
      );
    });
    jest.useRealTimers();
  });

  test('🟠 #19 Timer stoppt bei gameOver=true', async () => {
    jest.useFakeTimers();
    const level = makeLevel(7);
    mockFetchForLevel(level);
    const { result } = renderHook(() => useGameState('level-7'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Game over setzen.
    await act(async () => {
      await result.current.updateGameState({ gameOver: true });
    });

    const elapsedAtStop = result.current.gameState!.elapsedTime;

    // 5s warten — Timer muss wegen gameOver-Check im tick gestoppt haben.
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    // elapsedTime darf nicht weiter hochgezählt haben.
    expect(result.current.gameState!.elapsedTime).toBe(elapsedAtStop);
    jest.useRealTimers();
  });

  // 🟠 Audit #21: cancelled-Flag im Hydration-Effect, damit StrictMode-
  // Doppeleffekt den zweiten Mount nicht in loadState weiterlaufen lässt
  // → keine doppelten enqueueGameStateSave-Calls im Hydration-Branch.
  test('🟠 #21 StrictMode-Doppeleffekt erzeugt nur einen Hydration-Save', async () => {
    const level = makeLevel(8);
    mockFetchForLevel(level);

    // Vorab gespeicherten State hinterlegen, damit der Hydration-Save-
    // Branch (Z.81 im Original, jetzt mit cancelled-Wache) garantiert
    // getriggert wird.
    const saved = {
      id: 'game-restore-8',
      cellValues: emptyBoard(),
      notes: emptyNotes(),
      mistakesUsed: 0,
      hintsUsed: 0,
      gameOver: false,
      levelId: 'level-8',
    };
    await enqueueGameStateSave('level-8', saved);

    // enqueueGameStateSave spyen, um Hydration-Save-Calls vom Test-
    // Setup-Setup zu unterscheiden.
    const saveSpy = jest.spyOn(
      require('../services/storageService'),
      'enqueueGameStateSave'
    );
    saveSpy.mockClear();

    // StrictMode umschließt den Hook → useEffect mountet 2x (Mount,
    // Cleanup, Mount). Ohne cancelled-Flag würde der erste Mount noch
    // nach dem Cleanup den Save-Call ausführen.
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.StrictMode, null, children);

    const { result } = renderHook(() => useGameState('level-8'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Nur Calls mit unserem puzzleId zählen, dann prüfen dass exakt 1
    // Save erfolgte. Ohne Fix wären es 2 (erster Mount + ReMount, weil
    // currentPuzzleIdRef in beiden Fällen identisch ist).
    const callsForOurPuzzle = saveSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === 'level-8'
    );
    expect(callsForOurPuzzle).toHaveLength(1);

    // Sanity: gameState ist tatsächlich der restaurierte.
    expect(result.current.gameState!.id).toBe('game-restore-8');

    saveSpy.mockRestore();
  });
});
