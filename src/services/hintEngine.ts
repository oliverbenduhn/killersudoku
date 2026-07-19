// Strategische Hint-Engine für Killer-Sudoku.
//
// Findet den nächsten "leichten" Move für den User und liefert eine
// Erklärung in einer Sprache. Reine Funktion — keine Side-Effects.
//
// Techniken (in Reihenfolge der Priorität):
//   1. Naked Single (Cage): Käfig mit einer leeren Zelle → Wert = Summe - belegt
//   2. Hidden Single (Cage): Im Käfig kann nur eine Zelle einen bestimmten
//      Wert annehmen, weil die anderen Zellen ihn schon ausschließen
//   3. Naked Single (Sudoku): Zelle, in der nur ein einziger Wert die
//      Standard-Sudoku-Regeln erfüllt
//
// Was hier NICHT drin ist (Phase 4+):
//   - Locked Candidate (Pointing/Claiming)
//   - X-Wing, Swordfish, etc.
//   - Cage-Über-Sudoku-Schnittstellen-Logik (Backtracking)
// Begründung: Für die ersten 50 Level reichen die drei oben. Mehr
// verdoppelt die Komplexität ohne klaren Nutzen für Gelegenheits-Spieler.

import { CellPosition, Cage, GameLevel } from '../types/gameTypes';
import {
  getCageForCell,
  isCellValid,
  calculateCageSum,
} from './gameLogicService';
import { canReachSum } from '../utils/killerSolver';

export type HintTechnique =
  | 'naked-single-cage'
  | 'hidden-single-cage'
  | 'naked-single-sudoku'
  | 'innie'
  | 'outie';

export interface Hint {
  technique: HintTechnique;
  cell: CellPosition;
  value: number;
  /** Kurze, in sich geschlossene Erklärung. Max ~120 Zeichen. */
  explanation: string;
}

const SIZE = 9;

/**
 * Sucht den nächsten leichten Move auf dem Brett. Gibt null zurück, wenn
 * keine der drei implementierten Techniken greift.
 */
export function findNextHint(
  cellValues: number[][],
  cages: Cage[],
  solution?: number[][]
): Hint | null {
  // 1. Naked Single (Cage): nur eine leere Zelle im Käfig.
  const cageNaked = findNakedSingleCage(cellValues, cages, solution);
  if (cageNaked) return cageNaked;

  // 2. Hidden Single (Cage): Wert kann in Käfig nur an einer Stelle.
  const cageHidden = findHiddenSingleCage(cellValues, cages, solution);
  if (cageHidden) return cageHidden;

  // 3. Naked Single (Sudoku): Zelle mit genau einer gültigen Zahl.
  const sudokuNaked = findNakedSingleSudoku(cellValues, cages, solution);
  if (sudokuNaked) return sudokuNaked;

  // 4. 45er-Regel: Innies und Outies über Zeilen-/Spalten-Gruppen und Boxen.
  const innieOutie = findInnieOutie(cellValues, cages);
  if (innieOutie) return innieOutie;

  return null;
}

// --- Naked Single (Cage) --------------------------------------------------

function findNakedSingleCage(
  cellValues: number[][],
  cages: Cage[],
  solution?: number[][]
): Hint | null {
  for (const cage of cages) {
    const empties = cage.cells.filter((c) => cellValues[c.row][c.col] === 0);
    if (empties.length !== 1) continue;

    const cell = empties[0];
    // Erlaubte Werte: was übrig ist nach Sudoku + Cage-Regeln.
    const candidates = legalValuesForCell(cellValues, cell, cages);
    if (candidates.length !== 1) continue;

    return {
      technique: 'naked-single-cage',
      cell,
      value: candidates[0],
      explanation: cageNakedExplanation(cage, candidates[0]),
    };
  }
  return null;
}

function cageNakedExplanation(cage: Cage, value: number): string {
  // Zwei mögliche Quellen für Eindeutigkeit:
  //   a) Nur eine Zelle im Käfig leer → sie MUSS die Restsumme sein.
  //   b) Alle anderen Zahlen im Käfig verboten (z. B. Doublette) → Wert
  //      ist die einzige legale Möglichkeit.
  return `Im Käfig mit Summe ${cage.sum} ist nur diese eine Zelle leer — die einzig mögliche Zahl ist ${value}.`;
}

// --- Hidden Single (Cage) -------------------------------------------------

function findHiddenSingleCage(
  cellValues: number[][],
  cages: Cage[],
  solution?: number[][]
): Hint | null {
  for (const cage of cages) {
    // Pro Zahl 1..9: in welchen leeren Zellen des Käfigs ist sie legal?
    for (let value = 1; value <= SIZE; value++) {
      const legalCells = cage.cells.filter(
        (c) => cellValues[c.row][c.col] === 0 &&
               isCellValid(cellValues, c.row, c.col, value, cages, SIZE) &&
               !cageCellAlreadyHas(value, cellValues, cage)
      );
      if (legalCells.length === 1) {
        const cell = legalCells[0];
        return {
          technique: 'hidden-single-cage',
          cell,
          value,
          explanation: hiddenCageExplanation(value, cage),
        };
      }
    }
  }
  return null;
}

function cageCellAlreadyHas(value: number, cellValues: number[][], cage: Cage): boolean {
  // True, wenn `value` schon in einer anderen Zelle des Käfigs steht.
  return cage.cells.some((c) => cellValues[c.row][c.col] === value);
}

function hiddenCageExplanation(value: number, cage: Cage): string {
  return `Im Käfig mit Summe ${cage.sum} kann die ${value} nirgendwo sonst stehen — sie muss hier.`;
}

// --- Naked Single (Sudoku) ------------------------------------------------

function findNakedSingleSudoku(
  cellValues: number[][],
  cages: Cage[],
  solution?: number[][]
): Hint | null {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (cellValues[r][c] !== 0) continue;
      const candidates = legalValuesForCell(cellValues, { row: r, col: c }, cages);
      if (candidates.length === 1) {
        return {
          technique: 'naked-single-sudoku',
          cell: { row: r, col: c },
          value: candidates[0],
          explanation: sudokuNakedExplanation(r, c, candidates[0]),
        };
      }
    }
  }
  return null;
}

function sudokuNakedExplanation(row: number, col: number, value: number): string {
  // Friendly-Notation: 1-indexed für Anzeige.
  return `In Zeile ${row + 1}, Spalte ${col + 1} ist nur ${value} möglich — alle anderen Zahlen sind hier schon vergeben oder im Käfig/Konflikt.`;
}

// --- 45er-Regel: Innies und Outies ----------------------------------------
//
// Jedes Haus (Zeile/Spalte/Box) summiert 45, N Häuser summieren N*45
// (Multiple-45-Regel). Regionen: alle Einzelhäuser plus zusammenhängende
// Zeilen- und Spalten-Gruppen (N=2..8).
//
//   Innie: Alle offenen Zellen der Region bis auf genau eine sind von
//     Käfigen abgedeckt, deren offene Zellen komplett in der Region liegen
//     → Restzelle = N*45 − belegte Werte − Summe der internen Käfig-Reste.
//   Outie: Die Käfige über den offenen Zellen der Region ragen mit genau
//     einer Zelle heraus → herausragende Zelle = Käfig-Restsummen − Regionsrest.

interface Region {
  cells: CellPosition[];
  n: number;
  label: string;
}

function* allRegions(): Generator<Region> {
  for (let r = 0; r < SIZE; r++) {
    yield { cells: Array.from({ length: SIZE }, (_, c) => ({ row: r, col: c })), n: 1, label: `Zeile ${r + 1}` };
  }
  for (let c = 0; c < SIZE; c++) {
    yield { cells: Array.from({ length: SIZE }, (_, r) => ({ row: r, col: c })), n: 1, label: `Spalte ${c + 1}` };
  }
  for (let br = 0; br < SIZE; br += 3) {
    for (let bc = 0; bc < SIZE; bc += 3) {
      const cells: CellPosition[] = [];
      for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) cells.push({ row: r, col: c });
      yield { cells, n: 1, label: `Box ${br + bc / 3 + 1}` };
    }
  }
  // Zusammenhängende Zeilen- und Spalten-Gruppen (N=2..8).
  for (let len = 2; len < SIZE; len++) {
    for (let start = 0; start + len <= SIZE; start++) {
      const rowCells: CellPosition[] = [];
      const colCells: CellPosition[] = [];
      for (let i = start; i < start + len; i++) {
        for (let j = 0; j < SIZE; j++) {
          rowCells.push({ row: i, col: j });
          colCells.push({ row: j, col: i });
        }
      }
      yield { cells: rowCells, n: len, label: `Zeilen ${start + 1}–${start + len}` };
      yield { cells: colCells, n: len, label: `Spalten ${start + 1}–${start + len}` };
    }
  }
}

function findInnieOutie(cellValues: number[][], cages: Cage[]): Hint | null {
  const key = (c: CellPosition): number => c.row * SIZE + c.col;

  for (const region of allRegions()) {
    const inRegion = new Set(region.cells.map(key));
    const openInRegion = region.cells.filter((c) => cellValues[c.row][c.col] === 0);
    if (openInRegion.length === 0) continue;

    const filledSum = region.cells.reduce((s, c) => s + cellValues[c.row][c.col], 0);
    // Summe, die die offenen Zellen der Region noch ergeben müssen.
    const openTarget = region.n * 45 - filledSum;

    // Käfige mit mindestens einer offenen Zelle in der Region.
    let insideOpenSum = 0;
    let touchingOpenSum = 0;
    const coveredByInside = new Set<number>();
    const coveredByTouching = new Set<number>();
    const openOutside: CellPosition[] = [];
    for (const cage of cages) {
      const openCells = cage.cells.filter((c) => cellValues[c.row][c.col] === 0);
      if (!openCells.some((c) => inRegion.has(key(c)))) continue;
      const cageOpenSum = cage.sum - calculateCageSum(cellValues, cage);
      const outs = openCells.filter((c) => !inRegion.has(key(c)));
      touchingOpenSum += cageOpenSum;
      for (const c of openCells) if (inRegion.has(key(c))) coveredByTouching.add(key(c));
      if (outs.length === 0) {
        insideOpenSum += cageOpenSum;
        for (const c of openCells) coveredByInside.add(key(c));
      } else {
        openOutside.push(...outs);
      }
    }

    // Innie: genau eine offene Zelle ist nicht von internen Käfigen abgedeckt.
    const innieCells = openInRegion.filter((c) => !coveredByInside.has(key(c)));
    if (innieCells.length === 1) {
      const cell = innieCells[0];
      const value = openTarget - insideOpenSum;
      if (value >= 1 && value <= SIZE && isCellValid(cellValues, cell.row, cell.col, value, cages, SIZE)) {
        return {
          technique: 'innie',
          cell,
          value,
          explanation: `45er-Regel: ${region.label} ist bis auf diese Zelle von Käfigen abgedeckt — sie muss ${value} sein.`,
        };
      }
    }

    // Outie: Käfige decken alle offenen Zellen der Region ab und ragen mit
    // genau einer Zelle heraus.
    if (openOutside.length === 1 && openInRegion.every((c) => coveredByTouching.has(key(c)))) {
      const cell = openOutside[0];
      const value = touchingOpenSum - openTarget;
      if (value >= 1 && value <= SIZE && isCellValid(cellValues, cell.row, cell.col, value, cages, SIZE)) {
        return {
          technique: 'outie',
          cell,
          value,
          explanation: `45er-Regel: Die Käfige über ${region.label} ragen nur mit dieser Zelle heraus — sie muss ${value} sein.`,
        };
      }
    }
  }
  return null;
}

// --- Helpers --------------------------------------------------------------

/**
 * Alle legalen Werte für eine bestimmte Zelle, gegeben Sudoku-Regeln +
 * Käfig-Constraints (kein Doublette, Restsumme ausreichend für
 * verbleibende Zellen).
 */
function legalValuesForCell(
  cellValues: number[][],
  cell: CellPosition,
  cages: Cage[]
): number[] {
  const cage = getCageForCell(cages, cell.row, cell.col);
  if (!cage) return [];

  // Doppelbelegung im Käfig prüfen.
  const usedInCage = cage.cells
    .filter((c) => !(c.row === cell.row && c.col === cell.col))
    .map((c) => cellValues[c.row][c.col])
    .filter((v) => v !== 0);

  const cageCurrentSum = calculateCageSum(cellValues, cage);
  const cageRemainingSum = cage.sum - cageCurrentSum;
  const cageEmptyCells = cage.cells.filter((c) => cellValues[c.row][c.col] === 0).length;

  const out: number[] = [];
  for (let v = 1; v <= SIZE; v++) {
    if (usedInCage.includes(v)) continue;
    if (!isCellValid(cellValues, cell.row, cell.col, v, cages, SIZE)) continue;
    if (!canReachSum(cageEmptyCells - 1, cageRemainingSum - v)) continue;
    out.push(v);
  }
  return out;
}

/**
 * Convenience: lade ein Level aus dem public/-Ordner und finde den ersten
 * Hinweis. Wird vom UI-Hook nicht direkt genutzt, ist aber praktisch zum
 * Debuggen.
 */
export function findFirstHintForLevel(level: GameLevel): Hint | null {
  return findNextHint(level.initialValues, level.cages, level.solution);
}
