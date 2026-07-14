import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { render } from '../../test-utils';
import { Board } from './Board';
import * as GameLogic from '../../services/gameLogicService';

// Mock useGameState
jest.mock('../../hooks/useGameState', () => ({
  __esModule__: true,
  default: () => ({
    gameState: {
      cellValues: Array.from({ length: 9 }, () => Array(9).fill(0)),
      id: 'test-game',
      levelId: 'test-level',
      mistakesUsed: 0,
      hintsUsed: 0,
      gameOver: false,
      solved: false
    },
    isLoading: false,
    updateGameState: jest.fn().mockResolvedValue(undefined)
  })
}));

// Mock der neuen Hooks, damit das Test-Setup deterministisch ist
jest.mock('../../hooks/useCellSelection', () => {
  const actual = jest.requireActual('../../hooks/useCellSelection');
  return {
    __esModule: true,
    default: () => {
      const hook = actual.default([]);
      return { ...hook };
    }
  };
});

jest.mock('../../hooks/useBoardResize', () => ({
  __esModule: true,
  default: () => ({ cellSize: 50 })
}));

jest.mock('../../hooks/useCellAnimation', () => ({
  __esModule: true,
  default: () => ({
    lastEnteredCell: null,
    lastEnteredValue: 0,
    lastEnteredValid: true,
    animating: false,
    triggerAnimation: jest.fn(),
    resetAnimation: jest.fn()
  })
}));

jest.mock('../../hooks/useHints', () => ({
  __esModule: true,
  default: () => ({
    showHints: false,
    possibleValues: [],
    toggleHints: jest.fn(),
    refreshHints: jest.fn()
  })
}));

jest.mock('../../hooks/useBoardGameLogic', () => ({
  __esModule: true,
  default: () => ({
    handleNumberSelect: jest.fn(),
    handleClear: jest.fn(),
    handleReset: jest.fn(),
    handleRevealHint: jest.fn(),
    isCageComplete: () => false,
    isBoardComplete: () => false
  }),
  recordBoardSolved: jest.fn().mockResolvedValue(0)
}));

jest.mock('../../services/gameLogicService', () => ({
  ...jest.requireActual('../../services/gameLogicService'),
  isCellValid: jest.fn(),
  getPossibleValues: jest.fn()
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
    (GameLogic.isCellValid as jest.Mock).mockReturnValue(true);
  });

  test('rendert ohne Crash', () => {
    render(<Board levelData={mockLevelData} />);
    expect(screen.getByTestId('cell-0-0')).toBeInTheDocument();
  });

  test('mousedown auf Zelle startet Drag-Select', () => {
    render(<Board levelData={mockLevelData} />);
    const cell = screen.getByTestId('cell-0-0');
    fireEvent.mouseDown(cell);
    expect(cell).toHaveAttribute('aria-selected', 'true');
  });

  test('zeigt Fehler-Alert bei externalError', () => {
    render(<Board levelData={mockLevelData} error="Level kaputt" />);
    expect(screen.getByText('Fehler beim Laden des Levels')).toBeInTheDocument();
  });

  test('zeigt Spinner während Loading', () => {
    // Loading-Spinner anzeigen: isLoading=true, kein levelData
    const { container } = render(<Board levelData={null} isLoading={true} />);
    expect(container.querySelector('.chakra-spinner')).toBeTruthy();
  });

  test('Zellen haben ARIA-Labels', () => {
    render(<Board levelData={mockLevelData} />);
    const cell = screen.getByTestId('cell-0-0');
    expect(cell).toHaveAttribute('aria-label');
    expect(cell.getAttribute('aria-label')).toContain('Zeile 1 Spalte 1');
  });
});