import React, { useState, useEffect, useCallback } from 'react';
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

const exampleCages: Cage[] = [
  { id: 'A', sum: 10, color: 'yellow.100', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }] },
  { id: 'B', sum: 15, color: 'blue.100', cells: [{ row: 0, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
];

function getCageForCell(row: number, col: number): Cage | undefined {
  return exampleCages.find(cage => cage.cells.some(cell => cell.row === row && cell.col === col));
}

export const Board: React.FC<BoardProps> = ({ size = 9, puzzleId = 'default' }) => {
  const { gameState, isLoading, updateGameState } = useGameState(puzzleId);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [selectedCells, setSelectedCells] = useState<Array<{ row: number; col: number }>>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (row: number, col: number) => {
    setDragStart({ row, col });
    setSelectedCells([{ row, col }]);
    setIsDragging(true);
  };

  const handleDragEnter = (row: number, col: number) => {
    if (!isDragging || !dragStart) return;

    const minRow = Math.min(dragStart.row, row);
    const maxRow = Math.max(dragStart.row, row);
    const minCol = Math.min(dragStart.col, col);
    const maxCol = Math.max(dragStart.col, col);

    const newSelectedCells = [];
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

    const newValues = gameState.cellValues.map(row => [...row]);
    selectedCells.forEach(({ row, col }) => {
      newValues[row][col] = number;
    });

    updateGameState({
      cellValues: newValues
    });
  };

  const handleClear = () => {
    if (!gameState) return;

    const newValues = gameState.cellValues.map(row => [...row]);
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

    const isSelected = selectedCells.some(cell => cell.row === row && cell.col === col);
    const isSameRow = selectedCell && selectedCell.row === row;
    const isSameCol = selectedCell && selectedCell.col === col;
    const isSameBlk = selectedCell && isSameBlock(selectedCell.row, selectedCell.col, row, col);
    const cage = getCageForCell(row, col);
    const isCageStart = cage && cage.cells[0].row === row && cage.cells[0].col === col;
    const value = gameState.cellValues[row][col];
    const valid = isCellValid(row, col, value);

    return (
      <Box
        key={`${row}-${col}`}
        position="relative"
        w="50px"
        h="50px"
        border="1px"
        borderColor="gray.200"
        borderRight={col % 3 === 2 ? "2px solid" : undefined}
        borderBottom={row % 3 === 2 ? "2px solid" : undefined}
        borderRightColor="gray.400"
        borderBottomColor="gray.400"
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
        {isCageStart && (
          <Text
            position="absolute"
            top="0"
            left="0"
            fontSize="xs"
            color="gray.600"
          >
            {cage.sum}
          </Text>
        )}
        <Input
          type="number"
          min={1}
          max={9}
          value={value || ''}
          onChange={(e) => handleNumberSelect(parseInt(e.target.value, 10))}
          border="none"
          h="100%"
          textAlign="center"
          fontSize="xl"
          p={0}
          _focus={{ outline: "none", bg: "blue.100" }}
          isInvalid={!valid && value !== 0}
          _invalid={{ color: "red.500" }}
          pointerEvents="none"
        />
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
      <HStack spacing={8} align="flex-start">
        <Box 
          p={8} 
          display="flex" 
          justifyContent="center"
          boxShadow="lg"
          borderRadius="lg"
          bg="white"
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