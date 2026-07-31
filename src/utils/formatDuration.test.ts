import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
  test('0 ms rendert als „0s" (kein Crash, Floor)', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  test('negative Werte werden als 0 behandelt (Defensive)', () => {
    expect(formatDuration(-9999)).toBe('0s');
  });

  test('<1s rendert als „0s"', () => {
    expect(formatDuration(500)).toBe('0s');
  });

  test('42 Sekunden rendert als „42s"', () => {
    expect(formatDuration(42_000)).toBe('42s');
  });

  test('59 Sekunden rendert als „59s"', () => {
    expect(formatDuration(59_999)).toBe('59s');
  });

  test('60 s rendert als „1m 0s"', () => {
    expect(formatDuration(60_000)).toBe('1m 0s');
  });

  test('723 s → „12m 3s"', () => {
    expect(formatDuration(723_000)).toBe('12m 3s');
  });

  test('3599 s → „59m 59s" (kein Stunden-Bruch)', () => {
    expect(formatDuration(3_599_000)).toBe('59m 59s');
  });

  test('3600 s → „1h 0m 0s"', () => {
    expect(formatDuration(3_600_000)).toBe('1h 0m 0s');
  });

  test('5025 s → „1h 23m 45s"', () => {
    expect(formatDuration(5_025_000)).toBe('1h 23m 45s');
  });

  test('sehr große Werte (10h) rendern vollständig', () => {
    expect(formatDuration(36_000_000)).toBe('10h 0m 0s');
  });

  test('Floor statt Round: 999ms ist 0s, nicht 1s', () => {
    expect(formatDuration(999)).toBe('0s');
  });
});
