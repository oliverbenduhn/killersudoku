# Master-Audit Killer Sudoku — 18.11.2026

Stand: `fb1d9d4`, App `0.3.9`, Arbeitsbaum vor Audit sauber. `AGENTS.md` vor der Prüfung gelesen. Nur dieser Bericht wurde im Repository geändert.

## Kurzfazit

Die statische Offline-PWA hat eine tragfähige Architektur: validierte Leveldaten, getrennte Brettschichten, serialisierte Spielstände und exklusive Schreibsitzungen. Tests, Build, Lint, Smoke und Chromium-Flows sind grün. Die wichtigsten Lücken liegen außerhalb des grünen Normalpfads: Wer das Brett nicht sehen kann, erhält die entscheidende Käfigstruktur nicht als Teil der Zellnavigation. Und bei einem fehlgeschlagenen Schreibvorgang kann ein normaler Levelwechsel den einzigen aktuellen Stand verwerfen. Ein temporärer Level-Ladefehler hat außerdem keinen direkten Wiederholungsweg. Kein kritischer Befund im geprüften Umfang.

## Prüfumfang und Ergebnisse

Node `v24.18.0`, npm `12.0.1`, vorhandene Abhängigkeiten; keine Installation, kein Deployment. Build und Browser-Skripte liefen in einer temporären Quellkopie mit verlinkten Abhängigkeiten; der bestehende Projekt-Build wurde nicht überschrieben.

| Prüfung | Ergebnis |
|---|---|
| `git status --short`; `git rev-parse --short HEAD`; `git ls-files src scripts docs/agents`; `npm pkg get scripts` | Arbeitsbaum anfangs sauber; Stand und vorhandene Prüfwerkzeuge ermittelt. |
| `npm test -- --runInBand` | 40 Suites, 411 Tests bestanden. Enthält Domänenregeln, Parser/Validator, Komponenten/Hooks und Storage; insbesondere Fehler beim Laden und Speichern mit Retry in `src/hooks/useGameState.test.tsx:286–308`. |
| `npm run validate` | Vollständiger Wiederholungslauf erfolgreich: Typecheck, fokussierter Standards-Lint und Level-Validator (9 Tests) grün. Kein umfassender ESLint-, A11y- oder Lieferkettencheck. |
| `npm run build` | Erfolgreich; Vite 8.2.1, Workbox-Precache 113 Einträge / 1652,42 KiB. Warnung: `vendor.ui` 573,11 kB minifiziert / 185,27 kB gzip. |
| `npm run test:smoke` | Produktions-App lädt; Überschrift und 81 Zellen vorhanden; keine Laufzeit-/HTTP-Fehler im Smoke. |
| `npm run test:flows` | Vollständiger Wiederholungslauf erfolgreich: Chromium 1280×900, 375×568, 320×800, 414×800, 768×414, 667×375. Speichern/Reload, Reset/Abbruch, Tipp/Eingabe/Undo/Redo, Dialog-Isolation, Tab-Ausstieg, Scrollen und geprüfte Touch-Ziele; gemessener CLS 0,000–0,001. Zusätzlich Desktop: konkurrierendes Fenster, terminale Zustände und Reset-Timer, Offline-Reload und Levelwechsel. Kein Beleg für alle Touch-Gesten oder alle Browser. |
| `npm run preview -- --host 127.0.0.1 --port 4189 --strictPort`; `curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4189`; `node --input-type=module` mit Playwright-Sonde | HTTP 200. Lokaler Chromium bei 360×740, isolierter Kontext, Service Worker für gezielte Fehlerprobe blockiert: erste Anfrage für `level_1.json` simuliert 503, Fehler sichtbar, kein Retry-Knopf; Reload lud das Brett. Nach Fokus auf das Grid und `ArrowRight` war Zelle 1/2 ausgewählt, DOM-Fokus blieb auf Grid, kein `aria-activedescendant` und keine `row`-Rollen bei 81 `gridcell`-Rollen. Kein Screenreader-Test. |

Der erste kombinierte Aufruf von Jest/Validate und der erste kombinierte Aufruf von Build/Smoke/Flows stießen je an die äußere 180-s-Grenze. Die einzeln wiederholten Validate- und Flow-Läufe endeten mit Exit 0; die Zeitgrenze ist kein App-Fehler.

### Architektur und Kernflüsse

- **Start, Levelwahl, Offline:** `src/index.tsx` startet React und registriert den Worker. `src/App.tsx:34–93` begrenzt das zuletzt gewählte Level auf 1–100, lädt bei Wechsel neu und ignoriert veraltete Antworten. `src/services/levelService.ts:21–39` prüft Nummer/HTTP, parst unbekanntes JSON über `src/utils/parseLevel.ts`; `HomeTab` filtert unpassende Leveldaten, bevor `Board` eine Session übernimmt. `vite.config.ts:11–32` nimmt Level-JSON und App-Dateien in den Precache auf. Offline-Reload nach Worker-Aktivierung ist belegt, ein allererster Offline-Start ohne Cache nicht zugesagt.
- **Spiel, Hinweise, History:** Pointer/Touch und Tastatur erreichen die Auswahl-Hooks; Zahlenpad und Tastatur führen in `useBoardGameLogic`, danach in `gameLogicService` für Sudoku- und Käfigregeln. Stiftmodus bleibt flüchtig; Notiz-Kandidaten sind Teil des Spielstands. Strategischer Tipp und Direkt-Hinweis teilen das Budget; ohne gefundenen Tipp keine Abbuchung. Undo/Redo speichert Vorher/Nachher von Werten und Notizen, nicht Fehler/Hinweiszähler. Das Brett zeigt Fläche/Interaktion, SVG-Linien und Zahlen getrennt (ADR 0001). Terminale Zustände sperren Eingaben und History; Reset bestätigt drohenden Verlust von Werten oder Notizen. Abbruch verändert das Brett nicht; Bestätigung startet ohne vorherige History neu (ADR 0003/0004).
- **Speichern, Wiederaufnahme, Konflikt:** `useGameState` hält React-Snapshot und Ref, schreibt Zugänderungen sofort asynchron, Zeit zusätzlich periodisch. `storageService` serialisiert localforage-Operationen; ein exklusiver Web Lock pro Puzzle schützt die aktive Spielsitzung und bleibt beim normalen Unmount bis zum Abarbeiten bereits eingereihter Writes. Ein zweites Fenster erhält keinen Editor, sondern Retry; ohne Web Locks gibt es bewusst keinen ungeschützten Fallback. Lesefehler erzeugen kein Ersatzspiel. Reload normalisiert Werte/Notizen, begrenzt Zähler auf 0–3 und rekonstruiert Gelöst/Game Over; die Undo-History bleibt sitzungsbezogen. Save-Retry nutzt den neuesten In-Memory-Stand, solange die Sitzung existiert.
- **Abschluss und Fortschritt:** `Board.tsx:301–324,352–366` markiert abgeschlossen/angefangen in localStorage, bucht Statistik über `recordBoardSolved` idempotent je Puzzle und aktualisiert den Buchungsmarker nur für dieselbe Spielinstanz. Fehler der Statistik haben einen eigenen Retry; ein noch nicht gebuchter, persistierter Abschluss kann beim Reload erneut gebucht werden. Die Levelübersicht liest Fortschrittsmarker synchron. Generator und Detailstatistik haben absichtlich keinen UI-Einstieg (ADR 0004), kein Anlass für neue Schichten.

## Befunde

### Kritisch

Keine im geprüften Umfang.

### Hoch

#### MA-01 — Käfigstruktur ist über die Zellnavigation nicht zugänglich

- **Kategorie / Fundstelle:** Barrierefreiheit, Kernspiel; `src/components/Board/Board.tsx:462–498`, `src/components/Board/BoardSurface.tsx:211–217,427–453,472–478`.
- **Auslöser / Beleg / Laufzeitstatus:** Grid fokussieren, mit Pfeil nach rechts navigieren. Chromium: `aria-selected` wechselt auf Zeile 1 Spalte 2; Fokus bleibt am Grid, kein `aria-activedescendant`, keine `row`-Rollen. Zellnamen enthalten Position, Wert und ggf. Notizen, aber keine Käfigzugehörigkeit oder Sollsumme. Käfiggrenzen werden nur gezeichnet; das Linien-SVG ist `aria-hidden`. Einzeln sichtbare Käfigzahlen in einer zweiten Schicht ersetzen die Zuordnung nicht. DOM bestätigt; konkrete Ansagen nicht mit Screenreader gemessen.
- **Soll / Ist:** Käfigzugehörigkeit und Summe sind dieselbe spielnotwendige Information wie eine Vorgabeziffer und müssen beim nichtvisuellen Navigieren ermittelbar sein. Ist: Auswahl wird optisch und über `aria-selected` aktualisiert, aber weder Fokus auf aktive Zelle noch zugängliche Käfigbeschreibung werden mitgeführt.
- **Auswirkung / Schweregrad:** Hoch: selbstständiges Lösen ohne Sicht ist nicht gleichwertig möglich; betrifft die Kernfunktion, nicht nur Komfort.
- **Lösung / Erfolgskriterium:** Existierende Zell-/Käfigzuordnung verwenden, Grid mit semantischen Zeilen und aktiver Zelle (roving tabindex oder `aria-activedescendant` mit stabiler ID) versehen; Käfigsumme und Zugehörigkeit zugänglich machen. Mit NVDA und VoiceOver lässt sich ohne Sicht von Zelle zu Zelle navigieren, Käfigstruktur samt Summe rekonstruieren, eine Zahl eingeben und das Grid mit Tab verlassen; Tastatur/Touch bleiben funktionsfähig.

#### MA-02 — Levelnavigation verwirft nach Schreibfehler den ungesicherten Stand

- **Kategorie / Fundstelle:** Persistenz / Fehlerbehandlung; `src/hooks/useGameState.ts:33–45,121–127,143–149,175–177`, `src/components/Board/Board.tsx:451–453`, `src/App.tsx:163–166,209–228`, `src/services/storageService.ts:16–18,55–62`.
- **Auslöser / Beleg / Laufzeitstatus:** Ein Zug ändert zuerst Ref/React-State; danach scheitert der Write. Bei sichtbarem Speicherfehler die Levelübersicht öffnen und wieder zurückkehren. App unmountet `HomeTab` und damit Retry und In-Memory-Kopie. Die Lease wartet auf die Queue, aber deren Tail behandelt Ablehnung ausdrücklich als beendet, nicht als ausstehende Sicherung. Fehler + Retry separat im Jest-Test grün; Kombination mit Navigation und Reload nur statisch nachvollzogen.
- **Soll / Ist:** Bei einem bekannten ungesicherten Zug muss eine normale In-App-Navigation den Stand erhalten oder einen bewusst bestätigten Verlust verlangen. Ist: Banner empfiehlt, das Fenster offen zu lassen; selbst dann reicht ein Klick auf die Levelübersicht, um die Sitzung mit der einzigen Kopie zu verwerfen. Sofortiger Browser-Reload während eines Writes ist zusätzlich ein noch nicht vermessener Fall.
- **Auswirkung / Schweregrad:** Hoch: unter realem Speicherfehler können mehrere Züge, Notizen oder der Abschluss verloren gehen; die appinterne Aktion wirkt nicht destruktiv. Kein allgemeiner Datenverlust im Normalpfad belegt.
- **Lösung / Erfolgskriterium:** Für In-App-Navigation den letzten unbestätigten Zustand aus der bestehenden Speicherlogik sichtbar machen: erst erfolgreich sichern oder expliziten Abbruch/Verwurf anbieten; nicht die Queue neu bauen. Mit fehlschlagendem Write → Levelübersicht → Bleiben/Retry bleibt das Brett unverändert; nach erfolgreichem Retry überstehen Werte und Notizen Wechsel und Reload. Scheitert Retry erneut, ist Verwerfen eine ausdrückliche Nutzerentscheidung.

### Mittel

#### MA-03 — Temporärer Level-Ladefehler ohne direkten Retry

- **Kategorie / Fundstelle:** UX / Verfügbarkeit; `src/App.tsx:69–89,121–123`, `src/services/levelService.ts:21–39`, `src/components/Board/Board.tsx:390–408`.
- **Auslöser / Beleg / Laufzeitstatus:** Erste Anfrage für Level 1 mit HTTP 503 beantwortet: Fehlermeldung, kein Retry; Reload erfolgreich. Derselbe Levelwert löst keinen neuen Effekt aus. Der vorhandene Retry im Brett gilt nur für den Spielstand bzw. Lock.
- **Soll / Ist:** Ein flüchtiger Netzwerkfehler sollte ohne Wechsel oder Seiten-Reload wiederholbar sein. Ist: Eigener Fehlerzustand, aber keine Aktion; Fetch wird beim Wechsel außerdem nur logisch ignoriert, nicht abgebrochen.
- **Auswirkung / Schweregrad:** Mittel: aktueller Level unbenutzbar bis Reload oder Umweg über einen anderen Level; kein direkter Spielstandverlust belegt.
- **Lösung / Erfolgskriterium:** Retry beim Eigentümer des Fetch-Effekts in `App` auslösen, bestehende Fehlermeldung um Button ergänzen; für überholte Requests bei Bedarf Fetch-Abbruch mit demselben Effekt verbinden. Prüfen: 503 → Retry → Level 1 und vorhandener Spielstand; schneller Wechsel A→B lässt eine verspätete A-Antwort nicht in B erscheinen.

#### MA-04 — Fortschrittsmarker für verschiedene Level können sich überschreiben

- **Kategorie / Fundstelle:** Persistenz / Mehrfenster; `src/services/progressService.ts:10–53`, `src/components/Tabs.tsx:90–94`, `src/services/storageService.ts:9–19,45–65`.
- **Auslöser / Beleg / Laufzeitstatus:** Zwei Fenster bearbeiten erlaubterweise unterschiedliche Level. Beim gleichzeitigen Hinzufügen eines Fortschrittsmarkers lesen beide dasselbe Gesamtset, ergänzen verschiedene Nummern und schreiben es zurück. Der pro Puzzle gehaltene Lock schützt diese gemeinsamen localStorage-Keys nicht. Statische Analyse, keine verlorene Markierung im Browser nachgestellt.
- **Soll / Ist:** Jedes unabhängig abgeschlossene Level muss in der Übersicht zählen. Ist: globale Read-modify-write-Operationen sind nicht gemeinsam serialisiert; der letzte Schreibvorgang kann den anderen Marker verlieren. Das Öffnen eines betreffenden gelösten Bretts kann einen fehlenden Marker erneut setzen.
- **Auswirkung / Schweregrad:** Mittel: Benutzerfortschritt und Levelstatus können falsch erscheinen, obwohl die eigentlichen Spielstände intakt sind.
- **Lösung / Erfolgskriterium:** Gemeinsame Fortschritts-Updates per vorhandenem `runStorageOperation` unter einem Fortschritts-Key serialisieren oder Levelmarker ohne gemeinsames Read-modify-write speichern; nicht beides. Zwei Fenster mit unterschiedlichen Leveln behalten nach parallelem Start/Abschluss und erneutem Öffnen der Übersicht beide Markierungen.

### Niedrig

#### MA-05 — Vertrag für konkurrierendes Fenster ist uneindeutig

- **Kategorie / Fundstelle:** Dokumentation / Architektur; `AGENTS.md:152–155`, `docs/adr/0004-terminal-state-history-and-storage.md:28–35`, `src/hooks/useGameState.ts:66–74`, `src/components/Board/Board.tsx:390–395`.
- **Auslöser / Beleg / Laufzeitstatus:** Dasselbe Puzzle in zweitem Fenster öffnen. Desktop-Suite bestätigt Ablehnung; Code rendert Meldung/Retry statt eines sichtbaren schreibgeschützten Bretts.
- **Soll / Ist:** AGENTS sagt „read-only“, ADR ausdrücklich Sperrmeldung mit Retry. Ist entspricht dem ADR; sofern „read-only“ Sichtbarkeit impliziert, ist der Agentenvertrag irreführend.
- **Auswirkung / Schweregrad:** Niedrig: Gefahr unnötiger Implementierung oder falscher Testannahmen, kein belegter Nutzerdefekt.
- **Lösung / Erfolgskriterium:** AGENTS auf „Sperrmeldung und Retry, kein Brett bis zur Lock-Übernahme“ präzisieren. ADR, Agentenvertrag und Flow-Assertion beschreiben danach denselben Zustand; keine zusätzliche View bauen.

### Vorschlag

#### MA-06 — Vendor-Größe messen, nicht auf Verdacht splitten

- **Kategorie / Fundstelle:** Performance / PWA; `vite.config.ts:29–32,57–89`.
- **Auslöser / Beleg / Laufzeitstatus:** Produktions-Build überschreitet für `vendor.ui` die 500-kB-Warnschwelle (573,11 kB minifiziert). Browser-Smoke und Chromium-Flows grün; Kaltstartkosten auf schwacher Hardware nicht gemessen.
- **Soll / Ist:** Ein brauchbarer Erststart auf Zielgeräten ist relevanter als die Warnschwelle. Ist: gemeinsamer Vendor-Chunk mit dokumentiertem Grund (frühere Zirkelimporte beim Split) und vollständigem Precache.
- **Auswirkung / Schweregrad:** Vorschlag: möglicher Netz-/Parsing-Aufwand beim Erststart, kein nachgewiesener Engpass.
- **Lösung / Erfolgskriterium:** Vorerst nichts umbauen. Erststart bis zum bedienbaren Brett und Installationsbytes auf Zielgerät messen; nur bei überschrittenem Budget einen tatsächlich später benötigten Import verschieben. Erfolg: messbar besserer Kaltstart ohne Smoke-/Offline-Regression.

## Offene Punkte und nächste Checks

| Priorität | Nächster Check |
|---|---|
| 1 | MA-01 mit NVDA/Firefox und VoiceOver/Safari prüfen: Käfigsumme/-zugehörigkeit, Auswahlwechsel, Notiz, Fokus nach Dialog/Reset; Kontrast aller Farbmodi, 200 % Zoom und Reduced Motion ergänzen. |
| 2 | MA-02 mit kontrolliert verzögertem bzw. scheiterndem IndexedDB-Write im echten Browser prüfen: Wechsel, Save-Retry, sofortiger Reload/Tab-Schluss, fehlgeschlagener Reset und anschließende Wiederaufnahme. Statistikfehler getrennt simulieren und genau eine Buchung nach Retry/Reload nachweisen. |
| 3 | MA-04 mit zwei verschiedenen Rätseln in zwei Fenstern und gleichzeitig ausgelöster Fortschrittsänderung prüfen. Lock-Übernahme nach Tab-Schluss und Retry bei Lesefehler auf Safari/Firefox ergänzen. |
| 4 | Native iOS-/Android-PWA: Erstbesuch/Tutorial, Abbruch der Installation, installierter Offline-Start, echter Finger-Drag (inkl. `pointercancel`), Hoch-/Querformat und Update von vorherigem Worker bei offenem Spiel. Chromium-Viewports ersetzen keine Geräteprüfung; Produktionshost nicht geprüft. |
| 5 | Für MA-03 zusätzlich ungültiges JSON, langsamen Request und raschen Levelwechsel prüfen; für MA-06 Erststartmessung. Keine externe Paket-/Lieferkettenprüfung oder umfassende Performance- und A11y-Zertifizierung vorgenommen. |
