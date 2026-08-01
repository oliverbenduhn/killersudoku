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

// Save-Queue serialisiert konkurrierende Schreiboperationen pro Schlüssel.
//
// Hintergrund: vorher rief jeder Aufrufer (updateGameState, performUndo,
// performRedo, Timer-Auto-Save) die localforage-Schreibung direkt auf. Zwei
// schnelle Saves konnten parallel laufen, die Reihenfolge der Disk-Writes
// war nicht garantiert. Insbesondere konnte ein späterer Save einen
// früheren überschreiben, wenn der ältere Promise noch nicht resolve'd
// war. Die Queue stellt sicher, dass Saves in Aufruf-Reihenfolge auf
// der Disk landen.
//
// Bugfix-Kontext: Use-GameState hatte einen 15s-Timer-Auto-Save und
// manuelle Saves gleichzeitig — Save-Order-Bug führte zu "Spielstand
// 15s zurück"-Effekten. Zentralisierung hier macht den Kontrakt
// testbar am Service, ohne React.
//
// ponytail: global pro Schlüssel, nicht pro Hook-Instanz. Reicht für die
// aktuelle Architektur (eine Hook-Instanz pro puzzleId, Hook wechselt
// puzzleId beim Level-Wechsel). Wenn jemals mehrere unabhängige
// Spielstände parallel schreiben, braucht es eine per-key-Queue.

let tail: Promise<void> = Promise.resolve();

export function enqueueGameStateSave<T>(key: string, state: T): Promise<void> {
  const next = tail.then(async () => {
    try {
      await localforage.setItem(STORAGE_PREFIX + key, state);
    } catch (error) {
      // Fehler hier werfen wäre ein breaking change für die bestehenden
      // Aufrufer, die Errors schlucken — Logging stattdessen.
      console.error('Speichern fehlgeschlagen:', error);
    }
  });
  tail = next;
  return next;
}
