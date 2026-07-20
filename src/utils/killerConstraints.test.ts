import { Cage } from '../types/gameTypes';
import { analyzeCage, cellKey, getLegalValuesForCell } from './killerConstraints';

const emptyBoard = (): number[][] =>
  Array.from({ length: 9 }, () => Array(9).fill(0));

const cage = (cells: Cage['cells'], sum: number): Cage => ({
  id: 'test-cage',
  cells,
  sum,
  color: 'blue.100',
});

describe('killerConstraints', () => {
  test('weist die eindeutige 24er-Kombination exakt den Käfigzellen zu', () => {
    const board = emptyBoard();
    const target = cage([{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], 24);

    const result = analyzeCage(board, target);

    expect(result.valid).toBe(true);
    expect(result.combinations).toEqual([[7, 8, 9]]);
    expect(result.consistentDigits).toEqual([7, 8, 9]);
    expect(result.candidates[cellKey({ row: 0, col: 0 })]).toEqual([7, 8, 9]);
  });

  test('berücksichtigt Sudoku-Verbote bei der Zuordnung einer Kombination', () => {
    const board = emptyBoard();
    board[3][0] = 8;
    board[4][0] = 9;
    const target = cage([{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], 24);

    expect(getLegalValuesForCell(board, { row: 0, col: 0 }, [target])).toEqual([7]);
  });

  test('erkennt einen bereits unmöglichen teilgefüllten Käfig', () => {
    const board = emptyBoard();
    board[0][0] = 9;
    const target = cage([{ row: 0, col: 0 }, { row: 0, col: 1 }], 3);

    expect(analyzeCage(board, target).valid).toBe(false);
  });
});
