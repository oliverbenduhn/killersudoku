import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { render } from '../../test-utils';
import { Board } from './Board';
import { GameLevel } from '../../types/gameTypes';
import * as GameLogic from '../../services/gameLogicService';

const mockGameState = {
  cellValues: Array.from({ length: 9 }, () => Array(9).fill(0)),
  id: 'test-game',
  levelId: 'default',
  mistakesUsed: 0,
  hintsUsed: 0,
  gameOver: false,
  solved: false
};
const mockHandleReset = jest.fn();

// Mock useGameState
jest.mock('../../hooks/useGameState', () => ({
  __esModule: true,
  useGameState: () => ({
    gameState: mockGameState,
    isLoading: false,
    updateGameState: jest.fn().mockResolvedValue(undefined),
    applyMove: jest.fn().mockResolvedValue(undefined),
    undo: jest.fn().mockResolvedValue(undefined),
    redo: jest.fn().mockResolvedValue(undefined),
    canUndo: false,
    canRedo: false,
    clearHistory: jest.fn()
  })
}));

// Mock der neuen Hooks, damit das Test-Setup deterministisch ist
jest.mock('../../hooks/useCellSelection', () => {
  const actual = jest.requireActual('../../hooks/useCellSelection');
  return {
    __esModule: true,
    useCellSelection: () => {
      const hook = actual.useCellSelection([]);
      return { ...hook };
    }
  };
});

jest.mock('../../hooks/useBoardResize', () => ({
  __esModule: true,
  useBoardResize: () => ({ cellSize: 50 })
}));

// Mock useBreakpointValue: Standard = column (Mobil, Test-Viewport).
// Tests, die Sidebar-Layout brauchen, rufen `setBreakpointMock` auf.
let breakpointImpl: (values: any) => any = (values: any) => values.base;
jest.mock('@chakra-ui/react', () => {
  const actual = jest.requireActual('@chakra-ui/react');
  return {
    ...actual,
    useBreakpointValue: (values: any) => breakpointImpl(values),
  };
});
const setBreakpointMock = (impl: (values: any) => any) => { breakpointImpl = impl; };
const resetBreakpointMock = () => { breakpointImpl = (values: any) => values.base; };

jest.mock('../../hooks/useCellAnimation', () => ({
  __esModule: true,
  useCellAnimation: () => ({
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
  useHints: () => ({
    showHints: false,
    possibleValues: [],
    toggleHints: jest.fn(),
    refreshHints: jest.fn()
  })
}));

jest.mock('../../hooks/useBoardGameLogic', () => ({
  __esModule: true,
  useBoardGameLogic: () => ({
    handleNumberSelect: jest.fn(),
    handleClear: jest.fn(),
    handleReset: mockHandleReset,
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
  const emptyBoard: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  const mockLevelData: GameLevel = {
    levelNumber: 1,
    id: 'test-level',
    initialValues: emptyBoard,
    solution: emptyBoard.map((row) => [...row]),
    cages: [
      {
        id: 'cage-1',
        cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
        sum: 3,
        color: 'blue.100'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGameState.mistakesUsed = 0;
    mockGameState.gameOver = false;
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

  test('bietet bei Game Over einen aktivierbaren Neustart an', () => {
    mockGameState.mistakesUsed = 3;
    mockGameState.gameOver = true;

    render(<Board levelData={mockLevelData} />);

    expect(screen.getByRole('heading', { name: 'Game Over' })).toBeInTheDocument();
    const restartButton = screen.getByRole('button', { name: 'Neu starten' });
    expect(restartButton).toBeEnabled();

    fireEvent.click(restartButton);
    expect(mockHandleReset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled();
  });

  test('rendert sidebarFooter NICHT im Column-Modus (Mobil, Standard im Test-Viewport)', () => {
    render(
      <Board levelData={mockLevelData} sidebarFooter={<button>Mein Footer</button>} />
    );
    expect(screen.queryByText('Mein Footer')).not.toBeInTheDocument();
  });

  test('rendert sidebarFooter im Sidebar-Modus (Desktop)', () => {
    setBreakpointMock((values: any) => values.lg ?? values.md ?? values.base);
    try {
      render(
        <Board levelData={mockLevelData} sidebarFooter={<button>Mein Footer</button>} />
      );
      expect(screen.getByText('Mein Footer')).toBeInTheDocument();
    } finally {
      resetBreakpointMock();
    }
  });
});

describe('Bleistiftmodus (#4)', () => {
  const emptyBoard: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  const mockLevelData: GameLevel = {
    levelNumber: 1,
    id: 'test-level',
    initialValues: emptyBoard,
    solution: emptyBoard.map((row) => [...row]),
    cages: [
      {
        id: 'cage-1',
        cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
        sum: 3,
        color: 'blue.100'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGameState.mistakesUsed = 0;
    mockGameState.gameOver = false;
    // Mock-useGameState gibt gameState.levelId='default' zurück; damit der
    // Board-Renderpfad nicht über die Race-Condition-Schiene "kein Brett"
    // abbricht, spiegeln wir hier den jeweils aktuellen puzzleId.
    mockGameState.levelId = 'default';
  });

  test('Button hat eindeutigen zugänglichen Namen und startet im Modus "aus"', () => {
    render(<Board levelData={mockLevelData} />);
    const btn = screen.getByRole('button', { name: /Bleistiftmodus/ });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  test('Klick auf den Button togglet sichtbaren Aktivzustand und aria-pressed', () => {
    render(<Board levelData={mockLevelData} />);
    const btn = screen.getByRole('button', { name: /Bleistiftmodus/ });
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  test('P-Taste togglet den Modus ohne selektierte Zelle und nach Button-Klick', () => {
    render(<Board levelData={mockLevelData} />);
    // Erst einen anderen Button klicken (Fokus verschieben).
    const numberBtn = screen.getByRole('button', { name: 'Zahl 1' });
    fireEvent.click(numberBtn);
    // Dann P auf dem window feuern — Button darf NICHT fokussiert sein.
    fireEvent.keyDown(window, { key: 'p' });
    expect(screen.getByRole('button', { name: /Bleistiftmodus/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(window, { key: 'p' });
    expect(screen.getByRole('button', { name: /Bleistiftmodus/ })).toHaveAttribute('aria-pressed', 'false');
  });

  test('Gedrückt gehaltenes P (event.repeat) togglet nur einmal', () => {
    render(<Board levelData={mockLevelData} />);
    const btn = screen.getByRole('button', { name: /Bleistiftmodus/ });
    fireEvent.keyDown(window, { key: 'p' });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(window, { key: 'p', repeat: true });
    fireEvent.keyDown(window, { key: 'p', repeat: true });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  test('Shift+P (Großbuchstabe) togglet ebenfalls', () => {
    render(<Board levelData={mockLevelData} />);
    const btn = screen.getByRole('button', { name: /Bleistiftmodus/ });
    fireEvent.keyDown(window, { key: 'P' });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  test('P in einem fokussierten Texteingabefeld togglet NICHT', () => {
    render(
      <div>
        <Board levelData={mockLevelData} />
        <input data-testid="text-input" />
      </div>
    );
    const input = screen.getByTestId('text-input');
    input.focus();
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(window, { key: 'p' });
    expect(screen.getByRole('button', { name: /Bleistiftmodus/ })).toHaveAttribute('aria-pressed', 'false');
  });

  test('P mit gedrückter Ctrl/Meta/Alt-Taste togglet NICHT', () => {
    render(<Board levelData={mockLevelData} />);
    const btn = screen.getByRole('button', { name: /Bleistiftmodus/ });
    fireEvent.keyDown(window, { key: 'p', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'p', metaKey: true });
    fireEvent.keyDown(window, { key: 'p', altKey: true });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  test('Modus ist beim ersten Mount "aus"', () => {
    render(<Board levelData={mockLevelData} />);
    expect(screen.getByRole('button', { name: /Bleistiftmodus/ })).toHaveAttribute('aria-pressed', 'false');
  });

  test('Modus wird bei puzzleId-Wechsel automatisch auf "aus" zurückgesetzt', () => {
    mockGameState.levelId = 'level-a';
    const { rerender } = render(<Board levelData={mockLevelData} puzzleId="level-a" />);
    fireEvent.click(screen.getByRole('button', { name: /Bleistiftmodus/ }));
    expect(screen.getByRole('button', { name: /Bleistiftmodus/ })).toHaveAttribute('aria-pressed', 'true');
    mockGameState.levelId = 'level-b';
    rerender(<Board levelData={mockLevelData} puzzleId="level-b" />);
    expect(screen.getByRole('button', { name: /Bleistiftmodus/ })).toHaveAttribute('aria-pressed', 'false');
  });

  test('P ohne Level/Board-Kontext togglet ebenfalls (Button-Klick-Symmetrie)', () => {
    // Reines Mode-Toggle-Verhalten ohne Renders von Brett.
    render(<Board levelData={mockLevelData} />);
    const btn = screen.getByRole('button', { name: /Bleistiftmodus/ });
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(window, { key: 'p' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });
});
