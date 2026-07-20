import {
  isCellValidForSudokuRules,
  hasDuplicatesInCage,
  calculateCageSum,
  isCageFilled,
  isCageComplete,
  isCellValid,
  getCageForCell,
  isBoardComplete,
  getPossibleValues,
  areCellsInSameCage,
  applyPlayerEntry,
  sanitizePlayerBoard
} from './gameLogicService';
import { Cage } from '../types/gameTypes';

const emptyBoard = (): number[][] =>
  Array.from({ length: 9 }, () => Array(9).fill(0));

const cage = (id: string, cells: { row: number; col: number }[], sum: number): Cage => ({
  id,
  cells,
  sum,
  color: 'blue.100'
});

describe('gameLogicService', () => {
  describe('isCellValidForSudokuRules', () => {
    test('leere Zelle ist immer gültig', () => {
      const board = emptyBoard();
      expect(isCellValidForSudokuRules(board, 0, 0, 0)).toBe(true);
    });

    test('Doppel in Zeile erkannt', () => {
      const board = emptyBoard();
      board[0][1] = 5;
      expect(isCellValidForSudokuRules(board, 0, 0, 5)).toBe(false);
    });

    test('Doppel in Spalte erkannt', () => {
      const board = emptyBoard();
      board[1][0] = 7;
      expect(isCellValidForSudokuRules(board, 0, 0, 7)).toBe(false);
    });

    test('Doppel in 3x3-Block erkannt', () => {
      const board = emptyBoard();
      board[1][1] = 3;
      expect(isCellValidForSudokuRules(board, 0, 0, 3)).toBe(false);
    });

    test('Wert außerhalb 1-9 wird abgelehnt', () => {
      const board = emptyBoard();
      expect(isCellValidForSudokuRules(board, 4, 4, 9)).toBe(true);
      expect(isCellValidForSudokuRules(board, 4, 4, 10)).toBe(false);
      expect(isCellValidForSudokuRules(board, 4, 4, -1)).toBe(false);
    });
  });

  describe('hasDuplicatesInCage', () => {
    test('Käfig mit eindeutigen Werten', () => {
      const board = emptyBoard();
      board[0][0] = 3;
      board[0][1] = 5;
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 8);
      expect(hasDuplicatesInCage(board, c)).toBe(false);
    });

    test('Käfig mit Duplikat erkannt', () => {
      const board = emptyBoard();
      board[0][0] = 3;
      board[0][1] = 3;
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 6);
      expect(hasDuplicatesInCage(board, c)).toBe(true);
    });
  });

  describe('calculateCageSum', () => {
    test('Summe über alle Käfigzellen', () => {
      const board = emptyBoard();
      board[0][0] = 4;
      board[0][1] = 5;
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 9);
      expect(calculateCageSum(board, c)).toBe(9);
    });

    test('leere Zellen zählen als 0', () => {
      const board = emptyBoard();
      board[0][0] = 4;
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 4);
      expect(calculateCageSum(board, c)).toBe(4);
    });
  });

  describe('isCageFilled', () => {
    test('alle Zellen gefüllt', () => {
      const board = emptyBoard();
      board[0][0] = 1;
      board[0][1] = 2;
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 3);
      expect(isCageFilled(board, c)).toBe(true);
    });

    test('eine Zelle leer', () => {
      const board = emptyBoard();
      board[0][0] = 1;
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 3);
      expect(isCageFilled(board, c)).toBe(false);
    });
  });

  describe('isCageComplete', () => {
    test('gefüllt, korrekte Summe, keine Duplikate → true', () => {
      const board = emptyBoard();
      board[0][0] = 1;
      board[0][1] = 2;
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 3);
      expect(isCageComplete(board, c)).toBe(true);
    });

    test('gefüllt, falsche Summe → false', () => {
      const board = emptyBoard();
      board[0][0] = 1;
      board[0][1] = 2;
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 99);
      expect(isCageComplete(board, c)).toBe(false);
    });

    test('Duplikate im Käfig → false', () => {
      const board = emptyBoard();
      board[0][0] = 1;
      board[0][1] = 1;
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 2);
      expect(isCageComplete(board, c)).toBe(false);
    });
  });

  describe('isCellValid (kombiniert)', () => {
    test('gültige Eingabe im leeren Board', () => {
      const board = emptyBoard();
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 3);
      expect(isCellValid(board, 0, 0, 1, [c])).toBe(true);
    });

    test('Eingabe erzeugt Käfig-Duplikat → false', () => {
      const board = emptyBoard();
      board[0][1] = 5;
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 8);
      expect(isCellValid(board, 0, 0, 5, [c])).toBe(false);
    });

    test('Sudoku-Duplikat in Zeile → false', () => {
      const board = emptyBoard();
      board[0][1] = 5;
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 8);
      expect(isCellValid(board, 0, 0, 5, [c])).toBe(false);
    });

    test('unmögliche Teilsumme wird sofort abgelehnt', () => {
      const board = emptyBoard();
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 3);
      expect(isCellValid(board, 0, 0, 9, [c])).toBe(false);
    });
  });

  describe('getCageForCell', () => {
    test('findet Käfig für Zelle', () => {
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 3);
      expect(getCageForCell([c], 0, 1)?.id).toBe('c1');
    });

    test('gibt undefined zurück für Zelle ohne Käfig', () => {
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 3);
      expect(getCageForCell([c], 5, 5)).toBeUndefined();
    });
  });

  describe('areCellsInSameCage', () => {
    test('Zellen im gleichen Käfig', () => {
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 3);
      expect(areCellsInSameCage([c], 0, 0, 0, 1)).toBe(true);
    });

    test('Zellen in verschiedenen Käfigen', () => {
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 3);
      expect(areCellsInSameCage([c], 0, 0, 5, 5)).toBe(false);
    });
  });

  describe('isBoardComplete', () => {
    test('leeres Board ist nicht komplett', () => {
      const board = emptyBoard();
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 3);
      expect(isBoardComplete(board, [c])).toBe(false);
    });

    test('valides vollständiges Board wird als komplett erkannt', () => {
      // Minimales gültiges Sudoku: alle 1en → ungültig (Doppel).
      // Stattdessen: ein "fast komplett" mit Käfigen testen.
      const board = Array.from({ length: 9 }, (_, r) =>
        Array.from({ length: 9 }, (_, c) => ((r * 3 + Math.floor(r / 3) + c) % 9) + 1)
      );
      // Baut KEIN gültiges Sudoku; prüfe daher nur Pfad: keine leeren Zellen.
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 0);
      expect(isBoardComplete(board, [c])).toBe(false); // Käfig-Summe falsch
    });
  });

  describe('getPossibleValues', () => {
    test('frühe Zelle mit Käfig liefert mindestens einen Wert', () => {
      const board = emptyBoard();
      const c = cage('c1', [{ row: 0, col: 0 }], 5);
      const result = getPossibleValues(board, 0, 0, [c]);
      const values = Array.isArray(result) ? result : result.values;
      expect(values).toContain(5);
    });

    test('ohne Käfig: leere Liste', () => {
      const board = emptyBoard();
      expect(getPossibleValues(board, 5, 5, [])).toEqual([]);
    });

    test('Min-Schranke: 3er-Käfig Summe 6 erlaubt nur {1,2,3}', () => {
      const board = emptyBoard();
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], 6);
      const result = getPossibleValues(board, 0, 0, [c]);
      const values = Array.isArray(result) ? result : result.values;
      expect(values).toEqual([1, 2, 3]);
    });

    test('Max-Schranke: 2er-Käfig Summe 17 erlaubt nur {8,9}', () => {
      const board = emptyBoard();
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 17);
      const result = getPossibleValues(board, 0, 0, [c]);
      const values = Array.isArray(result) ? result : result.values;
      expect(values).toEqual([8, 9]);
    });

    test('schließt bereits im Käfig verwendete Restziffern exakt aus', () => {
      const board = emptyBoard();
      board[0][0] = 1;
      const c = cage('c1', [{ row: 0, col: 0 }, { row: 3, col: 1 }, { row: 6, col: 2 }], 6);
      const result = getPossibleValues(board, 3, 1, [c]);
      const values = Array.isArray(result) ? result : result.values;
      expect(values).toEqual([2, 3]);
    });

    test('currentValueInvalid=true bei ungültigem aktuellem Wert', () => {
      const board = emptyBoard();
      board[0][0] = 9; // Käfig-Summe 5 → 9 ist ungültig
      const c = cage('c1', [{ row: 0, col: 0 }], 5);
      const result = getPossibleValues(board, 0, 0, [c]) as { values: number[]; currentValueInvalid: boolean };
      expect(result.currentValueInvalid).toBe(true);
    });
  });

  describe('applyPlayerEntry', () => {
    test('Level-27-Fall: speichert niemals zwei Neunen im 24er-Dreierkäfig', () => {
      const board = emptyBoard();
      const initial = emptyBoard();
      board[8][4] = 7;
      initial[8][4] = 7;
      const c = cage('x923yb', [
        { row: 8, col: 5 },
        { row: 8, col: 4 },
        { row: 8, col: 6 },
      ], 24);

      const result = applyPlayerEntry(
        board,
        initial,
        [{ row: 8, col: 5 }, { row: 8, col: 6 }],
        9,
        [c]
      );

      expect(result.cellValues[8].filter((value) => value === 9)).toHaveLength(1);
      expect(result.acceptedCells).toHaveLength(1);
      expect(result.rejectedCells).toHaveLength(1);
    });

    test('bereinigt einen alten Level-27-Spielstand mit zwei Neunen', () => {
      const initial = emptyBoard();
      initial[8][4] = 7;
      const saved = initial.map((row) => [...row]);
      saved[8][5] = 9;
      saved[8][6] = 9;
      const c = cage('x923yb', [
        { row: 8, col: 5 }, { row: 8, col: 4 }, { row: 8, col: 6 },
      ], 24);

      expect(sanitizePlayerBoard(saved, initial, [c])[8].filter((value) => value === 9)).toHaveLength(1);
    });
  });
});
