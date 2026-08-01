import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useCellSelection } from './useCellSelection';
import { Cage } from '../types/gameTypes';

const CELL = 50; // Test-Standard: 50px-Zellen, matches useBoardResize.
const cage1: Cage = {
  id: 'c1',
  cells: [
    { row: 0, col: 0 },
    { row: 0, col: 1 }
  ],
  sum: 3,
  color: 'blue.100'
};

// Helper: Pixel-Position der Mitte einer Zelle.
const px = (row: number, col: number): { x: number; y: number } => ({
  x: col * CELL + CELL / 2,
  y: row * CELL + CELL / 2,
});

describe('useCellSelection', () => {
  test('Startzustand: keine Auswahl', () => {
    const { result } = renderHook(() => useCellSelection([], CELL));
    expect(result.current.selectedCell).toBeNull();
    expect(result.current.selectedCells).toEqual([]);
    expect(result.current.isDragging).toBe(false);
  });

  test('handlePointerDown setzt Auswahl + isDragging', () => {
    const { result } = renderHook(() => useCellSelection([], CELL));
    const p = px(2, 3);
    act(() => result.current.handlePointerDown(2, 3));
    expect(result.current.selectedCell).toEqual({ row: 2, col: 3 });
    expect(result.current.selectedCells).toEqual([{ row: 2, col: 3 }]);
    expect(result.current.isDragging).toBe(true);
  });

  test('handlePointerMove ignoriert wenn nicht dragging', () => {
    const { result } = renderHook(() => useCellSelection([], CELL));
    act(() => result.current.handlePointerMove(100, 100));
    expect(result.current.selectedCells).toEqual([]);
  });

  test('handlePointerMove vor handlePointerDown: ignoriert (kein Dragging)', () => {
    // Regression: Browser schickt pointermove auf Nachbarzellen beim
    // pointerdown desselben Ticks. Ohne Down keine Auswahl.
    const { result } = renderHook(() => useCellSelection([], CELL));
    act(() => result.current.handlePointerMove(100, 100));
    expect(result.current.selectedCells).toEqual([]);
  });

  test('Move innerhalb der Startzelle: Auswahl bleibt 1×1 (kein Zittern → Rechteck)', () => {
    // User drückt Maus auf Zelle (2,2) und bewegt sie innerhalb ihrer Grenzen.
    const { result } = renderHook(() => useCellSelection([], CELL));
    const p = px(2, 2);
    act(() => result.current.handlePointerDown(2, 2));
    // 10px nach rechts — weiterhin innerhalb derselben 50px-Zelle.
    act(() => result.current.handlePointerMove(p.x + 10, p.y));
    expect(result.current.selectedCells).toEqual([{ row: 2, col: 2 }]);
  });

  test('1px über Zellgrenze: Nachbarzelle gehört exakt zum Rechteck', () => {
    // User-Spec: keine künstliche Schwelle. Entscheidend ist nur die echte
    // Zellgrenze. 1px innerhalb der Nachbarzelle bedeutet 1×2-Auswahl.
    const { result } = renderHook(() => useCellSelection([], CELL));
    const p = px(2, 2);
    act(() => result.current.handlePointerDown(2, 2));
    // Down war in der Zellmitte; +26px liegt 1px in der Nachbarzelle.
    act(() => result.current.handlePointerMove(p.x + 26, p.y));
    expect(result.current.selectedCells).toEqual([
      { row: 2, col: 2 },
      { row: 2, col: 3 },
    ]);
  });


  test('Drag-Select 2×4: acht Cells', () => {
    // Pointer liegt in Zeile 1 / Spalte 3 → Rechteck (0,0) bis (1,3).
    const { result } = renderHook(() => useCellSelection([], CELL));
    const p = px(0, 0);
    act(() => result.current.handlePointerDown(0, 0));
    act(() => result.current.handlePointerMove(175, 75));
    expect(result.current.selectedCells).toHaveLength(8); // 2×4
  });

  test('handlePointerEnd beendet Drag', () => {
    const { result } = renderHook(() => useCellSelection([], CELL));
    const p = px(0, 0);
    act(() => result.current.handlePointerDown(0, 0));
    act(() => result.current.handlePointerEnd());
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragStart).toBeNull();
  });

  test('clearSelection leert alles', () => {
    const { result } = renderHook(() => useCellSelection([], CELL));
    const p = px(1, 1);
    act(() => result.current.handlePointerDown(1, 1));
    act(() => result.current.clearSelection());
    expect(result.current.selectedCell).toBeNull();
    expect(result.current.selectedCells).toEqual([]);
    expect(result.current.isDragging).toBe(false);
  });

  test('Doppelklick auf Cell im Käfig: gesamter Käfig wird selektiert', () => {
    const cageA: Cage = { id: 'a', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }], sum: 6, color: 'blue.100' };
    const { result } = renderHook(() => useCellSelection([cageA], CELL));
    act(() => result.current.handleDoubleClick(0, 0));
    expect(result.current.selectedCells).toHaveLength(3);
    expect(result.current.selectedCells.map(c => `${c.row},${c.col}`).sort()).toEqual(['0,0', '0,1', '1,0']);
  });

  test('Doppelklick auf Cell ohne Käfig: bleibt Single-Select', () => {
    const cageOther: Cage = { id: 'x', cells: [{ row: 5, col: 5 }], sum: 7, color: 'pink.100' };
    const { result } = renderHook(() => useCellSelection([cageOther], CELL));
    act(() => result.current.handleDoubleClick(0, 0));
    expect(result.current.selectedCells).toEqual([{ row: 0, col: 0 }]);
  });

  test('Doppel-Tipp auf gleiche Cell in <300ms: Käfig wird markiert', () => {
    const cageA: Cage = { id: 'a', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }], sum: 6, color: 'blue.100' };
    const { result } = renderHook(() => useCellSelection([cageA], CELL));
    const p = px(0, 0);
    jest.useFakeTimers();
    try {
      act(() => result.current.handlePointerDown(0, 0));
      act(() => { jest.advanceTimersByTime(150); });
      act(() => result.current.handlePointerDown(0, 0));
      expect(result.current.selectedCells).toHaveLength(3);
    } finally {
      jest.useRealTimers();
    }
  });

  test('Zwei Taps auf gleiche Cell, aber >300ms auseinander: kein Doppel-Tipp', () => {
    const cageA: Cage = { id: 'a', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }], sum: 6, color: 'blue.100' };
    const { result } = renderHook(() => useCellSelection([cageA], CELL));
    const p = px(0, 0);
    jest.useFakeTimers();
    try {
      act(() => result.current.handlePointerDown(0, 0));
      act(() => { jest.advanceTimersByTime(500); });
      act(() => result.current.handlePointerDown(0, 0));
      expect(result.current.selectedCells).toEqual([{ row: 0, col: 0 }]);
    } finally {
      jest.useRealTimers();
    }
  });

  test('Zwei Taps auf verschiedene Cells in <300ms: kein Doppel-Tipp', () => {
    const cageA: Cage = { id: 'a', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], sum: 3, color: 'blue.100' };
    const { result } = renderHook(() => useCellSelection([cageA], CELL));
    const p0 = px(0, 0);
    const p1 = px(0, 1);
    jest.useFakeTimers();
    try {
      act(() => result.current.handlePointerDown(0, 0));
      act(() => jest.advanceTimersByTime(150));
      act(() => result.current.handlePointerDown(0, 1));
      expect(result.current.selectedCells).toEqual([{ row: 0, col: 1 }]);
    } finally {
      jest.useRealTimers();
    }
  });
});
