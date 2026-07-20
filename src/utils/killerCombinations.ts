import { BOARD_SIZE } from '../types/gameTypes';

export type DigitCombination = readonly number[];

const combinationsByKey = new Map<string, DigitCombination[]>();
const residuesBySize = new Map<number, Set<number>>();
const existenceMemo = new Map<string, boolean>();

function key(size: number, sum: number): string {
  return `${size}:${sum}`;
}

function buildLookupTable(): void {
  combinationsByKey.set(key(0, 0), [Object.freeze([])]);
  const visit = (start: number, digits: number[], sum: number): void => {
    if (digits.length > 0) {
      const tableKey = key(digits.length, sum);
      const combinations = combinationsByKey.get(tableKey) ?? [];
      combinations.push(Object.freeze([...digits]));
      combinationsByKey.set(tableKey, combinations);

      const residues = residuesBySize.get(digits.length) ?? new Set<number>();
      residues.add(sum % 10);
      residuesBySize.set(digits.length, residues);
    }
    if (digits.length === BOARD_SIZE) return;
    for (let digit = start; digit <= BOARD_SIZE; digit++) {
      digits.push(digit);
      visit(digit + 1, digits, sum + digit);
      digits.pop();
    }
  };
  visit(1, [], 0);
}

buildLookupTable();

/** Alle aufsteigend sortierten, wiederholungsfreien Ziffernkombinationen. */
export function getCageCombinations(size: number, sum: number): number[][] {
  if (size > BOARD_SIZE / 2 && size <= BOARD_SIZE) {
    const complements = combinationsByKey.get(key(BOARD_SIZE - size, 45 - sum)) ?? [];
    return complements.map((missing) =>
      Array.from({ length: BOARD_SIZE }, (_, index) => index + 1)
        .filter((digit) => !missing.includes(digit))
    );
  }
  return (combinationsByKey.get(key(size, sum)) ?? []).map((digits) => [...digits]);
}

/** Ziffern, die in jeder möglichen Kombination dieses Käfigs vorkommen. */
export function getConsistentDigits(size: number, sum: number): number[] {
  const combinations = getCageCombinations(size, sum);
  if (combinations.length === 0) return [];
  return combinations[0].filter((digit) =>
    combinations.every((combination) => combination.includes(digit))
  );
}

/** Existiert eine passende Kombination vollständig innerhalb der Bitmaske? */
export function hasCageCombination(size: number, sum: number, availableMask: number): boolean {
  if (!passesClockCheck(size, sum)) return false;
  const memoKey = `${size}:${sum}:${availableMask}`;
  const cached = existenceMemo.get(memoKey);
  if (cached !== undefined) return cached;
  const result = (combinationsByKey.get(key(size, sum)) ?? []).some((combination) =>
    combination.every((digit) => (availableMask & (1 << digit)) !== 0)
  );
  existenceMemo.set(memoKey, result);
  return result;
}

/**
 * Fehlende Ziffern eines großen Käfigs. Wegen Cage-Uniqueness ist jede
 * Käfigkombination eine Teilmenge von 1..9 und ihr Komplement summiert
 * sich zu 45 - cageSum.
 */
export function getComplementDigits(size: number, sum: number): number[][] {
  if (size < 0 || size > BOARD_SIZE) return [];
  return getCageCombinations(BOARD_SIZE - size, 45 - sum);
}

/**
 * Verlustfreier Clock-Arithmetic-Vorfilter. Er betrachtet nur die
 * Endziffer; ein positives Ergebnis ist kein Beweis und muss immer durch
 * die exakte LUT bestätigt werden.
 */
export function passesClockCheck(size: number, sum: number): boolean {
  if (!Number.isInteger(size) || !Number.isInteger(sum) || size < 1 || size > BOARD_SIZE) {
    return false;
  }
  const minimum = (size * (size + 1)) / 2;
  const maximum = (size * (19 - size)) / 2;
  if (sum < minimum || sum > maximum) return false;
  return residuesBySize.get(size)?.has(((sum % 10) + 10) % 10) ?? false;
}
