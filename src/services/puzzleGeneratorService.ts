// filepath: /home/oliverbenduhn/Dokumente/projekte/killersudoku/src/services/puzzleGeneratorService.ts
// Puzzle Generator Service für Killersudoku
// Erstellt zufällige Killer-Sudoku-Puzzles mit verschiedenen Schwierigkeitsgraden

import { Cage, CellPosition } from '../types/gameTypes';

// Liste von Farben für verschiedene Käfige
const cageColors = [
  'blue.100', 'yellow.100', 'red.100', 'green.100', 'purple.100',
  'orange.100', 'teal.100', 'pink.100', 'cyan.100', 'gray.100',
  'blue.200', 'yellow.200', 'red.200', 'green.200', 'purple.200',
  'orange.200', 'teal.200', 'pink.200', 'cyan.200', 'gray.200'
];

// Hilfsfunktion zur Generierung einer zufälligen Zahl in einem Bereich
const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Generiert eine zufällige ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 8);
};

// Generiert einen zufälligen Käfig aus benachbarten Zellen
const generateRandomCage = (
  size: number,
  usedCells: Set<string>,
  minCells: number = 1,
  maxCells: number = 5
): Cage => {
  const cageSize = getRandomInt(minCells, maxCells);
  const cells: CellPosition[] = [];
  
  // Startposition für den Käfig finden
  let startRow, startCol;
  do {
    startRow = getRandomInt(0, size - 1);
    startCol = getRandomInt(0, size - 1);
  } while (usedCells.has(`${startRow},${startCol}`));
  
  cells.push({ row: startRow, col: startCol });
  usedCells.add(`${startRow},${startCol}`);
  
  // Käfig mit benachbarten Zellen erweitern
  for (let i = 1; i < cageSize; i++) {
    // Alle möglichen Nachbarzellen der aktuellen Käfigzellen
    const candidates: CellPosition[] = [];
    
    for (const cell of cells) {
      // Oben
      if (cell.row > 0 && !usedCells.has(`${cell.row - 1},${cell.col}`)) {
        candidates.push({ row: cell.row - 1, col: cell.col });
      }
      // Unten
      if (cell.row < size - 1 && !usedCells.has(`${cell.row + 1},${cell.col}`)) {
        candidates.push({ row: cell.row + 1, col: cell.col });
      }
      // Links
      if (cell.col > 0 && !usedCells.has(`${cell.row},${cell.col - 1}`)) {
        candidates.push({ row: cell.row, col: cell.col - 1 });
      }
      // Rechts
      if (cell.col < size - 1 && !usedCells.has(`${cell.row},${cell.col + 1}`)) {
        candidates.push({ row: cell.row, col: cell.col + 1 });
      }
    }
    
    // Wenn keine passenden Nachbarn mehr gefunden wurden, Käfig frühzeitig beenden
    if (candidates.length === 0) break;
    
    // Zufällige Nachbarzelle auswählen
    const nextCell = candidates[getRandomInt(0, candidates.length - 1)];
    cells.push(nextCell);
    usedCells.add(`${nextCell.row},${nextCell.col}`);
  }
  
  // Summe für den Käfig berechnen (relativ zur Käfiggröße)
  const sum = (cells.length === 1) 
    ? getRandomInt(1, 9)  // Bei einer einzelnen Zelle: Wert zwischen 1-9
    : getRandomInt(cells.length + 1, cells.length * 8);  // Bei mehreren Zellen: Sinnvoller Bereich

  return {
    id: generateId(),
    cells,
    sum,
    color: cageColors[getRandomInt(0, cageColors.length - 1)]
  };
};

// Hauptfunktion zur Generierung aller Käfige für ein neues Spielfeld
export const generateRandomCages = (size: number = 9): Cage[] => {
  const cages: Cage[] = [];
  const usedCells: Set<string> = new Set();
  
  // Käfige generieren, bis alle Zellen abgedeckt sind
  while (usedCells.size < size * size) {
    const remainingCells = size * size - usedCells.size;
    const maxCageSize = Math.min(5, remainingCells);
    
    const cage = generateRandomCage(
      size, 
      usedCells, 
      1,  // Mindestgröße eines Käfigs
      maxCageSize
    );
    
    cages.push(cage);
  }
  
  return cages;
};

// Erstellt ein leeres Spielfeld mit der angegebenen Größe
export const createEmptyBoard = (size: number = 9): number[][] => {
  return Array(size).fill(0).map(() => Array(size).fill(0));
};

// Generiert ein neues Killer-Sudoku-Puzzle
export const generateNewPuzzle = (size: number = 9) => {
  const cages = generateRandomCages(size);
  const cellValues = createEmptyBoard(size);
  
  return {
    cages,
    cellValues,
    id: generateId(),
    difficulty: 'normal' // Standard-Schwierigkeitsgrad
  };
};