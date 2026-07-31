import { renderHook, act } from '@testing-library/react';
import { useCellAnimation } from './useCellAnimation';

describe('useCellAnimation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('initial: nichts aktiv', () => {
    const { result } = renderHook(() => useCellAnimation());
    expect(result.current.lastEnteredCell).toBeNull();
    expect(result.current.lastEnteredValue).toBe(0);
    expect(result.current.lastEnteredValid).toBe(true);
    expect(result.current.animating).toBe(false);
  });

  test('triggerAnimation setzt last-Werte und animating=true', () => {
    const { result } = renderHook(() => useCellAnimation());
    act(() => {
      result.current.triggerAnimation({ row: 3, col: 4 }, 7, true);
    });
    expect(result.current.lastEnteredCell).toEqual({ row: 3, col: 4 });
    expect(result.current.lastEnteredValue).toBe(7);
    expect(result.current.lastEnteredValid).toBe(true);
    expect(result.current.animating).toBe(true);
  });

  test('nach 500ms ist animating false (Timer feuert)', () => {
    const { result } = renderHook(() => useCellAnimation());
    act(() => {
      result.current.triggerAnimation({ row: 0, col: 0 }, 1, false);
    });
    expect(result.current.animating).toBe(true);
    act(() => { jest.advanceTimersByTime(500); });
    expect(result.current.animating).toBe(false);
  });

  test('resetAnimation cleart alle Werte + Timer', () => {
    const { result } = renderHook(() => useCellAnimation());
    act(() => {
      result.current.triggerAnimation({ row: 0, col: 0 }, 1, true);
    });
    act(() => { result.current.resetAnimation(); });
    expect(result.current.lastEnteredCell).toBeNull();
    expect(result.current.lastEnteredValue).toBe(0);
    expect(result.current.lastEnteredValid).toBe(true);
    expect(result.current.animating).toBe(false);
  });

  test('schnelles zweites triggerAnimation: Timer wird ersetzt, kein Leak', () => {
    const { result } = renderHook(() => useCellAnimation());
    act(() => { result.current.triggerAnimation({ row: 0, col: 0 }, 1, true); });
    act(() => { jest.advanceTimersByTime(300); });
    act(() => { result.current.triggerAnimation({ row: 1, col: 1 }, 2, true); });
    // Timer 1 hätte bei 500ms gefeuert — wurde aber gecleart.
    // Timer 2 startet bei 300ms (rel zur Hook-Wallclock) und feuert
    // bei 300+500 = 800ms — also Timer 1 darf NIE feuern.
    act(() => { jest.advanceTimersByTime(200); }); // 500 insgesamt — Timer 1 wäre hier
    expect(result.current.animating).toBe(true); // Timer 2 läuft noch
    act(() => { jest.advanceTimersByTime(300); }); // 800ms — Timer 2 feuert
    expect(result.current.animating).toBe(false);
  });

  test('unmount cleart laufenden Timer (kein setState on unmounted)', () => {
    const { result, unmount } = renderHook(() => useCellAnimation());
    act(() => { result.current.triggerAnimation({ row: 0, col: 0 }, 1, true); });
    unmount();
    // Würde jest-Warnung werfen, wenn Timer-Referenz existiert
    act(() => { jest.advanceTimersByTime(1000); });
    // kein Fehler erwartet
  });
});
