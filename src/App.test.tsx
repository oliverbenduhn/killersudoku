import React from 'react';
import { fireEvent, render, screen } from './test-utils';
import App from './App';

beforeEach(() => {
  // useTutorial persistiert "gesehen" in localStorage; ohne Reset würde
  // der dritte Test nach dem Tutorial-Skip in Test 2 das Overlay nicht mehr
  // sehen.
  localStorage.clear();
});

test('renders Killer Sudoku header', async () => {
  render(<App />);
  // Header ist in der App-Bar; bei asynchronem Level-Load kann die initiale
  // Render-Welle etwas dauern.
  const headingElement = await screen.findByRole('heading', { name: /killer sudoku/i });
  expect(headingElement).toBeInTheDocument();
});

test('Zufallslevel-Generator ist über den Level-Button erreichbar', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /^Überspringen$/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Level' }));

  expect(screen.getByRole('heading', { name: 'Zufallslevel erstellen' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Neues Zufallslevel erstellen: Einfach' })).toBeInTheDocument();
});

test('Zurück-Button auf dem Level-Screen führt zurück zum Start', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /^Überspringen$/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Level' }));
  fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));

  expect(await screen.findByRole('button', { name: 'Level' })).toBeInTheDocument();
});
