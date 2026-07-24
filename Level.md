Am besten erzeugst du Killer-Sudoku-Spielfelder mit einem mehrstufigen Generator, nicht mit einem einzigen Algorithmus:

Empfohlener Aufbau

1. Vollständig gelöstes Sudoku erzeugen

Erzeuge zuerst ein gültiges 9×9-Sudoku mit einem randomisierten Backtracking-Algorithmus:

1. Leeres 9×9-Feld anlegen.


2. Für jede Zelle die Zahlen 1–9 zufällig durchprobieren.


3. Nur Zahlen setzen, die in Zeile, Spalte und 3×3-Block erlaubt sind.


4. Bei einer Sackgasse zurückspringen.



Für bessere Geschwindigkeit solltest du immer die Zelle mit den wenigsten möglichen Zahlen auswählen:

> MRV – Minimum Remaining Values



Das ist deutlich effizienter als stur von links oben nach rechts unten zu arbeiten.

solve(grid):
    wenn alle Zellen gefüllt:
        return true

    cell = leere Zelle mit den wenigsten Kandidaten
    kandidaten = erlaubte Zahlen, zufällig gemischt

    für zahl in kandidaten:
        grid[cell] = zahl

        wenn solve(grid):
            return true

        grid[cell] = leer

    return false

Alternativ kannst du ein bekanntes gültiges Grundmuster verwenden und durch Zeilen-, Spalten- und Zahlentausch randomisieren. Das ist erheblich schneller und erzeugt garantiert gültige Lösungen.

Ein Grundmuster wäre:

1 2 3 | 4 5 6 | 7 8 9
4 5 6 | 7 8 9 | 1 2 3
7 8 9 | 1 2 3 | 4 5 6
------+-------+------
2 3 4 | 5 6 7 | 8 9 1
5 6 7 | 8 9 1 | 2 3 4
8 9 1 | 2 3 4 | 5 6 7
------+-------+------
3 4 5 | 6 7 8 | 9 1 2
6 7 8 | 9 1 2 | 3 4 5
9 1 2 | 3 4 5 | 6 7 8

Danach randomisierst du durch:

Vertauschen der Zahlen 1–9

Vertauschen von Zeilen innerhalb eines Dreierbands

Vertauschen ganzer Dreierbänder

Vertauschen von Spalten innerhalb eines Stapels

Vertauschen ganzer Spaltenstapel

Spiegeln oder Drehen des Feldes


2. Zellen in Käfige aufteilen

Danach zerlegst du die 81 Zellen in zusammenhängende Käfige.

Dafür eignet sich ein randomisiertes Flood-Fill- beziehungsweise Region-Growing-Verfahren.

Vorgehen

1. Wähle eine noch nicht verwendete Zelle.


2. Bestimme eine zufällige Käfiggröße, beispielsweise 1 bis 5.


3. Füge zufällig orthogonal angrenzende, freie Zellen hinzu.


4. Stoppe, wenn die Zielgröße erreicht ist oder keine freie Nachbarzelle mehr existiert.


5. Wiederhole das, bis alle Zellen vergeben sind.



Käfige sollten normalerweise nur über gemeinsame Kanten verbunden sein, nicht nur diagonal.

while es gibt freie Zellen:
    start = zufällige freie Zelle
    zielgröße = gewichtete Zufallszahl zwischen 1 und 5

    cage = {start}

    while cage kleiner als zielgröße:
        kandidaten = freie Nachbarn aller Zellen im cage

        wenn keine Kandidaten:
            break

        neueZelle = zufälliger Kandidat
        cage.add(neueZelle)

    speichere cage

Die Käfiggröße sollte nicht gleichverteilt sein. Beispielsweise:

1 Zelle:   5 %
2 Zellen: 30 %
3 Zellen: 35 %
4 Zellen: 22 %
5 Zellen:  8 %

Zu viele Einerkäfige machen das Sudoku zu leicht. Zu viele große Käfige machen es schwer zu lesen und häufig mehrdeutig.

3. Käfigsumme berechnen

Die Summe eines Käfigs ergibt sich direkt aus dem zuvor erzeugten Lösungsfeld:

summe = Summe aller Lösungszahlen im Käfig

Wichtig ist die Killer-Sudoku-Regel:

> Innerhalb eines Käfigs darf eine Zahl normalerweise nicht mehrfach vorkommen.



Deshalb solltest du beim Erzeugen eines Käfigs keine Zellen zusammenfassen, deren Lösungswerte identisch sind.

Beispiel:

Lösungswerte im Käfig: 2, 5, 8
Käfigsumme: 15

Ein Käfig mit 2, 5, 2 wäre ungültig, obwohl die Zellen in unterschiedlichen Zeilen und Spalten liegen könnten.

4. Eindeutigkeit prüfen

Das ist der wichtigste Schritt.

Nur weil du das fertige Sudoku kennst, bedeutet das nicht, dass die Käfige diese Lösung eindeutig festlegen.

Du brauchst deshalb einen Killer-Sudoku-Solver, der alle Lösungen zählt.

Der Solver berücksichtigt:

jede Zahl 1–9 einmal pro Zeile

jede Zahl 1–9 einmal pro Spalte

jede Zahl 1–9 einmal pro 3×3-Block

exakte Summe pro Käfig

keine Zahl doppelt innerhalb eines Käfigs


Der Generator akzeptiert das Spielfeld nur, wenn der Solver genau eine Lösung findet:

anzahl = countSolutions(puzzle, limit=2)

wenn anzahl == 1:
    Puzzle akzeptieren
sonst:
    Käfige verändern oder neu erzeugen

Du solltest bei zwei gefundenen Lösungen sofort abbrechen. Mehr musst du nicht zählen, weil bereits feststeht, dass das Puzzle nicht eindeutig ist.

Geeigneter Solver

Für eine eigene Implementierung ist am praktischsten:

> Constraint-Propagation plus Backtracking mit MRV



Dabei führst du für jede Zelle eine Kandidatenmenge.

Zusätzlich kannst du für jeden Käfig vorher alle möglichen Zahlenkombinationen berechnen.

Beispiel für einen Dreierkäfig mit Summe 15:

1, 5, 9
1, 6, 8
2, 4, 9
2, 5, 8
2, 6, 7
3, 4, 8
3, 5, 7
4, 5, 6

Diese Kombinationen werden durch bereits gesetzte Zahlen, Zeilen-, Spalten- und Blockregeln laufend reduziert.

5. Schwierigkeit bewerten

Die Anzahl oder Größe der Käfige allein reicht nicht zur Bewertung.

Ein sinnvoller Schwierigkeitswert basiert darauf, welche Lösungstechniken erforderlich sind:

einzelne mögliche Zahl in einer Zelle

einzelne mögliche Position in Zeile, Spalte oder Block

eindeutige Käfigkombination

Käfigschnitt mit Zeilen oder Blöcken

Min-Max-Summen

Naked Pairs oder Triples

fortgeschrittenes Backtracking beziehungsweise Raten


Ein einfacher technischer Schwierigkeitswert könnte sein:

score =
    einfache Schritte * 1
  + Kombinationseinschränkungen * 2
  + Paare/Tripel * 4
  + notwendige Vermutungen * 20
  + maximale Rekursionstiefe * 10

Noch besser ist ein Solver, der menschliche Lösungsschritte simuliert. Ein Puzzle, das der Computer mit tausenden Kandidatenprüfungen löst, muss für Menschen nicht automatisch schwer sein.

Meine konkrete Empfehlung

Für einen soliden Generator:

1. Gültiges Sudoku durch Grundmuster + Transformationen erzeugen
2. Käfige durch randomisiertes Region Growing bilden
3. Doppelte Zahlen innerhalb eines Käfigs verhindern
4. Käfigsummen aus der Lösung berechnen
5. Mit Constraint-Solver auf genau eine Lösung testen
6. Schwierigkeit durch regelbasierten Solver bewerten
7. Ungeeignete Käfige gezielt teilen, verbinden oder neu bilden

Welche Technik wofür?

Aufgabe	Empfehlenswerter Algorithmus

Vollständiges Sudoku	Grundmuster + Zufallstransformationen
Alternative Sudoku-Erzeugung	Randomisiertes Backtracking mit MRV
Käfigbildung	Randomisiertes Region Growing / Flood Fill
Lösen und Eindeutigkeit	Constraint Propagation + Backtracking
Professionelle Umsetzung	SAT, SMT oder Constraint Programming
Schwierigkeitsbewertung	Menschlich orientierter Regel-Solver


Dancing Links beziehungsweise Algorithm X ist für normales Sudoku hervorragend, für Killer Sudoku aber weniger bequem, da Summenbedingungen nicht direkt als klassische Exact-Cover-Bedingungen abbildbar sind. Ein Constraint-Solver, SAT-Solver oder eigener Backtracking-Solver passt hier besser.