import { BOARD_SIZE, Cage, CellPosition } from '../types/gameTypes';
import { getCageCombinations } from './killerCombinations';

const ALL_DIGITS_MASK = 0b1111111110;

export interface CageAnalysis {
  valid: boolean;
  combinations: number[][];
  consistentDigits: number[];
  candidates: Record<string, number[]>;
}

export function cellKey(cell: CellPosition): string {
  return `${cell.row},${cell.col}`;
}

function boxIndex(row: number, col: number): number {
  return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}

function peerUsedMask(board: number[][], cell: CellPosition): number {
  let mask = 0;
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (i !== cell.col) mask |= 1 << board[cell.row][i];
    if (i !== cell.row) mask |= 1 << board[i][cell.col];
  }
  const boxRow = Math.floor(cell.row / 3) * 3;
  const boxCol = Math.floor(cell.col / 3) * 3;
  for (let row = boxRow; row < boxRow + 3; row++) {
    for (let col = boxCol; col < boxCol + 3; col++) {
      if (row !== cell.row || col !== cell.col) mask |= 1 << board[row][col];
    }
  }
  return mask;
}

function matchingExists(
  cellMasks: number[],
  remainingDigitsMask: number,
  memo = new Map<string, boolean>()
): boolean {
  if (cellMasks.length === 0) return remainingDigitsMask === 0;
  const memoKey = `${cellMasks.join('.')}:${remainingDigitsMask}`;
  const cached = memo.get(memoKey);
  if (cached !== undefined) return cached;

  let bestIndex = 0;
  let bestOptions = Number.POSITIVE_INFINITY;
  for (let i = 0; i < cellMasks.length; i++) {
    const options = cellMasks[i] & remainingDigitsMask;
    let count = 0;
    for (let digit = 1; digit <= BOARD_SIZE; digit++) if (options & (1 << digit)) count++;
    if (count < bestOptions) {
      bestOptions = count;
      bestIndex = i;
    }
  }
  if (bestOptions === 0) {
    memo.set(memoKey, false);
    return false;
  }

  const options = cellMasks[bestIndex] & remainingDigitsMask;
  const rest = cellMasks.filter((_, index) => index !== bestIndex);
  for (let digit = 1; digit <= BOARD_SIZE; digit++) {
    const bit = 1 << digit;
    if ((options & bit) !== 0 && matchingExists(rest, remainingDigitsMask & ~bit, memo)) {
      memo.set(memoKey, true);
      return true;
    }
  }
  memo.set(memoKey, false);
  return false;
}

/**
 * Analysiert einen Käfig exakt gegen Summe, Cage-Uniqueness und die bereits
 * belegten Sudoku-Häuser. Das Interface verbirgt LUT, Komplementwahl und
 * das bipartite Matching der Ziffern auf Käfigzellen.
 */
export function analyzeCage(board: number[][], cage: Cage): CageAnalysis {
  const candidates: Record<string, number[]> = {};
  const fixedDigits = new Set<number>();
  const emptyCells: CellPosition[] = [];

  for (const cell of cage.cells) {
    const value = board[cell.row]?.[cell.col];
    candidates[cellKey(cell)] = [];
    if (value === 0) {
      emptyCells.push(cell);
      continue;
    }
    if (!Number.isInteger(value) || value < 1 || value > BOARD_SIZE || fixedDigits.has(value)) {
      return { valid: false, combinations: [], consistentDigits: [], candidates };
    }
    if ((peerUsedMask(board, cell) & (1 << value)) !== 0) {
      return { valid: false, combinations: [], consistentDigits: [], candidates };
    }
    fixedDigits.add(value);
    candidates[cellKey(cell)] = [value];
  }

  const allowedMasks = emptyCells.map((cell) => ALL_DIGITS_MASK & ~peerUsedMask(board, cell));
  const feasibleCombinations: number[][] = [];
  const candidateSets = new Map<string, Set<number>>(
    emptyCells.map((cell) => [cellKey(cell), new Set<number>()])
  );

  for (const combination of getCageCombinations(cage.cells.length, cage.sum)) {
    if (![...fixedDigits].every((digit) => combination.includes(digit))) continue;
    let remainingMask = 0;
    for (const digit of combination) if (!fixedDigits.has(digit)) remainingMask |= 1 << digit;
    if (matchingExists(allowedMasks, remainingMask)) {
      feasibleCombinations.push(combination);
    } else {
      continue;
    }

    for (let cellIndex = 0; cellIndex < emptyCells.length; cellIndex++) {
      for (let digit = 1; digit <= BOARD_SIZE; digit++) {
        const bit = 1 << digit;
        if ((remainingMask & bit) === 0 || (allowedMasks[cellIndex] & bit) === 0) continue;
        const otherMasks = allowedMasks.filter((_, index) => index !== cellIndex);
        if (matchingExists(otherMasks, remainingMask & ~bit)) {
          candidateSets.get(cellKey(emptyCells[cellIndex]))!.add(digit);
        }
      }
    }
  }

  for (const cell of emptyCells) {
    candidates[cellKey(cell)] = [...candidateSets.get(cellKey(cell))!].sort((a, b) => a - b);
  }

  const consistentDigits = feasibleCombinations.length === 0
    ? []
    : feasibleCombinations[0].filter((digit) =>
        feasibleCombinations.every((combination) => combination.includes(digit))
      );

  return {
    valid: feasibleCombinations.length > 0,
    combinations: feasibleCombinations,
    consistentDigits,
    candidates,
  };
}

export function getLegalValuesForCell(
  board: number[][],
  cell: CellPosition,
  cages: Cage[]
): number[] {
  const cage = cages.find((candidate) =>
    candidate.cells.some((entry) => entry.row === cell.row && entry.col === cell.col)
  );
  if (!cage) return [];

  const copy = board.map((row) => [...row]);
  copy[cell.row][cell.col] = 0;
  return analyzeCage(copy, cage).candidates[cellKey(cell)] ?? [];
}

export function isBoardValueInRange(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= BOARD_SIZE;
}

export function houseForCell(cell: CellPosition): { row: number; column: number; box: number } {
  return { row: cell.row, column: cell.col, box: boxIndex(cell.row, cell.col) };
}
