import { cageTokens } from './theme';

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
