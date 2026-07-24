import { renderHook, act } from '@testing-library/react';
import { useHints } from './useHints';
import { Cage, GameState } from '../types/gameTypes';

const emptyBoard = (): number[][] =>
  Array.from({ length: 9 }, () => Array(9).fill(0));

describe('useHints', () => {
  test('Startzustand: Hints aus, leere Liste', () => {
    const { result } = renderHook(() => useHints());
    expect(result.current.showHints).toBe(false);
    expect(result.current.possibleValues).toEqual([]);
  });

  test('toggleHints schaltet um', () => {
    const { result } = renderHook(() => useHints());
    act(() => result.current.toggleHints());
    expect(result.current.showHints).toBe(true);
    act(() => result.current.toggleHints());
    expect(result.current.showHints).toBe(false);
  });

  test('refreshHints setzt mögliche Werte', () => {
    const { result } = renderHook(() => useHints());
    const gameState: GameState = {
      id: 'g1',
      cellValues: emptyBoard(),
      notes: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [])),
      startTime: Date.now(),
      elapsedTime: 0,
      hintsUsed: 0,
      mistakesUsed: 0,
      gameOver: false
    };
    const cage: Cage = {
      id: 'c1',
      cells: [{ row: 0, col: 0 }],
      sum: 7,
      color: 'blue.100'
    };

    act(() => {
      result.current.refreshHints({ row: 0, col: 0 }, gameState, [cage], 9);
    });

    expect(result.current.possibleValues).toContain(7);
  });
});