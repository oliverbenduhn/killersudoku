import { useCallback, useRef } from 'react';
import { CellPosition } from '../types/gameTypes';

export interface UseBoardKeyboardOptions {
  selectedCell: CellPosition | null;
  /** Drag-Multi-Selection. Der Fokus-Effekt reagiert auf beide Slots, weil
   *  selectedCell beim Wachsen der Drag-Auswahl unverändert bleibt (Startzelle). */
  selectedCells: CellPosition[];
  setSelectedCell: (cell: CellPosition | null) => void;
  setSelectedCells: (cells: CellPosition[]) => void;
  setDragStart: (cell: CellPosition | null) => void;
  onNumber: (n: number) => void;
  onClear: () => void;
  size: number;
}

const ARROW_KEY_MAP: Record<string, string> = {
  w: 'ArrowUp',
  a: 'ArrowLeft',
  s: 'ArrowDown',
  d: 'ArrowRight'
};

/**
 * Tastatur-Navigation + Zahleneingabe auf dem Board.
 *
 * Pfeile (auch WASD), Tab, Shift+Tab, Zahlen 1-9, Backspace/Delete/0.
 */
export const useBoardKeyboard = ({
  selectedCell,
  selectedCells,
  setSelectedCell,
  setSelectedCells,
  setDragStart,
  onNumber,
  onClear,
  size
}: UseBoardKeyboardOptions): { handleKeyDown: (e: React.KeyboardEvent) => void } => {
  // Shift-Selection-Anker: bleibt über mehrere Shift+Pfeil-Calls hinweg
  // gleich, bis eine Bewegung OHNE Shift folgt (dann wird der Anker
  // gelöscht und ein neuer Zyclus beginnt). Modell: Anker = dort, wo der
  // User Shift gedrückt hat; Cursor = aktuelle selectedCell.
  const shiftAnchorRef = useRef<CellPosition | null>(null);
  const keyboardSelectionRef = useRef(selectedCells);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Tab' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if (selectedCells !== keyboardSelectionRef.current) shiftAnchorRef.current = null;
      if (!selectedCell) {
        const first = { row: 0, col: 0 };
        setSelectedCell(first);
        setSelectedCells([first]);
        return;
      }

      const lower = e.key.toLowerCase();
      const normalizedKey = ARROW_KEY_MAP[lower] ?? e.key;

      const { row, col } = selectedCell;
      const next: CellPosition = { ...selectedCell };
      if (normalizedKey.startsWith('Arrow')) e.preventDefault();

      if (normalizedKey === 'ArrowUp' && row > 0) next.row = row - 1;
      else if (normalizedKey === 'ArrowDown' && row < size - 1) next.row = row + 1;
      else if (normalizedKey === 'ArrowLeft' && col > 0) next.col = col - 1;
      else if (normalizedKey === 'ArrowRight' && col < size - 1) next.col = col + 1;
      else if (/^[1-9]$/.test(e.key)) {
        onNumber(parseInt(e.key, 10));
        return;
      } else if (['Backspace', 'Delete', '0'].includes(e.key)) {
        onClear();
        return;
      }

      if (next.row !== row || next.col !== col) {
        if (e.shiftKey) {
          // Shift+Pfeil: Rechteck vom Anker bis zum neuen Endpunkt (next).
          // Anker = dort, wo Shift gedrückt wurde (bleibt über mehrere
          // Shift+Pfeil-Calls hinweg). Cursor = selectedCell (bewegt sich).
          // Semantik identisch zu Maus-Drag (Anker fest, Cursor beweglich)
          // und zu Excel/Sheets-Sheet-Selection.
          if (!shiftAnchorRef.current) {
            shiftAnchorRef.current = selectedCell;
          }
          const anchor = shiftAnchorRef.current;
          const minRow = Math.min(anchor.row, next.row);
          const maxRow = Math.max(anchor.row, next.row);
          const minCol = Math.min(anchor.col, next.col);
          const maxCol = Math.max(anchor.col, next.col);
          const rect: CellPosition[] = [];
          for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              rect.push({ row: r, col: c });
            }
          }
          keyboardSelectionRef.current = rect;
          setSelectedCells(rect);
          setDragStart(anchor);
          // Cursor (= selectedCell) bewegt sich auf next.
          setSelectedCell(next);
        } else {
          // Normale Pfeilbewegung: Shift-Anker verwerfen, Cursor + Selection
          // auf next.
          shiftAnchorRef.current = null;
          setSelectedCell(next);
          const single = [next];
          keyboardSelectionRef.current = single;
          setSelectedCells(single);
          setDragStart(null);
        }
      }
    },
    [selectedCell, selectedCells, size, setSelectedCell, setSelectedCells, setDragStart, onNumber, onClear]
  );

  return { handleKeyDown };
};

export default useBoardKeyboard;