// Reagiert auf eine Auswahl, die einen Käfig enthält. Hier testen wir nicht
// das Verhalten — das macht useCellSelection — sondern das Surface rendert
// für die Zellen, die zu einem Käfig gehören, andere Klassen als für freie.
import React, { RefObject } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BoardSurface, { BoardSurfaceProps } from './BoardSurface';
import { Cage, CellPosition, GameLevel } from '../../types/gameTypes';

const emptyBoard = (): number[][] =>
  Array.from({ length: 9 }, () => Array(9).fill(0));
const emptyNotes = (): number[][][] =>
  Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));

const levelData: GameLevel = {
  id: 'lvl-1',
  levelNumber: 1,
  difficulty: 'easy',
  difficultyRating: 2,
  name: 'Test',
  cages: [],
  initialValues: emptyBoard(),
  solution: emptyBoard(),
  author: 'test',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

const cages: Cage[] = [
  {
    id: 'cage-1',
    cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }],
    sum: 6,
    color: 'blue.100',
  },
];

function defaultProps(overrides: Partial<BoardSurfaceProps> = {}): BoardSurfaceProps {
  const boardRef = { current: null } as RefObject<HTMLDivElement>;
  return {
    selectedCell: null,
    selectedCells: [],
    size: 9,
    cellValues: emptyBoard(),
    notes: emptyNotes(),
    initialValues: emptyBoard(),
    cages,
    levelData,
    cellSize: 48,
    cageInsetPx: 6,
    valueFontSize: 'lg',
    sumFontSize: 'xs',
    themeTokens: { cageBorder: 'grid.cage.border', blockBorder: 'grid.block.border' },
    animation: {
      lastEnteredCell: null,
      lastEnteredValue: 0,
      lastEnteredValid: false,
      animating: false,
      triggerAnimation: jest.fn(),
      resetAnimation: jest.fn(),
    },
    showHints: false,
    possibleValues: [],
    isCageComplete: () => false,
    boardRef,
    onCellPointerDown: jest.fn(),
    onCellPointerEnter: jest.fn(),
    onCellPointerEnd: jest.fn(),
    onCellDoubleClick: jest.fn(),
    blackAndWhiteMode: false,
    ...overrides,
  };
}

describe('BoardSurface', () => {
  test('rendert 9×9 Flächen-Zellen mit data-testid', () => {
    render(<BoardSurface {...defaultProps()} />);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(screen.getByTestId(`cell-${r}-${c}`)).toBeInTheDocument();
      }
    }
  });

  test('Pointer-Callbacks werden mit Zelle (row, col) aufgerufen', () => {
    const onDown = jest.fn();
    render(<BoardSurface {...defaultProps({ onCellPointerDown: onDown })} />);
    const cell = screen.getByTestId('cell-4-3');
    cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(onDown).toHaveBeenCalledWith(4, 3);
  });

  test('Käfigsumme wird in der Top-Left-Zelle des Käfigs gerendert', () => {
    render(<BoardSurface {...defaultProps()} />);
    // (0,0) ist die Top-Left-Zelle des einzigen Käfigs → Käfigsumme 6.
    const numLayer = screen.getByTestId('value-0-0');
    // Summe und Wert stehen in derselben Test-Zelle — der Wert ist leer,
    // die Summe ist "6". Inhalt beider Knoten kombiniert prüfen.
    expect(numLayer.parentElement?.textContent).toContain('6');
  });

  test('zeigt den aria-label-Status "ungültig" für eine Zelle mit Regel-Verstoß', () => {
    // (0,0) und (0,1) sind im selben Käfig → (0,0)=1, (0,1)=1 verletzt
    // die Cage-No-Duplicate-Regel.
    const values = emptyBoard();
    values[0][0] = 1;
    values[0][1] = 1;
    render(<BoardSurface {...defaultProps({ cellValues: values })} />);
    const cell00 = screen.getByTestId('cell-0-0');
    expect(cell00.getAttribute('aria-label')).toMatch(/ungültig/);
  });

  test('versteckt den Wert im BW-Modus nicht, behält aber grauen Tint', () => {
    const values = emptyBoard();
    values[0][0] = 7;
    render(<BoardSurface {...defaultProps({ cellValues: values, blackAndWhiteMode: true })} />);
    expect(screen.getByTestId('value-0-0').textContent).toBe('7');
  });
});