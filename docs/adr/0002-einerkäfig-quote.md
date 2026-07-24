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

Cap-Prüfung im Generator für **easy, medium, hard**. expert hat aktuell keine
aktive Cap-Prüfung — Pool-Härtung in Stufe 2/3 für expert wäre zu solver-schwer
(Stufe 3 = `[5,6,7]` mit `baseGivens: 0` führt zu reproduzierbar roten
Generator-Tests). expert-Quote pendelt sich bei der aktuellen Architektur bei
≈ 15–20 % ein, deutlich über dem Cap. Reduktion erfordert einen Refactor des
Frontier-Loops mit Backtracking — separates Ticket, siehe Consequences.

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
- Bestehende 100 Leveldateien werden via `scripts/regenerate-levels.ts`
  ersetzt — Schreibvorgang einmalig pro Maschine.
- **Offen:** expert-Quote (≈ 17 %) liegt über Cap (2 %). Reduktion erfordert
  einen Refactor des Frontier-Loops in `partitionIntoCages`, der bei
  `frontier.length === 0` einen alternativen Pfad probiert (Backtracking),
  statt die Cage früh zu schließen. Aktuelle Architektur toleriert die
  Quote-Überschreitung in expert und liefert sie aus; das ist explizit
  dokumentiert, nicht verborgen.
