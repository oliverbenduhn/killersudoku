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
import { RepeatIcon, AddIcon } from '@chakra-ui/icons';

import { useGameState } from '../../hooks/useGameState';
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
}

const MAX_HINTS = 3;
const MAX_MISTAKES = 3;

export const Board: React.FC<BoardProps> = ({
  size = 9,
  puzzleId = 'default',
  levelData = null,
  isLoading: externalLoading = false,
  error: externalError = null,
  blackAndWhiteMode = false
}) => {
  const toast = useToast();
  const { gameState, isLoading: stateLoading, updateGameState } = useGameState(puzzleId, size);
  const [cages, setCages] = useState<Cage[]>([]);
  const [hasError, setHasError] = useState<boolean>(false);
  const solveRecordedRef = useRef<string | null>(null);
  const lastInitializedLevelIdRef = useRef<string | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const boardFocusRef = useRef<HTMLDivElement | null>(null);

  // Responsive Zellgröße
  const cellSizeByBreakpoint = useBreakpointValue({
    base: 36,
    sm: 42,
    md: 48,
    lg: 66,
    xl: 72
  }) || 48;
  const { cellSize } = useBoardResize({ boardRef, cellSizeByBreakpoint, size });

  // Schriftgrößen
  const valueFontSize = useBreakpointValue({ base: "md", sm: "lg", md: "xl", lg: "xl" }) || "lg";
  const sumFontSize = useBreakpointValue({ base: "2xs", sm: "xs", md: "xs", lg: "xs" }) || "xs";
  const flexDirection = useBreakpointValue({ base: "column", lg: "row" }) as "column" | "row";

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
  const { showHints, possibleValues, toggleHints } = useHints();

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
    resetSelection: clearSelection,
    animation,
    onGameOver: () => {
      /* Toast bereits in Hook gezeigt */
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

      if (
        levelData.initialValues &&
        gameState &&
        lastInitializedLevelIdRef.current !== puzzleId
      ) {
        lastInitializedLevelIdRef.current = puzzleId;
        const initialValuesCopy = JSON.parse(JSON.stringify(levelData.initialValues));
        updateGameState({
          cellValues: initialValuesCopy,
          levelId: puzzleId
        });
      }
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

    let bgColor = "white";
    if (cage) {
      if (blackAndWhiteMode) {
        const idx = cages.indexOf(cage);
        const grayLevel = 100 - (idx % 4) * 10;
        bgColor = `gray.${grayLevel}`;
      } else {
        bgColor = cage.color;
      }
    } else if ((isSameRow || isSameCol || isSameBlk) && !isInitialValue) {
      bgColor = blackAndWhiteMode ? "gray.50" : "blue.50";
    }

    let valueColor = isInitialValue ? "black" : (blackAndWhiteMode ? "gray.800" : "blue.700");
    if (!valid && value !== 0) {
      valueColor = blackAndWhiteMode ? "gray.800" : "red.500";
    } else if (cageComplete && cage) {
      valueColor = blackAndWhiteMode ? "gray.900" : "green.700";
    }

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
        border={isSelected ? "2px solid rgba(0,0,0,0.75)" : "1px solid rgba(0,0,0,0.2)"}
        borderRight={col % 3 === 2 ? (isSelected ? "2px solid rgba(0,0,0,0.75)" : "2px solid rgba(0,0,0,0.4)") : (isSelected ? "2px solid rgba(0,0,0,0.75)" : "1px solid rgba(0,0,0,0.2)")}
        borderBottom={row % 3 === 2 ? (isSelected ? "2px solid rgba(0,0,0,0.75)" : "2px solid rgba(0,0,0,0.4)") : (isSelected ? "2px solid rgba(0,0,0,0.75)" : "1px solid rgba(0,0,0,0.2)")}
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
        _hover={{ borderColor: "rgba(0,0,0,0.5)" }}
        boxShadow={boxShadow}
        transition="all 0.3s ease"
        zIndex={isSelected ? 1 : 0}
        style={{
          animation: cellAnimation,
          boxShadow: elevation,
          transform: isSelected && !isInitialValue ? "translateZ(1px)" : "none"
        }}
      >
        {cage && (
          <Box
            position="absolute"
            top="3px"
            left="3px"
            right="3px"
            bottom="3px"
            border="1px dashed rgba(0,0,0,0.7)"
            borderTop={hasTopSameCage ? "none" : undefined}
            borderLeft={hasLeftSameCage ? "none" : undefined}
            borderRight={hasRightSameCage ? "none" : undefined}
            borderBottom={hasBottomSameCage ? "none" : undefined}
            pointerEvents="none"
            transition="background-color 0.3s"
          />
        )}

        {isCageStart && cage && (
          <Text
            position="absolute"
            top="1px"
            left="2px"
            fontSize={sumFontSize}
            fontWeight="bold"
            color={cageComplete ? "green.600" : "gray.700"}
            zIndex="2"
            bg="rgba(255,255,255,0.7)"
            lineHeight="1"
            px="1px"
            borderRadius="2px"
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
          color={cageComplete ? "green.600" : (!valid && value !== 0) ? "red.500" : (isInitialValue ? "black" : "blue.700")}
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
        p={[1, 2, 4]}
        display="flex"
        justifyContent="center"
        alignItems="center"
        boxShadow="0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)"
        borderRadius="lg"
        bg="white"
        position="relative"
        flexGrow={1}
        maxW={flexDirection === "column" ? "95%" : "70%"}
        h={["auto", "auto", "65vh"]}
        overflowX="hidden"
        overflowY="hidden"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        _focus={{ outline: "3px dashed #2196F3", outlineOffset: "4px" }}
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
            bg="green.100"
            border="2px solid green.500"
            borderRadius="md"
            p={4}
            textAlign="center"
            boxShadow="xl"
            zIndex={10}
          >
            <Text fontSize="xl" fontWeight="bold" color="green.600">
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
            bg="red.100"
            border="2px solid red.500"
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
        alignSelf={flexDirection === "column" ? "center" : "start"}
        mt={flexDirection === "column" ? 4 : 0}
        pt={flexDirection === "row" ? "16px" : 2}
        width={flexDirection === "column" ? "100%" : "auto"}
        display="flex"
        flexDirection="column"
        alignItems={flexDirection === "column" ? "center" : "start"}
      >
        <NumberPad
          onNumberSelect={handleNumberSelect}
          onClear={handleClear}
          disabledNumbers={isGameOver ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : []}
          remainingDigits={remainingDigits}
        />
        <Stack
          direction="row"
          gap={4}
          mt={4}
          justify={flexDirection === "column" ? "center" : "start"}
          width="100%"
        >
          <RippleButton
            bg="teal.500"
            color="white"
            onClick={handleRevealHint}
            borderRadius="md"
            boxShadow="0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)"
            _hover={{ bg: "teal.600" }}
            _active={{ bg: "teal.700" }}
            isDisabled={!gameState || isGameOver || (gameState.hintsUsed || 0) >= MAX_HINTS}
          >
            <AddIcon mr={2} /> Hinweis ({MAX_HINTS - (gameState?.hintsUsed || 0)})
          </RippleButton>
          <RippleButton
            bg="#2196F3"
            color="white"
            onClick={handleReset}
            borderRadius="md"
            boxShadow="0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)"
            _hover={{ bg: "#1976D2" }}
            _active={{ bg: "#1565C0" }}
          >
            <RepeatIcon mr={2} /> Reset
          </RippleButton>
        </Stack>
      </Box>
    </Flex>
  );
};

export default Board;