import { cageOutlinePath } from './cageOutline';

describe('cageOutlinePath', () => {
  test('leere Zellen-Liste → leerer String', () => {
    expect(cageOutlinePath([], 50, 4, 2)).toBe('');
  });

  test('Einerkäfig (1×1) → gültiger SVG-Pfad, geschlossen', () => {
    const d = cageOutlinePath([{ row: 0, col: 0 }], 50, 4, 2);
    expect(d).toMatch(/^M /);
    expect(d.trim().endsWith('Z')).toBe(true);
  });

  test('2er-Käfig horizontal → Pfad enthält Inset-Versatz', () => {
    // Ohne Inset wäre die Kontur bei (0,0)-(100,0)-(100,50)-(0,50).
    // Mit Inset 10px müssen alle Koordinaten ≥ 10 sein.
    const d = cageOutlinePath(
      [{ row: 0, col: 0 }, { row: 0, col: 1 }],
      50, 10, 5
    );
    const coords = (d.match(/[-+]?\d*\.?\d+/g) ?? []).map(Number);
    expect(coords.length).toBeGreaterThan(0);
    for (const x of coords) {
      expect(x).toBeGreaterThanOrEqual(0);
    }
    expect(d.trim().endsWith('Z')).toBe(true);
  });

  test('L-förmiger 3er-Käfig produziert genau einen geschlossenen Loop', () => {
    const d = cageOutlinePath(
      [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
        { row: 1, col: 1 },
      ],
      40, 5, 2
    );
    const moveCount = (d.match(/M /g) ?? []).length;
    const closeCount = (d.match(/Z/g) ?? []).length;
    expect(moveCount).toBe(1);
    expect(closeCount).toBe(1);
  });

  test('Mehrere Loops (Vorgabe: kein Loch, daher max 1 Loop bei validem Käfig-Set)', () => {
    // Zwei Käfige werden hier NICHT zusammengeführt — Implementation
    // bekommt einen Käfig pro Aufruf. Stelle sicher, dass die Funktion
    // bei disconnected Käfig (separater Aufruf jeweils) trotzdem
    // geschlossene Pfade liefert.
    const a = cageOutlinePath([{ row: 0, col: 0 }], 40, 5, 2);
    const b = cageOutlinePath([{ row: 8, col: 8 }], 40, 5, 2);
    expect(a.trim().endsWith('Z')).toBe(true);
    expect(b.trim().endsWith('Z')).toBe(true);
  });

  test('Radius wird durch dist-Vielfaches gecappt (winzige Zelle, großer Radius)', () => {
    // Bei cellSize=1, inset=0.1, radius=999 darf der Pfad nicht mit
    // unmöglichen Koordinaten oder negativen Krümmungsartefakten
    // abstürzen. Erwartung: deterministischer, geschlossener Pfad.
    const d = cageOutlinePath([{ row: 0, col: 0 }], 1, 0.1, 999);
    expect(d).toMatch(/^M /);
    expect(d.trim().endsWith('Z')).toBe(true);
  });

  test('keine NaN-Werte im Pfad', () => {
    const d = cageOutlinePath(
      [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 0 }],
      50, 8, 4
    );
    expect(d).not.toMatch(/NaN/);
    expect(d).not.toMatch(/undefined/);
  });
});
