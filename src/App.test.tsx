import React from 'react';
import { act } from '@testing-library/react';
import localforage from 'localforage';
import fixture from '../public/assets/levels/level_1.json';
import * as levels from './services/levelService';
import { parseLevel } from './utils/parseLevel';
import { fireEvent, render, screen, waitFor, within } from './test-utils';
import App from './App';
import { APP_VERSION } from './version';

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

test('Level-Button wechselt aus der Levelauswahl zurück zum Spiel', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /^Überspringen$/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Level' }));
  expect(screen.getByRole('button', { name: 'Zurück' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Level' }));
  expect(screen.queryByRole('button', { name: 'Zurück' })).not.toBeInTheDocument();
});

test('Versionsnummer erscheint nur dezent in der Levelauswahl', async () => {
  render(<App />);

  expect(screen.queryByText(`v${APP_VERSION}`)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Überspringen$/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Level' }));

  expect(screen.getByText(`v${APP_VERSION}`)).toBeInTheDocument();
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
  expect(screen.getByRole('button', { name: 'Farbschema wählen' })).toBeVisible();
  expect(screen.getByRole('button', { name: /Vollbild/ })).toBeVisible();
  expect(screen.getByRole('button', { name: /Schwarzweiß|Farbmodus/ })).toBeVisible();
  expect(screen.getByRole('button', { name: /Tastenkombinationen anzeigen/ })).toBeVisible();
});


test('retries loading and protects an unsaved move during level navigation', async () => {
  await localforage.clear();
  const level = parseLevel(fixture, 1);
  jest.spyOn(levels, 'loadLevelByNumber').mockRejectedValueOnce(new Error('503')).mockResolvedValue(level);
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  try {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Überspringen$/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Erneut versuchen' }));
    const grid = await screen.findByRole('grid');
    fireEvent.focus(grid);
    fireEvent.keyDown(grid, { key: 'ArrowRight' });
    const row = within(grid).getAllByRole('row')[0];
    const active = within(row).getAllByRole('gridcell')[1];
    expect(grid).toHaveAttribute('aria-activedescendant', active.id);
    expect(active).toHaveAccessibleName(/Käfigsumme \d+, Käfigfelder: Zeile/);

    const cells = level.initialValues.flatMap((values, row) => values.flatMap((value, col) => value ? [] : [{ row, col }]));
    const [entry, note] = cells;
    const digit = level.solution[entry.row][entry.col];
    const save = jest.spyOn(localforage, 'setItem').mockRejectedValueOnce(new Error('write failed'));
    fireEvent.pointerDown(screen.getByTestId(`cell-${entry.row}-${entry.col}`));
    fireEvent.keyDown(grid, { key: String(digit) });
    await screen.findByRole('button', { name: 'Speichern wiederholen' });
    fireEvent.click(screen.getByRole('button', { name: 'Level' }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(grid).toBeVisible();
    expect(screen.getByTestId(`cell-${entry.row}-${entry.col}`)).toHaveAccessibleName(new RegExp(`Wert ${digit}`));
    save.mockRejectedValueOnce(new Error('retry failed'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Speichern wiederholen' })); });
    fireEvent.click(screen.getByRole('button', { name: 'Level' }));
    expect(confirm).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Speichern wiederholen' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Speichern wiederholen' })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Bleistiftmodus' }));
    fireEvent.pointerDown(screen.getByTestId(`cell-${note.row}-${note.col}`));
    fireEvent.keyDown(grid, { key: '2' });
    await waitFor(async () => expect((await localforage.getItem<{ notes: number[][][] }>('killersudoku_level-1'))?.notes[note.row][note.col]).toEqual([2]));
    fireEvent.click(screen.getByRole('button', { name: 'Level' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));
    expect(await screen.findByTestId(`cell-${entry.row}-${entry.col}`)).toHaveAccessibleName(new RegExp(`Wert ${digit}`));
    expect(screen.getByTestId(`cell-${note.row}-${note.col}`)).toHaveAccessibleName(/Notizen 2/);
  } finally {
    jest.restoreAllMocks();
  }
}, 15000);
