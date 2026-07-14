# To-Do-Liste (aktualisiert nach Audit)

## Projekt Setup

1.  [x] Initialisiere das Projekt mit TypeScript und React.
2.  [x] Richte Chakra UI ein.
3.  [x] Erstelle die Basisordnerstruktur.
4.  [x] Konfiguriere die PWA-Funktionalität mit Service Workers.
5.  [x] Richte die lokale Speicherung mit Web Storage API ein.

## Game Board (F1)

1.  [x] Implementiere das interaktive 9x9 Sudoku-Gitter.
2.  [x] Stelle die Käfige/Gruppen visuell dar.
3.  [x] Zeige die Summenwerte der Käfige an.
4.  [x] Hebe ausgewählte Zellen, Zeilen, Spalten und Blöcke hervor.
5.  [x] Gib farbcodiertes Feedback für gültige/ungültige Einträge.

## Input Methods (F2)

1.  [x] Implementiere die Touch-Eingabe für mobile Geräte.
2.  [x] Implementiere die Tastatureingabe für Zahlen und Navigation.
3.  [x] Implementiere das Klicken und Ziehen mit der Maus zur Auswahl.
4.  [x] Implementiere eine Numberpad-Oberfläche zur Eingabe.

## Game Mechanics (F3)

1.  [x] Erzwinge die Standard-Sudoku-Regeln.
2.  [x] Berechne und validiere die Käfigsummen.
3.  [x] Verhindere doppelte Ziffern innerhalb von Käfigen.
4.  [x] Erkenne die Gewinnbedingung.

## Difficulty Levels (F4)

1.  [x] Implementiere einfache Rätsel mit einfachen Käfigkonfigurationen.
2.  [x] Implementiere mittelschwere Rätsel mit moderater Komplexität.
3.  [x] Implementiere schwere Rätsel mit anspruchsvollen Konfigurationen.
4.  [x] Implementiere Expertenrätsel mit minimalen Hinweisen.

## Hint System (F5)

1.  [x] Hebe ungültige Einträge hervor.
2.  [x] Schlage mögliche Werte für die ausgewählte Zelle vor (F5).
3.  [x] Enthülle einen korrekten Zellenwert (begrenzte Nutzung).
4.  [ ] Gib strategische Tipps basierend auf dem aktuellen Board-Status.

## Game State Management (F6)

1.  [x] Speichere den aktuellen Spielstatus automatisch (sofort pro Eingabe).
2.  [ ] Biete mehrere Speicherplätze für verschiedene Rätsel.
3.  [ ] Implementiere die Undo/Redo-Funktionalität.
4.  [x] Verfolge die Spielstatistiken.

## User Interface (F7)

1.  [x] Responsives Layout mit Chakra UI (Basis).
2.  [ ] Nutze Chakra UIs eingebautes Dark/Light-Theme.
3.  [ ] Biete einen High-Contrast-Modus.
4.  [ ] Nutze Chakra UIs Theme-System für anpassbare Farben.

## Puzzle Generation (F8)

1.  [ ] Generiere zufällige Rätsel mit eindeutigen Lösungen (nur statische Levels vorhanden).
2.  [ ] Steuere den Schwierigkeitsgrad der generierten Rätsel.
3.  [ ] Stelle angemessene Käfiggrößen und -konfigurationen sicher.
4.  [ ] Biete die Möglichkeit, benutzerdefinierte Rätsel einzugeben.

## Offline Functionality (F9)

1.  [x] Biete Offline-Puzzle-Zugriff (über Service Worker).
2.  [x] Speichere die Puzzle-Bibliothek lokal.
3.  [ ] Synchronisiere die Daten, wenn die Verbindung wiederhergestellt ist (kein Backend).
4.  [x] Biete die Möglichkeit zur PWA-Installation.

## Tutorials and Help (F10)

1.  [ ] Biete ein interaktives Tutorial für neue Spieler.
2.  [ ] Biete Killer-Sudoku-Strategieanleitungen.
3.  [ ] Biete kontextsensitive Hilfe.
4.  [ ] Biete ein Glossar mit Begriffen.

## Spielanalytik und Statistiken (F11)

1.  [x] Implementiere Spielzeiterfassung für jedes Rätsel.
2.  [x] Erstelle Statistiken für gelöste Rätsel pro Schwierigkeitsgrad.
3.  [ ] Visualisiere den Spielerfortschritt mit Diagrammen.
4.  [ ] Implementiere Achievements/Erfolge für bestimmte Meilensteine.

## Erweiterte Testabdeckung (F12)

1.  [x] Schreibe Unit-Tests für die Spiellogik-Komponenten (gameLogicService).
2.  [x] Schreibe Unit-Tests für storageService und statisticsService.
3.  [ ] Implementiere Integrationstests für die UI-Komponenten.
4.  [ ] Füge Performance-Tests hinzu.

## Barrierefreiheit (F13)

1.  [x] Implementiere Keyboard-Navigation für Board-Zellen.
2.  [x] Screenreader-ARIA-Attribute für Zellen und Buttons.
3.  [ ] Teste und verbessere die Farbkontraste für Sehbehinderungen.
4.  [ ] Füge Untertitel oder Textbeschreibungen für alle audiovisuellen Elemente hinzu.

## Soziale Funktionen (F14)

1.  [ ] Erstelle eine Bestenliste für gelöste Rätsel.
2.  [ ] Implementiere Teilen-Funktionalität für Rätsel in sozialen Medien.
3.  [ ] Füge Export/Import-Funktionalität hinzu.
4.  [ ] Erstelle ein einfaches System zur Rätselbewertung.

## Fortgeschrittene Spielmodi (F15)

1.  [ ] Implementiere einen Zeitrennen-Modus mit Countdown.
2.  [ ] Erstelle einen täglichen Herausforderungsmodus.
3.  [ ] Füge einen "Zen-Modus" ohne Zeitdruck hinzu.
4.  [ ] Implementiere einen progressiven Schwierigkeitsmodus.

## Lokalisierung und Internationalisierung (F16)

1.  [ ] Richte i18next oder ähnliche Bibliotheken für Sprachunterstützung ein.
2.  [ ] Implementiere Übersetzungen für mindestens Englisch und Deutsch.
3.  [ ] Berücksichtige kulturspezifische Anpassungen für UI-Elemente.
4.  [ ] Implementiere RTL-Unterstützung.

## Leistungsoptimierung (F17)

1.  [ ] Implementiere Code-Splitting und Lazy Loading.
2.  [x] Optimiere Render-Performance mit useMemo (useEffect Deps reduziert).
3.  [x] Implementiere Service Worker für effizientes Caching.
4.  [ ] Führe Lighthouse-Tests durch.

## Erweitertes Benutzerprofil (F18)

1.  [ ] Implementiere lokale Benutzerprofile mit Avatarauswahl.
2.  [ ] Erstelle personalisierte Einstellungen für Spielpräferenzen.
3.  [ ] Implementiere Profilstatistiken und Erfolgsübersicht.
4.  [ ] Füge Thema-Anpassungsoptionen hinzu.

## CI/CD

1.  [ ] Richte GitHub Actions für automatisierte Tests und Bereitstellung ein.
2.  [ ] Konfiguriere Vercel/Netlify für die Bereitstellung.

## System Configuration

1.  [x] REACT_APP_VERSION (via package.json), REACT_APP_STORAGE_PREFIX (mit Default).
2.  [x] Ports konfiguriert (8084 für Container).
3.  [x] Konfigurationsdateien vorhanden.

## Acceptance Criteria

1.  [x] 9x9-Gitter mit Käfigen und Summen (AC1).
2.  [x] Touch/Tastatur/Maus-Eingabe (AC2).
3.  [x] Killer-Sudoku-Regeln validiert (AC3).
4.  [x] Vier Schwierigkeitsstufen (AC4).
5.  [x] Hinweise-System (AC5, ohne strategische Tipps).
6.  [x] Auto-Save und Resume (AC6).
7.  [x] Responsives Layout (AC7, Basis).
8.  [ ] Puzzle-Generator mit eindeutigen Lösungen (AC8, statische Levels).
9.  [x] PWA-Offline-Fähigkeit (AC9).
10. [ ] Interaktives Tutorial (AC10).
11. [x] Spielstatistiken (AC11).
12. [ ] Erweiterte Testabdeckung (AC12, in Arbeit).
13. [ ] WCAG 2.1 AA (AC13, in Arbeit).
14. [ ] Soziale Funktionen (AC14).
15. [ ] Erweiterte Spielmodi (AC15).
16. [ ] Internationalisierung (AC16).
17. [ ] Performance-Optimierung (AC17, in Arbeit).
18. [ ] Benutzerprofile (AC18).