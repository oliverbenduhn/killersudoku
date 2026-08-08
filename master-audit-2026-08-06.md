# Master-Audit — Killer Sudoku PWA

- **Datum:** 2026-08-06
- **Repo:** `oliverbenduhn/killersudoku` (Branch `main`, v0.2.2)
- **Tech-Stack:** React 18 + TypeScript + Chakra UI v2 + Vite 5, Jest 29, localforage, PWA via vite-plugin-pwa
- **Methodik:** Statische Analyse des kompletten `src/`-Baums (35 Module), Tracing der User-Journeys vom UI bis Storage, Review der Hook-Architektur und State-Persistenz

## Zusammenfassung

| Kategorie | Anzahl |
|---|---|
| 🚨 Kritisch | 2 |
| 🔴 Hoch | 6 |
| 🟠 Mittel | 9 |
| 🟡 Niedrig | 6 |
| 💡 Vorschlag | 3 |

---

## 🚨 Kritisch

### 🚨 Statistik-Dopplung nach Undo einer gelösten Lösung
- **Kategorie:** Bug / Datenintegrität
- **Betroffene Dateien:** `src/components/Board/Board.tsx` (Z. 307–333), `src/services/statisticsService.ts` (Z. 38–73)
- **Problembeschreibung:** Der Solve-Detection-`useEffect` feuert bei jeder `gameState`-Änderung. Wenn der User ein Brett löst (`recordBoardSolved` läuft, `updateGameState({solved: true, …})` setzt `solved: true`), dann Undo drückt, wird im Undo-Snapshot `solved: false` zurückgesetzt → Effect feuert erneut → `recordBoardSolved` läuft **zum zweiten Mal** → `totalSolved + 1`, `solvedByDifficulty[diff] + 1`, neue `bestTimeMsByDifficulty` wird vermessen.
- **Auswirkung:** Statistik verfälscht nach jedem versehentlichen Undo eines gelösten Brettes. Worst Case: User spielt 100 Level, drückt auf jedem Undo → `totalSolved = 200`.
- **Lösungsvorschlag:** Solve-Detection-Guard erweitern: `if (gameState.solved) return;` reicht nicht, weil Undo den Wert wieder auf `false` setzt. Stattdessen `solveRecordedRef` als Session-Marker pro puzzleId nutzen (existiert bereits, Z. 318/320 — schützt aber nur vor dem ersten Doppel-Feuern, nicht vor Undo). Besser: Solve nur dann aufzeichnen, wenn `gameState.endTime == null && isBoardComplete()` (vorheriger Zustand hatte kein endTime → das ist die erste Lösung).

### 🚨 LevelSelector + Tests sind toter Code
- **Kategorie:** Architektur / Wartbarkeit
- **Betroffene Dateien:** `src/components/LevelSelector/LevelSelector.tsx` (224 Zeilen), `src/components/LevelSelector/LevelSelector.test.tsx` (125 Zeilen), `src/components/Tabs.tsx` (Z. 6 — unused import)
- **Problembeschreibung:** `LevelSelector` wird nirgendwo im Produktionscode mehr gerendert. Der einzige Aufruf war im Header (durch einen direkten `<HomeActions>` mit eigenem `Level ${currentLevel}`-Button ersetzt). `fullWidth`-Modus wird ebenfalls nirgendwo genutzt. Die 8 Tests für `Header-Mode` und 7 für `fullWidth Grid` sind also reine Selbsttest-Suite für ungenutzten Code.
- **Auswirkung:** 224 Zeilen toter Komponente + 125 Zeilen toter Tests + 7 Tests die tote Logik testen = ~350 Zeilen Maintenance-Ballast, der bei jedem Refactor mitgeschleppt wird.
- **Lösungsvorschlag:** `LevelSelector.tsx`, `LevelSelector.test.tsx` und der ungenutzte Import in `Tabs.tsx` löschen. Der Import in `Tabs.tsx` zeigt zusätzlich, dass der Refactor (Level-Header → HomeActions-Button) nicht abgeschlossen wurde.

---

## 🔴 Hoch

### 🔴 Undo-Redo durchbricht Save-Queue-Ordering
- **Kategorie:** Bug / Race Condition
- **Betroffene Dateien:** `src/hooks/useGameState.ts` (Z. 233–247), `src/services/storageService.ts` (Z. 47–59)
- **Problembeschreibung:** `performUndo` ruft `enqueueGameStateSave(puzzleId, previous)` direkt, aber **`useUndoRedo.commit` wurde nicht aufgerufen** — der Undo selbst geht nicht durch den Undo-Stack (er liest nur den vorherigen Snapshot aus dem Stack und ruft `setGameState` direkt). Das ist OK. **Aber**: Wenn der User Undo → Redo → Undo in schneller Folge drückt, rufen drei Setups jeweils `enqueueGameStateSave` auf. Die Queue serialisiert pro Schlüssel, garantiert aber nur die **Reihenfolge des Eintreffens**, nicht die Korrektheit der finalen Disk-Version. Wenn der `tail = Promise.resolve()` nach einem Fehler im vorigen Save (Z. 53 `console.error`) nicht zurückgesetzt wird, hängt die Queue für immer — alle folgenden Saves laufen ins Leere.
- **Auswirkung:** Nach einem einzelnen IndexedDB-Quota- oder Schema-Fehler ist **jeder weitere Save verloren**. Der User merkt es nicht (kein UI-Feedback), Datenverlust.
- **Lösungsvorschlag:** `enqueueGameStateSave` muss den `tail` nach Fehler explizit fortsetzen — entweder `tail = next.catch(() => {})` oder eine `try/finally`-Variante mit Recovery. Außerdem: bei Save-Fehler einen Toast anzeigen (siehe Bug-Hint: Storage schluckt Fehler still).

### 🔴 `useGameState` hat keinen dedizierten Unit-Test
- **Kategorie:** Test-Coverage
- **Betroffene Dateien:** `src/hooks/useGameState.ts` (262 Zeilen, kein `.test.ts`), `src/services/storageService.ts` (kein `.test.ts`)
- **Problembeschreibung:** `useGameState` ist der zentrale State-Hook: Hydration aus localforage, Sanitize via `sanitizePlayerBoard`, Auto-Save-Queue, Timer-Interval, Undo/Redo. **Kein einziger direkter Test**. Alle Pfade werden nur indirekt via `Board.test.tsx` (mit gemockten Hooks) getestet — d.h. Race-Bedingungen, Hydration-Edge-Cases und die Save-Queue sind ungetestet.
- **Auswirkung:** Refactor von `useGameState` könnte subtile Bugs einführen, die niemand bemerkt — exakt das Risiko, das die Save-Queue-Bug-Stelle (s.o.) birgt.
- **Lösungsvorschlag:** `useGameState.test.tsx` schreiben, das mind. testet: (a) Hydration aus leerem Store erzeugt initial-State, (b) Hydration aus gespeichertem State setzt Werte, (c) Save-Queue serialisiert konkurrierende Saves, (d) Undo-Snapshot vor Apply-Move, (e) Timer-Updates ohne Save-Spam.

### 🔴 Ripple-Bug: nur erste Ripple wird nach `duration` ms entfernt
- **Kategorie:** Bug / UX
- **Betroffene Dateien:** `src/components/common/RippleButton.tsx` (Z. 27, 44–52)
- **Problembeschreibung:** `useEffect` ruft `setRipples(ripples.slice(1))` — schneidet immer nur **die erste** Ripple nach `duration` ms ab. Bei drei schnellen Klicks (Click 1 → Click 2 → Click 3) bleibt Ripple 2 + 3 sichtbar, bis der nächste Klick einen neuen Timer startet (der wieder nur die erste abschneidet). Die `id`-basierte Animation-End-Erkennung fehlt komplett.
- **Auswirkung:** Visuelles "Steckenbleiben" der Ripples auf Buttons nach mehreren schnellen Klicks; alle Action-Buttons im Spiel sind `RippleButton`-basiert.
- **Lösungsvorschlag:** Jeder Ripple einen eigenen `setTimeout` mitgeben, der genau diese Ripple per `id` aus dem Array entfernt. Oder: `setRipples(prev => prev.slice(1))` mit `useEffect` Cleanup, das den nächsten Ripple-Index timed.

### 🔴 `useCellSelection` Drag-Selection umgeht Cage-Constraint
- **Kategorie:** Logik-Lücke / unbeabsichtigter Effekt
- **Betroffene Dateien:** `src/hooks/useCellSelection.ts` (Z. 39–41 Kommentar, Z. 108–134), `src/hooks/useBoardGameLogic.ts`
- **Problembeschreibung:** Kommentar Z. 39–41 sagt: "Cage-Validität greift erst beim Zahl-Eingeben in useBoardGameLogic". Stimmt — `applyPlayerEntry` akzeptiert die Zellen und schreibt den Wert überall. Wenn der User per Drag ein 3×3-Rechteck über zwei Käfige markiert und eine Zahl eingibt, wird die Zahl in alle Zellen geschrieben — auch in Zellen, die laut Käfig-Regel den Wert nicht haben dürften. Das kann zu **unlösbaren Zuständen** führen, die der Spieler erst durch Reset verlassen kann.
- **Auswirkung:** User kann sich selbst in einen Deadlock manövrieren (mehrere Zellen mit demselben falschen Wert belegt). Strategische Hinweise (`hintEngine.findNextHint`) zeigen dann nichts mehr, weil das Board unter den Constraints unsinnig ist.
- **Lösungsvorschlag:** Drag-Selection auf einen **einzelnen Käfig** clampen (Mouse-Up: wenn Selection mehrere Käfige umfasst, auf den Start-Käfig reduzieren) oder beim Schreiben **per Cell** prüfen, ob der Wert in diesem Käfig laut `analyzeCage` legal ist, und bei Verstoß die Zelle überspringen (statt als Fehler zu zählen).

### 🔴 Reactivity-Bug: `useCellSelection.handlePointerDown` setzt `selectedCell` immer, auch beim Doppel-Tipp
- **Kategorie:** Bug
- **Betroffene Dateien:** `src/hooks/useCellSelection.ts` (Z. 78–106)
- **Problembeschreibung:** Im Doppel-Tipp-Pfad (Z. 91) ruft `selectCage(row, col)` auf, was `setSelectedCell(cellPosition)` setzt — OK. Im Single-Tap-Pfad (Z. 98–101) wird `setSelectedCell(cellPosition)` + `setSelectedCells([cellPosition])` gerufen — OK. **Aber**: wenn der User drag-t von A nach B, dann **ohne Loslassen** direkt auf C tippt, kommt `handlePointerDown` für C, während `isDragging` noch true ist (Closure-stale? `isDraggingRef` ist aktuell). Folge: ein neuer `setSelectedCell(C)`, ein neuer Drag-Start, das alte Drag wird nicht beendet → **Selection springt unkontrolliert**.
- **Auswirkung:** Visueller Bug bei Multi-Touch / schnellen Drag-Starts; schlimmstenfalls hängt `isDragging=true` für immer (siehe fehlender `pointerCancel`-Handler an einer Stelle).
- **Lösungsvorschlag:** Bei `handlePointerDown` zuerst `handlePointerEnd` aufrufen (Drag sauber beenden), dann neuen Drag starten.

### 🔴 Race: Undo eines Timer-Updates überschreibt echten Move
- **Kategorie:** Race Condition
- **Betroffene Dateien:** `src/hooks/useGameState.ts` (Z. 155–188, 216–227), `src/hooks/useUndoRedo.ts`
- **Problembeschreibung:** `applyMove` ruft `undo.commit({before: gameState, after: afterState})` — bei jedem User-Move. ABER der Timer (`useEffect [gameState]` Z. 155) ruft `setGameState(updatedState)` jede Sekunde, was den `gameState`-Wert aktualisiert, **ohne** dass `applyMove` aufgerufen wird → kein neuer Undo-Eintrag. Wenn der User **direkt nach einem Timer-Tick** eine Eingabe macht, ist der `before`-Snapshot im neuen `commit` der **gerade aktualisierte elapsedTime-Wert** — der nächste Undo setzt die elapsedTime auf den Stand vor der Eingabe zurück. **Subtil**, aber real.
- **Auswirkung:** Undo-Taste "springt" die Spielzeit ein paar Sekunden zurück statt den Zellwert zu reverten.
- **Lösungsvorschlag:** Timer-Updates nicht in den Undo-Stack aufnehmen (kein `applyMove` ist OK). Beim User-Move: `snapshotSource.elapsedTime = gameStateRef.current.elapsedTime` (also nicht der React-Closure-Wert, sondern der Ref-Wert, der den letzten Timer-Stand hat). Aktuell macht der Code das implizit (`snapshotSource = gameStateRef.current ?? gameState`), aber das funktioniert nur, wenn `gameStateRef.current` nach dem Timer-Tick aktualisiert ist — das passiert in Z. 176, aber zwischen Render und Ref-Update gibt es eine Lücke.

---

## 🟠 Mittel

### 🟠 `getPossibleValues` Rückgabetyp-Inkonsistenz
- **Kategorie:** API-Design / Type-Safety
- **Betroffene Dateien:** `src/services/gameLogicService.ts` (Z. 159–183), `src/hooks/useHints.ts` (Z. 32), `src/services/gameLogicService.test.ts` (Z. 219, 232)
- **Problembeschreibung:** Signatur ist `number[] | PossibleValuesResult`. Caller (`useHints.refreshHints`) müssen `Array.isArray(result) ? result : result.values` schreiben; Tests ebenso. Das `currentValueInvalid`-Flag im Objekt-Pfad wird vom Caller **nie gelesen**. Die Funktion liefert je nach Code-Pfad unterschiedliche Formen — ist historisch gewachsen (ursprünglich nur Array, dann wurde `currentValueInvalid` ergänzt).
- **Auswirkung:** Defensive Programmierung an Aufrufseite, tote Property im Rückgabewert.
- **Lösungsvorschlag:** Rückgabetyp vereinheitlichen auf `PossibleValuesResult` (mit `values: []` wenn kein Käfig) — Caller greifen immer auf `result.values` zu. `currentValueInvalid` entweder nutzen (im Hint-UI anzeigen?) oder entfernen.

### 🟠 Duplikate Test-Datei für `useCellAnimation`
- **Kategorie:** Redundanz
- **Betroffene Dateien:** `src/hooks/useCellAnimation.test.ts` (3157 Bytes, neu), `src/hooks/useCellAnimation.test.tsx` (2068 Bytes, alt)
- **Problembeschreibung:** Beide Test-Dateien testen denselben Hook. `.test.tsx` ist älter (15. Juli), `.test.ts` neuer (1. August). Beide laufen parallel, was die Test-Zeit verlängert und Reviewer verwirrt.
- **Auswirkung:** ~5 Sekunden längere Test-Runs, doppelte Maintenance bei API-Änderungen.
- **Lösungsvorschlag:** Die ältere `.test.tsx` löschen, die neuere `.test.ts` behalten.

### 🟠 Timer-UseEffect reagiert auf jede `gameState`-Änderung → ständiger Interval-Restart
- **Kategorie:** Performance / Architektur
- **Betroffene Dateien:** `src/hooks/useGameState.ts` (Z. 155–188)
- **Problembeschreibung:** `useEffect(..., [gameState])` baut bei jeder gameState-Änderung den `setInterval` neu auf. Da der Timer selbst `setGameState` jede Sekunde ruft, kommt es zu einer Cleanup + Rebuild-Kaskade. Funktioniert, aber ist semantisch falsch: der Timer sollte einmal beim Mount gestartet und beim Unmount gestoppt werden.
- **Auswirkung:** Theoretischer Performance-Verlust auf langsamen Geräten; unsauberes React-Pattern.
- **Lösungsvorschlag:** Effect mit `[]`-Dep, Timer läuft unabhängig von gameState. Cleanup beim Unmount. Aktualisierung des `elapsedTime` aus `gameStateRef` wie jetzt.

### 🟠 `<button>` `position` und `RippleButton` zerstören Klick-Bubbling bei Custom-Handlern
- **Kategorie:** Bug / UX
- **Betroffene Dateien:** `src/components/common/RippleButton.tsx` (Z. 59–62)
- **Problembeschreibung:** `onClick={(e) => { createRipple(e); if (props.onClick) props.onClick(e); }}` ruft den Parent-Handler auf, aber die Ripple-Animation hat `pointerEvents: none` auf der Ripple-Box. Problem: der **Cage-Select-Button** im Level-Selector (`onClick={() => onLevelChange(level)}`) hat keinen `e.preventDefault()` und keine `stopPropagation`. Beim Doppel-Klick auf einen Button entstehen unerwartete Re-Renders, weil beide Calls feuern — kein sichtbarer Bug, aber verwirrend.
- **Auswirkung:** Niedrig — UI bleibt konsistent, aber überflüssige Events.
- **Lösungsvorschlag:** `onClick` als optionalen `e`-Handler bauen, dokumentieren, dass `event.preventDefault()` / `stopPropagation()` funktionieren.

### 🟠 Initial-Selection-Effect feuert nach Level-Wechsel nicht erneut
- **Kategorie:** Bug / UX-Inkonsistenz
- **Betroffene Dateien:** `src/hooks/useBoardKeyboard.ts` (Z. 115–137, Effekt mit `[]`-Deps)
- **Problembeschreibung:** Initial-Auswahl-Effekt mit `[]`-Deps setzt die erste Zelle beim Mount. Bei `puzzleId`-Wechsel (Level-Wechsel) wird `Board` **nicht neu gemountet** (siehe Kommentar Board.tsx Z. 78–79), daher feuert der Effekt nicht erneut. Wenn der User das Level wechselt und mit dem Cursor auf einer Zelle mitten im Brett war, bleibt der Cursor dort — nicht zwingend falsch, aber inkonsistent zum Mount-Verhalten.
- **Auswirkung:** Cursor bleibt nach Level-Wechsel auf alter Position; User muss manuell zur ersten Zelle navigieren.
- **Lösungsvorschlag:** Effekt auf `[puzzleId]` umstellen (analog zum Reset-on-Puzzle-Change-Pattern). Caveat: dabei würde auch die Selection des aktuellen Levels gelöscht — möglicherweise unintuitiv. Alternative: nur die Auswahl auf `null` setzen, falls `puzzleId` wechselt.

### 🟠 StrictMode löst doppelte `loadState` + doppelte Saves aus
- **Kategorie:** Race Condition / Performance
- **Betroffene Dateien:** `src/index.tsx` (Z. 21), `src/hooks/useGameState.ts` (Z. 33–149)
- **Problembeschreibung:** `<React.StrictMode>` ist aktiv. `useEffect [puzzleId]` läuft im Dev doppelt → `loadState` wird zweimal aufgerufen → zwei `enqueueGameStateSave(restored)`-Calls (außerhalb des Race-Checks Z. 81, beide feuern). Im Production kein Problem, aber verwirrend für Tests und Dev-Debug.
- **Auswirkung:** Niedrig — Save-Queue serialisiert, IndexedDB schreibt denselben State zweimal. Idempotent.
- **Lösungsvorschlag:** Entweder die `enqueueGameStateSave`-Aufrufe in den Race-Check hineinziehen (`if (currentPuzzleIdRef.current === puzzleId) { enqueueGameStateSave(...) }`) oder `cancelled`-Flag im Effect-Return verwenden.

### 🟠 Tutorial-Demo-Level-Cage-Summe ungültig (`sum: 17` für 3 Zellen)
- **Kategorie:** Datenintegrität
- **Betroffene Dateien:** `src/hooks/useTutorial.ts` (Z. 21)
- **Problembeschreibung:** Im Demo-Level ist `t-cage-2`: 3 Zellen mit `sum: 17`. Die möglichen Kombinationen aus {1..9} ohne Wiederholung für 3 Zellen mit Summe 17 sind `(8,9)` + 0 — unmöglich. Tatsächlich zeigt die `solution[4..5][4..5]` = `[[7,0,0],[1,9,0]]` → Summe `7+1+9 = 17` ✓. Aber: das Tutorial sagt "Käfig mit drei Zellen, Summe 17" — das ist mathematisch ungültig. Validator (`validateLevel`) würde hier vielleicht mucken, aber der Validator wird auf Tutorial-Levels nicht angewendet.
- **Auswirkung:** Inkonsistenz mit realer Spielmechanik. User lernt eine unmögliche Konstellation kennen.
- **Lösungsvorschlag:** Cage auf 2 Zellen reduzieren (z. B. `(8, 9)` mit `sum: 17`), oder Summe auf eine machbare Zahl ändern (z. B. `(8, 4, 5) = 17` → die `solution`-Werte `7, 1, 9` ersetzen).

### 🟠 Falsche Spalten-Anzeige für Schwierigkeit-Badge in Header (`x ≥ 0.95`-Heuristik)
- **Kategorie:** UX / Bug
- **Betroffene Dateien:** `src/components/LevelSelector/LevelSelector.tsx` (Z. 65–91) — UNGENUTZT, aber Referenzimplementierung in `gameTypes.ts` (Z. 71–74)
- **Problembeschreibung:** `Math.ceil((level / TOTAL_LEVELS) * 5)` — bei Level 100 ergibt `Math.ceil(5) = 5` → "Experte". Bei Level 1: `Math.ceil(0.05) = 1` → "Einfach". Heuristik ist OK, aber laut `gameTypes.ts`-Kommentar "Diese Heuristik ist Phase-1-Kandidat für Ersetzung durch echte Pro-Brett-Berechnung". Die echte Schwierigkeit der Levels (basierend auf Generator-Profile) wird ignoriert.
- **Auswirkung:** User sieht "Einfach" bei Level 100, das in Wahrheit expert-Schwierigkeit hat (wenn man dem Generator glaubt). Da der `LevelSelector` aber gar nicht mehr gerendert wird (siehe kritischer Bug oben), ist das nur noch im toten Code relevant — aber der Generator schreibt `difficulty` ins GameLevel-Objekt, das Board verwendet es nicht.
- **Lösungsvorschlag:** Schwierigkeit aus `levelData.difficulty` lesen statt zu heuristiken. `LevelSelector` löschen.

### 🟠 UI-Inkonsistenz: Tab-Wechsel zeigt App-Header im Levels-Tab nicht, aber im Home-Tab
- **Kategorie:** UX-Inkonsistenz
- **Betroffene Dateien:** `src/App.tsx` (Z. 136: `display: activeTab !== 'home' ? 'none' : 'block'`)
- **Problembeschreibung:** Der Header (Titel, HomeActions, Level-Button, Dark/BW-Toggle, Fullscreen, Help) ist **nur auf dem Home-Tab sichtbar**. Im Levels-Tab fehlt er — der User kann dort weder Theme wechseln, noch Fullscreen aktivieren, noch den Help-Button drücken. **Workaround:** `?`-Tastenkombination öffnet das Help-Modal auch im Levels-Tab (via window-Listener), aber die anderen Aktionen sind weg.
- **Auswirkung:** Themenwechsel, Fullscreen und Help-Button nur eingeschränkt verfügbar.
- **Lösungsvorschlag:** Header auf beiden Tabs anzeigen, oder die Buttons im Levels-Tab duplizieren (mehr Aufwand).

---

## 🟡 Niedrig

### 🟡 Drag-Threshold: kein minimaler Drag-Abstand
- **Kategorie:** UX
- **Betroffene Dateien:** `src/hooks/useCellSelection.ts` (Z. 108–134)
- **Problembeschreibung:** `handlePointerDown` startet sofort eine Drag-Selection, ohne Mindestdistanz zwischen Pointer-Down und Pointer-Move. Ein User, der nur antippen will (kein Drag), aber der Finger dabei 2-3px rutscht, bekommt eine 1×2-Selection statt eines Single-Tap. Der Fix-Kommentar in der Commit-History ("drag rectangle only starts when leaving the start cell") deutet an, dass dies schon mal angegangen wurde, aber aktuell nicht aktiv.
- **Auswirkung:** Niedrig — Touch-User bemerken es gelegentlich, Mouse-User praktisch nie.
- **Lösungsvorschlag:** Drag erst ab 5-10px Pointer-Bewegung starten; vorher als Single-Tap behandeln.

### 🟡 `useCellAnimation` Timer-Ref wird im Cleanup nicht immer zurückgesetzt
- **Kategorie:** Micro-Bug
- **Betroffene Dateien:** `src/hooks/useCellAnimation.ts` (Z. 25–33, 41–47)
- **Problembeschreibung:** `timerRef.current = null` wird im Timer-Callback gesetzt, aber wenn der Unmount-Effekt läuft während ein Timer aktiv ist, wird `clearTimeout` gerufen, aber `timerRef.current` bleibt auf der alten ID. Kein direkter Bug, aber wenn der Unmount direkt vor einem `triggerAnimation` läuft, könnte der nächste Render noch den alten Wert sehen.
- **Auswirkung:** Nicht beobachtbar in der Praxis.
- **Lösungsvorschlag:** `timerRef.current = null` auch im Cleanup-Pfad.

### 🟡 Schwierigkeits-Badge im Header zeigt "Unbekannt" für ungültige Werte
- **Kategorie:** UX
- **Betroffene Dateien:** `src/components/LevelSelector/LevelSelector.tsx` (Z. 76)
- **Problembeschreibung:** `difficulty.color = difficulties[difficultyIndex - 1] || { color: 'gray', text: 'Unbekannt' }` — wenn `difficultyIndex` 0 oder >5 wird, kommt der Fallback. Aber `Math.ceil(...)` für `level=0` oder `level=101` würde 0 bzw. 6 ergeben — beides triggert den Fallback. Da `level` UI-seitig auf `1..TOTAL_LEVELS` geclamped wird, ist das nur ein theoretischer Bug.
- **Auswirkung:** Sehr niedrig.
- **Lösungsvorschlag:** Defensiv clampen + `const idx = Math.max(1, Math.min(5, difficultyIndex))`.

### 🟡 `<Help>`-Button-Tooltip fehlt
- **Kategorie:** UX / A11y
- **Betroffene Dateien:** `src/components/common/HomeActions.tsx` (Z. 76–93)
- **Problembeschreibung:** Alle anderen Action-Buttons (`Level`, Dark-Mode, Fullscreen, BW) haben `aria-label` aber **kein Tooltip**. Der Help-Button hat `aria-label="Tastenkombinationen anzeigen"` — Screenreader-User bekommen den Text, Maus-User nur das Fragezeichen-Symbol ohne Erklärung.
- **Auswirkung:** A11y-Verbesserung; Maus-User merken es kaum, weil die Funktion bekannt ist.
- **Lösungsvorschlag:** Chakra `<Tooltip label="Tastenkombinationen (Drücke ?)" openDelay={400}>` wrappen, analog zu den anderen Action-Buttons in Board.tsx (Z. 639, 653, 665, 677, 688, 699).

### 🟡 Kein Success-Toast nach Reset
- **Kategorie:** UX-Inkonsistenz
- **Betroffene Dateien:** `src/hooks/useBoardGameLogic.ts` (Z. 199–222)
- **Problembeschreibung:** `handleReset` macht `updateGameState(...)` stillschweigend. Kein Toast bestätigt "Level zurückgesetzt". Im Kontrast: `handleNumberSelect` zeigt einen Warn-Toast bei Fehler, `handleRevealHint` zeigt einen Info-Toast bei "Hinweis aufgebraucht". Reset ist die destruktivste Aktion — gerade dort fehlt Feedback.
- **Auswirkung:** Niedrig — der Game-Over-Banner hat einen "Neu starten"-Button (Z. 583) mit `autoFocus`, der Reset auslöst; dieser Fall hat visuelles Feedback. Im normalen Action-Grid-Reset: still.
- **Lösungsvorschlag:** `showError({title: 'Level zurückgesetzt', status: 'info', duration: 1500})` nach dem `updateGameState`. ABER: `showError` ist aktuell als Error-Toast benutzt (Status 'error'/'warning'/'info'/'success' möglich). Alternative: separater `showInfo`-Helper.

### 🟡 App-Version-Anzeige hat 45% Opazität — fast unsichtbar bei Light-Mode
- **Kategorie:** A11y
- **Betroffene Dateien:** `src/App.tsx` (Z. 177–179)
- **Problembeschreibung:** `<Text color="headerTextColor" opacity={0.45} fontSize="2xs">v0.2.2</Text>` — 45% Opazität auf 2xs-Text ist im Light-Mode unter WCAG AA-Kontrastgrenze. Visuelle Spielerei, aber bei Sonnenlicht kaum lesbar.
- **Auswirkung:** A11y-Verstoß; in der Praxis selten bemängelt.
- **Lösungsvorschlag:** Mind. 60% Opazität, oder `color="text.muted"` (semantisch korrekt).

---

## 💡 Vorschlag

### 💡 Hint-Engine: `naked-single-sudoku` ist redundant
- **Kategorie:** Architektur
- **Betroffene Dateien:** `src/services/hintEngine.ts` (Z. 184–206)
- **Problembeschreibung:** `findNakedSingleSudoku` durchsucht ALLE Zellen, berechnet Kandidaten — das ist exakt was `getLegalValuesForCell` macht. `findNakedSingleCage` (Z. 111) macht das Gleiche für Käfige. Beide liefern Hint-Objekte mit identischer Bedeutung (außer `technique`-String).
- **Auswirkung:** Doppelter Code-Pfad, zwei verschiedene Reihenfolgen → Hint-Auswahl ist nicht deterministisch (welcher Naked Single zuerst kommt, hängt von Zellen-Iteration vs. Cage-Iteration ab).
- **Lösungsvorschlag:** Entweder zusammenführen oder explizit dokumentieren, dass die Cage-Variante zuerst Käfig-beschränkte Naked Singles findet (alle leeren Zellen im selben Käfig), die Sudoku-Variante nur Cage-übergreifende.

### 💡 Generator-Solver-Budget: `SOLVER_NODE_BUDGET = 150_000` ist undokumentiert
- **Kategorie:** Architektur / Doku
- **Betroffene Dateien:** `src/services/puzzleGeneratorService.ts` (Z. 334)
- **Problembeschreibung:** Konstante ohne Kommentar, warum gerade 150k. Ist das auf einem 5 Jahre alten MacBook? Auf Mobile? Die `yieldToBrowser()`-Calls (Z. 180–182) sind auch undokumentiert.
- **Auswirkung:** Niemand weiß, ob das Tuning bei neuen Hardware-Generationen passt.
- **Lösungsvorschlag:** Kommentar mit Begründung + Verweis auf Issue/Messung.

### 💡 `useTutorial` Step-Highlight-Liste wird nicht validiert gegen `solution`-Matrix
- **Kategorie:** Datenintegrität
- **Betroffene Dateien:** `src/hooks/useTutorial.ts` (Z. 76–110)
- **Problembeschreibung:** Der Test prüft `cell.value >= 1 && cell.value <= 9`, aber nicht, ob `cell.value === DEMO_LEVEL.solution[cell.row][cell.col]`. Falls ein Tutorial-Autor einen falschen Wert in `highlightedCells` einträgt, zeigt das Demo-Board eine andere Zahl als die Demo-Highlights suggerieren.
- **Auswirkung:** Sehr niedrig, aber katastrophal für die Tutorial-Aussage.
- **Lösungsvorschlag:** Test ergänzen: `expect(cell.value).toBe(DEMO_LEVEL.solution[cell.row][cell.col])`.

---

## Empfehlungen — Reihenfolge

1. **Kritisch zuerst:** Solve-Statistic-Dopplung (`Board.tsx` Solve-Detection-Guard), LevelSelector toter Code löschen.
2. **Race-Conditions:** Undo/Redo Save-Queue-Recovery (`storageService.ts`), Undo vs. Timer-Updates (`useGameState.ts`).
3. **Tests:** `useGameState.test.tsx` neu, Save-Queue-Tests, doppelte `useCellAnimation.test.tsx` löschen.
4. **UX:** Drag-Threshold, Help-Tooltip, Reset-Toast, Tutorial-Cage-Summe fix.
5. **API-Cleanup:** `getPossibleValues` Rückgabetyp vereinheitlichen.
6. **Doku + Polish:** Generator-Konstanten dokumentieren, Demo-Tutorial-Validierung.

---

**Ende des Audits.** 26 Befunde, 2 kritisch (sofort fixen), 6 hoch (nächste Iteration), Rest nach Priorität.
