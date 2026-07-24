import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Grid,
  Text,
  Heading,
  Spinner,
  useBreakpointValue,
  Flex,
  Stack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  keyframes,
  useToast
} from '@chakra-ui/react';
import { AddIcon, ArrowBackIcon, ArrowForwardIcon, BellIcon, EditIcon, RepeatClockIcon } from '@chakra-ui/icons';

import { useGameState } from '../../hooks/useGameState';
import { useStrategicHint } from '../../hooks/useStrategicHint';
import type { HintTechnique } from '../../services/hintEngine';
import { useCellSelection } from '../../hooks/useCellSelection';
import { useBoardResize } from '../../hooks/useBoardResize';
import { useCellAnimation } from '../../hooks/useCellAnimation';
import { useBoardKeyboard } from '../../hooks/useBoardKeyboard';
import { useHints } from '../../hooks/useHints';
import { useBoardGameLogic, recordBoardSolved } from '../../hooks/useBoardGameLogic';

import NumberPad from '../NumberPad/NumberPad';
import { Cage, CellPosition, GameLevel } from '../../types/gameTypes';
import * as GameLogic from '../../services/gameLogicService';
import RippleButton from '../common/RippleButton';
import FadeInView from '../common/FadeInView';
import { cageOutlinePath } from './cageOutline';

// Chakra-Semantik-Token → CSS-Variable, damit SVG-Strokes ohne Neuberechnung
// mit Light-/Dark-/BW-Umschaltung mitziehen.
const cssVar = (token: string): string =>
  `var(--chakra-colors-${token.replace(/\./g, '-')})`;

// Animationen
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

interface BoardProps {
  size?: number;
  puzzleId?: string;
  levelData?: GameLevel | null;
  isLoading?: boolean;
  error?: string | null;
  blackAndWhiteMode?: boolean;
  /** Wird nur im Sidebar-Layout (flexDirection "row") unten in der
   *  Sidebar-Spalte gerendert, unterhalb der Aktions-Buttons. */
  sidebarFooter?: React.ReactNode;
}

const MAX_HINTS = 3;
const MAX_MISTAKES = 3;

export const Board: React.FC<BoardProps> = ({
  size = 9,
  puzzleId = 'default',
  levelData = null,
  isLoading: externalLoading = false,
  error: externalError = null,
  blackAndWhiteMode = false,
  sidebarFooter = null
}) => {
  const toast = useToast();
  const { gameState, isLoading: stateLoading, updateGameState, applyMove, undo, redo, canUndo, canRedo, clearHistory } = useGameState(puzzleId, size);
  const strategicHint = useStrategicHint();
  const [cages, setCages] = useState<Cage[]>([]);
  const [hasError, setHasError] = useState<boolean>(false);
  // Bleistiftmodus: rein clientseitiger UI-State (Issue #4). Kein Teil von
  // GameState, nicht persistiert. Reset auf "aus" erfolgt explizit beim
  // Mount (Initialwert false) und bei jedem puzzleId-Wechsel — Board wird
  // bei Levelwechsel innerhalb der Sitzung NICHT neu gemountet.
  const [pencilMode, setPencilMode] = useState<boolean>(false);
  const solveRecordedRef = useRef<string | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const boardFocusRef = useRef<HTMLDivElement | null>(null);

  // Responsive Zellgröße
  const cellSizeByBreakpoint = useBreakpointValue({
    base: 40,
    sm: 44,
    md: 56,
    lg: 72,
    xl: 80
  }) || 48;
  const { cellSize } = useBoardResize({ boardRef, cellSizeByBreakpoint, size });
  // Käfig-Inset (siehe renderLineSvg): die gestrichelte Kontur läuft bei
  // diesem Abstand von der Zellkante. Die Käfigsumme muss dahinter beginnen,
  // sonst kollidiert die Ziffer mit dem gestrichelten Rahmen in der Ecke.
  const cageInsetPx = Math.max(3, cellSize * 0.11);

  // Schriftgrößen
  const valueFontSize = useBreakpointValue({ base: "md", sm: "lg", md: "xl", lg: "xl" }) || "lg";
  const sumFontSize = useBreakpointValue({ base: "2xs", sm: "xs", md: "xs", lg: "xs" }) || "xs";
  // Phone-Landscape (≥ md, d. h. ≥ 768 px) bekommt Sidebar — Brett links
  // nutzt die Höhe, NumberPad+Aktionen rechts. Cell-Resize kappte die
  // Brett-Höhe an der kürzeren Viewport-Seite, sodass Cell-Größe jetzt
  // quadratisch an die verfügbare Höhe des linken Bereichs gebunden ist.
  const flexDirection = useBreakpointValue({ base: "column", md: "row" }) as "column" | "row";

  // Cell Selection
  const {
    selectedCell,
    selectedCells,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    clearSelection,
    setSelectedCell,
    setSelectedCells,
    setDragStart
  } = useCellSelection(cages);

  // Animation
  const animation = useCellAnimation();

  // Hints
  const { showHints, possibleValues, toggleHints, refreshHints } = useHints();

  // Hint-Overlay aktualisieren bei Zellwechsel
  useEffect(() => {
    if (gameState && selectedCell && cages.length > 0) {
      refreshHints(selectedCell, gameState, cages, size);
    }
  }, [selectedCell, gameState, cages, size, refreshHints]);

  // Toast-Helfer
  const showError = useCallback(
    (msg: { title: string; description: string; status?: string; duration?: number }) => {
      toast({
        title: msg.title,
        description: msg.description,
        status: (msg.status as 'error' | 'warning' | 'info' | 'success') ?? 'info',
        duration: msg.duration ?? 3000,
        isClosable: true
      });
    },
    [toast]
  );

  // Game-Over & Solve Recording Callbacks
  const handleSolveRecorded = useCallback((puzzleId: string) => {
    solveRecordedRef.current = puzzleId || null;
  }, []);

  // Game Logic (NumberSelect, Clear, Reset, RevealHint)
  const {
    handleNumberSelect,
    handleClear,
    handleReset,
    handleRevealHint,
    isCageComplete,
    isBoardComplete
  } = useBoardGameLogic({
    gameState,
    levelData,
    cages,
    selectedCells,
    size,
    maxHints: MAX_HINTS,
    maxMistakes: MAX_MISTAKES,
    isGameOver: (gameState?.mistakesUsed || 0) >= MAX_MISTAKES,
    updateGameState,
    applyMove,
    clearHistory,
    resetSelection: clearSelection,
    animation,
    onGameOver: () => {
      /* Toast zeigt bereits den Fehler an; das Banner wird via gameState.gameOver gerendert */
    },
    onSolveRecorded: handleSolveRecorded,
    showError,
    pencilMode
  });

  // Keyboard-Navigation
  const { handleKeyDown } = useBoardKeyboard({
    selectedCell,
    setSelectedCell,
    setSelectedCells,
    setDragStart,
    onNumber: handleNumberSelect,
    onClear: handleClear,
    size
  });

  // Level-Initialisierung: nur beim Wechsel einmalig
  useEffect(() => {
    if (levelData && levelData.cages) {
      setCages(levelData.cages);
      setHasError(false);
    } else if (!levelData && !externalLoading) {
      setHasError(true);
    } else {
      setHasError(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelData, puzzleId, externalLoading]);

  // Bleistiftmodus zurücksetzen bei jedem puzzleId-Wechsel (Issue #4).
  // Initial-Mount = useState(false) oben; Levelwechsel innerhalb der Sitzung
  // muss explizit auf "aus" zurückspringen, da Board nicht neu gemountet wird.
  useEffect(() => {
    setPencilMode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleId]);

  // F5 für Hints an/aus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        toggleHints();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleHints]);

  // P für Bleistiftmodus an/aus (Issue #4). Globaler window-Listener —
  // funktioniert unabhängig vom Zell-/Button-Fokus. Wiederholtes Halten
  // (event.repeat) togglet nur einmal; Modifier-Tasten und Texteingabe-
  // Elemente werden ignoriert, damit der Shortcut nicht kollidiert.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'p' && e.key !== 'P') return;
      if (e.repeat) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (active.isContentEditable) return;
      }
      e.preventDefault();
      setPencilMode(v => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Solve-Detection
  useEffect(() => {
    if (!gameState) return;

    if (gameState.solved) {
      solveRecordedRef.current = puzzleId;
      return;
    }
    if (!levelData || !isBoardComplete()) return;
    if (solveRecordedRef.current === puzzleId) return;

    solveRecordedRef.current = puzzleId;
    const finishedAt = Date.now();
    const startTime = gameState.startTime || finishedAt;

    recordBoardSolved(levelData, startTime, levelData.difficulty).then(elapsedMs => {
      updateGameState({
        solved: true,
        endTime: finishedAt,
        elapsedTime: elapsedMs
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, levelData, puzzleId]);

  // Verbleibende Ziffern berechnen
  const remainingDigits = (() => {
    if (!gameState) return {};
    const used: Record<number, number> = {};
    for (let i = 1; i <= 9; i++) used[i] = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const v = gameState.cellValues[r][c];
        if (v > 0) used[v]++;
      }
    }
    const remaining: Record<number, number> = {};
    for (let i = 1; i <= 9; i++) remaining[i] = 9 - used[i];
    return remaining;
  })();

  // Helpers fürs Rendering
  const findTopLeftCellInCage = (cage: Cage): CellPosition | null => {
    if (!cage?.cells?.length) return null;
    const sorted = [...cage.cells].sort((a, b) => (a.row - b.row) || (a.col - b.col));
    return sorted[0];
  };

  const hasSameValue = (cellRow: number, cellCol: number): boolean => {
    if (!selectedCell || !gameState) return false;
    const sel = gameState.cellValues[selectedCell.row][selectedCell.col];
    const cur = gameState.cellValues[cellRow][cellCol];
    return sel !== 0 && sel === cur;
  };

  // ── Flächen-Schicht (unten): Zell-Hintergrund + Interaktion ──────────────
  // Trägt Käfig-Tönung, Peer-/Auswahl-Highlight, alle Zeige-/Touch-Events,
  // testid/aria und die CSS-Auswahl-Umrandung. Keine Linien, keine Zahlen.
  const renderBgCell = (row: number, col: number) => {
    if (!gameState || !levelData) return null;
    if (gameState.levelId !== puzzleId) return null; // Race-Condition-Schutz

    const isSelected = selectedCells.some(c => c.row === row && c.col === col);
    const isSameRow = selectedCell?.row === row;
    const isSameCol = selectedCell?.col === col;
    const cage = GameLogic.getCageForCell(cages, row, col);
    const value = gameState.cellValues[row][col];
    const valid = GameLogic.isCellValid(gameState.cellValues, row, col, value, cages, size);
    const isInitialValue = levelData.initialValues[row][col] !== 0;

    // BW-Modus wie klassischer Killer-Sudoku-Druck: kein Flächen-Tint pro
    // Käfig, nur die SVG-Linien tragen die Struktur.
    let bgColor: string = 'surface.raised';
    if (cage && !blackAndWhiteMode) {
      const base = cage.color.split('.')[0] as 'blue' | 'green' | 'pink' | 'yellow';
      bgColor = `cage.${base}.100`;
    }
    if ((isSameRow || isSameCol) && (blackAndWhiteMode || !cage) && !isSelected) {
      bgColor = blackAndWhiteMode ? 'surface.sunken' : 'cell.peer.bg';
    }
    // Selection hat hoechste Prio: sie ueberlagert Cage-Tint und Peer-Highlight
    // und liegt als inset boxShadow UNTER dem SVG-Cage-Linien-Layer — sonst
    // waeren die gestrichelten Kaefigraender unter der Selection-Outline weg.
    const selectionShadow = isSelected
      ? 'inset 0 0 0 2px var(--chakra-colors-brand-primary)'
      : undefined;
    if (isSelected) bgColor = 'cell.selected.bg';

    const noteCandidates = gameState.notes?.[row]?.[col] ?? [];
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
        onMouseDown={() => handleDragStart(row, col)}
        onMouseEnter={() => handleDragEnter(row, col)}
        onMouseUp={handleDragEnd}
        onTouchStart={() => handleDragStart(row, col)}
        onTouchMove={(e) => {
          if (boardRef.current && e.touches.length > 0) {
            const touch = e.touches[0];
            const rect = boardRef.current.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            const touchCol = Math.floor(x / cellSize);
            const touchRow = Math.floor(y / cellSize);
            if (
              touchRow >= 0 && touchRow < size &&
              touchCol >= 0 && touchCol < size &&
              (selectedCell?.row !== touchRow || selectedCell?.col !== touchCol)
            ) {
              handleDragEnter(touchRow, touchCol);
            }
          }
        }}
        onTouchEnd={handleDragEnd}
        cursor="pointer"
        transition="background-color 0.15s"
        style={{ boxShadow: selectionShadow }}
      />
    );
  };

  // ── Zahlen-Schicht (oben): Käfigsumme, Zellwert, Notiz-Kandidaten ────────
  // pointerEvents:none — Interaktion geht an die Flächen-Schicht durch.
  const renderNumCell = (row: number, col: number) => {
    if (!gameState || !levelData) return null;
    if (gameState.levelId !== puzzleId) return null;

    const isSelected = selectedCells.some(c => c.row === row && c.col === col);
    const isHintCell = selectedCell?.row === row && selectedCell?.col === col;
    const cage = GameLogic.getCageForCell(cages, row, col);
    const topLeftCell = cage ? findTopLeftCellInCage(cage) : null;
    const isCageStart = topLeftCell && topLeftCell.row === row && topLeftCell.col === col;

    const value = gameState.cellValues[row][col];
    const valid = GameLogic.isCellValid(gameState.cellValues, row, col, value, cages, size);
    const isInitialValue = levelData.initialValues[row][col] !== 0;
    const cageComplete = cage ? isCageComplete(cage) : false;
    const isSameValue = hasSameValue(row, col);

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
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          fontSize={isSameValue ? `calc(${valueFontSize} * 0.85)` : valueFontSize}
          fontWeight={(!valid && value !== 0) || isSameValue ? 'bold' : 'normal'}
          color={cageComplete ? successColor : (!valid && value !== 0) ? errorColor : (isInitialValue ? 'cell.given.text' : 'cell.user.text')}
          userSelect="none"
          transition="color 0.3s, font-size 0.2s"
        >
          {value || ''}
        </Text>

        {/* Hint-Overlay (#7) verdrängt nur visuell die Notizen der
            ausgewählten Zelle; gameState.notes bleibt unverändert. */}
        {!value && !isInitialValue &&
          !(showHints && isHintCell && possibleValues.length > 0) &&
          gameState.notes?.[row]?.[col]?.length > 0 && (
          <Box
            position="absolute"
            top="2px"
            left="2px"
            right="2px"
            bottom="2px"
            display="grid"
            gridTemplateColumns="repeat(3, 1fr)"
            gridTemplateRows="repeat(3, 1fr)"
            data-testid={`notes-${row}-${col}`}
          >
            {Array.from({ length: 9 }, (_, idx) => {
              const digit = idx + 1;
              const cellNotes = gameState.notes[row][col];
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

  // Ein HTML-Zellgitter (Flächen ODER Zahlen) als size×size-Rows rendern.
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

    // Interne Gitter-/Blocklinien. 1px-Linien auf x.5 snappen (scharf),
    // 2px-Blocklinien auf ganze Pixel. i=0 und i=size = Außenrahmen (Rect).
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
        {/* Dünngitter */}
        <g stroke={cssVar('grid.cage.border')} strokeWidth={1}>{thin}</g>
        {/* 3×3-Blocklinien */}
        <g stroke={cssVar('grid.block.border')} strokeWidth={2} strokeLinecap="square">{block}</g>
        {/* Außenrahmen */}
        <rect
          x={1.25}
          y={1.25}
          width={boardPx - 2.5}
          height={boardPx - 2.5}
          fill="none"
          stroke={cssVar('grid.block.border')}
          strokeWidth={2.5}
        />
        {/* Käfig-Konturen (Inset, gestrichelt, abgerundet) */}
        <g fill="none" strokeWidth={1.5} strokeDasharray={dash} strokeLinejoin="round" strokeLinecap="round">
          {cages.map((cage, idx) => {
            const d = cageOutlinePath(cage.cells, cellSize, cageInsetPx, radiusPx);
            if (!d) return null;
            const stroke = blackAndWhiteMode
              ? cssVar('grid.block.border')
              : cssVar(`cage.${cage.color.split('.')[0]}.border`);
            return <path key={idx} d={d} stroke={stroke} />;
          })}
        </g>
      </svg>
    );
  };

  const renderBoard = () => {
    if (!gameState) return null;
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

  const isLoadingCombined = stateLoading || externalLoading || (gameState && gameState.levelId !== puzzleId);

  if (externalError || hasError) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Fehler beim Laden des Levels</AlertTitle>
          <AlertDescription>
            {externalError || "Das Level konnte nicht geladen werden. Bitte versuchen Sie ein anderes Level."}
          </AlertDescription>
        </Box>
      </Alert>
    );
  }

  if (isLoadingCombined) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" h="200px">
        <Spinner size="xl" color="teal.500" />
      </Box>
    );
  }

  if (!cages || cages.length === 0) {
    return (
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Kein Level geladen</AlertTitle>
          <AlertDescription>Bitte wählen Sie ein Level aus dem Level-Selektor.</AlertDescription>
        </Box>
      </Alert>
    );
  }

  const isGameOver = (gameState?.mistakesUsed || 0) >= MAX_MISTAKES;

  return (
    <Flex
      direction={flexDirection}
      gap={3}
      justify="center"
      align={flexDirection === "column" ? "center" : "start"}
      flexWrap="wrap"
      w="100%"
      minH="70vh"
    >
      <Box
        ref={(el: HTMLDivElement | null) => {
          boardRef.current = el;
          boardFocusRef.current = el;
        }}
        data-board-root="true"
        role="grid"
        p={flexDirection === "column" ? 2 : [1, 2, 4]}
        display="flex"
        justifyContent="center"
        alignItems="center"
        boxShadow="md"
        borderRadius="lg"
        bg="surface.raised"
        position="relative"
        flexGrow={1}
        flexShrink={1}
        flexBasis={flexDirection === "row" ? "0" : "auto"}
        maxW={flexDirection === "column" ? "100%" : "70%"}
        // Im Sidebar-Modus (md+) nutzt das Brett 80vh der Höhe — das
        // lässt in der Sidebar Platz für NumberPad+Löschen+Aktionen
        // ohne dass sie hinter der Bottom-Nav verschwinden.
        // ponytail: 90vh überlappte mit Bottom-Nav (57 px), 80vh ist
        // der empirisch ermittelte Wert, bei dem alles in den sichtbaren
        // Bereich passt.
        h={flexDirection === "row" ? "80vh" : ["auto", "auto", "65vh"]}
        overflowX="hidden"
        overflowY="hidden"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        _focus={{ outline: "none" }}
        _focusVisible={{ outline: "none" }}
      >
        {renderBoard()}

        {gameState && isBoardComplete() && (
          <FadeInView
            direction="scale"
            duration={800}
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            bg="status.success"
            border="2px solid"
            borderColor="status.success"
            borderRadius="md"
            p={4}
            textAlign="center"
            boxShadow="xl"
            zIndex={10}
          >
            <Text fontSize="xl" fontWeight="bold" color="status.success">
              Gratulation! Das Rätsel ist gelöst!
            </Text>
          </FadeInView>
        )}

        {gameState && isGameOver && (
          <FadeInView
            direction="scale"
            duration={240}
            position="absolute"
            inset={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="blackAlpha.600"
            p={4}
            zIndex={10}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="game-over-title"
            aria-describedby="game-over-description"
          >
            <Stack
              spacing={4}
              w="100%"
              maxW="300px"
              bg="surface.raised"
              color="text.primary"
              borderRadius="xl"
              border="1px solid"
              borderColor="surface.sunken"
              p={{ base: 5, md: 6 }}
              textAlign="center"
              boxShadow="xl"
            >
              <Box
                alignSelf="center"
                display="flex"
                alignItems="center"
                justifyContent="center"
                w="48px"
                h="48px"
                borderRadius="full"
                bg="red.50"
                color="status.error"
                fontSize="2xl"
                fontWeight="800"
                aria-hidden="true"
              >
                !
              </Box>
              <Box>
                <Heading id="game-over-title" as="h2" size="md" color="text.primary" mb={2}>
                  Game Over
                </Heading>
                <Text id="game-over-description" color="text.secondary" fontSize="sm">
                  Du hast drei Fehler gemacht. Starte das Rätsel neu und versuche es noch einmal.
                </Text>
              </Box>
              <RippleButton
                onClick={handleReset}
                colorScheme="red"
                w="100%"
                aria-label="Neu starten"
                autoFocus
              >
                Neu starten
              </RippleButton>
            </Stack>
          </FadeInView>
        )}
      </Box>

      <Box
        p={2}
        alignSelf={flexDirection === "column" ? "center" : "stretch"}
        mt={flexDirection === "column" ? 4 : 0}
        pt={flexDirection === "row" ? "16px" : 2}
        // Im Landscape keine Bottom-Nav-Overlap-Risk: Inhalt vor
        // Bottom-Nav enden lassen (Bottom-Nav ist 57 px + Safe-Area).
        pb={flexDirection === "row" ? "72px" : 2}
        // Im Sidebar-Modus die volle verfügbare Breite rechts vom Brett
        // einnehmen, damit NumberPad+Aktionen gleichmäßig verteilt sind.
        width={flexDirection === "column" ? "100%" : "auto"}
        flex={flexDirection === "row" ? "1" : undefined}
        display="flex"
        flexDirection="column"
        alignItems={flexDirection === "column" ? "center" : "stretch"}
        overflowY="auto"
      >
        <NumberPad
          onNumberSelect={handleNumberSelect}
          onClear={handleClear}
          disabledNumbers={isGameOver ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : []}
          remainingDigits={remainingDigits}
        />
        <Box
          // Im Landscape Action-Bar in zwei Gruppen teilen: primäre
          // Aktionen (Tipp + Hinweis) oben, sekundäre (Reset, Undo, Redo)
          // unten in einer kompakten Reihe — spart vertikalen Platz.
          display={flexDirection === "row" ? "flex" : "block"}
          flexDirection={flexDirection === "row" ? "column" : undefined}
          gap={flexDirection === "row" ? 2 : undefined}
          mt={flexDirection === "row" ? 2 : 4}
        >
          {/* Bleistiftmodus-Toggle (Issue #4): Mode-Switch, kein Verbraucher.
              Visual: solid + outline-Ring bei aktiv = nicht rein farblich.
              aria-pressed trägt den Modus-Zustand für Screenreader. */}
          <RippleButton
            onClick={() => setPencilMode(v => !v)}
            colorScheme="blue"
            variant={pencilMode ? 'solid' : 'outline'}
            aria-label="Bleistiftmodus"
            aria-pressed={pencilMode}
            boxShadow={pencilMode ? 'outline' : undefined}
            data-testid="pencil-toggle"
          >
            <EditIcon />
          </RippleButton>
          {/* Strategischer Tipp: dezent, nicht im Vordergrund. */}
          <RippleButton
            variant="outline"
            colorScheme="blue"
            onClick={() => {
              if (!gameState) return;
              if (cages.length === 0) {
                toast({ title: 'Hinweis nicht verfügbar', description: 'Level noch nicht geladen.', status: 'warning', duration: 2500, isClosable: true });
                return;
              }
              const hint = strategicHint.requestHint(gameState.cellValues, cages);
              if (!hint) {
                toast({
                  title: 'Kein einfacher Hinweis',
                  description: 'Die Engine hat nichts gefunden — versuch eine andere Technik.',
                  status: 'info',
                  duration: 3000,
                  isClosable: true
                });
                return;
              }
              const techLabels: Record<typeof hint.technique, string> = {
                'naked-single-cage': 'Käfig-Naked Single',
                'hidden-single-cage': 'Käfig-Hidden Single',
                'naked-single-sudoku': 'Sudoku-Naked Single',
                'hidden-single-sudoku': 'Sudoku-Hidden Single',
                'innie': '45er-Regel (Innie)',
                'outie': '45er-Regel (Outie)',
              };
              toast({
                title: `${techLabels[hint.technique]} → ${hint.value}`,
                description: hint.explanation,
                status: 'info',
                duration: 8000,
                isClosable: true,
                position: 'top',
              });
              setSelectedCell(hint.cell);
            }}
            isDisabled={!gameState || isGameOver || cages.length === 0}
            aria-label="Tipp"
          >
            <BellIcon />
          </RippleButton>
          {/* Direkter Reveal-Hinweis: brand primary, klar als primäre Aktion. */}
          <RippleButton
            colorScheme="blue"
            onClick={handleRevealHint}
            isDisabled={!gameState || isGameOver || (gameState.hintsUsed || 0) >= MAX_HINTS}
            aria-label={`Hinweis (${MAX_HINTS - (gameState?.hintsUsed || 0)})`}
          >
            <AddIcon />
          </RippleButton>
          {/* Reset: tonal, nicht akzent. */}
          <RippleButton
            variant="ghost"
            onClick={handleReset}
            isDisabled={!gameState}
            aria-label="Reset"
          >
            <RepeatClockIcon />
          </RippleButton>
          <RippleButton
            variant="ghost"
            onClick={() => { void undo(); }}
            isDisabled={!gameState || isGameOver || !canUndo}
            aria-label="Rückgängig"
          >
            <ArrowBackIcon />
          </RippleButton>
          <RippleButton
            variant="ghost"
            onClick={() => { void redo(); }}
            isDisabled={!gameState || isGameOver || !canRedo}
            aria-label="Wiederherstellen"
          >
            <ArrowForwardIcon />
          </RippleButton>
        </Box>

        {flexDirection === "row" && sidebarFooter && (
          <Box
            mt={4}
            pt={3}
            borderTop="1px solid"
            borderColor="surface.sunken"
            display="flex"
            flexDirection="column"
            gap={2}
          >
            {sidebarFooter}
          </Box>
        )}
      </Box>
    </Flex>
  );
};

export default Board;
