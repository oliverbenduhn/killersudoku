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
import { markLevelSolved, markLevelStarted, parseLevelNumber } from '../../services/progressService';

import NumberPad from '../NumberPad/NumberPad';
import { Cage, GameLevel } from '../../types/gameTypes';
import RippleButton from '../common/RippleButton';
import FadeInView from '../common/FadeInView';
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
  // Käfige sind derived state — kommen direkt aus levelData. Vorher als
  // useState+useEffect gehalten, was im ersten Render-Tick ein leeres
  // Array lieferte; Drag-Events in diesem Fenster umgingen die Cage-
  // Constraint und fluteten die Auswahl (User-Report: "zwei Felder
  // markiert, plötzlich drei oder das ganze Brett dabei").
  const cages: Cage[] = levelData?.cages ?? [];
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
  // Sidebar-Action-Grid teilt die NumberPad-Breite, damit die 2-Spalten
  // nicht über das Pad hinausfließen (Sidebar ist via flex={1} breiter).
  const actionGridWidth = useBreakpointValue({ base: '100%', sm: '220px', md: '240px', lg: '260px' }) ?? '100%';

  // Cell Selection
  const {
    selectedCell,
    selectedCells,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    handleDoubleClick,
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
    if (!levelData && !externalLoading) {
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

    const levelNumber = parseLevelNumber(puzzleId);

    if (gameState.solved) {
      solveRecordedRef.current = puzzleId;
      if (levelNumber !== null) markLevelSolved(levelNumber);
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
      if (levelNumber !== null) markLevelSolved(levelNumber);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, levelData, puzzleId]);

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
        // Im Sidebar-Modus (row) soll das Brett oben in seiner 80vh-Box
        // starten statt vertikal zentriert zu sein, sonst steht die
        // NumberPad-Sidebar (top-aligned) höher als das Brett (Tablet-
        // Hochformat-Bug: Sidebar und Brett-Oberkante klafften auseinander).
        alignItems={flexDirection === "row" ? "flex-start" : "center"}
        boxShadow="md"
        borderRadius="lg"
        bg="surface.raised"
        position="relative"
        flexGrow={1}
        flexShrink={1}
        flexBasis={flexDirection === "row" ? "0" : "auto"}
        maxW={flexDirection === "column" ? "100%" : "80%"}
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
        {gameState && levelData && gameState.levelId === puzzleId && (
          <BoardSurface
            selectedCell={selectedCell}
            selectedCells={selectedCells}
            size={size}
            cellValues={gameState.cellValues}
            notes={gameState.notes}
            initialValues={levelData.initialValues}
            cages={cages}
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
            boardRef={boardRef}
            onCellPointerDown={handleDragStart}
            onCellPointerEnter={handleDragEnter}
            onCellPointerEnd={handleDragEnd}
            onCellDoubleClick={handleDoubleClick}
            blackAndWhiteMode={blackAndWhiteMode}
          />
        )}

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
            <Text fontSize="xl" fontWeight="bold" color="white">
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
        p={0}
        alignSelf={flexDirection === "column" ? "center" : "stretch"}
        mt={flexDirection === "column" ? 4 : 0}
        // Sidebar-Modus: kein Extra-Top-Padding — NumberPad soll bündig mit
        // der Brett-Oberkante starten (Tablet-Hochformat), sonst wirkt die
        // Sidebar künstlich nach unten verschoben.
        // Im Landscape keine Bottom-Nav-Overlap-Risk: Inhalt vor
        // Bottom-Nav enden lassen (Bottom-Nav ist 57 px + Safe-Area).
        pb={flexDirection === "row" ? "72px" : 2}
        // Im Sidebar-Modus nur so breit wie NumberPad/Aktionen (nicht den
        // Restplatz füllen) — das Brett bekommt den übrigen Platz via
        // flexGrow, damit rechts kein Leerraum bleibt.
        width={flexDirection === "column" ? "100%" : "auto"}
        flex={flexDirection === "row" ? "0 0 auto" : undefined}
        display="flex"
        flexDirection="column"
        alignItems={flexDirection === "column" ? "center" : "start"}
        overflowY="auto"
      >
        <NumberPad
          onNumberSelect={handleNumberSelect}
          onClear={handleClear}
          disabledNumbers={isGameOver ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : []}
          remainingDigits={remainingDigits}
        />
        <Grid
          // 3×2-Gitter analog NumberPad: Buttons so breit wie eine
          // Pad-Zelle (halbe Pad-Breite) — schafft Platz fürs Brett.
          // Breite muss zum NumberPad passen, sonst fließen die 2
          // Action-Spalten über die NumberPad-Breite hinaus (Sidebar
          // ist via flex={1} breiter als padWidth).
          templateColumns="repeat(2, 1fr)"
          gap={2}
          width={actionGridWidth}
          mt={4}
        >
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
            width="100%"
          >
            <EditIcon />
          </RippleButton>
          {/* Strategischer Tipp: dezent, nicht im Vordergrund. */}
          <RippleButton
            variant="outline"
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
            width="100%"
          >
            <BellIcon />
          </RippleButton>
          {/* Direkter Reveal-Hinweis: brand primary, klar als primäre Aktion. */}
          <RippleButton
            variant="solid"
            onClick={handleRevealHint}
            isDisabled={!gameState || isGameOver || (gameState.hintsUsed || 0) >= MAX_HINTS}
            aria-label={`Hinweis (${MAX_HINTS - (gameState?.hintsUsed || 0)})`}
            width="100%"
          >
            <AddIcon />
          </RippleButton>
          {/* Reset: tonal, nicht akzent. */}
          <RippleButton
            variant="ghost"
            onClick={handleReset}
            isDisabled={!gameState}
            aria-label="Reset"
            width="100%"
          >
            <RepeatClockIcon />
          </RippleButton>
          <RippleButton
            variant="ghost"
            onClick={() => { void undo(); }}
            isDisabled={!gameState || isGameOver || !canUndo}
            aria-label="Rückgängig"
            width="100%"
          >
            <ArrowBackIcon />
          </RippleButton>
          <RippleButton
            variant="ghost"
            onClick={() => { void redo(); }}
            isDisabled={!gameState || isGameOver || !canRedo}
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
    </Flex>
  );
};

export default Board;
