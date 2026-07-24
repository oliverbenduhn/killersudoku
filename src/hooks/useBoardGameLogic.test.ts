import { act, renderHook } from '@testing-library/react';
import { useBoardGameLogic, type UseBoardGameLogicOptions } from './useBoardGameLogic';
import * as GameLogic from '../services/gameLogicService';
import type { GameLevel, GameState } from '../types/gameTypes';

const emptyBoard = () => Array.from({ length: 9 }, () => Array(9).fill(0));

const levelData: GameLevel = {
  id: 'logic-test',
  levelNumber: 1,
  initialValues: emptyBoard(),
  solution: emptyBoard(),
  cages: [{
    id: 'single',
    cells: [{ row: 0, col: 0 }],
    sum: 1,
    color: 'blue.100'
  }]
};

const gameState: GameState = {
  id: 'game',
  levelId: 'level-1',
  cellValues: emptyBoard(),
  notes: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [])),
  mistakesUsed: 2,
  hintsUsed: 0,
  gameOver: false
};

const makeOptions = (overrides: Partial<UseBoardGameLogicOptions> = {}): UseBoardGameLogicOptions => ({
  gameState,
  levelData,
  cages: levelData.cages,
  selectedCells: [{ row: 0, col: 0 }],
  size: 9,
  maxHints: 3,
  maxMistakes: 3,
  isGameOver: false,
  updateGameState: jest.fn().mockResolvedValue(undefined),
  applyMove: jest.fn().mockResolvedValue(undefined),
  clearHistory: jest.fn(),
  resetSelection: jest.fn(),
  animation: {
    lastEnteredCell: null,
    lastEnteredValue: 0,
    lastEnteredValid: true,
    animating: false,
    triggerAnimation: jest.fn(),
    resetAnimation: jest.fn()
  },
  onGameOver: jest.fn(),
  onSolveRecorded: jest.fn(),
  showError: jest.fn(),
  ...overrides
});

describe('useBoardGameLogic – Game Over', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('zeigt beim Erreichen des Fehlerlimits einen Eingabe-Warn-Toast, aber keinen separaten Game-Over-Toast', () => {
    jest.spyOn(GameLogic, 'applyPlayerEntry').mockReturnValue({
      cellValues: emptyBoard(),
      notes: gameState.notes,
      acceptedCells: [],
      rejectedCells: [{ row: 0, col: 0 }]
    });
    const options = makeOptions();
    const { result } = renderHook(() => useBoardGameLogic(options));

    act(() => result.current.handleNumberSelect(2));

    expect(options.applyMove).toHaveBeenCalledWith(expect.objectContaining({
      mistakesUsed: 3,
      gameOver: true
    }));
    // Eingabe-Warn-Toast ja (User-Feedback „passt hier nicht"), aber kein
    // zusätzlicher Game-Over-Toast.
    expect(options.showError).toHaveBeenCalledTimes(1);
    expect(options.showError).toHaveBeenCalledWith(expect.objectContaining({
      status: 'warning'
    }));
    expect(options.onGameOver).toHaveBeenCalledTimes(1);
  });

  test('setzt einen Game-over-Spielstand vollständig zurück und verwirft Notizen und History', () => {
    const updateGameState = jest.fn().mockResolvedValue(undefined);
    const notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): number[] => []));
    notes[0][0] = [2, 4];
    const options = makeOptions({
      gameState: { ...gameState, notes, mistakesUsed: 3, gameOver: true },
      isGameOver: true,
      updateGameState
    });
    const { result } = renderHook(() => useBoardGameLogic(options));

    act(() => result.current.handleReset());

    expect(updateGameState).toHaveBeenCalledWith(expect.objectContaining({
      cellValues: levelData.initialValues,
      notes: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [])),
      mistakesUsed: 0,
      hintsUsed: 0,
      solved: false,
      gameOver: false,
      elapsedTime: 0
    }));
    expect(options.applyMove).not.toHaveBeenCalled();
    expect(options.clearHistory).toHaveBeenCalledTimes(1);
  });
});

describe('useBoardGameLogic – Bleistiftmodus (Issues #5/#6)', () => {
  const emptyBoard = (): number[][] => Array.from({ length: 9 }, () => Array(9).fill(0));
  const emptyNotes = (): number[][][] =>
    Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): number[] => []));

  const initialValues = emptyBoard();
  const cellValues = emptyBoard();
  const levelData: GameLevel = {
    id: 'logic-test',
    levelNumber: 1,
    initialValues,
    solution: emptyBoard(),
    cages: [{ id: 'c1', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], sum: 3, color: 'blue.100' }]
  };

  const makeState = (overrides: Partial<GameState> = {}): GameState => ({
    id: 'game',
    levelId: 'level-1',
    cellValues: cellValues.map(row => [...row]),
    notes: emptyNotes(),
    mistakesUsed: 0,
    hintsUsed: 0,
    gameOver: false,
    ...overrides
  });

  test('Ziffer im Bleistiftmodus toggelt Notiz und ruft applyMove nur mit notes auf', () => {
    const applyMove = jest.fn().mockResolvedValue(undefined);
    const options = makeOptions({
      gameState: makeState(),
      pencilMode: true,
      applyMove
    });

    const { result } = renderHook(() => useBoardGameLogic(options));
    act(() => result.current.handleNumberSelect(4));

    expect(applyMove).toHaveBeenCalledTimes(1);
    const call = applyMove.mock.calls[0][0];
    expect(call.notes[0][0]).toEqual([4]);
    // Zellwert bleibt unverändert — Notizpfad berührt cellValues NICHT.
    expect(call.cellValues).toBeUndefined();
    expect(call.mistakesUsed).toBeUndefined();
  });

  test('zweites Drücken derselben Ziffer im Bleistiftmodus entfernt die Notiz wieder', () => {
    const applyMove = jest.fn().mockResolvedValue(undefined);
    const notes = emptyNotes();
    notes[0][0] = [4];
    const options = makeOptions({
      gameState: makeState({ notes }),
      pencilMode: true,
      applyMove
    });

    const { result } = renderHook(() => useBoardGameLogic(options));
    act(() => result.current.handleNumberSelect(4));

    const call = applyMove.mock.calls[0][0];
    expect(call.notes[0][0]).toEqual([]);
  });

  test('Bleistiftmodus + Vorgabezelle = kein applyMove (No-op)', () => {
    const initial = emptyBoard();
    initial[0][0] = 5;
    const applyMove = jest.fn().mockResolvedValue(undefined);
    const options = makeOptions({
      gameState: makeState({ notes: emptyNotes() }),
      levelData: { ...levelData, initialValues: initial },
      selectedCells: [{ row: 0, col: 0 }],
      pencilMode: true,
      applyMove
    });

    const { result } = renderHook(() => useBoardGameLogic(options));
    act(() => result.current.handleNumberSelect(4));

    expect(applyMove).not.toHaveBeenCalled();
  });

  test('Bleistiftmodus + ausgefüllte Zelle = kein applyMove (No-op)', () => {
    const values = emptyBoard();
    values[0][0] = 3;
    const applyMove = jest.fn().mockResolvedValue(undefined);
    const options = makeOptions({
      gameState: makeState({ notes: emptyNotes(), cellValues: values }),
      selectedCells: [{ row: 0, col: 0 }],
      pencilMode: true,
      applyMove
    });

    const { result } = renderHook(() => useBoardGameLogic(options));
    act(() => result.current.handleNumberSelect(4));

    expect(applyMove).not.toHaveBeenCalled();
  });

  test('Mehrfachauswahl: Notiz nur in leeren, nicht vorgegebenen Zellen', () => {
    const initial = emptyBoard();
    initial[0][0] = 1; // Vorgabe
    const values = emptyBoard();
    values[0][1] = 2; // ausgefüllt
    const applyMove = jest.fn().mockResolvedValue(undefined);
    const options = makeOptions({
      gameState: makeState({ notes: emptyNotes(), cellValues: values }),
      levelData: { ...levelData, initialValues: initial },
      selectedCells: [
        { row: 0, col: 0 }, // Vorgabe
        { row: 0, col: 1 }, // ausgefüllt
        { row: 0, col: 2 }, // leer
        { row: 1, col: 2 }, // leer
      ],
      pencilMode: true,
      applyMove
    });

    const { result } = renderHook(() => useBoardGameLogic(options));
    act(() => result.current.handleNumberSelect(7));

    expect(applyMove).toHaveBeenCalledTimes(1);
    const call = applyMove.mock.calls[0][0];
    expect(call.notes[0][2]).toEqual([7]);
    expect(call.notes[1][2]).toEqual([7]);
    expect(call.notes[0][0]).toEqual([]);
    expect(call.notes[0][1]).toEqual([]);
  });

  test('handleClear im Bleistiftmodus leert alle Notizen der Auswahl', () => {
    const notes = emptyNotes();
    notes[0][0] = [3, 5, 7];
    notes[0][1] = [1];
    const applyMove = jest.fn().mockResolvedValue(undefined);
    const options = makeOptions({
      gameState: makeState({ notes }),
      selectedCells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
      pencilMode: true,
      applyMove
    });

    const { result } = renderHook(() => useBoardGameLogic(options));
    act(() => result.current.handleClear());

    expect(applyMove).toHaveBeenCalledTimes(1);
    const call = applyMove.mock.calls[0][0];
    expect(call.notes[0][0]).toEqual([]);
    expect(call.notes[0][1]).toEqual([]);
  });

  test('handleClear im Bleistiftmodus ohne Notiz-Inhalt löst kein applyMove aus (No-op)', () => {
    const applyMove = jest.fn().mockResolvedValue(undefined);
    const options = makeOptions({
      gameState: makeState({ notes: emptyNotes() }),
      selectedCells: [{ row: 0, col: 0 }],
      pencilMode: true,
      applyMove
    });

    const { result } = renderHook(() => useBoardGameLogic(options));
    act(() => result.current.handleClear());

    expect(applyMove).not.toHaveBeenCalled();
  });

  test('normal value entry applies values and cleared notes atomically', () => {
    const nextValues = emptyBoard();
    nextValues[0][0] = 4;
    const nextNotes = emptyNotes();
    jest.spyOn(GameLogic, 'applyPlayerEntry').mockReturnValue({
      cellValues: nextValues,
      notes: nextNotes,
      acceptedCells: [{ row: 0, col: 0 }],
      rejectedCells: []
    });
    const notes = emptyNotes();
    notes[0][0] = [4, 7];
    const applyMove = jest.fn().mockResolvedValue(undefined);
    const options = makeOptions({
      gameState: makeState({ notes }),
      pencilMode: false,
      applyMove
    });

    const { result } = renderHook(() => useBoardGameLogic(options));
    act(() => result.current.handleNumberSelect(4));

    expect(GameLogic.applyPlayerEntry).toHaveBeenCalledWith(
      options.gameState?.cellValues,
      notes,
      options.levelData?.initialValues,
      options.selectedCells,
      4,
      options.cages,
      options.size
    );
    expect(applyMove).toHaveBeenCalledTimes(1);
    expect(applyMove).toHaveBeenCalledWith(expect.objectContaining({
      cellValues: nextValues,
      notes: nextNotes
    }));
  });

  test('reveal hint applies the value and cleared target notes atomically', () => {
    const solution = emptyBoard();
    solution[0][0] = 1;
    const notes = emptyNotes();
    notes[0][0] = [1, 3];
    notes[0][1] = [5];
    const applyMove = jest.fn().mockResolvedValue(undefined);
    const options = makeOptions({
      gameState: makeState({ notes }),
      levelData: { ...levelData, solution },
      applyMove
    });

    const { result } = renderHook(() => useBoardGameLogic(options));
    act(() => result.current.handleRevealHint());

    expect(applyMove).toHaveBeenCalledTimes(1);
    const move = applyMove.mock.calls[0][0];
    expect(move.cellValues[0][0]).toBe(1);
    expect(move.notes[0][0]).toEqual([]);
    expect(move.notes[0][1]).toEqual([5]);
    expect(move.notes).not.toBe(notes);
    expect(notes[0][0]).toEqual([1, 3]);
  });

  test('inaktiver Bleistiftmodus: Ziffer nimmt unverändert den Wertepfad (Regression)', () => {
    // applyPlayerEntry ist gemockt; wir prüfen, dass der Wertepfad gewählt
    // wird, NICHT der Notizpfad — also wird applyMove mit cellValues
    // aufgerufen, nicht mit notes.
    jest.spyOn(GameLogic, 'applyPlayerEntry').mockReturnValue({
      cellValues: (() => {
        const b = emptyBoard();
        b[0][0] = 4;
        return b;
      })(),
      notes: emptyNotes(),
      acceptedCells: [{ row: 0, col: 0 }],
      rejectedCells: []
    });
    const applyMove = jest.fn().mockResolvedValue(undefined);
    const options = makeOptions({
      gameState: makeState(),
      pencilMode: false,
      applyMove
    });

    const { result } = renderHook(() => useBoardGameLogic(options));
    act(() => result.current.handleNumberSelect(4));

    expect(applyMove).toHaveBeenCalledTimes(1);
    const call = applyMove.mock.calls[0][0];
    expect(call.cellValues).toBeDefined();
    expect(call.notes).toBeDefined();
  });

  test('handleClear inaktivem Modus löscht weiterhin Zellwerte (Regression)', () => {
    const values = emptyBoard();
    values[0][0] = 4;
    const applyMove = jest.fn().mockResolvedValue(undefined);
    const options = makeOptions({
      gameState: makeState({ cellValues: values }),
      selectedCells: [{ row: 0, col: 0 }],
      pencilMode: false,
      applyMove
    });

    const { result } = renderHook(() => useBoardGameLogic(options));
    act(() => result.current.handleClear());

    expect(applyMove).toHaveBeenCalledTimes(1);
    const call = applyMove.mock.calls[0][0];
    expect(call.cellValues[0][0]).toBe(0);
    expect(call.notes).toBeUndefined();
  });
});
