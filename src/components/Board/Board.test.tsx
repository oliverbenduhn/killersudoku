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
      cellValues: Array(9).fill(Array(9).fill(0)),
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
    initialValues: Array(9).fill(Array(9).fill(0)),
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

  test('selects cell on click', () => {
    render(<Board levelData={mockLevelData} />);
    const cell = screen.getByTestId('cell-0-0');
    fireEvent.click(cell);
    expect(cell).toHaveStyle({ border: '3px solid black' });
  });

  test('highlights invalid entries correctly', () => {
    (GameLogic.isCellValid as jest.Mock).mockReturnValue(false);
    render(<Board levelData={mockLevelData} />);
    const cell = screen.getByTestId('cell-0-0');
    fireEvent.click(cell);
    fireEvent.keyDown(document, { key: '1' });
    expect(cell).toHaveStyle({ backgroundColor: 'var(--chakra-colors-red-50)' });
  });

  test('shows possible values when F5 is pressed', () => {
    (GameLogic.getPossibleValues as jest.Mock).mockReturnValue([1, 2, 3]);
    render(<Board levelData={mockLevelData} />);
    const cell = screen.getByTestId('cell-0-0');
    fireEvent.click(cell);
    fireEvent.keyDown(window, { key: 'F5' });
    const hints = screen.getAllByText(/[1-3]/);
    expect(hints).toHaveLength(3);
    expect(hints[0]).toHaveTextContent('1');
    expect(hints[1]).toHaveTextContent('2');
    expect(hints[2]).toHaveTextContent('3');
  });

  test('does not show hints when no cell is selected', () => {
    render(<Board levelData={mockLevelData} />);
    fireEvent.keyDown(window, { key: 'F5' });
    const hints = screen.queryAllByText(/[1-9]/);
    expect(hints).toHaveLength(0);
  });

  test('updates hints when cell selection changes', () => {
    (GameLogic.getPossibleValues as jest.Mock)
      .mockReturnValueOnce([1, 2])
      .mockReturnValueOnce([3, 4]);
    
    render(<Board levelData={mockLevelData} />);
    
    const cell1 = screen.getByTestId('cell-0-0');
    fireEvent.click(cell1);
    fireEvent.keyDown(window, { key: 'F5' });
    expect(screen.getAllByText(/[1-2]/)).toHaveLength(2);
    
    const cell2 = screen.getByTestId('cell-0-1');
    fireEvent.click(cell2);
    expect(screen.getAllByText(/[3-4]/)).toHaveLength(2);
  });
});
