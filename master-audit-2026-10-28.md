<!-- Hallmark · pre-emit critique: P4 H5 E4 S5 R5 V3 -->
# Master-Audit — Killer Sudoku — 28.10.2026

## Prüfgegenstand und Ergebnis

Geprüft wurde der lokale Arbeitsstand auf Basis von Commit `01a3d00`, Version `0.3.7`. Bereits vorhandene Änderungen an `Dockerfile`, `package.json` und `package-lock.json` wurden einbezogen, aber nicht verändert. Dieser Bericht enthält keine Fehlerbehebungen und bewertet keine ungeprüfte Live-Installation.

**Die Anwendung besteht ihre vorhandenen Tests, hat aber erhebliche Lücken in Offline-Fähigkeit, mobiler Bedienbarkeit und Zustandsübergängen.** Besonders relevant sind die unterdrückte Service-Worker-Registrierung, außerhalb des Bildschirms liegende Eingaben, eine Tastaturfalle und inkonsistente Spielabschlusszustände. Ein Befund der höchsten Stufe „Kritisch“ im Sinne eines allgemeinen Totalausfalls oder einer nachgewiesenen Sicherheitskompromittierung wurde nicht festgestellt. „Hoch“ bedeutet hier: Ein Kernprozess ist unter konkret benannten Bedingungen fehlerhaft oder nicht benutzbar.

Die Liste ist eine belegte Bestandsaufnahme, keine Garantie, dass sämtliche denkbaren Fehler gefunden wurden. Reproduzierte Befunde und statisch nachgewiesene Fehlerpfade werden ausdrücklich unterschieden. Offene Produktentscheidungen erscheinen als Vorschläge.

## Methodik und Verifikation

1. Architektur und Verträge: `AGENTS.md`, `CONTEXT.md`, ADR 0001–0003, Paketkonfiguration, Einstiegspunkt, PWA-Konfiguration, Services, Hooks und Rendering geprüft.
2. Abläufe verfolgt: Erststart/Tutorial, Level laden und wechseln, Spielstand wiederherstellen, Eingabe/Notiz-Kandidaten, Löschen, Hinweise, Undo/Redo, Reset, Game Over, Abschluss und Fortschrittsanzeige.
3. Tests und Produktionsbundle ausgeführt; anschließend gezielte Chromium-Prüfungen mit Playwright gegen den frisch erzeugten Build auf `http://localhost:8183`. Der bereits belegte Port 8083 wurde nicht übernommen.
4. Browser-Kontexte waren isoliert. Gezielte IndexedDB-Testdaten für Game Over und gelöste Rätsel wurden ausschließlich dort angelegt. Anwendungsdateien, echte Browserprofile und Live-Daten wurden nicht verändert.

| Prüfung | Ergebnis |
|---|---|
| `npm run typecheck` | bestanden |
| `npm test -- --runInBand` | 38 Suites, 391 Tests bestanden, ca. 36,5 s |
| Level-Validator | als Teil der vollständigen Jest-Suite bestanden |
| `npm run build` | bestanden; Warnung für UI-Chunk mit 572,60 kB, gzip 185,09 kB |
| Browserstart des Produktionsbuilds | an den geprüften Standardbreiten ohne `pageerror` |
| Responsive-Prüfung | Breiten 320, 375, 414, 768 und 1280 bei 800 px Höhe; zusätzlich 375×568, 667×375 und 768×414 |
| Service Worker | frischer Browserkontext: `typeof process === 'undefined'`, 0 Registrierungen |
| Tastatur | Tab-Falle und Verbrauch eines Hinweises durch Strg+R reproduziert |
| Zustandsübergänge | Timerstillstand nach Game Over → Reset sowie `solved: true` trotz geleerter Zelle reproduziert |

Nicht durchgeführt: vollständige Safari-/Firefox-/Realgeräte-Matrix, Screenreader-Sitzung, umfassende Kontrastmessung aller Farbschemata, Docker-Deployment, Last-/Langzeittest, Abhängigkeits-CVE-Abgleich oder externe Rechtsprüfung. Aus dem fehlenden CVE-Abgleich folgt keine Aussage über die Sicherheit der Abhängigkeiten. Das vorhandene Smoke-Skript wurde statisch geprüft; die Browserprüfung verwendete wegen des belegten Standardports einen separaten Aufruf.

## Architektur- und Workflow-Bild

Es gibt kein Backend und keine API-Datenbank-Strecke. Der Ablauf ist `App → HomeTab → Board → Hooks → Browser-Services`. Leveldaten kommen per `fetch` aus 100 statischen JSON-Dateien. `useGameState` verwaltet Wiederherstellung, Änderungen, Zeit und History; `useBoardGameLogic` verarbeitet Spielaktionen. Die dreischichtige Brettdarstellung entspricht grundsätzlich ADR 0001: Interaktion unten, SVG-Linien in der Mitte, Zahlen darüber.

Dauerhafte Daten liegen in IndexedDB/localforage sowie localStorage. Spielzustand, Statistik und Level-Fortschritt werden getrennt geschrieben und bilden keine gemeinsame Transaktion. Die Save-Queue serialisiert Schreibvorgänge innerhalb einer JavaScript-Instanz; sie schützt weder statistische Read-modify-write-Vorgänge noch andere Browser-Tabs. Der Wechsel in die Levelübersicht unmountet das Brett und damit dessen lokale History und Modi.

Positiv: zentrale Regelberechnung, striktes TypeScript, Tests für Solver und Levelintegrität, Bereinigung von Notiz-Kandidaten, Cancellation beim Level-Laden sowie eine Save-Queue sind vorhanden. Die problematischen Stellen liegen überwiegend zwischen diesen einzeln getesteten Teilen.

# Hohe Priorität

## 🚨 Hoch – H01: Service Worker wird im Produktionsbrowser nicht registriert
- **Kategorie:** Bug / Offline-Kernprozess
- **Betroffene Datei(en) / Komponente(n):** `src/index.tsx:8–14`, `vite.config.ts`.
- **Problembeschreibung:** Die Registrierung hängt an `typeof process !== 'undefined'`. Vite ersetzt zwar den Ausdruck für `process.env.NODE_ENV`, stellt aber kein globales `process` bereit. Im gebauten Einstieg bleibt entsprechend die Bedingung `typeof process < 'u' && …` erhalten. Im frischen Chromium-Kontext wurden nach dem Start 0 Service-Worker-Registrierungen festgestellt. Das generierte `sw.js` allein aktiviert keinen Offline-Cache.
- **Auswirkung:** Die zugesagte zuverlässige Offline-Nutzung nach dem ersten Besuch funktioniert bei Neuinstallationen nicht. Ein eventuell vorhandener alter Worker kann den Fehler bei Entwicklern verdecken. Ein zufällig warmer HTTP-Cache ersetzt diese Garantie nicht.
- **Lösungsvorschlag:** Registrierung mit einer Vite-kompatiblen Produktionsbedingung, beispielsweise `import.meta.env.PROD`, ausführen. Den Einstieg gegebenenfalls vom Jest-Importpfad trennen. E2E-Nachweis: frischer Kontext → Worker aktiviert → offline schalten → Reload → anderes vorgecachetes Level öffnen.

## 🚨 Hoch – H02: Kernbedienelemente verschwinden auf kleinen Displays
- **Kategorie:** UI/UX / Responsive Design / Prozess-Sackgasse
- **Betroffene Datei(en) / Komponente(n):** `src/index.css:10–15`, `src/components/Board/Board.tsx:418–464` und Aktionsbereich ab ca. Zeile 580, `src/hooks/useBoardResize.ts:46–74`, `src/App.tsx` Header.
- **Problembeschreibung:** Der Dokument-Scroll ist gesperrt, während Brett und Eingabebereich zusammen höher als der Bildschirm werden. Das `overflowY="auto"` des Aktionsbereichs besitzt keine verlässlich begrenzte Höhe. Reproduziert: Bei 375×568 reicht „Löschen“ von y=593 bis 637; bei 667×375 beginnt bereits die erste Ziffernreihe erst bei y=446. Unterhalb 768 px greift trotz Querformat weiterhin das Spaltenlayout. Bei 768×414 liegen Undo/Redo bis y=444. Zusätzlich reicht bei 320 px Breite der Hilfebutton bis x=333.
- **Auswirkung:** Auf betroffenen Telefonen sind Zahlen, Löschen oder Reset nicht vollständig erreichbar. Horizontales Abschneiden verbirgt Hilfe.
- **Lösungsvorschlag:** Den verfügbaren Platz als `100dvh` abzüglich tatsächlicher Kopfzeile und Safe Areas budgetieren. Höhe der Eingaben bei der Brettgröße berücksichtigen, Querformat anhand verfügbarer Höhe behandeln und für Restinhalt einen tatsächlich begrenzten Scrollbereich anbieten. Regressionen mit den oben genannten Größen prüfen.

## 🚨 Hoch – H03: Tab und Shift+Tab fangen Tastaturnutzer im Brett ein
- **Kategorie:** Barrierefreiheit / Tastaturnavigation
- **Betroffene Datei(en) / Komponente(n):** `src/hooks/useBoardKeyboard.ts:63–82`, `src/components/Board/Board.tsx:463–467`.
- **Problembeschreibung:** Tab wird immer mit `preventDefault()` abgefangen; beide Richtungen laufen an der Brettgrenze zyklisch weiter. Auch Escape hilft nicht zuverlässig: Nach aufgehobener Auswahl setzt die nächste Taste nur die erste Zelle, die folgende Tab-Taste navigiert erneut intern. Im Browser blieb nach mehrfacher Tab-Eingabe der Fokus auf dem Element mit `role="grid"`.
- **Auswirkung:** Nummernfeld, Reset und Header sind aus dem aktiven Brett heraus über die normale Tab-Reihenfolge nicht erreichbar.
- **Lösungsvorschlag:** Pfeiltasten für interne Navigation verwenden und Tab den nächsten äußeren Fokuspunkt erreichen lassen; alternativ einen klar dokumentierten, funktionierenden Austritt anbieten. Den vollständigen Fokusweg mit echter Tastatur testen.

## 🚨 Hoch – H04: Strategischer Tipp bewegt den Cursor, aber nicht die Eingabeauswahl
- **Kategorie:** Bug / inkonsistenter UI-Zustand
- **Betroffene Datei(en) / Komponente(n):** `src/components/Board/Board.tsx:284–301`, `src/hooks/useBoardGameLogic.ts:94–123`.
- **Problembeschreibung:** Der Tipp setzt nur `selectedCell`, während Eingaben auf `selectedCells` angewendet werden. Reproduziert: Zelle 9/9 auswählen, H drücken. Der Toast empfiehlt eine andere Zelle, aber `aria-selected="true"` bleibt ausschließlich auf `cell-8-8`. Ein alter Mehrfachauswahlbereich bleibt ebenfalls bestehen.
- **Auswirkung:** Eine anschließend eingegebene empfohlene Ziffer landet im alten Zielbereich und kann einen Fehlversuch auslösen. Der Nutzer bezahlt einen Hinweis und erhält widersprüchliche Navigation.
- **Lösungsvorschlag:** Cursor, Eingabeauswahl und Drag-/Shift-Anker gemeinsam auf die Hinweiszelle umstellen: `setSelectedCell(hint.cell)`, `setSelectedCells([hint.cell])` und bestehende Auswahlanker verwerfen. Tipp → Zahleneingabe als integrierten Ablauf testen.

## 🚨 Hoch – H05: Gelöste Rätsel bleiben nach Änderungen dauerhaft als gelöst gespeichert
- **Kategorie:** Bug / Zustandsmodell / Fortschritt
- **Betroffene Datei(en) / Komponente(n):** `src/hooks/useBoardGameLogic.ts` Eingabe- und Löschpfade, `src/components/Board/Board.tsx:323–329`, `src/hooks/useGameState.ts:57–86`.
- **Problembeschreibung:** Eingaben und Löschen sind nach erfolgreichem Abschluss weiter möglich, setzen aber `solved` und `endTime` nicht zurück. Die Solve-Erkennung behandelt ein vorhandenes `solved` bedingungslos als Wahrheit. Reproduziert mit gelöstem Spielstand: eine nicht vorgegebene Zelle auswählen → Delete → IndexedDB enthält `solved: true` und Zellwert `0`. Auch beim Wiederherstellen wird das Flag nach Bereinigung der Zellwerte nicht neu geprüft.
- **Auswirkung:** Tatsächliches Brett, Abschlussstatus, Timer und Fortschrittsanzeige widersprechen sich. Der Zustand überlebt einen Reload.
- **Lösungsvorschlag:** Terminalverhalten verbindlich festlegen: gelöste Rätsel schreibschützen oder bei einer wiederöffnenden Aktion die Abschlussmetadaten konsistent aktualisieren. Beim Laden den Abschluss anhand des bereinigten Bretts validieren. Historisch „schon einmal gelöst“ darf als eigener Fortschrittsbegriff erhalten bleiben.

## 🚨 Hoch – H06: Asynchrone Abschlussbuchung kann neuere Eingaben oder Reset überschreiben
- **Kategorie:** Race Condition / Fehlerbehandlung
- **Betroffene Datei(en) / Komponente(n):** `src/components/Board/Board.tsx:317–344`, `src/hooks/useGameState.ts:212–225`, `src/services/statisticsService.ts:44–88`.
- **Problembeschreibung:** Statisch nachgewiesen: Der Abschluss wartet auf die Statistik und verwendet danach `updateGameState` aus dem Render des vollständigen Bretts. Dieser Handler mischt in den damaligen vollständigen `gameState`. Zwischenzeitliche Änderungen oder ein Reset werden dadurch beim Resolve überschrieben. Es fehlt eine Prüfung von Spielinstanz/Revision und Cancellation. Bei Ablehnung des Statistik-Promises fehlt außerdem `.catch`; `solveRecordedRef` wurde bereits gesetzt und verhindert einen erneuten Versuch.
- **Auswirkung:** Ein zurückgesetztes Rätsel kann erneut als vollständig erscheinen; bei Storagefehlern bleibt der Abschluss ungebucht und es entsteht eine unbehandelte Promise-Rejection.
- **Lösungsvorschlag:** Den fachlichen Abschluss zuerst als konsistenten Zustandsübergang anwenden. Statistik separat fehlertolerant buchen. Asynchrone Ergebnisse nur auf die noch gültige Puzzle-/Versuchsrevision anwenden; Reset und Unmount invalidieren ausstehende Arbeit. Mit verzögertem und abgelehntem Statistik-Save testen.

## 🚨 Hoch – H07: Timer wird endgültig beendet und startet nach Reset nicht erneut
- **Kategorie:** Bug / Lebenszyklus / Autosave
- **Betroffene Datei(en) / Komponente(n):** `src/hooks/useGameState.ts:177–210`.
- **Problembeschreibung:** Ein Effekt mit leerer Abhängigkeitsliste erzeugt den Timer einmal. Sobald ein Tick `null`, `solved` oder `gameOver` sieht, wird das Intervall gelöscht. Eine anschließende Rückkehr in einen aktiven Zustand erzeugt kein neues Intervall. Reproduziert: gespeichertes Game Over laden → mindestens einen Tick warten → Reset → warten → Hinweis auslösen, um aktuellen Zustand zu persistieren. `elapsedTime` bleibt `0`. Dauert die Ersthydration länger als eine Sekunde, führt bereits `gameState === null` zum gleichen Fehler.
- **Auswirkung:** Zeiterfassung und periodische Speicherung bleiben bis zu einem Remount aus. Die aus `Date.now() - startTime` separat berechnete Abschlussdauer kann trotzdem weiter steigen und damit vom gespeicherten Verlauf abweichen.
- **Lösungsvorschlag:** Bei inaktivem Zustand nur den Tick überspringen oder das Intervall an den aktiven Lebenszyklus koppeln. Tests für langsame Hydration und Game Over/gelöst → Reset ergänzen; ein Test nur für das Stoppen reicht nicht.

## 🚨 Hoch – H08: Tastatur umgeht Game-Over-Sperren der Buttons
- **Kategorie:** Bug / inkonsistente Geschäftsregeln
- **Betroffene Datei(en) / Komponente(n):** `src/components/Board/Board.tsx:247–301,306–312` und Undo-/Redo-Buttons, `src/hooks/useGameState.ts:255–271`.
- **Problembeschreibung:** Die sichtbaren Undo-/Redo- und Tipp-Buttons werden bei Game Over deaktiviert. Die Shortcuts rufen dieselben Operationen ohne entsprechende Prüfung auf. Undo kann den Snapshot vor dem letzten Fehler zurückspielen; der strategische Tipp prüft sein Kontingent, aber kein Game Over. Das ist aus den tatsächlichen Handlerpfaden unmittelbar ersichtlich.
- **Auswirkung:** Für Maus/Touch ist ein Spiel beendet, per Tastatur lässt es sich fortsetzen oder weiter mit Tipps bearbeiten.
- **Lösungsvorschlag:** Zulässige Aktionen im gemeinsamen fachlichen Handler prüfen. Zuerst entscheiden, ob Undo aus Game Over erlaubt sein soll, dann Buttons und Shortcuts konsistent daran ausrichten.

# Mittlere Priorität

## 🚨 Mittel – M01: Speicherfehler sind für Spieler unsichtbar
- **Kategorie:** Fehlerbehandlung / drohender Fortschrittsverlust
- **Betroffene Datei(en) / Komponente(n):** `src/services/storageService.ts:49–67`, `src/hooks/useGameState.ts:212–225` und Lade-Fallbacks.
- **Problembeschreibung:** Die Queue fängt Schreibfehler ab und erfüllt das Promise trotzdem. Die UI bekommt keinen Fehlerstatus. Ein fehlgeschlagener Lesezugriff wird wie ein neu zu startendes Spiel behandelt; ein späterer erfolgreicher Save kann den vorher nicht gelesenen Stand ersetzen. Das Logging allein erlaubt Nutzern keine Reaktion.
- **Auswirkung:** Der Eindruck „automatisch gespeichert“ ist trotz Storagefehlern falsch; beim Schließen droht Verlust. Die bestehende Dokumentation beschreibt dieses Verhalten, beseitigt aber das Nutzerrisiko nicht.
- **Lösungsvorschlag:** Einen typisierten Save-/Load-Status zurückgeben und einen nicht störenden, sichtbaren Hinweis auf fehlgeschlagene Persistenz anbieten. Ladefehler von „kein Spielstand vorhanden“ unterscheiden und vor dem Überschreiben einen bewussten Wiederanlauf ermöglichen.

## 🚨 Mittel – M02: Undo stellt neben Spielzügen auch veraltete Verbrauchszähler wieder her
- **Kategorie:** Logik-Lücke / Hinweis-Kontingent
- **Betroffene Datei(en) / Komponente(n):** `src/hooks/useGameState.ts:238–271`, `src/components/Board/Board.tsx:289–290`, `docs/adr/0003-undo-redo-post-change-snapshot.md`.
- **Problembeschreibung:** Die History enthält komplette Spielzustände. Ein strategischer Tipp erhöht `hintsUsed` über `updateGameState`, ohne History-Eintrag. Undo eines davor liegenden Zuges setzt anschließend auch diesen später verbrauchten Hinweis zurück. Beispiel: Zahl setzen → strategischen Tipp ansehen → Undo der Zahl. Das bereits erworbene Wissen bleibt, der Zähler wird zurückgedreht.
- **Auswirkung:** Das gemeinsame Drei-Hinweise-Kontingent ist nicht zuverlässig. Weitere Metadaten können durch History-Snapshots ebenfalls zeitlich zurückspringen.
- **Lösungsvorschlag:** Festlegen, welche Metadaten zu einem rückgängig machbaren Zug gehören. Nicht rückerstattbare Verbräuche außerhalb des rücksetzbaren Brett-Snapshots führen. Eine Änderung der in ADR 0003 geforderten exakten Wiederherstellung als bewusste Präzisierung dokumentieren; nicht stillschweigend abweichend implementieren.

## 🚨 Mittel – M03: Globale Shortcuts bleiben hinter Dialogen aktiv
- **Kategorie:** UI/UX / unerwartete Zustandsänderung
- **Betroffene Datei(en) / Komponente(n):** `src/hooks/useKeyboardShortcuts.ts:22–30,65–142`, `src/App.tsx` Hilfe-/Tutorial-Dialoge.
- **Problembeschreibung:** Der Window-Listener prüft nur Eingabefelder und `contentEditable`. Dialogzustände, Menüinteraktionen und bereits behandelte Ereignisse sind keine Sperre. Solange Board gemountet bleibt, können R, H oder Mod+Z beim Fokus auf einem Dialogbutton das darunterliegende Spiel verändern.
- **Auswirkung:** Ein Hinweis wird während der Hilfe verbraucht oder ein Zug im Hintergrund rückgängig gemacht. Das kann zusätzlich den Fokus durch die Auswahl-Effekte beeinflussen.
- **Lösungsvorschlag:** Shortcuts an den aktiven Spielkontext und den Overlayzustand koppeln; `defaultPrevented` beachten. Hilfe-/Tutorial-Interaktion mit R/H/Undo prüfen.

## 🚨 Mittel – M04: Strg+R verbraucht einen Hinweis statt die Seite neu zu laden
- **Kategorie:** Bug / Tastaturkonventionen
- **Betroffene Datei(en) / Komponente(n):** `src/hooks/useKeyboardShortcuts.ts:91–105`, `src/hooks/useBoardKeyboard.ts:53–88`.
- **Problembeschreibung:** Nur P prüft vollständig auf Ctrl/Meta/Alt. H und R matchen unabhängig von Modifiern und unterdrücken das Browserverhalten. Im Produktionsbrowser wurde durch Strg+R das Kontingent von „Hinweis (3)“ auf „Hinweis (2)“ reduziert. Auch die lokale Brettnavigation interpretiert modifizierte Buchstaben als WASD.
- **Auswirkung:** Gewohnte Browseraktionen verändern unbemerkt das Spiel und verbrauchen begrenzte Ressourcen.
- **Lösungsvorschlag:** Für unmodifizierte Spielaktionen grundsätzlich Ctrl/Meta/Alt ausschließen. Explizite Mod-Shortcuts separat behandeln. Strg+R, Cmd+R und Alt-Kombinationen in die Tastaturtests aufnehmen.

## 🚨 Mittel – M05: Reset löscht Fortschritt sofort und unwiderruflich
- **Kategorie:** UX / destruktiver Workflow
- **Betroffene Datei(en) / Komponente(n):** `src/hooks/useBoardGameLogic.ts` Funktion `handleReset`, `src/components/Board/Board.tsx` Reset-Button, ADR 0003.
- **Problembeschreibung:** Ein einzelner Klick auf ein kleines, nur mit Icon dargestelltes Reset-Steuerelement löscht Werte und Notiz-Kandidaten, speichert den leeren Stand und leert die History. Es gibt weder vorherige Bestätigung noch Wiederherstellung. ADR 0003 erklärt die fehlende Undo-Möglichkeit ausdrücklich für beabsichtigt.
- **Auswirkung:** Ein Fehlklick kann einen langen Spielstand dauerhaft vernichten.
- **Lösungsvorschlag:** Vor dem Löschen eines tatsächlich veränderten Bretts eine kurze Bestätigung anbieten. Das respektiert ADR 0003. Eine stattdessen gewünschte Undo-Lösung würde der ADR widersprechen und benötigt eine dokumentierte neue Entscheidung.

## 🚨 Mittel – M06: Gelöste Level verlieren Nummer und zugänglichen Namen
- **Kategorie:** UI-Inkonsistenz / Barrierefreiheit
- **Betroffene Datei(en) / Komponente(n):** `src/components/Tabs.tsx:188–231`.
- **Problembeschreibung:** Bei gelösten Leveln ersetzt `✓` die Nummer vollständig. Der Button besitzt keinen eigenen `aria-label` und kein `aria-current`. Mehrere gelöste Level heißen dadurch für Screenreader nur „✓“ und sind visuell nur noch aus ihrer Rasterposition erschließbar.
- **Auswirkung:** Ein bestimmtes bereits gelöstes Level lässt sich schlechter wiederfinden; die aktuelle Auswahl wird hauptsächlich durch Farbe angezeigt.
- **Lösungsvorschlag:** Levelnummer immer anzeigen, Erledigt-Marker ergänzen, `aria-label="Level 7, gelöst"` und für die aktuelle Auswahl `aria-current` verwenden. Fortschrittsbalken zusätzlich mit einem zugänglichen Zahlenwert versehen.

## 🚨 Mittel – M07: Laufzeitdaten werden als vertrauenswürdige TypeScript-Objekte behandelt
- **Kategorie:** Datenvalidierung / Robustheit
- **Betroffene Datei(en) / Komponente(n):** `src/services/levelService.ts:20–39`, `src/hooks/useGameState.ts:51–88`, `src/services/statisticsService.ts:27–36`, `src/services/progressService.ts:9–17`.
- **Problembeschreibung:** `response.json()` wird ohne Schema-Prüfung als `GameLevel` zurückgegeben. Die zulässige Levelnummer wird nur mit `<`/`>` geprüft, wodurch `NaN` und Brüche nicht korrekt abgewiesen werden. Gespeicherte Zustände werden gecastet; Zahlenmetadaten werden nur auf `typeof number` geprüft, nicht auf Endlichkeit, Grenzen und Zusammenhang. `solved` wird aus dem gespeicherten Objekt übernommen. Der Build-Validator schützt die eingecheckten Dateien, aber nicht beschädigte oder alte Browserdaten oder falsche HTTP-Antworten.
- **Auswirkung:** Ungültige Metadaten können Kontingente und Fortschritt verfälschen; falsche Levelstrukturen können erst im Rendering mit einer Exception scheitern. Die vorhandene Brett-/Notiznormalisierung deckt diese anderen Felder nicht ab.
- **Lösungsvorschlag:** Kleine reine Laufzeitprüfungen am jeweiligen I/O-Eingang verwenden: Integer/Range für Level und Koordinaten, 9×9-Form und Wertebereiche, begrenzte endliche Zähler sowie konsistenter Abschlussstatus. Fehler sichtbar darstellen. Dafür ist keine neue Bibliothek notwendig.

## 🚨 Mittel – M08: Statistik entscheidet nicht atomar über eindeutige Abschlüsse
- **Kategorie:** Race Condition / Persistenz
- **Betroffene Datei(en) / Komponente(n):** `src/services/statisticsService.ts:44–88`.
- **Problembeschreibung:** `recordSolve` liest die Statistik, prüft `solvedPuzzles` und schreibt danach separat. Zwei gleichzeitige Aufrufe können denselben Ausgangsstand lesen. Verschiedene Puzzle-Abschlüsse überschreiben dann gegenseitig Zähler und Idempotenzmarker. Die Spielstand-Save-Queue wird für diese Operation nicht verwendet und würde tabübergreifend ohnehin nicht genügen.
- **Auswirkung:** Abschlusszahlen und Gesamtzeiten können bei mehreren offenen Tabs oder überlappenden Abschlussoperationen verloren gehen.
- **Lösungsvorschlag:** Read-modify-write in einer IndexedDB-Transaktion ausführen oder Abschlüsse als einzelne idempotente Datensätze im bestehenden Speicherkanal erfassen und daraus aggregieren. Konkurrenz mit zwei unterschiedlichen Puzzle-IDs gezielt prüfen.

## 🚨 Mittel – M09: Mehrere Browser-Tabs können denselben Spielstand zurücksetzen
- **Kategorie:** Datenverlust / gleichzeitiger Zugriff
- **Betroffene Datei(en) / Komponente(n):** `src/services/storageService.ts:45–70`, `src/hooks/useGameState.ts` Lade-, Autosave- und Eingabepfade.
- **Problembeschreibung:** Jeder Tab hält eine eigene Kopie des Spielzustands und eine eigene Queue. Es gibt keine Revision, Schreibkonfliktprüfung oder Aktualisierungsnachricht. Ein älterer Tab kann nach einer späteren Eingabe oder beim Autosave den neueren Stand eines anderen Tabs vollständig ersetzen.
- **Auswirkung:** Der bereits innerhalb eines Tabs bekämpfte Rücksprung von Fortschritt ist über mehrere Tabs weiterhin möglich. Das betrifft auch gleichzeitige PWA-/Browserfenster derselben Origin.
- **Lösungsvorschlag:** Entweder einen aktiven Writer pro Puzzle koordinieren oder Revisionen prüfen und Konflikte sichtbar behandeln. BroadcastChannel/Web Locks und vorhandenes IndexedDB nutzen; keinen Server hinzufügen.

## 🚨 Mittel – M10: Fullscreen-Aufruf ist nicht gegen fehlende Browser-API abgesichert
- **Kategorie:** Browser-Kompatibilität / Fehlerbehandlung
- **Betroffene Datei(en) / Komponente(n):** `src/App.tsx:98–106`, `src/components/common/HomeActions.tsx` Fullscreen-Button.
- **Problembeschreibung:** Das Vorhandensein von `document` garantiert keine Funktion `document.documentElement.requestFullscreen`. Bei fehlender API entsteht eine synchrone Exception vor dem `.catch`. `exitFullscreen()` wird ohne Fehlerbehandlung gestartet. Der Button wird unabhängig von der Fähigkeit des Browsers angeboten.
- **Auswirkung:** In Browsern mit eingeschränkter Fullscreen-Unterstützung ist die Aktion kaputt; Ablehnungen beim Verlassen können unbehandelt bleiben. Dieser Pfad ist statisch belegt, nicht auf einem echten iPhone verifiziert.
- **Lösungsvorschlag:** Methodenverfügbarkeit und `fullscreenEnabled` prüfen, asynchrone Aufrufe vollständig behandeln und die Aktion bei fehlender Unterstützung passend deaktivieren oder ausblenden.

## 🚨 Mittel – M11: Installationsdialog verletzt den Storage-Vertrag
- **Kategorie:** Bug / Fehlerbehandlung / Vertragsabweichung
- **Betroffene Datei(en) / Komponente(n):** `src/components/common/InstallPrompt.tsx:15–21,31–48,52–57`.
- **Problembeschreibung:** Lesen und Schreiben von `installPromptDismissed` erfolgen ohne `try/catch`. Das Installationsereignis wird vor dem Lesen bereits mit `preventDefault()` unterdrückt. Bei blockiertem localStorage scheitert danach der eigene Hinweis. Auch `prompt()` und `userChoice` besitzen keine Ablehnungsbehandlung.
- **Auswirkung:** Installationsempfehlung kann in eingeschränkten Browserumgebungen verschwinden oder Fehler erzeugen. Ein Klick auf Ablehnen kann ebenfalls eine Exception auslösen.
- **Lösungsvorschlag:** Storagezugriffe wie im übrigen Projekt absichern, bei Fehlern den In-Memory-Dialog weiter anbieten und den gesamten Installationsablauf mit sauberem Cleanup behandeln.

## 🚨 Mittel – M12: Smoke-Test meldet trotz Anwendungsfehlern Erfolg
- **Kategorie:** QA / falsche Erfolgssignale
- **Betroffene Datei(en) / Komponente(n):** `scripts/probe.mjs:8–32`, `package.json` Script `test:smoke`, `src/components/Board/Board.test.tsx:19–35`.
- **Problembeschreibung:** Das Smoke-Skript sammelt Fehler, Root-Kinder und Überschrift, gibt sie aber nur aus. Es setzt bei JavaScriptfehlern, HTTP-Fehlern oder leerer Oberfläche keinen Fehler-Exitcode. Es prüft außerdem weder einen geladenen Spielzustand noch Offline-Fähigkeit. Board-Tests ersetzen gerade den zustandsführenden Hook durch einen festen Mock mit No-op-Schreibfunktionen, weshalb echte Übergänge darin nicht nachgebildet werden.
- **Auswirkung:** Ein nominell grüner Smoke-Test und 391 grüne Tests schließen die hier reproduzierten Fehler nicht aus. Automatisierung kann eine defekte Oberfläche als bestanden werten.
- **Lösungsvorschlag:** Relevante Smoke-Bedingungen tatsächlich assertieren und Fehler mit Exitcode ungleich null melden. Ein kleines Set echter Integrationstests für Laden → Eingabe → Speichern → Reload, Game Over → Reset, Abschluss → Undo/Änderung und frischen Offline-Start ergänzen. Port/Base-URL konfigurierbar machen.

# Niedrige Priorität

## 🚨 Niedrig – N01: Dokumentierte Architektur und tatsächlicher Arbeitsstand widersprechen sich
- **Kategorie:** Architektur-Dokumentation / Wartbarkeit
- **Betroffene Datei(en) / Komponente(n):** `AGENTS.md:5–38`, `README.md` Tech-Stack, `docs/PWA.md`, `docs/STORAGE.md`, `src/contexts/ColorSchemeContext.tsx:14`, `package.json`.
- **Problembeschreibung:** Die Verträge nennen React 18 und Vite 5; der aktuelle lokale Paketstand enthält React 19.2.8 und Vite 8.2.1, außerdem Jest 30 und framer-motion 13 statt der dokumentierten älteren Versionen. Die Dokumentation verortet das Manifest in `public/manifest.webmanifest`, diese Datei existiert nicht; das Manifest wird im Vite-Plugin erzeugt. Zusätzliche localStorage-Keys `colorScheme` und `installPromptDismissed` fehlen im Speichervertrag. Das vorhandene `TODO.md` bezeichnet sich ausdrücklich als historisch und wird deshalb nicht als aktuelle Spezifikation gewertet.
- **Auswirkung:** Entwickler und Agenten treffen Entscheidungen auf falschen Grundlagen. Die Abweichungen gehören teilweise zum bereits vorgefundenen uncommitteten Paketupgrade; sie dürfen nicht pauschal dem Basiscommit zugeschrieben werden.
- **Lösungsvorschlag:** Beim Abschluss des Upgrades Verträge und README synchronisieren, tatsächliche Manifestquelle und zusätzliche Keys dokumentieren. Paket-/UI-Version sind aktuell beide korrekt `0.3.7`.

## 🚨 Niedrig – N02: Verbindliche Code-Regeln werden nicht automatisch geprüft
- **Kategorie:** Codekonsistenz / QA
- **Betroffene Datei(en) / Komponente(n):** `src/components/Tabs.tsx:22`, `src/components/common/InstallPrompt.tsx:11,65`, `src/hooks/useBoardKeyboard.ts:136–169`, `src/components/Board/Board.tsx:285–287`, `package.json`.
- **Problembeschreibung:** Produktivcode enthält explizites `any`, direkte `document.querySelector`-Zugriffe und unterdrückte Hook-Abhängigkeitsprüfungen trotz ausdrücklicher Verbote in AGENTS.md. Der strategische Tipp dupliziert erneut den verbotenen `cages.find(...cells.some(...))`-Lookup. `typecheck` meldet diese Regelverstöße nicht; ein ausführbares ESLint-Script ist nicht vorhanden. Die vorhandene `eslintConfig` allein führt keine Prüfung aus.
- **Auswirkung:** Striktes TypeScript wird mit einer umfassenderen Qualitätsprüfung verwechselt; dokumentierte Grenzen erodieren und bekannte Fehlermuster können zurückkehren.
- **Lösungsvorschlag:** Die konkreten Stellen mit vorhandenen Domain-Typen, übergebenen Refs und `cageOfCell` bereinigen. Einen passenden Lint-Check als gesonderte Änderung vorschlagen; eine dafür nötige neue Abhängigkeit erfordert nach AGENTS.md vorherige Zustimmung.

## 🚨 Niedrig – N03: Angeblich statische Linien und Lookup-Indizes werden ständig neu berechnet
- **Kategorie:** Performance / Architektur-Vertragsabweichung
- **Betroffene Datei(en) / Komponente(n):** `src/components/Board/BoardSurface.tsx` Funktionen `renderBgCell`, `renderNumCell`, `renderLineSvg`, `src/services/board.ts:48–57`, ADR 0001.
- **Problembeschreibung:** Der SVG-Baum einschließlich aller Käfigkonturen wird bei jedem BoardSurface-Render neu aufgebaut. Jede Zelle fragt zudem mehrfach `getCageForCell` ab, was jedes Mal den kompletten Index neu erzeugt; Gültigkeitsprüfungen erzeugen weitere Kopien und Käfiganalysen. Der laufende Timer verursacht auch ohne Eingabe regelmäßige Renders. ADR 0001 verlangt dagegen Neuberechnung der Linien nur bei Levelwechsel und Resize.
- **Auswirkung:** Vermeidbare Arbeit im häufigsten Renderpfad, gerade auf schwächeren Mobilgeräten. Eine konkrete wahrnehmbare Verzögerung oder Akkumessung wurde nicht nachgewiesen; deshalb niedrige Priorität.
- **Lösungsvorschlag:** Vor Optimierung profilieren. Den tatsächlich kostspieligen statischen Linienbaum gezielt nach Level/Geometrie memoisiert halten und einen gemeinsamen Käfigindex über die vorhandenen Funktionen wiederverwenden. Kein pauschales Memoisieren billiger 9×9-Ableitungen.

## 🚨 Niedrig – N04: Bewegungsreduktion wird nur punktuell berücksichtigt
- **Kategorie:** Barrierefreiheit / UI-Konsistenz
- **Betroffene Datei(en) / Komponente(n):** `src/components/Board/BoardSurface.tsx` Auswahlpuls und Eintragsanimationen, `src/components/common/FadeInView.tsx:24–57`.
- **Problembeschreibung:** BoardSurface berücksichtigt `prefers-reduced-motion` für die äußere Schatten-Transition, nicht aber für den endlosen Auswahlpuls und die Zellanimationen. FadeInView setzt Bewegung direkt per Inline-Style und prüft die Präferenz ebenfalls nicht.
- **Auswirkung:** Nutzer mit aktivierter Bewegungsreduktion erhalten weiterhin wiederholte und großflächige Animationen.
- **Lösungsvorschlag:** Die Präferenz für alle nicht notwendigen Bewegungen respektieren; Auswahl weiterhin über einen statischen Rand kenntlich machen. Mit emulierter Reduced-Motion-Einstellung testen.

# Produktvorschläge, keine behaupteten Spezifikationsfehler

## 🚨 Vorschlag – V01: Bestehende Generator- und Statistikfunktionen sind nicht erreichbar
- **Kategorie:** Funktionsumfang / ungenutzte Fähigkeiten
- **Betroffene Datei(en) / Komponente(n):** `src/services/puzzleGeneratorService.ts:111`, `src/services/statisticsService.ts`, `src/components/Tabs.tsx`, `src/utils/formatDuration.ts`.
- **Problembeschreibung:** Die aktuelle Oberfläche bietet feste Level und Fortschritt, aber keinen Einstieg in `generateLevel` und keine Ansicht der gespeicherten Zeit-/Schwierigkeitsstatistik. Suche nach Produktionsaufrufern bestätigt die fehlende UI-Anbindung. Historische TODO-Angaben, die eine Generatoranbindung als erledigt markieren, sind keine verbindliche aktuelle Produktspezifikation.
- **Auswirkung:** Vorhandene und getestete Fähigkeiten liefern Nutzern keinen sichtbaren Mehrwert; Statistikfehler bleiben schwer bemerkbar.
- **Lösungsvorschlag:** Produktentscheidung treffen: einen kleinen Generator-/Statistikeinstieg anbieten oder die Services ausdrücklich als interne Entwicklungswerkzeuge kennzeichnen. Beim Generator keine neuen Persistenzkonzepte stillschweigend einführen.

## 🚨 Vorschlag – V02: Wiederholte Lösungen können keine bessere Bestzeit erzielen
- **Kategorie:** Produktlogik / Statistiksemantik
- **Betroffene Datei(en) / Komponente(n):** `src/services/statisticsService.ts:50–55`, `src/hooks/useBoardGameLogic.ts` Reset und `recordBoardSolved`.
- **Problembeschreibung:** Der Idempotenzschlüssel ist die Puzzle-ID, die auch nach Reset gleich bleibt. Sobald das Puzzle einmal gezählt wurde, kehrt `recordSolve` vor jeder Aktualisierung zurück. Das vermeidet Doppelzählungen nach Undo, verhindert aber auch eine bessere Bestzeit bei einem echten neuen Versuch.
- **Auswirkung:** Falls Wiederholung und Bestzeitverbesserung gewünscht sind, bildet die Statistik diesen Ablauf nicht ab. Ob nur erstmalig gelöste Puzzle zählen sollen, ist aus dem aktuellen Modell nicht eindeutig als Produktziel ableitbar.
- **Lösungsvorschlag:** „Einzigartige gelöste Puzzle“ und „Spielversuche“ fachlich trennen. Nur falls Wiederholungen zählen sollen, eine Versuchs-ID für idempotente Abschlussbuchungen verwenden und die aggregierten Bedeutungen entsprechend benennen.

## Empfohlene Bearbeitungsreihenfolge

1. H01–H05: Offline-Registrierung, erreichbare Eingaben, Tastaturausstieg, konsistente Tippauswahl und Abschlusszustände.
2. H06–H08: Abschluss als belastbaren Übergang modellieren, Timerlebenszyklus reparieren, identische Aktionsregeln für Button und Tastatur.
3. M01–M04 und M12: sichtbare Persistenzfehler, getrennte Metadaten-/History-Semantik, sichere Shortcut-Kontexte und echte Integrationstests.
4. Übrige Robustheits-, Zugänglichkeits- und Dokumentationspunkte. Vorschläge erst nach fachlicher Entscheidung umsetzen.

Ein pauschaler Neuaufbau, ein Backend oder ein globaler State-Manager sind dafür nicht erforderlich. Die vorhandenen Grenzen können erhalten und die Übergänge gezielt korrigiert werden.

## Umfang des Berichts

**26 Punkte: 0 Kritisch · 8 Hoch · 12 Mittel · 4 Niedrig · 2 Vorschläge.**

Der Hallmark-Teil wurde auf die Spieloberfläche begrenzt: Die funktional begründete App-Struktur wurde nicht an Marketingseitenmustern gemessen. Relevante UI-Befunde sind die oben belegten Responsive- und Interaktionsprobleme; zusätzliche ästhetische „kritische“ Fehler wurden nicht aus Geschmacksurteilen konstruiert.


# Bearbeitungsstand nach dem Audit

Die ursprünglichen Befunde oben dokumentieren den Prüfstand, nicht den Zustand
nach den Korrekturen. Die Umsetzung erfolgt für Release **0.3.8**. Die unabhängige
Compose-Korrektur `5fe58b1` wurde vor dem Release übernommen. Bereits vorhandene
Paket-/Container-Upgrades werden als eigene Änderung in die Historie aufgenommen.

| Befund | Bearbeitung |
|---|---|
| H01 | Worker ohne Node-`process`-Bedingung registriert; frischer Offline-Reload und Wechsel auf Level 2 im Browser geprüft. |
| H02 | Dokument bleibt auf kurzen Displays scrollbar, Header bricht kontrolliert um; alle Kernaktionen auf sechs Bildschirmgrößen erreichbar. |
| H03 | Tab verlässt das Brett; interne Navigation bleibt bei Pfeilen/WASD. |
| H04 | Strategischer Tipp setzt Cursor und Eingabeauswahl gemeinsam; Eingabe/Undo/Redo im echten Browser geprüft. Erklärung steht im Seiteninhalt und verdeckt keine Eingaben. |
| H05 | Gelöst/Game Over sind terminal. Restore berechnet Abschluss aus dem bereinigten Brett. Reset ist der explizite Weg in einen neuen Versuch. |
| H06 | Abschluss vor Statistik gespeichert; Ergebnis an Spielinstanz gebunden. Zwei reale Board-Integrationstests prüfen verzögerte Buchung/Reset und Wiederaufnahme nach Reload. |
| H07 | Inaktive Timer-Ticks werden übersprungen; der Timer bleibt für Reset und verspätete Hydration verfügbar. Ursprünglicher roter Regressionstest besteht. |
| H08 | Gemeinsame Handler sperren terminale Aktionen; Buttons und Shortcuts folgen denselben Regeln. |
| M01 | Ladefehler erzeugen kein beschreibbares Ersatzspiel. Speicherfehler erscheinen mit Wiederholungsaktion. |
| M02 | History enthält nur Brett/Notiz-Kandidaten. Verbräuche werden nicht erstattet; ADR 0004 präzisiert ADR 0003 ausdrücklich. |
| M03 | Dialog-/Tutorial-/Reset-Kontext deaktiviert Spiel-Shortcuts; Menüfokus wird berücksichtigt. |
| M04 | Ctrl/Meta/Alt-Kombinationen bleiben außerhalb expliziter Undo-/Redo-Shortcuts unangetastet. |
| M05 | Reset fragt bei vorhandenen Werten oder Notiz-Kandidaten vorher nach; Abbruch erhält den Stand. |
| M06 | Gelöste Level behalten Nummern, erhalten eindeutige Namen; aktuelles Level und Fortschrittsbalken tragen ARIA-Zustände. |
| M07 | Reine Laufzeitprüfung für Levelstruktur/Regeln; gespeicherte Brettwerte und Metadaten normalisiert; Levelnummern als begrenzte Integer validiert. |
| M08 | Statistik-Read-modify-write ist serialisiert und zusätzlich mit Web Lock zwischen Fenstern geschützt; konkurrierende Buchungen getestet. |
| M09 | Exklusiver Schreibbesitz pro Puzzle; zweites Fenster meldet den Konflikt. Freigabe berücksichtigt ausstehende Saves und Effect-Neustarts. |
| M10 | Fullscreen-Fähigkeit geprüft, fehlende API deaktiviert; synchrone und asynchrone Fehler werden verständlich angezeigt. |
| M11 | Installationspräferenz gegen Storagefehler abgesichert; fehlgeschlagene Installation sichtbar. Test mit blockiertem Storage ergänzt. |
| M12 | Smoke-Test assertiert tatsächliche Spielfläche und Fehlerfreiheit; eigener freier Port. Echte Board-Integrationstests und Playwright-Abläufe ergänzt. |
| N01 | Stack-, Manifest-, Speicher- und Testdokumentation synchronisiert. |
| N02 | Produktives `any`, DOM-Queries und Hook-Unterdrückungen entfernt; zentraler Käfiglookup verwendet. Ein fokussierter Check mit dem vorhandenen TypeScript-Parser benötigt keine zusätzliche Abhängigkeit. Er ersetzt ausdrücklich keine vollständige ESLint-/Hook-Abhängigkeitsanalyse. |
| N03 | Käfigindex und statischer SVG-Baum werden passend zu Daten/Geometrie wiederverwendet. Keine unbelegte Aussage über messbare Akkulaufzeitgewinne. |
| N04 | Reduced Motion für Zell-, Einblend- und Ripple-Bewegungen berücksichtigt. |
| V01 | Bewusst als interne Funktionen dokumentiert: kein zusätzlicher Generator-/Detailstatistikeinstieg in diesem Fehlerbehebungsrelease. |
| V02 | Statistik zählt erstmalig gelöste Puzzle; Bestzeiten beziehen sich auf Erstabschlüsse. Diese bestehende Semantik ist jetzt in README und ADR 0004 ausdrücklich festgehalten. |

## Verbleibende Grenzen

Web Locks erfordern HTTPS/localhost und einen aktuellen Browser. Eine zweite
Instanz desselben Puzzles darf während des Schreibbesitzes nicht bearbeiten.
Die Statistik bleibt eine Erstabschlussstatistik. Kein Backend, neuer persistenter
Speicherkanal oder zusätzliche Prüfbibliothek wurde eingeführt. Safari-/Firefox-
Realgeräte und eine Screenreader-Sitzung sind weiterhin nicht behauptet.

Die Chunk-Warnung für den UI-Vendor bleibt dokumentiert; der Build funktioniert.
Eine weitere Aufteilung ohne gemessenen Nutzen wurde nicht vorgenommen.
