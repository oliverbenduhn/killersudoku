// CSS-Variable-Overrides für die Farbschemata Ocean und Forest.
//
// Hintergrund: Chakra UI v2 flacht semantische Tokens mit Custom-Selektoren
// in ungültige CSS-Variablennamen ab (siehe `toCSSVar` → `flattenTokens` —
// `&[data-scheme="ocean"]` wird zu `-&[data-scheme="ocean"]`, was der Browser
// als Custom-Property-Namen ablehnt). Statt über `semanticTokens` zu gehen,
// überschreiben wir hier die bereits flachen `--chakra-colors-*-default`- und
// `-_dark`-Variablen, die Chakra für die Component-Auflösung benutzt.
//
// Die hier eingesammelten Werte müssen mit den Tokens in theme.ts synchron
// bleiben. Bei jeder Änderung eines Tokens prüfen, ob das Schema mitzieht.

import type { ColorScheme } from './contexts/ColorSchemeContext';

type CSSVarRecord = Record<`--chakra-colors-${string}`, string>;

const OCEAN: CSSVarRecord = {
  '--chakra-colors-surface-canvas-default': '#F3F7FA',
  '--chakra-colors-surface-raised-default': '#FFFFFF',
  '--chakra-colors-surface-sunken-default': '#E4EDF3',
  '--chakra-colors-surface-header-default': '#FFFFFF',
  '--chakra-colors-surface-header-text-default': '#16232E',
  '--chakra-colors-text-primary-default': '#16232E',
  '--chakra-colors-text-secondary-default': '#4C6478',
  '--chakra-colors-text-muted-default': '#8098AC',
  '--chakra-colors-text-inverse-default': '#FFFFFF',
  '--chakra-colors-brand-primary-default': '#0E7C86',
  '--chakra-colors-brand-primary-hover-default': '#0B636C',
  '--chakra-colors-brand-primary-subtle-default': '#DCEFF0',
  '--chakra-colors-brand-onPrimary-default': '#FFFFFF',
  '--chakra-colors-nav-active-bg-default': '#DCEFF0',
  '--chakra-colors-nav-active-text-default': '#0B636C',
  '--chakra-colors-nav-inactive-text-default': '#7C93A5',
};

const FOREST: CSSVarRecord = {
  '--chakra-colors-surface-canvas-default': '#F5F7EF',
  '--chakra-colors-surface-raised-default': '#FFFFFF',
  '--chakra-colors-surface-sunken-default': '#E6EAD9',
  '--chakra-colors-surface-header-default': '#FFFFFF',
  '--chakra-colors-surface-header-text-default': '#1E2A18',
  '--chakra-colors-text-primary-default': '#1E2A18',
  '--chakra-colors-text-secondary-default': '#55654A',
  '--chakra-colors-text-muted-default': '#8A9678',
  '--chakra-colors-text-inverse-default': '#FFFFFF',
  '--chakra-colors-brand-primary-default': '#4C7A3A',
  '--chakra-colors-brand-primary-hover-default': '#3C6230',
  '--chakra-colors-brand-primary-subtle-default': '#DCEAD2',
  '--chakra-colors-brand-onPrimary-default': '#FFFFFF',
  '--chakra-colors-nav-active-bg-default': '#DCEAD2',
  '--chakra-colors-nav-active-text-default': '#3C6230',
  '--chakra-colors-nav-inactive-text-default': '#8A9678',
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
