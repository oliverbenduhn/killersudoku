// useTutorial-Hook: Step-Navigation, Skip-Persistierung, Demo-Level-Form.

import { renderHook, act } from '@testing-library/react';
import { TUTORIAL_STEPS, useTutorial } from './useTutorial';

describe('useTutorial', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('ist beim ersten Start aktiv (nicht gesehen)', () => {
    const { result } = renderHook(() => useTutorial());
    expect(result.current.active).toBe(true);
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.totalSteps).toBe(TUTORIAL_STEPS.length);
    expect(result.current.step.id).toBe(TUTORIAL_STEPS[0].id);
  });

  test('next/prev navigiert zwischen Schritten', () => {
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.next());
    expect(result.current.stepIndex).toBe(1);
    act(() => result.current.next());
    expect(result.current.stepIndex).toBe(2);
    act(() => result.current.prev());
    expect(result.current.stepIndex).toBe(1);
  });

  test('prev am Anfang bleibt am Anfang', () => {
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.prev());
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.isFirstStep).toBe(true);
  });

  test('skip schließt das Tutorial und persistiert die Markierung', () => {
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.skip());
    expect(result.current.active).toBe(false);
    expect(localStorage.getItem('killersudoku_tutorial_seen')).toBe('1');
  });

  test('letzter Schritt: next schließt und persistiert', () => {
    const { result } = renderHook(() => useTutorial());
    for (let i = 0; i < TUTORIAL_STEPS.length - 1; i++) {
      act(() => result.current.next());
    }
    expect(result.current.isLastStep).toBe(true);
    act(() => result.current.next());
    expect(result.current.active).toBe(false);
    expect(localStorage.getItem('killersudoku_tutorial_seen')).toBe('1');
  });

  test('restart setzt zurück auf Schritt 0 und macht wieder aktiv', () => {
    localStorage.setItem('killersudoku_tutorial_seen', '1');
    const { result } = renderHook(() => useTutorial());
    expect(result.current.active).toBe(false);
    act(() => result.current.restart());
    expect(result.current.active).toBe(true);
    expect(result.current.stepIndex).toBe(0);
  });

  test('Demo-Level ist deterministisch und nicht leer', () => {
    const { result } = renderHook(() => useTutorial());
    expect(result.current.demoLevel.id).toBe('tutorial-demo');
    expect(result.current.demoLevel.cages.length).toBeGreaterThan(0);
    expect(result.current.demoLevel.solution.length).toBe(9);
    expect(result.current.demoLevel.solution[0].length).toBe(9);
  });

  test('jeder Schritt hat eine Highlight-Liste, die nur gültige Zellen nennt', () => {
    for (const step of TUTORIAL_STEPS) {
      for (const cell of step.highlightedCells) {
        expect(cell.row).toBeGreaterThanOrEqual(0);
        expect(cell.row).toBeLessThan(9);
        expect(cell.col).toBeGreaterThanOrEqual(0);
        expect(cell.col).toBeLessThan(9);
        expect(cell.value).toBeGreaterThanOrEqual(1);
        expect(cell.value).toBeLessThanOrEqual(9);
      }
    }
  });
});
