// Strategische Hint-Engine für Killer-Sudoku.
//
// Findet den nächsten "leichten" Move für den User und liefert eine
// Erklärung in einer Sprache. Reine Funktion — keine Side-Effects.
//
// Techniken: Naked/Hidden Singles für Käfige und Sudoku-Häuser sowie
// Multiple-45-Innies/-Outies. Alle Käfigschlüsse laufen über dieselbe
// exakte Kombinationstabelle wie Spielvalidierung und Solver.
//
// Was hier NICHT drin ist (Phase 4+):
//   - Locked Candidate (Pointing/Claiming)
//   - X-Wing, Swordfish, etc.
//   - Cage-Über-Sudoku-Schnittstellen-Logik (Backtracking)
// Diese Techniken bilden zugleich den überprüften logischen Lösungsumfang
// des prozeduralen Generators.

import { CellPosition, Cage, GameLevel } from '../types/gameTypes';
import {
  isCellValid,
} from './gameLogicService';
import { analyzeCage, cellKey, getLegalValuesForCell } from '../utils/killerConstraints';
import { find45Deductions, getHouses, House } from '../utils/killerRegions';

export type HintTechnique =
  | 'naked-single-cage'
  | 'hidden-single-cage'
  | 'naked-single-sudoku'
  | 'hidden-single-sudoku'
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
 * keine der implementierten Techniken greift.
 */
export function findNextHint(
  cellValues: number[][],
  cages: Cage[],
  solution?: number[][]
): Hint | null {
  // 1. Naked Single (Cage): nur eine leere Zelle im Käfig.
  const cageNaked = findNakedSingleCage(cellValues, cages, solution);
  if (cageNaked) return cageNaked;

  // 2. Hidden Single (Sudoku): Ein House hat nur noch einen Platz für die Ziffer.
  const sudokuHidden = findHiddenSingleSudoku(cellValues, cages);
  if (sudokuHidden) return sudokuHidden;

  // 3. Hidden Single (Cage): verpflichtende Ziffer kann nur an eine Stelle.
  const cageHidden = findHiddenSingleCage(cellValues, cages, solution);
  if (cageHidden) return cageHidden;

  // 4. Naked Single (Sudoku): Zelle mit genau einer gültigen Zahl.
  const sudokuNaked = findNakedSingleSudoku(cellValues, cages, solution);
  if (sudokuNaked) return sudokuNaked;

  // 5. 45er-Regel: Innies und Outies über Zeilen-/Spalten-Gruppen und Boxen.
  const innieOutie = findInnieOutie(cellValues, cages);
  if (innieOutie) return innieOutie;

  return null;
}

function findHiddenSingleSudoku(cellValues: number[][], cages: Cage[]): Hint | null {
  const candidates = new Map<string, number[]>();
  const coveredCells = new Set(cages.flatMap((cage) => cage.cells.map(cellKey)));
  for (const house of getHouses()) {
    // Synthetische Teilbretter und beschädigte Level dürfen keine Schlüsse
    // aus Zellen ziehen, deren Käfigconstraint unbekannt ist.
    if (house.cells.some((cell) => !coveredCells.has(cellKey(cell)))) continue;
    const present = new Set(house.cells.map((cell) => cellValues[cell.row][cell.col]).filter(Boolean));
    for (let value = 1; value <= SIZE; value++) {
      if (present.has(value)) continue;
      const possibleCells = house.cells.filter((cell) => {
        if (cellValues[cell.row][cell.col] !== 0) return false;
        const key = cellKey(cell);
        if (!candidates.has(key)) candidates.set(key, getLegalValuesForCell(cellValues, cell, cages));
        return candidates.get(key)!.includes(value);
      });
      if (possibleCells.length === 1) {
        const cell = possibleCells[0];
        return {
          technique: 'hidden-single-sudoku',
          cell,
          value,
          explanation: hiddenSudokuExplanation(cellValues, house, cell, value),
        };
      }
    }
  }
  return null;
}

// --- Naked Single (Cage + Sudoku) ----------------------------------------
//
// Audit 💡 #32: Auf den ersten Blick wirken findNakedSingleCage und
// findNakedSingleSudoku redundant — beide suchen Zellen mit genau
// einem legalen Wert. Sie sind aber NICHT deckungsgleich:
//
//   findNakedSingleCage findet nur Fälle, in denen die Eindeutigkeit
//     aus dem KÄFIG kommt: nur eine Zelle im Käfig leer (Restsumme
//     erzwingt den Wert), oder alle anderen Zahlen im Käfig
//     ausgeschlossen (Doublette / kombinatorisch eng).
//   findNakedSingleSudoku findet Fälle, in denen die Eindeutigkeit
//     nur aus den SUDOKU-HÄUSERN kommt: Käfig hätte mehrere mögliche
//     Zellen, aber Zeile/Spalte/Box sperren alle bis auf eine.
//
// Beispiel für reine Sudoku-Singularität: Käfig [a,b,c] mit drei
// leeren Zellen, alle akzeptieren {4,5,9}. Zelle a liegt in einer
// Zeile, in der 4 und 5 bereits stehen, einer Spalte, in der 9

function hiddenSudokuExplanation(
  cellValues: number[][],
  house: House,
  cell: CellPosition,
  value: number
): string {
  const houseName = house.kind === 'row'
    ? `Zeile ${house.index + 1}`
    : house.kind === 'column'
      ? `Spalte ${house.index + 1}`
      : `Box ${house.index + 1}`;

  // Warum können die anderen leeren Zellen im Haus die Zahl nicht?
  const reasons: string[] = [];
  for (const c of house.cells) {
    if (c.row === cell.row && c.col === cell.col) continue;
    if (cellValues[c.row][c.col] !== 0) continue; // schon belegt
    // Welches Haus blockiert? Zeile, Spalte oder Box.
    const rowHas = cellValues[c.row].includes(value);
    const colHas = cellValues.some((row) => row[c.col] === value);
    if (rowHas && colHas) {
      reasons.push(`Zeile ${c.row + 1} und Spalte ${c.col + 1} haben schon eine ${value}`);
    } else if (rowHas) {
      reasons.push(`Zeile ${c.row + 1} hat schon eine ${value}`);
    } else if (colHas) {
      reasons.push(`Spalte ${c.col + 1} hat schon eine ${value}`);
    } else {
      // Box muss es sein — finde die Box-Nummer.
      const boxIdx = Math.floor(c.row / 3) * 3 + Math.floor(c.col / 3);
      reasons.push(`Box ${boxIdx + 1} hat schon eine ${value}`);
    }
  }

  const uniqueReasons = [...new Set(reasons)];
  if (uniqueReasons.length === 0) {
    return `${houseName} hat nur noch an dieser Stelle Platz für die ${value}.`;
  }
  const reasonText = uniqueReasons.length === 1
    ? uniqueReasons[0]
    : `${uniqueReasons.slice(0, -1).join(', ')} und ${uniqueReasons[uniqueReasons.length - 1]}`;
  return `${houseName} hat nur noch an dieser Stelle Platz für die ${value} — ${reasonText}.`;
}
// bereits steht, und einer Box, in der 4 und 5 bereits stehen →
// nur 9 möglich. Cage-Singularität greift nicht (3 leere Zellen,
// jede sieht im Käfig dieselben Kandidaten), Sudoku-Singularität
// schon.
//
// Reihenfolge ist bewusst: Käfig-Variante zuerst, weil sie für den
// User intuitiver zu erklären ist ("nur diese Zelle leer, also X")
// und öfter vorkommt. Sudoku-Variante fängt den Rest ab.
//
// Audit 🔴 #17 hat den Helper legalValuesForCell vereinheitlicht;
// der eigentliche Iterationsunterschied (Käfig-First vs. Brett-First)
// bleibt aber semantisch und ist hier explizit dokumentiert.

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
      explanation: cageNakedExplanation(cellValues, cage, candidates[0]),
    };
  }
  return null;
}

function cageNakedExplanation(cellValues: number[][], cage: Cage, value: number): string {
  // Zwei mögliche Quellen für Eindeutigkeit:
  //   a) Nur eine Zelle im Käfig leer → sie MUSS die Restsumme sein.
  //   b) Alle anderen Zahlen im Käfig verboten (z. B. Doublette) → Wert
  //      ist die einzige legale Möglichkeit.
  const filled = cage.cells
    .map((c) => cellValues[c.row][c.col])
    .filter((v) => v !== 0);
  const filledSum = filled.reduce((a, b) => a + b, 0);
  const arithmetic = ` (${cage.sum} − ${filled.join(' − ')} = ${cage.sum - filledSum})`;
  return `Im Käfig mit Summe ${cage.sum} ist nur diese eine Zelle leer — die einzig mögliche Zahl ist ${value}${arithmetic}.`;
}

// --- Hidden Single (Cage) -------------------------------------------------

function findHiddenSingleCage(
  cellValues: number[][],
  cages: Cage[],
  solution?: number[][]
): Hint | null {
  for (const cage of cages) {
    const analysis = analyzeCage(cellValues, cage);
    if (!analysis.valid) continue;
    // Nur Ziffern, die in jeder noch möglichen Käfigkombination vorkommen,
    // dürfen als Hidden Single erzwungen werden.
    for (const value of analysis.consistentDigits) {
      if (cageCellAlreadyHas(value, cellValues, cage)) continue;
      const legalCells = cage.cells.filter((cell) =>
        cellValues[cell.row][cell.col] === 0 &&
        analysis.candidates[cellKey(cell)].includes(value)
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

function findInnieOutie(cellValues: number[][], cages: Cage[]): Hint | null {
  for (const deduction of find45Deductions(cellValues, cages)) {
    const { cell, value, region, kind } = deduction;
    if (!isCellValid(cellValues, cell.row, cell.col, value, cages, SIZE)) continue;
    return {
      technique: kind,
      cell,
      value,
      explanation: kind === 'innie'
        ? `45er-Regel: ${region.label} ist bis auf diese Zelle von Käfigen abgedeckt — sie muss ${value} sein.`
        : `45er-Regel: Die Käfige über ${region.label} ragen nur mit dieser Zelle heraus — sie muss ${value} sein.`,
    };
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
  return getLegalValuesForCell(cellValues, cell, cages);
}

/**
 * Convenience: lade ein Level aus dem public/-Ordner und finde den ersten
 * Hinweis. Wird vom UI-Hook nicht direkt genutzt, ist aber praktisch zum
 * Debuggen.
 */
export function findFirstHintForLevel(level: GameLevel): Hint | null {
  return findNextHint(level.initialValues, level.cages, level.solution);
}

export interface LogicalSolveResult {
  solved: boolean;
  steps: number;
  remainingCells: number;
  techniques: Partial<Record<HintTechnique, number>>;
}

/** Spielt ausschließlich die öffentlich erklärbaren Hint-Techniken durch. */
export function evaluateLogicalSolvability(
  initialValues: number[][],
  cages: Cage[]
): LogicalSolveResult {
  const board = initialValues.map((row) => [...row]);
  const techniques: Partial<Record<HintTechnique, number>> = {};
  let steps = 0;
  while (steps < SIZE * SIZE) {
    const remainingCells = board.flat().filter((value) => value === 0).length;
    if (remainingCells === 0) return { solved: true, steps, remainingCells: 0, techniques };
    const hint = findNextHint(board, cages);
    if (!hint || board[hint.cell.row][hint.cell.col] !== 0) {
      return { solved: false, steps, remainingCells, techniques };
    }
    board[hint.cell.row][hint.cell.col] = hint.value;
    techniques[hint.technique] = (techniques[hint.technique] ?? 0) + 1;
    steps++;
  }
  const remainingCells = board.flat().filter((value) => value === 0).length;
  return { solved: remainingCells === 0, steps, remainingCells, techniques };
}
