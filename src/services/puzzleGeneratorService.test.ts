// Puzzle-Generator: erzeugt Zufallslevel, die das kanonische Schema
// erfüllen — inklusive Eindeutigkeit (validateLevel prüft via Solver).

import { generateLevel } from './puzzleGeneratorService';
import { validateLevel } from '../utils/levelValidator';

const countGivens = (m: number[][]): number =>
  m.flat().filter((v) => v !== 0).length;

describe('puzzleGeneratorService — generateLevel', () => {
  test.each(['easy', 'medium', 'hard', 'expert'] as const)(
    'erzeugt valides, eindeutig lösbares Level (%s)',
    (difficulty) => {
      const lvl = generateLevel({ difficulty, levelNumber: 101 });
      const r = validateLevel(lvl);
      expect(r.errors).toEqual([]);
      expect(lvl.difficulty).toBe(difficulty);
      expect(lvl.levelNumber).toBe(101);
    }
  );

  test('easy startet mit deutlich mehr Vorgaben als expert', () => {
    const easy = generateLevel({ difficulty: 'easy' });
    const expert = generateLevel({ difficulty: 'expert' });
    expect(countGivens(easy.initialValues)).toBeGreaterThanOrEqual(14);
    expect(countGivens(expert.initialValues)).toBeLessThanOrEqual(6);
  });

  test('zwei Aufrufe erzeugen unterschiedliche Rätsel', () => {
    const a = generateLevel({ difficulty: 'medium' });
    const b = generateLevel({ difficulty: 'medium' });
    expect(a.id).not.toBe(b.id);
    expect(a.solution).not.toEqual(b.solution);
  });
});
