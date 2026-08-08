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

// Audit 🟡 #26: Hook-Signatur hat (row, col, downX, downY) erweitert.
// downX/downY sind Pixel relativ zur Down-Cell. Helper für Cell-Mitte,
// damit alte Tests ohne explizite Down-Koordinaten auskommen.
const down = (row: number, col: number): [number, number] => [CELL / 2, CELL / 2];

describe('useCellSelection', () => {
  test('Startzustand: keine Auswahl', () => {
    const { result } = renderHook(() => useCellSelection([], CELL));
    expect(result.current.selectedCell).toBeNull();
    expect(result.current.selectedCells).toEqual([]);
    expect(result.current.isDragging).toBe(false);
  });

  test('handlePointerDown setzt Auswahl aber noch KEIN isDragging (Threshold-Gate)', () => {
    // Audit 🟡 #26: isDragging wird erst nach Threshold-Riss im Move
    // gesetzt. Vorher war es ab dem ersten Move true → 1px-Zittern
    // reichte für ein 1×2-Rechteck.
    const { result } = renderHook(() => useCellSelection([], CELL));
    act(() => result.current.handlePointerDown(2, 3, ...down(2, 3)));
    expect(result.current.selectedCell).toEqual({ row: 2, col: 3 });
    expect(result.current.selectedCells).toEqual([{ row: 2, col: 3 }]);
    expect(result.current.isDragging).toBe(false);
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

  test('Move unterhalb Threshold (3px): bleibt Single-Select, isDragging bleibt false', () => {
    // Audit 🟡 #26: Touch-Zittern. 3px Bewegung darf das Rechteck
    // NICHT auslösen — wäre exakt der User-Report "versehentliches
    // Wischen kippt in 1×2".
    const { result } = renderHook(() => useCellSelection([], CELL));
    const p = px(2, 2);
    act(() => result.current.handlePointerDown(2, 2, ...down(2, 2)));
    act(() => result.current.handlePointerMove(p.x + 3, p.y));
    expect(result.current.selectedCells).toEqual([{ row: 2, col: 2 }]);
    expect(result.current.isDragging).toBe(false);
  });

  test('Move ab Threshold (10px): Drag startet, Rechteck wird gebaut', () => {
    // Audit 🟡 #26: ab DRAG_THRESHOLD_PX (6px) wird isDragging true
    // und das Rechteck sichtbar. 10px überschreitet Schwelle deutlich
    // und liegt 1px in der Nachbarzelle (CELL=50, Mitte+25 = Grenze).
    const { result } = renderHook(() => useCellSelection([], CELL));
    const p = px(2, 2);
    act(() => result.current.handlePointerDown(2, 2, ...down(2, 2)));
    act(() => result.current.handlePointerMove(p.x + 26, p.y));
    expect(result.current.isDragging).toBe(true);
    expect(result.current.selectedCells).toEqual([
      { row: 2, col: 2 },
      { row: 2, col: 3 },
    ]);
  });

  test('Bewegung unter Threshold, dann über Threshold: Rechteck erst beim zweiten Move', () => {
    // Erstes Move: 3px → no-op. Zweites Move: weiter auf +26px → Rechteck.
    const { result } = renderHook(() => useCellSelection([], CELL));
    const p = px(2, 2);
    act(() => result.current.handlePointerDown(2, 2, ...down(2, 2)));
    act(() => result.current.handlePointerMove(p.x + 3, p.y));
    expect(result.current.isDragging).toBe(false);
    act(() => result.current.handlePointerMove(p.x + 26, p.y));
    expect(result.current.isDragging).toBe(true);
    expect(result.current.selectedCells).toEqual([
      { row: 2, col: 2 },
      { row: 2, col: 3 },
    ]);
  });


  test('Drag-Select 2×4: acht Cells', () => {
    // Pointer liegt in Zeile 1 / Spalte 3 → Rechteck (0,0) bis (1,3).
    // Audit 🟡 #26: Threshold wird im Move 175/75 deutlich gerissen.
    const { result } = renderHook(() => useCellSelection([], CELL));
    act(() => result.current.handlePointerDown(0, 0, ...down(0, 0)));
    act(() => result.current.handlePointerMove(175, 75));
    expect(result.current.selectedCells).toHaveLength(8); // 2×4
  });

  test('handlePointerEnd beendet Drag', () => {
    const { result } = renderHook(() => useCellSelection([], CELL));
    act(() => result.current.handlePointerDown(0, 0, ...down(0, 0)));
    act(() => result.current.handlePointerEnd());
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragStart).toBeNull();
  });

  test('clearSelection leert alles', () => {
    const { result } = renderHook(() => useCellSelection([], CELL));
    act(() => result.current.handlePointerDown(1, 1, ...down(1, 1)));
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
    jest.useFakeTimers();
    try {
      act(() => result.current.handlePointerDown(0, 0, ...down(0, 0)));
      act(() => { jest.advanceTimersByTime(150); });
      act(() => result.current.handlePointerDown(0, 0, ...down(0, 0)));
      expect(result.current.selectedCells).toHaveLength(3);
    } finally {
      jest.useRealTimers();
    }
  });

  test('Zwei Taps auf gleiche Cell, aber >300ms auseinander: kein Doppel-Tipp', () => {
    const cageA: Cage = { id: 'a', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }], sum: 6, color: 'blue.100' };
    const { result } = renderHook(() => useCellSelection([cageA], CELL));
    jest.useFakeTimers();
    try {
      act(() => result.current.handlePointerDown(0, 0, ...down(0, 0)));
      act(() => { jest.advanceTimersByTime(500); });
      act(() => result.current.handlePointerDown(0, 0, ...down(0, 0)));
      expect(result.current.selectedCells).toEqual([{ row: 0, col: 0 }]);
    } finally {
      jest.useRealTimers();
    }
  });

  test('Zwei Taps auf verschiedene Cells in <300ms: kein Doppel-Tipp', () => {
    const cageA: Cage = { id: 'a', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], sum: 3, color: 'blue.100' };
    const { result } = renderHook(() => useCellSelection([cageA], CELL));
    jest.useFakeTimers();
    try {
      act(() => result.current.handlePointerDown(0, 0, ...down(0, 0)));
      act(() => { jest.advanceTimersByTime(150); });
      act(() => result.current.handlePointerDown(0, 1, ...down(0, 1)));
      expect(result.current.selectedCells).toEqual([{ row: 0, col: 1 }]);
    } finally {
      jest.useRealTimers();
    }
  });

  // Audit 🔴 #5: Drag-to-Touch-Layer. User down(0,0), drag nach (1,1),
  // dann ohne handlePointerEnd direkt down(2,2). Vorher: isDragging hing
  // auf true, neuer Down überschrieb Selection unkoordiniert; nach dem
  // Fix: handlePointerDown ruft handlePointerEnd auf, sauberer Übergang.
  test('Mid-Drag-Tap beendet laufenden Drag (Audit 🔴 #5)', () => {
    const { result } = renderHook(() => useCellSelection([], CELL));
    act(() => result.current.handlePointerDown(0, 0, ...down(0, 0)));
    // Drag in Bewegung simulieren (Move-Handler) — muss isDragging noch
    // true und selectedCells auf Rechteck 0,0 → 2,2.
    act(() => result.current.handlePointerMove(125, 125));
    expect(result.current.isDragging).toBe(true);
    expect(result.current.selectedCells.length).toBeGreaterThan(1);

    // User drückt — ohne Loslassen — auf eine andere Zelle.
    act(() => result.current.handlePointerDown(4, 4, ...down(4, 4)));

    // Audit-Fix: Drag-State wurde sauber beendet, neuer Drag ist Single-Cell.
    // Audit 🟡 #26: isDragging bleibt nach dem frischen Down false — wartet
    // auf das nächste Move, das den Threshold reißt.
    expect(result.current.isDragging).toBe(false);
    expect(result.current.selectedCell).toEqual({ row: 4, col: 4 });
    expect(result.current.selectedCells).toEqual([{ row: 4, col: 4 }]);
    expect(result.current.dragStart).toEqual({ row: 4, col: 4 });
  });

  test('Einfacher Down ohne Drag-Vorgeschichte: handlePointerEnd nicht aufgerufen', () => {
    const { result } = renderHook(() => useCellSelection([], CELL));
    // Erster Down — kein Drag läuft, Audit-Fix-Branch darf nicht in den
    // negativen Pfad laufen.
    // Audit 🟡 #26: isDragging bleibt false bis Threshold-Riss im Move.
    act(() => result.current.handlePointerDown(2, 3, ...down(2, 3)));
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragStart).toEqual({ row: 2, col: 3 });
  });
});
