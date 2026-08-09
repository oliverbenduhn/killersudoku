# Mehrere Farbschemata für die Oberfläche

Status: approved
Datum: 2026-08-09

## Ziel

Nutzer sollen zwischen mehreren vollständigen Farbschemata für die App-Oberfläche
wählen können (nicht nur Hell/Dunkel). Das Sudoku-Spielfeld (Käfig-Farben,
Grid-/Block-Grenzen, Zell-Text- und Auswahlfarben) bleibt davon unberührt und
sieht in allen hellen Schemata identisch aus.

## Schemata

Vier Schemata, jedes mit fest zugeordneter Helligkeit (kein zusätzlicher
Hell/Dunkel-Toggle pro Schema):

| Schema      | Helligkeit | Beschreibung                                    |
|-------------|-----------|--------------------------------------------------|
| Warm        | hell      | heutiges Default-Schema (Cream-Paper, Coral)     |
| Warm Dunkel | dunkel    | heutiges Dark-Schema                              |
| Ocean       | hell      | kühles Blau-Grau-Papier, Petrol-Teal-Akzent      |
| Forest      | hell      | Salbeigrün-Papier, Waldgrün-Akzent               |

Konkrete Werte für Ocean/Forest:

- **Ocean**: `surface.canvas #F3F7FA`, `surface.raised #FFFFFF`,
  `surface.sunken #E4EDF3`, `text.primary #16232E`, `text.secondary #4C6478`,
  `text.muted #8098AC`, `brand.primary #0E7C86` (hover `#0B636C`,
  subtle `#DCEFF0`), `nav.active.bg #DCEFF0`, `nav.active.text #0B636C`,
  `nav.inactive.text #7C93A5`.
- **Forest**: `surface.canvas #F5F7EF`, `surface.raised #FFFFFF`,
  `surface.sunken #E6EAD9`, `text.primary #1E2A18`, `text.secondary #55654A`,
  `text.muted #8A9678`, `brand.primary #4C7A3A` (hover `#3C6230`,
  subtle `#DCEAD2`), `nav.active.bg #DCEAD2`, `nav.active.text #3C6230`,
  `nav.inactive.text #8A9678`.

`text.inverse`/`onPrimary` bleiben `#FFFFFF` in beiden neuen Schemata.
`surface.header`/`surface.header.text` folgen `surface.raised`/`text.primary`.

`status.*` (success/warning/error) bleibt schemaunabhängig — universelle
Signalfarben ohne gestalterischen Mehrwert durch Neueinfärbung.

## Grenze Oberfläche vs. Spielfeld

Unverändert bleiben (weiterhin nur `default`/`_dark`, an Chakras `colorMode`
gebunden): `cage.*`, `grid.block.border`, `grid.cage.border`, `cell.*`.

Betroffen (bekommen zusätzliche Werte pro Schema): `surface.*`, `text.*`,
`brand.*`, `nav.*`.

## Architektur

### Token-Ebene (`src/theme.ts`)

Bestehende `semanticTokens` für Oberflächen-Tokens bekommen zusätzliche
Bedingungs-Keys als CSS-Selektoren (Chakra-Feature: beliebige Selektor-Strings
neben `default`/`_dark` sind erlaubt):

```ts
'surface.canvas': {
  default: '#FAF6EF', _dark: '#1B1712',
  '[data-scheme="ocean"] &': '#F3F7FA',
  '[data-scheme="forest"] &': '#F5F7EF',
},
```

`default`/`_dark` bleiben die Werte für Warm/Warm Dunkel — für diese beiden
Schemata ist kein zusätzlicher Selektor nötig, da sie mit dem bestehenden
Hell/Dunkel-Mechanismus übereinstimmen.

### State (`src/contexts/ColorSchemeContext.tsx`, neu)

```ts
type ColorScheme = 'warm' | 'warmDark' | 'ocean' | 'forest';
```

- Muss innerhalb von `ChakraProvider` gemountet werden (nutzt `useColorMode`).
- State initialisiert aus `localStorage['colorScheme']`, Fallback `'warm'`.
- `setScheme(id: ColorScheme)`:
  1. `localStorage.setItem('colorScheme', id)`
  2. `document.documentElement.dataset.scheme = id`
  3. `setColorMode(id === 'warmDark' ? 'dark' : 'light')` (Chakra-Hook) —
     dadurch reagieren Grid-Tokens automatisch korrekt, ohne dass sie das
     Schema-Konzept kennen müssen.
- Effekt beim Mount wendet den initialen Wert an (Attribut + colorMode-Sync),
  damit direkter Reload den gespeicherten Zustand korrekt herstellt.
- Hook `useColorScheme()` liest `{ scheme, setScheme }` aus dem Context.

`App.tsx` (oder `index.tsx`, je nachdem wo sinnvoll) wird um den Provider
ergänzt: `<ChakraProvider><ColorSchemeProvider><App /></ColorSchemeProvider></ChakraProvider>`.

### UI (`src/components/common/HomeActions.tsx`)

Der bisherige Sonne/Mond-`IconButton` (`toggleColorMode`) wird durch ein
Chakra-`Menu` ersetzt:

- Trigger: `IconButton`/`MenuButton` mit kleinem Farb-Swatch-Icon passend zum
  aktiven Schema, `aria-label="Farbschema wählen"`.
- Vier `MenuItem`s: Label + Farb-Swatch (kleiner farbiger Kreis/Quadrat in
  `brand.primary` des jeweiligen Schemas) + Haken (`CheckIcon` o.ä.) beim
  aktiven Schema.
- Klick ruft `setScheme(id)` aus `useColorScheme()`.

Keine neue Settings-Seite — Menü ersetzt 1:1 den bisherigen Toggle-Button an
seiner heutigen Stelle (mobile Kopfzeile via `App.tsx`, Desktop-Sidebar via
`Board.tsx`).

## Datenfluss

```
Klick MenuItem
  → setScheme(id)
  → localStorage.setItem
  → document.documentElement.dataset.scheme = id
  → chakra setColorMode(isDark ? 'dark' : 'light')
  → Chakra berechnet CSS-Variablen neu
      → Oberfläche reagiert auf [data-scheme] Selektor (oder default/_dark
        falls kein Override für warm/warmDark)
      → Brett reagiert weiterhin nur auf default/_dark
```

## Fehlerbehandlung

Kein Sonderfall nötig: `localStorage` nicht verfügbar (Private Mode o.ä.) →
`setItem`/`getItem` können werfen; State bleibt dann In-Memory für die
Session (try/catch um die localStorage-Zugriffe, analog zu bereits
existierenden Mustern im Projekt, falls vorhanden — sonst einfacher try/catch
ohne weitere Fallback-Logik).

Kein Flash-of-wrong-scheme-Fix: Die App hat heute keinen `ColorModeScript` und
akzeptiert ein kurzes Flackern beim Farbmodus-Wechsel/Laden. Dasselbe gilt
konsistent für Schemata — kein zusätzlicher Inline-Script in `index.html`.

## Testing

- Neuer Unit-Test für `ColorSchemeContext`/`useColorScheme`: Persistenz in
  `localStorage`, korrektes Setzen von `data-scheme`, korrekter
  `colorMode`-Sync pro Schema.
- `HomeActions.test.tsx`: bisheriger Test auf den Sonne/Mond-Button wird durch
  einen Test auf das neue Menü ersetzt (Menü öffnen, Schema anklicken, Haken/
  aktiver Zustand prüfen).
- `App.test.tsx`: Anpassung der bestehenden Assertion (Zeile 44), die aktuell
  nach `Hellmodus wechseln|Dunkelmodus wechseln` sucht.

## Scope-Abgrenzung (YAGNI)

- Kein Schema-übergreifender Hell/Dunkel-Toggle (jedes Schema hat fixe
  Helligkeit, siehe Entscheidung oben).
- Keine neue Settings-Seite.
- `status.*`-Tokens bleiben unangetastet.
- Keine Persistenz über Server-/Account-Sync — nur `localStorage`.
