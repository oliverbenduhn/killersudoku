// Level-Validator als Jest-Suite.
// Wird via `npm test src/utils/levelValidator.test.ts` (oder im vollen Suite)
// ausgeführt. Liest alle public/assets/levels/level_*.json und prüft
// gegen das kanonische Schema.

import * as fs from 'fs';
import * as path from 'path';
import { validateLevel, validateAllLevels } from './levelValidator';

const LEVELS_DIR = path.join(__dirname, '..', '..', 'public', 'assets', 'levels');

// Baut ein deterministisches gültiges 9x9-Sudoku. Wird für Test-Fixtures
// genutzt, damit die synthetischen Tests nicht von einer handgemalten
// Lösung abhängen.
function makeBaseSudoku(): number[][] {
  // Kanonische Vorlage: jede Zeile = 1..9.
  return [
    [1,2,3,4,5,6,7,8,9],
    [4,5,6,7,8,9,1,2,3],
    [7,8,9,1,2,3,4,5,6],
    [2,3,4,5,6,7,8,9,1],
    [5,6,7,8,9,1,2,3,4],
    [8,9,1,2,3,4,5,6,7],
    [3,4,5,6,7,8,9,1,2],
    [6,7,8,9,1,2,3,4,5],
    [9,1,2,3,4,5,6,7,8],
  ];
}

describe('levelValidator — kanonisches Schema', () => {
  describe('Synthetische Edge-Cases', () => {
    test('akzeptiert leeres Minimum-Level (alle Einzel-Käfige, gültige Lösung)', () => {
      const solution = makeBaseSudoku();
      // Vier-Farben-Palette zyklisch über Zellen — keine benachbarten Konflikte.
      const palette = ['blue.100', 'green.100', 'pink.100', 'yellow.100'] as const;
      const cages = solution.flatMap((row, r) => row.map((_, c) => ({
        id: `c-${r}-${c}`,
        cells: [{ row: r, col: c }],
        sum: solution[r][c],
        color: palette[(r + c) % 4],
      })));
      const valid = {
        id: 'test-min',
        levelNumber: 1,
        cages,
        initialValues: solution.map((row) => row.map((v) => (v === 1 ? 1 : 0))),
        solution
      };
      const r = validateLevel(valid);
      expect(r.errors).toEqual([]);
      expect(r.valid).toBe(true);
    });

    test('lehnt Käfig mit unmöglicher Summe ab', () => {
      const solution = makeBaseSudoku();
      const broken = {
        id: 'broken-sum',
        levelNumber: 1,
        cages: [{ id: 'c1', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], sum: 99, color: 'blue.100' as const }],
        initialValues: solution.map((row) => [...row]),
        solution
      };
      const r = validateLevel(broken);
      expect(r.valid).toBe(false);
      expect(r.errors.map(e => e.errorType)).toContain('INVALID_CAGE_SUM');
    });

    test('lehnt Käfig-Summe ab, die der gespeicherten Lösung widerspricht', () => {
      const solution = makeBaseSudoku();
      const palette = ['blue.100', 'green.100', 'pink.100', 'yellow.100'] as const;
      // Einzel-Käfige überall, außer (0,0)+(0,1) als Zweier-Käfig mit
      // möglicher, aber zur Lösung (1+2=3) widersprüchlicher Summe 4.
      const cages = solution.flatMap((row, r) => row.map((_, c) => ({
        id: `c-${r}-${c}`,
        cells: [{ row: r, col: c }],
        sum: solution[r][c],
        color: palette[(r + c) % 4],
      }))).filter((cage) => cage.id !== 'c-0-0' && cage.id !== 'c-0-1');
      cages.push({
        id: 'c-wrong-sum',
        cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
        sum: 4,
        color: 'blue.100',
      });
      const broken = {
        id: 'sum-vs-solution',
        levelNumber: 1,
        cages,
        initialValues: solution.map((row) => [...row]),
        solution
      };
      const r = validateLevel(broken);
      expect(r.valid).toBe(false);
      expect(r.errors.map(e => e.errorType)).toContain('CAGE_SUM_SOLUTION_MISMATCH');
    });

    test('lehnt Level mit mehreren Lösungen ab (MULTIPLE_SOLUTIONS)', () => {
      const solution = makeBaseSudoku();
      const palette = ['blue.100', 'green.100', 'pink.100', 'yellow.100'] as const;
      // Jede Zeile als 9er-Käfig mit Summe 45: strukturell valide, aber
      // hochgradig mehrdeutig (jede gültige Sudoku-Lösung passt).
      const cages = solution.map((_, r) => ({
        id: `row-${r}`,
        cells: Array.from({ length: 9 }, (_, c) => ({ row: r, col: c })),
        sum: 45,
        color: palette[r % 4],
      }));
      const ambiguous = {
        id: 'ambiguous',
        levelNumber: 1,
        cages,
        initialValues: solution.map((row) => row.map(() => 0)),
        solution
      };
      const r = validateLevel(ambiguous);
      expect(r.valid).toBe(false);
      expect(r.errors.map(e => e.errorType)).toContain('MULTIPLE_SOLUTIONS');
    });

    test('lehnt Käfig-Farbe außerhalb der Vier-Farben-Palette ab', () => {
      const solution = makeBaseSudoku();
      const broken = {
        id: 'bad-color',
        levelNumber: 1,
        cages: [{ id: 'c1', cells: [{ row: 0, col: 0 }], sum: 1, color: 'magenta.500' }],
        initialValues: solution.map((row) => [...row]),
        solution
      };
      const r = validateLevel(broken);
      expect(r.valid).toBe(false);
      expect(r.errors.map(e => e.errorType)).toContain('INVALID_CAGE_COLOR');
    });
  });

  describe('Echte Level-Dateien (public/assets/levels/)', () => {
    let report: ReturnType<typeof validateAllLevels>;

    beforeAll(() => {
      if (!fs.existsSync(LEVELS_DIR)) {
        // Im CI ohne public-Assets: skip, kein Fail.
        report = { timestamp: '', totalLevels: 0, totalErrors: 0, results: [] };
        return;
      }
      report = validateAllLevels(LEVELS_DIR);
    });

    test('es existieren genau 100 Level-Dateien (1..100)', () => {
      const files = fs.readdirSync(LEVELS_DIR).filter(f => /^level_\d+\.json$/.test(f));
      expect(files.length).toBe(100);
    });

    test('alle 100 Level validieren gegen das kanonische Schema', () => {
      const failTypes = new Map<string, number>();
      for (const r of report.results) {
        if (!r.valid) {
          for (const e of r.errors) {
            failTypes.set(e.errorType, (failTypes.get(e.errorType) ?? 0) + 1);
          }
        }
      }
      if (failTypes.size > 0) {
        const summary = [...failTypes.entries()].map(([t, n]) => `${t}=${n}`).join(', ');
        throw new Error(`Level-Validierung fehlgeschlagen: ${summary}\nDetails in logs/validation-report.json`);
      }
      expect(report.totalErrors).toBe(0);
    });
  });
});
