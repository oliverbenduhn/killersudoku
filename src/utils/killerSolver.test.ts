import { canReachSum, countSolutions, findSolutions, SolverBudgetExceededError } from './killerSolver';
import { Cage } from '../types/gameTypes';

const emptyBoard = (n = 9): number[][] =>
  Array.from({ length: n }, () => Array(n).fill(0));

const cage = (id: string, cells: { row: number; col: number }[], sum: number): Cage => ({
  id,
  cells,
  sum,
  color: 'blue.100',
});

describe('canReachSum', () => {
  test('0 leere Zellen → nur sum=0 erreichbar', () => {
    expect(canReachSum(0, 0)).toBe(true);
    expect(canReachSum(0, 1)).toBe(false);
  });

  test('Untergrenze: k(k+1)/2', () => {
    expect(canReachSum(2, 3)).toBe(true);
    expect(canReachSum(2, 2)).toBe(false);
  });

  test('Obergrenze: k(19-k)/2', () => {
    expect(canReachSum(2, 17)).toBe(true);
    expect(canReachSum(2, 18)).toBe(false);
  });

  test('k=5 erlaubt nur 15..35', () => {
    expect(canReachSum(5, 15)).toBe(true);
    expect(canReachSum(5, 14)).toBe(false);
    expect(canReachSum(5, 35)).toBe(true);
    expect(canReachSum(5, 36)).toBe(false);
  });
});

describe('SolverBudgetExceededError', () => {
  test('ist Error-Subklasse mit deutscher Message', () => {
    const error = new SolverBudgetExceededError();
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('Budget');
  });
});

describe('countSolutions / findSolutions', () => {
  test('crasht nicht ohne Käfige', () => {
    expect(() => countSolutions([], emptyBoard(), 2)).not.toThrow();
  });

  test('unerfüllbare Vorgaben (Doppel in Zeile) → 0 Lösungen', () => {
    const cages = [
      cage('c1', [{ row: 0, col: 0 }], 5),
      cage('c2', [{ row: 0, col: 1 }], 5),
    ];
    const board = emptyBoard();
    board[0][0] = 5;
    board[0][1] = 5;
    expect(countSolutions(cages, board, 2)).toBe(0);
  });

  test('findSolutions ohne Käfige → leeres Array', () => {
    expect(findSolutions([], emptyBoard(), 2)).toEqual([]);
  });

  test('limit-Parameter wird respektiert (limit=0)', () => {
    expect(findSolutions([], emptyBoard(), 0)).toEqual([]);
  });

  test('maxNodes=0 wirft sofort SolverBudgetExceededError', () => {
    // 81 Einerkäfigs mit eindeutigen Summen, aber Budget 0 wird beim
    // allerersten Knoten gesprengt. Bestätigt, dass maxNodes-Check
    // aktiv ist und nicht erst am Ende greift.
    const cages: Cage[] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        cages.push(cage(`c${r}-${c}`, [{ row: r, col: c }], r * 9 + c + 1));
      }
    }
    expect(() => findSolutions(cages, emptyBoard(), 99, 0)).toThrow(SolverBudgetExceededError);
  });
});
