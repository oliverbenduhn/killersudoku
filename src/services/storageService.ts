import localforage from 'localforage';
import { STORAGE_PREFIX, GAME_STATE_PREFIX } from '../config';

export { GAME_STATE_PREFIX };

// One serialization primitive for writes and read-modify-write operations.
let tail: Promise<unknown> = Promise.resolve();

export function runStorageOperation<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const next = tail.then(() => {
    if (navigator.locks) {
      return navigator.locks.request(`${STORAGE_PREFIX}write:${key}`, operation);
    }
    return operation();
  });
  // The caller receives the rejection; only the queue tail recovers for subsequent writes.
  tail = next.catch(() => undefined);
  return next;
}

export function enqueueGameStateSave<T>(key: string, state: T): Promise<void> {
  return runStorageOperation(key, async () => {
    await localforage.setItem(STORAGE_PREFIX + key, state);
  });
}

// Compatibility entrypoint: all game-state writers share the queue.
export const saveGameState = enqueueGameStateSave;

export const loadGameState = async <T = unknown>(key: string): Promise<T | null> => {
  return localforage.getItem<T>(STORAGE_PREFIX + key);
};

export const removeGameState = (key: string): Promise<void> =>
  runStorageOperation(key, async () => { await localforage.removeItem(STORAGE_PREFIX + key); });

export const clearAllGameStates = async () => {
  const keys = await localforage.keys();
  await Promise.all(keys.filter(key => key.startsWith(GAME_STATE_PREFIX)).map(key =>
    runStorageOperation(key.slice(STORAGE_PREFIX.length), async () => { await localforage.removeItem(key); })
  ));
};

/** Holds the single-writer lease until unmount, including pending saves. */
export function acquireGameSession(key: string): Promise<(() => Promise<void>) | null> {
  if (!navigator.locks) {
    return Promise.reject(new Error('Sicheres Speichern benötigt einen aktuellen Browser und HTTPS (oder localhost).'));
  }
  return new Promise((resolve, reject) => {
    const request = navigator.locks.request(`${STORAGE_PREFIX}session:${key}`, { ifAvailable: true }, lock => {
      if (!lock) {
        resolve(null);
        return;
      }
      return new Promise<void>(release => {
        let releasing: Promise<void> | null = null;
        resolve(() => {
          releasing ??= tail.then(async () => {
            release();
            await request;
          });
          return releasing;
        });
      });
    }).catch(reject);
  });
}
