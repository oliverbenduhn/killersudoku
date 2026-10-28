import { useState, useEffect, useLayoutEffect, useRef } from 'react';

export interface UseBoardResizeOptions {
  /** Container-Ref, dessen Größe gemessen wird. */
  boardRef: React.RefObject<HTMLDivElement | null>;
  /** Maximale Zellgröße je Breakpoint (z. B. von useBreakpointValue). */
  cellSizeByBreakpoint: number;
  /** Anzahl Zellen pro Zeile/Spalte. */
  size: number;
  isReady?: boolean;
}

export interface UseBoardResizeResult {
  cellSize: number;
}

/**
 * Berechnet die responsive Zellgröße eines NxN-Boards.
 *
 * Logik:
 * - Uses content width and viewport height minus header space.
 * - Short screens can scroll to the controls without shrinking the grid excessively.
 * - Cap durch `cellSizeByBreakpoint` (per Breakpoint konfiguriert).
 * - Stabilisierungs-Logik gegen Resize-Flacker.
 */
export const useBoardResize = ({
  boardRef,
  cellSizeByBreakpoint,
  size,
  isReady = true
}: UseBoardResizeOptions): UseBoardResizeResult => {
  const [cellSize, setCellSize] = useState<number>(50);
  const cellSizeRef = useRef(cellSize);

  useEffect(() => {
    cellSizeRef.current = cellSize;
  }, [cellSize]);

  useLayoutEffect(() => {
    let resizeAttempts = 0;
    const maxResizeAttempts = 3;
    let lastCellSize = cellSizeRef.current;
    let stabilizationTimer: ReturnType<typeof setTimeout> | null = null;
    let onResize: (() => void) | null = null;

    const handleResize = () => {
      const node = boardRef.current;
      if (!node) return;

      // clientWidth includes padding, which is not available to the cell grid.
      const cs = window.getComputedStyle(node);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const contentW = node.clientWidth - padX;
      // Width is constrained by layout; height must reserve room for controls.
      const containerMaxCell = contentW > 0 ? Math.floor(contentW / size) : Infinity;
      const reservedHeightPx = 120;
      const viewportMaxCell = Math.floor(Math.max(216, window.innerHeight - reservedHeightPx) / size);
      const maxCell = Math.min(viewportMaxCell, containerMaxCell, cellSizeByBreakpoint);
      const newCellSize = Math.max(window.innerWidth < 768 ? 24 : 28, maxCell);

      if (Math.abs(newCellSize - lastCellSize) < 2 || resizeAttempts >= maxResizeAttempts) {
        if (Math.abs(newCellSize - cellSizeRef.current) >= 2) {
          setCellSize(newCellSize);
        }
        resizeAttempts = 0;
        if (stabilizationTimer) clearTimeout(stabilizationTimer);
        return;
      }

      lastCellSize = newCellSize;
      resizeAttempts += 1;
      setCellSize(newCellSize);

      if (stabilizationTimer) clearTimeout(stabilizationTimer);
      stabilizationTimer = setTimeout(handleResize, 50);
    };

    handleResize();
    onResize = () => {
      resizeAttempts = 0;
      if (stabilizationTimer) clearTimeout(stabilizationTimer);
      handleResize();
    };
    window.addEventListener('resize', onResize);

    return () => {
      if (stabilizationTimer) clearTimeout(stabilizationTimer);
      if (onResize) window.removeEventListener('resize', onResize);
    };
  }, [boardRef, cellSizeByBreakpoint, size, isReady]);

  return { cellSize };
};

export default useBoardResize;