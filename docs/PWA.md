# PWA — Killer Sudoku

Progressive-Web-App-Konfiguration, Service Worker, Offline-Strategie,
Installierbarkeit.

## Manifest

`public/manifest.webmanifest`, eingebunden via `index.html`. Inhalt:

| Feld | Wert |
|---|---|
| `name` | "Killer Sudoku PWA" |
| `short_name` | "KillerSudoku" |
| `description` | "Spiele Killer Sudoku als Progressive Web App." |
| `theme_color` | `#3182CE` (Chakra `blue.500`) |
| `background_color` | `#F7FAFC` |
| `display` | `standalone` |
| `orientation` | `portrait` (Landscape funktioniert auf Phone gedreht, primäres Layout ist Portrait) |
| `start_url` | `/` |
| `icons` | 192×192, 512×512 (`maskable` + `any`) |

`<meta name="theme-color">` in `index.html` ist `#E15A3C` (Hero-Rot) und
übersteuert das Manifest-Theme-Color auf Mobile-Chrome-Adressleisten.

## Service Worker

Konfiguriert in `vite.config.ts` über `vite-plugin-pwa` 0.21 (Workbox).
Modus `registerType: 'autoUpdate'` — neue Bundles werden beim nächsten
Reload aktiv, keine manuelle Update-Aufforderung.

### Precache

```ts
workbox: {
  globPatterns: ['**/*.{js,css,html,json,png,ico,svg}']
}
```

Alle `public/assets/levels/level_*.json` werden statisch vorcachet. Die App
ist nach dem ersten Besuch **vollständig offline spielbar** (alle 100
Levels liegen im Cache).

### Was NICHT gecacht wird

- Externe Font-URLs (Google Fonts, Fontshare). Offline-Fallback: System-Font.
- `localStorage`- und `localforage`-Daten — die liegen ohnehin im Browser.

## Fullscreen

`App.tsx` toggelt `document.documentElement.requestFullscreen()` /
`exitFullscreen()`. State wird via `fullscreenchange`-Event synchron
gehalten, damit der Button auch reagiert, wenn der User per ESC das
Vollbild verlässt. Browser verlangt User-Gesture — der Klick ist einer.

## Installierbarkeit

`components/common/InstallPrompt` hört auf `beforeinstallprompt` und
versteckt den nativen Browser-Prompt zugunsten eines In-App-Hinweises.
Auf iOS Safari gibt es kein `beforeinstallprompt` — dort muss der User
manuell via Share → „Zum Home-Bildschirm" installieren. Der Hint-Dialog
erwähnt das für iOS-Nutzer:innen.

## Browser-Support

`browserslist.production`:

- `>0.2%`
- `not dead`
- `not op_mini all`

Plus explizit in `browserslist.development`: letzte Chrome/Firefox/Safari.
Getestet primär auf Chrome Desktop, Safari iOS, Firefox Desktop, Android Chrome.

## Cache-Busting-Strategie

- App-Bundle: `index-<hash>.js`, vom Vite-Rollup gehasht. Cache-Trefferquote
  bleibt hoch (Vendor bleibt warm, App-Code-Update invalidiert nur App-Chunk).
- Level-JSONs: numerische Filenames (`level_1.json` … `level_100.json`).
  Kein Cache-Busting möglich — wenn sich ein Level ändert, braucht es eine
  neue Versions-Policy. Phase-2-Plan: `level_<n>_<buildTag>.json`.

## Rollback-Strategie

Auto-Update macht Rollbacks manuell: das alte Bundle bleibt im
Service-Worker-Cache, ist aber nicht mehr aktiv. Bei einem Re-Deploy mit
schlechtem Build:

1. `git revert` + Push.
2. Warten auf Auto-Deploy (~ 1 min).
3. Nutzer:innen müssen **zweimal** reloaden — beim ersten Reload wird der
   neue (kaputte) SW installiert, beim zweiten Reload nimmt der Browser
   den revertierten Inhalt.

Browser-Cache manuell leeren: DevTools → Application → Service Workers →
Unregister + Hard-Reload.

## Debugging

Im Dev-Modus (`npm run dev`) ist der Service Worker **deaktiviert**.
PWAs-typische Caching-Probleme zeigen sich erst nach `npm run build` +
`npm run serve` + Production-Reload.

`chrome://serviceworker-internals/` zeigt die registrierten SWs.