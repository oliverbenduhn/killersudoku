import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Grid,
  Text,
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
import { AddIcon, ArrowBackIcon, ArrowForwardIcon, BellIcon, RepeatClockIcon } from '@chakra-ui/icons';

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
  const solveRecordedRef = useRef<string | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const boardFocusRef = useRef<HTMLDivElement | null>(null);

  // Responsive Zellgröße
  const cellSizeByBreakpoint = useBreakpointValue({
    base: 36,
    sm: 42,
    md: 56,
    lg: 72,
    xl: 80
  }) || 48;
  const { cellSize } = useBoardResize({ boardRef, cellSizeByBreakpoint, size });

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
    showError
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
  const isSameBlock = (r1: number, c1: number, r2: number, c2: number): boolean =>
    Math.floor(r1 / 3) === Math.floor(r2 / 3) &&
    Math.floor(c1 / 3) === Math.floor(c2 / 3);

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

  const renderCell = (row: number, col: number) => {
    if (!gameState || !levelData) return null;
    if (gameState.levelId !== puzzleId) return null; // Race-Condition-Schutz

    const isSelected = selectedCells.some(c => c.row === row && c.col === col);
    const isSameRow = selectedCell?.row === row;
    const isSameCol = selectedCell?.col === col;
    const isSameBlk = selectedCell && isSameBlock(selectedCell.row, selectedCell.col, row, col);
    const cage = GameLogic.getCageForCell(cages, row, col);

    const topLeftCell = cage ? findTopLeftCellInCage(cage) : null;
    const isCageStart = topLeftCell && topLeftCell.row === row && topLeftCell.col === col;

    const value = gameState.cellValues[row][col];
    const valid = GameLogic.isCellValid(gameState.cellValues, row, col, value, cages, size);
    const isInitialValue = levelData.initialValues[row][col] !== 0;
    const cageComplete = cage ? isCageComplete(cage) : false;

    const hasTopSameCage = row > 0 && GameLogic.areCellsInSameCage(cages, row, col, row - 1, col);
    const hasLeftSameCage = col > 0 && GameLogic.areCellsInSameCage(cages, row, col, row, col - 1);
    const hasRightSameCage = col < size - 1 && GameLogic.areCellsInSameCage(cages, row, col, row, col + 1);
    const hasBottomSameCage = row < size - 1 && GameLogic.areCellsInSameCage(cages, row, col, row + 1, col);

    const isLastEntered =
      animation.lastEnteredCell?.row === row && animation.lastEnteredCell?.col === col;

    let bgColor: string = 'surface.raised';
    if (cage) {
      if (blackAndWhiteMode) {
        const idx = cages.indexOf(cage);
        const grayLevel = 100 - (idx % 4) * 10;
        bgColor = `gray.${grayLevel}`;
      } else {
        // cage.color ist 'blue.100'|'green.100'|'pink.100'|'yellow.100'.
        // Mapping auf semantisches Token aus theme.ts.
        const base = cage.color.split('.')[0] as 'blue' | 'green' | 'pink' | 'yellow';
        bgColor = `cage.${base}.100`;
      }
    } else if ((isSameRow || isSameCol || isSameBlk) && !isInitialValue) {
      bgColor = blackAndWhiteMode ? 'surface.sunken' : 'cell.peer.bg';
    }

    const valueColor: string = isInitialValue
      ? 'cell.given.text'
      : (blackAndWhiteMode ? 'gray.300' : 'cell.user.text');
    const errorColor: string = blackAndWhiteMode ? 'gray.200' : 'cell.error.text';
    const successColor: string = blackAndWhiteMode ? 'gray.50' : 'status.success';

    const isSameValue = hasSameValue(row, col);

    let cellAnimation = "none";
    if (animation.animating && isLastEntered) {
      cellAnimation = animation.lastEnteredValid
        ? `${successAnimation} 0.5s ease`
        : `${errorAnimation} 0.4s ease`;
    } else if (isSelected && !isInitialValue) {
      cellAnimation = `${pulseAnimation} 1.5s infinite ease-in-out`;
    }

    const boxShadow = isSelected ? "0px 1px 3px rgba(0,0,0,0.2) inset" : "none";
    const elevation = !valid && value !== 0
      ? "0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)"
      : "none";

    return (
      <Box
        key={`${row}-${col}`}
        data-testid={`cell-${row}-${col}`}
        role="gridcell"
        aria-label={`Zeile ${row + 1} Spalte ${col + 1}${value ? `, Wert ${value}` : ', leer'}${isInitialValue ? ', vorgegeben' : ''}${!valid && value !== 0 ? ', ungültig' : ''}`}
        aria-selected={isSelected}
        position="relative"
        w={`${cellSize}px`}
        h={`${cellSize}px`}
        border={isSelected ? '2px solid' : '1px solid'}
        borderColor={isSelected ? 'brand.primary' : 'surface.sunken'}
        borderRightWidth={col % 3 === 2 ? '2px' : undefined}
        borderBottomWidth={row % 3 === 2 ? '2px' : undefined}
        borderRightColor={col % 3 === 2 ? 'surface.raised' : undefined}
        borderBottomColor={row % 3 === 2 ? 'surface.raised' : undefined}
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
        _hover={{ borderColor: 'brand.primary' }}
        boxShadow={boxShadow}
        transition="background-color 0.15s, border-color 0.15s"
        zIndex={isSelected ? 1 : 0}
        style={{
          animation: cellAnimation,
          boxShadow: elevation,
          transform: isSelected && !isInitialValue ? 'translateZ(1px)' : 'none'
        }}
      >
        {cage && (
          <Box
            position="absolute"
            top="8%"
            left="8%"
            right="8%"
            bottom="8%"
            border="1px dashed"
            borderColor={blackAndWhiteMode ? 'gray.600' : `cage.${(cage.color.split('.')[0])}.border`}
            borderTop={hasTopSameCage ? 'none' : undefined}
            borderLeft={hasLeftSameCage ? 'none' : undefined}
            borderRight={hasRightSameCage ? 'none' : undefined}
            borderBottom={hasBottomSameCage ? 'none' : undefined}
            pointerEvents="none"
            transition="border-color 0.3s"
          />
        )}

        {isCageStart && cage && (
          <Text
            position="absolute"
            top="1px"
            left="2px"
            fontSize={sumFontSize}
            fontWeight="bold"
            color={cageComplete ? 'status.success' : 'text.primary'}
            zIndex="2"
            lineHeight="1"
            px="1px"
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
          fontWeight={(!valid && value !== 0) || isSameValue ? "bold" : "normal"}
          color={cageComplete ? successColor : (!valid && value !== 0) ? errorColor : (isInitialValue ? 'cell.given.text' : 'cell.user.text')}
          userSelect="none"
          transition="color 0.3s, font-size 0.2s"
        >
          {value || ''}
        </Text>

        {showHints && isSelected && !value && !isInitialValue && possibleValues.length > 0 && (
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
            pointerEvents="none"
            animation={`${fadeInAnimation} 0.3s ease-out`}
          >
            {possibleValues.map(v => (
              <Text key={v} fontSize={sumFontSize} color="gray.600" lineHeight="1">{v}</Text>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const renderGrid = () => {
    if (!gameState) return null;
    const rows = [];
    for (let i = 0; i < size; i++) {
      const cells = [];
      for (let j = 0; j < size; j++) {
        cells.push(renderCell(i, j));
      }
      rows.push(
        <Grid key={i} templateColumns={`repeat(${size}, 1fr)`}>{cells}</Grid>
      );
    }
    return rows;
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
      gap={4}
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
        <Box>{renderGrid()}</Box>

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
            duration={800}
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            bg="status.error"
            border="2px solid"
            borderColor="status.error"
            borderRadius="md"
            p={4}
            textAlign="center"
            boxShadow="xl"
            zIndex={10}
          >
            <Text fontSize="xl" fontWeight="bold" color="red.600">
              Game Over – zu viele Fehler
            </Text>
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
            isDisabled={!gameState || isGameOver}
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
