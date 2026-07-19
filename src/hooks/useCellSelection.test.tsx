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

  test('Drag-Select ohne Käfig-Beschränkung: rechteckig', () => {
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handleDragStart(1, 1));
    act(() => result.current.handleDragEnter(3, 3));
    expect(result.current.selectedCells).toHaveLength(9); // 3×3
  });

  test('Drag-Select innerhalb Käfigs: beschränkt auf Käfig (Bugfix)', () => {
    const { result } = renderHook(() => useCellSelection([cage1]));
    act(() => result.current.handleDragStart(0, 0));
    act(() => result.current.handleDragEnter(2, 2));
    // Nur die 2 Zellen im Käfig, NICHT der rechteckige 3×3-Bereich
    expect(result.current.selectedCells).toHaveLength(2);
    expect(result.current.selectedCells).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 }
    ]);
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
});