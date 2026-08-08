// BoardSurface — die drei Rendering-Schichten des Bretts.
//
// Pure presentational component: nimmt einen BoardViewModel + Callbacks und
// rendert die drei Schichten (Flächen / Linien / Zahlen), exakt wie ADR 0001
// es vorschreibt. Keine Hooks, kein State, keine Side-Effects. Der Hook-
// Orchestrator in Board.tsx baut den ViewModel und reicht ihn weiter.
//
// Bewusst NICHT extrahiert sind: Hook-Orchestrierung (Board.tsx), Sidebar
// (NumberPad + Action-Buttons), Modals (Game-Over-Banner, Solved-Banner),
// Solve-Detection. Das alles hängt am Game-Lifecycle; das Surface nicht.

import React from 'react';
import { Box, Grid, Text, keyframes } from '@chakra-ui/react';

import { Cage, CellPosition, GameLevel } from '../../types/gameTypes';
import * as GameLogic from '../../services/gameLogicService';
import { cageOutlinePath } from './cageOutline';
import { UseCellAnimationResult } from '../../hooks/useCellAnimation';

const cssVar = (token: string): string =>
  `var(--chakra-colors-${token.replace(/\./g, '-')})`;

const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const successAnimation = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

const errorAnimation = keyframes`
  0% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  50% { transform: translateX(3px); }
  75% { transform: translateX(-3px); }
  100% { transform: translateX(0); }
`;

const fadeInAnimation = keyframes`
  0% { opacity: 0; transform: translateY(-2px); }
  100% { opacity: 1; transform: translateY(0); }
`;

export interface BoardSurfaceProps {
  /** Aktuelle Zellauswahl. */
  selectedCell: CellPosition | null;
  /** Mehrfachauswahl (Drag-Operationen). */
  selectedCells: CellPosition[];
  /** Größe des Bretts (üblicherweise 9). */
  size: number;
  /** Aktuelle Brett-Zellenwerte. */
  cellValues: number[][];
  /** Notizen des Spielers. */
  notes: number[][][];
  /** Vorgaben aus dem Level. */
  initialValues: number[][];
  /** Käfige des Levels. */
  cages: Cage[];
  /** Aktuell geladenes Level (für Cage-Summen, Hint-Vergleich). */
  levelData: GameLevel;
  /** Pixel pro Zelle. */
  cellSize: number;
  /** Abstand der Käfig-Kontur von der Zellkante. */
  cageInsetPx: number;
  /** Schriftgröße der Zellwerte (Chakra-Token). */
  valueFontSize: string;
  /** Schriftgröße der Käfigsummen / Notizen. */
  sumFontSize: string;
  /** SVG-Linie-Tokens aus dem Theme. */
  themeTokens: {
    cageBorder: string;
    blockBorder: string;
  };
  /** Animationszustand der zuletzt eingegebenen Zelle. */
  animation: UseCellAnimationResult;
  /** Hint-Modus aktiv? */
  showHints: boolean;
  /** Mögliche Werte für die ausgewählte Zelle (Hint-Overlay). */
  possibleValues: number[];
  /** Käfig-Status. */
  isCageComplete: (cage: Cage) => boolean;
  /** Pointer-Down auf einer Cell. Vereinheitlicht Maus + Touch.
   *  (downX, downY) sind Pointer-Pixel relativ zur Cell — für die
   *  Hook, um den Drag-Threshold (Audit 🟡 #26) zu prüfen. */
  onCellPointerDown: (row: number, col: number, downX: number, downY: number) => void;
  /** Pointer-Move: aktualisiert die Drag-Rechteck-Auswahl.
   *  (x, y) sind die Pixel der Pointer-Position relativ zum Board. */
  onCellPointerMove: (x: number, y: number) => void;
  /** Pointer-Up / Pointer-Cancel: beendet den Drag. */
  onCellPointerEnd: () => void;
  /** Reines Doppelklick-Event (Maus). Auf Touch wird Doppel-Tipp
   *  intern im Hook via handlePointerDown-Zeitfenster erkannt. */
  onCellDoubleClick: (row: number, col: number) => void;
  /** Schwarz-Weiß-Modus aktiv (siehe CONTEXT.md). */
  blackAndWhiteMode: boolean;
}

/**
 * Die Top-Level-Cage-Zelle pro Käfig (für Käfigsummen-Rendering).
 * Sortierung stabil: oben-links vor unten-rechts.
 */
function findTopLeftCellInCage(cage: Cage): CellPosition | null {
  if (!cage?.cells?.length) return null;
  const sorted = [...cage.cells].sort((a, b) => (a.row - b.row) || (a.col - b.col));
  return sorted[0];
}

function hasSameValue(
  cellValues: number[][],
  selectedCell: CellPosition | null,
  row: number,
  col: number
): boolean {
  if (!selectedCell) return false;
  const sel = cellValues[selectedCell.row][selectedCell.col];
  const cur = cellValues[row][col];
  return sel !== 0 && sel === cur;
}

export const BoardSurface: React.FC<BoardSurfaceProps> = ({
  selectedCell,
  selectedCells,
  size,
  cellValues,
  notes,
  initialValues,
  cages,
  levelData,
  cellSize,
  cageInsetPx,
  valueFontSize,
  sumFontSize,
  themeTokens,
  animation,
  showHints,
  possibleValues,
  isCageComplete,
  onCellPointerDown,
  onCellPointerMove,
  onCellPointerEnd,
  onCellDoubleClick,
  blackAndWhiteMode,
}) => {
  // ── Flächen-Schicht (unten): Zell-Hintergrund + Interaktion ──────────────
  const renderBgCell = (row: number, col: number) => {
    const isSelected = selectedCells.some(c => c.row === row && c.col === col);
    const isSameRow = selectedCell?.row === row;
    const isSameCol = selectedCell?.col === col;
    const cage = GameLogic.getCageForCell(cages, row, col);
    const value = cellValues[row][col];
    const valid = GameLogic.isCellValid(cellValues, row, col, value, cages, size);
    const isInitialValue = initialValues[row][col] !== 0;

    let bgColor: string = 'surface.raised';
    if (cage && !blackAndWhiteMode) {
      const base = cage.color.split('.')[0] as 'blue' | 'green' | 'pink' | 'yellow';
      bgColor = `cage.${base}.100`;
    }
    if ((isSameRow || isSameCol) && (blackAndWhiteMode || !cage) && !isSelected) {
      bgColor = blackAndWhiteMode ? 'surface.sunken' : 'cell.peer.bg';
    }
    // Selektion als weiches inneres Glühen statt harter 3px-Rand: bei
    // benachbarten Zellen überlappen sich keine dicken Linien mehr, der
    // Übergang verschmilzt visuell. Mehrere inset-Shadows mit steigender
    // Spreizung und sinkender Opazität erzeugen den Schein nach innen.
    const selectionShadow = isSelected
      ? [
          'inset 0 0 0 2px var(--chakra-colors-cell-selected-border)',
          'inset 0 0 12px 2px var(--chakra-colors-cell-selected-glow)',
        ].join(', ')
      : undefined;

    const noteCandidates = notes?.[row]?.[col] ?? [];
    const pointerGridPosition = (e: React.PointerEvent<HTMLDivElement>) => {
      if (typeof e.clientX === 'number' && typeof e.clientY === 'number') {
        const cellRect = e.currentTarget.getBoundingClientRect();
        return {
          x: col * cellSize + e.clientX - cellRect.left,
          y: row * cellSize + e.clientY - cellRect.top,
        };
      }
      return {
        x: col * cellSize + cellSize / 2,
        y: row * cellSize + cellSize / 2,
      };
    };
    return (
      <Box
        key={`bg-${row}-${col}`}
        data-testid={`cell-${row}-${col}`}
        role="gridcell"
        aria-label={`Zeile ${row + 1} Spalte ${col + 1}${value ? `, Wert ${value}` : ', leer'}${isInitialValue ? ', vorgegeben' : ''}${!valid && value !== 0 ? ', ungültig' : ''}${noteCandidates.length > 0 ? `, Notizen ${noteCandidates.join(', ')}` : ''}`}
        aria-selected={isSelected}
        position="relative"
        w={`${cellSize}px`}
        h={`${cellSize}px`}
        bg={bgColor}
        // Pointer-Events vereinheitlichen Maus + Touch + Stylus. Kein
        // separates onMouse*/onTouch*-Handling mehr nötig. setPointerCapture
        // hält pointermove/up auf der Cell, auch wenn der Finger/die Maus
        // über die Cell-Grenze rutscht.
        // ponytail: touch-action: none deaktiviert Browser-Gesten
        // (Pull-to-refresh, Scroll, Pinch-Zoom) für diese Region.
        // Ohne das schluckt iOS den Drag und scrollt statt zu selektieren.
        sx={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          // setPointerCapture hält pointermove/up auf dieser Cell, auch
          // wenn der Finger/die Maus über die Cell-Grenze rutscht. Im
          // echten Browser nativ, in jsdom nicht definiert.
          // ponytail: defensive typeof-Prüfung hält Tests lauffähig.
          const el = e.currentTarget;
          if (typeof el.setPointerCapture === 'function') {
            el.setPointerCapture(e.pointerId);
          }
          // Audit 🟡 #26: downX/downY an die Hook reichen, damit sie
          // den Drag-Threshold (DRAG_THRESHOLD_PX) gegen die Down-
          // Position prüfen kann. Pixel relativ zur Cell.
          const rect = el.getBoundingClientRect();
          onCellPointerDown(row, col, e.clientX - rect.left, e.clientY - rect.top);
        }}
        onPointerMove={(e) => {
          // Mit Pointer-Capture landet pointermove auf der Start-Cell,
          // auch wenn der Finger woanders ist. Die bekannte Startzelle
          // plus deren DOM-Position ergeben weiterhin Gitterkoordinaten.
          const { x: moveX, y: moveY } = pointerGridPosition(e);
          const boardPx = size * cellSize;
          if (moveX < 0 || moveY < 0 || moveX >= boardPx || moveY >= boardPx) return;
          onCellPointerMove(moveX, moveY);
        }}
        onPointerUp={onCellPointerEnd}
        onPointerCancel={onCellPointerEnd}
        onDoubleClick={() => onCellDoubleClick(row, col)}
        cursor="pointer"
        transition="background-color 0.15s"
        style={{ boxShadow: selectionShadow }}
      />
    );
  };

  // ── Zahlen-Schicht (oben): Käfigsumme, Zellwert, Notiz-Kandidaten ────────
  const renderNumCell = (row: number, col: number) => {
    const isSelected = selectedCells.some(c => c.row === row && c.col === col);
    const isHintCell = selectedCell?.row === row && selectedCell?.col === col;
    const cage = GameLogic.getCageForCell(cages, row, col);
    const topLeftCell = cage ? findTopLeftCellInCage(cage) : null;
    const isCageStart = topLeftCell && topLeftCell.row === row && topLeftCell.col === col;

    const value = cellValues[row][col];
    const valid = GameLogic.isCellValid(cellValues, row, col, value, cages, size);
    const isInitialValue = initialValues[row][col] !== 0;
    const cageComplete = cage ? isCageComplete(cage) : false;
    const isSameValue = hasSameValue(cellValues, selectedCell, row, col);

    const errorColor: string = blackAndWhiteMode ? 'cell.given.text' : 'cell.error.text';
    const successColor: string = blackAndWhiteMode ? 'text.secondary' : 'status.success';

    const isLastEntered =
      animation.lastEnteredCell?.row === row && animation.lastEnteredCell?.col === col;
    let cellAnimation = 'none';
    if (animation.animating && isLastEntered) {
      cellAnimation = animation.lastEnteredValid
        ? `${successAnimation} 0.5s ease`
        : `${errorAnimation} 0.4s ease`;
    } else if (isSelected && !isInitialValue && !value) {
      cellAnimation = `${pulseAnimation} 1.5s infinite ease-in-out`;
    }

    return (
      <Box
        key={`num-${row}-${col}`}
        position="relative"
        w={`${cellSize}px`}
        h={`${cellSize}px`}
        pointerEvents="none"
        style={{ animation: cellAnimation }}
      >
        {isCageStart && cage && (
          <Text
            position="absolute"
            top={`${cageInsetPx + 1}px`}
            left={`${cageInsetPx + 2}px`}
            fontSize={sumFontSize}
            fontWeight="bold"
            color={cageComplete ? successColor : 'text.primary'}
            lineHeight="1"
          >
            {cage.sum}
          </Text>
        )}

        <Text
          data-testid={`value-${row}-${col}`}
          position="absolute"
          top="50%"
          left="50%"
          transform={`translate(-50%, -50%) scale(${isSameValue ? 1.15 : 1})`}
          fontSize={valueFontSize}
          fontWeight={isSameValue ? 800 : (!valid && value !== 0) ? 'bold' : 'normal'}
          color={cageComplete ? successColor : (!valid && value !== 0) ? errorColor : (isInitialValue ? 'cell.given.text' : 'cell.user.text')}
          opacity={isSameValue || cageComplete || (!valid && value !== 0) ? 1 : 0.75}
          userSelect="none"
          transition="color 0.3s, transform 0.2s, opacity 0.2s"
        >
          {value || ''}
        </Text>

        {!value && !isInitialValue &&
          !(showHints && isHintCell && possibleValues.length > 0) &&
          notes?.[row]?.[col]?.length > 0 && (
          <Box
            position="absolute"
            top={`${cageInsetPx * 2}px`}
            left={`${cageInsetPx * 2}px`}
            right={`${cageInsetPx * 2}px`}
            bottom={`${cageInsetPx * 2}px`}
            display="grid"
            gridTemplateColumns="repeat(3, 1fr)"
            gridTemplateRows="repeat(3, 1fr)"
            data-testid={`notes-${row}-${col}`}
          >
            {Array.from({ length: 9 }, (_, idx) => {
              const digit = idx + 1;
              const cellNotes = notes[row][col];
              if (!cellNotes.includes(digit)) return <Box key={digit} />;
              return (
                <Text
                  key={digit}
                  fontSize={sumFontSize}
                  color="text.muted"
                  fontWeight="normal"
                  lineHeight="1"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  aria-hidden="true"
                >
                  {digit}
                </Text>
              );
            })}
          </Box>
        )}

        {showHints && isHintCell && !value && !isInitialValue && possibleValues.length > 0 && (
          <Box
            position="absolute"
            top="2px"
            left="2px"
            right="2px"
            bottom="2px"
            display="flex"
            flexWrap="wrap"
            justifyContent="center"
            alignItems="center"
            gap="1px"
            animation={`${fadeInAnimation} 0.3s ease-out`}
          >
            {possibleValues.map(v => (
              <Text key={v} fontSize={sumFontSize} color="text.muted" lineHeight="1">{v}</Text>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const renderCellGrid = (renderFn: (r: number, c: number) => React.ReactNode) => {
    const rows = [];
    for (let i = 0; i < size; i++) {
      const cells = [];
      for (let j = 0; j < size; j++) cells.push(renderFn(i, j));
      rows.push(
        <Grid key={i} templateColumns={`repeat(${size}, 1fr)`}>{cells}</Grid>
      );
    }
    return rows;
  };

  // ── Linien-Schicht (Mitte): ein SVG mit Gitter, Blocklinien, Rahmen und
  //    einer gestrichelten Inset-Kontur pro Käfig. pointerEvents:none.
  const renderLineSvg = () => {
    const boardPx = size * cellSize;
    const thin: React.ReactNode[] = [];
    const block: React.ReactNode[] = [];

    for (let i = 1; i < size; i++) {
      const isBlock = i % 3 === 0;
      const p = isBlock ? i * cellSize : i * cellSize + 0.5;
      if (isBlock) {
        block.push(<line key={`v${i}`} x1={p} y1={0} x2={p} y2={boardPx} />);
        block.push(<line key={`h${i}`} x1={0} y1={p} x2={boardPx} y2={p} />);
      } else {
        thin.push(<line key={`v${i}`} x1={p} y1={0} x2={p} y2={boardPx} />);
        thin.push(<line key={`h${i}`} x1={0} y1={p} x2={boardPx} y2={p} />);
      }
    }

    const radiusPx = Math.min(4, cageInsetPx);
    const dash = `${(cellSize * 0.13).toFixed(1)} ${(cellSize * 0.1).toFixed(1)}`;

    return (
      <svg
        width={boardPx}
        height={boardPx}
        viewBox={`0 0 ${boardPx} ${boardPx}`}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <g stroke={cssVar(themeTokens.cageBorder)} strokeWidth={1}>{thin}</g>
        <g stroke={cssVar(themeTokens.blockBorder)} strokeWidth={2} strokeLinecap="square">{block}</g>
        <rect
          x={1.25}
          y={1.25}
          width={boardPx - 2.5}
          height={boardPx - 2.5}
          fill="none"
          stroke={cssVar(themeTokens.blockBorder)}
          strokeWidth={2.5}
        />
        <g fill="none" strokeWidth={1.5} strokeDasharray={dash} strokeLinejoin="round" strokeLinecap="round">
          {cages.map((cage, idx) => {
            const d = cageOutlinePath(cage.cells, cellSize, cageInsetPx, radiusPx);
            if (!d) return null;
            const stroke = blackAndWhiteMode
              ? cssVar(themeTokens.blockBorder)
              : cssVar(`cage.${cage.color.split('.')[0]}.border`);
            return <path key={idx} d={d} stroke={stroke} />;
          })}
        </g>
      </svg>
    );
  };

  const boardPx = size * cellSize;
  return (
    <Box position="relative" w={`${boardPx}px`} h={`${boardPx}px`}>
      {/* Flächen + Interaktion */}
      <Box position="absolute" top={0} left={0}>{renderCellGrid(renderBgCell)}</Box>
      {/* Linien */}
      {renderLineSvg()}
      {/* Zahlen */}
      <Box position="absolute" top={0} left={0} pointerEvents="none">
        {renderCellGrid(renderNumCell)}
      </Box>
    </Box>
  );
};

export default BoardSurface;