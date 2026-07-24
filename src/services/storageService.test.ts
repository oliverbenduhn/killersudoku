import { saveGameState, loadGameState, removeGameState, clearAllGameStates, GAME_STATE_PREFIX } from './storageService';
import type { GameState } from '../types/gameTypes';

const emptyBoard = (): number[][] => Array.from({ length: 9 }, () => Array(9).fill(0));
const emptyNotes = (): number[][][] =>
  Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));

const resetStore = async () => {
  const localforage = require('localforage').default;
  await localforage.clear();
};

describe('storageService', () => {
  beforeEach(async () => {
    await resetStore();
  });

  test('saveGameState/loadGameState round-trip', async () => {
    await saveGameState('level-1', { foo: 'bar' });
    const loaded = await loadGameState('level-1');
    expect(loaded).toEqual({ foo: 'bar' });
  });

  test('persists player notes in a GameState round-trip', async () => {
    const notes = emptyNotes();
    notes[2][3] = [1, 7];
    const state: GameState = { id: 'game-1', cellValues: emptyBoard(), notes };

    await saveGameState('level-1', state);

    const loaded = await loadGameState<GameState>('level-1');
    expect(loaded?.notes[2][3]).toEqual([1, 7]);
  });

  test('removeGameState entfernt Eintrag', async () => {
    await saveGameState('level-1', { foo: 'bar' });
    await removeGameState('level-1');
    const loaded = await loadGameState('level-1');
    expect(loaded).toBeNull();
  });

  test('clearAllGameStates löscht nur Level-Stände, NICHT die Statistik (Bugfix)', async () => {
    await saveGameState('level-1', { state: 'in-progress' });
    await saveGameState('level-2', { state: 'in-progress' });
    await saveGameState('stats', { totalSolved: 5 });

    await clearAllGameStates();

    expect(await loadGameState('level-1')).toBeNull();
    expect(await loadGameState('level-2')).toBeNull();
    expect(await loadGameState('stats')).toEqual({ totalSolved: 5 });
  });

  test('GAME_STATE_PREFIX ist exportiert', () => {
    expect(GAME_STATE_PREFIX).toMatch(/^killersudoku_level-/);
  });
});