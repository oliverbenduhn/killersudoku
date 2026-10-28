import level from '../../public/assets/levels/level_1.json';
import { parseLevel } from './parseLevel';

test('accepts an existing puzzle without mutating the response', () => {
  const original = JSON.stringify(level);
  expect(parseLevel(level, 7).levelNumber).toBe(7);
  expect(JSON.stringify(level)).toBe(original);
});

test.each([null, {}, { ...level, initialValues: [] }, { ...level, cages: [] },
  { ...level, cages: [level.cages[0], level.cages[0]] },
  { ...level, solution: level.solution.map(() => Array(9).fill(1)) }
])('rejects malformed runtime data', value => {
  expect(() => parseLevel(value, 1)).toThrow(/ungültige Daten/);
});
