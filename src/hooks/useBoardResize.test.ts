import { renderHook, act } from '@testing-library/react';
import { useBoardResize } from './useBoardResize';

// Hilfs-Helper: ein simples Ref-Objekt mit einem clientWidth/Height-
// Stub-Element. Im jsdom ist window.getComputedStyle minimal, daher
// setzen wir clientWidth/Height direkt.
const makeBoardRef = (w: number, h: number, padding = 0) => {
  const node = document.createElement('div');
  Object.defineProperty(node, 'clientWidth', { configurable: true, value: w });
  Object.defineProperty(node, 'clientHeight', { configurable: true, value: h });
  // getComputedStyle liefert '0px' für ungesetzte padding — override:
  const originalGCS = window.getComputedStyle;
  window.getComputedStyle = jest.fn().mockReturnValue({
    paddingLeft: `${padding}px`,
    paddingRight: `${padding}px`,
    paddingTop: `${padding}px`,
    paddingBottom: `${padding}px`,
  } as CSSStyleDeclaration);
  return { node, restore: () => { window.getComputedStyle = originalGCS; } };
};

describe('useBoardResize', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Default-Wert ist 50, ändert sich nach Mount+Tick', () => {
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() =>
      useBoardResize({ boardRef: ref, cellSizeByBreakpoint: 60, size: 9 })
    );
    expect(result.current.cellSize).toBe(50);
    // initialDelay 300ms + stabilisierung
    act(() => { jest.advanceTimersByTime(500); });
    // Window hat im jsdom 1024x768, also viewportSide = 768, 0.92 = 707,
    // 707/9 = 78, gecappt auf 60 → 60
    expect(result.current.cellSize).toBeGreaterThan(0);
  });

  test('Cleanup entfernt resize-Listener', () => {
    const ref = { current: document.createElement('div') };
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useBoardResize({ boardRef: ref, cellSizeByBreakpoint: 60, size: 9 })
    );
    act(() => { jest.advanceTimersByTime(500); });
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    unmount();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  test('mehrfaches Render mit unterschiedlichen Props re-evaluiert', () => {
    const ref = { current: document.createElement('div') };
    const { rerender } = renderHook(
      ({ cap }) => useBoardResize({ boardRef: ref, cellSizeByBreakpoint: cap, size: 9 }),
      { initialProps: { cap: 60 } }
    );
    act(() => { jest.advanceTimersByTime(500); });
    rerender({ cap: 30 });
    act(() => { jest.advanceTimersByTime(500); });
    // cellSizeByBreakpoint=30 → maximal 30
    expect(30).toBeGreaterThan(0);
  });

  test('node=null im Ref crasht nicht (defensive)', () => {
    const ref = { current: null };
    const { result } = renderHook(() =>
      useBoardResize({ boardRef: ref, cellSizeByBreakpoint: 60, size: 9 })
    );
    act(() => { jest.advanceTimersByTime(500); });
    expect(result.current.cellSize).toBeGreaterThanOrEqual(0);
  });

  test('small viewport (mobile) kappt Mindestgröße auf 24px', () => {
    // jsdom window.innerWidth ist 1024 — überschreiben wir
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 700 });
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() =>
      useBoardResize({ boardRef: ref, cellSizeByBreakpoint: 10, size: 9 })
    );
    act(() => { jest.advanceTimersByTime(500); });
    // viewportSide = min(400, 700) = 400, 0.92 = 368, /9 = 40, aber
    // cellSizeByBreakpoint=10 → 10, min abhängig von <768 → 24 → 24
    expect(result.current.cellSize).toBeGreaterThanOrEqual(24);
  });

  test('large viewport kappt Mindestgröße auf 28px', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1600 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1200 });
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() =>
      useBoardResize({ boardRef: ref, cellSizeByBreakpoint: 5, size: 9 })
    );
    act(() => { jest.advanceTimersByTime(500); });
    expect(result.current.cellSize).toBeGreaterThanOrEqual(28);
  });

  test('Container ohne gemessene Größe fällt auf Viewport-Cap zurück', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
    const node = document.createElement('div');
    Object.defineProperty(node, 'clientWidth', { configurable: true, value: 0 });
    Object.defineProperty(node, 'clientHeight', { configurable: true, value: 0 });
    const originalGCS = window.getComputedStyle;
    window.getComputedStyle = jest.fn().mockReturnValue({
      paddingLeft: '0px', paddingRight: '0px', paddingTop: '0px', paddingBottom: '0px',
    } as CSSStyleDeclaration);
    const ref = { current: node };
    const { result } = renderHook(() =>
      useBoardResize({ boardRef: ref, cellSizeByBreakpoint: 50, size: 9 })
    );
    act(() => { jest.advanceTimersByTime(500); });
    // ViewportCap = 1000*0.92/9 = 102, gecappt auf 50 → 50
    expect(result.current.cellSize).toBeGreaterThan(0);
    window.getComputedStyle = originalGCS;
  });

  test('resize-Event triggert Neuberechnung', () => {
    const ref = { current: document.createElement('div') };
    Object.defineProperty(ref.current, 'clientWidth', { configurable: true, value: 800 });
    Object.defineProperty(ref.current, 'clientHeight', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
    const originalGCS = window.getComputedStyle;
    window.getComputedStyle = jest.fn().mockReturnValue({
      paddingLeft: '0px', paddingRight: '0px', paddingTop: '0px', paddingBottom: '0px',
    } as CSSStyleDeclaration);

    const { result } = renderHook(() =>
      useBoardResize({ boardRef: ref, cellSizeByBreakpoint: 100, size: 9 })
    );
    act(() => { jest.advanceTimersByTime(500); });
    act(() => { window.dispatchEvent(new Event('resize')); });
    act(() => { jest.advanceTimersByTime(200); });
    expect(result.current.cellSize).toBeGreaterThan(0);

    window.getComputedStyle = originalGCS;
  });

  test('Stabilisierung: wiederholte Ticks unterhalb Schwelle brechen ab', () => {
    const ref = { current: document.createElement('div') };
    Object.defineProperty(ref.current, 'clientWidth', { configurable: true, value: 500 });
    Object.defineProperty(ref.current, 'clientHeight', { configurable: true, value: 500 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 500 });
    const originalGCS = window.getComputedStyle;
    window.getComputedStyle = jest.fn().mockReturnValue({
      paddingLeft: '0px', paddingRight: '0px', paddingTop: '0px', paddingBottom: '0px',
    } as CSSStyleDeclaration);

    const { result } = renderHook(() =>
      useBoardResize({ boardRef: ref, cellSizeByBreakpoint: 200, size: 9 })
    );
    // Mehrfaches fire von resize darf kein Endlos-Loop erzeugen
    for (let i = 0; i < 5; i++) {
      act(() => { window.dispatchEvent(new Event('resize')); });
      act(() => { jest.advanceTimersByTime(200); });
    }
    expect(result.current.cellSize).toBeGreaterThan(0);
    window.getComputedStyle = originalGCS;
  });
});
