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

test('Zurück-Button auf dem Level-Screen führt zurück zum Start', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /^Überspringen$/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Level' }));
  fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));

  expect(await screen.findByRole('button', { name: 'Level' })).toBeInTheDocument();
});

test('HomeActions-Buttons sind auch im Levels-Tab sichtbar (#24)', async () => {
  // Regression: Header war auf activeTab !== 'home' ? 'none' : 'block'
  // gesetzt, sodass Theme/Fullscreen/BW/Help-Buttons nur im Home-Tab
  // erreichbar waren. Fix: display-Bedingung entfernt.
  render(<App />);

  // Tutorial überspringen und in den Levels-Tab wechseln.
  fireEvent.click(screen.getByRole('button', { name: /^Überspringen$/ }));
  await screen.findByRole('button', { name: 'Level' });
  fireEvent.click(screen.getByRole('button', { name: 'Level' }));

  // Im Levels-Tab müssen die HomeActions-Toggles sichtbar bleiben.
  // queryBy* statt findBy*: schlägt sofort fehl, wenn das Element
  // fehlt — kein Timeout, klare Fehlermeldung.
  expect(screen.getByRole('button', { name: /Hellmodus wechseln|Dunkelmodus wechseln/ })).toBeVisible();
  expect(screen.getByRole('button', { name: /Vollbild/ })).toBeVisible();
  expect(screen.getByRole('button', { name: /Schwarzweiß|Farbmodus/ })).toBeVisible();
  expect(screen.getByRole('button', { name: /Tastenkombinationen anzeigen/ })).toBeVisible();
});
