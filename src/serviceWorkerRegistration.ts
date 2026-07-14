// Diese Datei registriert den Service Worker für die PWA-Funktionalität

interface Config {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
}

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.0/8 are considered localhost for IPv4.
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

export function register(config?: Config) {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

    if (isLocalhost) {
      // This is running on localhost. Let's check if a service worker still exists or not.
      checkValidServiceWorker(swUrl, config);
      
      // Add some additional logging to localhost
      navigator.serviceWorker.ready.then(() => {
        console.log('Service Worker ist aktiv und bereit (Entwicklungsmodus).');
      });
    } else {
      // Register service worker
      registerValidSW(swUrl, config);
    }
  }
}

// Cache-Versionen als Konstanten, damit Updates kontrolliert invalidiert werden können.
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `killersudoku-static-${CACHE_VERSION}`;
const LEVELS_CACHE = `killersudoku-levels-${CACHE_VERSION}`;
const TOTAL_LEVELS_COUNT = 100;

async function precacheAssets(): Promise<void> {
  if (!window.caches) return;

  // Alte Cache-Versionen löschen (Bugfix: keine veralteten Level-Daten cachen)
  const cacheKeys = await window.caches.keys();
  await Promise.all(
    cacheKeys
      .filter(name => name.startsWith('killersudoku-') && !name.endsWith(`-${CACHE_VERSION}`))
      .map(name => window.caches.delete(name))
  );

  // Statische Assets cachen
  const staticCache = await window.caches.open(STATIC_CACHE);
  await staticCache.addAll([
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.ico',
    '/logo192.png',
    '/logo512.png',
    '/assets/levels/level_1.json'
  ]);

  // Level-Daten cachen (parallel, mit Fehlertoleranz)
  const levelsCache = await window.caches.open(LEVELS_CACHE);
  await Promise.all(
    Array.from({ length: TOTAL_LEVELS_COUNT }, (_, i) =>
      levelsCache.add(`/assets/levels/level_${i + 1}.json`).catch(() => undefined)
    )
  );
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      precacheAssets().catch(err => {
        console.error('Fehler beim Precaching:', err);
      });

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.
              console.log('Neue Version verfügbar! Aktualisiere die App...');
              
              // Optional: Benachrichtigung an den User
              if ('Notification' in window && Notification.permission === 'granted') {
                navigator.serviceWorker.ready.then(registration => {
                  registration.showNotification('Killer Sudoku-Update', {
                    body: 'Eine neue Version der App ist verfügbar. Schließe alle Tabs und öffne die App erneut.',
                    icon: '/logo192.png',
                    badge: '/logo192.png'
                  });
                });
              }
              
              // Execute callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a
              // "Content is cached for offline use." message.
              console.log('Inhalte wurden für die Offline-Nutzung gespeichert.');
              
              // Optional: Benachrichtigung, dass die App offline funktioniert
              if ('Notification' in window && Notification.permission === 'granted') {
                navigator.serviceWorker.ready.then(registration => {
                  registration.showNotification('Killer Sudoku', {
                    body: 'Die App ist jetzt offline verfügbar!',
                    icon: '/logo192.png',
                    badge: '/logo192.png'
                  });
                });
              }
              
              // Execute callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch(error => {
      console.error('Fehler bei der Service Worker-Registrierung:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then(response => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then(registration => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('Keine Internetverbindung. App wird im Offline-Modus geladen.');
      if (config && config.onOffline) {
        config.onOffline();
      }
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error(error.message);
      });
  }
}

// Erweiterung: Benachrichtigungen anfordern (für Updates)
export function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission();
  }
}

// Typdeklaration für window.caches
declare global {
  interface Window {
    caches: {
      open(cacheName: string): Promise<Cache>;
      match(request: Request): Promise<Response | undefined>;
      has(cacheName: string): Promise<boolean>;
      delete(cacheName: string): Promise<boolean>;
      keys(): Promise<string[]>;
    };
  }
}