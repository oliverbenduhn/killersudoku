import { BOARD_SIZE, Cage, CellPosition } from '../types/gameTypes';

export type HouseKind = 'row' | 'column' | 'box';

export interface House {
  kind: HouseKind;
  index: number;
  cells: CellPosition[];
  targetSum: 45;
}

export interface Multiple45Region {
  cells: CellPosition[];
  houseCount: number;
  targetSum: number;
  label: string;
}

export interface CageSplit {
  cageId: string;
  cageSum: number;
  inside: CellPosition[];
  outside: CellPosition[];
}

export interface FortyFiveDeduction {
  kind: 'innie' | 'outie';
  cell: CellPosition;
  value: number;
  region: Multiple45Region;
}

const key = (cell: CellPosition): number => cell.row * BOARD_SIZE + cell.col;

function buildHouses(): House[] {
  const houses: House[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    houses.push({
      kind: 'row', index: row, targetSum: 45,
      cells: Array.from({ length: BOARD_SIZE }, (_, col) => ({ row, col })),
    });
  }
  for (let col = 0; col < BOARD_SIZE; col++) {
    houses.push({
      kind: 'column', index: col, targetSum: 45,
      cells: Array.from({ length: BOARD_SIZE }, (_, row) => ({ row, col })),
    });
  }
  for (let box = 0; box < BOARD_SIZE; box++) {
    const startRow = Math.floor(box / 3) * 3;
    const startCol = (box % 3) * 3;
    const cells: CellPosition[] = [];
    for (let row = startRow; row < startRow + 3; row++) {
      for (let col = startCol; col < startCol + 3; col++) cells.push({ row, col });
    }
    houses.push({ kind: 'box', index: box, targetSum: 45, cells });
  }
  return houses;
}

const HOUSES = buildHouses();

export function getHouses(): House[] {
  return HOUSES.map((house) => ({ ...house, cells: house.cells.map((cell) => ({ ...cell })) }));
}

function buildRegions(): Multiple45Region[] {
  const regions: Multiple45Region[] = HOUSES.map((house) => ({
    cells: house.cells,
    houseCount: 1,
    targetSum: 45,
    label: house.kind === 'row'
      ? `Zeile ${house.index + 1}`
      : house.kind === 'column'
        ? `Spalte ${house.index + 1}`
        : `Box ${house.index + 1}`,
  }));

  // Zusammenhängende Zeilen-/Spaltengruppen sind die praktisch relevanten
  // Multiple-45-Regionen; beliebige Teilmengen würden denselben Schluss mit
  // wesentlich höherem Suchaufwand wiederholen.
  for (let length = 2; length < BOARD_SIZE; length++) {
    for (let start = 0; start + length <= BOARD_SIZE; start++) {
      const rowCells: CellPosition[] = [];
      const columnCells: CellPosition[] = [];
      for (let index = start; index < start + length; index++) {
        for (let offset = 0; offset < BOARD_SIZE; offset++) {
          rowCells.push({ row: index, col: offset });
          columnCells.push({ row: offset, col: index });
        }
      }
      regions.push({
        cells: rowCells,
        houseCount: length,
        targetSum: length * 45,
        label: `Zeilen ${start + 1}–${start + length}`,
      });
      regions.push({
        cells: columnCells,
        houseCount: length,
        targetSum: length * 45,
        label: `Spalten ${start + 1}–${start + length}`,
      });
    }
  }
  return regions;
}

const REGIONS = buildRegions();

export function getMultiple45Regions(): Multiple45Region[] {
  return REGIONS;
}

export function splitCagesByRegion(region: Multiple45Region, cages: Cage[]): CageSplit[] {
  const insideKeys = new Set(region.cells.map(key));
  return cages.flatMap((cage) => {
    const inside = cage.cells.filter((cell) => insideKeys.has(key(cell)));
    const outside = cage.cells.filter((cell) => !insideKeys.has(key(cell)));
    return inside.length > 0 && outside.length > 0
      ? [{ cageId: cage.id, cageSum: cage.sum, inside, outside }]
      : [];
  });
}

/** Alle arithmetisch bestimmten Einzelzellen aus Innies und Outies. */
export function find45Deductions(board: number[][], cages: Cage[]): FortyFiveDeduction[] {
  const deductions: FortyFiveDeduction[] = [];
  for (const region of REGIONS) {
    const regionKeys = new Set(region.cells.map(key));
    const openInside = region.cells.filter((cell) => board[cell.row][cell.col] === 0);
    if (openInside.length === 0) continue;

    const filledSum = region.cells.reduce((sum, cell) => sum + board[cell.row][cell.col], 0);
    const openTarget = region.targetSum - filledSum;
    let internalOpenSum = 0;
    let touchingOpenSum = 0;
    const coveredInternal = new Set<number>();
    const coveredTouching = new Set<number>();
    const openOutside: CellPosition[] = [];

    for (const cage of cages) {
      const openCells = cage.cells.filter((cell) => board[cell.row][cell.col] === 0);
      if (!openCells.some((cell) => regionKeys.has(key(cell)))) continue;
      const filledCageSum = cage.cells.reduce((sum, cell) => sum + board[cell.row][cell.col], 0);
      const openCageSum = cage.sum - filledCageSum;
      const outside = openCells.filter((cell) => !regionKeys.has(key(cell)));
      touchingOpenSum += openCageSum;
      for (const cell of openCells) if (regionKeys.has(key(cell))) coveredTouching.add(key(cell));
      if (outside.length === 0) {
        internalOpenSum += openCageSum;
        for (const cell of openCells) coveredInternal.add(key(cell));
      } else {
        openOutside.push(...outside);
      }
    }

    const innies = openInside.filter((cell) => !coveredInternal.has(key(cell)));
    if (innies.length === 1) {
      const value = openTarget - internalOpenSum;
      if (value >= 1 && value <= BOARD_SIZE) {
        deductions.push({ kind: 'innie', cell: innies[0], value, region });
      }
    }

    if (openOutside.length === 1 && openInside.every((cell) => coveredTouching.has(key(cell)))) {
      const value = touchingOpenSum - openTarget;
      if (value >= 1 && value <= BOARD_SIZE) {
        deductions.push({ kind: 'outie', cell: openOutside[0], value, region });
      }
    }
  }
  return deductions;
}
