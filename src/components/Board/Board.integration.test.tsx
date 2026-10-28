import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import localforage from 'localforage';
import fixture from '../../../public/assets/levels/level_1.json';
import { render } from '../../test-utils';
import { parseLevel } from '../../utils/parseLevel';
import { enqueueGameStateSave, loadGameState } from '../../services/storageService';
import * as statistics from '../../services/statisticsService';
import { GameState } from '../../types/gameTypes';
import Board from './Board';

const level = parseLevel(fixture, 1);
const notes = () => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));

beforeEach(async () => {
  await localforage.clear();
});
afterEach(() => jest.restoreAllMocks());

test('completion is saved before statistics and a delayed booking cannot undo reset', async () => {
  const values = level.solution.map(row => [...row]);
  values[0][0] = 0;
  await enqueueGameStateSave('level-1', {
    id: 'integration-attempt', cellValues: values, notes: notes(), levelId: 'level-1',
    startTime: Date.now() - 5000, hintsUsed: 0, mistakesUsed: 0
  });
  let finishBooking: (() => void) | undefined;
  const booking = new Promise<void>(resolve => { finishBooking = resolve; });
  jest.spyOn(statistics, 'recordSolve').mockImplementation(async () => {
    await booking;
    return { totalSolved: 1, totalTimeMs: 5000, solvedByDifficulty: {}, bestTimeMsByDifficulty: {} };
  });
  render(<Board puzzleId="level-1" levelData={level} onOpenHelp={() => undefined} />);
  const cell = await screen.findByTestId('cell-0-0');
  fireEvent.pointerDown(cell);
  fireEvent.keyDown(screen.getByRole('grid'), { key: String(level.solution[0][0]) });
  await waitFor(async () => expect((await loadGameState<GameState>('level-1'))?.solved).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }));
  await waitFor(async () => expect((await loadGameState<GameState>('level-1'))?.solved).toBe(false));
  await act(async () => { finishBooking?.(); await booking; });
  const restored = await loadGameState<GameState>('level-1');
  expect(restored?.cellValues).toEqual(level.initialValues);
  expect(restored?.solved).toBe(false);
  expect(restored?.statisticsRecorded).toBe(false);
});

test('an interrupted statistics booking is recovered after reload of a solved game', async () => {
  await enqueueGameStateSave('level-1', {
    id: 'unbooked', cellValues: level.solution, notes: notes(), levelId: 'level-1',
    startTime: Date.now() - 5000, endTime: Date.now(), solved: true, statisticsRecorded: false
  });
  render(<Board puzzleId="level-1" levelData={level} onOpenHelp={() => undefined} />);
  await screen.findByTestId('cell-0-0');
  await waitFor(async () => expect((await loadGameState<GameState>('level-1'))?.statisticsRecorded).toBe(true));
  expect((await statistics.loadStatistics()).totalSolved).toBe(1);
});
