import {
  getCageCombinations,
  getComplementDigits,
  getConsistentDigits,
  passesClockCheck,
} from './killerCombinations';

describe('killerCombinations', () => {
  test('liefert die erzwungenen Extremkombinationen aus dem Leitfaden', () => {
    expect(getCageCombinations(2, 3)).toEqual([[1, 2]]);
    expect(getCageCombinations(2, 4)).toEqual([[1, 3]]);
    expect(getCageCombinations(2, 16)).toEqual([[7, 9]]);
    expect(getCageCombinations(2, 17)).toEqual([[8, 9]]);
    expect(getCageCombinations(3, 24)).toEqual([[7, 8, 9]]);
  });

  test('ermittelt Consistent Numbers als Schnittmenge aller Kombinationen', () => {
    expect(getCageCombinations(4, 13)).toEqual([
      [1, 2, 3, 7],
      [1, 2, 4, 6],
      [1, 3, 4, 5],
    ]);
    expect(getConsistentDigits(4, 13)).toEqual([1]);
  });

  test('berechnet große Käfige über das Ziffernkomplement', () => {
    expect(getComplementDigits(7, 41)).toEqual([[1, 3]]);
  });

  test('Clock Arithmetic verwirft nur unmögliche Endziffern', () => {
    expect(passesClockCheck(3, 24)).toBe(true);
    expect(passesClockCheck(3, 23)).toBe(true);
    expect(passesClockCheck(3, 3)).toBe(false);
  });
});
