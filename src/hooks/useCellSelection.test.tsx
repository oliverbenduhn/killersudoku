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

  test('Drag-Select ohne Käfig-Beschränkung: bleibt auf Startzelle', () => {
    // Vorher lieferte `inCage = () => true` für käfig-lose Cages ein
    // 3×3-Rechteck. Das war exakt der User-Bug ("zwei Felder markiert,
    // plötzlich drei oder das ganze Brett"). Fix: ohne Cage-Constraint
    // bricht Multi-Select ab, die Startzelle bleibt allein markiert.
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handleDragStart(1, 1));
    act(() => result.current.handleDragEnter(3, 3));
    expect(result.current.selectedCells).toEqual([{ row: 1, col: 1 }]);
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

  test('handleDragEnter vor handleDragStart: ignoriert (kein Dragging)', () => {
    // Regression: Browser schickt mouseenter auf Nachbarzellen beim
    // mousedown desselben Ticks. Ohne synchronen Ref-Guard kam der
    // Start-Status im Closure veraltet an und markierte fremde Zellen.
    const cageA: Cage = { id: 'a', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], sum: 3, color: 'blue.100' };
    const cageB: Cage = { id: 'b', cells: [{ row: 1, col: 0 }, { row: 1, col: 1 }], sum: 7, color: 'green.100' };
    const { result } = renderHook(() => useCellSelection([cageA, cageB]));
    // enter auf cageB, OHNE vorherigen Start → darf nicht markieren
    act(() => result.current.handleDragEnter(1, 0));
    expect(result.current.selectedCells).toEqual([]);
  });

  test('handleDragEnter in fremden Käfig: bleibt im Start-Käfig', () => {
    // Regression: User startet in cageA, schleppt in cageB → Auswahl
    // darf NICHT in cageB hineinwachsen.
    const cageA: Cage = { id: 'a', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], sum: 3, color: 'blue.100' };
    const cageB: Cage = { id: 'b', cells: [{ row: 1, col: 0 }, { row: 1, col: 1 }], sum: 7, color: 'green.100' };
    const { result } = renderHook(() => useCellSelection([cageA, cageB]));
    act(() => result.current.handleDragStart(0, 0));
    act(() => result.current.handleDragEnter(1, 0));
    // nur cageA-Zellen, kein cageB
    expect(result.current.selectedCells).toEqual([{ row: 0, col: 0 }]);
  });

  test('handleDragEnter bei leerem cages: bleibt auf Startzelle (kein Rechteck-Flood)', () => {
    // Regression: Wenn cages noch leer ist (Levelwechsel-Render-Tick), fiel
    // der Cage-Filter via `?? true` durch und jeder Rechteck-Drag markierte
    // das ganze Brett. Fix: ohne Cage-Treffer bleibt nur die Startzelle.
    const { result } = renderHook(() => useCellSelection([]));
    act(() => result.current.handleDragStart(0, 0));
    act(() => result.current.handleDragEnter(8, 8));
    expect(result.current.selectedCells).toEqual([{ row: 0, col: 0 }]);
  });

  test('handleDragEnter ohne Käfig-Treffer (cages da, Cell käfiglos): bleibt auf Startzelle', () => {
    // Regression: Wenn cages definiert ist, die Startzelle aber in keinem
    // Cage liegt, würde der Drag das ganze Brett-Overlay füllen. Fix:
    // Käfig-lose Startzelle → Multi-Select bricht ab, Single bleibt.
    const cageOther: Cage = { id: 'x', cells: [{ row: 5, col: 5 }], sum: 7, color: 'pink.100' };
    const { result } = renderHook(() => useCellSelection([cageOther]));
    act(() => result.current.handleDragStart(0, 0));  // (0,0) ist käfiglos
    act(() => result.current.handleDragEnter(2, 2));
    expect(result.current.selectedCells).toEqual([{ row: 0, col: 0 }]);
  });
});