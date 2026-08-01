// Killer Sudoku Theme.
// Hallmark · genre: playful · theme: Hum (custom-tuned) · macrostructure: Workbench (app)
// Light + Dark Tokens. Mobile-first, warm-tactile:
//   - warmes Cream-Paper statt kühlem Grau
//   - 4 Käfig-Farben als multi-accent (Hum-Register), niedrige Chroma
//   - Bricolage Grotesque Display / Satoshi Body / Space Mono Zahlen
//   - große Border-Radien (12–20px), weiche Blur-Schatten

import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

// Semantische Tokens. Diese werden je nach ColorMode überschrieben.
// Komponenten benutzen NUR diese Tokens, nie direkte Farben.
const semanticTokens = {
  colors: {
    // Surface-Hierarchie (Hintergrund → Karte → Zelle). Warmes Creme statt
    // kühlem Grau — Hum-Register. Chakra-Palette reicht nicht, daher Hex.
    'surface.canvas':       { default: '#FAF6EF', _dark: '#1B1712' },
    'surface.raised':       { default: '#FFFDF8', _dark: '#26201A' },
    'surface.sunken':       { default: '#F0E9DC', _dark: '#332A22' },
    'surface.overlay':      { default: 'blackAlpha.500', _dark: 'blackAlpha.700' },
    'surface.header':       { default: '#FFFDF8', _dark: '#26201A' },
    'surface.header.text':  { default: '#221A12', _dark: '#F5EEE2' },

    // Käfig-Hintergründe — weicher. Light .100 (pastell), Dark .900
    // (sehr dunkel, fast schwarz mit Farbstich). .800 war zu sattig
    // und ließ die weißen Zahlen schlecht lesen.
    'cage.blue.100':        { default: 'blue.100',  _dark: 'blue.900' },
    'cage.green.100':       { default: 'green.100', _dark: 'green.900' },
    'cage.pink.100':        { default: 'pink.100',  _dark: 'pink.900' },
    'cage.yellow.100':      { default: 'yellow.100',_dark: 'yellow.900' },

    // Käfig-Ränder: leicht dunklere Variante der Käfig-Farbe, damit die
    // vier Käfig-Typen klar unterscheidbar sind (vorher alle gray.300).
    'cage.blue.border':     { default: 'blue.300',  _dark: 'blue.400' },
    'cage.green.border':    { default: 'green.300', _dark: 'green.400' },
    'cage.pink.border':     { default: 'pink.300',  _dark: 'pink.400' },
    'cage.yellow.border':   { default: 'yellow.400',_dark: 'yellow.400' },

    // Schwarzweiß-Modus: Vier Käfig-Stufen mit echtem Hell-Dunkel-Abstand.
    // Light läuft von rein weiß bis dunkelgrau, Dark invertiert (rein
    // schwarz bis hellgrau) — die Skala muss sich mit dem ColorMode
    // umdrehen, sonst sind im dunklen BW Käfige hell, die im hellen BW
    // dunkel waren. Border-Ton pro Stufe abgestimmt auf die jeweilige
    // Hintergrund-Helligkeit.
    'cage.bw.0':           { default: 'white',     _dark: 'gray.900' },
    'cage.bw.0.border':    { default: 'gray.600',  _dark: 'gray.200' },
    'cage.bw.1':           { default: 'gray.100',  _dark: 'gray.700' },
    'cage.bw.1.border':    { default: 'gray.700',  _dark: 'gray.300' },
    'cage.bw.2':           { default: 'gray.300',  _dark: 'gray.500' },
    'cage.bw.2.border':    { default: 'gray.700',  _dark: 'gray.300' },
    'cage.bw.3':           { default: 'gray.600',  _dark: 'gray.200' },
    'cage.bw.3.border':    { default: 'gray.900',  _dark: 'gray.600' },

    // Block-Grenzen (3×3): staerkste Linie im Grid, muss in beiden
    // ColorModes klar gegen Cage-Flaechen UND gegen surface.raised
    // (Zellhintergrund ohne Cage) abstechen.
    'grid.block.border':    { default: 'gray.700',  _dark: 'gray.300' },
    'grid.cage.border':     { default: 'gray.400',  _dark: 'gray.500' },

    // Vorgegebene Werte vs. User-Eingabe
    'cell.given.text':      { default: 'gray.900',  _dark: 'gray.50'  },
    'cell.user.text':       { default: 'blue.600',  _dark: 'blue.300' },
    'cell.error.text':      { default: 'red.500',   _dark: 'red.300'  },
    // Auswahl bewusst orange statt blau: Blau ist bereits eine Käfigfarbe.
    // Nur als Kontur verwenden, damit die Käfigfarbe sichtbar bleibt.
    'cell.selected.border': { default: 'orange.500', _dark: 'orange.300' },
    'cell.peer.bg':         { default: 'blue.50',   _dark: 'blue.900' },
    'cell.cage.bg':         { default: 'gray.50',   _dark: 'gray.800' },

    // Text-Hierarchie — warme Tinte (hue ~35), kein reines Schwarz/Grau.
    'text.primary':         { default: '#221A12', _dark: '#F5EEE2' },
    'text.secondary':       { default: '#6B5D4D', _dark: '#B8A98F' },
    'text.muted':           { default: '#94836E', _dark: '#8A7B66' },
    'text.inverse':         { default: '#FFFDF8', _dark: '#221A12' },

    // Brand: warmes Coral als einzige Akzentfarbe (Hum-Register). Chakra
    // hat kein passendes Coral in der Standardpalette → Hex.
    'brand.primary':        { default: '#E15A3C', _dark: '#F07B5E' },
    'brand.primary.hover':  { default: '#C94A2F', _dark: '#E89A83' },
    'brand.primary.subtle': { default: '#FBE3DC', _dark: '#3E241C' },
    'brand.onPrimary':      { default: '#FFFDF8', _dark: '#221A12' },

    // Status
    'status.success':       { default: 'green.500', _dark: 'green.300' },
    'status.warning':       { default: 'orange.500', _dark: 'orange.300' },
    'status.error':         { default: 'red.500',   _dark: 'red.300' },

    // Bottom-Nav-Pill für aktiven Tab (moderne Mobile-UX).
    'nav.active.bg':        { default: '#FBE3DC', _dark: '#3E241C' },
    'nav.active.text':      { default: '#C94A2F', _dark: '#F07B5E' },
    'nav.inactive.text':    { default: '#94836E', _dark: '#8A7B66' },
  },
  radii: {
    // Größere Radien überall für weicheren, modernen Look.
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    '2xl': '28px',
    full: '9999px',
  },
  shadows: {
    // Weicher, mit mehr Blur und weniger Opazität. Material-Defaults
    // waren 1px-Linien mit harten Kanten — modern ist Blur.
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    md: '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
    lg: '0 10px 24px -4px rgba(0, 0, 0, 0.10), 0 4px 8px -4px rgba(0, 0, 0, 0.04)',
    xl: '0 20px 40px -8px rgba(0, 0, 0, 0.12), 0 8px 16px -8px rgba(0, 0, 0, 0.06)',
    // Spezielle Pill-Höhe für Bottom-Nav (sehr subtiler Glow)
    glow: '0 -2px 12px rgba(0, 0, 0, 0.06)',
  },
};

export const theme = extendTheme({
  config,
  semanticTokens,
  fonts: {
    // Hallmark 2+1: Display Bricolage Grotesque, Body Satoshi, Outlier Space Mono.
    // Satoshi deckt denselben x-height-Bereich ab wie system-ui → kein CLS beim Swap.
    body: `'Satoshi', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
    heading: `'Bricolage Grotesque', 'Satoshi', ui-sans-serif, system-ui, sans-serif`,
    mono: `'Space Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, 'Cascadia Mono', monospace`,
  },
  styles: {
    global: {
      'html, body, #root': {
        height: '100%',
      },
      body: {
        bg: 'surface.canvas',
        color: 'text.primary',
        fontFeatureSettings: '"cv11", "ss01"',
        textRendering: 'optimizeLegibility',
        WebkitFontSmoothing: 'antialiased',
      },
      '#root': {
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        minH: '44px',
        minW: '44px',
        fontWeight: '600',
        borderRadius: 'lg',
        letterSpacing: '0.01em',
        transition: 'background-color 150ms cubic-bezier(0.16, 1, 0.3, 1), transform 100ms cubic-bezier(0.16, 1, 0.3, 1)',
        _active: { transform: 'scale(0.97)' },
      },
      defaultProps: {
        // Kein colorScheme-Default: brand.primary wird direkt über die
        // solid-Variante unten gesetzt; ghost/outline bleiben neutral.
      },
      variants: {
        solid: {
          bg: 'brand.primary',
          color: 'brand.onPrimary',
          _hover: { bg: 'brand.primary.hover', _disabled: { bg: 'surface.sunken' } },
          _active: { bg: 'brand.primary.hover' },
        },
      },
    },
    IconButton: {
      baseStyle: {
        minH: '44px',
        minW: '44px',
        borderRadius: 'lg',
      },
    },
    // Modal: rundere Ecken, weicherer Schatten, kein hartes Material-Overlay.
    Modal: {
      baseStyle: {
        dialog: {
          borderRadius: '2xl',
          boxShadow: 'xl',
        },
        overlay: {
          backdropFilter: 'blur(4px)',
          bg: 'surface.overlay',
        },
      },
    },
    Heading: {
      baseStyle: {
        letterSpacing: '-0.01em',
      },
    },
  },
});

/**
 * Mappt ein CageColor-Token ('blue.100') auf das
 * surface-Hintergrund- und Rand-Token im Theme.
 */
export function cageTokens(color: 'blue.100' | 'green.100' | 'pink.100' | 'yellow.100') {
  const base = color.split('.')[0] as 'blue' | 'green' | 'pink' | 'yellow';
  return {
    bg: `cage.${base}.100` as const,
    border: `cage.${base}.border` as const,
  };
}
