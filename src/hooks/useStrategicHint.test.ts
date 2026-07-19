// useStrategicHint-Hook: ruft hintEngine auf, speichert Result.

import { renderHook, act } from '@testing-library/react';
import { useStrategicHint } from './useStrategicHint';
import { Cage } from '../types/gameTypes';

const SIZE = 9;
function emptyBoard(): number[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

describe('useStrategicHint', () => {
  test('startet mit currentHint = null', () => {
    const { result } = renderHook(() => useStrategicHint());
    expect(result.current.currentHint).toBeNull();
  });

  test('requestHint ohne aktives Brett → null', () => {
    const { result } = renderHook(() => useStrategicHint());
    let returned: ReturnType<typeof result.current.requestHint> = null;
    act(() => {
      returned = result.current.requestHint(emptyBoard(), []);
    });
    expect(returned).toBeNull();
    expect(result.current.currentHint).toBeNull();
  });

  test('requestHint mit Naked-Single-Cage-Situation → speichert Hint', () => {
    const { result } = renderHook(() => useStrategicHint());
    const cellValues = emptyBoard();
    cellValues[0][0] = 5;
    cellValues[0][1] = 4;
    const cages: Cage[] = [{
      id: 'c1',
      cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
      sum: 12,
      color: 'blue.100',
    }];

    let returned: ReturnType<typeof result.current.requestHint> = null;
    act(() => {
      returned = result.current.requestHint(cellValues, cages);
    });
    expect(returned).not.toBeNull();
    expect(result.current.currentHint).not.toBeNull();
    expect(result.current.currentHint!.technique).toBe('naked-single-cage');
    expect(result.current.currentHint!.value).toBe(3);
    expect(returned).toEqual(result.current.currentHint);
  });

  test('clearHint setzt currentHint zurück auf null', () => {
    const { result } = renderHook(() => useStrategicHint());
    const cellValues = emptyBoard();
    cellValues[0][0] = 5;
    cellValues[0][1] = 4;
    const cages: Cage[] = [{
      id: 'c1',
      cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
      sum: 12,
      color: 'blue.100',
    }];
    act(() => result.current.requestHint(cellValues, cages));
    expect(result.current.currentHint).not.toBeNull();
    act(() => result.current.clearHint());
    expect(result.current.currentHint).toBeNull();
  });
});
