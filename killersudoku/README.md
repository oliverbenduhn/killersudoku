# Killer Sudoku

Ein interaktives Killer Sudoku-Spiel, entwickelt mit React, TypeScript und Chakra UI als Progressive Web App (PWA).

![Killer Sudoku Screenshot](./src/assets/screenshot.png)

## 🎮 Über das Projekt

Killer Sudoku ist eine anspruchsvolle Variante des klassischen Sudoku. Zusätzlich zu den normalen Sudoku-Regeln (jede Zahl von 1-9 genau einmal in jeder Zeile, Spalte und 3x3-Block) gibt es "Käfige" - Gruppen von Zellen, deren Summe einem vorgegebenen Wert entsprechen muss und innerhalb derer keine Ziffer wiederholt werden darf.

Diese Anwendung bietet:
- Ein vollständig interaktives 9x9 Spielfeld
- Farblich markierte Käfige mit Summenvorgaben
- Echtzeit-Validierung der eingegebenen Zahlen
- Mehrere Schwierigkeitsstufen (Einfach, Mittel, Schwer, Experte)
- Hinweissystem zur Unterstützung
- Vollständige Offline-Funktionalität als PWA
- Undo/Redo-Funktionalität und automatisches Speichern
- Responsives Design für alle Gerätetypen
- Dunkle/Helle Themen und Barrierefreiheit-Features

## 🚀 Installation und Start

```bash
# Repository klonen
git clone https://github.com/yourusername/killersudoku.git
cd killersudoku

# Abhängigkeiten installieren
npm install

# Anwendung starten
npm start
```

Die Anwendung ist dann unter [http://localhost:3000](http://localhost:3000) verfügbar.

## 🧩 Spielanleitung

1. Klicke auf eine Zelle oder ziehe mit der Maus, um mehrere Zellen auszuwählen
2. Verwende das Nummernpad, um eine Zahl einzugeben
3. Beachte die Summen in den farbigen Käfigen
4. Erfülle die klassischen Sudoku-Regeln UND stelle sicher, dass die Summen in den Käfigen korrekt sind
5. Nutze die Hinweisfunktion für Hilfestellung (begrenzte Anzahl)
6. Das Spiel ist gewonnen, wenn alle Regeln erfüllt sind und das gesamte Brett korrekt ausgefüllt ist

## 📚 Spielfunktionen

- **Mehrere Eingabemethoden**: Unterstützung für Touch, Tastatur und Maus
- **Schwierigkeitsgrade**: Vier Stufen mit zunehmender Komplexität
- **Hinweissystem**: Hilfestellung für knifflige Situationen
- **Speichersystem**: Automatisches Speichern und mehrere Speicherplätze
- **Undo/Redo**: Schritte zurücknehmen oder wiederholen
- **Anpassbare UI**: Hell-/Dunkel-Modus und Kontrast-Einstellungen
- **Offline-Modus**: Volle Funktionalität ohne Internetverbindung
- **Tutorial**: Interaktive Einführung für neue Spieler

## 🛠️ Technologien

- React 18+
- TypeScript 5+
- Chakra UI für das responsive Design
- React Hooks für State Management
- Service Workers für PWA-Funktionalität 
- Web Storage API für lokale Datenspeicherung

## 🔄 Projektstruktur

```
src/
  ├── components/       # React UI-Komponenten
  ├── hooks/           # Benutzerdefinierte React Hooks
  ├── contexts/        # React Context Provider
  ├── services/        # Spiellogik, Rätselgenerierung, Validierung
  ├── utils/           # Hilfsfunktionen und Utilities
  ├── types/           # TypeScript-Typdefinitionen
  ├── styles/          # CSS/SCSS-Stylesheets
  └── assets/          # Bilder, Icons und andere Medien
```

## 📝 Entwicklungsstatus

Die Anwendung befindet sich in aktiver Entwicklung. Die aktuell implementierten Funktionen sind:
- ✅ Projekt-Setup mit TypeScript und React
- ✅ Chakra UI-Integration
- ✅ PWA-Funktionalität mit Service Workers
- ✅ Lokale Speicherung mit Web Storage API

Weitere Funktionen werden kontinuierlich hinzugefügt gemäß der [Projektplanungsdokumentation](./TODO.md).

## 🤝 Beitragen

Beiträge sind willkommen! Für größere Änderungen bitte zuerst ein Issue eröffnen, um die gewünschte Änderung zu diskutieren.

## 📝 Lizenz

MIT

## 📧 Kontakt

Projektlink: [https://github.com/yourusername/killersudoku](https://github.com/yourusername/killersudoku)

---

Erstellt mit ❤️ und [Create React App](https://github.com/facebook/create-react-app).
