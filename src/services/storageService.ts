import localforage from 'localforage';

const STORAGE_PREFIX = process.env.REACT_APP_STORAGE_PREFIX || 'killersudoku_';

export const saveGameState = async (key: string, state: any) => {
  await localforage.setItem(STORAGE_PREFIX + key, state);
};

export const loadGameState = async (key: string) => {
  return await localforage.getItem(STORAGE_PREFIX + key);
};

export const removeGameState = async (key: string) => {
  await localforage.removeItem(STORAGE_PREFIX + key);
};

export const clearAllGameStates = async () => {
  await localforage.clear();
};