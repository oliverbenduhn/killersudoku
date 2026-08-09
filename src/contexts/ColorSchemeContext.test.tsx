import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ChakraProvider, useColorMode } from '@chakra-ui/react';
import { ColorSchemeProvider, useColorScheme } from './ColorSchemeContext';

function Probe() {
  const { scheme, setScheme } = useColorScheme();
  const { colorMode } = useColorMode();
  return (
    <div>
      <span data-testid="scheme">{scheme}</span>
      <span data-testid="colorMode">{colorMode}</span>
      <button onClick={() => setScheme('ocean')}>ocean</button>
      <button onClick={() => setScheme('warmDark')}>warmDark</button>
      <button onClick={() => setScheme('warm')}>warm</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <ChakraProvider>
      <ColorSchemeProvider>
        <Probe />
      </ColorSchemeProvider>
    </ChakraProvider>
  );
}

describe('ColorSchemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-scheme');
  });

  test('startet mit "warm", wenn nichts in localStorage steht', () => {
    renderProbe();
    expect(screen.getByTestId('scheme')).toHaveTextContent('warm');
    expect(document.documentElement.getAttribute('data-scheme')).toBe('warm');
  });

  test('liest den initialen Wert aus localStorage', () => {
    localStorage.setItem('colorScheme', 'forest');
    renderProbe();
    expect(screen.getByTestId('scheme')).toHaveTextContent('forest');
    expect(document.documentElement.getAttribute('data-scheme')).toBe('forest');
  });

  test('setScheme aktualisiert State, localStorage und data-scheme-Attribut', () => {
    renderProbe();
    act(() => { fireEvent.click(screen.getByText('ocean')); });
    expect(screen.getByTestId('scheme')).toHaveTextContent('ocean');
    expect(localStorage.getItem('colorScheme')).toBe('ocean');
    expect(document.documentElement.getAttribute('data-scheme')).toBe('ocean');
  });

  test('warmDark schaltet Chakras colorMode auf dark, andere Schemata auf light', () => {
    renderProbe();
    act(() => { fireEvent.click(screen.getByText('warmDark')); });
    expect(screen.getByTestId('colorMode')).toHaveTextContent('dark');
    act(() => { fireEvent.click(screen.getByText('warm')); });
    expect(screen.getByTestId('colorMode')).toHaveTextContent('light');
  });
});
