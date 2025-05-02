// Game Logic Service für Killersudoku
// Stellt Funktionen für die Spielregeln, Validierung und Gewinnbedingungen bereit

import { Cage, CellPosition } from '../types/gameTypes';

// Standard-Sudoku-Regeln: Keine Duplikate in Zeilen, Spalten, Blöcken
export const isCellValidForSudokuRules = (
  cellValues: number[][],
  row: number,
  col: number,
  value: number,
  size: number = 9
): boolean => {
  if (!value) return true; // Leere Zellen sind immer gültig
  
  // Zeile überprüfen
  for (let c = 0; c < size; c++) {
    if (c !== col && cellValues[row][c] === value) return false;
  }
  
  // Spalte überprüfen
  for (let r = 0; r < size; r++) {
    if (r !== row && cellValues[r][col] === value) return false;
  }
  
  // Block (3x3) überprüfen
  const blockSize = Math.sqrt(size);
  const blockRow = Math.floor(row / blockSize) * blockSize;
  const blockCol = Math.floor(col / blockSize) * blockSize;
  
  for (let r = blockRow; r < blockRow + blockSize; r++) {
    for (let c = blockCol; c < blockCol + blockSize; c++) {
      if ((r !== row || c !== col) && cellValues[r][c] === value) return false;
    }
  }
  
  return true;
};

// Überprüft ob keine doppelten Ziffern im Käfig vorkommen
export const hasDuplicatesInCage = (
  cellValues: number[][],
  cage: Cage
): boolean => {
  const values = cage.cells
    .map(cell => cellValues[cell.row][cell.col])
    .filter(value => value !== 0); // Ignoriere leere Zellen
  
  return new Set(values).size !== values.length;
};

// Berechnet die Summe eines Käfigs
export const calculateCageSum = (
  cellValues: number[][],
  cage: Cage
): number => {
  return cage.cells.reduce(
    (sum, cell) => sum + (cellValues[cell.row][cell.col] || 0),
    0
  );
};

// Prüft, ob alle Zellen im Käfig gefüllt sind
export const isCageFilled = (
  cellValues: number[][],
  cage: Cage
): boolean => {
  return cage.cells.every(cell => cellValues[cell.row][cell.col] !== 0);
};

// Überprüft, ob ein Käfig vollständig und korrekt ist
export const isCageComplete = (
  cellValues: number[][],
  cage: Cage
): boolean => {
  // Käfig muss vollständig gefüllt sein
  if (!isCageFilled(cellValues, cage)) return false;
  
  // Summenregel: Alle Zellen im Käfig müssen die Zielssumme ergeben
  const currentSum = calculateCageSum(cellValues, cage);
  if (currentSum !== cage.sum) return false;
  
  // Keine Duplikate im Käfig erlaubt
  if (hasDuplicatesInCage(cellValues, cage)) return false;
  
  return true;
};

// Überprüft, ob eine Zelle gültig ist (Sudoku-Regeln und Käfig-Regeln)
export const isCellValid = (
  cellValues: number[][],
  row: number,
  col: number,
  value: number,
  cages: Cage[],
  size: number = 9
): boolean => {
  // Zuerst Sudoku-Regeln prüfen
  if (!isCellValidForSudokuRules(cellValues, row, col, value, size)) {
    return false;
  }
  
  // Dann Käfig-Regeln prüfen
  const cage = getCageForCell(cages, row, col);
  if (!cage) return true; // Wenn Zelle in keinem Käfig ist
  
  // Temp-Board mit dem neuen Wert erstellen, um Validierung zu prüfen
  const tempValues = cellValues.map(row => [...row]);
  tempValues[row][col] = value;
  
  // Keine doppelten Zahlen im Käfig erlaubt
  if (hasDuplicatesInCage(tempValues, cage)) return false;
  
  // Wenn alle Zellen im Käfig gefüllt sind, prüfe ob Summe stimmt
  if (isCageFilled(tempValues, cage)) {
    const sum = calculateCageSum(tempValues, cage);
    if (sum !== cage.sum) return false;
  }
  
  return true;
};

// Hilfsfunktion zum Finden des Käfigs für eine Zelle
export const getCageForCell = (
  cages: Cage[],
  row: number,
  col: number
): Cage | undefined => {
  return cages.find(cage => 
    cage.cells.some(cell => cell.row === row && cell.col === col)
  );
};

// Überprüft, ob das gesamte Board gültig und vollständig ist
export const isBoardComplete = (
  cellValues: number[][],
  cages: Cage[],
  size: number = 9
): boolean => {
  // 1. Alle Zellen müssen gefüllt sein
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (cellValues[row][col] === 0) return false;
    }
  }
  
  // 2. Alle Zellen müssen die Sudoku-Regeln einhalten
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const value = cellValues[row][col];
      if (!isCellValidForSudokuRules(cellValues, row, col, value, size)) {
        return false;
      }
    }
  }
  
  // 3. Alle Käfige müssen die Summenregel einhalten
  for (const cage of cages) {
    if (!isCageComplete(cellValues, cage)) {
      return false;
    }
  }
  
  return true;
};

// Gibt eine Liste potentieller Werte für eine Zelle zurück
export const getPossibleValues = (
  cellValues: number[][],
  row: number,
  col: number,
  cages: Cage[],
  size: number = 9
): number[] => {
  const possibleValues = [];
  
  for (let value = 1; value <= size; value++) {
    if (isCellValid(cellValues, row, col, value, cages, size)) {
      possibleValues.push(value);
    }
  }
  
  return possibleValues;
};

// Prüft, ob zwei Zellen zum gleichen Käfig gehören
export const areCellsInSameCage = (
  cages: Cage[],
  row1: number,
  col1: number,
  row2: number,
  col2: number
): boolean => {
  const cage = getCageForCell(cages, row1, col1);
  if (!cage) return false;
  
  return cage.cells.some(cell => cell.row === row2 && cell.col === col2);
};