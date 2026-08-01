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

  test('handleDragStart setzt Auswahl + isDragging', () => {
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handleDragStart(2, 3));
    expect(result.current.selectedCell).toEqual({ row: 2, col: 3 });
    expect(result.current.selectedCells).toEqual([{ row: 2, col: 3 }]);
    expect(result.current.isDragging).toBe(true);
  });

  test('handleDragEnter ignoriert wenn nicht dragging', () => {
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handleDragEnter(1, 1));
    expect(result.current.selectedCells).toEqual([]);
  });

  test('Drag-Select: rechteckig, freie Auswahl', () => {
    // Rechteck vom dragStart bis zur aktuellen Mausposition. Auswahl
    // ist NICHT auf den Cage der Startzelle beschränkt — User will
    // beliebige 1×1, 1×2, 2×2, 2×4 etc. markieren können.
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handleDragStart(1, 1));
    act(() => result.current.handleDragEnter(3, 3));
    expect(result.current.selectedCells).toHaveLength(9); // 3×3
  });

  test('Drag-Select 2×4: sechs Cells', () => {
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handleDragStart(0, 0));
    act(() => result.current.handleDragEnter(1, 3));
    expect(result.current.selectedCells).toHaveLength(8); // 2×4
  });

  test('handleDragEnd beendet Drag', () => {
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handleDragStart(0, 0));
    act(() => result.current.handleDragEnd());
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragStart).toBeNull();
  });

  test('clearSelection leert alles', () => {
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handleDragStart(1, 1));
    act(() => result.current.clearSelection());
    expect(result.current.selectedCell).toBeNull();
    expect(result.current.selectedCells).toEqual([]);
    expect(result.current.isDragging).toBe(false);
  });

  test('handleDragEnter vor handleDragStart: ignoriert (kein Dragging)', () => {
    // Regression: Browser schickt mouseenter auf Nachbarzellen beim
    // mousedown desselben Ticks. Ohne Drag-Start keine Auswahl.
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handleDragEnter(1, 0));
    expect(result.current.selectedCells).toEqual([]);
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
});