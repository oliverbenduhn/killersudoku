# Testing

Konventionen und Werkzeuge. Bei einer neuen Utility / einem neuen Hook:
Test zuerst (RED), dann Implementierung (GREEN), dann Refactor.

## Werkzeuge

| Tool | Zweck |
|---|---|
| Jest 29 | Test-Runner |
| ts-jest | TypeScript-Transform |
| jest-environment-jsdom | DOM-API in Node |
| `@testing-library/react` 16 | Komponenten-Rendering + Queries |
| `@testing-library/jest-dom` | Matcher-Erweiterung |

## Konventionen

- `*.test.ts` für pure Funktionen, Services, Utils.
- `*.test.tsx` für Komponenten und Hooks, die React brauchen.
- Ko-lokal: `useCellAnimation.ts` neben `useCellAnimation.test.tsx`.
- Eine Datei pro Implementierungs-Datei. Mehrere zusammengehörige Tests in
  derselben Datei.
- **Keine Snapshot-Tests** für UI. Lieber `@testing-library`-Queries
  (`getByRole`, `getByTestId`, `getByText`).
- **Reale Driver-Components** für Hook-Tests mit State. Keine
  `jest.fn()`-Mock-Setter — die frieren Closures ein und brechen
  Multi-Call-Tests (gesehen in `useCellAnimation.test.tsx`).
- Bei Pointer-/Touch-Tests: `setPointerCapture` defensiv prüfen, weil
  jsdom es nicht definiert. Pattern siehe `BoardSurface.tsx`.

## Skripte

```bash
npm test               # alles
npm run lint:levels    # nur Level-Validator-Suite
npm run validate       # typecheck + lint:levels
npm run test:smoke     # Probe gegen Production-Bundle
```

## Pflicht-Suites

| Suite | Wann laufen lassen |
|---|---|
| `npm test` | vor jedem Commit |
| `npm run lint:levels` | nach jeder Änderung an `utils/levelValidator.ts` oder an `public/assets/levels/` |
| `npm run validate` | vor Release |
| `npm run test:smoke` | nach Build, vor Deploy |

## Bestehende Suites (Auswahl)

| Datei | Prüft |
|---|---|
| `src/hooks/useBoardGameLogic.test.ts` | Number-Select, Clear, Reset, Reveal-Hint |
| `src/hooks/useCellAnimation.test.tsx` | Pulse/Success/Error-Trigger |
| `src/hooks/useCellSelection.test.tsx` | Single-Tap, Drag, Double-Tap |
| `src/hooks/useBoardKeyboard.test.ts` | Pfeile, WASD, Tab, Shift+Tab, Ziffern |
| `src/hooks/useBoardResize.test.ts` | Cell-Größe responsive |
| `src/hooks/useUndoRedo.test.ts` | Commit/Undo/Redo-Paare (ADR 0003) |
| `src/hooks/useGameState.test.ts` (implizit via tests in services) | Hydration + Save |
| `src/services/gameLogicService.test.ts` | `applyPlayerEntry`, `isCageComplete`, `isBoardComplete` |
| `src/services/board.test.ts` | `cageOfCell`, `buildCageIndex` |
| `src/utils/levelValidator.test.ts` | Level-JSON-Validierung über alle 100 Levels |
| `src/utils/killerSolver.test.ts` | Eindeutigkeit, Mehrfachlösungen, Käfig-Constraints |
| `src/utils/killerConstraints.test.ts` | Cage-Analyse (`analyzeCage`) |
| `src/utils/killerRegions.test.ts` | Cage-Bildung / Region-Growing |
| `src/utils/killerCombinations.test.ts` | Käfig-Kombinations-Generator |
| `src/components/Board/Board.test.tsx` | Hook-Composition-Rauchtest |
| `src/components/Board/BoardSurface.test.tsx` | 3-Schichten-Render |
| `src/components/Board/cageOutline.test.ts` | SVG-Pfad-Korrektheit |
| `src/components/NumberPad/NumberPad.test.tsx` | Click-Handler, Wert 0 = Clear |
| `src/components/LevelSelector/LevelSelector.test.tsx` | Chapter-Grouping, Progress-Markierung |
| `src/components/common/HelpDialog.test.tsx` | Shortcut-Liste gerendert |
| `src/components/common/HomeActions.test.tsx` | Toggles, Fullscreen-Calls |
| `src/components/common/TutorialOverlay.test.tsx` | Step-Navigation |
| `src/components/common/RippleButton.test.tsx` | Klick-Animation |
| `src/components/common/InstallPrompt.test.tsx` | beforeinstallprompt |
| `src/components/common/FadeInView.test.tsx` | Mount/Unmount |
| `src/App.test.tsx` | Smoke-Test der Top-Level-Komponente |
| `src/theme.test.ts` | Theme-Tokens vorhanden |

## Hook-Test-Pattern (Driver-Component)

```tsx
import { renderHook, act } from '@testing-library/react';
import { useCellAnimation } from './useCellAnimation';

test('triggert Success-Animation bei gültiger Eingabe', () => {
  const { result } = renderHook(() => useCellAnimation());
  act(() => {
    result.current.triggerAnimation({ row: 0, col: 0 }, 5, true);
  });
  expect(result.current.animating).toBe(true);
  expect(result.current.lastEnteredValid).toBe(true);
});
```

Für Multi-Call-Tests mit veränderlichem State über Calls hinweg: Driver-Component
mit echtem `useState` + `mirrorSpy`:

```tsx
function Driver() {
  const [value, setValue] = useState(0);
  const spy = jest.fn();
  // useEffect mit spy(value) o.ä., damit der Test die stateful Calls sieht.
  // useCellAnimation.test.tsx zeigt das ausformuliert.
}
```

## Smoke-Probe (`scripts/probe.mjs`)

`npm run test:smoke` führt nach `npm run build` einen headless Check gegen
das Production-Bundle aus. Prüft:

- `build/index.html` ist erreichbar.
- `<script type="module">`-Tag verweist auf existierendes Bundle.
- Service-Worker-Manifest ist eingebunden.
- `APP_VERSION` aus `src/version.ts` matcht die UI-Header-Version.

Defensiv gehalten — keine Tiefe, nur "lädt es überhaupt und ist es
konsistent". Tiefe gehört in die Jest-Suite.

## Was nicht in Tests gehört

- UI-Snapshot-Vergleiche (zu brittle, kein Signal).
- Mocks für React selbst oder für `@chakra-ui/react`.
- Mocks für `localStorage` — entweder echt (`jest-environment-jsdom`) oder
  per `storageService` mit Test-Harness.
- Time-Mocking für den Auto-Save-Timer (besser: Hydration direkt testen,
  Timer-Logik separat).