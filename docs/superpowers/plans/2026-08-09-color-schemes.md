# Mehrere Farbschemata für die Oberfläche Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nutzer können zwischen vier Farbschemata für die App-Oberfläche wählen (Warm, Warm Dunkel, Ocean, Forest) — das Sudoku-Spielfeld bleibt davon unberührt.

**Architecture:** `theme.ts` bekommt zusätzliche CSS-Selektor-Bedingungen (`[data-scheme="ocean"] &` etc.) auf den bestehenden Oberflächen-Tokens. Ein neuer `ColorSchemeContext` hält den gewählten Wert, persistiert ihn in `localStorage`, setzt das `data-scheme`-Attribut auf `<html>` und synchronisiert Chakras `colorMode` (hell/dunkel), damit das Spielfeld weiterhin nur über `default`/`_dark` gesteuert wird. `HomeActions.tsx` bekommt ein `Menu` statt des bisherigen Sonne/Mond-Buttons.

**Tech Stack:** React 18, TypeScript, Chakra UI 2.8.2, `@chakra-ui/icons` 2.2.4, Jest + React Testing Library.

## Global Constraints

- Grid-/Käfig-/Zell-Tokens (`cage.*`, `grid.block.border`, `grid.cage.border`, `cell.*`) dürfen sich durch dieses Feature NICHT ändern — sie bleiben ausschließlich an `default`/`_dark` gebunden.
- `status.*`-Tokens (`status.success`, `status.warning`, `status.error`) bleiben unverändert (kein Schema-Override).
- Vier Schemata mit fester Helligkeit: `warm` (hell, Default), `warmDark` (dunkel), `ocean` (hell), `forest` (hell) — kein zusätzlicher Hell/Dunkel-Toggle pro Schema.
- Persistenz nur über `localStorage` (Key `colorScheme`), kein Server-/Account-Sync.
- Kein `ColorModeScript`/Anti-Flash-Mechanismus — konsistent mit dem bestehenden Verhalten der App.
- Exakte Farbwerte (aus der Spec, `docs/superpowers/specs/2026-08-09-color-schemes-design.md`):
  - Ocean: `surface.canvas #F3F7FA`, `surface.raised #FFFFFF`, `surface.sunken #E4EDF3`, `text.primary #16232E`, `text.secondary #4C6478`, `text.muted #8098AC`, `text.inverse #FFFFFF`, `brand.primary #0E7C86`, `brand.primary.hover #0B636C`, `brand.primary.subtle #DCEFF0`, `brand.onPrimary #FFFFFF`, `nav.active.bg #DCEFF0`, `nav.active.text #0B636C`, `nav.inactive.text #7C93A5`.
  - Forest: `surface.canvas #F5F7EF`, `surface.raised #FFFFFF`, `surface.sunken #E6EAD9`, `text.primary #1E2A18`, `text.secondary #55654A`, `text.muted #8A9678`, `text.inverse #FFFFFF`, `brand.primary #4C7A3A`, `brand.primary.hover #3C6230`, `brand.primary.subtle #DCEAD2`, `brand.onPrimary #FFFFFF`, `nav.active.bg #DCEAD2`, `nav.active.text #3C6230`, `nav.inactive.text #8A9678`.
  - `surface.header` folgt `surface.raised`, `surface.header.text` folgt `text.primary` (kein separater Wert nötig — bereits so verdrahtet).

---

## File Structure

- **Modify** `src/theme.ts` — Selektor-Overrides für Ocean/Forest auf den Oberflächen-Tokens ergänzen.
- **Create** `src/contexts/ColorSchemeContext.tsx` — State, Persistenz, DOM-Attribut, `colorMode`-Sync, `useColorScheme()`-Hook.
- **Create** `src/contexts/ColorSchemeContext.test.tsx` — Unit-Tests für den Context/Hook.
- **Modify** `src/App.tsx` — `ColorSchemeProvider` innerhalb des bestehenden `ChakraProvider` einhängen.
- **Modify** `src/components/common/HomeActions.tsx` — Sonne/Mond-`IconButton` durch `Menu` mit 4 Einträgen ersetzen.
- **Modify** `src/components/common/HomeActions.test.tsx` — Test auf den alten Toggle-Button ersetzen durch Tests auf das neue Menü.
- **Modify** `src/App.test.tsx` — Assertion auf den alten Toggle-Button-Namen anpassen.
- **Modify** `src/test-utils.tsx` — `ColorSchemeProvider` in `AllProviders` aufnehmen, damit `useColorScheme()` in Tests funktioniert.

---

### Task 1: Token-Overrides in theme.ts

**Files:**
- Modify: `src/theme.ts:22-100` (semanticTokens.colors)

**Interfaces:**
- Produces: Chakra-CSS-Variablen, die auf `[data-scheme="ocean"] &` / `[data-scheme="forest"] &` reagieren — konsumiert von Task 2 (Context setzt das Attribut) und allen Komponenten, die bereits `surface.*`/`text.*`/`brand.*`/`nav.*` nutzen (keine Code-Änderung dort nötig).

- [ ] **Step 1: Overrides für `surface.*` ergänzen**

In `src/theme.ts`, ersetze den bestehenden Surface-Block:

```ts
    'surface.canvas':       { default: '#FAF6EF', _dark: '#1B1712' },
    'surface.raised':       { default: '#FFFDF8', _dark: '#26201A' },
    'surface.sunken':       { default: '#F0E9DC', _dark: '#332A22' },
    'surface.overlay':      { default: 'blackAlpha.500', _dark: 'blackAlpha.700' },
    'surface.header':       { default: '#FFFDF8', _dark: '#26201A' },
    'surface.header.text':  { default: '#221A12', _dark: '#F5EEE2' },
```

durch:

```ts
    'surface.canvas': {
      default: '#FAF6EF', _dark: '#1B1712',
      '[data-scheme="ocean"] &': '#F3F7FA',
      '[data-scheme="forest"] &': '#F5F7EF',
    },
    'surface.raised': {
      default: '#FFFDF8', _dark: '#26201A',
      '[data-scheme="ocean"] &': '#FFFFFF',
      '[data-scheme="forest"] &': '#FFFFFF',
    },
    'surface.sunken': {
      default: '#F0E9DC', _dark: '#332A22',
      '[data-scheme="ocean"] &': '#E4EDF3',
      '[data-scheme="forest"] &': '#E6EAD9',
    },
    'surface.overlay':      { default: 'blackAlpha.500', _dark: 'blackAlpha.700' },
    'surface.header': {
      default: '#FFFDF8', _dark: '#26201A',
      '[data-scheme="ocean"] &': '#FFFFFF',
      '[data-scheme="forest"] &': '#FFFFFF',
    },
    'surface.header.text': {
      default: '#221A12', _dark: '#F5EEE2',
      '[data-scheme="ocean"] &': '#16232E',
      '[data-scheme="forest"] &': '#1E2A18',
    },
```

- [ ] **Step 2: Overrides für `text.*` ergänzen**

Ersetze:

```ts
    'text.primary':         { default: '#221A12', _dark: '#F5EEE2' },
    'text.secondary':       { default: '#6B5D4D', _dark: '#B8A98F' },
    'text.muted':           { default: '#94836E', _dark: '#8A7B66' },
    'text.inverse':         { default: '#FFFDF8', _dark: '#221A12' },
```

durch:

```ts
    'text.primary': {
      default: '#221A12', _dark: '#F5EEE2',
      '[data-scheme="ocean"] &': '#16232E',
      '[data-scheme="forest"] &': '#1E2A18',
    },
    'text.secondary': {
      default: '#6B5D4D', _dark: '#B8A98F',
      '[data-scheme="ocean"] &': '#4C6478',
      '[data-scheme="forest"] &': '#55654A',
    },
    'text.muted': {
      default: '#94836E', _dark: '#8A7B66',
      '[data-scheme="ocean"] &': '#8098AC',
      '[data-scheme="forest"] &': '#8A9678',
    },
    'text.inverse': {
      default: '#FFFDF8', _dark: '#221A12',
      '[data-scheme="ocean"] &': '#FFFFFF',
      '[data-scheme="forest"] &': '#FFFFFF',
    },
```

- [ ] **Step 3: Overrides für `brand.*` ergänzen**

Ersetze:

```ts
    'brand.primary':        { default: '#E15A3C', _dark: '#F07B5E' },
    'brand.primary.hover':  { default: '#C94A2F', _dark: '#E89A83' },
    'brand.primary.subtle': { default: '#FBE3DC', _dark: '#3E241C' },
    'brand.onPrimary':      { default: '#FFFDF8', _dark: '#221A12' },
```

durch:

```ts
    'brand.primary': {
      default: '#E15A3C', _dark: '#F07B5E',
      '[data-scheme="ocean"] &': '#0E7C86',
      '[data-scheme="forest"] &': '#4C7A3A',
    },
    'brand.primary.hover': {
      default: '#C94A2F', _dark: '#E89A83',
      '[data-scheme="ocean"] &': '#0B636C',
      '[data-scheme="forest"] &': '#3C6230',
    },
    'brand.primary.subtle': {
      default: '#FBE3DC', _dark: '#3E241C',
      '[data-scheme="ocean"] &': '#DCEFF0',
      '[data-scheme="forest"] &': '#DCEAD2',
    },
    'brand.onPrimary': {
      default: '#FFFDF8', _dark: '#221A12',
      '[data-scheme="ocean"] &': '#FFFFFF',
      '[data-scheme="forest"] &': '#FFFFFF',
    },
```

- [ ] **Step 4: Overrides für `nav.*` ergänzen**

Ersetze:

```ts
    'nav.active.bg':        { default: '#FBE3DC', _dark: '#3E241C' },
    'nav.active.text':      { default: '#C94A2F', _dark: '#F07B5E' },
    'nav.inactive.text':    { default: '#94836E', _dark: '#8A7B66' },
```

durch:

```ts
    'nav.active.bg': {
      default: '#FBE3DC', _dark: '#3E241C',
      '[data-scheme="ocean"] &': '#DCEFF0',
      '[data-scheme="forest"] &': '#DCEAD2',
    },
    'nav.active.text': {
      default: '#C94A2F', _dark: '#F07B5E',
      '[data-scheme="ocean"] &': '#0B636C',
      '[data-scheme="forest"] &': '#3C6230',
    },
    'nav.inactive.text': {
      default: '#94836E', _dark: '#8A7B66',
      '[data-scheme="ocean"] &': '#7C93A5',
      '[data-scheme="forest"] &': '#8A9678',
    },
```

- [ ] **Step 5: Typecheck + bestehende Tests laufen lassen**

Run: `npx tsc --noEmit && npx jest src/theme`
Expected: Kein Test-File für `theme.ts` vorhanden → `jest` meldet "No tests found" (das ist ok, es geht hier nur um `tsc --noEmit`, das PASS liefern muss).

- [ ] **Step 6: Commit**

```bash
git add src/theme.ts
git commit -m "feat: Ocean/Forest Token-Overrides für Farbschemata"
```

---

### Task 2: ColorSchemeContext

**Files:**
- Create: `src/contexts/ColorSchemeContext.tsx`
- Test: `src/contexts/ColorSchemeContext.test.tsx`

**Interfaces:**
- Consumes: Chakra `useColorMode()` (liefert `{ colorMode, setColorMode }`, aus `@chakra-ui/react`).
- Produces:
  - `export type ColorScheme = 'warm' | 'warmDark' | 'ocean' | 'forest';`
  - `export const COLOR_SCHEMES: { id: ColorScheme; label: string; swatch: string }[]` — Metadaten für das Menü in Task 4 (`swatch` = `brand.primary`-Hex des jeweiligen Schemas, für die Vorschau-Kreise im Menü).
  - `export function ColorSchemeProvider({ children }: { children: React.ReactNode }): JSX.Element`
  - `export function useColorScheme(): { scheme: ColorScheme; setScheme: (s: ColorScheme) => void }`

- [ ] **Step 1: Failing Test schreiben**

Erstelle `src/contexts/ColorSchemeContext.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ChakraProvider, useColorMode } from '@chakra-ui/react';
import { ColorSchemeProvider, useColorScheme } from './ColorSchemeContext';

function Probe() {
  const { scheme, setScheme } = useColorScheme();
  const { colorMode } = useColorMode();
  return (
    <div>
      <span data-testid="scheme">{scheme}</span>
      <span data-testid="colorMode">{colorMode}</span>
      <button onClick={() => setScheme('ocean')}>ocean</button>
      <button onClick={() => setScheme('warmDark')}>warmDark</button>
      <button onClick={() => setScheme('warm')}>warm</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <ChakraProvider>
      <ColorSchemeProvider>
        <Probe />
      </ColorSchemeProvider>
    </ChakraProvider>
  );
}

describe('ColorSchemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-scheme');
  });

  test('startet mit "warm", wenn nichts in localStorage steht', () => {
    renderProbe();
    expect(screen.getByTestId('scheme')).toHaveTextContent('warm');
    expect(document.documentElement.getAttribute('data-scheme')).toBe('warm');
  });

  test('liest den initialen Wert aus localStorage', () => {
    localStorage.setItem('colorScheme', 'forest');
    renderProbe();
    expect(screen.getByTestId('scheme')).toHaveTextContent('forest');
    expect(document.documentElement.getAttribute('data-scheme')).toBe('forest');
  });

  test('setScheme aktualisiert State, localStorage und data-scheme-Attribut', () => {
    renderProbe();
    act(() => { fireEvent.click(screen.getByText('ocean')); });
    expect(screen.getByTestId('scheme')).toHaveTextContent('ocean');
    expect(localStorage.getItem('colorScheme')).toBe('ocean');
    expect(document.documentElement.getAttribute('data-scheme')).toBe('ocean');
  });

  test('warmDark schaltet Chakras colorMode auf dark, andere Schemata auf light', () => {
    renderProbe();
    act(() => { fireEvent.click(screen.getByText('warmDark')); });
    expect(screen.getByTestId('colorMode')).toHaveTextContent('dark');
    act(() => { fireEvent.click(screen.getByText('warm')); });
    expect(screen.getByTestId('colorMode')).toHaveTextContent('light');
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag verifizieren**

Run: `npx jest src/contexts/ColorSchemeContext.test.tsx`
Expected: FAIL mit "Cannot find module './ColorSchemeContext'"

- [ ] **Step 3: Implementierung schreiben**

Erstelle `src/contexts/ColorSchemeContext.tsx`:

```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorMode } from '@chakra-ui/react';

export type ColorScheme = 'warm' | 'warmDark' | 'ocean' | 'forest';

export const COLOR_SCHEMES: { id: ColorScheme; label: string; swatch: string }[] = [
  { id: 'warm', label: 'Warm', swatch: '#E15A3C' },
  { id: 'warmDark', label: 'Warm Dunkel', swatch: '#F07B5E' },
  { id: 'ocean', label: 'Ocean', swatch: '#0E7C86' },
  { id: 'forest', label: 'Forest', swatch: '#4C7A3A' },
];

const STORAGE_KEY = 'colorScheme';
const DEFAULT_SCHEME: ColorScheme = 'warm';

function isColorScheme(value: string | null): value is ColorScheme {
  return value === 'warm' || value === 'warmDark' || value === 'ocean' || value === 'forest';
}

function readStoredScheme(): ColorScheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isColorScheme(stored) ? stored : DEFAULT_SCHEME;
  } catch {
    return DEFAULT_SCHEME;
  }
}

interface ColorSchemeContextValue {
  scheme: ColorScheme;
  setScheme: (scheme: ColorScheme) => void;
}

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setSchemeState] = useState<ColorScheme>(readStoredScheme);
  const { setColorMode } = useColorMode();

  const applyScheme = (next: ColorScheme) => {
    document.documentElement.dataset.scheme = next;
    setColorMode(next === 'warmDark' ? 'dark' : 'light');
  };

  // Beim Mount den initial gelesenen Wert anwenden (Attribut + colorMode),
  // damit ein Reload den gespeicherten Zustand korrekt herstellt.
  useEffect(() => {
    applyScheme(scheme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setScheme = (next: ColorScheme) => {
    setSchemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage nicht verfügbar (z. B. Private Mode) — State bleibt
      // In-Memory für die Session, kein weiterer Fallback nötig.
    }
    applyScheme(next);
  };

  return (
    <ColorSchemeContext.Provider value={{ scheme, setScheme }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme(): ColorSchemeContextValue {
  const ctx = useContext(ColorSchemeContext);
  if (!ctx) {
    throw new Error('useColorScheme muss innerhalb von ColorSchemeProvider verwendet werden');
  }
  return ctx;
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg verifizieren**

Run: `npx jest src/contexts/ColorSchemeContext.test.tsx`
Expected: PASS (alle 4 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/contexts/ColorSchemeContext.tsx src/contexts/ColorSchemeContext.test.tsx
git commit -m "feat: ColorSchemeContext für Farbschema-Auswahl"
```

---

### Task 3: ColorSchemeProvider in App.tsx einhängen

**Files:**
- Modify: `src/App.tsx:126-127` und `:250`
- Modify: `src/test-utils.tsx`

**Interfaces:**
- Consumes: `ColorSchemeProvider` aus `./contexts/ColorSchemeContext` (Task 2).

- [ ] **Step 1: Import ergänzen**

In `src/App.tsx`, nach Zeile 22 (`import { theme } from './theme';`):

```ts
import { ColorSchemeProvider } from './contexts/ColorSchemeContext';
```

- [ ] **Step 2: Provider einhängen**

In `src/App.tsx`, ersetze:

```tsx
    <ChakraProvider theme={theme}>
      <InstallPrompt />
```

durch:

```tsx
    <ChakraProvider theme={theme}>
    <ColorSchemeProvider>
      <InstallPrompt />
```

und am Ende der Funktion (aktuell Zeile 249-250):

```tsx
      <HelpDialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </ChakraProvider>
```

durch:

```tsx
      <HelpDialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </ColorSchemeProvider>
    </ChakraProvider>
```

(Einrückung des dazwischenliegenden JSX-Blocks bleibt unverändert — nur die beiden Wrapper-Tags werden ergänzt, kein Reformat der Kindelemente nötig.)

- [ ] **Step 3: test-utils.tsx anpassen, damit Komponententests useColorScheme() nutzen können**

In `src/test-utils.tsx`, ergänze den Import und wrappe `AllProviders`:

```tsx
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { ColorSchemeProvider } from './contexts/ColorSchemeContext';

const theme = extendTheme({
  // Extend theme here if needed
  initialColorMode: 'light',
  useSystemColorMode: false,
});

const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider theme={theme} resetCSS>
    <ColorSchemeProvider>
      {children}
    </ColorSchemeProvider>
  </ChakraProvider>
);

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

- [ ] **Step 4: Bestehende Tests laufen lassen**

Run: `npx jest src/App.test.tsx`
Expected: PASS (App.tsx rendert weiterhin normal; dieser Task ändert noch keine sichtbaren Assertions)

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/test-utils.tsx
git commit -m "feat: ColorSchemeProvider in App einhängen"
```

---

### Task 4: Menü in HomeActions.tsx

**Files:**
- Modify: `src/components/common/HomeActions.tsx`
- Modify: `src/components/common/HomeActions.test.tsx`

**Interfaces:**
- Consumes: `useColorScheme()` und `COLOR_SCHEMES` aus `../../contexts/ColorSchemeContext` (Task 2).

- [ ] **Step 1: Fehlschlagende Tests schreiben**

In `src/components/common/HomeActions.test.tsx`, ersetze den letzten Test (`'rendert einen Dark-Mode-Toggle-Button'`, Zeilen 50-63) durch:

```tsx
  test('rendert einen Farbschema-Menü-Button', () => {
    render(
      <HomeActions
        onOpenLevels={jest.fn()}
        blackAndWhiteMode={false}
        isFullscreen={false}
        onToggleFullscreen={jest.fn()}
        onToggleBlackAndWhite={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Farbschema wählen' })).toBeInTheDocument();
  });

  test('wechselt das Farbschema beim Klick auf einen Menüeintrag', () => {
    render(
      <HomeActions
        onOpenLevels={jest.fn()}
        blackAndWhiteMode={false}
        isFullscreen={false}
        onToggleFullscreen={jest.fn()}
        onToggleBlackAndWhite={jest.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Farbschema wählen' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Ocean/ }));
    expect(document.documentElement.getAttribute('data-scheme')).toBe('ocean');
  });
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag verifizieren**

Run: `npx jest src/components/common/HomeActions.test.tsx`
Expected: FAIL — `getByRole('button', { name: 'Farbschema wählen' })` findet nichts (Button existiert noch nicht).

- [ ] **Step 3: HomeActions.tsx umbauen**

In `src/components/common/HomeActions.tsx`, ersetze die Imports (Zeile 1-2):

```tsx
import { Button, IconButton, Tooltip, useColorMode } from '@chakra-ui/react';
import { CopyIcon, MoonIcon, SunIcon, ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
```

durch:

```tsx
import { Button, IconButton, Menu, MenuButton, MenuItem, MenuList, Tooltip } from '@chakra-ui/react';
import { CheckIcon, CopyIcon, ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { COLOR_SCHEMES, useColorScheme } from '../../contexts/ColorSchemeContext';
```

Ersetze im Funktionskörper (Zeile 25):

```tsx
  const { colorMode, toggleColorMode } = useColorMode();
```

durch:

```tsx
  const { scheme, setScheme } = useColorScheme();
  const activeSwatch = COLOR_SCHEMES.find((s) => s.id === scheme)?.swatch ?? COLOR_SCHEMES[0].swatch;
```

Ersetze den Dark-Mode-`IconButton`-Block (Zeile 38-44):

```tsx
      <IconButton
        size="sm"
        variant="ghost"
        aria-label={colorMode === 'dark' ? 'Zu Hellmodus wechseln' : 'Zu Dunkelmodus wechseln'}
        icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
        onClick={toggleColorMode}
      />
```

durch:

```tsx
      <Menu>
        <MenuButton
          as={IconButton}
          size="sm"
          variant="ghost"
          aria-label="Farbschema wählen"
          icon={
            <Box
              w="14px"
              h="14px"
              borderRadius="full"
              bg={activeSwatch}
              border="1px solid"
              borderColor="blackAlpha.300"
            />
          }
        />
        <MenuList>
          {COLOR_SCHEMES.map((s) => (
            <MenuItem key={s.id} onClick={() => setScheme(s.id)}>
              <Box
                w="12px"
                h="12px"
                borderRadius="full"
                bg={s.swatch}
                border="1px solid"
                borderColor="blackAlpha.300"
                mr={2}
              />
              {s.label}
              {scheme === s.id && <CheckIcon ml="auto" boxSize="10px" />}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
```

`Box` muss zusätzlich aus `@chakra-ui/react` importiert werden — ergänze in der obigen Import-Zeile:

```tsx
import { Box, Button, IconButton, Menu, MenuButton, MenuItem, MenuList, Tooltip } from '@chakra-ui/react';
```

- [ ] **Step 4: Tests laufen lassen, Erfolg verifizieren**

Run: `npx jest src/components/common/HomeActions.test.tsx`
Expected: PASS (alle Tests inkl. der beiden neuen)

- [ ] **Step 5: Commit**

```bash
git add src/components/common/HomeActions.tsx src/components/common/HomeActions.test.tsx
git commit -m "feat: Farbschema-Menü ersetzt Dark-Mode-Toggle in HomeActions"
```

---

### Task 5: App.test.tsx anpassen + Gesamtlauf

**Files:**
- Modify: `src/App.test.tsx:44`

**Interfaces:**
- Keine neuen — reine Test-Anpassung an Task 4's UI-Änderung.

- [ ] **Step 1: Alte Assertion ersetzen**

In `src/App.test.tsx`, ersetze Zeile 44:

```tsx
  expect(screen.getByRole('button', { name: /Hellmodus wechseln|Dunkelmodus wechseln/ })).toBeVisible();
```

durch:

```tsx
  expect(screen.getByRole('button', { name: 'Farbschema wählen' })).toBeVisible();
```

- [ ] **Step 2: Vollständige Testsuite + Typecheck laufen lassen**

Run: `npx tsc --noEmit && npx jest`
Expected: Alle Tests PASS, kein TypeScript-Fehler.

- [ ] **Step 3: Manuelle Verifikation im Browser**

Run: `npm run dev` (oder bestehendes Dev-Server-Skript), App im Browser öffnen, Farbschema-Menü öffnen, alle vier Einträge durchklicken:
- Warm: Cream-Hintergrund, Coral-Akzent, Brett hell.
- Warm Dunkel: dunkler Hintergrund, Brett dunkel (wie heutiger Dark-Mode).
- Ocean: kühles Blau-Papier, Teal-Akzent, Brett hell (identisch zu Warm/Forest).
- Forest: Salbeigrün-Papier, Grün-Akzent, Brett hell (identisch zu Warm/Ocean).
Reload nach jeder Auswahl prüfen, dass das Schema erhalten bleibt (localStorage-Persistenz).

- [ ] **Step 4: Commit**

```bash
git add src/App.test.tsx
git commit -m "test: App.test.tsx an neues Farbschema-Menü anpassen"
```

---

## Self-Review

**Spec coverage:** Vier Schemata (Task 1+2), fixe Helligkeit pro Schema (Task 2 `applyScheme`), Grid/Käfig/Zell-Tokens unangetastet (Task 1 lässt sie unverändert), `status.*` unangetastet (Task 1 lässt sie unverändert), Menü ersetzt Toggle-Button (Task 4), Persistenz via `localStorage` (Task 2), Testing-Anforderungen (Task 2 Context-Test, Task 4 HomeActions-Test, Task 5 App-Test) — alle Punkte der Spec sind abgedeckt.

**Placeholder scan:** Keine TBD/TODO, jeder Schritt enthält vollständigen Code.

**Type consistency:** `ColorScheme`-Union (`'warm' | 'warmDark' | 'ocean' | 'forest'`) konsistent in Task 2 (Definition), Task 4 (`COLOR_SCHEMES`/`useColorScheme`-Nutzung) und den Tests. `useColorScheme()` liefert `{ scheme, setScheme }` — gleich benannt in Task 2 (Produktion) und Task 4 (Konsum). `data-scheme`-Attribut-Name konsistent zwischen Task 1 (CSS-Selektor) und Task 2 (`document.documentElement.dataset.scheme`).
