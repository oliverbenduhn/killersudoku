// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toBeInTheDocument();
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock window.matchMedia
window.matchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

// Mock window.ResizeObserver
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Use jsdom storage so preference tests exercise real read/write semantics.

// Mock animation functions
window.requestAnimationFrame = (callback) => setTimeout(callback, 0);
window.cancelAnimationFrame = jest.fn();

// Set up customElements mock (used by some Chakra components)
if (!window.customElements) {
  (window as unknown as { customElements: unknown }).customElements = {
    define: jest.fn(),
    get: jest.fn(),
    whenDefined: jest.fn()
  };
}

// Mock the Intersection Observer
class IntersectionObserverMock {
  observe(): null { return null; }
  unobserve(): null { return null; }
  disconnect(): null { return null; }
  takeRecords(): IntersectionObserverEntry[] { return []; }
  root = null;
  rootMargin = '';
  thresholds: ReadonlyArray<number> = [];
}
(window as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
  IntersectionObserverMock as unknown as typeof IntersectionObserver;

// Mock localforage with an in-memory store so tests can verify persistence
// without hitting IndexedDB (which jsdom does not provide).
jest.mock('localforage', () => {
  const store = new Map<string, unknown>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: unknown) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        store.delete(key);
      }),
      clear: jest.fn(async () => {
        store.clear();
      }),
      keys: jest.fn(async () => Array.from(store.keys()))
    }
  };
});

// jsdom has no Web Locks; emulate acquisition while keeping the real service path.
Object.defineProperty(navigator, 'locks', {
  configurable: true,
  value: {
    request: jest.fn((_name: string, optionsOrCallback: unknown, callback?: (lock: object) => unknown) => {
      const handler = callback ?? optionsOrCallback as (lock: object) => unknown;
      return Promise.resolve().then(() => handler({ name: _name, mode: 'exclusive' }));
    })
  }
});
