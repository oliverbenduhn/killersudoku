import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test-utils';
import NumberPad from './NumberPad';

describe('NumberPad', () => {
  test('rendert 9 Ziffern-Buttons + Löschen', () => {
    render(<NumberPad onNumberSelect={jest.fn()} onClear={jest.fn()} />);
    for (let n = 1; n <= 9; n++) {
      expect(screen.getByRole('button', { name: `Zahl ${n}` })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Auswahl löschen' })).toBeInTheDocument();
  });

  test('Klick auf Ziffer-Button ruft onNumberSelect', () => {
    const onNumberSelect = jest.fn();
    render(<NumberPad onNumberSelect={onNumberSelect} onClear={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zahl 5' }));
    expect(onNumberSelect).toHaveBeenCalledWith(5);
  });

  test('Klick auf Löschen ruft onClear', () => {
    const onClear = jest.fn();
    render(<NumberPad onNumberSelect={jest.fn()} onClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: 'Auswahl löschen' }));
    expect(onClear).toHaveBeenCalled();
  });

  test('disabledNumbers: 3,7 geblockt — 1 nicht geblockt (Bugfix: isDisabled)', () => {
    // Regression: vorher wurde `disabled` (HTML-Prop) statt
    // Chakras `isDisabled` übergeben → kein DOM-Disabled-Marker,
    // Klick ging durch. Nach Fix: isDisabled blockiert onClick.
    const onNumberSelect = jest.fn();
    render(
      <NumberPad
        onNumberSelect={onNumberSelect}
        onClear={jest.fn()}
        disabledNumbers={[3, 7]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Zahl 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zahl 7' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zahl 1' }));
    expect(onNumberSelect).toHaveBeenCalledTimes(1);
    expect(onNumberSelect).toHaveBeenCalledWith(1);
  });

  test('disabledNumbers=[]: alle Buttons klickbar', () => {
    const onNumberSelect = jest.fn();
    render(<NumberPad onNumberSelect={onNumberSelect} onClear={jest.fn()} />);
    for (let n = 1; n <= 9; n++) {
      fireEvent.click(screen.getByRole('button', { name: `Zahl ${n}` }));
    }
    expect(onNumberSelect).toHaveBeenCalledTimes(9);
  });

  test('remainingDigits zeigt Counter pro Ziffer', () => {
    const { container } = render(
      <NumberPad
        onNumberSelect={jest.fn()}
        onClear={jest.fn()}
        remainingDigits={{ 1: 9, 5: 5, 9: 1 }}
      />
    );
    expect(container.textContent).toContain('9');
    expect(container.textContent).toContain('5');
    expect(container.textContent).toContain('1');
  });

  test('remainingDigits leer = keine Counter', () => {
    const { container } = render(
      <NumberPad onNumberSelect={jest.fn()} onClear={jest.fn()} />
    );
    expect(container.querySelectorAll('[class*="remainingDigits"]').length).toBe(0);
  });

  test('alle 9 Ziffern vorhanden (Reihenfolge 1..9)', () => {
    render(<NumberPad onNumberSelect={jest.fn()} onClear={jest.fn()} />);
    const buttons = Array.from({ length: 9 }, (_, i) =>
      screen.getByRole('button', { name: `Zahl ${i + 1}` })
    );
    expect(buttons).toHaveLength(9);
  });
});
