# Level-Generierung — Konzeptpapier

Hintergrund und Verfahren für die Erzeugung von Killer-Sudoku-Puzzles.
Übersetzt die ursprüngliche Konzeptskizze (`Level.md` im Repo-Root, jetzt
hier archiviert) in eine wartbare Form.

## Empfohlener Aufbau

Der Generator arbeitet **mehrstufig**. Ein einzelner Algorithmus liefert
nicht alle gewünschten Eigenschaften gleichzeitig:

1. Vollständig gelöstes Sudoku erzeugen
2. Zellen in Käfige aufteilen
3. Käfigsumme berechnen
4. Eindeutigkeit prüfen
5. Schwierigkeit bewerten

### 1. Vollständig gelöstes Sudoku

Zwei praktikable Wege:

**Variante A — randomisiertes Backtracking mit MRV** (Minimum Remaining
Values). Effizient, deterministisch durch Seed steuerbar.

```
solve(grid):
    wenn alle Zellen gefüllt: return true
    cell = leere Zelle mit den wenigsten Kandidaten
    kandidaten = erlaubte Zahlen, zufällig gemischt
    für zahl in kandidaten:
        grid[cell] = zahl
        wenn solve(grid): return true
        grid[cell] = leer
    return false
```

**Variante B — Grundmuster + Symmetrie-Transformationen**. Schneller und
garantiert gültig. Grundmuster ist eine Lateinisch-Quadraht-Konstruktion
(siehe Original in `Level.md`), dann Vertauschen von Zahlen / Zeilen /
Spalten / Stapeln / Spiegeln / Drehen.

### 2. Käfige bilden

Randomisiertes Flood-Fill bzw. Region-Growing. Pro Käfig:

1. Wähle eine freie Zelle.
2. Bestimme Käfiggröße (gewichtet, nicht gleichverteilt).
3. Füge zufällig orthogonal angrenzende freie Zellen hinzu.
4. Stoppe bei Zielgröße oder fehlenden Nachbarn.
5. Wiederhole, bis alle Zellen vergeben sind.

**Gewichtung Käfiggröße** (Beispiel):

| Größe | Wahrscheinlichkeit |
|---|---|
| 1 | 5 % |
| 2 | 30 % |
| 3 | 35 % |
| 4 | 22 % |
| 5 | 8 % |

Mehr Einerkäfige → trivial, mehr große Käfige → schwer lesbar und oft
mehrdeutig. Die Quote wird per **Pool-Härtung** (ADR 0002) gegen die
Caps pro Schwierigkeit gefahren.

### 3. Käfigsumme

Direkt aus der Lösung:

```
sum(cage) = Σ solution[cell]   für cell ∈ cage.cells
```

**Wichtig**: Beim Bilden eines Käfigs dürfen keine Zellen mit identischen
Lösungswerten zusammengefasst werden. `2, 5, 8` ist ein gültiger Käfig mit
Summe 15; `2, 5, 2` ist ungültig — die Killer-Sudoku-Regel verbietet
Doppelte im Käfig.

### 4. Eindeutigkeit

Der wichtigste Schritt. Nur weil das fertige Sudoku bekannt ist, legen die
Käfige diese Lösung nicht zwingend eindeutig fest.

**Verfahren**:

- Killer-Sudoku-Solver in `utils/killerSolver.ts` (Constraint-Propagation
  + Backtracking).
- Zähle Lösungen, brich ab bei 2 (`countSolutions(puzzle, limit=2)`).
- Akzeptiere das Puzzle nur bei `anzahl == 1`.

**Käfig-Kombinationsvorberechnung** für jeden Käfig: alle möglichen
Ziffernkombinationen mit passender Summe. Beispiel 3er-Käfig mit Summe 15:

```
{1,5,9}, {1,6,8}, {2,4,9}, {2,5,8}, {2,6,7},
{3,4,8}, {3,5,7}, {4,5,6}
```

Diese werden durch Zeilen/Spalten/Block-Regeln laufend reduziert.

### 5. Schwierigkeit bewerten

Anzahl oder Größe der Käfige allein reicht nicht. Besser: simulierte
menschliche Lösungsschritte.

**Einfacher Score** (technisch, nicht menschlich):

```
score =
    einfache Schritte * 1
  + Kombinationseinschränkungen * 2
  + Paare/Tripel * 4
  + notwendige Vermutungen * 20
  + maximale Rekursionstiefe * 10
```

**Besser**: Solver, der menschliche Techniken ausführt:

- einzelne mögliche Zahl in einer Zelle
- einzelne mögliche Position in Zeile/Spalte/Block
- eindeutige Käfigkombination
- Käfigschnitt mit Zeilen oder Blöcken
- Min-Max-Summen (Innie/Outie)
- Naked Pairs/Triples
- Backtracking / Raten

Ein Puzzle, das der Computer mit tausend Kandidatenprüfungen löst, ist für
Menschen nicht automatisch schwer.

## Algorithmus-Auswahl

| Aufgabe | Algorithmus |
|---|---|
| Vollständiges Sudoku | Grundmuster + Zufallstransformationen (Variante B) |
| Alternative | Backtracking mit MRV (Variante A) |
| Käfigbildung | Region Growing / Flood Fill, gewichtet |
| Eindeutigkeit | Constraint Propagation + Backtracking |
| Professionelle Variante | SAT, SMT oder Constraint Programming |
| Schwierigkeitsbewertung | Menschlich-orientierter Regel-Solver |

Dancing Links / Algorithm X eignet sich für normales Sudoku hervorragend,
für Killer-Sudoku aber weniger, weil Summenbedingungen nicht direkt als
Exact-Cover abbildbar sind.

## Konkrete Empfehlung

1. Gültiges Sudoku durch Grundmuster + Transformationen erzeugen.
2. Käfige durch randomisiertes Region Growing bilden.
3. Doppelte Zahlen innerhalb eines Käfigs verhindern.
4. Käfigsummen aus der Lösung berechnen.
5. Mit Constraint-Solver auf genau eine Lösung testen.
6. Schwierigkeit regelbasiert bewerten.
7. Ungeeignete Käfige gezielt teilen, verbinden oder neu bilden.

## Validierung im Repo

- `utils/levelValidator.ts` prüft alle 100 Level-JSONs aus
  `public/assets/levels/`.
- `utils/killerSolver.ts` ist der Constraint-Propagation-Solver für
  Schritt 4.
- `utils/killerConstraints.ts` ist die Käfig-Analyse (Summen + No-Dup).
- `utils/killerCombinations.ts` berechnet Käfig-Kombinationen vor.
- `utils/killerRegions.ts` ist das Region-Growing.

Suite: `npm run lint:levels`. Pflicht nach jeder Änderung an Levels oder
am Validator.

## Einerkäfig-Quote (ADR 0002)

Bezugsgröße: Käfigs, nicht Zellen. Ein Einerkäfig ist trivial
unabhängig davon, wie viele andere Zellen er umgibt.

**Pool-Härtung**: pro Schwierigkeit werden drei Pools in steigender Härte
probiert, wenn die Quote den Cap nicht einhält. Letzte Stufe hat keinen
Pool mit Käfig-Größe `1`.

Vollständige Caps pro Schwierigkeit: [`adr/0002-einerkäfig-quote.md`](../adr/0002-einerkäfig-quote.md).

## Offene Punkte

- **Schwierigkeitsbewertung** ist Heuristik über die Levelnummer (Phase 1).
  Phase-2-Kandidat: Solver, der menschliche Techniken simuliert und einen
  diskreten Difficulty-Score liefert.
- **Puzzle-Generator-Pipeline** (`services/puzzleGeneratorService.ts`)
  existiert als Codebasis; eine echte Pipeline zur Massen-Erzeugung neuer
  Puzzles ist nicht ausimplementiert. Stand 0.2.2.
- **Schwierigkeits-Bias** der existierenden 100 Level ist nicht gemessen.
  Vor dem Hinzufügen weiterer Level: erst Solver-Score laufen lassen.