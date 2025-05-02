# To-Do-Liste

## Projekt Setup

1.  [x] Initialisiere das Projekt mit TypeScript und React.
2.  [x] Richte Chakra UI ein.
3.  [x] Erstelle die Basisordnerstruktur (public, src, components, hooks, contexts, services, utils, types, styles, assets).
4.  [x] Konfiguriere die PWA-Funktionalität mit Service Workers.
5.  [x] Richte die lokale Speicherung mit Web Storage API ein.

## Game Board (F1)

1.  [ ] Implementiere das interaktive 9x9 Sudoku-Gitter.
2.  [ ] Stelle die Käfige/Gruppen visuell dar.
3.  [ ] Zeige die Summenwerte der Käfige an.
4.  [ ] Hebe ausgewählte Zellen, Zeilen, Spalten und Blöcke hervor.
5.  [ ] Gib farbcodiertes Feedback für gültige/ungültige Einträge.

## Input Methods (F2)

1.  [ ] Implementiere die Touch-Eingabe für mobile Geräte.
2.  [ ] Implementiere die Tastatureingabe für Zahlen und Navigation.
3.  [ ] Implementiere das Klicken und Ziehen mit der Maus zur Auswahl.
4.  [ ] Implementiere eine Numberpad-Oberfläche zur Eingabe.

## Game Mechanics (F3)

1.  [ ] Erzwinge die Standard-Sudoku-Regeln (keine Duplikate in Zeilen, Spalten, Blöcken).
2.  [ ] Berechne und validiere die Käfigsummen.
3.  [ ] Verhindere doppelte Ziffern innerhalb von Käfigen.
4.  [ ] Erkenne die Gewinnbedingung.

## Difficulty Levels (F4)

1.  [ ] Implementiere einfache Rätsel mit einfachen Käfigkonfigurationen.
2.  [ ] Implementiere mittelschwere Rätsel mit moderater Komplexität.
3.  [ ] Implementiere schwere Rätsel mit anspruchsvollen Konfigurationen.
4.  [ ] Implementiere Expertenrätsel mit minimalen Hinweisen.

## Hint System (F5)

1.  [ ] Hebe ungültige Einträge hervor.
2.  [ ] Schlage mögliche Werte für die ausgewählte Zelle vor.
3.  [ ] Enthülle einen korrekten Zellenwert (begrenzte Nutzung).
4.  [ ] Gib strategische Tipps basierend auf dem aktuellen Board-Status.

## Game State Management (F6)

1.  [ ] Speichere den aktuellen Spielstatus automatisch.
2.  [ ] Biete mehrere Speicherplätze für verschiedene Rätsel.
3.  [ ] Implementiere die Undo/Redo-Funktionalität.
4.  [ ] Verfolge die Spielstatistiken.

## User Interface (F7)

1.  [ ] Implementiere ein responsives Layout mit Chakra UI für verschiedene Bildschirmgrößen.
2.  [ ] Nutze Chakra UIs eingebautes Dark/Light-Theme.
3.  [ ] Biete einen High-Contrast-Modus mit Chakra UIs Accessibility-Features.
4.  [ ] Nutze Chakra UIs Theme-System für anpassbare Farben und Erscheinungsbilder.

## Puzzle Generation (F8)

1.  [ ] Generiere zufällige Rätsel mit eindeutigen Lösungen.
2.  [ ] Steuere den Schwierigkeitsgrad der generierten Rätsel.
3.  [ ] Stelle angemessene Käfiggrößen und -konfigurationen sicher.
4.  [ ] Biete die Möglichkeit, benutzerdefinierte Rätsel einzugeben.

## Offline Functionality (F9)

1.  [ ] Biete Offline-Puzzle-Zugriff.
2.  [ ] Speichere die Puzzle-Bibliothek lokal.
3.  [ ] Synchronisiere die Daten, wenn die Verbindung wiederhergestellt ist.
4.  [ ] Biete die Möglichkeit zur PWA-Installation.

## Tutorials and Help (F10)

1.  [ ] Biete ein interaktives Tutorial für neue Spieler.
2.  [ ] Biete Killer-Sudoku-Strategieanleitungen.
3.  [ ] Biete kontextsensitive Hilfe.
4.  [ ] Biete ein Glossar mit Begriffen.

## CI/CD

1.  [ ] Richte GitHub Actions für automatisierte Tests und Bereitstellung ein.
2.  [ ] Konfiguriere Vercel/Netlify für die Bereitstellung.

## System Configuration

1.  [ ] Definiere Umgebungsvariablen (REACT\_APP\_VERSION, REACT\_APP\_STORAGE\_PREFIX).
2.  [ ] Konfiguriere die Ports (3000 für den Entwicklungsserver).
3.  [ ] Konfiguriere die Konfigurationsdateien (manifest.json, tsconfig.json, package.json).

## Acceptance Criteria

1.  [ ] Stelle sicher, dass das Spielbrett ein 9x9-Gitter mit visuell unterschiedlichen Blöcken und Käfigen korrekt anzeigt, wobei jeder Käfig seine erforderliche Summe anzeigt (AC1).
2.  [ ] Stelle sicher, dass Spieler Zahlen per Touch, Tastatur oder Maus mit gleicher Funktionalität und responsivem Feedback eingeben können (AC2).
3.  [ ] Stelle sicher, dass das Spiel Einträge gemäß allen Killer-Sudoku-Regeln validiert: keine Duplikate in Zeilen, Spalten, Blöcken und Käfigen; Käfigsummen müssen mit den Zielen übereinstimmen (AC3).
4.  [ ] Stelle sicher, dass die Anwendung Rätsel in mindestens vier Schwierigkeitsstufen mit jeweils eindeutigen lösbaren Konfigurationen bietet (AC4).
5.  [ ] Stelle sicher, dass das Hinweissystem nützliche Anleitungen bietet, ohne die Rätselherausforderung zu trivialisieren (AC5).
6.  [ ] Stelle sicher, dass der Spielfortschritt automatisch gespeichert wird und nach dem Schließen und erneuten Öffnen der Anwendung fortgesetzt werden kann (AC6).
7.  [ ] Stelle sicher, dass die Benutzeroberfläche vollständig responsiv ist und auf Geräten vom Mobiltelefon bis zum Desktop-Computer die gleiche Funktionalität bietet (AC7).
8.  [ ] Stelle sicher, dass der Puzzle-Generator gültige Killer-Sudoku-Rätsel mit eindeutigen Lösungen über alle Schwierigkeitsgrade hinweg erstellt (AC8).
9.  [ ] Stelle sicher, dass die Anwendung nach der Erstinstallation als PWA vollständig offline funktioniert (AC9).
10. [ ] Stelle sicher, dass neue Benutzer das Tutorial abschließen und alle Spielmechaniken ohne externe Hilfe verstehen können (AC10).
