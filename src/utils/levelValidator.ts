// Killer Sudoku — Schema- und Regel-Validator.
// Läuft sowohl als CLI (npm run validate) als auch in Jest.
// Quelle der Wahrheit: src/types/gameTypes.ts.

import { Cage, CageColor, CAGE_COLORS, GameLevel, BOARD_SIZE } from '../types/gameTypes';
import { countSolutions } from './killerSolver';
import * as fs from 'fs';
import * as path from 'path';

export type ValidationErrorType =
  | 'SCHEMA_TOP_LEVEL'
  | 'SCHEMA_CAGE'
  | 'SCHEMA_BOARD_SHAPE'
  | 'SCHEMA_BOARD_VALUES'
  | 'INVALID_CAGE_COLOR'
  | 'INVALID_CAGE_SUM'
  | 'OVERLAPPING_CAGES'
  | 'UNCOVERED_CELLS'
  | 'DUPLICATE_CELL_IN_CAGE'
  | 'CAGE_TOO_LARGE'
  | 'MISSING_SOLUTION'
  | 'INVALID_SOLUTION'
  | 'MISSING_INITIAL_VALUES'
  | 'INITIAL_VALUES_MISMATCH'
  | 'ADJACENT_SAME_COLOR'
  | 'DUPLICATE_VALUES_IN_CAGE'
  | 'CAGE_SUM_SOLUTION_MISMATCH'
  | 'NO_SOLUTION'
  | 'MULTIPLE_SOLUTIONS';

export interface ValidationError {
  levelId: string;
  errorType: ValidationErrorType;
  message: string;
  details?: unknown;
}

export interface ValidationResult {
  levelId: string;
  valid: boolean;
  errors: ValidationError[];
}

// ---------- Low-level Schema-Prüfung ----------

function isCellPosition(x: unknown): x is { row: number; col: number } {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.row === 'number' && Number.isInteger(o.row) &&
    typeof o.col === 'number' && Number.isInteger(o.col) &&
    o.row >= 0 && o.row < BOARD_SIZE &&
    o.col >= 0 && o.col < BOARD_SIZE
  );
}

function isValidColor(c: unknown): c is CageColor {
  return typeof c === 'string' && (CAGE_COLORS as readonly string[]).includes(c);
}

function validateBoardShape(rows: unknown): rows is number[][] {
  if (!Array.isArray(rows) || rows.length !== BOARD_SIZE) return false;
  return rows.every((row) =>
    Array.isArray(row) && row.length === BOARD_SIZE &&
    row.every((v) => typeof v === 'number' && Number.isInteger(v))
  );
}

// ---------- Inhalts-Validierung ----------

function areCellsAdjacent(a: { row: number; col: number }, b: { row: number; col: number }): boolean {
  return (Math.abs(a.row - b.row) === 1 && a.col === b.col) ||
         (Math.abs(a.col - b.col) === 1 && a.row === b.row);
}

function areCagesAdjacent(a: Cage, b: Cage): boolean {
  return a.cells.some((ca) => b.cells.some((cb) => areCellsAdjacent(ca, cb)));
}

function getPossibleSums(size: number): Set<number> {
  if (size < 1 || size > BOARD_SIZE) return new Set();
  // Alle Kombinationen ohne Wiederholung aus {1..9} der Länge size.
  const out = new Set<number>();
  const combo = (start: number, remaining: number, sum: number): void => {
    if (remaining === 0) { out.add(sum); return; }
    for (let i = start; i <= BOARD_SIZE - remaining + 1; i++) {
      combo(i + 1, remaining - 1, sum + i);
    }
  };
  combo(1, size, 0);
  return out;
}

function isValidSudokuSet(nums: number[]): boolean {
  if (nums.length !== BOARD_SIZE) return false;
  const seen = new Set<number>();
  for (const n of nums) {
    if (n < 1 || n > BOARD_SIZE) return false;
    if (seen.has(n)) return false;
    seen.add(n);
  }
  return true;
}

// ---------- Hauptvalidator ----------

export function validateLevel(level: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const lvl = level as Partial<GameLevel> | null | undefined;
  const levelId = lvl && typeof lvl.id === 'string' ? lvl.id : '<missing id>';

  // 0. Top-Level Schema
  if (typeof lvl !== 'object' || lvl === null) {
    return { levelId, valid: false, errors: [{ levelId, errorType: 'SCHEMA_TOP_LEVEL', message: 'Level ist kein Objekt' }] };
  }
  if (!Array.isArray(lvl.cages)) {
    errors.push({ levelId, errorType: 'SCHEMA_CAGE', message: 'Feld "cages" fehlt oder ist kein Array' });
  }
  if (!validateBoardShape(lvl.initialValues)) {
    errors.push({ levelId, errorType: 'SCHEMA_BOARD_SHAPE', message: '"initialValues" ist keine 9x9-Integer-Matrix' });
  }
  if (!validateBoardShape(lvl.solution)) {
    errors.push({ levelId, errorType: 'SCHEMA_BOARD_SHAPE', message: '"solution" ist keine 9x9-Integer-Matrix' });
  }
  // Frühausstieg wenn Struktur schon kaputt ist.
  if (errors.length > 0) {
    return { levelId, valid: false, errors };
  }

  const cages = lvl.cages as Cage[];
  const initialValues = lvl.initialValues as number[][];
  const solution = lvl.solution as number[][];

  // 1. Käfige einzeln
  for (const cage of cages) {
    if (typeof cage.id !== 'string' || cage.id.length === 0) {
      errors.push({ levelId, errorType: 'SCHEMA_CAGE', message: 'Käfig ohne gültige "id"', details: cage });
    }
    if (!Array.isArray(cage.cells) || cage.cells.length === 0) {
      errors.push({ levelId, errorType: 'SCHEMA_CAGE', message: `Käfig ${cage.id}: "cells" fehlt/leer`, details: cage });
      continue;
    }
    if (cage.cells.length > BOARD_SIZE) {
      errors.push({ levelId, errorType: 'CAGE_TOO_LARGE', message: `Käfig ${cage.id} hat ${cage.cells.length} Zellen (max ${BOARD_SIZE})`, details: cage });
    }
    const seenInCage = new Set<string>();
    for (const cell of cage.cells) {
      if (!isCellPosition(cell)) {
        errors.push({ levelId, errorType: 'SCHEMA_CAGE', message: `Käfig ${cage.id}: ungültige Zelle ${JSON.stringify(cell)}`, details: cage });
        continue;
      }
      const key = `${cell.row},${cell.col}`;
      if (seenInCage.has(key)) {
        errors.push({ levelId, errorType: 'DUPLICATE_CELL_IN_CAGE', message: `Käfig ${cage.id} enthält Zelle (${cell.row},${cell.col}) doppelt`, details: cage });
      }
      seenInCage.add(key);
    }
    if (!isValidColor(cage.color)) {
      errors.push({ levelId, errorType: 'INVALID_CAGE_COLOR', message: `Käfig ${cage.id}: ungültige Farbe "${cage.color}"`, details: { validColors: CAGE_COLORS } });
    }
    if (typeof cage.sum !== 'number' || !Number.isInteger(cage.sum)) {
      errors.push({ levelId, errorType: 'SCHEMA_CAGE', message: `Käfig ${cage.id}: "sum" fehlt oder ist kein Integer`, details: cage });
    } else {
      const allowed = getPossibleSums(cage.cells.length);
      if (!allowed.has(cage.sum)) {
        errors.push({ levelId, errorType: 'INVALID_CAGE_SUM', message: `Käfig ${cage.id}: Summe ${cage.sum} unmöglich für ${cage.cells.length} Zellen`, details: { allowed: [...allowed].sort((a,b)=>a-b) } });
      }
    }
  }

  // 1.5 Käfig-Duplikate in der Lösung
  for (const cage of cages) {
    const values = cage.cells.map(c => solution[c.row][c.col]);
    if (new Set(values).size !== values.length) {
      errors.push({ levelId, errorType: 'DUPLICATE_VALUES_IN_CAGE', message: `Käfig ${cage.id}: Werte ${JSON.stringify(values)} enthalten Duplikate`, details: { cageId: cage.id, values } });
    }
  }

  // 1.6 Käfig-Summen müssen mit der gespeicherten Lösung übereinstimmen
  for (const cage of cages) {
    const sum = cage.cells.reduce((s, c) => s + solution[c.row][c.col], 0);
    if (sum !== cage.sum) {
      errors.push({ levelId, errorType: 'CAGE_SUM_SOLUTION_MISMATCH', message: `Käfig ${cage.id}: Summe ${cage.sum} widerspricht Lösung (${sum})`, details: { cageId: cage.id, expected: cage.sum, actual: sum } });
    }
  }

  // 2. Käfig-Überlappung & Coverage
  const cellMap = new Map<string, string>();
  const overlapping: Array<{ row: number; col: number; cageIds: string[] }> = [];
  for (const cage of cages) {
    for (const cell of cage.cells) {
      if (!isCellPosition(cell)) continue;
      const key = `${cell.row},${cell.col}`;
      const prev = cellMap.get(key);
      if (prev) {
        overlapping.push({ row: cell.row, col: cell.col, cageIds: [prev, cage.id] });
      } else {
        cellMap.set(key, cage.id);
      }
    }
  }
  if (overlapping.length > 0) {
    errors.push({ levelId, errorType: 'OVERLAPPING_CAGES', message: `${overlapping.length} Zellen sind in mehreren Käfigen`, details: overlapping.slice(0, 10) });
  }
  const uncovered: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!cellMap.has(`${r},${c}`)) uncovered.push({ row: r, col: c });
    }
  }
  if (uncovered.length > 0) {
    errors.push({ levelId, errorType: 'UNCOVERED_CELLS', message: `${uncovered.length} Zellen sind in keinem Käfig`, details: uncovered });
  }

  // 3. Lösung ist gültiges Sudoku
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (!isValidSudokuSet(solution[r])) {
      errors.push({ levelId, errorType: 'INVALID_SOLUTION', message: `Lösung Zeile ${r} ungültig`, details: solution[r] });
    }
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    const col = solution.map((row) => row[c]);
    if (!isValidSudokuSet(col)) {
      errors.push({ levelId, errorType: 'INVALID_SOLUTION', message: `Lösung Spalte ${c} ungültig`, details: col });
    }
  }
  for (let br = 0; br < BOARD_SIZE; br += 3) {
    for (let bc = 0; bc < BOARD_SIZE; bc += 3) {
      const block: number[] = [];
      for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) block.push(solution[r][c]);
      if (!isValidSudokuSet(block)) {
        errors.push({ levelId, errorType: 'INVALID_SOLUTION', message: `Lösung Block (${br},${bc}) ungültig`, details: block });
      }
    }
  }

  // 4. Initial-Werte konsistent mit Lösung, im Bereich 0..9
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const iv = initialValues[r][c];
      if (iv < 0 || iv > BOARD_SIZE) {
        errors.push({ levelId, errorType: 'SCHEMA_BOARD_VALUES', message: `initialValues[${r}][${c}]=${iv} außerhalb 0..${BOARD_SIZE}` });
      } else if (iv !== 0 && iv !== solution[r][c]) {
        errors.push({ levelId, errorType: 'INITIAL_VALUES_MISMATCH', message: `initialValues[${r}][${c}]=${iv} widerspricht Lösung ${solution[r][c]}` });
      }
    }
  }

  // 5. Vier-Farben-Bedingung für benachbarte Käfige
  const colorConflicts: Array<{ cage1: string; cage2: string; color: CageColor }> = [];
  for (let i = 0; i < cages.length; i++) {
    for (let j = i + 1; j < cages.length; j++) {
      const a = cages[i], b = cages[j];
      if (a.color === b.color && areCagesAdjacent(a, b)) {
        colorConflicts.push({ cage1: a.id, cage2: b.id, color: a.color });
      }
    }
  }
  if (colorConflicts.length > 0) {
    errors.push({ levelId, errorType: 'ADJACENT_SAME_COLOR', message: `${colorConflicts.length} benachbarte Käfig-Paare mit gleicher Farbe`, details: colorConflicts.slice(0, 10) });
  }

  // 6. Eindeutigkeit: Das Rätsel (Käfige + Vorgaben) muss genau eine Lösung
  // haben. Nur prüfen, wenn alles Vorherige sauber ist — der Solver setzt
  // vollständige, überlappungsfreie Käfig-Abdeckung voraus.
  if (errors.length === 0) {
    const n = countSolutions(cages, initialValues, 2);
    if (n === 0) {
      errors.push({ levelId, errorType: 'NO_SOLUTION', message: 'Rätsel hat keine Lösung' });
    } else if (n > 1) {
      errors.push({ levelId, errorType: 'MULTIPLE_SOLUTIONS', message: 'Rätsel hat mehr als eine Lösung — Eindeutigkeit verletzt' });
    }
  }

  return { levelId, valid: errors.length === 0, errors };
}

// ---------- Batch + CLI ----------

export interface ValidationReport {
  timestamp: string;
  totalLevels: number;
  totalErrors: number;
  results: ValidationResult[];
}

/**
 * Liest alle Level_X.json aus einem Verzeichnis und validiert sie.
 * Wenn der Default-`levelsDir` weggelassen wird, wird `${cwd}/public/assets/levels`
 * angenommen (so klappt's sowohl aus dist/utils/ (CRA-Bootstrap) als auch
 * aus dem Projekt-Root (Vite-Build)).
 */
export function validateAllLevels(levelsDir?: string): ValidationReport {
  const dir = levelsDir ?? path.join(process.cwd(), 'public', 'assets', 'levels');
  const files = fs.readdirSync(dir)
    .filter((f) => /^level_\d+\.json$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)![0], 10) - parseInt(b.match(/\d+/)![0], 10));

  const results: ValidationResult[] = [];
  let totalErrors = 0;
  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    let level: unknown;
    try {
      level = JSON.parse(raw);
    } catch (e) {
      results.push({ levelId: file, valid: false, errors: [{ levelId: file, errorType: 'SCHEMA_TOP_LEVEL', message: `JSON-Parse-Fehler: ${(e as Error).message}` }] });
      totalErrors += 1;
      continue;
    }
    const result = validateLevel(level);
    results.push(result);
    totalErrors += result.errors.length;
  }

  return { timestamp: new Date().toISOString(), totalLevels: files.length, totalErrors, results };
}

export function writeValidationReport(report: ValidationReport, logsDir?: string): string {
  const dir = logsDir ?? path.join(process.cwd(), 'logs');
  fs.mkdirSync(dir, { recursive: true });
  const reportPath = path.join(dir, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return reportPath;
}

// CLI-Pfad bewusst nicht implementiert: Validierung läuft über die
// Jest-Suite (levelValidator.test.ts). Wer ein CLI-Tool braucht, kann
// `validateAllLevels()` aus dieser Datei direkt importieren.
