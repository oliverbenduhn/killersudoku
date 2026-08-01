import { cageOfCell, cageOfCellIn, buildCageIndex } from './board';
import { Cage } from '../types/gameTypes';

const cage = (id: string, cells: { row: number; col: number }[]): Cage => ({
  id,
  cells,
  sum: 0,
  color: 'blue.100',
});

describe('board.ts — Cell→Cage-Lookup', () => {
  const cages = [
    cage('a', [{ row: 0, col: 0 }, { row: 0, col: 1 }]),
    cage('b', [{ row: 2, col: 2 }, { row: 2, col: 3 }]),
  ];

  test('cageOfCell findet eine Zelle, die zu einem Käfig gehört', () => {
    expect(cageOfCell(cages, 0, 0)?.id).toBe('a');
    expect(cageOfCell(cages, { row: 2, col: 3 })?.id).toBe('b');
  });

  test('cageOfCell liefert undefined für Zellen ohne Käfig', () => {
    expect(cageOfCell(cages, 5, 5)).toBeUndefined();
  });

  test('buildCageIndex baut eine konsistente Lookup-Tabelle', () => {
    const index = buildCageIndex(cages);
    expect(cageOfCellIn(index, 0, 1)?.id).toBe('a');
    expect(cageOfCellIn(index, { row: 2, col: 2 })?.id).toBe('b');
    expect(cageOfCellIn(index, 5, 5)).toBeUndefined();
  });

  test('cageOfCell und cageOfCellIn liefern dasselbe Ergebnis', () => {
    const index = buildCageIndex(cages);
    for (const c of cages.flatMap((cageItem) => cageItem.cells)) {
      expect(cageOfCellIn(index, c.row, c.col)).toBe(cageOfCell(cages, c));
    }
  });
});