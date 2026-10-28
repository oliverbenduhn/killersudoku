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
  useToast,
  AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader,
  AlertDialogBody, AlertDialogFooter, Button, CloseButton
} from '@chakra-ui/react';
import { AddIcon, ArrowBackIcon, ArrowForwardIcon, BellIcon, EditIcon, InfoIcon, RepeatClockIcon, WarningIcon } from '@chakra-ui/icons';

import { useGameState } from '../../hooks/useGameState';
import { useStrategicHint } from '../../hooks/useStrategicHint';
import type { HintTechnique } from '../../services/hintEngine';
import { useCellSelection } from '../../hooks/useCellSelection';
import { useBoardResize } from '../../hooks/useBoardResize';
import { useCellAnimation } from '../../hooks/useCellAnimation';
import { useBoardKeyboard } from '../../hooks/useBoardKeyboard';
import { useHints } from '../../hooks/useHints';
import { useBoardGameLogic, recordBoardSolved } from '../../hooks/useBoardGameLogic';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { markLevelSolved, markLevelStarted, parseLevelNumber } from '../../services/progressService';

import NumberPad from '../NumberPad/NumberPad';
import { Cage, GameLevel } from '../../types/gameTypes';
import RippleButton from '../common/RippleButton';
import FadeInView from '../common/FadeInView';
import { cageOfCell } from '../../services/board';
import BoardSurface from './BoardSurface';

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
  /** Öffnet den Tastenkombinationen-Hilfe-Dialog (Modal lebt in App). */
  onOpenHelp: () => void;
  shortcutsEnabled?: boolean;
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
  sidebarFooter = null,
  onOpenHelp,
  shortcutsEnabled = true,
}) => {
  const toast = useToast();
  const { gameState, isLoading: stateLoading, loadError, storageError, retryLoad, retrySave, updateGameState, applyMove, undo, redo, canUndo, canRedo, clearHistory } = useGameState(puzzleId, size, levelData);
  const [resetOpen, setResetOpen] = useState(false);
  const cancelResetRef = useRef<HTMLButtonElement>(null!);
  const [statisticsError, setStatisticsError] = useState(false);
  const statisticsTaskRef = useRef<(() => Promise<unknown>) | null>(null);
  const strategicHint = useStrategicHint();
  // Käfige sind derived state — kommen direkt aus levelData. Vorher als
  // useState+useEffect gehalten, was im ersten Render-Tick ein leeres
  // Array lieferte; Drag-Events in diesem Fenster umgingen die Cage-
  // Constraint und fluteten die Auswahl (User-Report: "zwei Felder
  // markiert, plötzlich drei oder das ganze Brett dabei").
  const cages: Cage[] = levelData?.cages ?? [];
  const hasError = !levelData && !externalLoading;
  // Bleistiftmodus: rein clientseitiger UI-State (Issue #4). Kein Teil von
  // GameState, nicht persistiert. Reset auf "aus" erfolgt explizit beim
  // Mount (Initialwert false) und bei jedem puzzleId-Wechsel — Board wird
  // bei Levelwechsel innerhalb der Sitzung NICHT neu gemountet.
  const [pencilMode, setPencilMode] = useState<boolean>(false);
  // Help-Dialog lebt in App.tsx; Board bekommt onOpenHelp als Prop und
  // reicht es an den ?-Shortcut im useKeyboardShortcuts-Hook.
  const solveRecordedRef = useRef<string | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const boardFocusRef = useRef<HTMLDivElement | null>(null);

  // Responsive Zellgröße
  // xl/2xl waren bislang bei 80px gedeckelt — auf Desktop-Auflösungen
  // ≥1280px ließ das trotz freier Höhe (Container ist 80vh) viel
  // hellgrauen Leerraum um das Brett. Cap jetzt weiter angehoben, damit
  // useBoardResize den tatsächlich verfügbaren Platz ausnutzen kann.
  const cellSizeByBreakpoint = useBreakpointValue({
    base: 40,
    sm: 44,
    md: 56,
    lg: 72,
    xl: 96,
    '2xl': 116
  }) || 48;
  const { cellSize } = useBoardResize({ boardRef, cellSizeByBreakpoint, size, isReady: !stateLoading && !externalLoading });
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
  // Auf Mobilgeräten steht das schmale Aktionsraster links neben dem
  // NumberPad. Ab md ist es wieder die gleich breite Sidebar-Aktionsleiste.
  const actionGridWidth = useBreakpointValue({ base: '96px', md: '240px', lg: '260px' }) ?? '96px';

  // Cell Selection
  const {
    selectedCell,
    selectedCells,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
    handleDoubleClick,
    clearSelection,
    setSelectedCell,
    setSelectedCells,
    setDragStart
  } = useCellSelection(cages, cellSize);

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
    puzzleId,
    showError,
    pencilMode
  });

  // Keyboard-Navigation
  const { handleKeyDown } = useBoardKeyboard({
    selectedCell,
    selectedCells,
    setSelectedCell,
    setSelectedCells,
    setDragStart,
    onNumber: handleNumberSelect,
    onClear: handleClear,
    size
  });

  // Bleistiftmodus zurücksetzen bei jedem puzzleId-Wechsel (Issue #4).
  // Initial-Mount = useState(false) oben; Levelwechsel innerhalb der Sitzung
  // muss explizit auf "aus" zurückspringen, da Board nicht neu gemountet wird.
  useEffect(() => {
    setPencilMode(false);
  }, [puzzleId]);

  // A new puzzle starts without a selection from the previous board.
  useEffect(() => {
    clearSelection();
  }, [puzzleId, clearSelection]);

  // Restore keyboard input after either direction of the pencil toggle.
  // Keep focus on the control when there is no selected cell.
  useEffect(() => {
    if (selectedCell && shortcutsEnabled && !resetOpen && !externalLoading && !stateLoading) {
      boardFocusRef.current?.focus();
    }
  }, [pencilMode, selectedCell, selectedCells, shortcutsEnabled, resetOpen, externalLoading, stateLoading]);

  const [hintCage, setHintCage] = useState<Cage | null>(null);
  const [hintNotice, setHintNotice] = useState<{ title: string; description: string } | null>(null);

  // Strategischer Tipp: extrahiert als Callback, damit Button und
  // Tastatur-"H" denselben Code-Pfad nutzen. Vorher dupliziert.
  const requestStrategicHint = useCallback(() => {
    if (!gameState || gameState.solved || gameState.gameOver || (gameState.mistakesUsed || 0) >= MAX_MISTAKES || stateLoading || externalLoading) return;
    if (cages.length === 0) {
      toast({ title: 'Hinweis nicht verfügbar', description: 'Level noch nicht geladen.', status: 'warning', duration: 2500, isClosable: true });
      return;
    }
    // #38: Hint-Zähler prüfen (shared mit Reveal-Hint)
    const hintsUsed = gameState.hintsUsed || 0;
    if (hintsUsed >= MAX_HINTS) {
      toast({
        title: 'Hinweise aufgebraucht',
        description: `Du hast bereits alle ${MAX_HINTS} Hinweise genutzt.`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
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
    // Käfig für das Highlight finden
    const hintCageObj = cageOfCell(cages, hint.cell);
    setHintCage(hintCageObj ?? null);
    // Hint zählen
    updateGameState({ hintsUsed: hintsUsed + 1 });
    setHintNotice({ title: `${techLabels[hint.technique]} → ${hint.value}`, description: hint.explanation });
    clearSelection();
    setSelectedCell(hint.cell);
    setSelectedCells([hint.cell]);
  }, [gameState, cages, strategicHint, toast, setSelectedCell, setSelectedCells, clearSelection, updateGameState, stateLoading, externalLoading]);

  // F5 für Hints an/aus, P für Bleistiftmodus, H/R/Esc/?/Mod+Z/Mod+Y für
  // die neuen Shortcuts. Ein einziger Hook ersetzt die alten zwei
  // useEffect-Listener — Modifier-/Input-Feld-Prüfung an einer Stelle.
  useKeyboardShortcuts({
    onTogglePencil: () => { if (!gameState?.gameOver && !gameState?.solved) setPencilMode((v) => !v); },
    onToggleHints: toggleHints,
    onHint: requestStrategicHint,
    onRevealHint: () => { void handleRevealHint(); },
    onUndo: () => { if (canUndo && !gameState?.gameOver && !gameState?.solved) void undo(); },
    onRedo: () => { if (canRedo && !gameState?.gameOver && !gameState?.solved) void redo(); },
    onClearSelection: clearSelection,
    onOpenHelp,
  }, shortcutsEnabled && !resetOpen && !stateLoading && !externalLoading && !loadError);

  // Commit completion before statistics; retry an interrupted booking after reload.
  useEffect(() => {
    if (!gameState || !levelData || gameState.levelId !== puzzleId) return;
    const levelNumber = parseLevelNumber(puzzleId);
    if (gameState.solved && levelNumber !== null) markLevelSolved(levelNumber);
    if (gameState.statisticsRecorded || (!gameState.solved && !isBoardComplete())
      || solveRecordedRef.current === gameState.id) return;
    solveRecordedRef.current = gameState.id;
    const finishedAt = gameState.endTime ?? Date.now();
    if (!gameState.solved) {
      void updateGameState({ solved: true, gameOver: false, endTime: finishedAt,
        elapsedTime: Math.max(0, finishedAt - (gameState.startTime || finishedAt)) });
      if (levelNumber !== null) markLevelSolved(levelNumber);
    }
    const task = async () => {
      await recordBoardSolved(levelData, gameState.startTime || finishedAt, levelData.difficulty, puzzleId, finishedAt);
      await updateGameState({ statisticsRecorded: true }, gameState.id);
    };
    statisticsTaskRef.current = task;
    setStatisticsError(false);
    void task().catch(() => {
      if (statisticsTaskRef.current === task) setStatisticsError(true);
    });
  }, [gameState, levelData, puzzleId, isBoardComplete, updateGameState]);

  useEffect(() => {
    statisticsTaskRef.current = null;
    setStatisticsError(false);
    setHintCage(null);
    setHintNotice(null);
    return () => { statisticsTaskRef.current = null; };
  }, [puzzleId]);

  const resetGame = () => {
    statisticsTaskRef.current = null;
    setStatisticsError(false);
    setResetOpen(false);
    setHintCage(null);
    setHintNotice(null);
    handleReset();
  };

  const requestReset = () => {
    const changed = gameState && levelData && (
      gameState.cellValues.some((row, r) => row.some((value, col) => value !== levelData.initialValues[r][col]))
      || gameState.notes.some(row => row.some(notes => notes.length > 0))
    );
    if (changed) { setResetOpen(true); return; }
    resetGame();
  };

  // Angefangen-Markierung: sobald der Spieler mindestens ein Feld selbst
  // befüllt (nicht Teil der levelData.initialValues-Vorgaben), gilt das
  // Level als "angefangen" für die Levelübersicht (killer Sudoku hat je
  // nach Schwierigkeit vorbefüllte Zellen, die nicht mitzählen dürfen).
  useEffect(() => {
    if (!gameState || !levelData) return;
    if (gameState.solved) return;
    const levelNumber = parseLevelNumber(puzzleId);
    if (levelNumber === null) return;

    const hasUserInput = gameState.cellValues.some((row, r) =>
      row.some((v, c) => v > 0 && levelData.initialValues[r][c] === 0)
    );
    if (hasUserInput) markLevelStarted(levelNumber);
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

  // Board-Rendering wurde in BoardSurface extrahiert (ADR-0001-konform:
  // drei Schichten, pointerEvents:none). Diese Komponente orchestriert
  // nur noch Hooks, Modals und Sidebar.

  const isLoadingCombined = stateLoading || externalLoading || (gameState && gameState.levelId !== puzzleId);

  if (loadError) {
    return <Alert status="error" flexDirection="column" gap={3}>
      <AlertDescription>{loadError}</AlertDescription>
      <Button onClick={retryLoad}>Erneut versuchen</Button>
    </Alert>;
  }

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

  const isGameOver = !gameState?.solved && Boolean(gameState?.gameOver || (gameState?.mistakesUsed || 0) >= MAX_MISTAKES);
  const isTerminal = isGameOver || Boolean(gameState?.solved);

  return (
    <Flex
      direction={flexDirection}
      gap={3}
      justify="center"
      align={flexDirection === "column" ? "center" : "start"}
      flexWrap="wrap"
      w="100%"
      minW={0}
    >
      {hintNotice && <Alert status="info" width="100%" alignItems="start" gap={2} role="status">
        <Box flex={1} minW={0}><AlertTitle>{hintNotice.title}</AlertTitle><AlertDescription>{hintNotice.description}</AlertDescription></Box>
        <CloseButton minW="44px" minH="44px" aria-label="Tipp schließen" onClick={() => { setHintNotice(null); setHintCage(null); }} />
      </Alert>}
      {gameState?.solved && <Alert status="success" width="100%" role="status">
        <AlertIcon /><AlertDescription>Gratulation! Das Rätsel ist gelöst!</AlertDescription>
      </Alert>}
      {storageError && <Alert status="error" flexWrap="wrap" gap={2} width="100%">
        <AlertDescription>{storageError}</AlertDescription><Button onClick={retrySave}>Speichern wiederholen</Button>
      </Alert>}
      {statisticsError && <Alert status="warning" flexWrap="wrap" gap={2} width="100%">
        <AlertDescription>Das Rätsel ist gelöst. Die Statistik konnte nicht gespeichert werden.</AlertDescription>
        <Button onClick={() => {
          const task = statisticsTaskRef.current;
          if (task) void task().then(() => { if (statisticsTaskRef.current === task) setStatisticsError(false); })
            .catch(() => { if (statisticsTaskRef.current === task) setStatisticsError(true); });
        }}>Statistik wiederholen</Button>
      </Alert>}
      <Box
        ref={(el: HTMLDivElement | null) => {
          boardRef.current = el;
          boardFocusRef.current = el;
        }}
        data-board-root="true"
        role="grid"
        aria-label="Sudoku-Brett – mit Pfeiltasten navigieren, mit Tab verlassen"
        aria-readonly={isTerminal}
        p={flexDirection === "column" ? 2 : [1, 2, 4]}
        display="flex"
        justifyContent="center"
        alignItems={flexDirection === "row" ? "flex-start" : "center"}
        boxShadow="md"
        borderRadius="lg"
        bg="surface.raised"
        position="relative"
        flexGrow={1}
        flexShrink={1}
        flexBasis={flexDirection === "row" ? "0" : "auto"}
        maxW={flexDirection === "column" ? "100%" : "80%"}
        h="auto"
        minW={0}
        overflowX="hidden"
        overflowY="hidden"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (!selectedCell && !stateLoading && !externalLoading) {
            const first = { row: 0, col: 0 };
            setSelectedCell(first);
            setSelectedCells([first]);
          }
        }}
        _focus={{ outline: "none" }}
        _focusVisible={{ outline: "2px solid", outlineColor: "cell.selected.border" }}
      >
        {gameState && levelData && gameState.levelId === puzzleId && (
          <BoardSurface
            pencilMode={pencilMode}
            selectedCell={selectedCell}
            selectedCells={selectedCells}
            size={size}
            cellValues={gameState.cellValues}
            notes={gameState.notes}
            initialValues={levelData.initialValues}
            cages={cages}
            hintCage={hintCage}
            levelData={levelData}
            cellSize={cellSize}
            cageInsetPx={cageInsetPx}
            valueFontSize={valueFontSize}
            sumFontSize={sumFontSize}
            themeTokens={{ cageBorder: 'grid.cage.border', blockBorder: 'grid.block.border' }}
            animation={animation}
            showHints={showHints}
            possibleValues={possibleValues}
            isCageComplete={isCageComplete}
            onCellPointerDown={handlePointerDown}
            onCellPointerMove={handlePointerMove}
            onCellPointerEnd={handlePointerEnd}
            onCellDoubleClick={handleDoubleClick}
            blackAndWhiteMode={blackAndWhiteMode}
          />
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
            role="alert"
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
                onClick={requestReset}
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
        p={0}
        alignSelf={flexDirection === "column" ? "center" : "stretch"}
        mt={flexDirection === "column" ? 4 : 0}
        // Sidebar-Modus: kein Extra-Top-Padding — NumberPad soll bündig mit
        // der Brett-Oberkante starten (Tablet-Hochformat), sonst wirkt die
        // Sidebar künstlich nach unten verschoben.
        pb={2}
        // Im Sidebar-Modus nur so breit wie NumberPad/Aktionen (nicht den
        // Restplatz füllen) — das Brett bekommt den übrigen Platz via
        // flexGrow, damit rechts kein Leerraum bleibt.
        width={flexDirection === "column" ? "100%" : "auto"}
        flex={flexDirection === "row" ? "0 0 auto" : undefined}
        display="flex"
        flexDirection={flexDirection === "column" ? "row" : "column"}
        alignItems={flexDirection === "column" ? "stretch" : "start"}
        gap={2}
        overflowY="auto"
      >
        <Box order={flexDirection === "column" ? 2 : 1} flex={flexDirection === "column" ? 1 : undefined} minW={0}>
          <NumberPad
            onNumberSelect={handleNumberSelect}
            onClear={handleClear}
            isDisabled={isTerminal}
            disabledNumbers={isTerminal ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : []}
            remainingDigits={remainingDigits}
          />
        </Box>

        <Grid
          // Mobil: kompaktes 2×3-Raster links neben dem NumberPad. Sidebar:
          // zwei gleich breite Spalten analog zum NumberPad.
          order={flexDirection === "column" ? 1 : 2}
          templateColumns="repeat(2, 1fr)"
          gap={2}
          width={actionGridWidth}
          flexShrink={0}
        >
          {gameState && !gameState.solved && (
            <Flex
              gridColumn="1 / span 2"
              h={6}
              align="center"
              justify="center"
              gap={4}
              role="status"
              aria-label={`${gameState.hintsUsed || 0} von ${MAX_HINTS} Hinweisen und ${gameState.mistakesUsed || 0} von ${MAX_MISTAKES} Fehlversuchen verbraucht`}
            >
              <Flex align="center" gap={1} color="text.muted">
                <InfoIcon boxSize="10px" color="status.success" aria-hidden="true" />
                <Text fontSize="2xs" fontFamily="mono">{gameState.hintsUsed || 0}/{MAX_HINTS}</Text>
              </Flex>
              <Flex align="center" gap={1} color="text.muted">
                <WarningIcon boxSize="10px" color="status.error" aria-hidden="true" />
                <Text fontSize="2xs" fontFamily="mono">{gameState.mistakesUsed || 0}/{MAX_MISTAKES}</Text>
              </Flex>
            </Flex>
          )}
          {/* Bleistiftmodus-Toggle (Issue #4): Mode-Switch, kein Verbraucher.
              Visual: solid + outline-Ring bei aktiv = nicht rein farblich.
              aria-pressed trägt den Modus-Zustand für Screenreader. */}
          <RippleButton
            onClick={() => setPencilMode(v => !v)}
            variant={pencilMode ? 'solid' : 'outline'}
            aria-label="Bleistiftmodus"
            aria-pressed={pencilMode}
            boxShadow={pencilMode ? 'outline' : undefined}
            data-testid="pencil-toggle"
            isDisabled={isTerminal}
            width="100%"
          >
            <EditIcon />
          </RippleButton>
          {/* Strategischer Tipp: dezent, nicht im Vordergrund. */}
          <RippleButton
            variant="outline"
            onClick={requestStrategicHint}
            isDisabled={!gameState || isTerminal || cages.length === 0}
            aria-label="Tipp"
            width="100%"
          >
            <BellIcon />
          </RippleButton>
          {/* Direkter Reveal-Hinweis: brand primary, klar als primäre Aktion. */}
          <RippleButton
            variant="solid"
            onClick={handleRevealHint}
            isDisabled={!gameState || isTerminal || (gameState.hintsUsed || 0) >= MAX_HINTS}
            aria-label={`Hinweis (${MAX_HINTS - (gameState?.hintsUsed || 0)})`}
            width="100%"
          >
            <AddIcon />
          </RippleButton>
          {/* Reset: tonal, nicht akzent. */}
          <RippleButton
            variant="ghost"
            onClick={requestReset}
            isDisabled={!gameState}
            aria-label="Reset"
            width="100%"
          >
            <RepeatClockIcon />
          </RippleButton>
          <RippleButton
            variant="ghost"
            onClick={() => { void undo(); }}
            isDisabled={!gameState || isTerminal || !canUndo}
            aria-label="Rückgängig"
            width="100%"
          >
            <ArrowBackIcon />
          </RippleButton>
          <RippleButton
            variant="ghost"
            onClick={() => { void redo(); }}
            isDisabled={!gameState || isTerminal || !canRedo}
            aria-label="Wiederherstellen"
            width="100%"
          >
            <ArrowForwardIcon />
          </RippleButton>
        </Grid>

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
      <AlertDialog isOpen={resetOpen} leastDestructiveRef={cancelResetRef} onClose={() => setResetOpen(false)} isCentered>
        <AlertDialogOverlay><AlertDialogContent>
          <AlertDialogHeader>Rätsel zurücksetzen?</AlertDialogHeader>
          <AlertDialogBody>Deine Eingaben und Notiz-Kandidaten werden gelöscht. Das lässt sich nicht rückgängig machen.</AlertDialogBody>
          <AlertDialogFooter gap={3}>
            <Button ref={cancelResetRef} onClick={() => setResetOpen(false)}>Abbrechen</Button>
            <Button onClick={resetGame}>Zurücksetzen</Button>
          </AlertDialogFooter>
        </AlertDialogContent></AlertDialogOverlay>
      </AlertDialog>
    </Flex>
  );
};

export default Board;
