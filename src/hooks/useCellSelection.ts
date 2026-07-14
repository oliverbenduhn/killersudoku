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
  clearSelection: () => void;
  /** Setter exportiert, damit externe Hooks (Keyboard) die Auswahl mutieren können. */
  setSelectedCell: (cell: CellPosition | null) => void;
  setSelectedCells: (cells: CellPosition[]) => void;
  setDragStart: (cell: CellPosition | null) => void;
}

/**
 * Verwaltet die Zellauswahl per Drag/Touch/Click.
 *
 * Wichtige Eigenschaft:
 * - Mehrfachauswahl wird automatisch auf den Käfig der Startzelle beschränkt,
 *   weil Killer-Sudoku doppelte Werte innerhalb eines Käfigs verbietet.
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

      // Nur Zellen innerhalb des Käfigs der Startzelle zulassen.
      const startCage = getCageForCell(cages, dragStart.row, dragStart.col);
      const inCage = (r: number, c: number) =>
        startCage?.cells.some(cell => cell.row === r && cell.col === c) ?? true;

      const minRow = Math.min(dragStart.row, row);
      const maxRow = Math.max(dragStart.row, row);
      const minCol = Math.min(dragStart.col, col);
      const maxCol = Math.max(dragStart.col, col);

      const next: CellPosition[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          if (inCage(r, c)) {
            next.push({ row: r, col: c });
          }
        }
      }
      setSelectedCells(next);
    },
    [cages, dragStart, isDragging]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

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
    clearSelection,
    setSelectedCell,
    setSelectedCells,
    setDragStart
  };
};

export default useCellSelection;