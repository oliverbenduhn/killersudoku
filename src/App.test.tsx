import React from 'react';
import { render, screen } from './test-utils';
import App from './App';

test('renders Killer Sudoku header', () => {
  render(<App />);
  const headingElement = screen.getByRole('heading', { name: /killer sudoku/i });
  expect(headingElement).toBeInTheDocument();
});