import React, { useState, useEffect, useRef } from 'react';
import { Box, Grid, Text, Spinner, useBreakpointValue, Flex, Button, Stack, Alert, AlertIcon, AlertTitle, AlertDescription, keyframes, useToast } from '@chakra-ui/react';
import { RepeatIcon, AddIcon } from '@chakra-ui/icons';
import useGameState from '../../hooks/useGameState';
import NumberPad from '../NumberPad/NumberPad';
import { Cage, CellPosition, GameLevel } from '../../types/gameTypes';
import * as GameLogic from '../../services/gameLogicService';
import { createEmptyBoard } from '../../services/puzzleGeneratorService';
import RippleButton from '../common/RippleButton';
import FadeInView from '../common/FadeInView';
import { recordSolve } from '../../services/statisticsService';

// Animation für die hervorgehobene Zelle
const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

// Animation für erfolgreiche Eingabe
const successAnimation = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

// Animation für Fehleingabe
const errorAnimation = keyframes`
  0% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  50% { transform: translateX(3px); }
  75% { transform: translateX(-3px); }
  100% { transform: translateX(0); }
`;

// Animation für mögliche Werte
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

// Hilfsfunktion zum Abrufen des Käfigs für eine bestimmte Zelle
function getCageForCell(cages: Cage[], row: number, col: number): Cage | undefined {
  return GameLogic.getCageForCell(cages, row, col);
}

// Hilfsfunktion zum Prüfen, ob zwei Zellen im gleichen Käfig sind
function areCellsInSameCage(cages: Cage[], row1: number, col1: number, row2: number, col2: number): boolean {
  return GameLogic.areCellsInSameCage(cages, row1, col1, row2, col2);
}

// Hilfsfunktion, um das obere linke Feld eines Käfigs zu bestimmen
function findTopLeftCellInCage(cage: Cage): CellPosition | null {
  if (!cage || !cage.cells || cage.cells.length === 0) return null;
  
  // Sortieren nach Zeile (primär) und Spalte (sekundär)
  const sortedCells = [...cage.cells].sort((a, b) => {
    if (a.row !== b.row) {
      return a.row - b.row;
    }
    return a.col - b.col;
  });
  
  return sortedCells[0];
}

export const Board: React.FC<BoardProps> = ({ 
  size = 9, 
  puzzleId = 'default',
  levelData = null,
  isLoading: externalLoading = false,
  error: externalError = null,
  blackAndWhiteMode = false
}) => {
  const toast = useToast();
  const { gameState, isLoading: stateLoading, updateGameState } = useGameState(puzzleId);
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [dragStart, setDragStart] = useState<CellPosition | null>(null);
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const boardFocusRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState<number>(50);
  const [cages, setCages] = useState<Cage[]>([]);
  const [hasError, setHasError] = useState<boolean>(false);
  const [lastEnteredCell, setLastEnteredCell] = useState<CellPosition | null>(null);
  const [lastEnteredValue, setLastEnteredValue] = useState<number>(0);
  const [lastEnteredValid, setLastEnteredValid] = useState<boolean>(true);
  const [animating, setAnimating] = useState<boolean>(false);
  const [showHints, setShowHints] = useState<boolean>(false);
  const [possibleValues, setPossibleValues] = useState<number[]>([]);
  const solveRecordedRef = useRef<string | null>(null);
  const maxHints = 3;
  const maxMistakes = 3;
  const isGameOver = (gameState?.mistakesUsed || 0) >= maxMistakes;

  // Responsive Design: Zellengrößen anpassen je nach Bildschirmgröße
  const cellSizeByBreakpoint = useBreakpointValue({
    base: 36,  // Mobil
    sm: 42,    // Tablet klein
    md: 48,    // Tablet
    lg: 66,    // Desktop (erhöht von 60)
    xl: 72     // Großer Bildschirm (erhöht von 66)
  }) || 48;

  // Schriftgrößen für Zahlen und Summenwerte je nach Bildschirmgröße
  const valueFontSize = useBreakpointValue({
    base: "md",
    sm: "lg",
    md: "xl",
    lg: "xl"
  }) || "lg";

  const sumFontSize = useBreakpointValue({
    base: "2xs",
    sm: "xs",
    md: "xs",
    lg: "xs"
  }) || "xs";

  // Flex-Richtung für das Layout der Spielbrett- und Nummernpad-Container
  const flexDirection = useBreakpointValue({
    base: "column", // Untereinander auf kleinen Bildschirmen
    lg: "row"      // Nebeneinander ab großen Bildschirmen
  }) as "column" | "row";

  // Lade Level-Daten in den State, wenn sie verfügbar sind
  useEffect(() => {
    if (levelData && levelData.cages) {
      console.log('Board: Level geladen:', levelData);
      setCages(levelData.cages);
      
      // Initialisiere sofort mit den initialValues, wenn Level-Daten vorliegen
      if (levelData.initialValues && gameState) {
        console.log('Board: initialValues verfügbar, setze direkt:', levelData.initialValues);
        
        // Direkte Aktualisierung, wenn sich levelId geändert hat oder wenn gameState.cellValues nur Nullen enthält
        const isEmptyBoard = gameState.cellValues.every(row => row.every(cell => cell === 0));
        const isDifferentLevel = gameState.levelId !== puzzleId;
        
        if (isDifferentLevel || isEmptyBoard) {
          console.log('Board: Aktualisiere cellValues mit initialValues');
          // Tiefe Kopie der initialValues erstellen und als cellValues setzen
          const initialValuesCopy = JSON.parse(JSON.stringify(levelData.initialValues));
          updateGameState({
            cellValues: initialValuesCopy,
            levelId: puzzleId
          });
        }
      }
    } else if (!levelData && !externalLoading) {
      setHasError(true);
    } else {
      setHasError(false);
    }
  }, [levelData, puzzleId, externalLoading, gameState, updateGameState]);

  // Größe des Spielbretts dynamisch anpassen beim Mounten und bei Größenänderungen
  useEffect(() => {
    // Variablen zum Verfolgen der Stabilisierung der Größe
    let resizeAttempts = 0;
    const maxResizeAttempts = 3;
    let lastCellSize = cellSize;
    let stabilizationTimer: NodeJS.Timeout;

    const handleResize = () => {
      if (boardRef.current) {
        // Verfügbaren Platz ermitteln - Berücksichtige den Container-Padding
        const boardBox = boardRef.current.getBoundingClientRect();
        const parentWidth = boardBox.width - 16; // Berücksichtige Innenpolsterung
        const parentHeight = boardBox.height - 16;
        
        // Berechne die maximal mögliche Zellengröße basierend auf der Breite und Höhe
        const maxByWidth = Math.floor(parentWidth / size);
        const maxByHeight = Math.floor(parentHeight / size);
        
        // Wähle den kleineren Wert, um sicherzustellen, dass das Brett ohne Scrollbars passt
        const maxCellSize = Math.min(maxByWidth, maxByHeight);
        
        // Begrenzen der Zellgröße auf ein sinnvolles Maximum/Minimum
        // Für mobile Geräte (schmale Bildschirme) verwenden wir eine kleinere Mindestgröße
        const isMobile = window.innerWidth < 768;
        const minSize = isMobile ? 24 : 28;
        
        // Berechnete optimale Größe, nicht größer als vom Breakpoint vorgegeben
        const optimalSize = Math.min(maxCellSize, cellSizeByBreakpoint);
        
        // Neue Zellgröße, mindestens minSize
        const newCellSize = Math.max(minSize, optimalSize);
        
        // Wenn wir einen stabilen Zustand erreicht haben oder die maximale Anzahl von Versuchen überschritten haben
        if (Math.abs(newCellSize - lastCellSize) < 2 || resizeAttempts >= maxResizeAttempts) {
          // Nur aktualisieren, wenn eine wesentliche Änderung vorliegt
          if (Math.abs(newCellSize - cellSize) >= 2) {
            setCellSize(newCellSize);
          }
          
          // Tracking zurücksetzen für das nächste Resize-Event
          resizeAttempts = 0;
          clearTimeout(stabilizationTimer);
          return;
        }
        
        // Verfolge die aktuelle Größe für den nächsten Vergleich
        lastCellSize = newCellSize;
        
        // Inkrementiere die Anzahl der Resize-Versuche
        resizeAttempts++;
        
        // Setze die aktuelle Größe
        setCellSize(newCellSize);
        
        // Nach einer kurzen Verzögerung erneut prüfen, ob die Größe stabil ist
        clearTimeout(stabilizationTimer);
        stabilizationTimer = setTimeout(handleResize, 50);
      }
    };

    // Initial-Verzögerung für das erste Rendering
    const initialDelayTimer = setTimeout(() => {
      handleResize();
      
      // Event-Listener für weitere Größenänderungen
      window.addEventListener('resize', () => {
        // Zurücksetzen des Stabilisierungs-Trackings bei einem neuen Resize-Event
        resizeAttempts = 0;
        clearTimeout(stabilizationTimer);
        handleResize();
      });
    }, 300); // Längere anfängliche Verzögerung, um sicherzustellen, dass das Layout fertig ist
    
    return () => {
      clearTimeout(initialDelayTimer);
      clearTimeout(stabilizationTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [size, cellSizeByBreakpoint]);

  // Handler für F5 (Hinweise)
  useEffect(() => {
    const handleKeyboardHints = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        setShowHints(prev => !prev);
        
        if (selectedCell && gameState) {
          const hints = GameLogic.getPossibleValues(
            gameState.cellValues,
            selectedCell.row,
            selectedCell.col,
            cages,
            size
          );
          setPossibleValues(hints);
        }
      }
    };

    window.addEventListener('keydown', handleKeyboardHints);
    return () => window.removeEventListener('keydown', handleKeyboardHints);
  }, [selectedCell, gameState, cages, size]);

  // Aktualisiere mögliche Werte wenn sich die Zellauswahl ändert
  useEffect(() => {
    if (selectedCell && gameState && showHints) {
      const hints = GameLogic.getPossibleValues(
        gameState.cellValues,
        selectedCell.row,
        selectedCell.col,
        cages,
        size
      );
      setPossibleValues(hints);
    } else {
      setPossibleValues([]);
    }
  }, [selectedCell, gameState, showHints, cages]);

  // Berechnet die Anzahl der noch verfügbaren Ziffern (von den 9 möglichen)
  const calculateRemainingDigits = (): { [key: number]: number } => {
    if (!gameState) return {};
    
    // Initialisiere ein Objekt, das für jede Ziffer von 1-9 zählt, wie oft sie verwendet wurde
    const usedDigits: { [key: number]: number } = {};
    for (let i = 1; i <= 9; i++) {
      usedDigits[i] = 0;
    }
    
    // Zähle, wie oft jede Ziffer im Spielfeld vorkommt
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const value = gameState.cellValues[row][col];
        if (value > 0) {
          usedDigits[value]++;
        }
      }
    }
    
    // Berechne die verbleibenden Ziffern (9 - Anzahl der verwendeten)
    const remainingDigits: { [key: number]: number } = {};
    for (let i = 1; i <= 9; i++) {
      remainingDigits[i] = 9 - usedDigits[i];
    }
    
    return remainingDigits;
  };

  // Berechne die verbleibenden Ziffern, wenn sich der Spielzustand ändert
  const remainingDigits = calculateRemainingDigits();

  const handleDragStart = (row: number, col: number) => {
    const cellPosition = { row, col };
    setSelectedCell(cellPosition);
    setDragStart(cellPosition);
    setSelectedCells([cellPosition]);
    setIsDragging(true);
  };

  const handleDragEnter = (row: number, col: number) => {
    if (!isDragging || !dragStart) return;

    const minRow = Math.min(dragStart.row, row);
    const maxRow = Math.max(dragStart.row, row);
    const minCol = Math.min(dragStart.col, col);
    const maxCol = Math.max(dragStart.col, col);

    const newSelectedCells: CellPosition[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        newSelectedCells.push({ row: r, col: c });
      }
    }
    setSelectedCells(newSelectedCells);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleNumberSelect = (number: number) => {
    if (!gameState || !levelData) return;
    if (isGameOver) {
      toast({
        title: 'Game Over',
        description: 'Du hast das Fehlerlimit erreicht. Bitte starte neu.',
        status: 'error',
        duration: 2500,
        isClosable: true
      });
      return;
    }

    const newValues = gameState.cellValues.map((row: number[]) => [...row]);
    let lastCell: CellPosition | null = null;
    let lastValid = true;
    let mistakesAdded = 0;

    selectedCells.forEach(({ row, col }) => {
      // Überprüfen, ob die Zelle vorausgefüllt ist
      if (levelData.initialValues[row][col] === 0) {
        const currentValue = newValues[row][col];
        if (currentValue === number) return;

        newValues[row][col] = number;
        lastCell = { row, col }; // Letzte Zelle für Animation
        const isValid = GameLogic.isCellValid(newValues, row, col, number, cages, size);
        lastValid = isValid;
        if (!isValid) {
          mistakesAdded += 1;
        }
      }
    });

    if (!lastCell) {
      return;
    }

    const previousMistakes = gameState.mistakesUsed || 0;
    const updatedMistakes = Math.min(maxMistakes, previousMistakes + mistakesAdded);
    const gameOverNow = updatedMistakes >= maxMistakes;

    updateGameState({
      cellValues: newValues,
      mistakesUsed: updatedMistakes,
      gameOver: gameOverNow
    });

    // Für Animations-Feedback
    setLastEnteredCell(lastCell);
    setLastEnteredValue(number);
    setLastEnteredValid(lastValid);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 500);

    if (!isGameOver && gameOverNow) {
      toast({
        title: 'Game Over',
        description: 'Du hast das Fehlerlimit erreicht.',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleClear = () => {
    if (!gameState || !levelData) return;
    if (isGameOver) {
      toast({
        title: 'Game Over',
        description: 'Du kannst keine Änderungen mehr machen.',
        status: 'info',
        duration: 2000,
        isClosable: true
      });
      return;
    }

    const newValues = gameState.cellValues.map((row: number[]) => [...row]);
    selectedCells.forEach(({ row, col }) => {
      // Überprüfen, ob die Zelle vorausgefüllt ist
      if (levelData.initialValues[row][col] === 0) {
        newValues[row][col] = 0;
      }
    });

    updateGameState({
      cellValues: newValues
    });
  };

  const findHintTarget = () => {
    if (!levelData || !gameState || !levelData.solution) return null;

    if (selectedCell) {
      const { row, col } = selectedCell;
      if (levelData.initialValues[row][col] === 0) {
        const currentValue = gameState.cellValues[row][col];
        const solutionValue = levelData.solution[row]?.[col];
        if (solutionValue && currentValue !== solutionValue) {
          return selectedCell;
        }
      }
    }

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (levelData.initialValues[row][col] === 0) {
          const currentValue = gameState.cellValues[row][col];
          const solutionValue = levelData.solution[row]?.[col];
          if (solutionValue && currentValue !== solutionValue) {
            return { row, col };
          }
        }
      }
    }

    return null;
  };

  const handleRevealHint = () => {
    if (!gameState || !levelData) return;
    if (isGameOver) {
      toast({
        title: 'Game Over',
        description: 'Hinweise sind nach Game Over nicht verfügbar.',
        status: 'info',
        duration: 2500,
        isClosable: true
      });
      return;
    }

    const hintsUsed = gameState.hintsUsed || 0;
    if (hintsUsed >= maxHints) {
      toast({
        title: 'Hinweise aufgebraucht',
        description: `Du hast bereits alle ${maxHints} Hinweise genutzt.`,
        status: 'info',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    if (!levelData.solution) {
      toast({
        title: 'Kein Hinweis verfügbar',
        description: 'Für dieses Level ist keine Lösung hinterlegt.',
        status: 'warning',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    const target = findHintTarget();
    if (!target) {
      toast({
        title: 'Keine leere Zelle',
        description: 'Es gibt keine freien Zellen für einen Hinweis.',
        status: 'info',
        duration: 2500,
        isClosable: true
      });
      return;
    }

    const correctValue = levelData.solution[target.row]?.[target.col];
    if (!correctValue) {
      toast({
        title: 'Hinweis fehlgeschlagen',
        description: 'Die Lösung enthält keinen Wert für diese Zelle.',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    const newValues = gameState.cellValues.map((row: number[]) => [...row]);
    newValues[target.row][target.col] = correctValue;

    setSelectedCell(target);
    setSelectedCells([target]);

    updateGameState({
      cellValues: newValues,
      hintsUsed: hintsUsed + 1
    });

    setLastEnteredCell(target);
    setLastEnteredValue(correctValue);
    setLastEnteredValid(isCellValid(target.row, target.col, correctValue));
    setAnimating(true);
    setTimeout(() => setAnimating(false), 500);
  };

  const isSameBlock = (row1: number, col1: number, row2: number, col2: number) => {
    return (
      Math.floor(row1 / 3) === Math.floor(row2 / 3) &&
      Math.floor(col1 / 3) === Math.floor(col2 / 3)
    );
  };

  // Überprüft, ob der Wert einer Zelle mit dem Wert der ausgewählten Zelle übereinstimmt
  const hasSameValue = (cellRow: number, cellCol: number): boolean => {
    if (!selectedCell || !gameState) return false;
    
    const selectedValue = gameState.cellValues[selectedCell.row][selectedCell.col];
    const cellValue = gameState.cellValues[cellRow][cellCol];
    
    // Nur Übereinstimmungen für Zellen mit Werten (nicht leer)
    return selectedValue !== 0 && selectedValue === cellValue;
  };

  // Überprüft, ob eine Zelle gültig ist
  const isCellValid = (row: number, col: number, value: number): boolean => {
    if (!gameState) return true;
    return GameLogic.isCellValid(gameState.cellValues, row, col, value, cages, size);
  };

  // Überprüft, ob ein Käfig vollständig und korrekt ist
  const isCageComplete = (cage: Cage): boolean => {
    if (!gameState) return false;
    return GameLogic.isCageComplete(gameState.cellValues, cage);
  };

  // Überprüft, ob das gesamte Board vollständig und korrekt ist
  const isBoardComplete = (): boolean => {
    if (!gameState) return false;
    return GameLogic.isBoardComplete(gameState.cellValues, cages, size);
  };

  // Neuer Keyboard-Handler für die Tastatureingabe
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Wenn keine Zelle ausgewählt ist, standardmäßig die erste Zelle auswählen
    if (!selectedCell && boardRef.current) {
      const newSelected = { row: 0, col: 0 };
      setSelectedCell(newSelected);
      setSelectedCells([newSelected]);
      return;
    }

    if (!selectedCell) return;

    const lowerKey = e.key.toLowerCase();
    const normalizedKey =
      lowerKey === 'w' ? 'ArrowUp' :
      lowerKey === 'a' ? 'ArrowLeft' :
      lowerKey === 's' ? 'ArrowDown' :
      lowerKey === 'd' ? 'ArrowRight' :
      e.key;

    // Navigation mit Pfeiltasten
    const { row, col } = selectedCell;
    const newSelectedCell = { ...selectedCell };
    
    if (normalizedKey === 'ArrowUp' && row > 0) {
      newSelectedCell.row = row - 1;
    } else if (normalizedKey === 'ArrowDown' && row < size - 1) {
      newSelectedCell.row = row + 1;
    } else if (normalizedKey === 'ArrowLeft' && col > 0) {
      newSelectedCell.col = col - 1;
    } else if (normalizedKey === 'ArrowRight' && col < size - 1) {
      newSelectedCell.col = col + 1;
    }
    
    // Tab-Navigation durch die Zellen (vorwärts und rückwärts)
    else if (normalizedKey === 'Tab') {
      e.preventDefault(); // Verhindert den Standard-Tab-Fokus
      
      if (e.shiftKey) {
        // Rückwärts navigieren
        if (col > 0) {
          newSelectedCell.col = col - 1;
        } else if (row > 0) {
          newSelectedCell.row = row - 1;
          newSelectedCell.col = size - 1;
        } else {
          // Von der ersten Zelle zur letzten Zelle gehen
          newSelectedCell.row = size - 1;
          newSelectedCell.col = size - 1;
        }
      } else {
        // Vorwärts navigieren
        if (col < size - 1) {
          newSelectedCell.col = col + 1;
        } else if (row < size - 1) {
          newSelectedCell.row = row + 1;
          newSelectedCell.col = 0;
        } else {
          // Von der letzten Zelle zur ersten Zelle gehen
          newSelectedCell.row = 0;
          newSelectedCell.col = 0;
        }
      }
    }
    
    // Zahlen 1-9 für die Eingabe
    else if (/^[1-9]$/.test(e.key) && gameState && levelData) {
      const num = parseInt(e.key, 10);
      handleNumberSelect(num);
      return;
    }
    // Entfernen/Löschen mit Backspace, Delete oder 0
    else if (['Backspace', 'Delete', '0'].includes(e.key) && gameState && levelData) {
      handleClear();
      return;
    }
    // Mehrere Zellen mit Shift + Pfeiltasten auswählen
    else if (e.shiftKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(normalizedKey)) {
      if (!dragStart) {
        setDragStart(selectedCell);
      }
      
      // Bestimmung des Bereichs basierend auf Startpunkt und aktuellem Punkt
      const startRow = dragStart ? dragStart.row : selectedCell.row;
      const startCol = dragStart ? dragStart.col : selectedCell.col;
      const endRow = newSelectedCell.row;
      const endCol = newSelectedCell.col;
      
      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);
      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);
      
      // Alle Zellen im Bereich auswählen
      const newSelectedCells: CellPosition[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          newSelectedCells.push({ row: r, col: c });
        }
      }
      
      setSelectedCells(newSelectedCells);
    }
    
    // Aktualisieren der ausgewählten Zelle, wenn sie sich geändert hat
    if (newSelectedCell.row !== row || newSelectedCell.col !== col) {
      setSelectedCell(newSelectedCell);
      
      // Wenn keine Mehrfachauswahl aktiv ist (kein Shift gedrückt)
      if (!e.shiftKey) {
        setSelectedCells([newSelectedCell]);
        setDragStart(null);
      }
    }
  };

  // Focus-Management für Tastatureingabe
  useEffect(() => {
    // Keyboard-Fokus bekommen, wenn eine Zelle ausgewählt ist
    if (selectedCell && boardFocusRef.current) {
      boardFocusRef.current.focus();
    }
  }, [selectedCell]);

  useEffect(() => {
    if (!gameState) return;

    if (gameState.solved) {
      solveRecordedRef.current = puzzleId;
      return;
    }

    if (!levelData || !isBoardComplete()) return;
    if (solveRecordedRef.current === puzzleId) return;

    const finishedAt = Date.now();
    const startTime = gameState.startTime || finishedAt;
    const elapsedMs = Math.max(0, finishedAt - startTime);

    solveRecordedRef.current = puzzleId;
    updateGameState({
      solved: true,
      endTime: finishedAt,
      elapsedTime: elapsedMs
    });
    recordSolve(levelData.difficulty, elapsedMs);
  }, [gameState, levelData, puzzleId, updateGameState]);
  
  // Handler für Reset-Button
  const handleReset = () => {
    if (!gameState) return;
    
    // Alle Zellen auf 0 setzen, konsistent createEmptyBoard verwenden
    const emptyValues = createEmptyBoard(size);
    
    updateGameState({
      cellValues: emptyValues,
      mistakesUsed: 0,
      gameOver: false
    });
    
    // Auswahl zurücksetzen
    setSelectedCell(null);
    setSelectedCells([]);
  };
  
  const renderCell = (row: number, col: number) => {
    if (!gameState || !levelData) return null;

    const isSelected = selectedCells.some((cell: CellPosition) => cell.row === row && cell.col === col);
    const isSameRow = selectedCell && selectedCell.row === row;
    const isSameCol = selectedCell && selectedCell.col === col;
    const isSameBlk = selectedCell && isSameBlock(selectedCell.row, selectedCell.col, row, col);
    const cage = getCageForCell(cages, row, col);
    
    // Korrekte Bestimmung des Startzellen-Käfigs (oberste, linkeste Zelle)
    const topLeftCell = cage ? findTopLeftCellInCage(cage) : null;
    const isCageStart = topLeftCell && topLeftCell.row === row && topLeftCell.col === col;
    
    const value = gameState.cellValues[row][col];
    const valid = isCellValid(row, col, value);
    const isInitialValue = levelData.initialValues[row][col] !== 0;

    // Käfig-Status für verbesserte visuelle Rückmeldung
    const cageComplete = cage ? isCageComplete(cage) : false;
    
    // Überprüfen, ob benachbarte Zellen zum selben Käfig gehören
    const hasTopSameCage = row > 0 && areCellsInSameCage(cages, row, col, row-1, col);
    const hasLeftSameCage = col > 0 && areCellsInSameCage(cages, row, col, row, col-1);
    const hasRightSameCage = col < size-1 && areCellsInSameCage(cages, row, col, row, col+1);
    const hasBottomSameCage = row < size-1 && areCellsInSameCage(cages, row, col, row+1, col);

    // Prüfen, ob diese Zelle zuletzt geändert wurde (für Animation)
    const isLastEntered = lastEnteredCell && lastEnteredCell.row === row && lastEnteredCell.col === col;

    // Dynamische Hintergrundfarbe basierend auf verschiedenen Zuständen
    let bgColor = "white";
    if (cage) {
      // Im Schwarzweißmodus verwenden wir Graustufen anstelle von Farben
      if (blackAndWhiteMode) {
        // Käfignummer in Graustufe umwandeln (um verschiedene Käfige zu unterscheiden)
        const cageIndex = cages.indexOf(cage);
        const grayLevel = 100 - (cageIndex % 4) * 10; // Verschiedene Graustufen für verschiedene Käfige
        bgColor = `gray.${grayLevel}`;
      } else {
        bgColor = cage.color;
      }
    } else if ((isSameRow || isSameCol || isSameBlk) && !isInitialValue) {
      bgColor = blackAndWhiteMode ? "gray.50" : "blue.50";
    }

    // Wertfarbe basierend auf verschiedenen Zuständen
    let valueColor = isInitialValue ? "black" : (blackAndWhiteMode ? "gray.800" : "blue.700");
    if (!valid && value !== 0) {
      valueColor = blackAndWhiteMode ? "gray.800" : "red.500"; // Kräftigeres Rot für ungültige Einträge
    } else if (cageComplete && cage) {
      valueColor = blackAndWhiteMode ? "gray.900" : "green.700";
    }

    // Prüfen, ob diese Zelle den gleichen Wert hat wie die ausgewählte Zelle
    const isSameValue = hasSameValue(row, col);
    
    // Animation für diese Zelle bestimmen
    let animation = "none";
    if (animating && isLastEntered) {
      if (lastEnteredValid) {
        animation = `${successAnimation} 0.5s ease`;
      } else {
        animation = `${errorAnimation} 0.4s ease`;
      }
    } else if (isSelected && !isInitialValue) {
      animation = `${pulseAnimation} 1.5s infinite ease-in-out`;
    }

    // Schatten für tieferen visuellen Effekt
    const boxShadow = isSelected ? "0px 1px 3px rgba(0,0,0,0.2) inset" : "none";
    // Material Design-Elevation-Effekt für ausgewählte und ungültige Zellen
    const elevation = (!valid && value !== 0) ? 
      "0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)" : 
      "none";

    return (
      <Box
        key={`${row}-${col}`}
        data-testid={`cell-${row}-${col}`}
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
            const boardRect = boardRef.current.getBoundingClientRect();
            const touchX = touch.clientX - boardRect.left;
            const touchY = touch.clientY - boardRect.top;
            const touchCol = Math.floor(touchX / cellSize);
            const touchRow = Math.floor(touchY / cellSize);
            
            if (touchRow >= 0 && touchRow < size && touchCol >= 0 && touchCol < size &&
                (selectedCell?.row !== touchRow || selectedCell?.col !== touchCol)) {
              handleDragEnter(touchRow, touchCol);
            }
          }
        }}
        onTouchEnd={handleDragEnd}
        cursor="pointer"
        _hover={{ 
          opacity: 0.5  // Stärkere Verdunkelung durch stärker reduzierte Deckkraft
        }}
        boxShadow={boxShadow}
        transition="all 0.3s ease"
        zIndex={isSelected ? 1 : 0}
        style={{
          animation,
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
            bg={undefined}  // Kein Hintergrund für gelöste Käfige
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
            zIndex="2" // Erhöhter z-index, um sicherzustellen, dass die Zahl über der Linie liegt
            bg="rgba(255,255,255,0.7)" // Leicht transparenter weißer Hintergrund statt komplett transparent
            lineHeight="1"
            px="1px"
            borderRadius="2px" // Abgerundete Ecken für bessere Lesbarkeit
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
        
        {/* Anzeige der möglichen Werte */}
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
            {possibleValues.map((v) => (
              <Text
                key={v}
                fontSize={sumFontSize}
                color="gray.600"
                lineHeight="1"
              >
                {v}
              </Text>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const renderGrid = () => {
    if (!gameState) return null;

    const grid = [];
    for (let i = 0; i < size; i++) {
      const row = [];
      for (let j = 0; j < size; j++) {
        row.push(renderCell(i, j));
      }
      grid.push(
        <Grid key={i} templateColumns={`repeat(${size}, 1fr)`}>
          {row}
        </Grid>
      );
    }
    return grid;
  };

  // Kombinierte Ladeanzeige für den internen und externen Ladezustand
  const isLoadingCombined = stateLoading || externalLoading;

  // Fehleranzeige wenn kein Level geladen werden konnte
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

  // Prüfen, ob ein Level geladen ist
  if (!cages || cages.length === 0) {
    return (
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Kein Level geladen</AlertTitle>
          <AlertDescription>
            Bitte wählen Sie ein Level aus dem Level-Selektor.
          </AlertDescription>
        </Box>
      </Alert>
    );
  }

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
        _focus={{ 
          outline: "3px dashed #2196F3", 
          outlineOffset: "4px" 
        }}
      >
        <Box>
          {renderGrid()}
        </Box>
        
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
            isDisabled={!gameState || isGameOver || (gameState.hintsUsed || 0) >= maxHints}
          >
            <AddIcon mr={2} /> Hinweis ({maxHints - (gameState?.hintsUsed || 0)})
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
