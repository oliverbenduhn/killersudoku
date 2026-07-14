import { renderHook, act } from '@testing-library/react';
import { useCellAnimation } from './useCellAnimation';

describe('useCellAnimation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('Startzustand: keine Animation aktiv', () => {
    const { result } = renderHook(() => useCellAnimation());
    expect(result.current.animating).toBe(false);
    expect(result.current.lastEnteredCell).toBeNull();
  });

  test('triggerAnimation setzt State und plant Cleanup', () => {
    const { result } = renderHook(() => useCellAnimation());
    act(() => {
      result.current.triggerAnimation({ row: 1, col: 2 }, 5, true);
    });
    expect(result.current.animating).toBe(true);
    expect(result.current.lastEnteredCell).toEqual({ row: 1, col: 2 });
    expect(result.current.lastEnteredValue).toBe(5);
    expect(result.current.lastEnteredValid).toBe(true);
  });

  test('Animation endet automatisch nach 500ms', () => {
    const { result } = renderHook(() => useCellAnimation());
    act(() => {
      result.current.triggerAnimation({ row: 0, col: 0 }, 1, false);
    });
    expect(result.current.animating).toBe(true);

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.animating).toBe(false);
  });

  test('resetAnimation räumt sofort auf', () => {
    const { result } = renderHook(() => useCellAnimation());
    act(() => {
      result.current.triggerAnimation({ row: 1, col: 1 }, 9, true);
    });
    act(() => result.current.resetAnimation());
    expect(result.current.animating).toBe(false);
    expect(result.current.lastEnteredCell).toBeNull();
    expect(result.current.lastEnteredValue).toBe(0);
  });

  test('Timer-Cleanup beim Unmount', () => {
    const { result, unmount } = renderHook(() => useCellAnimation());
    act(() => {
      result.current.triggerAnimation({ row: 0, col: 0 }, 1, true);
    });
    // Sollte keine Warnung verursachen
    unmount();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
  });
});