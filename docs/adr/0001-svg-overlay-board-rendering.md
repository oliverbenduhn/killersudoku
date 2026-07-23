# Brett-Rendering als SVG-Linien-Overlay über drei Schichten

## Status

accepted

## Kontext & Entscheidung

Das Brett wurde bisher als 81 einzelne HTML-Zellen gerendert, wobei jede Zelle
über CSS-Borders sowohl das Zellgitter, die 3×3-Blocklinien als auch die
Käfig-Kontur zeichnete. Weil aneinandergrenzende Zellen ihre Borders exakt
koordinieren mussten (Suppression an Käfig- und Blockkanten, damit keine
Doppellinien oder Pixel-Lücken entstehen), war das strukturell fragil und wurde
wiederholt zeilenweise nachgepatcht.

Wir stellen auf **drei überlagerte Schichten** um:

1. **Flächen-Schicht** (HTML, unten): Zell-Hintergründe + gesamte Interaktion,
   trägt `data-testid`/`aria-label`.
2. **Linien-Schicht** (ein SVG, Mitte, `pointerEvents:none`): zeichnet *alle*
   Linien — volles 9×9-Dünngitter, Blocklinien, Außenrahmen, und **eine
   gestrichelte Inset-Kontur pro Käfig**.
3. **Zahlen-Schicht** (HTML, oben, `pointerEvents:none`): Käfigsummen, Zellwerte,
   Notiz-Kandidaten.

Damit entfällt jegliche Nachbar-Koordination: Das Gitter ist immer vollständig,
Blocklinien und Käfig-Konturen sind unabhängige Zeichenschritte. Die
`hasTop/Left/Right/BottomSameCage`- und Block-Edge-Suppression-Logik in
`renderCell` fällt ersatzlos weg.

## Considered Options

- **CSS-Borders pro Zelle beibehalten** (Status quo): abgelehnt — genau die
  fragile Nachbar-Koordination, die wir loswerden wollen.
- **Nur Käfig-Konturen ins SVG, Gitter/Blocklinien als CSS**: abgelehnt — zwei
  Koordinatensysteme, die sich an jeder Kante weiter ausrichten müssten.
- **Auch die Zahlen ins SVG** (autarke SVG-Schicht): abgelehnt — Spiellogik ist
  vom Rendering vollständig entkoppelt (Werte leben in `gameState.cellValues`),
  also bringt SVG-Text keinen Robustheitsgewinn, kostet aber das Neubauen aller
  Text-Zustände (Fehler-, Given-, Same-Value-, Käfig-fertig-Farbe, Puls-
  Animation, umbrechende Notiz-Kandidaten) in einem für Animation/Textumbruch
  schlechter geeigneten Medium.

## Consequences

- SVG rechnet in **px-Koordinaten** (`viewBox="0 0 N·cellSize N·cellSize"`) mit
  bewusstem Halbpixel-Snapping (`x+0.5`) für scharfe Linien.
- Käfig-Kontur ist **nach innen versetzt** (~10–12% der Zellgröße), abgerundete
  Ecken — entkoppelt Kontur und Gitter visuell, die Käfigsumme kollidiert nicht
  mehr mit der Linie (der bisherige Pill-Hintergrund-Hack entfällt).
- Auswahl-/Peer-Highlight und Auswahl-Umrandung bleiben CSS in der Flächen-
  Schicht → die SVG-Schicht ist **statisch pro Level** (Neuberechnung nur bei
  Level-Wechsel und Resize).
- Linienfarben über Chakra-Token als CSS-Variablen
  (`stroke="var(--chakra-colors-grid-block-border)"`), damit Light-/Dark-/BW-
  Umschaltung ohne SVG-Neuberechnung greift.
