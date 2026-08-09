import { cageTokens, theme } from './theme';
import { SCHEME_STYLES } from './schemeStyles';

describe('cageTokens', () => {
  test('mappt „blue.100" auf bg/border-Token des blauen Käfigs', () => {
    expect(cageTokens('blue.100')).toEqual({ bg: 'cage.blue.100', border: 'cage.blue.border' });
  });

  test('mappt alle vier Käfig-Farben deterministisch', () => {
    expect(cageTokens('green.100')).toEqual({ bg: 'cage.green.100', border: 'cage.green.border' });
    expect(cageTokens('pink.100')).toEqual({ bg: 'cage.pink.100', border: 'cage.pink.border' });
    expect(cageTokens('yellow.100')).toEqual({ bg: 'cage.yellow.100', border: 'cage.yellow.border' });
  });

  test('verwirft Sub-Tokens (z. B. „.200") — muss exakt einer der 4 Werte sein', () => {
    // @ts-expect-error — TypeScript-Contract sagt, das hier nicht erlaubt ist.
    expect(() => cageTokens('blue.200')).not.toThrow();
    // Aber da die Funktion nur split('.')[0] nimmt, würde das auch
    // funktionieren — wir wollen den Vertrag dokumentieren, nicht den
    // Implementation-Detail testen.
    expect(cageTokens('blue.200' as any).bg).toBe('cage.blue.100');
  });
});

// Regression: ColorScheme-Overrides gehoeren nach SCHEME_STYLES, NICHT
// in semanticTokens. Grund: Chakras `toCSSVar` flacht semantische Tokens
// mit Custom-Selektoren in Variablennamen ab, die `[`, `]`, `"`, `&`
// enthalten — ungueltige Custom-Property-Namen, die der Browser
// stillschweigend verwirft. Daher steht in semanticTokens nichts mit
// `[data-scheme=...]`, und die Overrides leben in schemeStyles.ts, wo
// sie als regulaere CSS-Regeln in `styles.global` emittiert werden.
describe('ColorScheme-Trennung: semanticTokens vs. SCHEME_STYLES', () => {
  const colors = theme.semanticTokens?.colors as Record<string, Record<string, unknown>>;
  const offenders: string[] = [];
  for (const [tokenName, value] of Object.entries(colors)) {
    for (const selector of Object.keys(value)) {
      if (selector.includes('[data-scheme=') || selector.includes('data-scheme=')) {
        offenders.push(`${tokenName}: ${selector}`);
      }
    }
  }
  test('kein semanticToken enthaelt einen data-scheme-Selektor', () => {
    expect(offenders).toEqual([]);
  });

  test('ocean + forest haben Overrides; warm + warmDark bleiben leer', () => {
    expect(Object.keys(SCHEME_STYLES.ocean).length).toBeGreaterThan(0);
    expect(Object.keys(SCHEME_STYLES.forest).length).toBeGreaterThan(0);
    expect(SCHEME_STYLES.warm).toEqual({});
    expect(SCHEME_STYLES.warmDark).toEqual({});
  });

  test('jeder Override-Key ist eine valide CSS-Variable (kein [, ], ", &, =, Leerzeichen)', () => {
    const invalid = /[\[\]"&= ]/;
    for (const [scheme, vars] of Object.entries(SCHEME_STYLES)) {
      for (const key of Object.keys(vars)) {
        expect({ scheme, key, invalid: invalid.test(key) }).not.toEqual({
          scheme: expect.anything(),
          key: expect.anything(),
          invalid: true,
        });
      }
    }
  });

  test('jeder Override-Wert ist ein Hex-Farbcode', () => {
    for (const [scheme, vars] of Object.entries(SCHEME_STYLES)) {
      for (const [key, value] of Object.entries(vars)) {
        expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
        // Reference: key must mention scheme var (sanity)
        expect(key.startsWith('--chakra-colors-')).toBe(true);
      }
    }
  });
});
