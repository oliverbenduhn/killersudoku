# Undo/Redo speichert Nachher- statt Vorher-Zustand für Redo

## Status

accepted

## Kontext & Entscheidung

`applyMove` (`useGameState.ts`) legt beim Ausführen einer Aktion den Zustand
**vor** der Änderung auf den Undo-Stack (`past`). Beim Undo entnimmt
`useUndoRedo.undo()` genau diesen Vorher-Zustand aus `past` und schiebt ihn
unverändert auf den Redo-Stack (`future`). Redo wendet damit denselben
Vorher-Zustand erneut an, statt den ursprünglichen Nachher-Zustand
wiederherzustellen — Redo kann die rückgängig gemachte Aktion also nicht
zuverlässig reproduzieren.

Der Bug betrifft das gesamte Undo/Redo-System (nicht nur Werteingaben) und
wurde im Rahmen der Bleistiftmodus-Spezifikation (Notiz-Kandidaten) entdeckt,
weil dort erstmals ein verbindlicher Test `Notiz setzen → Undo → Redo →
Notiz wieder da` gefordert wurde.

**Entscheidung**: `applyMove` legt beim Ausführen einer Aktion sowohl den
Vorher- als auch den Nachher-Zustand ab (z. B. als Paar auf dem Undo-Stack,
oder durch Umbau auf Vorher/Nachher-Einträge statt reiner Zustands-Snapshots).
Undo wendet den Vorher-Zustand an und legt den Nachher-Zustand auf den
Redo-Stack; Redo wendet exakt diesen Nachher-Zustand wieder an. Damit wird
Redo für jede Aktion, die über `applyMove` läuft (Werteingabe, Löschen,
Notiz-Toggle, Reveal-Hint), korrekt.

**Reset ist ausdrücklich ausgenommen**: Der bestehende Reset-Pfad nutzt
bewusst `updateGameState` statt `applyMove` und löscht anschließend die
gesamte Undo/Redo-Historie (`useBoardGameLogic.ts`, Kommentar: „Reset
verwirft die Undo-History, sonst könnte der User nach Reset auf 'Undo'
drücken und wäre wieder vor dem Reset"). Dieses Verhalten ist korrekt und
bleibt von diesem Fix unberührt — Reset ist und bleibt nicht rückgängig
machbar.

Dieser Fix ist Vorbedingung für die Bleistiftmodus-Implementierung und wird
vor bzw. als erster Schritt davon umgesetzt, nicht als deren Bestandteil.

## Considered Options

- **Bug ignorieren, nur für Notizen dokumentieren**: abgelehnt — das
  Undo/Redo-System bliebe für das gesamte Spiel (nicht nur Notizen) fehlerhaft.
- **Separater Fix vor der Notizen-Implementierung** (gewählt): isolierter,
  gut testbarer Fix, auf dem die neue Funktion aufbauen kann, ohne einen
  bekannten Fehler zu erben.

## Consequences

- `useUndoRedo`/`useGameState` benötigen eine Anpassung der Stack-Einträge
  (Vorher/Nachher statt nur Vorher).
- Ein verbindlicher Regressionstest `Aktion → Undo → Redo → identischer
  Nachher-Zustand` wird Teil der Testsuite, unabhängig vom Notizen-Feature.
  Reset ist explizit nicht Teil dieses Tests.
- Bestehende Undo/Redo-Tests (falls vorhanden) müssen ggf. an das neue
  Stack-Format angepasst werden.
