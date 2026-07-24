import localforage from 'localforage';
import { STORAGE_PREFIX, GAME_STATE_PREFIX } from '../config';

export { GAME_STATE_PREFIX };

export const saveGameState = async <T>(key: string, state: T) => {
  await localforage.setItem(STORAGE_PREFIX + key, state);
};

export const loadGameState = async <T = unknown>(key: string): Promise<T | null> => {
  return await localforage.getItem<T>(STORAGE_PREFIX + key);
};

export const removeGameState = async (key: string) => {
  await localforage.removeItem(STORAGE_PREFIX + key);
};

// Löscht ausschließlich Spielstände, NICHT die Statistik
export const clearAllGameStates = async () => {
  const keys = await localforage.keys();
  const gameKeys = keys.filter(k => k.startsWith(GAME_STATE_PREFIX));
  await Promise.all(gameKeys.map(k => localforage.removeItem(k)));
};
