# Navigation-Redesign (Mobil + Desktop)

## Kontext / Problem

Die aktuelle Navigation ist auf Mobil und Desktop strukturell unterschiedlich
und in beiden Fällen unvollständig:

- **Mobil** (`base`, < `md`): Kopfzeile mit Titel + Level-Auswahl ist sichtbar.
  Zwischen den 5 Tabs (Start, Level, Statistik, Info, Einstellungen) kann nur
  per Wischen gewechselt werden (`SwipeableBox` in `App.tsx`). Kein direkter
  Sprung zu einem beliebigen Tab möglich, keine sichtbare Liste der
  verfügbaren Tabs.
- **Tablet-Quer** (`md` bis `lg`): Weder Kopfzeile (`isSidebarLayout` blendet
  sie ab `md` aus) noch Bottom-Nav (`isDesktop` zeigt sie erst ab `lg`) —
  einzige Navigation ist Wischen. Bislang unbemerkte Lücke.
- **Desktop** (`lg+`): Volle Bottom-Nav mit Icons + Text-Labels für alle 5
  Tabs, aber keine Kopfzeile. Optisch nicht gewünscht (User-Feedback).

Im Zuge der Diskussion hat sich herausgestellt, dass drei der fünf Tabs
(Statistik, Info, Einstellungen) inhaltlich verzichtbar sind bzw. sich in
zwei Icon-Toggles auf dem Hauptbildschirm auflösen lassen. Das vereinfacht
das eigentliche Navigationsproblem erheblich: statt einer 5-Punkte-Navigation
braucht die App nur noch **zwei Screens** mit einfachem Hin-und-Zurück.

## Ziel-Design

### Screens

Es gibt nur noch zwei Screens:

1. **Start** — Spielbrett (bisher `HomeTab`)
2. **Level** — Zufallslevel-Generator + Level-Auswahl (bisher `LevelsTab`,
   Inhalt unverändert)

Die Tabs **Statistik**, **Info** und **Einstellungen** entfallen komplett:

- **Statistik**: Tab + zugehöriger State/Fetch in `App.tsx` (`stats`,
  `loadStatistics`-Effect) werden entfernt. Die zugrunde liegende Aufzeichnung
  von Solve-Statistiken (`statisticsService`, aufgerufen aus
  `useBoardGameLogic`/`Board.tsx` beim Lösen eines Levels) bleibt unverändert
  bestehen — es wird nur die Anzeige entfernt, nicht die Datenerfassung.
- **Info**: Tab entfällt ersatzlos. Die Spielregeln werden bereits im
  Tutorial erklärt.
- **Einstellungen**: Tab entfällt komplett, inklusive:
  - "Alle Level zurücksetzen" (Button + Bestätigungsdialog
    `AlertDialog`/`isResetDialogOpen`/`handleResetAllLevels` in `App.tsx`) —
    ersatzlos entfernt, kein Reset-Zugang mehr in der UI.
  - "Tutorial erneut ansehen" (`onRestartTutorial`/`tutorial.restart`) —
    ersatzlos entfernt. Das Tutorial erscheint weiterhin automatisch beim
    ersten Start (unverändertes Verhalten von `useTutorial`), nur der manuelle
    Wiederaufruf fällt weg.
  - Dark Mode und Schwarzweiß-Modus ziehen als Icon-Toggles auf den
    Start-Screen um (siehe unten) — die zugrunde liegenden Mechanismen
    (`useColorMode`, `blackAndWhiteMode`-State in `App.tsx`) bleiben
    unverändert, nur die Bedienelemente wandern.

### Neue Bedienelemente auf dem Start-Screen

Drei Elemente kommen zum Start-Screen dazu: **Level-Button** (navigiert zum
Level-Screen), **Dark-Mode-Toggle** (Icon-Button, `MoonIcon`/`SunIcon` je nach
`colorMode`), **Schwarzweiß-Toggle** (Icon-Button, `ViewIcon`/`ViewOffIcon` je
nach `blackAndWhiteMode`).

- **Mobil** (`base`, < `md`): in der bestehenden Kopfzeile, an der Stelle, wo
  aktuell die Level-Auswahl (`LevelSelector`, kompakte Variante) sitzt. Die
  kompakte Dropdown-Auswahl entfällt dabei — der Level-Button navigiert
  stattdessen zum vollen Level-Screen.
- **Desktop/Sidebar-Layout** (ab `md`): in der rechten Sidebar-Spalte
  (aktuell: Zahlenfeld + Tipp/Hinweis/Reset/Undo/Redo), unterhalb der
  Aktions-Buttons — an der Stelle, die vorher für das 5-Tab-Nav-Menü
  vorgesehen war. Damit bleibt die aus der vorherigen Design-Runde
  beschlossene Vereinfachung bestehen: Tipp/Hinweis/Reset/Undo/Redo sind in
  der Sidebar immer icon-only (nicht mehr nur bis `md`, auch ab `lg`), damit
  unten Platz für die drei neuen Buttons ist. Das Zahlenfeld (1–9) bleibt
  unverändert.

Da Level-Button, Dark-Mode- und Schwarzweiß-Toggle Teil des **Start-Screens**
sind (nicht Teil von `Board.tsx`s Spiellogik), aber auf Desktop optisch in
Board's Sidebar-Spalte sitzen sollen, rendert `Board.tsx` sie über einen
Slot/Children-Mechanismus — siehe Komponenten-Abschnitt. Das löst das in der
vorherigen Runde gefundene Problem (Sidebar existierte nur auf dem
Start-Tab) von selbst, weil es jetzt nur noch einen Screen gibt, der
überhaupt eine Sidebar hat (Level-Screen hat keine).

### Level-Screen

Bekommt oben einen Zurück-Pfeil (führt zurück zu Start) + Titel "Level".
Inhalt darunter ist unverändert der bisherige `LevelsTab`-Inhalt
(Zufallslevel-Generator + volle Level-Auswahl-Liste). Auf Mobil und Desktop
gleich aufgebaut (eigene Kopfzeile mit Zurück-Pfeil, kein Sidebar-Layout
nötig, da kein Spielbrett).

## Komponenten

- **Entfernt:** `BottomNavigation.tsx`, `SwipeableBox`-Nutzung in `App.tsx`
  (Datei `SwipeableBox.tsx` selbst kann bleiben falls anderswo genutzt —
  Prüfung in Task 1), `StatsTab`, `InfoTab`, `SettingsTab` aus `Tabs.tsx`,
  `AlertDialog`-Reset-Block + `isResetDialogOpen`/`handleResetAllLevels` aus
  `App.tsx`, `stats`-State + `loadStatistics`-Effect aus `App.tsx`,
  `TutorialOverlay`s `onRestartTutorial`-Prop-Verwendung (Prop bleibt in
  `TutorialOverlay`, nur der Aufrufer in `App.tsx` verliert den Button dafür
  — `tutorial.restart` wird schlicht nicht mehr verdrahtet).
- **`App.tsx`**: `activeTab` wird zu `'home' | 'levels'` (kein `TAB_ORDER`-Array
  mehr nötig, da nur 2 Screens — direkter Toggle statt Index-Vergleich).
  Kopfzeile zeigt auf Mobil (`!isSidebarLayout`) im Start-Zustand: Titel +
  Level-Button + Dark-Mode-Toggle + Schwarzweiß-Toggle. Im Level-Zustand auf
  Mobil: Zurück-Pfeil + Titel „Level" (eigene, einfachere Kopfzeile).
- **Neue Komponente `HomeActions.tsx`** (`src/components/common/`) — die drei
  Buttons (Level, Dark-Mode, Schwarzweiß) als eigenständige, layoutlose
  Komponente (nur die Buttons, kein Wrapper-Styling), die sowohl in der
  mobilen Kopfzeile als auch in `Board.tsx`s Sidebar gerendert werden kann.
  Props: `onOpenLevels: () => void`, `blackAndWhiteMode: boolean`,
  `onToggleBlackAndWhite: () => void`. Nutzt intern `useColorMode` direkt für
  den Dark-Mode-Toggle (kein Prop nötig, genau wie bisher in `SettingsTab`).
- **`Board.tsx`**: bekommt eine neue Prop `sidebarFooter?: React.ReactNode`.
  Wird **nur wenn `flexDirection === "row"`** (Sidebar-/Desktop-Layout) am
  Ende der Sidebar-Spalte gerendert, unterhalb der Aktions-Buttons — im
  Column-Layout (Mobil) wird die Prop ignoriert/nicht gerendert, da dort
  `App.tsx` die gleichen Buttons bereits separat in der Kopfzeile zeigt
  (sonst erschienen sie doppelt). `Board.tsx` kennt `HomeActions` inhaltlich
  nicht, nur einen generischen Slot. Die `isMobile`-Unterscheidung für
  Tipp/Hinweis/Reset/Undo/Redo entfällt, diese Buttons sind grundsätzlich
  icon-only.
- **`Tabs.tsx`**: `HomeTab` bekommt neue Props `onOpenLevels`,
  `blackAndWhiteMode`, `onToggleBlackAndWhite`, reicht sie *unconditional*
  als `sidebarFooter={<HomeActions .../>}` an `Board` durch — die
  Sichtbarkeits-Entscheidung (Mobil vs. Desktop) trifft ausschließlich
  `Board.tsx` intern über `flexDirection` (s.o.), `HomeTab` muss den
  Breakpoint nicht selbst auswerten. `LevelsTab` bekommt eine neue Prop
  `onBack: () => void` und rendert oben einen Zurück-Button (Icon
  `ArrowBackIcon` + Text „Zurück").
- **`LevelSelector.tsx`**: keine Änderung — wird weiterhin mit
  `fullWidth={true}` im Level-Screen genutzt. Die kompakte
  (`fullWidth={false}`) Variante wird nirgends mehr eingebunden, die
  Komponente selbst bleibt aber (kein Grund, den Code zu entfernen, falls
  später wieder gebraucht — Datei bleibt, nur der eine Call-Ort mit
  `fullWidth={false}` in `App.tsx`s Kopfzeile fällt weg).

## Datenfluss

`activeTab` (jetzt `'home' | 'levels'`) lebt weiterhin in `App.tsx`.
`handleTabChange` reduziert sich auf einen einfachen Setter (kein
`calcTransition`/Richtungs-Array-Vergleich mehr nötig, aber die
Slide-Transition selbst bleibt: bei `home → levels` slided „left", bei
`levels → home` slided „right", fest verdrahtet statt über Index-Vergleich
berechnet). `HomeActions`' `onOpenLevels` ruft `handleTabChange('levels')`,
`LevelsTab`s neuer Zurück-Button ruft `handleTabChange('home')`.
`blackAndWhiteMode` und `useColorMode` unverändert wie bisher, nur die
aufrufenden Bedienelemente ziehen um.

## Edge Cases

- **Generiertes Level auswählen**: bestehendes Verhalten
  (`onLevelChange={(l) => { handleSelectLevel(l); handleTabChange('home'); }}`
  in `App.tsx`) bleibt — nach Auswahl/Generieren eines Levels geht's
  automatisch zurück zum Start-Screen.
- **Sidebar-Footer nur im Sidebar-Layout**: Auf Mobil (`flexDirection ===
  "column"`) wird `sidebarFooter` nicht in `Board.tsx` gerendert (dort sitzen
  die drei Buttons ja stattdessen in der Kopfzeile) — `HomeTab` entscheidet
  anhand des gleichen Breakpoints wie `App.tsx` (`isSidebarLayout`), ob es
  `sidebarFooter` an `Board` durchreicht oder die Buttons stattdessen separat
  (für die mobile Kopfzeile) an `App.tsx` zurückgibt. Konkret: `App.tsx`
  rendert `HomeActions` selbst direkt in der mobilen Kopfzeile (nicht über
  `HomeTab`/`Board` durchgereicht) — nur der Desktop-Weg läuft über
  `Board`s `sidebarFooter`-Prop. Damit gibt es keine doppelte
  Bedingungsprüfung an zwei Stellen für dieselbe Sache.
- **Sidebar-Höhe**: durch icon-only Aktions-Buttons + nur 3 kompakte Buttons
  im Footer (statt vorher angedachter 5-Punkte-Liste) bleibt die Sidebar
  deutlich niedriger als das Brett. Bestehendes `overflowY="auto"` fängt
  verbleibende Edge-Cases ab.

## Testing

- `App.test.tsx`: bestehender Test klickt aktuell auf "Überspringen" (Tutorial)
  dann auf einen Button "Level" (Bottom-Nav) — wird angepasst auf: Tutorial
  überspringen, dann auf den neuen Level-Button klicken (mobiler Viewport,
  Standard in Tests), prüfen dass Level-Screen-Inhalt erscheint.
- `Board.test.tsx`: Mock/Props um `sidebarFooter` ergänzen, Test dass
  übergebener Inhalt im Sidebar-Modus erscheint.
- Kein neuer Test für Swipe, Stats, Info, Settings nötig (werden entfernt,
  nicht ersetzt). Vorhandene Tests für diese Tabs (falls es welche gibt)
  werden mit entfernt.
- Visuelle Verifikation wie bei den letzten Layout-Fixes:
  Playwright-Screenshots bei typischen Mobil- und Desktop-Viewports vor dem
  Deploy (Start-Screen mit neuen Buttons, Level-Screen mit Zurück-Button, auf
  beiden Formfaktoren).

## Out of Scope

- Keine Änderung an `statisticsService`/Solve-Recording selbst (nur die
  Anzeige verschwindet).
- Keine Änderung an der Tutorial-Overlay-Navigation oder ihrem
  Auto-Start-Verhalten.
- Kein neuer State-Mechanismus — reines Komponenten-/Layout-Redesign auf
  Basis der bestehenden `activeTab`/Handler-Logik.
- `SwipeableBox.tsx` als Komponente wird nicht gelöscht, nur ihre Verwendung
  in `App.tsx` entfernt (Datei-Löschung nur falls Task-1-Prüfung zeigt, dass
  sie nirgends sonst importiert wird).
