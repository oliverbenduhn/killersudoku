// Brett-Wert-Lookup: konsolidiert den Cell→Cage-Mapping, den gameLogicService,
// killerConstraints und Board.tsx jeweils selbst nachgebaut haben.
//
// Bewusst klein gehalten: kein Memo, keine Defensivkopie. Wer eine
// Cell→Cage-Antwort braucht, baut den Index einmal selbst (oder übernimmt ihn
// von einem Caller, der ihn schon gebaut hat) und reicht ihn weiter. Auf 9×9
// mit ≤ 50 Käfigs ist der Aufbau O(81) und in der Praxis unter jedem messbaren
// Schwellenwert.

import { Cage, CellPosition } from '../types/gameTypes';

export function cellKey(cell: CellPosition): string {
  return `${cell.row},${cell.col}`;
}

/**
 * Baut die Cell→Cage-Map aus einer Käfig-Liste. O(Σ|cells|), üblicherweise
 * ≤ 81 Einträge. Aufrufer können den Index über mehrere Lookups hinweg
 * weiterreichen statt ihn jedes Mal neu zu bauen.
 */
export function buildCageIndex(cages: Cage[]): Map<string, Cage> {
  const index = new Map<string, Cage>();
  for (const cage of cages) {
    for (const cell of cage.cells) {
      index.set(`${cell.row},${cell.col}`, cage);
    }
  }
  return index;
}

/**
 * Cell→Cage-Lookup. Ersetzt die Inline-Implementierungen
 * (getCageForCell, cages.find, cage.cells.some) durch eine gemeinsame
 * Stelle. Aufrufer können einen bestehenden Index via {@link cageOfCellIn}
 * weiterreichen, wenn sie ohnehin schon einen gebaut haben.
 */
export function cageOfCell(
  cages: Cage[],
  cell: CellPosition
): Cage | undefined;
export function cageOfCell(
  cages: Cage[],
  row: number,
  col: number
): Cage | undefined;
export function cageOfCell(
  cages: Cage[],
  rowOrCell: number | CellPosition,
  col?: number
): Cage | undefined {
  if (typeof rowOrCell === 'number') {
    return buildCageIndex(cages).get(`${rowOrCell},${col}`);
  }
  return buildCageIndex(cages).get(`${rowOrCell.row},${rowOrCell.col}`);
}

export function cageOfCellIn(
  index: Map<string, Cage>,
  cell: CellPosition
): Cage | undefined;
export function cageOfCellIn(
  index: Map<string, Cage>,
  row: number,
  col: number
): Cage | undefined;
export function cageOfCellIn(
  index: Map<string, Cage>,
  rowOrCell: number | CellPosition,
  col?: number
): Cage | undefined {
  if (typeof rowOrCell === 'number') {
    return index.get(`${rowOrCell},${col}`);
  }
  return index.get(`${rowOrCell.row},${rowOrCell.col}`);
}