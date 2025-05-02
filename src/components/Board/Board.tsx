import React, { useState } from 'react';
import { Box, Grid, Input, Text, Spinner, HStack } from '@chakra-ui/react';
import useGameState from '../../hooks/useGameState';
import NumberPad from '../NumberPad/NumberPad';

interface BoardProps {
  size?: number;
  puzzleId?: string;
}

interface Cage {
  id: string;
  cells: { row: number; col: number }[];
  sum: number;
  color: string;
}

interface CellPosition {
  row: number;
  col: number;
}

const exampleCages: Cage[] = [
  { id: 'A', sum: 15, color: 'yellow.100', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
  { id: 'B', sum: 16, color: 'blue.100', cells: [{ row: 0, col: 2 }] },
  { id: 'C', sum: 22, color: 'yellow.100', cells: [{ row: 0, col: 3 }, { row: 0, col: 4 }] },
  { id: 'D', sum: 27, color: 'gray.200', cells: [{ row: 0, col: 6 }, { row: 0, col: 7 }] },
  { id: 'E', sum: 14, color: 'blue.100', cells: [{ row: 1, col: 0 }] },
  { id: 'F', sum: 13, color: 'red.200', cells: [{ row: 1, col: 3 }, { row: 1, col: 4 }] },
  { id: 'G', sum: 32, color: 'blue.100', cells: [{ row: 1, col: 7 }] },
  { id: 'H', sum: 22, color: 'red.200', cells: [{ row: 2, col: 0 }, { row: 3, col: 0 }] },
  { id: 'I', sum: 13, color: 'gray.200', cells: [{ row: 2, col: 2 }, { row: 2, col: 3 }] },
  { id: 'J', sum: 28, color: 'yellow.100', cells: [{ row: 2, col: 4 }, { row: 2, col: 5 }] },
  { id: 'K', sum: 8, color: 'blue.100', cells: [{ row: 2, col: 6 }] },
  { id: 'L', sum: 5, color: 'yellow.100', cells: [{ row: 2, col: 7 }] },
  { id: 'M', sum: 16, color: 'gray.200', cells: [{ row: 3, col: 1 }, { row: 3, col: 2 }] },
  { id: 'N', sum: 14, color: 'blue.100', cells: [{ row: 3, col: 3 }] },
  { id: 'O', sum: 22, color: 'red.200', cells: [{ row: 3, col: 4 }] },
  { id: 'P', sum: 13, color: 'green.200', cells: [{ row: 3, col: 6 }, { row: 4, col: 6 }, { row: 5, col: 6 }] },
  { id: 'Q', sum: 22, color: 'gray.200', cells: [{ row: 3, col: 7 }] },
  { id: 'R', sum: 11, color: 'yellow.100', cells: [{ row: 4, col: 5 }] },
  { id: 'S', sum: 20, color: 'yellow.100', cells: [{ row: 5, col: 0 }, { row: 6, col: 0 }, { row: 6, col: 1 }] },
  { id: 'T', sum: 12, color: 'blue.100', cells: [{ row: 5, col: 1 }] },
  { id: 'U', sum: 13, color: 'blue.100', cells: [{ row: 5, col: 5 }] },
  { id: 'V', sum: 11, color: 'red.200', cells: [{ row: 6, col: 2 }, { row: 7, col: 2 }, { row: 7, col: 3 }] },
  { id: 'W', sum: 18, color: 'green.200', cells: [{ row: 7, col: 0 }, { row: 7, col: 1 }] },
  { id: 'X', sum: 16, color: 'gray.200', cells: [{ row: 7, col: 6 }] },
];

function getCageForCell(row: number, col: number): Cage | undefined {
  return exampleCages.find(cage => cage.cells.some(cell => cell.row === row && cell.col === col));
}

function areCellsInSameCage(row1: number, col1: number, row2: number, col2: number): boolean {
  const cage = getCageForCell(row1, col1);
  if (!cage) return false;
  
  return cage.cells.some(cell => cell.row === row2 && cell.col === col2);
}

export const Board: React.FC<BoardProps> = ({ size = 9, puzzleId = 'default' }) => {
  const { gameState, isLoading, updateGameState } = useGameState(puzzleId);
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [dragStart, setDragStart] = useState<CellPosition | null>(null);
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([]);
  const [isDragging, setIsDragging] = useState(false);

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

  const isCellValid = (row: number, col: number, value: number) => {
    if (!value) return true;
    if (!gameState) return true;
    
    // Zeile
    for (let c = 0; c < size; c++) {
      if (c !== col && gameState.cellValues[row][c] === value) return false;
    }
    // Spalte
    for (let r = 0; r < size; r++) {
      if (r !== row && gameState.cellValues[r][col] === value) return false;
    }
    // Block
    const blockRow = Math.floor(row / 3) * 3;
    const blockCol = Math.floor(col / 3) * 3;
    for (let r = blockRow; r < blockRow + 3; r++) {
      for (let c = blockCol; c < blockCol + 3; c++) {
        if ((r !== row || c !== col) && gameState.cellValues[r][c] === value) return false;
      }
    }
    return true;
  };

  const renderCell = (row: number, col: number) => {
    if (!gameState) return null;

    const isSelected = selectedCells.some((cell: CellPosition) => cell.row === row && cell.col === col);
    const isSameRow = selectedCell && selectedCell.row === row;
    const isSameCol = selectedCell && selectedCell.col === col;
    const isSameBlk = selectedCell && isSameBlock(selectedCell.row, selectedCell.col, row, col);
    const cage = getCageForCell(row, col);
    const isCageStart = cage && cage.cells[0].row === row && cage.cells[0].col === col;
    const value = gameState.cellValues[row][col];
    const valid = isCellValid(row, col, value);

    // Überprüfen, ob benachbarte Zellen zum selben Käfig gehören
    const hasTopSameCage = row > 0 && areCellsInSameCage(row, col, row-1, col);
    const hasLeftSameCage = col > 0 && areCellsInSameCage(row, col, row, col-1);
    const hasRightSameCage = col < size-1 && areCellsInSameCage(row, col, row, col+1);
    const hasBottomSameCage = row < size-1 && areCellsInSameCage(row, col, row+1, col);

    return (
      <Box
        key={`${row}-${col}`}
        position="relative"
        w="50px"
        h="50px"
        border="1px solid black"
        borderRight={col % 3 === 2 ? "2px solid black" : "1px solid black"}
        borderBottom={row % 3 === 2 ? "2px solid black" : "1px solid black"}
        bg={cage ? cage.color :
          isSelected ? "blue.100" :
          (isSameRow || isSameCol || isSameBlk) ? "blue.50" :
          "white"}
        onMouseDown={() => handleDragStart(row, col)}
        onMouseEnter={() => handleDragEnter(row, col)}
        onMouseUp={handleDragEnd}
        cursor="pointer"
        _hover={{ bg: "blue.50" }}
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
          />
        )}
        
        {isCageStart && (
          <Text
            position="absolute"
            top="5px"
            left="5px"
            fontSize="xs"
            fontWeight="bold"
            color="gray.700"
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
          fontSize="xl"
          fontWeight="bold"
          color={!valid && value !== 0 ? "red.500" : "black"}
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
    <Box>
      <HStack gap={8} align="flex-start">
        <Box 
          p={6} 
          display="flex" 
          justifyContent="center"
          boxShadow="lg"
          borderRadius="lg"
          bg="white"
          border="3px solid black"
          position="relative"
        >
          <Box>
            {renderGrid()}
          </Box>
        </Box>
        
        <Box p={4}>
          <NumberPad
            onNumberSelect={handleNumberSelect}
            onClear={handleClear}
            disabledNumbers={[]}
          />
        </Box>
      </HStack>
    </Box>
  );
};

export default Board;