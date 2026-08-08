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

  // 🟠 Audit #22: Cage-Summe 17 über 3 distinkte Zellen 1-9 ist lösbar
  // (z. B. 1+7+9, 2+6+9, 4+5+8). Der Audit-Trace behauptet "unmöglich",
  // aber mathematisch gibt es 6 gültige Kombinationen. Die Demo-Solution
  // (4,4)=7, (5,4)=1, (5,5)=9 = 17 ist eine davon. Kein Validator läuft
  // auf Tutorial-Daten — Bug existiert nicht im User-Flow.
  test('🟠 #22 Demo-Cage-Summe 17 (3 distinkte Zellen 1-9) ist mathematisch lösbar', () => {
    const { result } = renderHook(() => useTutorial());
    const demo = result.current.demoLevel;
    // Cage mit Summe 17 und 3 Zellen finden.
    const cage17 = demo.cages.find(c => c.sum === 17 && c.cells.length === 3);
    expect(cage17).toBeDefined();
    // Solution-Zellen für die Cage-Positionen addieren.
    const cellSum = cage17!.cells.reduce(
      (acc, { row, col }) => acc + demo.solution[row][col],
      0
    );
    expect(cellSum).toBe(17);
    // Alle 3 Werte distinkt und in 1..9.
    const values = cage17!.cells.map(({ row, col }) => demo.solution[row][col]);
    expect(new Set(values).size).toBe(3);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(9);
    }
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

  // Audit 💡 #34: highlight-Werte müssen mit der Demo-Lösung
  // übereinstimmen, sonst zeigt das Tutorial einen falschen Wert und
  // der User lernt eine Lüge. Demo-Solution wird über den Hook
  // exposed (siehe useTutorial.demoLevel), sonst hätte der Test
  // keinen Zugriff darauf.
  test('💡 #34 Highlight-Zellen matchen die Demo-Lösung', () => {
    const { result } = renderHook(() => useTutorial());
    const solution = result.current.demoLevel.solution;
    for (const step of TUTORIAL_STEPS) {
      for (const cell of step.highlightedCells) {
        expect(cell.value).toBe(solution[cell.row][cell.col]);
      }
    }
  });

  test('jumpTo springt zum angegebenen Schritt', () => {
    localStorage.clear();
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.jumpTo(3));
    expect(result.current.stepIndex).toBe(3);
    expect(result.current.step.id).toBe(TUTORIAL_STEPS[3].id);
  });

  test('jumpTo mit out-of-range Index ist no-op', () => {
    localStorage.clear();
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.jumpTo(-1));
    expect(result.current.stepIndex).toBe(0);
    act(() => result.current.jumpTo(999));
    expect(result.current.stepIndex).toBe(0);
  });
});
