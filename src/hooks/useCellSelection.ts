import { useState, useCallback, useRef, useEffect } from 'react';
import { CellPosition, Cage } from '../types/gameTypes';
import { getCageForCell } from '../services/gameLogicService';

export interface UseCellSelectionResult {
  selectedCell: CellPosition | null;
  selectedCells: CellPosition[];
  isDragging: boolean;
  dragStart: CellPosition | null;
  /** Pointer-Down auf einer Cell. Vereinheitlicht Maus + Touch. Erkennt
   *  Doppel-Tipp via Zeitfenster (<300ms auf derselben Cell).
   *  (x, y) sind die Pixel der Pointer-Position relativ zum Board-
   *  Ursprung; die Hook speichert sie, um beim Move den Cursor-Versatz
   *  innerhalb der Startzelle zu kennen (für die 50%-Schwelle). */
  handlePointerDown: (row: number, col: number, x: number, y: number) => void;
  /** Pointer-Move: aktualisiert die Drag-Rechteck-Auswahl.
   *  (x, y) sind die Pointer-Pixel relativ zum Board-Ursprung. Die Hook
   *  entscheidet daraus, welche Zellen ins Rechteck gehören — der
   *  Surface kennt nur die Geometrie, nicht die Selection-Logik. */
  handlePointerMove: (x: number, y: number) => void;
  /** Pointer-Up / Pointer-Cancel: beendet den Drag. */
  handlePointerEnd: () => void;
  /** Reines Doppelklick-Event (Maus). Auf Touch wird handlePointerDown
   *  genutzt, weil Pointer-Events kein dblclick-Äquivalent haben. */
  handleDoubleClick: (row: number, col: number) => void;
  clearSelection: () => void;
  /** Setter exportiert, damit externe Hooks (Keyboard) die Auswahl mutieren können. */
  setSelectedCell: (cell: CellPosition | null) => void;
  setSelectedCells: (cells: CellPosition[]) => void;
  setDragStart: (cell: CellPosition | null) => void;
}

/** Zeitfenster für Doppel-Tipp-Erkennung in Millisekunden. */
const DOUBLE_TAP_MS = 300;

/**
 * Verwaltet die Zellauswahl per Pointer-Events (Maus + Touch + Stylus).
 *
 * Selection-Semantik:
 * - Single-Tap markiert die angetippte Cell.
 * - Drag markiert das Rechteck vom Start bis zur aktuellen Pointer-Position
 *   (1×1, 1×2, 2×2, 2×4 usw. — freie Auswahl, kein Cage-Constraint).
 *   Cage-Validität greift erst beim Zahl-Eingeben in useBoardGameLogic.
 * - Doppel-Tipp / Doppelklick markiert den gesamten Käfig der Cell.
 */
export const useCellSelection = (cages: Cage[], cellSize: number): UseCellSelectionResult => {
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [dragStart, setDragStart] = useState<CellPosition | null>(null);
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  // Ref-Mirror von dragStart + isDragging, damit handlePointerMove im
  // selben React-Batch wie handlePointerDown den frischen Wert sieht
  // (sonst Race: setIsDragging(true) → setSelectedCells → setIsDragging
  // ist im nächsten Closure noch false, Move wird geschluckt).
  // ponytail: useRef synchron, ohne Re-Render.
  const dragStartRef = useRef<CellPosition | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  useEffect(() => { dragStartRef.current = dragStart; }, [dragStart]);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);
  // Letzter Tap-Zeitpunkt + Zelle für Doppel-Tipp-Detection.
  const lastTapRef = useRef<{ time: number; cell: CellPosition | null }>({
    time: 0,
    cell: null,
  });
  // Pixel-Position des Pointer-Down innerhalb der Startzelle (relativ zum
  // Board-Ursprung). Damit können wir beim Move exakt bestimmen, wie weit
  // der Cursor in eine Nachbarzelle eingedrungen ist — die Selection
  // reagiert erst, wenn die Mitte der Nachbarzelle überschritten ist.
  const pointerDownPxRef = useRef<{ x: number; y: number } | null>(null);

  const selectCage = useCallback(
    (row: number, col: number) => {
      const cellPosition = { row, col };
      const cage = getCageForCell(cages, row, col);
      const cells: CellPosition[] = cage ? [...cage.cells] : [cellPosition];
      setSelectedCell(cellPosition);
      setDragStart(null);
      dragStartRef.current = null;
      setSelectedCells(cells);
      setIsDragging(false);
      isDraggingRef.current = false;
    },
    [cages]
  );

  const handlePointerDown = useCallback(
    (row: number, col: number, x: number, y: number) => {
      const cellPosition = { row, col };
      const now = Date.now();
      const last = lastTapRef.current;

      // Doppel-Tipp: gleiche Cell + innerhalb DOUBLE_TAP_MS → Käfig wählen.
      if (
        last.cell &&
        last.cell.row === row &&
        last.cell.col === col &&
        now - last.time < DOUBLE_TAP_MS
      ) {
        lastTapRef.current = { time: 0, cell: null };
        pointerDownPxRef.current = null;
        selectCage(row, col);
        return;
      }

      // Sonst: Single-Tap / Drag-Start.
      lastTapRef.current = { time: now, cell: cellPosition };
      setSelectedCell(cellPosition);
      setDragStart(cellPosition);
      dragStartRef.current = cellPosition;
      pointerDownPxRef.current = { x, y };
      setSelectedCells([cellPosition]);
      setIsDragging(true);
      isDraggingRef.current = true;
    },
    [selectCage]
  );

  const handlePointerMove = useCallback(
    (x: number, y: number) => {
      // Ref-Lesung statt State-Closure, damit Move im selben Batch wie
      // Down den frischen dragStart/isDragging sieht.
      const ds = dragStartRef.current;
      const pdown = pointerDownPxRef.current;
      const dragging = isDraggingRef.current;
      if (!dragging || !ds || !pdown) return;

      // Rechteck wächst nur, wenn der Cursor die Hälfte einer Zelle in
      // der jeweiligen Achse durchquert hat. Verhindert, dass ein paar
      // Pixel Maus-Wackeln über die Zellgrenze sofort das volle
      // Rechteck auslöst — der User muss die Nachbarzelle wirklich
      // "betreten", nicht nur streifen.
      //
      // Wirkung pro Achse:
      //  - in derselben Achse (x vs pdown.x): kein Wachstum in x
      //  - nach rechts gewandert UND Mitte der nächsten Spalte erreicht
      //    → Spalte wächst um 1
      //  - nach links gewandert UND Mitte der vorherigen Spalte erreicht
      //    → Spalte wächst um 1 nach links
      //  - y analog
      // ponytail: Schwellwert 50% ist Standard für Cursor-zu-Zell-Mapping
      // (matches HTML hit-testing). Wer ein anderes Threshold will, hier
      // den Faktor tauschen.
      const half = cellSize / 2;

      // Spaltenreichweite ausgehend von der Down-Spalte.
      let minCol = ds.col;
      let maxCol = ds.col;
      // Nach rechts: wie weit ist der Cursor in eine rechts-liegende
      // Zelle eingedrungen? x in Pixel der Cursor-Position.
      // Erste Schwelle: Cursor muss mind. half in der Spalte ds.col+1 sein,
      // also x > ds.col*cellSize + cellSize + half = (ds.col+1.5)*cellSize.
      const rightEdge = (ds.col + 1) * cellSize + half; // Mitte Spalte ds.col+1
      const leftEdge = ds.col * cellSize - half;         // Mitte Spalte ds.col-1
      const downEdge = (ds.row + 1) * cellSize + half;  // Mitte Zeile ds.row+1
      const upEdge = ds.row * cellSize - half;           // Mitte Zeile ds.row-1

      if (x >= rightEdge) {
        // Wie viele Spalten nach rechts?
        const delta = x - rightEdge;
        const extra = Math.floor(delta / cellSize) + 1;
        maxCol = ds.col + extra;
      } else if (x <= leftEdge) {
        const delta = leftEdge - x;
        const extra = Math.floor(delta / cellSize) + 1;
        minCol = ds.col - extra;
      }
      // Sonst: Cursor innerhalb der Start-Spalte → minCol = maxCol = ds.col.

      let minRow = ds.row;
      let maxRow = ds.row;
      if (y >= downEdge) {
        const delta = y - downEdge;
        const extra = Math.floor(delta / cellSize) + 1;
        maxRow = ds.row + extra;
      } else if (y <= upEdge) {
        const delta = upEdge - y;
        const extra = Math.floor(delta / cellSize) + 1;
        minRow = ds.row - extra;
      }

      const next: CellPosition[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          next.push({ row: r, col: c });
        }
      }
      setSelectedCells(next);
    },
    [cellSize]
  );

  const handlePointerEnd = useCallback(() => {
    setIsDragging(false);
    isDraggingRef.current = false;
    setDragStart(null);
    dragStartRef.current = null;
    pointerDownPxRef.current = null;
  }, []);

  const handleDoubleClick = useCallback(
    (row: number, col: number) => {
      selectCage(row, col);
    },
    [selectCage]
  );

  const clearSelection = useCallback(() => {
    setSelectedCell(null);
    setSelectedCells([]);
    setDragStart(null);
    dragStartRef.current = null;
    pointerDownPxRef.current = null;
    setIsDragging(false);
    isDraggingRef.current = false;
    lastTapRef.current = { time: 0, cell: null };
  }, []);

  return {
    selectedCell,
    selectedCells,
    isDragging,
    dragStart,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
    handleDoubleClick,
    clearSelection,
    setSelectedCell,
    setSelectedCells,
    setDragStart
  };
};

export default useCellSelection;