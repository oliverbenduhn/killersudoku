// Killer Sudoku Theme.
// Light + Dark Tokens, Material-Design-inspiriert, mobile-first.

import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

// Semantische Tokens. Diese werden je nach ColorMode überschrieben.
// Komponenten benutzen NUR diese Tokens, nie direkte Farben.
const semanticTokens = {
  colors: {
    // Surface-Hierarchie (Hintergrund → Karte → Zelle)
    'surface.canvas':       { default: 'gray.50',   _dark: 'gray.900' },
    'surface.raised':       { default: 'white',     _dark: 'gray.800' },
    'surface.sunken':       { default: 'gray.100',  _dark: 'gray.700' },
    'surface.overlay':      { default: 'blackAlpha.500', _dark: 'blackAlpha.700' },

    // Käfig-Hintergründe (zarte Tönung). Mapping CageColor → Token weiter unten.
    'cage.blue.100':        { default: 'blue.50',   _dark: 'blue.900' },
    'cage.green.100':       { default: 'green.50',  _dark: 'green.900' },
    'cage.pink.100':        { default: 'pink.50',   _dark: 'pink.900' },
    'cage.yellow.100':      { default: 'yellow.50', _dark: 'yellow.900' },

    // Käfig-Ränder (deutlicher, damit die Käfige sichtbar bleiben)
    'cage.blue.border':     { default: 'blue.300',  _dark: 'blue.500' },
    'cage.green.border':    { default: 'green.300', _dark: 'green.500' },
    'cage.pink.border':     { default: 'pink.300',  _dark: 'pink.500' },
    'cage.yellow.border':   { default: 'yellow.400', _dark: 'yellow.500' },

    // Vorgegebene Werte vs. User-Eingabe
    'cell.given.text':      { default: 'gray.900',  _dark: 'gray.50'  },
    'cell.user.text':       { default: 'blue.600',  _dark: 'blue.300' },
    'cell.error.text':      { default: 'red.500',   _dark: 'red.300'  },
    'cell.selected.bg':     { default: 'blue.100',  _dark: 'blue.800' },
    'cell.peer.bg':         { default: 'blue.50',   _dark: 'blue.900' },
    'cell.cage.bg':         { default: 'gray.50',   _dark: 'gray.800' },

    // Text-Hierarchie
    'text.primary':         { default: 'gray.900',  _dark: 'gray.50'  },
    'text.secondary':       { default: 'gray.600',  _dark: 'gray.400' },
    'text.muted':           { default: 'gray.500',  _dark: 'gray.500' },
    'text.inverse':         { default: 'white',     _dark: 'gray.900' },

    // Brand (App-Bar, Primary-Button, Selection)
    'brand.primary':        { default: 'blue.500',  _dark: 'blue.400' },
    'brand.primary.hover':  { default: 'blue.600',  _dark: 'blue.300' },
    'brand.onPrimary':      { default: 'white',     _dark: 'gray.900' },

    // Status
    'status.success':       { default: 'green.500', _dark: 'green.300' },
    'status.warning':       { default: 'orange.500', _dark: 'orange.300' },
    'status.error':         { default: 'red.500',   _dark: 'red.300' },
  },
};

export const theme = extendTheme({
  config,
  semanticTokens,
  fonts: {
    body: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    heading: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, 'Cascadia Mono', monospace",
  },
  styles: {
    global: {
      'html, body, #root': {
        height: '100%',
      },
      body: {
        bg: 'surface.canvas',
        color: 'text.primary',
        // System-Schriftarten statt Webfont-Download — spart ~100 KB und ist DSGVO-konform.
        fontFeatureSettings: '"cv11", "ss01"',
        textRendering: 'optimizeLegibility',
        WebkitFontSmoothing: 'antialiased',
      },
      // Safe-Area-Insets (iPhone Notch etc.) global respektieren.
      '#root': {
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        // Touch-Target-Mindestmaß (WCAG 2.5.5 / Apple HIG)
        minH: '44px',
        minW: '44px',
        fontWeight: '600',
      },
      defaultProps: {
        colorScheme: 'blue',
      },
    },
    IconButton: {
      baseStyle: {
        minH: '44px',
        minW: '44px',
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
