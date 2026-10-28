import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorMode } from '@chakra-ui/react';

export type ColorScheme = 'warm' | 'warmDark' | 'ocean' | 'forest';

export const COLOR_SCHEMES: { id: ColorScheme; label: string; swatch: string }[] = [
  { id: 'warm', label: 'Warm', swatch: '#E15A3C' },
  { id: 'warmDark', label: 'Warm Dunkel', swatch: '#F07B5E' },
  { id: 'ocean', label: 'Ocean', swatch: '#0E7C86' },
  { id: 'forest', label: 'Forest', swatch: '#4C7A3A' },
];

const STORAGE_KEY = 'colorScheme';
const DEFAULT_SCHEME: ColorScheme = 'warm';

function isColorScheme(value: string | null): value is ColorScheme {
  return value === 'warm' || value === 'warmDark' || value === 'ocean' || value === 'forest';
}

function readStoredScheme(): ColorScheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isColorScheme(stored) ? stored : DEFAULT_SCHEME;
  } catch {
    return DEFAULT_SCHEME;
  }
}

interface ColorSchemeContextValue {
  scheme: ColorScheme;
  setScheme: (scheme: ColorScheme) => void;
}

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setSchemeState] = useState<ColorScheme>(readStoredScheme);
  const { setColorMode } = useColorMode();

  useEffect(() => {
    document.documentElement.dataset.scheme = scheme;
    setColorMode(scheme === 'warmDark' ? 'dark' : 'light');
  }, [scheme, setColorMode]);

  const setScheme = (next: ColorScheme) => {
    setSchemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage nicht verfügbar (z. B. Private Mode) — State bleibt
      // In-Memory für die Session, kein weiterer Fallback nötig.
    }

  };

  return (
    <ColorSchemeContext.Provider value={{ scheme, setScheme }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme(): ColorSchemeContextValue {
  const ctx = useContext(ColorSchemeContext);
  if (!ctx) {
    throw new Error('useColorScheme muss innerhalb von ColorSchemeProvider verwendet werden');
  }
  return ctx;
}
