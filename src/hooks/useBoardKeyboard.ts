import { useCallback, useEffect } from 'react';
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
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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

      if (normalizedKey === 'ArrowUp' && row > 0) next.row = row - 1;
      else if (normalizedKey === 'ArrowDown' && row < size - 1) next.row = row + 1;
      else if (normalizedKey === 'ArrowLeft' && col > 0) next.col = col - 1;
      else if (normalizedKey === 'ArrowRight' && col < size - 1) next.col = col + 1;
      else if (normalizedKey === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          if (col > 0) next.col = col - 1;
          else if (row > 0) {
            next.row = row - 1;
            next.col = size - 1;
          } else {
            next.row = size - 1;
            next.col = size - 1;
          }
        } else {
          if (col < size - 1) next.col = col + 1;
          else if (row < size - 1) {
            next.row = row + 1;
            next.col = 0;
          } else {
            next.row = 0;
            next.col = 0;
          }
        }
      } else if (/^[1-9]$/.test(e.key)) {
        onNumber(parseInt(e.key, 10));
        return;
      } else if (['Backspace', 'Delete', '0'].includes(e.key)) {
        onClear();
        return;
      }

      if (next.row !== row || next.col !== col) {
        setSelectedCell(next);
        if (!e.shiftKey) {
          setSelectedCells([next]);
          setDragStart(null);
        }
      }
    },
    [selectedCell, size, setSelectedCell, setSelectedCells, setDragStart, onNumber, onClear]
  );

  useEffect(() => {
    // Fokus auf das Board-Element, sobald der User mit dem Brett interagiert:
    //   • selectedCell gesetzt → Single-Tap oder Käfig-Doppel-Tipp.
    //   • selectedCells nicht-leer → Drag-Auswahl (selectedCell bleibt die
    //     Startzelle und ändert sich beim Wachsen des Rechtecks NICHT mehr).
    // Ohne den Drag-Pfad verliert das Brett den Fokus nie wieder, sobald der
    // User per Drag selektiert — Tastatur-Eingaben (Ziffern/Pfeile) laufen
    // dann ins Leere, weil der DOM-Fokus auf body oder einem Action-Button
    // liegt.
    // ponytail: idempotentes .focus() auf bereits-fokussiertem Element ist
    // ein No-Op im Browser — die Häufigkeit (Drag-Move) ist kein Cost.
    const boardEl = document.querySelector<HTMLElement>('[data-board-root="true"]');
    if ((selectedCell || selectedCells.length > 0) && boardEl) {
      boardEl.focus();
    }
  }, [selectedCell, selectedCells]);

  useEffect(() => {
    // Initial-Auswahl der ersten Zelle, sobald das Brett interaktionsbereit
    // ist (Level geladen) und noch nichts selektiert wurde. Damit greifen
    // Pfeile/WASD/Tab/Ziffern sofort — der User muss nicht erst eine Zelle
    // antippen, um den Brett-Fokus zu aktivieren. Der bestehende
    // selectedCell-Effekt oben setzt dann den DOM-Fokus automatisch.
    if (!selectedCell && selectedCells.length === 0) {
      const boardEl = document.querySelector<HTMLElement>('[data-board-root="true"]');
      // Nur initialisieren, wenn das Brett wirklich da ist (nicht während
      // Loading/No-Level). data-board-root-Query ist implizit der
      // Existenz-Check.
      if (boardEl) {
        const first = { row: 0, col: 0 };
        setSelectedCell(first);
        setSelectedCells([first]);
      }
    }
    // Bewusst KEINE Deps auf selectedCell/selectedCells — der Effekt soll
    // nur einmalig beim Mount/Level-Wechsel laufen und nicht bei jedem
    // Selection-Wechsel erneut feuern. Die "no-op-if-already-set"-Logik
    // oben verhindert Endlosschleifen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { handleKeyDown };
};

export default useBoardKeyboard;