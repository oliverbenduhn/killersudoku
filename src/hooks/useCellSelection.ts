import { useState, useCallback, useRef, useEffect } from 'react';
import { CellPosition, Cage } from '../types/gameTypes';
import { getCageForCell } from '../services/gameLogicService';

export interface UseCellSelectionResult {
  selectedCell: CellPosition | null;
  selectedCells: CellPosition[];
  isDragging: boolean;
  dragStart: CellPosition | null;
  /** Pointer-Down auf einer Cell. Vereinheitlicht Maus + Touch. Erkennt
   *  Doppel-Tipp via Zeitfenster (<300ms auf derselben Cell). */
  handlePointerDown: (row: number, col: number) => void;
  /** Pointer-Move: aktualisiert die Drag-Rechteck-Auswahl. */
  handlePointerMove: (row: number, col: number) => void;
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
export const useCellSelection = (cages: Cage[]): UseCellSelectionResult => {
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
    (row: number, col: number) => {
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
        selectCage(row, col);
        return;
      }

      // Sonst: Single-Tap / Drag-Start.
      lastTapRef.current = { time: now, cell: cellPosition };
      setSelectedCell(cellPosition);
      setDragStart(cellPosition);
      dragStartRef.current = cellPosition;
      setSelectedCells([cellPosition]);
      setIsDragging(true);
      isDraggingRef.current = true;
    },
    [selectCage]
  );

  const handlePointerMove = useCallback(
    (row: number, col: number) => {
      // Ref-Lesung statt State-Closure, damit Move im selben Batch wie
      // Down den frischen dragStart/isDragging sieht.
      const ds = dragStartRef.current;
      const dragging = isDraggingRef.current;
      if (!dragging || !ds) return;

      // Freies Rechteck vom dragStart bis zur aktuellen Position.
      // Cage-Constraint entfällt — User kann beliebige 1×1, 1×2, 2×2,
      // 2×4 etc. markieren. Validität gegen Käfig-Regeln greift erst
      // beim Zahl-Eingeben (applyPlayerEntry).
      const minRow = Math.min(ds.row, row);
      const maxRow = Math.max(ds.row, row);
      const minCol = Math.min(ds.col, col);
      const maxCol = Math.max(ds.col, col);

      const next: CellPosition[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          next.push({ row: r, col: c });
        }
      }
      setSelectedCells(next);
    },
    []
  );

  const handlePointerEnd = useCallback(() => {
    setIsDragging(false);
    isDraggingRef.current = false;
    setDragStart(null);
    dragStartRef.current = null;
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