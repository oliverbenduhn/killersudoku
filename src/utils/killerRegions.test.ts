import { Cage } from '../types/gameTypes';
import {
  find45Deductions,
  getMultiple45Regions,
  splitCagesByRegion,
} from './killerRegions';

const emptyBoard = (): number[][] => Array.from({ length: 9 }, () => Array(9).fill(0));
const cage = (id: string, cells: Cage['cells'], sum: number): Cage => ({
  id, cells, sum, color: 'blue.100',
});

describe('killerRegions', () => {
  test('enthält einzelne Häuser sowie Multiple-45-Regionen', () => {
    const regions = getMultiple45Regions();
    expect(regions.some((region) => region.label === 'Box 1' && region.houseCount === 1)).toBe(true);
    expect(regions.some((region) => region.label === 'Zeilen 1–2' && region.targetSum === 90)).toBe(true);
  });

  test('findet den Innie aus einem fast vollständig abgedeckten Haus', () => {
    const cages = [
      cage('a', [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }], 20),
      cage('b', [{ row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 0 }, { row: 2, col: 1 }], 17),
      cage('c', [{ row: 2, col: 2 }, { row: 2, col: 3 }], 12),
    ];

    expect(find45Deductions(emptyBoard(), cages)).toContainEqual(expect.objectContaining({
      kind: 'innie', cell: { row: 2, col: 2 }, value: 8,
    }));
  });

  test('splittet einen regionsübergreifenden Käfig in Innen- und Außenzellen', () => {
    const region = getMultiple45Regions().find((candidate) => candidate.label === 'Box 1')!;
    const crossing = cage('crossing', [{ row: 2, col: 2 }, { row: 2, col: 3 }], 12);

    expect(splitCagesByRegion(region, [crossing])).toEqual([{
      cageId: 'crossing',
      cageSum: 12,
      inside: [{ row: 2, col: 2 }],
      outside: [{ row: 2, col: 3 }],
    }]);
  });
});
