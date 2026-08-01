import { useState, useCallback } from 'react';
import { CellPosition, Cage } from '../types/gameTypes';
import { getCageForCell } from '../services/gameLogicService';

export interface UseCellSelectionResult {
  selectedCell: CellPosition | null;
  selectedCells: CellPosition[];
  isDragging: boolean;
  dragStart: CellPosition | null;
  handleDragStart: (row: number, col: number) => void;
  handleDragEnter: (row: number, col: number) => void;
  handleDragEnd: () => void;
  /** Doppelklick / Doppeltipp: markiert den Käfig der Cell (oder nur die Cell, falls käfig-los). */
  handleDoubleClick: (row: number, col: number) => void;
  clearSelection: () => void;
  /** Setter exportiert, damit externe Hooks (Keyboard) die Auswahl mutieren können. */
  setSelectedCell: (cell: CellPosition | null) => void;
  setSelectedCells: (cells: CellPosition[]) => void;
  setDragStart: (cell: CellPosition | null) => void;
}

/**
 * Verwaltet die Zellauswahl per Drag/Touch/Click.
 *
 * Selection-Semantik:
 * - Single-Click markiert die angeklickte Cell.
 * - Drag markiert das Rechteck vom Start bis zur aktuellen Mausposition
 *   (1×1, 1×2, 2×2, 2×4 usw. — freie Auswahl, kein Cage-Constraint).
 *   Cage-Validität greift erst beim Zahl-Eingeben in useBoardGameLogic.
 * - Doppelklick / Doppeltipp markiert den gesamten Käfig der Cell.
 */
export const useCellSelection = (cages: Cage[]): UseCellSelectionResult => {
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [dragStart, setDragStart] = useState<CellPosition | null>(null);
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback((row: number, col: number) => {
    const cellPosition = { row, col };
    setSelectedCell(cellPosition);
    setDragStart(cellPosition);
    setSelectedCells([cellPosition]);
    setIsDragging(true);
  }, []);

  const handleDragEnter = useCallback(
    (row: number, col: number) => {
      if (!isDragging || !dragStart) return;

      // Freies Rechteck vom dragStart bis zur aktuellen Position.
      // Cage-Constraint entfällt — User kann beliebige 1×1, 1×2, 2×2,
      // 2×4 etc. markieren. Validität gegen Käfig-Regeln greift erst
      // beim Zahl-Eingeben (applyPlayerEntry).
      const minRow = Math.min(dragStart.row, row);
      const maxRow = Math.max(dragStart.row, row);
      const minCol = Math.min(dragStart.col, col);
      const maxCol = Math.max(dragStart.col, col);

      const next: CellPosition[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          next.push({ row: r, col: c });
        }
      }
      setSelectedCells(next);
    },
    [dragStart, isDragging]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleDoubleClick = useCallback(
    (row: number, col: number) => {
      const cellPosition = { row, col };
      const cage = getCageForCell(cages, row, col);
      const cells: CellPosition[] = cage ? [...cage.cells] : [cellPosition];
      setSelectedCell(cellPosition);
      setDragStart(null);
      setSelectedCells(cells);
      setIsDragging(false);
    },
    [cages]
  );

  const clearSelection = useCallback(() => {
    setSelectedCell(null);
    setSelectedCells([]);
    setDragStart(null);
    setIsDragging(false);
  }, []);

  return {
    selectedCell,
    selectedCells,
    isDragging,
    dragStart,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    handleDoubleClick,
    clearSelection,
    setSelectedCell,
    setSelectedCells,
    setDragStart
  };
};

export default useCellSelection;