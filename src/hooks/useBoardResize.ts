import { useState, useEffect, useRef } from 'react';

export interface UseBoardResizeOptions {
  /** Container-Ref, dessen Größe gemessen wird. */
  boardRef: React.RefObject<HTMLDivElement | null>;
  /** Maximale Zellgröße je Breakpoint (z. B. von useBreakpointValue). */
  cellSizeByBreakpoint: number;
  /** Anzahl Zellen pro Zeile/Spalte. */
  size: number;
}

export interface UseBoardResizeResult {
  cellSize: number;
}

/**
 * Berechnet die responsive Zellgröße eines NxN-Boards.
 *
 * Logik:
 * - Misst die verfügbare Breite/Höhe im Container.
 * - Wählt das Minimum aus (Breite/size, Höhe/size) für quadratische Zellen.
 * - Cap durch `cellSizeByBreakpoint` (per Breakpoint konfiguriert).
 * - Stabilisierungs-Logik gegen Resize-Flacker.
 */
export const useBoardResize = ({
  boardRef,
  cellSizeByBreakpoint,
  size
}: UseBoardResizeOptions): UseBoardResizeResult => {
  const [cellSize, setCellSize] = useState<number>(50);
  const cellSizeRef = useRef(cellSize);

  useEffect(() => {
    cellSizeRef.current = cellSize;
  }, [cellSize]);

  useEffect(() => {
    let resizeAttempts = 0;
    const maxResizeAttempts = 3;
    let lastCellSize = cellSizeRef.current;
    let stabilizationTimer: ReturnType<typeof setTimeout> | null = null;
    let onResize: (() => void) | null = null;

    const handleResize = () => {
      const node = boardRef.current;
      if (!node) return;

      // Viewport-basiert messen, nicht die Box selbst — sonst Self-Lock auf
      // kleine Cell-Größen im Landscape, weil die Box nur so groß ist wie
      // das aktuelle Grid.
      const viewportSide = Math.min(window.innerWidth, window.innerHeight);
      const viewportMaxCell = Math.floor((viewportSide * 0.92) / size);
      const minSize = window.innerWidth < 768 ? 24 : 28;
      const newCellSize = Math.max(minSize, Math.min(viewportMaxCell, cellSizeByBreakpoint));

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

    const initialDelayTimer = setTimeout(() => {
      handleResize();

      onResize = () => {
        resizeAttempts = 0;
        if (stabilizationTimer) clearTimeout(stabilizationTimer);
        handleResize();
      };
      window.addEventListener('resize', onResize);
    }, 300);

    return () => {
      clearTimeout(initialDelayTimer);
      if (stabilizationTimer) clearTimeout(stabilizationTimer);
      if (onResize) window.removeEventListener('resize', onResize);
    };
  }, [boardRef, cellSizeByBreakpoint, size]);

  return { cellSize };
};

export default useBoardResize;