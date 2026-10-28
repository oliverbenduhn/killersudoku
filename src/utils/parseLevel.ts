import { BOARD_SIZE, CAGE_COLORS, Cage, GameLevel } from '../types/gameTypes';

/** Checks untrusted HTTP data without running the uniqueness solver in the UI. */
export function parseLevel(value: unknown, levelNumber: number): GameLevel {
  const fail = (): never => { throw new Error('Die Leveldatei enthält ungültige Daten.'); };
  if (!value || typeof value !== 'object') return fail();
  const data = value as Record<string, unknown>;
  const isBoard = (board: unknown, minimum: number): board is number[][] =>
    Array.isArray(board) && board.length === BOARD_SIZE && board.every(row =>
      Array.isArray(row) && row.length === BOARD_SIZE && row.every(digit =>
        typeof digit === 'number' && Number.isInteger(digit) && digit >= minimum && digit <= BOARD_SIZE));
  if (typeof data.id !== 'string' || !data.id || !isBoard(data.initialValues, 0) || !isBoard(data.solution, 1)) return fail();
  const initialValues = data.initialValues;
  const solution = data.solution;
  for (let row = 0; row < BOARD_SIZE; row++) {
    const column = solution.map(line => line[row]);
    const block = Array.from({ length: BOARD_SIZE }, (_, index) =>
      solution[Math.floor(row / 3) * 3 + Math.floor(index / 3)][(row % 3) * 3 + index % 3]);
    if ([solution[row], column, block].some(house => new Set(house).size !== BOARD_SIZE)) return fail();
    if (initialValues[row].some((digit, col) => digit !== 0 && digit !== solution[row][col])) return fail();
  }
  if (!Array.isArray(data.cages) || data.cages.length === 0) return fail();
  const covered = new Set<number>();
  const ids = new Set<string>();
  const cages: Cage[] = [];
  for (const candidate of data.cages as unknown[]) {
    if (!candidate || typeof candidate !== 'object') return fail();
    const cage = candidate as Record<string, unknown>;
    if (typeof cage.id !== 'string' || !cage.id || ids.has(cage.id)
      || typeof cage.sum !== 'number' || !Number.isInteger(cage.sum) || cage.sum < 1 || cage.sum > 45
      || !CAGE_COLORS.some(color => color === cage.color)
      || !Array.isArray(cage.cells) || cage.cells.length === 0 || cage.cells.length > BOARD_SIZE) return fail();
    ids.add(cage.id);
    const cells: Cage['cells'] = [];
    for (const candidateCell of cage.cells as unknown[]) {
      if (!candidateCell || typeof candidateCell !== 'object') return fail();
      const cell = candidateCell as Record<string, unknown>;
      const { row, col } = cell;
      if (typeof row !== 'number' || typeof col !== 'number' || !Number.isInteger(row) || !Number.isInteger(col)
        || row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE || covered.has(row * BOARD_SIZE + col)) return fail();
      covered.add(row * BOARD_SIZE + col);
      cells.push({ row, col });
    }
    const digits = cells.map(cell => solution[cell.row][cell.col]);
    if (new Set(digits).size !== digits.length || digits.reduce((sum, digit) => sum + digit, 0) !== cage.sum) return fail();
    const connected = new Set([0]);
    for (let pass = 0; pass < cells.length; pass++) {
      cells.forEach((cell, index) => {
        if (cells.some((other, otherIndex) => connected.has(otherIndex)
          && Math.abs(cell.row - other.row) + Math.abs(cell.col - other.col) === 1)) connected.add(index);
      });
    }
    if (connected.size !== cells.length) return fail();
    cages.push({ id: cage.id, cells, sum: cage.sum, color: cage.color as Cage['color'] });
  }
  if (covered.size !== BOARD_SIZE * BOARD_SIZE) return fail();
  if (data.difficulty !== undefined && !['easy', 'medium', 'hard', 'expert', 'unknown'].includes(String(data.difficulty))) return fail();
  return {
    id: data.id, levelNumber, initialValues, solution, cages,
    ...(typeof data.name === 'string' ? { name: data.name } : {}),
    ...(data.difficulty !== undefined ? { difficulty: data.difficulty as GameLevel['difficulty'] } : {})
  };
}
