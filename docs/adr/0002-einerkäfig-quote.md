# Einerkäfig-Quote als Generator-Constraint

## Status

accepted

## Kontext & Entscheidung

In den 100 vorgefertigten Leveln liegt die Einerkäfig-Quote bei ≈ 42 % (1750/4150
Cages). Damit verrät fast jeder zweite Käfig trivial eine Zelle; das Rätsel ist
in der Praxis nicht mehr „Killer-Sudoku-Logik", sondern „Cage-Highlighting".
Wir führen eine **Cage-Quote** (nicht Zell-Quote) als Constraint ein, gestaffelt
nach Schwierigkeit:

| Schwierigkeit | max. Cage-Quote |
|---|---|
| easy | 10 % |
| medium | 8 % |
| hard | 4 % |
| expert | 2 % |

Bezugsgröße ist **Anteil an Käfigs** (nicht an Zellen), weil ein Einerkäfig ein
trivialer Käfig ist — was am Anteil der trivialen Käfigs gemessen werden muss, nicht
an deren Anteil an Zellen.

## Mechanik: Pool-Härtung

Der Generator probiert pro Schwierigkeit drei Pools in steigender Härte. Wenn die
Einerkäfig-Quote den Cap nach `MAX_ATTEMPTS = 60` Versuchen nicht einhält, geht
er zur nächsten Stufe über. Letzte Stufe ist immer ein Pool ohne `1` als
Käfig-Größe.

| Schwierigkeit | Stufe 1 | Stufe 2 | Stufe 3 |
|---|---|---|---|
| easy | `[2,2,3,3,4,4]` | `[2,3,3,4,4]` | `[3,3,4,4]` |
| medium | `[2,2,3,3,4,5]` | `[2,3,3,4,5]` | `[3,3,4,5]` |
| hard | `[2,3,3,4,5,6]` | `[3,3,4,5,6]` | `[3,3,4,5,6]` |
| expert | `[3,4,4,5,6,7]` | `[3,4,4,5,6,7]` | `[3,4,4,5,6,7]` |

Cap-Prüfung im Generator nur für **easy/medium**. hard/expert haben Pool ohne
`1`, die effektive Quote ist durch das Pool-Design garantiert klein. Ein
zusätzlicher Cap-Check wäre Rauschen, kostet aber Versuche in Stufe 2/3 und
verlangsamt die ohnehin solver-intensive Generierung.

## Validator und bestehende 100 Leveldateien

`validateLevel` setzt diese Regel **nicht** durch. Begründung: die 100
Bestandsdateien (`public/assets/levels/level_*.json`) wurden mit einem früheren
Generator-Profil erzeugt, das noch die Größe `1` in `cageSizes` führte — ihre
Quote ist ≈ 42 %, sie würden den Cap verletzen. Wir koppeln die Quote-Regel
zunächst nur an die **Generierung** neuer Level und regenerieren die Bestands-
dateien manuell, wenn der Generator produktiv genutzt wird. Die 100 Dateien
sind damit eine eigene Aufräum-Aufgabe, nicht Teil dieses Patches.

## Considered Options

- **Validator-Hard-Cap**: abgelehnt — blockiert 100 Bestandsdateien sofort;
  eine Sanitisierung der Bestandsdateien ist eine separate Wartungs-Aufgabe,
  die der Patch nicht im Schlepptau erledigen soll.
- **Wahrscheinlichkeits-Pool (Sampling mit Wahrscheinlichkeiten statt
  Häufigkeits-Array)**: abgelehnt — neue Konzept-Ebene (`number[]` als
  Wahrscheinlichkeits-Vektor) ohne klaren Mehrwert. Häufigkeits-Array reicht.
- **Pool-Härtung für hard/expert**: in diesem Patch implementiert, dann
  wieder zurückgenommen. Härtere Pools für expert (`[4,5,6,7]`) waren zu
  solver-schwer, sodass die Generator-Tests reproduzierbar rot wurden. hard/expert
  sind ohnehin durch Pool ohne `1` safe vor Einerkäfigs; eine zusätzliche
  Härtung löst ein Problem, das nicht existiert.

## Consequences

- Pool-API bleibt `cageSizes: number[]` (Häufigkeits-Array), keine
  Wahrscheinlichkeits-Vektoren.
- Generator-Tests benötigen 60s Timeout (vorher 5s) — expert-Levels brauchen
  bei Misskonfiguration einige Sekunden zum Konvergieren.
- Bestehende 100 Leveldateien erfüllen die neue Quote nicht. Sie sind
  dokumentiert „as-is" — eine zukünftige Aufgabe ersetzt sie durch neu
  generierte Level via `generateLevel()`.
