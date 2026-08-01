import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useCellSelection } from './useCellSelection';
import { Cage } from '../types/gameTypes';

const cage1: Cage = {
  id: 'c1',
  cells: [
    { row: 0, col: 0 },
    { row: 0, col: 1 }
  ],
  sum: 3,
  color: 'blue.100'
};

describe('useCellSelection', () => {
  test('Startzustand: keine Auswahl', () => {
    const { result } = renderHook(() => useCellSelection([]));
    expect(result.current.selectedCell).toBeNull();
    expect(result.current.selectedCells).toEqual([]);
    expect(result.current.isDragging).toBe(false);
  });

  test('handlePointerDown setzt Auswahl + isDragging', () => {
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handlePointerDown(2, 3));
    expect(result.current.selectedCell).toEqual({ row: 2, col: 3 });
    expect(result.current.selectedCells).toEqual([{ row: 2, col: 3 }]);
    expect(result.current.isDragging).toBe(true);
  });

  test('handlePointerMove ignoriert wenn nicht dragging', () => {
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handlePointerMove(1, 1));
    expect(result.current.selectedCells).toEqual([]);
  });

  test('Drag-Select: rechteckig, freie Auswahl', () => {
    // Rechteck vom dragStart bis zur aktuellen Pointer-Position. Auswahl
    // ist NICHT auf den Cage der Startzelle beschränkt — User will
    // beliebige 1×1, 1×2, 2×2, 2×4 etc. markieren können.
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handlePointerDown(1, 1));
    act(() => result.current.handlePointerMove(3, 3));
    expect(result.current.selectedCells).toHaveLength(9); // 3×3
  });

  test('Drag-Select 2×4: acht Cells', () => {
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handlePointerDown(0, 0));
    act(() => result.current.handlePointerMove(1, 3));
    expect(result.current.selectedCells).toHaveLength(8); // 2×4
  });

  test('handlePointerEnd beendet Drag', () => {
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handlePointerDown(0, 0));
    act(() => result.current.handlePointerEnd());
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragStart).toBeNull();
  });

  test('clearSelection leert alles', () => {
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handlePointerDown(1, 1));
    act(() => result.current.clearSelection());
    expect(result.current.selectedCell).toBeNull();
    expect(result.current.selectedCells).toEqual([]);
    expect(result.current.isDragging).toBe(false);
  });

  test('handlePointerMove vor handlePointerDown: ignoriert (kein Dragging)', () => {
    // Regression: Browser schickt pointermove auf Nachbarzellen beim
    // pointerdown desselben Ticks. Ohne Down keine Auswahl.
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handlePointerMove(1, 0));
    expect(result.current.selectedCells).toEqual([]);
  });

  test('Move innerhalb der Startzelle: Auswahl bleibt 1×1 (kein Zittern → Rechteck)', () => {
    // Regression: User drückt Maus auf Zelle, bewegt Maus nur INNERHALB
    // dieser Zelle. Solange der Pointer die Startzelle nicht verlässt,
    // bleibt die Auswahl 1×1 — kein 1×1-Rechteck-Aufbau, der das
    // visuelle Feedback verfälscht. Erst beim echten Zellenwechsel
    // wächst die Auswahl zum Rechteck.
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handlePointerDown(2, 2));
    act(() => result.current.handlePointerMove(2, 2)); // gleiche Zelle
    expect(result.current.selectedCells).toEqual([{ row: 2, col: 2 }]);
  });

  test('Erster Move in andere Zelle: Rechteck wächst ab 1×2', () => {
    // Gegenstück zum vorherigen Test: Sobald der Pointer die Startzelle
    // verlässt, springt die Rechteck-Auswahl an (1×2 beim ersten Schritt).
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handlePointerDown(2, 2));
    act(() => result.current.handlePointerMove(2, 3));
    expect(result.current.selectedCells).toHaveLength(2);
    expect(result.current.selectedCells).toEqual(
      expect.arrayContaining([{ row: 2, col: 2 }, { row: 2, col: 3 }])
    );
  });

  test('Doppelklick auf Cell im Käfig: gesamter Käfig wird selektiert', () => {
    // User-Spec: Doppelklick oder Doppeltipp markiert den ganzen Käfig.
    // Cage mit 3 Zellen → alle 3 markiert.
    const cageA: Cage = { id: 'a', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }], sum: 6, color: 'blue.100' };
    const { result } = renderHook(() => useCellSelection([cageA]));
    act(() => result.current.handleDoubleClick(0, 0));
    expect(result.current.selectedCells).toHaveLength(3);
    expect(result.current.selectedCells.map(c => `${c.row},${c.col}`).sort()).toEqual(['0,0', '0,1', '1,0']);
  });

  test('Doppelklick auf Cell ohne Käfig: bleibt Single-Select', () => {
    // Käfig-lose Cell: Doppelklick wählt nur diese eine Cell (kein Cage
    // zum Auswählen vorhanden).
    const cageOther: Cage = { id: 'x', cells: [{ row: 5, col: 5 }], sum: 7, color: 'pink.100' };
    const { result } = renderHook(() => useCellSelection([cageOther]));
    act(() => result.current.handleDoubleClick(0, 0));
    expect(result.current.selectedCells).toEqual([{ row: 0, col: 0 }]);
  });

  test('Doppel-Tipp auf gleiche Cell in <300ms: Käfig wird markiert', () => {
    // Touch-Pfad: Pointer-Events haben kein eingebautes dblclick-Äquivalent.
    // Stattdessen zwei pointerdown-Calls innerhalb 300ms auf derselben Cell
    // → Doppel-Tipp-Pfad → Käfig-Select.
    const cageA: Cage = { id: 'a', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }], sum: 6, color: 'blue.100' };
    const { result } = renderHook(() => useCellSelection([cageA]));
    jest.useFakeTimers();
    try {
      act(() => result.current.handlePointerDown(0, 0));
      act(() => {
        jest.advanceTimersByTime(150); // 150 ms < 300 ms
      });
      act(() => result.current.handlePointerDown(0, 0));
      expect(result.current.selectedCells).toHaveLength(3);
    } finally {
      jest.useRealTimers();
    }
  });

  test('Zwei Taps auf gleiche Cell, aber >300ms auseinander: kein Doppel-Tipp', () => {
    // Tap, lange warten, Tap → zwei separate Single-Selects, kein Käfig.
    const cageA: Cage = { id: 'a', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }], sum: 6, color: 'blue.100' };
    const { result } = renderHook(() => useCellSelection([cageA]));
    jest.useFakeTimers();
    try {
      act(() => result.current.handlePointerDown(0, 0));
      act(() => {
        jest.advanceTimersByTime(500); // > 300 ms
      });
      act(() => result.current.handlePointerDown(0, 0));
      // Drag-Start vom zweiten Tap überschreibt Single-Select; KEIN Cage.
      expect(result.current.selectedCells).toEqual([{ row: 0, col: 0 }]);
    } finally {
      jest.useRealTimers();
    }
  });

  test('Zwei Taps auf verschiedene Cells in <300ms: kein Doppel-Tipp', () => {
    // Tap auf A, kurz warten, Tap auf B → zweite Single-Select auf B,
    // kein Cage-Select von A.
    const cageA: Cage = { id: 'a', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], sum: 3, color: 'blue.100' };
    const { result } = renderHook(() => useCellSelection([cageA]));
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