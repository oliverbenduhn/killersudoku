import React, { useState, useEffect, useRef } from 'react';
import { Box, Grid, Text, Spinner, useBreakpointValue, Flex, Button, Stack } from '@chakra-ui/react';
import { RepeatIcon, AddIcon } from '@chakra-ui/icons';
import useGameState from '../../hooks/useGameState';
import NumberPad from '../NumberPad/NumberPad';
import { Cage, CellPosition } from '../../types/gameTypes';
import * as GameLogic from '../../services/gameLogicService';
import { generateRandomCages, createEmptyBoard } from '../../services/puzzleGeneratorService';

interface BoardProps {
  size?: number;
  puzzleId?: string;
}

// Vollständige Abdeckung des Spielfelds mit Käfigen unterschiedlicher Größe
const exampleCages: Cage[] = [
  // Zeile 0
  { id: 'A1', sum: 17, color: 'yellow.100', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }] }, // 3er L-Form
  { id: 'A2', sum: 6, color: 'blue.100', cells: [{ row: 0, col: 2 }, { row: 1, col: 2 }] }, // 2er vertikal
  { id: 'A3', sum: 14, color: 'red.200', cells: [{ row: 0, col: 3 }, { row: 0, col: 4 }] }, // 2er horizontal
  { id: 'A4', sum: 17, color: 'green.100', cells: [{ row: 0, col: 5 }, { row: 0, col: 6 }, { row: 0, col: 7 }] }, // 3er horizontal
  { id: 'A5', sum: 7, color: 'purple.100', cells: [{ row: 0, col: 8 }] }, // 1er (Single-cell)
  
  // Zeile 1-2
  { id: 'B1', sum: 11, color: 'teal.100', cells: [{ row: 1, col: 1 }, { row: 2, col: 1 }] }, // 2er vertikal
  { id: 'B2', sum: 8, color: 'orange.100', cells: [{ row: 1, col: 3 }] }, // 1er (Single-cell)
  { id: 'B3', sum: 16, color: 'yellow.200', cells: [{ row: 1, col: 4 }, { row: 1, col: 5 }, { row: 2, col: 5 }] }, // 3er L-Form
  { id: 'B4', sum: 15, color: 'pink.100', cells: [{ row: 1, col: 6 }, { row: 1, col: 7 }, { row: 1, col: 8 }, { row: 2, col: 8 }] }, // 4er L-Form
  
  // Zeile 2
  { id: 'C1', sum: 13, color: 'blue.200', cells: [{ row: 2, col: 0 }, { row: 3, col: 0 }] }, // 2er vertikal
  { id: 'C2', sum: 11, color: 'red.100', cells: [{ row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 }] }, // 3er horizontal
  { id: 'C3', sum: 12, color: 'gray.200', cells: [{ row: 2, col: 6 }, { row: 2, col: 7 }] }, // 2er horizontal
  
  // Zeile 3
  { id: 'D1', sum: 13, color: 'cyan.100', cells: [{ row: 3, col: 1 }, { row: 3, col: 2 }] }, // 2er horizontal
  { id: 'D2', sum: 29, color: 'green.200', cells: [{ row: 3, col: 3 }, { row: 3, col: 4 }, { row: 3, col: 5 }, { row: 3, col: 6 }, { row: 3, col: 7 }] }, // 5er horizontal
  { id: 'D3', sum: 6, color: 'yellow.300', cells: [{ row: 3, col: 8 }, { row: 4, col: 8 }] }, // 2er vertikal
  
  // Zeile 4
  { id: 'E1', sum: 14, color: 'orange.200', cells: [{ row: 4, col: 0 }, { row: 4, col: 1 }, { row: 5, col: 0 }] }, // 3er L-Form
  { id: 'E2', sum: 24, color: 'teal.200', cells: [{ row: 4, col: 2 }, { row: 4, col: 3 }, { row: 4, col: 4 }, { row: 5, col: 3 }] }, // 4er unregelmäßig
  { id: 'E3', sum: 9, color: 'purple.200', cells: [{ row: 4, col: 5 }, { row: 4, col: 6 }] }, // 2er horizontal
  { id: 'E4', sum: 3, color: 'red.100', cells: [{ row: 4, col: 7 }] }, // 1er (Single-cell)
  
  // Zeile 5
  { id: 'F1', sum: 15, color: 'blue.100', cells: [{ row: 5, col: 1 }, { row: 5, col: 2 }] }, // 2er horizontal
  { id: 'F2', sum: 16, color: 'pink.200', cells: [{ row: 5, col: 4 }, { row: 5, col: 5 }, { row: 5, col: 6 }] }, // 3er horizontal
  { id: 'F3', sum: 17, color: 'green.100', cells: [{ row: 5, col: 7 }, { row: 5, col: 8 }, { row: 6, col: 8 }] }, // 3er L-Form
  
  // Zeile 6
  { id: 'G1', sum: 23, color: 'yellow.100', cells: [{ row: 6, col: 0 }, { row: 6, col: 1 }, { row: 6, col: 2 }, { row: 7, col: 0 }] }, // 4er L-Form
  { id: 'G2', sum: 13, color: 'purple.100', cells: [{ row: 6, col: 3 }, { row: 6, col: 4 }] }, // 2er horizontal
  { id: 'G3', sum: 12, color: 'teal.100', cells: [{ row: 6, col: 5 }, { row: 6, col: 6 }, { row: 6, col: 7 }] }, // 3er horizontal
  
  // Zeile 7-8
  { id: 'H1', sum: 16, color: 'pink.100', cells: [{ row: 7, col: 1 }, { row: 7, col: 2 }, { row: 8, col: 1 }] }, // 3er L-Form
  { id: 'H2', sum: 15, color: 'orange.100', cells: [{ row: 7, col: 3 }, { row: 7, col: 4 }, { row: 7, col: 5 }] }, // 3er horizontal
  { id: 'H3', sum: 10, color: 'blue.200', cells: [{ row: 7, col: 6 }, { row: 7, col: 7 }, { row: 7, col: 8 }] }, // 3er horizontal
  
  // Zeile 8
  { id: 'I1', sum: 8, color: 'green.200', cells: [{ row: 8, col: 0 }] }, // 1er (Single-cell)
  { id: 'I2', sum: 14, color: 'red.200', cells: [{ row: 8, col: 2 }, { row: 8, col: 3 }] }, // 2er horizontal
  { id: 'I3', sum: 12, color: 'yellow.200', cells: [{ row: 8, col: 4 }, { row: 8, col: 5 }] }, // 2er horizontal
  { id: 'I4', sum: 18, color: 'purple.200', cells: [{ row: 8, col: 6 }, { row: 8, col: 7 }, { row: 8, col: 8 }] }, // 3er horizontal
];

// Hilfsfunktion zum Abrufen des Käfigs für eine bestimmte Zelle
function getCageForCell(cages: Cage[], row: number, col: number): Cage | undefined {
  return GameLogic.getCageForCell(cages, row, col);
}

// Hilfsfunktion zum Prüfen, ob zwei Zellen im gleichen Käfig sind
function areCellsInSameCage(cages: Cage[], row1: number, col1: number, row2: number, col2: number): boolean {
  return GameLogic.areCellsInSameCage(cages, row1, col1, row2, col2);
}

export const Board: React.FC<BoardProps> = ({ size = 9, puzzleId = 'default' }) => {
  const { gameState, isLoading, updateGameState } = useGameState(puzzleId);
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [dragStart, setDragStart] = useState<CellPosition | null>(null);
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const boardFocusRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState<number>(50);
  const [cages, setCages] = useState<Cage[]>(exampleCages);

  // Responsive Design: Zellengrößen anpassen je nach Bildschirmgröße
  const cellSizeByBreakpoint = useBreakpointValue({
    base: 32, // Mobil
    sm: 36,   // Tablet klein
    md: 42,   // Tablet
    lg: 50,   // Desktop
    xl: 56    // Großer Bildschirm
  }) || 42;

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
    md: "row"      // Nebeneinander ab mittlerer Größe
  }) as "column" | "row";

  // Größe des Spielbretts dynamisch anpassen beim Mounten und bei Größenänderungen
  useEffect(() => {
    const handleResize = () => {
      if (boardRef.current) {
        const containerWidth = boardRef.current.clientWidth;
        const maxCellSize = Math.floor((containerWidth - 12) / size); // 12px für Padding
        setCellSize(Math.min(maxCellSize, cellSizeByBreakpoint));
      }
    };

    // Beim ersten Render
    handleResize();

    // Event-Listener für Größenänderungen
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size, cellSizeByBreakpoint]);

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
    if (!gameState) return;

    const newValues = gameState.cellValues.map((row: number[]) => [...row]);
    selectedCells.forEach(({ row, col }) => {
      newValues[row][col] = number;
    });

    updateGameState({
      cellValues: newValues
    });
  };

  const handleClear = () => {
    if (!gameState) return;

    const newValues = gameState.cellValues.map((row: number[]) => [...row]);
    selectedCells.forEach(({ row, col }) => {
      newValues[row][col] = 0;
    });

    updateGameState({
      cellValues: newValues
    });
  };

  const isSameBlock = (row1: number, col1: number, row2: number, col2: number) => {
    return (
      Math.floor(row1 / 3) === Math.floor(row2 / 3) &&
      Math.floor(col1 / 3) === Math.floor(col2 / 3)
    );
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

    // Navigation mit Pfeiltasten
    const { row, col } = selectedCell;
    const newSelectedCell = { ...selectedCell };
    
    if (e.key === 'ArrowUp' && row > 0) {
      newSelectedCell.row = row - 1;
    } else if (e.key === 'ArrowDown' && row < size - 1) {
      newSelectedCell.row = row + 1;
    } else if (e.key === 'ArrowLeft' && col > 0) {
      newSelectedCell.col = col - 1;
    } else if (e.key === 'ArrowRight' && col < size - 1) {
      newSelectedCell.col = col + 1;
    }
    
    // Tab-Navigation durch die Zellen (vorwärts und rückwärts)
    else if (e.key === 'Tab') {
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
    else if (/^[1-9]$/.test(e.key) && gameState) {
      const num = parseInt(e.key, 10);
      const newValues = gameState.cellValues.map((row: number[]) => [...row]);
      
      // Nur die aktuell ausgewählten Zellen aktualisieren
      selectedCells.forEach(cell => {
        newValues[cell.row][cell.col] = num;
      });
      
      updateGameState({
        cellValues: newValues
      });
      return;
    }
    // Entfernen/Löschen mit Backspace, Delete oder 0
    else if (['Backspace', 'Delete', '0'].includes(e.key) && gameState) {
      const newValues = gameState.cellValues.map((row: number[]) => [...row]);
      
      // Nur die aktuell ausgewählten Zellen löschen
      selectedCells.forEach(cell => {
        newValues[cell.row][cell.col] = 0;
      });
      
      updateGameState({
        cellValues: newValues
      });
      return;
    }
    // Mehrere Zellen mit Shift + Pfeiltasten auswählen
    else if (e.shiftKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
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
  
  // Handler für Reset-Button
  const handleReset = () => {
    if (!gameState) return;
    
    // Alle Zellen auf 0 setzen
    const emptyValues = Array(size).fill(0).map(() => Array(size).fill(0));
    
    updateGameState({
      cellValues: emptyValues
    });
    
    // Auswahl zurücksetzen
    setSelectedCell(null);
    setSelectedCells([]);
  };
  
  // Handler für "Neues Spielfeld"-Button
  const handleNewPuzzle = () => {
    // Generiere neue zufällige Käfige
    const newCages = generateRandomCages(size);
    setCages(newCages);
    
    // Setze Spielfeld zurück
    const emptyValues = createEmptyBoard(size);
    
    updateGameState({
      cellValues: emptyValues
    });
    
    // Auswahl zurücksetzen
    setSelectedCell(null);
    setSelectedCells([]);
  };

  const renderCell = (row: number, col: number) => {
    if (!gameState) return null;

    const isSelected = selectedCells.some((cell: CellPosition) => cell.row === row && cell.col === col);
    const isSameRow = selectedCell && selectedCell.row === row;
    const isSameCol = selectedCell && selectedCell.col === col;
    const isSameBlk = selectedCell && isSameBlock(selectedCell.row, selectedCell.col, row, col);
    const cage = getCageForCell(cages, row, col);
    const isCageStart = cage && cage.cells[0].row === row && cage.cells[0].col === col;
    const value = gameState.cellValues[row][col];
    const valid = isCellValid(row, col, value);

    // Käfig-Status für verbesserte visuelle Rückmeldung
    const cageComplete = cage ? isCageComplete(cage) : false;
    
    // Überprüfen, ob benachbarte Zellen zum selben Käfig gehören
    const hasTopSameCage = row > 0 && areCellsInSameCage(cages, row, col, row-1, col);
    const hasLeftSameCage = col > 0 && areCellsInSameCage(cages, row, col, row, col-1);
    const hasRightSameCage = col < size-1 && areCellsInSameCage(cages, row, col, row, col+1);
    const hasBottomSameCage = row < size-1 && areCellsInSameCage(cages, row, col, row+1, col);

    // Dynamische Hintergrundfarbe basierend auf verschiedenen Zuständen
    let bgColor = "white";
    if (isSelected) {
      bgColor = "blue.100";
    } else if (value && !valid) {
      bgColor = "red.100";  // Ungültige Einträge
    } else if (cage) {
      if (cageComplete) {
        bgColor = `${cage.color.split('.')[0]}.300`; // Intensivere Version der gleichen Farbe
      } else {
        bgColor = cage.color;
      }
    } else if (isSameRow || isSameCol || isSameBlk) {
      bgColor = "blue.50";
    }

    // Wertfarbe basierend auf verschiedenen Zuständen
    let valueColor = "black";
    if (!valid && value !== 0) {
      valueColor = "red.600";  // Ungültige Einträge
    } else if (cageComplete && cage) {
      valueColor = "green.700";  // Korrekte Käfige
    } else if (value) {
      valueColor = "blue.700";  // Normale Einträge
    }

    // CSS-Animation für ungültige Einträge
    const animationKeyframes = value && !valid ? `
      @keyframes pulsateRed {
        0% { box-shadow: 0 0 0 0 rgba(254, 178, 178, 0.7); }
        70% { box-shadow: 0 0 0 6px rgba(254, 178, 178, 0); }
        100% { box-shadow: 0 0 0 0 rgba(254, 178, 178, 0); }
      }
    ` : '';

    return (
      <Box
        key={`${row}-${col}`}
        position="relative"
        w={`${cellSize}px`}
        h={`${cellSize}px`}
        border="1px solid black"
        borderRight={col % 3 === 2 ? "2px solid black" : "1px solid black"}
        borderBottom={row % 3 === 2 ? "2px solid black" : "1px solid black"}
        bg={bgColor}
        onMouseDown={() => handleDragStart(row, col)}
        onMouseEnter={() => handleDragEnter(row, col)}
        onMouseUp={handleDragEnd}
        // Touchscreen-Unterstützung
        onTouchStart={() => handleDragStart(row, col)}
        onTouchMove={(e) => {
          // Touch-Position in Bezug auf das Brett ermitteln und in Zellenposition umrechnen
          if (boardRef.current && e.touches.length > 0) {
            const touch = e.touches[0];
            const boardRect = boardRef.current.getBoundingClientRect();
            const touchX = touch.clientX - boardRect.left;
            const touchY = touch.clientY - boardRect.top;
            const touchCol = Math.floor(touchX / cellSize);
            const touchRow = Math.floor(touchY / cellSize);
            
            // Nur wenn innerhalb des Boards und andere Zelle als aktuell ausgewählte
            if (touchRow >= 0 && touchRow < size && touchCol >= 0 && touchCol < size &&
                (selectedCell?.row !== touchRow || selectedCell?.col !== touchCol)) {
              handleDragEnter(touchRow, touchCol);
            }
          }
        }}
        onTouchEnd={handleDragEnd}
        cursor="pointer"
        _hover={{ bg: "blue.50" }}
        // Pulsieren-Animation für falsche Einträge
        animation={value && !valid ? "pulsateRed 2s infinite" : undefined}
        css={value && !valid ? animationKeyframes : undefined}
      >
        {/* Innerer gestrichelter Rahmen für Käfige */}
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
            // Hinzufügen einer leichten grünen Hintergrundfarbe für korrekte Käfige
            bg={cageComplete ? "green.50" : undefined}
            transition="background-color 0.3s"
          />
        )}
        
        {isCageStart && (
          <Text
            position="absolute"
            top="3px"
            left="3px"
            fontSize={sumFontSize}
            fontWeight="bold"
            color={cageComplete ? "green.700" : "gray.700"}
            zIndex="1"
          >
            {cage.sum}
          </Text>
        )}
        <Text
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          fontSize={valueFontSize}
          fontWeight="bold"
          color={valueColor}
          transition="color 0.3s"
        >
          {value || ''}
        </Text>
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

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" h="200px">
        <Spinner size="xl" color="teal.500" />
      </Box>
    );
  }

  return (
    <Flex 
      direction={flexDirection} 
      gap={4} 
      justify="center" 
      align="center" 
      flexWrap="wrap"
      w="100%"
    >
      <Box 
        ref={(el: HTMLDivElement | null) => {
          // Beide Refs auf das gleiche Element setzen
          boardRef.current = el;
          boardFocusRef.current = el;
        }}
        p={[2, 4, 6]} 
        display="flex" 
        justifyContent="center"
        boxShadow="lg"
        borderRadius="lg"
        bg="white"
        border="3px solid black"
        position="relative"
        maxW="100%"
        overflow="auto"
        // Tabindex hinzufügen, damit das Board Keyboard-Events empfangen kann
        tabIndex={0}
        onKeyDown={handleKeyDown}
        // Hinzufügen eines visuellen Indikators für den Keyboard-Fokus
        _focus={{ 
          outline: "3px dashed teal.500", 
          outlineOffset: "4px" 
        }}
      >
        <Box>
          {renderGrid()}
        </Box>
        
        {/* Success message when board is complete */}
        {gameState && isBoardComplete() && (
          <Box
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
          </Box>
        )}
      </Box>
      
      <Box p={2} alignSelf={flexDirection === "column" ? "center" : "flex-start"}>
        <NumberPad
          onNumberSelect={handleNumberSelect}
          onClear={handleClear}
          disabledNumbers={[]}
        />
        <Stack direction="row" gap={4} mt={4}>
          <Button 
            colorScheme="teal" 
            onClick={handleReset}
          >
            <RepeatIcon mr={2} /> Reset
          </Button>
          <Button 
            colorScheme="orange" 
            onClick={handleNewPuzzle}
          >
            <AddIcon mr={2} /> Neues Spielfeld
          </Button>
        </Stack>
      </Box>
    </Flex>
  );
};

export default Board;