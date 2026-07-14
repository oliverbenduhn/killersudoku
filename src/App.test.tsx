import React from 'react';
import { render, screen } from './test-utils';
import App from './App';

test('renders Killer Sudoku header', async () => {
  render(<App />);
  // Header ist in der App-Bar; bei asynchronem Level-Load kann die initiale
  // Render-Welle etwas dauern.
  const headingElement = await screen.findByRole('heading', { name: /killer sudoku/i });
  expect(headingElement).toBeInTheDocument();
});