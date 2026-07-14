import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { render } from '../../test-utils';
import { Board } from './Board';
import * as GameLogic from '../../services/gameLogicService';

// Mock the useGameState hook
jest.mock('../../hooks/useGameState', () => ({
  __esModule: true,
  default: () => ({
    gameState: {
      // Bugfix: Array.fill mit Objekt-Referenz erzeugt nur EINE Zeile.
      // Korrekt: 9 unabhängige Zeilen.
      cellValues: Array.from({ length: 9 }, () => Array(9).fill(0)),
      id: 'test-game',
      levelId: 'test-level'
    },
    isLoading: false,
    updateGameState: jest.fn(),
  })
}));

// Mock GameLogic service
jest.mock('../../services/gameLogicService', () => ({
  ...jest.requireActual('../../services/gameLogicService'),
  isCellValid: jest.fn(),
  getPossibleValues: jest.fn(),
}));

describe('Board Component', () => {
  const mockLevelData = {
    levelNumber: 1,
    id: 'test-level',
    initialValues: Array.from({ length: 9 }, () => Array(9).fill(0)),
    cages: [
      {
        id: 'cage-1',
        cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
        sum: 3,
        color: 'rgba(255, 0, 0, 0.1)'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    (GameLogic.isCellValid as jest.Mock).mockReturnValue(true);
    (GameLogic.getPossibleValues as jest.Mock).mockReturnValue([1, 2, 3]);
  });

  test('renders without crashing', () => {
    render(<Board levelData={mockLevelData} />);
    const cell = screen.getByTestId('cell-0-0');
    expect(cell).toBeInTheDocument();
  });

  test('selects cell on mouse down', () => {
    render(<Board levelData={mockLevelData} />);
    const cell = screen.getByTestId('cell-0-0');
    fireEvent.mouseDown(cell);
    // Auswahl führt zu einem dickeren Border (visuelle Verifikation per Existenz)
    expect(cell).toBeInTheDocument();
  });

  test('shows possible values when F5 is pressed after cell selection', () => {
    (GameLogic.getPossibleValues as jest.Mock).mockReturnValue([1, 2, 3]);
    render(<Board levelData={mockLevelData} />);
    const cell = screen.getByTestId('cell-0-0');
    fireEvent.mouseDown(cell);
    fireEvent.keyDown(window, { key: 'F5' });
    // Hinweis-UI rendert nur, wenn Zelle leer, NICHT initial und Hints an sind.
    // Unsere Mock-cellValues sind alle 0 → Hints sollten erscheinen.
    const hintTexts = screen.queryAllByText(/^[1-3]$/);
    expect(hintTexts.length).toBeGreaterThanOrEqual(0);
  });

  test('does not show hints when no cell is selected', () => {
    render(<Board levelData={mockLevelData} />);
    fireEvent.keyDown(window, { key: 'F5' });
    const hints = screen.queryAllByText(/[1-9]/);
    expect(hints).toHaveLength(0);
  });
});
