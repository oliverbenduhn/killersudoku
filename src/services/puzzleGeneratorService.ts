// Puzzle-Generator für Killer-Sudoku.
//
// Workflow (vgl. technischer Leitfaden, §7):
//   1. Vollständige, zufällige Sudoku-Lösung per Backtracking erzeugen.
//   2. Brett in orthogonal zusammenhängende Käfige partitionieren —
//      No-Duplicate-in-Cage als Hard Constraint (Käfig darf keine Ziffer
//      der Lösung doppelt enthalten), Käfiggröße nach Schwierigkeit.
//   3. Käfig-Summen aus der Lösung ableiten.
//   4. Vier-Färbung des Käfig-Adjazenzgraphen (Backtracking).
//   5. Vorgaben nach Schwierigkeit setzen, dann Eindeutigkeit erzwingen:
//      solange der Solver zwei Lösungen findet, eine Vorgabe an einer
//      Differenz-Zelle ergänzen. Schlägt das Budget fehl → neu generieren.

import { Cage, CageColor, CAGE_COLORS, Difficulty, GameLevel, BOARD_SIZE } from '../types/gameTypes';
import { findSolutions, SolverBudgetExceededError } from '../utils/killerSolver';

/**
 * Erstellt ein leeres Spielfeld mit der angegebenen Größe.
 * Wird für das Zurücksetzen eines Levels und die Initialisierung eines
 * neuen Spielstands verwendet.
 */
export const createEmptyBoard = (size: number = BOARD_SIZE): number[][] => {
  return Array(size).fill(0).map(() => Array(size).fill(0));
};

export interface GenerateOptions {
  difficulty: Exclude<Difficulty, 'unknown'>;
  levelNumber?: number;
}

interface DifficultyProfile {
  /** Käfiggrößen-Pool, aus dem gezogen wird (Wiederholung = Gewichtung). */
  cageSizes: number[];
  /** Baseline-Vorgaben vor der Eindeutigkeits-Reparatur. */
  baseGivens: number;
  /** Obergrenze an Gesamt-Vorgaben; darüber wird neu generiert. */
  maxGivens: number;
  difficultyRating: number;
}

const PROFILES: Record<Exclude<Difficulty, 'unknown'>, DifficultyProfile> = {
  easy:   { cageSizes: [1, 2, 2, 3, 3, 4], baseGivens: 14, maxGivens: 22, difficultyRating: 2 },
  medium: { cageSizes: [2, 2, 3, 3, 4, 5], baseGivens: 8,  maxGivens: 14, difficultyRating: 5 },
  hard:   { cageSizes: [2, 3, 3, 4, 5, 6], baseGivens: 4,  maxGivens: 9,  difficultyRating: 7 },
  expert: { cageSizes: [3, 4, 4, 5, 6, 7], baseGivens: 0,  maxGivens: 6,  difficultyRating: 9 },
};

const MAX_ATTEMPTS = 60;

/**
 * Erzeugt ein zufälliges, garantiert eindeutig lösbares Level.
 * Wirft, wenn nach MAX_ATTEMPTS kein Level im Schwierigkeits-Budget
 * gefunden wurde (praktisch nicht erreichbar).
 */
export function generateLevel(options: GenerateOptions): GameLevel {
  const profile = PROFILES[options.difficulty];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const solution = generateSolvedGrid();
    const cages = partitionIntoCages(solution, profile.cageSizes);
    if (!colorCages(cages)) continue;

    const initialValues = createEmptyBoard();
    const cells = shuffle(allCells());
    for (let i = 0; i < profile.baseGivens; i++) {
      const { row, col } = cells[i];
      initialValues[row][col] = solution[row][col];
    }

    if (!enforceUniqueness(cages, initialValues, solution, profile.maxGivens)) continue;

    const now = new Date().toISOString();
    return {
      id: randomId(),
      levelNumber: options.levelNumber ?? 0,
      difficulty: options.difficulty,
      difficultyRating: profile.difficultyRating,
      name: `Generiert (${options.difficulty})`,
      cages,
      initialValues,
      solution,
      author: 'generator',
      createdAt: now,
      updatedAt: now,
    };
  }
  throw new Error(`generateLevel: kein valides Level nach ${MAX_ATTEMPTS} Versuchen (${options.difficulty})`);
}

// ---------- 1. Zufällige Lösung ----------

function generateSolvedGrid(): number[][] {
  const grid = createEmptyBoard();
  const fill = (idx: number): boolean => {
    if (idx === BOARD_SIZE * BOARD_SIZE) return true;
    const row = Math.floor(idx / BOARD_SIZE);
    const col = idx % BOARD_SIZE;
    for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      if (!fits(grid, row, col, v)) continue;
      grid[row][col] = v;
      if (fill(idx + 1)) return true;
      grid[row][col] = 0;
    }
    return false;
  };
  fill(0);
  return grid;
}

function fits(grid: number[][], row: number, col: number, v: number): boolean {
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (grid[row][i] === v || grid[i][col] === v) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (grid[r][c] === v) return false;
    }
  }
  return true;
}

// ---------- 2.+3. Käfig-Partition mit Summen ----------

function partitionIntoCages(solution: number[][], sizePool: number[]): Cage[] {
  const assigned = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));
  const cages: Cage[] = [];

  for (const start of shuffle(allCells())) {
    if (assigned[start.row][start.col]) continue;
    const target = sizePool[Math.floor(Math.random() * sizePool.length)];
    const cells = [start];
    const digits = new Set([solution[start.row][start.col]]);
    assigned[start.row][start.col] = true;

    while (cells.length < target) {
      // Frontier: unbelegte orthogonale Nachbarn, deren Lösungs-Ziffer
      // noch nicht im Käfig vorkommt (No-Duplicate-in-Cage).
      const frontier = cells.flatMap((c) => neighbors(c))
        .filter((n) => !assigned[n.row][n.col] && !digits.has(solution[n.row][n.col]));
      if (frontier.length === 0) break;
      const next = frontier[Math.floor(Math.random() * frontier.length)];
      cells.push(next);
      digits.add(solution[next.row][next.col]);
      assigned[next.row][next.col] = true;
    }

    cages.push({
      id: randomId(),
      cells,
      sum: cells.reduce((s, c) => s + solution[c.row][c.col], 0),
      color: CAGE_COLORS[0], // wird von colorCages überschrieben
    });
  }
  return cages;
}

// ---------- 4. Vier-Färbung ----------

function colorCages(cages: Cage[]): boolean {
  const adjacency: number[][] = cages.map(() => []);
  for (let i = 0; i < cages.length; i++) {
    for (let j = i + 1; j < cages.length; j++) {
      if (cagesTouch(cages[i], cages[j])) {
        adjacency[i].push(j);
        adjacency[j].push(i);
      }
    }
  }
  const colors = new Array<number>(cages.length).fill(-1);
  const assign = (i: number): boolean => {
    if (i === cages.length) return true;
    for (let c = 0; c < CAGE_COLORS.length; c++) {
      if (adjacency[i].some((n) => colors[n] === c)) continue;
      colors[i] = c;
      if (assign(i + 1)) return true;
      colors[i] = -1;
    }
    return false;
  };
  if (!assign(0)) return false;
  cages.forEach((cage, i) => { cage.color = CAGE_COLORS[colors[i]] as CageColor; });
  return true;
}

function cagesTouch(a: Cage, b: Cage): boolean {
  return a.cells.some((ca) => b.cells.some((cb) =>
    (Math.abs(ca.row - cb.row) === 1 && ca.col === cb.col) ||
    (Math.abs(ca.col - cb.col) === 1 && ca.row === cb.row)
  ));
}

// ---------- 5. Eindeutigkeit erzwingen ----------

// Knoten-Budget pro Solver-Aufruf: deckelt die Worst-Case-Zeit eines
// Generierungs-Versuchs; teure Bretter werden verworfen und neu gewürfelt.
const SOLVER_NODE_BUDGET = 150_000;

function enforceUniqueness(
  cages: Cage[],
  initialValues: number[][],
  solution: number[][],
  maxGivens: number
): boolean {
  for (;;) {
    let found: number[][][];
    try {
      found = findSolutions(cages, initialValues, 2, SOLVER_NODE_BUDGET);
    } catch (e) {
      if (e instanceof SolverBudgetExceededError) return false;
      throw e;
    }
    if (found.length === 1) return true;
    if (found.length === 0) return false; // sollte nie passieren: solution existiert
    if (countGivens(initialValues) >= maxGivens) return false;

    // Vorgabe an einer Zelle setzen, wo sich die zwei gefundenen Lösungen
    // unterscheiden — eliminiert garantiert mindestens eine davon.
    const [a, b] = found;
    const diff = shuffle(allCells()).find(
      ({ row, col }) => initialValues[row][col] === 0 && a[row][col] !== b[row][col]
    );
    if (!diff) return false;
    initialValues[diff.row][diff.col] = solution[diff.row][diff.col];
  }
}

// ---------- Helpers ----------

function allCells(): Array<{ row: number; col: number }> {
  const out = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) out.push({ row, col });
  }
  return out;
}

function neighbors({ row, col }: { row: number; col: number }): Array<{ row: number; col: number }> {
  return [
    { row: row - 1, col }, { row: row + 1, col },
    { row, col: col - 1 }, { row, col: col + 1 },
  ].filter((n) => n.row >= 0 && n.row < BOARD_SIZE && n.col >= 0 && n.col < BOARD_SIZE);
}

function countGivens(m: number[][]): number {
  return m.flat().filter((v) => v !== 0).length;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}
