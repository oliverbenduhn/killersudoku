import { renderHook, act } from '@testing-library/react';
import { useHints } from './useHints';

describe('useHints', () => {
  test('initial: showHints=false, possibleValues=[]', () => {
    const { result } = renderHook(() => useHints());
    expect(result.current.showHints).toBe(false);
    expect(result.current.possibleValues).toEqual([]);
  });

  test('toggleHints flippt showHints', () => {
    const { result } = renderHook(() => useHints());
    act(() => { result.current.toggleHints(); });
    expect(result.current.showHints).toBe(true);
    act(() => { result.current.toggleHints(); });
    expect(result.current.showHints).toBe(false);
  });

  test('refreshHints setzt possibleValues aus getPossibleValues-Array', () => {
    const { result } = renderHook(() => useHints());
    // Mock namens 'getPossibleValues' wird beim refreshHints aufgerufen.
    // Wir monkey-patchen die Modul-Funktion temporär.
    /* eslint-disable @typescript-eslint/no-require-imports */
    const gameLogic = require('../services/gameLogicService');
    const orig = gameLogic.getPossibleValues;
    gameLogic.getPossibleValues = jest.fn().mockReturnValue([1, 2, 3]);
    try {
      act(() => {
        result.current.refreshHints(
          { row: 0, col: 0 },
          { cellValues: [[0]] } as any,
          [] as any,
          9
        );
      });
      expect(result.current.possibleValues).toEqual([1, 2, 3]);
    } finally {
      gameLogic.getPossibleValues = orig;
    }
  });

  test('refreshHints akzeptiert Objekt-Shape mit .values', () => {
    const { result } = renderHook(() => useHints());
    const gameLogic = require('../services/gameLogicService');
    const orig = gameLogic.getPossibleValues;
    gameLogic.getPossibleValues = jest.fn().mockReturnValue({ values: [4, 5, 6] });
    try {
      act(() => {
        result.current.refreshHints(
          { row: 0, col: 0 },
          { cellValues: [[0]] } as any,
          [] as any,
          9
        );
      });
      expect(result.current.possibleValues).toEqual([4, 5, 6]);
    } finally {
      gameLogic.getPossibleValues = orig;
    }
  });

  test('showHints=false → possibleValues werden gecleart', () => {
    const { result } = renderHook(() => useHints());
    const gameLogic = require('../services/gameLogicService');
    const orig = gameLogic.getPossibleValues;
    gameLogic.getPossibleValues = jest.fn().mockReturnValue([7, 8, 9]);
    try {
      act(() => {
        result.current.refreshHints(
          { row: 0, col: 0 },
          { cellValues: [[0]] } as any,
          [] as any,
          9
        );
      });
      expect(result.current.possibleValues).toEqual([7, 8, 9]);
      act(() => { result.current.toggleHints(); });
      // showHints ist true — Effect triggert NICHT
      expect(result.current.possibleValues).toEqual([7, 8, 9]);
      act(() => { result.current.toggleHints(); });
      // jetzt wieder false → Effect cleart
      expect(result.current.possibleValues).toEqual([]);
    } finally {
      gameLogic.getPossibleValues = orig;
    }
  });
});
