import { act, renderHook } from '@testing-library/react';
import { useBoardGameLogic, type UseBoardGameLogicOptions } from './useBoardGameLogic';
import * as GameLogic from '../services/gameLogicService';
import type { GameLevel, GameState } from '../types/gameTypes';

const emptyBoard = () => Array.from({ length: 9 }, () => Array(9).fill(0));

const levelData: GameLevel = {
  id: 'logic-test',
  levelNumber: 1,
  initialValues: emptyBoard(),
  solution: emptyBoard(),
  cages: [{
    id: 'single',
    cells: [{ row: 0, col: 0 }],
    sum: 1,
    color: 'blue.100'
  }]
};

const gameState: GameState = {
  id: 'game',
  levelId: 'level-1',
  cellValues: emptyBoard(),
  mistakesUsed: 2,
  hintsUsed: 0,
  gameOver: false
};

const makeOptions = (overrides: Partial<UseBoardGameLogicOptions> = {}): UseBoardGameLogicOptions => ({
  gameState,
  levelData,
  cages: levelData.cages,
  selectedCells: [{ row: 0, col: 0 }],
  size: 9,
  maxHints: 3,
  maxMistakes: 3,
  isGameOver: false,
  updateGameState: jest.fn().mockResolvedValue(undefined),
  applyMove: jest.fn().mockResolvedValue(undefined),
  clearHistory: jest.fn(),
  resetSelection: jest.fn(),
  animation: {
    lastEnteredCell: null,
    lastEnteredValue: 0,
    lastEnteredValid: true,
    animating: false,
    triggerAnimation: jest.fn(),
    resetAnimation: jest.fn()
  },
  onGameOver: jest.fn(),
  onSolveRecorded: jest.fn(),
  showError: jest.fn(),
  ...overrides
});

describe('useBoardGameLogic – Game Over', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('zeigt beim Erreichen des Fehlerlimits keinen zusätzlichen Toast', () => {
    jest.spyOn(GameLogic, 'applyPlayerEntry').mockReturnValue({
      cellValues: emptyBoard(),
      acceptedCells: [],
      rejectedCells: [{ row: 0, col: 0 }]
    });
    const options = makeOptions();
    const { result } = renderHook(() => useBoardGameLogic(options));

    act(() => result.current.handleNumberSelect(2));

    expect(options.applyMove).toHaveBeenCalledWith(expect.objectContaining({
      mistakesUsed: 3,
      gameOver: true
    }));
    expect(options.showError).not.toHaveBeenCalled();
    expect(options.onGameOver).toHaveBeenCalledTimes(1);
  });

  test('setzt einen Game-over-Spielstand vollständig zurück', () => {
    const updateGameState = jest.fn().mockResolvedValue(undefined);
    const options = makeOptions({
      gameState: { ...gameState, mistakesUsed: 3, gameOver: true },
      isGameOver: true,
      updateGameState
    });
    const { result } = renderHook(() => useBoardGameLogic(options));

    act(() => result.current.handleReset());

    expect(updateGameState).toHaveBeenCalledWith(expect.objectContaining({
      cellValues: levelData.initialValues,
      mistakesUsed: 0,
      hintsUsed: 0,
      solved: false,
      gameOver: false,
      elapsedTime: 0
    }));
    expect(options.clearHistory).toHaveBeenCalledTimes(1);
  });
});
