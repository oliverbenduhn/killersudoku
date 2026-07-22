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

Ziel dieses Redesigns: Navigation, die auf jedem Formfaktor zum verfügbaren
Platz passt, ohne Wischen als einzigen/versteckten Navigationsweg, und ohne
die Bottom-Bar auf Desktop.

## Ziel-Design

### Mobil (`base`, < `md`)

Kopfzeile bleibt wie heute (Titel „Killer Sudoku" links, Level-Auswahl auf
dem Start-Tab), zusätzlich ein Hamburger-Icon rechts. Klick öffnet ein
Dropdown-Menü (Chakra `Menu`/`MenuList`) mit den 5 Tabs (Icon + Label je
Eintrag). Auswahl eines Eintrags wechselt den Tab und schließt das Menü.

Wischen zwischen Tabs (`SwipeableBox`, `handleSwipe` in `App.tsx`) wird
vollständig entfernt — Navigation ausschließlich über das Menü.

### Desktop / Sidebar-Layout (ab `md`, d. h. Tablet-Quer + Desktop)

Keine Kopfzeile. Die rechte Sidebar-Spalte (aktuell: Zahlenfeld 1–9 +
Tipp/Hinweis/Reset/Undo/Redo) bekommt unten einen neuen Block:

- Trennlinie
- Titel „Killer Sudoku"
- Die 5 Tabs als Buttons (Icon + Label je Eintrag, volle Klickfläche),
  optisch zurückhaltend/ohne Farbakzent — bewusst abgesetzt von den
  farbigen Spiel-Aktions-Buttons darüber (Tipp/Hinweis blau, Reset/Undo/Redo
  ghost)

Damit dieser Block nicht zu hoch wird, werden Tipp/Hinweis/Reset/Undo/Redo in
der Sidebar **immer** icon-only dargestellt (aktuell zeigen sie ab der
`lg`-Breite noch Text zusätzlich zum Icon — das entfällt). Das Zahlenfeld
(1–9) bleibt unverändert.

Da die Sidebar-Spalte bereits ab `md` existiert (nicht erst ab `lg`), ist die
bisherige Navigations-Lücke im Tablet-Quer-Bereich damit automatisch mit
gelöst.

## Komponenten

- **`BottomNavigation.tsx`** — wird komplett entfernt (Datei + Import +
  Verwendung in `App.tsx`).
- **Gemeinsame Tab-Konfiguration** — neue Datei, z. B.
  `src/config/navItems.ts`, mit `{ id, label, icon }[]` für die 5 Tabs.
  Ersetzt die aktuell in `BottomNavigation.tsx` lokal definierte
  `navItems`-Liste. Wird von beiden neuen Komponenten importiert, damit
  Icons/Labels nur an einer Stelle gepflegt werden.
  - Der „Level"-Tab bekommt dabei ein neues Icon (nicht mehr `HamburgerIcon`,
    da dieses Symbol jetzt für den mobilen Menü-Trigger reserviert ist) —
    z. B. `StarIcon`/ein Listen-Icon; genaue Wahl in der Umsetzung.
- **Neue Komponente `MobileHeaderMenu.tsx`** (Name kann in der Umsetzung
  variieren) — Hamburger-Icon-Button + `Menu`/`MenuList` mit den Tab-Einträgen
  aus der gemeinsamen Konfiguration. Wird in `App.tsx`s Kopfzeile gerendert,
  nur sichtbar wenn `!isSidebarLayout` (Mobil).
- **Neue Komponente `SidebarNav.tsx`** (Name kann variieren) — Titel + Liste
  der Tab-Buttons aus der gemeinsamen Konfiguration. Wird innerhalb von
  `Board.tsx` in der Sidebar-Spalte gerendert, unterhalb der
  Aktions-Buttons, nur wenn `flexDirection === "row"`.
- **`Board.tsx`** — bekommt zwei neue Props: `activeTab: string` und
  `onTabChange: (tab: string) => void`, um `SidebarNav` zu befüllen. Die
  `isMobile`-Unterscheidung für Tipp/Hinweis/Reset/Undo/Redo entfällt, diese
  Buttons sind grundsätzlich icon-only.
- **`App.tsx`** — Kopfzeile bekommt `MobileHeaderMenu` rechts vom Titel
  (bzw. rechts von der Level-Auswahl, wenn die sichtbar ist). `SwipeableBox`
  und `handleSwipe`/`calcTransition`-Wischlogik werden entfernt (die
  Tab-Wechsel-Animation selbst — links/rechts-Slide je nach Tab-Reihenfolge —
  bleibt, die läuft schon heute auch bei Direktklicks in der Bottom-Nav).
  `BottomNavigation`-Rendering wird entfernt, `Board` bekommt die neuen
  Props `activeTab`/`onTabChange` durchgereicht.

## Datenfluss

Keine Änderung am State-Modell: `activeTab` lebt weiterhin in `App.tsx`,
`handleTabChange` bleibt die einzige Stelle, die ihn setzt (inkl.
Transition-Richtung über `calcTransition`). Sowohl `MobileHeaderMenu` als
auch `SidebarNav` rufen nur `onTabChange(id)` auf — wie die aktuelle
Bottom-Nav auch. Layout-Entscheidung (welche der beiden Komponenten
gerendert wird) bleibt weiterhin rein CSS-Breakpoint-basiert
(`isSidebarLayout` bzw. `flexDirection`), kein zusätzlicher State.

## Edge Cases

- **Level-Auswahl im mobilen Header**: bleibt wie bisher nur auf dem
  Start-Tab sichtbar, unabhängig vom neuen Hamburger-Menü daneben.
- **Sidebar-Nav-Höhe**: Durch icon-only Aktions-Buttons soll die Sidebar auch
  mit dem neuen Nav-Block nicht höher werden als das Brett. Falls das auf
  sehr kurzen Viewports (kleine Fensterhöhe bei breitem Fenster) doch knapp
  wird, greift das bestehende `overflowY="auto"` der Sidebar-Spalte
  (Scrollen statt Clipping) — keine neue Mechanik nötig.
- **Tutorial-Overlay**: unabhängig von dieser Änderung, keine Berührung.

## Testing

- `App.test.tsx`: bestehender Test klickt aktuell auf einen Button namens
  "Level" (Bottom-Nav-Eintrag) — muss auf die neue Navigation angepasst
  werden (Hamburger öffnen, dann „Level" im Menü klicken, im Test-Viewport
  der mobilen Variante; oder direkt den `SidebarNav`-Button, je nachdem
  welches Layout im Test-Viewport aktiv ist).
- `Board.test.tsx`: Mocks/Props um `activeTab`/`onTabChange` ergänzen, neuer
  Snapshot-/Rendering-Check dass `SidebarNav` im Sidebar-Modus erscheint.
- Kein neuer Test für Swipe nötig (wird entfernt, nicht ersetzt).
- Visuelle Verifikation wie bei den letzten Layout-Fixes: Playwright-Screenshots
  bei typischen Mobil- und Desktop-Viewports vor dem Deploy.

## Out of Scope

- Keine Änderung an den Tab-Inhalten selbst (`Tabs.tsx`).
- Keine Änderung an der Tutorial-Overlay-Navigation.
- Kein neuer State-Mechanismus für Navigation — reines Komponenten-/
  Layout-Redesign auf Basis der bestehenden `activeTab`/`onTabChange`-Logik.
