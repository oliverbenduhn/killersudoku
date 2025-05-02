import * as React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders killer sudoku heading', () => {
  render(<App />);
  const linkElement = screen.getByText(/killer sudoku/i);
  expect(linkElement).toBeInTheDocument();
});
