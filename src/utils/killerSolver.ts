// Killer-Sudoku-Solver für die Eindeutigkeitsprüfung.
//
// Backtracking mit Bitmasken pro Haus (Zeile/Spalte/Block) und pro Käfig,
// Käfig-Summen-Pruning über Min/Max-Schranken der Restbelegung sowie
// MRV-Heuristik (Zelle mit wenigsten Kandidaten zuerst). Zählt Lösungen
// nur bis `limit` — für die Eindeutigkeitsfrage reicht limit=2.

import { Cage, BOARD_SIZE } from '../types/gameTypes';

const CELLS = BOARD_SIZE * BOARD_SIZE;

/**
 * Können `cellsLeft` paarweise verschiedene Ziffern aus 1..9 exakt `sum`
 * ergeben? Schranken: kleinste Summe k(k+1)/2, größte Summe k(19-k)/2.
 */
export function canReachSum(cellsLeft: number, sum: number): boolean {
  if (cellsLeft === 0) return sum === 0;
  return sum >= (cellsLeft * (cellsLeft + 1)) / 2 && sum <= (cellsLeft * (19 - cellsLeft)) / 2;
}

// Exakte Kombinatorik-Prüfung (memoisierte Look-up Table): Existiert eine
// k-elementige Teilmenge der noch verfügbaren Ziffern (Bitmaske, Bits 1..9)
// mit exakt dieser Summe? Deutlich schärferes Pruning als die reinen
// Min/Max-Schranken — entscheidend bei großen Käfigen auf leeren Brettern.
const AVAIL_ALL = 0b1111111110;
const subsetMemo = new Map<number, boolean>();

function subsetSumExists(k: number, sum: number, availMask: number): boolean {
  if (k === 0) return sum === 0;
  if (sum < 0 || !canReachSum(k, sum)) return false;
  const key = (k << 16) | (sum << 10) | (availMask >> 1);
  const hit = subsetMemo.get(key);
  if (hit !== undefined) return hit;
  let ok = false;
  // d = kleinste gewählte Ziffer; danach nur größere zulassen, damit jede
  // Teilmenge genau einmal geprüft wird.
  for (let d = 1; d <= 9 && !ok; d++) {
    if (!(availMask & (1 << d))) continue;
    ok = subsetSumExists(k - 1, sum - d, availMask & ~((1 << (d + 1)) - 1));
  }
  subsetMemo.set(key, ok);
  return ok;
}

/**
 * Zählt die Lösungen eines Killer-Sudokus (Käfige + optionale Vorgaben),
 * bricht bei `limit` ab. Ergebnis 0 = unlösbar, 1 = eindeutig, >=2 = mehrdeutig.
 *
 * Voraussetzung: Käfige überdecken das Brett vollständig und überlappungsfrei
 * (wird vom levelValidator vorab sichergestellt).
 */
export function countSolutions(
  cages: Cage[],
  initialValues: number[][],
  limit: number = 2
): number {
  return findSolutions(cages, initialValues, limit).length;
}

/** Wird geworfen, wenn `maxNodes` überschritten wird (nur mit Budget). */
export class SolverBudgetExceededError extends Error {
  constructor() {
    super('Solver-Knoten-Budget überschritten');
  }
}

/**
 * Wie countSolutions, liefert aber die gefundenen Lösungen (bis `limit`)
 * als 9x9-Matrizen zurück — z. B. für die Eindeutigkeits-Reparatur im
 * Generator (Vorgabe an einer Zelle setzen, wo sich zwei Lösungen
 * unterscheiden).
 *
 * `maxNodes` begrenzt optional die Suchknoten; bei Überschreitung wird
 * SolverBudgetExceededError geworfen. Der Generator nutzt das, um
 * pathologisch teure Kandidaten-Bretter zu verwerfen statt minutenlang
 * zu suchen. Für exakte Aussagen (Validator) kein Budget setzen.
 */
export function findSolutions(
  cages: Cage[],
  initialValues: number[][],
  limit: number = 2,
  maxNodes?: number
): number[][][] {
  const cageOfCell = new Int16Array(CELLS).fill(-1);
  cages.forEach((cage, i) => {
    for (const c of cage.cells) cageOfCell[c.row * BOARD_SIZE + c.col] = i;
  });

  const grid = new Int8Array(CELLS);
  const rowMask = new Int16Array(BOARD_SIZE);
  const colMask = new Int16Array(BOARD_SIZE);
  const boxMask = new Int16Array(BOARD_SIZE);
  const cageMask = new Int16Array(cages.length);
  const cageLeftSum = new Int16Array(cages.length);
  const cageLeftCells = new Int8Array(cages.length);
  cages.forEach((cage, i) => {
    cageLeftSum[i] = cage.sum;
    cageLeftCells[i] = cage.cells.length;
  });

  const boxOf = (idx: number): number =>
    Math.floor(idx / 27) * 3 + Math.floor((idx % 9) / 3);

  const place = (idx: number, v: number): void => {
    const bit = 1 << v;
    const g = cageOfCell[idx];
    grid[idx] = v;
    rowMask[Math.floor(idx / 9)] |= bit;
    colMask[idx % 9] |= bit;
    boxMask[boxOf(idx)] |= bit;
    cageMask[g] |= bit;
    cageLeftSum[g] -= v;
    cageLeftCells[g] -= 1;
  };

  const unplace = (idx: number, v: number): void => {
    const bit = ~(1 << v);
    const g = cageOfCell[idx];
    grid[idx] = 0;
    rowMask[Math.floor(idx / 9)] &= bit;
    colMask[idx % 9] &= bit;
    boxMask[boxOf(idx)] &= bit;
    cageMask[g] &= bit;
    cageLeftSum[g] += v;
    cageLeftCells[g] += 1;
  };

  // Vorgaben setzen; widersprüchliche Vorgaben => keine Lösung.
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const v = initialValues[r][c];
      if (v === 0) continue;
      const idx = r * BOARD_SIZE + c;
      const g = cageOfCell[idx];
      const used = rowMask[r] | colMask[c] | boxMask[boxOf(idx)] | cageMask[g];
      if (used & (1 << v)) return [];
      place(idx, v);
    }
  }

  const candidatesFor = (idx: number): number[] => {
    const g = cageOfCell[idx];
    const used =
      rowMask[Math.floor(idx / 9)] | colMask[idx % 9] | boxMask[boxOf(idx)] | cageMask[g];
    const out: number[] = [];
    const left = cageLeftCells[g];
    const sumLeft = cageLeftSum[g];
    // Für die Restzellen des Käfigs zählt nur die Käfig-Maske (sie liegen
    // i. d. R. in anderen Zeilen/Spalten/Blöcken als diese Zelle).
    const cageAvail = AVAIL_ALL & ~cageMask[g];
    for (let v = 1; v <= 9; v++) {
      if (used & (1 << v)) continue;
      if (subsetSumExists(left - 1, sumLeft - v, cageAvail & ~(1 << v))) out.push(v);
    }
    return out;
  };

  const empties: number[] = [];
  for (let i = 0; i < CELLS; i++) if (grid[i] === 0) empties.push(i);

  const solutions: number[][][] = [];
  let nodes = 0;
  const search = (): void => {
    if (maxNodes !== undefined && ++nodes > maxNodes) throw new SolverBudgetExceededError();
    if (solutions.length >= limit) return;
    let best = -1;
    let bestCands: number[] | null = null;
    for (const idx of empties) {
      if (grid[idx] !== 0) continue;
      const cands = candidatesFor(idx);
      if (cands.length === 0) return;
      if (bestCands === null || cands.length < bestCands.length) {
        best = idx;
        bestCands = cands;
        if (cands.length === 1) break;
      }
    }
    if (best === -1 || bestCands === null) {
      const snapshot: number[][] = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        snapshot.push(Array.from(grid.slice(r * BOARD_SIZE, (r + 1) * BOARD_SIZE)));
      }
      solutions.push(snapshot);
      return;
    }
    for (const v of bestCands) {
      place(best, v);
      search();
      unplace(best, v);
      if (solutions.length >= limit) return;
    }
  };
  search();
  return solutions;
}
