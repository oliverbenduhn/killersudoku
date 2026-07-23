// Puzzle-Generator für Killer-Sudoku.
//
// Workflow (vgl. technischer Leitfaden, §7):
//   1. Vollständige, zufällige Sudoku-Lösung per Backtracking erzeugen.
//   2. Multiple-45-/Outie- und Extremkombinations-Anker platzieren, danach
//      Brett in orthogonal zusammenhängende Käfige partitionieren —
//      No-Duplicate-in-Cage als Hard Constraint (Käfig darf keine Ziffer
//      der Lösung doppelt enthalten), Käfiggröße nach Schwierigkeit.
//   3. Käfig-Summen aus der Lösung ableiten.
//   4. Vier-Färbung des Käfig-Adjazenzgraphen (Backtracking).
//   5. Vorgaben nach Schwierigkeit setzen, dann Eindeutigkeit erzwingen:
//      solange der Solver zwei Lösungen findet, eine Vorgabe an einer
//      Differenz-Zelle ergänzen. Schlägt das Budget fehl → neu generieren.
//   6. Den vollständigen Lösungsweg mit den unterstützten logischen
//      Techniken durchspielen; bei Stillstand neu generieren.

import { Cage, CageColor, CAGE_COLORS, Difficulty, GameLevel, BOARD_SIZE } from '../types/gameTypes';
import { findSolutions, SolverBudgetExceededError } from '../utils/killerSolver';
import { find45Deductions } from '../utils/killerRegions';
import { evaluateLogicalSolvability } from './hintEngine';

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
  /** Mindestzahl gezielt platzierter Käfige mit eindeutiger Kombination. */
  entropyAnchors: number;
}

const PROFILES: Record<Exclude<Difficulty, 'unknown'>, DifficultyProfile> = {
  // ADR 0002: pool ohne Größe 1, weil der Top-Anker keine Einerkäfigs
  // produziert und die freie Partition nur in Frontier-leer-Fällen welche
  // anlegt (durch den Generator-Reparatur-Loop wieder aufgelöst).
  easy:   { cageSizes: [2, 2, 3, 3, 4, 4], baseGivens: 14, maxGivens: 22, difficultyRating: 2, entropyAnchors: 4 },
  medium: { cageSizes: [2, 2, 3, 3, 4, 5], baseGivens: 8,  maxGivens: 14, difficultyRating: 5, entropyAnchors: 3 },
  hard:   { cageSizes: [2, 3, 3, 4, 5, 6], baseGivens: 4,  maxGivens: 9,  difficultyRating: 7, entropyAnchors: 2 },
  expert: { cageSizes: [3, 4, 4, 5, 6, 7], baseGivens: 0,  maxGivens: 6,  difficultyRating: 9, entropyAnchors: 1 },
};

const MAX_ATTEMPTS = 20;

/**
 * Erzeugt ein zufälliges, garantiert eindeutig lösbares Level.
 *
 * Die Generierung läuft als `async` mit `yieldToBrowser()` zwischen
 * Versuchen, damit der Browser auf Mobile-CPUs zwischen den
 * (teureren) Solver-Aufrufen auch tatsächlich rendern kann —
 * sonst hängt der Lade-Spinner 5–10 s auf einem einzigen Frame.
 * Wirft, wenn nach MAX_ATTEMPTS kein Level im Schwierigkeits-Budget
 * gefunden wurde (praktisch nicht erreichbar).
 */
export async function generateLevel(options: GenerateOptions): Promise<GameLevel> {
  const profile = PROFILES[options.difficulty];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const solution = generateSolvedGrid();
    const cages = partitionIntoCages(solution, profile.cageSizes, profile.entropyAnchors);
    if (!hasUniqueCombinationAnchor(cages)) { await yieldToBrowser(); continue; }
    if (find45Deductions(createEmptyBoard(), cages).length === 0) { await yieldToBrowser(); continue; }
    if (!colorCages(cages)) { await yieldToBrowser(); continue; }

    const initialValues = createEmptyBoard();
    const cells = shuffle(allCells());
    for (let i = 0; i < profile.baseGivens; i++) {
      const { row, col } = cells[i];
      initialValues[row][col] = solution[row][col];
    }

    if (!enforceUniqueness(cages, initialValues, solution, profile.maxGivens)) { await yieldToBrowser(); continue; }
    if (!evaluateLogicalSolvability(initialValues, cages).solved) { await yieldToBrowser(); continue; }

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

/**
 * Gibt dem Browser zwischen Generator-Versuchen die Chance zu rendern
 * (z. B. Lade-Spinner-Animation). Auf eine macrotask warten, dann
 * zurück zur Schleife. Auf Mobile-CPUs rettet das die UI-Reaktivität.
 */
function yieldToBrowser(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
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

function partitionIntoCages(solution: number[][], sizePool: number[], entropyAnchors: number): Cage[] {
  const assigned = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));
  const cages: Cage[] = [];

  const addCage = (cells: Array<{ row: number; col: number }>): void => {
    for (const cell of cells) assigned[cell.row][cell.col] = true;
    cages.push({
      id: randomId(),
      cells,
      sum: cells.reduce((sum, cell) => sum + solution[cell.row][cell.col], 0),
      color: CAGE_COLORS[0],
    });
  };

  // Multiple-45-Anker: Vier interne Zweierkäfige decken acht Zellen der
  // ersten Zeile ab; der fünfte Käfig ragt genau eine Zelle heraus.
  // Damit besitzt jedes generierte Layout mindestens einen echten Outie.
  for (let col = 0; col < 8; col += 2) {
    addCage([{ row: 0, col }, { row: 0, col: col + 1 }]);
  }
  addCage([{ row: 0, col: 8 }, { row: 1, col: 8 }]);

  // Low-/High-Entropy-Anker gezielt statt zufällig platzieren.
  const extremeSums = new Set([3, 4, 16, 17]);
  const extremePairs = shuffle(allCells().flatMap((cell) =>
    neighbors(cell)
      .filter((neighbor) => cell.row * BOARD_SIZE + cell.col < neighbor.row * BOARD_SIZE + neighbor.col)
      .map((neighbor) => [cell, neighbor] as Array<{ row: number; col: number }>)
  ));
  let anchors = 0;
  for (const pair of extremePairs) {
    if (anchors >= entropyAnchors) break;
    if (pair.some((cell) => assigned[cell.row][cell.col])) continue;
    const sum = pair.reduce((total, cell) => total + solution[cell.row][cell.col], 0);
    if (!extremeSums.has(sum)) continue;
    addCage(pair);
    anchors++;
  }

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

function hasUniqueCombinationAnchor(cages: Cage[]): boolean {
  return cages.some((cage) =>
    (cage.cells.length === 2 && [3, 4, 16, 17].includes(cage.sum)) ||
    (cage.cells.length === 3 && [6, 7, 23, 24].includes(cage.sum))
  );
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
