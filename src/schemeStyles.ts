// CSS-Variable-Overrides für die Farbschemata Ocean und Forest.
//
// Hintergrund: Chakra UI v2 flacht semantische Tokens mit Custom-Selektoren
// in ungültige CSS-Variablennamen ab (siehe `toCSSVar` → `flattenTokens` —
// `&[data-scheme="ocean"]` wird zu `-&[data-scheme="ocean"]`, was der Browser
// als Custom-Property-Namen ablehnt). Statt über `semanticTokens` zu gehen,
// überschreiben wir hier die bereits flachen Alias-Variablen, die Chakra für
// die Component-Auflösung benutzt. Die `*-default`-Variablen allein reichen
// nicht: Ihr Wert wird von der Alias-Variablen auf `:root` geerbt und dort
// bereits aufgelöst.
//
// Die hier eingesammelten Werte müssen mit den Tokens in theme.ts synchron
// bleiben. Bei jeder Änderung eines Tokens prüfen, ob das Schema mitzieht.

import type { ColorScheme } from './contexts/ColorSchemeContext';

type CSSVarRecord = Record<`--chakra-colors-${string}`, string>;

const OCEAN: CSSVarRecord = {
  '--chakra-colors-surface-canvas': '#F3F7FA',
  '--chakra-colors-surface-raised': '#FFFFFF',
  '--chakra-colors-surface-sunken': '#E4EDF3',
  '--chakra-colors-surface-header': '#FFFFFF',
  '--chakra-colors-surface-header-text': '#16232E',
  '--chakra-colors-text-primary': '#16232E',
  '--chakra-colors-text-secondary': '#4C6478',
  '--chakra-colors-text-muted': '#8098AC',
  '--chakra-colors-text-inverse': '#FFFFFF',
  '--chakra-colors-brand-primary': '#0E7C86',
  '--chakra-colors-brand-primary-hover': '#0B636C',
  '--chakra-colors-brand-primary-subtle': '#DCEFF0',
  '--chakra-colors-brand-onPrimary': '#FFFFFF',
  '--chakra-colors-nav-active-bg': '#DCEFF0',
  '--chakra-colors-nav-active-text': '#0B636C',
  '--chakra-colors-nav-inactive-text': '#7C93A5',
};

const FOREST: CSSVarRecord = {
  '--chakra-colors-surface-canvas': '#F5F7EF',
  '--chakra-colors-surface-raised': '#FFFFFF',
  '--chakra-colors-surface-sunken': '#E6EAD9',
  '--chakra-colors-surface-header': '#FFFFFF',
  '--chakra-colors-surface-header-text': '#1E2A18',
  '--chakra-colors-text-primary': '#1E2A18',
  '--chakra-colors-text-secondary': '#55654A',
  '--chakra-colors-text-muted': '#8A9678',
  '--chakra-colors-text-inverse': '#FFFFFF',
  '--chakra-colors-brand-primary': '#4C7A3A',
  '--chakra-colors-brand-primary-hover': '#3C6230',
  '--chakra-colors-brand-primary-subtle': '#DCEAD2',
  '--chakra-colors-brand-onPrimary': '#FFFFFF',
  '--chakra-colors-nav-active-bg': '#DCEAD2',
  '--chakra-colors-nav-active-text': '#3C6230',
  '--chakra-colors-nav-inactive-text': '#8A9678',
};

// Gemappt auf `[data-scheme="…"]`-Selektoren. Warm / WarmDark haben keine
// Overrides — die laufen über Chakras Standard-`default` / `_dark` und
// werden hier gar nicht aufgeführt.
export const SCHEME_STYLES: Record<ColorScheme, CSSVarRecord> = {
  warm: {},
  warmDark: {},
  ocean: OCEAN,
  forest: FOREST,
};
