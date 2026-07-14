import localforage from 'localforage';

const STORAGE_PREFIX = process.env.REACT_APP_STORAGE_PREFIX || 'killersudoku_';
export const GAME_STATE_PREFIX = `${STORAGE_PREFIX}level-`;

export const saveGameState = async (key: string, state: any) => {
  await localforage.setItem(STORAGE_PREFIX + key, state);
};

export const loadGameState = async (key: string) => {
  return await localforage.getItem(STORAGE_PREFIX + key);
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