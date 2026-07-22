# Navigation-Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die App auf zwei Screens (Start/Level) reduzieren, Wisch-Navigation und Bottom-Nav durch einen Level-Button + Zurück-Button ersetzen, Dark-Mode/Schwarzweiß-Toggle als Icon-Buttons auf den Start-Screen verschieben, Statistik/Info/Einstellungen-Tabs entfernen.

**Architecture:** `App.tsx` behält den `activeTab`-State (jetzt nur `'home' | 'levels'`), aber ohne Wisch-Handling. Eine neue, layoutlose Komponente `HomeActions` (Level-Button, Dark-Mode-Toggle, Schwarzweiß-Toggle) wird auf Mobil in der Kopfzeile gerendert und auf Desktop über eine neue `Board`-Prop `sidebarFooter` unten in dessen Sidebar-Spalte. `LevelsTab` bekommt einen eigenen Zurück-Button plus den Impressum/Datenschutz-Footer (zieht aus dem entfernten Settings-Tab um).

**Tech Stack:** React 18, TypeScript, Chakra UI 2, Jest + Testing Library.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-22-navigation-redesign-design.md` — jede Anforderung dort muss durch eine Task hier abgedeckt sein.
- Keine Änderung an `statisticsService`/Solve-Recording (nur UI-Anzeige entfernt).
- Keine Änderung an Tutorial-Auto-Start-Verhalten.
- Impressum/Datenschutz-Links (`Tabs.tsx:285-291` im Ist-Zustand) dürfen nicht ersatzlos verschwinden — ziehen in `LevelsTab` um.
- Deploy-Prozess für dieses Repo (siehe `DEPLOYMENT.md` bzw. bereits in dieser Session etabliert): `npm run build`, dann `sudo systemctl restart killersudoku` (NIEMALS `pkill -f vite` benutzen — das trifft auch den Produktions-Service).

---

### Task 1: `HomeActions`-Komponente

**Files:**
- Create: `src/components/common/HomeActions.tsx`
- Test: `src/components/common/HomeActions.test.tsx`

**Interfaces:**
- Produces: `HomeActions` (default export + named export), Props:
  ```ts
  interface HomeActionsProps {
    onOpenLevels: () => void;
    blackAndWhiteMode: boolean;
    onToggleBlackAndWhite: () => void;
  }
  ```
  Rendert ein React-Fragment mit drei Buttons — kein Wrapper-Layout (Aufrufer bestimmen Anordnung selbst über ihren eigenen Flex/HStack/VStack-Container).

- [ ] **Step 1: Schreibe den fehlschlagenden Test**

```tsx
// src/components/common/HomeActions.test.tsx
import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { render } from '../../test-utils';
import { HomeActions } from './HomeActions';

describe('HomeActions', () => {
  test('ruft onOpenLevels beim Klick auf den Level-Button auf', () => {
    const onOpenLevels = jest.fn();
    render(
      <HomeActions
        onOpenLevels={onOpenLevels}
        blackAndWhiteMode={false}
        onToggleBlackAndWhite={jest.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Level' }));
    expect(onOpenLevels).toHaveBeenCalledTimes(1);
  });

  test('ruft onToggleBlackAndWhite beim Klick auf den Schwarzweiß-Toggle auf', () => {
    const onToggleBlackAndWhite = jest.fn();
    render(
      <HomeActions
        onOpenLevels={jest.fn()}
        blackAndWhiteMode={false}
        onToggleBlackAndWhite={onToggleBlackAndWhite}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Schwarzweiß-Modus aktivieren' }));
    expect(onToggleBlackAndWhite).toHaveBeenCalledTimes(1);
  });

  test('zeigt "Farbmodus aktivieren" wenn Schwarzweiß-Modus bereits an ist', () => {
    render(
      <HomeActions
        onOpenLevels={jest.fn()}
        blackAndWhiteMode={true}
        onToggleBlackAndWhite={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Farbmodus aktivieren' })).toBeInTheDocument();
  });

  test('rendert einen Dark-Mode-Toggle-Button', () => {
    render(
      <HomeActions
        onOpenLevels={jest.fn()}
        blackAndWhiteMode={false}
        onToggleBlackAndWhite={jest.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /Hellmodus wechseln|Dunkelmodus wechseln/ })
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Test ausführen, muss fehlschlagen**

Run: `npx jest src/components/common/HomeActions.test.tsx`
Expected: FAIL mit „Cannot find module './HomeActions'"

- [ ] **Step 3: Komponente implementieren**

```tsx
// src/components/common/HomeActions.tsx
import { Button, IconButton, useColorMode } from '@chakra-ui/react';
import { CopyIcon, MoonIcon, SunIcon, ViewIcon, ViewOffIcon } from '@chakra-ui/icons';

export interface HomeActionsProps {
  onOpenLevels: () => void;
  blackAndWhiteMode: boolean;
  onToggleBlackAndWhite: () => void;
}

// Layoutlose Aktions-Gruppe für den Start-Screen: Level-Button, Dark-Mode-
// und Schwarzweiß-Toggle. Wird sowohl in der mobilen Kopfzeile (App.tsx)
// als auch in Board.tsx's Sidebar (Desktop) gerendert — der jeweilige
// Aufrufer bestimmt die Anordnung (horizontal/vertikal).
export function HomeActions({ onOpenLevels, blackAndWhiteMode, onToggleBlackAndWhite }: HomeActionsProps) {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <>
      <Button size="sm" variant="ghost" leftIcon={<CopyIcon />} onClick={onOpenLevels}>
        Level
      </Button>
      <IconButton
        size="sm"
        variant="ghost"
        aria-label={colorMode === 'dark' ? 'Zu Hellmodus wechseln' : 'Zu Dunkelmodus wechseln'}
        icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
        onClick={toggleColorMode}
      />
      <IconButton
        size="sm"
        variant="ghost"
        aria-label={blackAndWhiteMode ? 'Farbmodus aktivieren' : 'Schwarzweiß-Modus aktivieren'}
        icon={blackAndWhiteMode ? <ViewIcon /> : <ViewOffIcon />}
        onClick={onToggleBlackAndWhite}
      />
    </>
  );
}

export default HomeActions;
```

- [ ] **Step 4: Test ausführen, muss bestehen**

Run: `npx jest src/components/common/HomeActions.test.tsx`
Expected: PASS (4 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/common/HomeActions.tsx src/components/common/HomeActions.test.tsx
git commit -m "feat: HomeActions-Komponente (Level-Button, Dark-Mode-/Schwarzweiß-Toggle)"
```

---

### Task 2: `Board.tsx` — `sidebarFooter`-Prop + Aktionen immer icon-only

**Files:**
- Modify: `src/components/Board/Board.tsx`
- Test: `src/components/Board/Board.test.tsx`

**Interfaces:**
- Consumes: nichts Neues von außen.
- Produces: `BoardProps` bekommt `sidebarFooter?: React.ReactNode`. Wird nur gerendert wenn intern `flexDirection === "row"` ist (Board entscheidet selbst, Aufrufer muss den Breakpoint nicht kennen).

- [ ] **Step 1: Schreibe die fehlschlagenden Tests**

Füge in `src/components/Board/Board.test.tsx` am Ende von `describe('Board Component', ...)`, vor der schließenden `});`, zwei neue Tests ein:

```tsx
  test('rendert sidebarFooter NICHT im Column-Modus (Mobil, Standard im Test-Viewport)', () => {
    render(
      <Board levelData={mockLevelData} sidebarFooter={<button>Mein Footer</button>} />
    );
    expect(screen.queryByText('Mein Footer')).not.toBeInTheDocument();
  });

  test('rendert sidebarFooter im Sidebar-Modus (Desktop)', () => {
    const chakra = require('@chakra-ui/react');
    const spy = jest.spyOn(chakra, 'useBreakpointValue').mockImplementation(
      (values: any) => values.lg ?? values.md ?? values.base
    );

    render(
      <Board levelData={mockLevelData} sidebarFooter={<button>Mein Footer</button>} />
    );
    expect(screen.getByText('Mein Footer')).toBeInTheDocument();

    spy.mockRestore();
  });
```

- [ ] **Step 2: Tests ausführen, der zweite muss fehlschlagen**

Run: `npx jest src/components/Board/Board.test.tsx -t "sidebarFooter"`
Expected: erster Test PASS (es gibt die Prop noch gar nicht, also auch nichts zu sehen), zweiter Test FAIL — „Mein Footer" wird nicht gefunden, weil `Board` die Prop noch nicht kennt/rendert.

- [ ] **Step 3: `BoardProps` um `sidebarFooter` erweitern**

In `src/components/Board/Board.tsx`, Interface `BoardProps` (aktuell Zeilen 61-68):

```tsx
interface BoardProps {
  size?: number;
  puzzleId?: string;
  levelData?: GameLevel | null;
  isLoading?: boolean;
  error?: string | null;
  blackAndWhiteMode?: boolean;
  /** Wird nur im Sidebar-Layout (flexDirection "row") unten in der
   *  Sidebar-Spalte gerendert, unterhalb der Aktions-Buttons. */
  sidebarFooter?: React.ReactNode;
}
```

Destructuring in der Komponenten-Signatur (aktuell Zeilen 73-80) um `sidebarFooter = null` ergänzen:

```tsx
export const Board: React.FC<BoardProps> = ({
  size = 9,
  puzzleId = 'default',
  levelData = null,
  isLoading: externalLoading = false,
  error: externalError = null,
  blackAndWhiteMode = false,
  sidebarFooter = null
}) => {
```

- [ ] **Step 4: `isMobile` entfernen, Aktionen immer icon-only**

Entferne Zeilen 115-117 (die `isMobile`-Deklaration samt Kommentar):

```tsx
  // Mobile (base/md): Aktionen icon-only (kompakt). Desktop (lg+): mit
  // Text-Beschriftung. Synchron mit Bottom-Nav-Switch in App.tsx.
  const isMobile = useBreakpointValue({ base: true, lg: false }) ?? true;
```

Ersetze die fünf `RippleButton`-Aufrufe (aktuell Zeilen 691-729) so, dass sie immer nur das Icon zeigen:

```tsx
            <BellIcon />
          </RippleButton>
          {/* Direkter Reveal-Hinweis: brand primary, klar als primäre Aktion. */}
          <RippleButton
            colorScheme="blue"
            onClick={handleRevealHint}
            isDisabled={!gameState || isGameOver || (gameState.hintsUsed || 0) >= MAX_HINTS}
            aria-label={`Hinweis (${MAX_HINTS - (gameState?.hintsUsed || 0)})`}
          >
            <AddIcon />
          </RippleButton>
          {/* Reset: tonal, nicht akzent. */}
          <RippleButton
            variant="ghost"
            onClick={handleReset}
            isDisabled={!gameState || isGameOver}
            aria-label="Reset"
          >
            <RepeatClockIcon />
          </RippleButton>
          <RippleButton
            variant="ghost"
            onClick={() => { void undo(); }}
            isDisabled={!gameState || isGameOver || !canUndo}
            aria-label="Rückgängig"
          >
            <ArrowBackIcon />
          </RippleButton>
          <RippleButton
            variant="ghost"
            onClick={() => { void redo(); }}
            isDisabled={!gameState || isGameOver || !canRedo}
            aria-label="Wiederherstellen"
          >
            <ArrowForwardIcon />
          </RippleButton>
```

(Der `Tipp`-Button, direkt darüber, ändert sich genauso: `{isMobile ? <BellIcon /> : 'Tipp'}` wird zu `<BellIcon />`. Der Rest des Buttons — `onClick`, `isDisabled`, `aria-label` — bleibt unverändert, nur der JSX-Inhalt zwischen den `RippleButton`-Tags wird auf das reine Icon reduziert. `RepeatIcon` und `AddIcon`-Import bleiben nötig, `RepeatIcon` wird jetzt nirgends mehr referenziert — im nächsten Schritt aus dem Import entfernen.)

- [ ] **Step 5: Ungenutzten `RepeatIcon`-Import entfernen**

Zeile 17:

```tsx
import { AddIcon, ArrowBackIcon, ArrowForwardIcon, BellIcon, RepeatClockIcon } from '@chakra-ui/icons';
```

- [ ] **Step 6: `sidebarFooter` rendern**

Nach dem schließenden `</Box>` der Aktions-Buttons-Gruppe (nach dem Redo-`RippleButton`, vor dem schließenden `</Box>` der Sidebar-Spalte — aktuell Zeile 730/731), einfügen:

```tsx
        </Box>

        {flexDirection === "row" && sidebarFooter && (
          <Box
            mt={4}
            pt={3}
            borderTop="1px solid"
            borderColor="surface.sunken"
            display="flex"
            flexDirection="column"
            gap={2}
          >
            {sidebarFooter}
          </Box>
        )}
      </Box>
    </Flex>
  );
};
```

- [ ] **Step 7: Tests ausführen, müssen bestehen**

Run: `npx jest src/components/Board/Board.test.tsx`
Expected: PASS (alle Tests, inkl. der 2 neuen)

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck`
Expected: keine Fehler

- [ ] **Step 9: Commit**

```bash
git add src/components/Board/Board.tsx src/components/Board/Board.test.tsx
git commit -m "feat(board): sidebarFooter-Slot, Aktionen immer icon-only"
```

---

### Task 3: `Tabs.tsx` — Stats/Info/Settings entfernen, `LevelsTab` bekommt Zurück-Button + Legal-Footer, `HomeTab` reicht `sidebarFooter` durch

**Files:**
- Modify: `src/components/Tabs.tsx`

**Interfaces:**
- Consumes: `HomeActions` (Task 1), `Board`s `sidebarFooter`-Prop (Task 2).
- Produces: `HomeTabProps` bekommt `onOpenLevels: () => void` und `onToggleBlackAndWhite: () => void` dazu (`blackAndWhiteMode` existierte schon). `LevelsTabProps` bekommt `onBack: () => void` dazu. `StatsTab`, `InfoTab`, `SettingsTab` (und ihre Props-Interfaces `StatsTabProps`, `SettingsTabProps`) werden entfernt.

- [ ] **Step 1: Imports bereinigen**

Ersetze Zeilen 1-8:

```tsx
// Tab-Inhalte. Aus App.tsx ausgelagert, damit App.tsx das Layout hält
// und jede Tab-Seite eigenständig testbar/lesbar bleibt.

import { Box, Heading, Text, Link, Button, SimpleGrid, Flex, IconButton } from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { Difficulty } from '../types/gameTypes';
import LevelSelector from './LevelSelector/LevelSelector';
```

(`VStack`, `HStack`, `Switch`, `FormLabel`, `Stat`, `StatLabel`, `StatNumber`, `StatHelpText`, `useColorMode`, `GameStatistics`, `formatDuration` fallen weg — wurden ausschließlich von `StatsTab`/`SettingsTab` genutzt, die in diesem Task entfernt werden.)

- [ ] **Step 2: `HomeTab` erweitern**

Ersetze Zeilen 14-54 (`HomeTabProps`-Interface + `HomeTab`-Funktion + die beiden `import`-Zeilen mittendrin):

```tsx
// ---------- Home ----------

interface HomeTabProps {
  currentLevel: number;
  levelData: any;
  isLoading: boolean;
  error: string | null;
  blackAndWhiteMode: boolean;
  transitionDirection: 'left' | 'right' | null;
  /** Überschreibt die Storage-Id (z. B. für generierte Zufallslevel). */
  puzzleId?: string;
  onOpenLevels: () => void;
  onToggleBlackAndWhite: () => void;
}

import { Board } from './Board/Board';
import FadeInView from './common/FadeInView';
import { HomeActions } from './common/HomeActions';

export function HomeTab({
  currentLevel,
  levelData,
  isLoading,
  error,
  blackAndWhiteMode,
  transitionDirection,
  puzzleId,
  onOpenLevels,
  onToggleBlackAndWhite,
}: HomeTabProps) {
  return (
    <FadeInView
      direction={transitionDirection === 'left' ? 'left' : 'right'}
      duration={300}
      mb={4}
      key="home-tab"
    >
      <Box
        bg="surface.raised"
        borderRadius="xl"
        overflow="hidden"
        boxShadow="sm"
      >
        <Board
          puzzleId={puzzleId ?? `level-${currentLevel}`}
          levelData={levelData}
          isLoading={isLoading}
          error={error}
          blackAndWhiteMode={blackAndWhiteMode}
          sidebarFooter={
            <HomeActions
              onOpenLevels={onOpenLevels}
              blackAndWhiteMode={blackAndWhiteMode}
              onToggleBlackAndWhite={onToggleBlackAndWhite}
            />
          }
        />
      </Box>
    </FadeInView>
  );
}
```

- [ ] **Step 3: `InfoTab` entfernen**

Lösche den kompletten Block (bisher Zeilen 56-79, direkt nach `HomeTab`):

```tsx
// ---------- Info ----------

export function InfoTab({ transitionDirection }: TabPanelProps) {
  return (
    ...
  );
}
```

(Das `TabPanelProps`-Interface, aktuell Zeilen 10-12, bleibt bestehen — wird noch von `StatsTab`/`InfoTab` referenziert gehabt, aber `LevelsTab` nutzt `extends TabPanelProps` weiterhin. Prüfe nach diesem Task, ob `TabPanelProps` noch irgendwo genutzt wird — `LevelsTabProps extends TabPanelProps` bleibt, also **nicht** löschen.)

- [ ] **Step 4: `LevelsTab` um Zurück-Button + Legal-Footer erweitern**

Ersetze den kompletten `LevelsTab`-Block:

```tsx
// ---------- Levels ----------

interface LevelsTabProps extends TabPanelProps {
  currentLevel: number;
  onLevelChange: (level: number) => void;
  onGenerateLevel: (difficulty: Exclude<Difficulty, 'unknown'>) => void;
  onBack: () => void;
}

const GENERATOR_DIFFICULTIES: Array<{ key: Exclude<Difficulty, 'unknown'>; label: string; color: string }> = [
  { key: 'easy', label: 'Einfach', color: 'green' },
  { key: 'medium', label: 'Mittel', color: 'blue' },
  { key: 'hard', label: 'Schwer', color: 'orange' },
  { key: 'expert', label: 'Experte', color: 'red' },
];

export function LevelsTab({ currentLevel, onLevelChange, onGenerateLevel, onBack, transitionDirection }: LevelsTabProps) {
  return (
    <FadeInView direction={transitionDirection === 'left' ? 'left' : 'right'} duration={300} key="levels-tab">
      <Flex align="center" gap={2} mb={4}>
        <IconButton
          aria-label="Zurück"
          icon={<ArrowBackIcon />}
          variant="ghost"
          onClick={onBack}
        />
        <Heading as="h2" size="md" color="text.primary">
          Level
        </Heading>
      </Flex>

      <Box bg="surface.raised" p={5} borderRadius="xl" boxShadow="sm" mb={4}>
        <Heading as="h2" size="lg" mb={2} color="text.primary">
          Zufallslevel erstellen
        </Heading>
        <Text fontSize="sm" color="text.secondary" mb={3}>
          Erzeugt ein frisches Rätsel mit garantiert eindeutiger Lösung.
        </Text>
        <SimpleGrid columns={[2, 4]} spacing={3}>
          {GENERATOR_DIFFICULTIES.map(({ key, label, color }) => (
            <Button
              key={key}
              aria-label={`Neues Zufallslevel erstellen: ${label}`}
              colorScheme={color}
              variant="outline"
              onClick={() => onGenerateLevel(key)}
            >
              Zufall · {label}
            </Button>
          ))}
        </SimpleGrid>
      </Box>
      <Box bg="surface.raised" p={5} borderRadius="xl" boxShadow="sm">
        <Heading as="h2" size="lg" mb={4} color="text.primary">
          Level-Auswahl
        </Heading>
        <LevelSelector
          currentLevel={currentLevel}
          onLevelChange={onLevelChange}
          fullWidth={true}
        />
      </Box>

      <Box
        as="footer"
        textAlign="center"
        pt={6}
        pb={2}
        fontSize="sm"
        color="text.muted"
        borderTop="1px solid"
        borderColor="surface.sunken"
        mt={6}
      >
        <Link href="https://legal.benduhn.de/impressum/" target="_blank" rel="noopener" color="text.muted">
          Impressum
        </Link>
        {' · '}
        <Link href="https://legal.benduhn.de/datenschutz/" target="_blank" rel="noopener" color="text.muted">
          Datenschutz
        </Link>
      </Box>
    </FadeInView>
  );
}
```

- [ ] **Step 5: `StatsTab` und `SettingsTab` entfernen**

Lösche beide kompletten Blöcke (bisherige Zeilen 134-194 für `StatsTab` inkl. `StatsTabProps`, und 196 bis Dateiende für `SettingsTab` inkl. `SettingsTabProps`). Nach diesem Schritt endet die Datei mit dem `LevelsTab`-Block aus Step 4.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: Fehler in `App.tsx` (nutzt noch `StatsTab`/`InfoTab`/`SettingsTab`/alte `HomeTab`/`LevelsTab`-Props) — das ist erwartet, wird in Task 4 behoben. Prüfe, dass die Fehler ausschließlich `App.tsx` betreffen, nicht `Tabs.tsx` selbst.

- [ ] **Step 7: Commit**

```bash
git add src/components/Tabs.tsx
git commit -m "feat(tabs): Level-Screen mit Zurueck-Button + Legal-Footer, Stats/Info/Settings entfernt"
```

---

### Task 4: `App.tsx` — zwei Screens, kein Wischen, kein Reset-Dialog, neue Kopfzeile

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `HomeTab`, `LevelsTab` (Task 3, neue Props), `HomeActions` (Task 1).
- Produces: nichts, das andere Tasks brauchen (App.tsx ist die Wurzel).

- [ ] **Step 1: Imports bereinigen**

Ersetze Zeilen 1-36 (kompletter Import-Block):

```tsx
// App.tsx — Layout & State. Tab-Inhalte sind in components/Tabs.tsx.
import { useState, useEffect } from 'react';
import {
  ChakraProvider,
  Box,
  Container,
  Heading,
  Flex,
  useBreakpointValue,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';

import FadeInView from './components/common/FadeInView';
import InstallPrompt from './components/common/InstallPrompt';
import { HomeActions } from './components/common/HomeActions';

import { HomeTab, LevelsTab } from './components/Tabs';
import { TutorialOverlay } from './components/common/TutorialOverlay';
import { useTutorial } from './hooks/useTutorial';
import { theme } from './theme';
import { loadLevelByNumber } from './services/levelService';
import { generateLevel } from './services/puzzleGeneratorService';
import { Difficulty, GameLevel } from './types/gameTypes';

type TabName = 'home' | 'levels';
```

(Entfällt: `useRef`, `AlertDialog*`, `Button`, `LevelSelector`, `BottomNavigation`, `SwipeableBox`, `GameStatistics`/`loadStatistics`, `clearAllGameStates`, `TAB_ORDER`, `calcTransition`.)

- [ ] **Step 2: State & Handler vereinfachen**

Ersetze Zeilen 45-147 (kompletter Funktionskörper von `function App()` bis vor `return`):

```tsx
function App() {
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [levelData, setLevelData] = useState<GameLevel | null>(null);
  // Generiertes Zufallslevel; hat Vorrang vor dem geladenen Standard-Level.
  const [generatedLevel, setGeneratedLevel] = useState<GameLevel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>('home');
  const [tabTransition, setTabTransition] = useState<'left' | 'right' | null>(null);
  const [blackAndWhiteMode, setBlackAndWhiteMode] = useState<boolean>(false);
  const toast = useToast();
  const tutorial = useTutorial();

  const headerHeight = useBreakpointValue({ base: '52px', md: '60px' });
  // Device-Layout:
  //   mobile  (base/md)  — Kopfzeile mit Titel + HomeActions, kein Sidebar.
  //   desktop (lg+ bzw. Tablet-Quer ab md) — Sidebar-Layout, keine Kopfzeile.
  const isSidebarLayout = useBreakpointValue({ base: false, md: true }) || false;
  const containerMaxWidth = useBreakpointValue({ base: '100%', xl: 'container.xl' });
  const headerBg = useColorModeValue('surface.header', 'surface.header');
  const headerTextColor = useColorModeValue('surface.header.text', 'surface.header.text');

  useEffect(() => {
    let cancelled = false;
    const fetchLevel = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const level = await loadLevelByNumber(currentLevel);
        if (!cancelled) setLevelData(level);
      } catch (err) {
        if (!cancelled) {
          console.error('Fehler beim Laden des Levels:', err);
          setError(`Level ${currentLevel} konnte nicht geladen werden.`);
          setLevelData(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchLevel();
    return () => { cancelled = true; };
  }, [currentLevel]);

  const handleTabChange = (tabName: TabName) => {
    if (tabName === activeTab) return;
    setTabTransition(tabName === 'levels' ? 'left' : 'right');
    setActiveTab(tabName);
  };

  const handleSelectLevel = (level: number) => {
    setGeneratedLevel(null);
    setCurrentLevel(level);
  };

  const handleGenerateLevel = (difficulty: Exclude<Difficulty, 'unknown'>) => {
    handleTabChange('home');
    setIsLoading(true);
    // setTimeout, damit der Lade-Spinner rendert, bevor die (synchrone)
    // Generierung den Main-Thread beansprucht (Expert: einige Sekunden).
    setTimeout(() => {
      try {
        setGeneratedLevel(generateLevel({ difficulty }));
      } catch (err) {
        console.error('Fehler beim Generieren des Levels:', err);
        toast({ title: 'Fehler', description: 'Zufallslevel konnte nicht erzeugt werden.', status: 'error', duration: 3000, isClosable: true });
      } finally {
        setIsLoading(false);
      }
    }, 50);
  };
```

- [ ] **Step 3: Kopfzeile ersetzen**

Ersetze den `<Box as="header" ...>`-Block (bisher Zeilen 153-174):

```tsx
      <Box
        as="header"
        bg={headerBg}
        position="sticky"
        top={0}
        zIndex={999}
        boxShadow="sm"
        display={(isSidebarLayout || activeTab !== 'home') ? 'none' : 'block'}
      >
        <Container maxW={containerMaxWidth} h={headerHeight} px={4}>
          <Flex direction="row" align="center" justify="space-between" h="100%" gap={3}>
            <Heading as="h1" color={headerTextColor} fontSize={{ base: '18px', md: '20px' }} fontWeight="700" letterSpacing="-0.02em">
              Killer Sudoku
            </Heading>
            <Flex align="center" gap={1}>
              <HomeActions
                onOpenLevels={() => handleTabChange('levels')}
                blackAndWhiteMode={blackAndWhiteMode}
                onToggleBlackAndWhite={() => setBlackAndWhiteMode((v) => !v)}
              />
            </Flex>
          </Flex>
        </Container>
      </Box>
```

- [ ] **Step 4: Wisch-Wrapper durch einfache `Box` ersetzen, Tab-Inhalt anpassen**

Ersetze den `<SwipeableBox ...>...</SwipeableBox>`-Block (bisher Zeilen 176-216):

```tsx
      <Box minH="calc(100vh - 56px)" bg="surface.canvas">
        <Container maxW={containerMaxWidth} px={3} py={4} pb="64px" mx="auto" w="100%">
          {activeTab === 'home' && (
            <HomeTab
              currentLevel={currentLevel}
              levelData={generatedLevel ?? levelData}
              puzzleId={generatedLevel ? `generated-${generatedLevel.id}` : undefined}
              isLoading={isLoading}
              error={error}
              blackAndWhiteMode={blackAndWhiteMode}
              transitionDirection={tabTransition}
              onOpenLevels={() => handleTabChange('levels')}
              onToggleBlackAndWhite={() => setBlackAndWhiteMode((v) => !v)}
            />
          )}
          {activeTab === 'levels' && (
            <LevelsTab
              currentLevel={currentLevel}
              onLevelChange={(l) => { handleSelectLevel(l); handleTabChange('home'); }}
              onGenerateLevel={handleGenerateLevel}
              onBack={() => handleTabChange('home')}
              transitionDirection={tabTransition}
            />
          )}
        </Container>
      </Box>
```

- [ ] **Step 5: Reset-Dialog + `BottomNavigation`-Rendering entfernen**

Lösche den kompletten `<AlertDialog ...>...</AlertDialog>`-Block (bisher Zeilen 218-231) und die Zeile `<BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} isDesktop={isDesktop} />` (bisher Zeile 233).

- [ ] **Step 6: `TutorialOverlay`-Aufruf beibehalten**

Der bestehende `<TutorialOverlay .../>`-Block (bisher Zeilen 235-248) bleibt unverändert stehen (inkl. schließendem `</ChakraProvider>` und `export default App;`).

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: keine Fehler mehr

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): zwei Screens (Start/Level) statt 5-Tab-Wisch-Navigation"
```

---

### Task 5: `App.test.tsx` aktualisieren

**Files:**
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: neue `App.tsx`-Struktur aus Task 4 (Level-Button in der Kopfzeile statt Bottom-Nav-Eintrag).

- [ ] **Step 1: Zweiten Test anpassen**

Ersetze den kompletten Dateiinhalt:

```tsx
import React from 'react';
import { fireEvent, render, screen } from './test-utils';
import App from './App';

test('renders Killer Sudoku header', async () => {
  render(<App />);
  // Header ist in der App-Bar; bei asynchronem Level-Load kann die initiale
  // Render-Welle etwas dauern.
  const headingElement = await screen.findByRole('heading', { name: /killer sudoku/i });
  expect(headingElement).toBeInTheDocument();
});

test('Zufallslevel-Generator ist über den Level-Button erreichbar', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /^Überspringen$/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Level' }));

  expect(screen.getByRole('heading', { name: 'Zufallslevel erstellen' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Neues Zufallslevel erstellen: Einfach' })).toBeInTheDocument();
});

test('Zurück-Button auf dem Level-Screen führt zurück zum Start', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /^Überspringen$/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Level' }));
  fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));

  expect(await screen.findByRole('button', { name: 'Level' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Tests ausführen**

Run: `npx jest src/App.test.tsx`
Expected: PASS (3 Tests). Falls „fetch is not defined"-Warnungen im Log erscheinen: das ist ein vorbestehendes, unabhängiges jsdom-Umgebungsproblem (bereits vor diesem Plan reproduziert, betrifft `loadLevelByNumber`s Error-Pfad, nicht die hier getesteten Assertions) — kein Grund zum Blocken, solange die drei Tests grün sind.

- [ ] **Step 3: Commit**

```bash
git add src/App.test.tsx
git commit -m "test(app): Tests auf Level-Button + Zurueck-Button umgestellt"
```

---

### Task 6: Aufräumen, volle Verifikation, Deploy

**Files:**
- Delete: `src/components/common/BottomNavigation.tsx`
- Delete (bedingt, siehe Step 1): `src/components/common/SwipeableBox.tsx`, `src/components/common/SwipeableBox.test.tsx` (falls vorhanden)

- [ ] **Step 1: Prüfen, ob `SwipeableBox` noch irgendwo importiert wird**

Run: `grep -rln "SwipeableBox" src`
Expected: nur noch `src/components/common/SwipeableBox.tsx` selbst (und ggf. sein eigener Test) — `App.tsx` referenziert es seit Task 4 nicht mehr. Falls das zutrifft, weiter mit Step 2. Falls noch ein anderer Aufrufer gefunden wird: **nicht löschen**, stattdessen diesen Fund im Commit-Message-Body dokumentieren und Step 2 überspringen.

- [ ] **Step 2: `BottomNavigation.tsx` und (falls Step 1 grün) `SwipeableBox.tsx` löschen**

```bash
git rm src/components/common/BottomNavigation.tsx
git rm src/components/common/SwipeableBox.tsx
# falls vorhanden:
git rm src/components/common/SwipeableBox.test.tsx
```

- [ ] **Step 3: Vollen Testlauf + Typecheck**

Run: `npm run typecheck && npx jest`
Expected: beide grün. (Falls ein Test explizit `BottomNavigation` oder `SwipeableBox` importiert und dadurch fehlschlägt, diesen Test mit `git rm` entfernen — er testet entfernten Code.)

- [ ] **Step 4: Production-Build**

Run: `npm run build`
Expected: Build erfolgreich, `build/`-Ordner wird neu erzeugt.

- [ ] **Step 5: Visuelle Verifikation (Playwright, wie in dieser Session etabliert)**

Serviere den frischen Build auf einem Scratch-Port (NICHT den Produktions-Port 8083!):

```bash
(npx vite preview --port 4189 --strictPort > /tmp/preview4189.log 2>&1 &)
sleep 2
cat /tmp/preview4189.log
```

Screenshot-Skript (Wegwerf-Datei im Projektroot, danach löschen):

```js
// shot-nav.mjs
import { chromium } from 'playwright';

const viewports = [
  { w: 390, h: 844, name: 'mobil' },
  { w: 1920, h: 1080, name: 'desktop' },
];

const browser = await chromium.launch();
for (const v of viewports) {
  const page = await browser.newPage({ viewport: { width: v.w, height: v.h } });
  await page.goto('http://localhost:4189/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const skip = await page.$('text=Überspringen');
  if (skip) await skip.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `nav-${v.name}-start.png` });

  await page.getByRole('button', { name: 'Level' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `nav-${v.name}-level.png` });

  await page.close();
}
await browser.close();
```

```bash
node shot-nav.mjs
```

Sieh dir die vier Screenshots (`nav-mobil-start.png`, `nav-mobil-level.png`, `nav-desktop-start.png`, `nav-desktop-level.png`) an und bestätige:
- Mobil-Start: Kopfzeile mit Titel + Level-Button + zwei Toggle-Icons, kein Wischen mehr nötig um zu navigieren.
- Desktop-Start: keine Kopfzeile, Sidebar unter Reset/Undo/Redo zeigt Level-Button + zwei Toggle-Icons.
- Beide Level-Screens: Zurück-Pfeil oben, Zufallslevel-Generator, Level-Auswahl, Impressum/Datenschutz-Footer unten.

Danach aufräumen:

```bash
pkill -f "vite preview --port 4189"
rm -f shot-nav.mjs nav-mobil-start.png nav-mobil-level.png nav-desktop-start.png nav-desktop-level.png
```

- [ ] **Step 6: Deploy**

```bash
sudo systemctl restart killersudoku
sleep 2
systemctl is-active killersudoku
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8083/
```

Expected: `active`, `200`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: BottomNavigation/SwipeableBox entfernt, Navigation-Redesign abgeschlossen"
```
