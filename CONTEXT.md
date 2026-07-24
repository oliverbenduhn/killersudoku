# Killer Sudoku

Ein Killer-Sudoku-Spiel: klassisches 9×9-Sudoku plus Käfige mit Pflichtsummen.

## Language

### Brett & Zellen

**Zelle**:
Ein einzelnes Feld im 9×9-Raster. Trägt einen Wert (1–9 oder leer), eine Hintergrundfarbe und ist Teil genau eines Käfigs.
_Avoid_: Feld, Kästchen

**Block**:
Einer der neun 3×3-Unterbereiche des Sudokus. Die Blockgrenzen sind die kräftigsten Linien im Raster.
_Avoid_: Box, Region, Quadrant

**Käfig** (Cage):
Eine Gruppe zusammenhängender Zellen mit einer Pflichtsumme. Im Rendering durch eine gestrichelte, nach innen versetzte Kontur markiert.
_Avoid_: Gruppe, Bereich, Zone

**Einerkäfig** (One-cell cage):
Ein Käfig, der genau eine Zelle umfasst. Trivial lösbar: die Summe ist der Zellwert selbst und der Käfig verrät eine vorgegebene Ziffer ohne Logik. Ein zu hoher Anteil an Einerkäfigs entwertet das Rätsel. Cap-Quote pro Schwierigkeit in ADR 0002.
_Avoid_: Vorgabe-Käfig, trivialer Käfig, Einzelfeld

**Einerkäfig-Quote** (One-cell-cage quote):
Verhältnis `|Einerkäfig| / |Cages|` im Level. Bezugsgröße sind die Käfigs, nicht die Zellen, weil ein Einerkäfig trivialer Käfig ist — gemessen wird der Anteil trivialer Käfigs. Caps pro Schwierigkeit in ADR 0002.

**Pool-Härtung** (Pool escalation):
Mechanismus im Generator: pro Schwierigkeit werden drei Pools in steigender Härte probiert, wenn die Quote den Cap nicht einhält. Letzte Stufe ist immer ein Pool ohne Käfig-Größe `1`. Details in ADR 0002.

**Käfigsumme**:
Die kleine Zahl oben-links im Käfig; Zielsumme aller Zellwerte des Käfigs.
_Avoid_: Cage-Total, Zielwert

### Rendering-Schichten

Das Brett wird als drei überlagerte Schichten gezeichnet, jede mit genau einer Aufgabe:

**Flächen-Schicht** (unten):
HTML-Zellgitter, das Hintergrundfarben (Käfig-Tönung, Auswahl-/Peer-Highlight) rendert und alle Zeige-/Touch-Interaktion trägt. Hält `data-testid` und `aria-label` pro Zelle.
_Avoid_: Hintergrund-Layer

**Linien-Schicht** (Mitte):
Ein einzelnes SVG-Overlay, das *ausschließlich* Linien zeichnet — volles Dünngitter, Blocklinien, Außenrahmen, Käfig-Konturen. `pointerEvents:none`. Statisch pro Level.
_Avoid_: Gitter-Layer, Overlay (mehrdeutig)

**Zahlen-Schicht** (oben):
HTML-Schicht mit Käfigsummen, Zellwerten und Notiz-Kandidaten. `pointerEvents:none`, liegt garantiert über allen Linien.
_Avoid_: Text-Layer

**Käfig-Kontur** (Cage outline):
Der gestrichelte Pfad, der einen Käfig umrandet. Läuft *nach innen versetzt* (inset ~10–12% der Zellgröße) innerhalb der Käfig-Außenkante, mit dezent abgerundeten Ecken. Ein Pfad pro Käfig.
_Avoid_: Käfig-Rand, Cage-Border

### Modi

**BW-Modus** (Schwarz-Weiß):
Darstellung ohne Käfig-Flächenfarben — nur Linien tragen die Struktur (Vorbild: klassischer Killer-Sudoku-Druck). Zahlen und Konturen neutral grau/schwarz.
_Avoid_: Monochrom-Modus, Druck-Modus

**Bleistiftmodus** (Pencil mode):
Sitzungsweiter, nicht persistierter Eingabemodus. Aktiv, tragen Zifferneingaben (Tastatur wie NumberPad) keine finalen Zellwerte mehr ein, sondern toggeln Notiz-Kandidaten der ausgewählten Zelle(n). Setzt sich beim Laden, Reload und Level-/Puzzlewechsel immer auf „aus" zurück. Vollständige Spec in GitHub Issue #1; der zugehörige Undo/Redo-Architekturfix ist in ADR 0003 dokumentiert.
_Avoid_: Notizmodus, Kandidatenmodus

**Notiz-Kandidat** (Player pencil mark):
Eine vom Spieler im Bleistiftmodus gesetzte Ziffer (1–9) als vorläufiger Kandidat einer leeren, nicht vorgegebenen Zelle — Teil des persistierten Spielstands, unabhängig vom internen Solver-`candidates`-Konzept (Hint-Engine). Wird automatisch entfernt, sobald die Zelle einen finalen Wert erhält (normale Eingabe, Reveal-Hint) oder bei Reset.
_Avoid_: Notiz, Kandidat (ohne Kontext), Pencil Mark
