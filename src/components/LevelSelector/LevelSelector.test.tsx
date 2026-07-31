import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test-utils';
import LevelSelector from './LevelSelector';

describe('LevelSelector (Header-Mode, fullWidth=false)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('rendert NumberInput + Level-Text', () => {
    render(<LevelSelector currentLevel={1} onLevelChange={jest.fn()} />);
    expect(screen.getByText('Level')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
  });

  test('Änderung des Eingabewertes ruft onLevelChange NICHT sofort (Submit via Enter)', () => {
    const onLevelChange = jest.fn();
    render(<LevelSelector currentLevel={1} onLevelChange={onLevelChange} />);
    const input = screen.getByDisplayValue('1') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '5' } });
    expect(onLevelChange).not.toHaveBeenCalled();
    expect(input.value).toBe('5');
  });

  test('Enter ruft onLevelChange bei gültigem Wert', () => {
    const onLevelChange = jest.fn();
    render(<LevelSelector currentLevel={1} onLevelChange={onLevelChange} />);
    const input = screen.getByDisplayValue('1');
    fireEvent.change(input, { target: { value: '42' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onLevelChange).toHaveBeenCalledWith(42);
  });

  test('Blur ruft onLevelChange bei gültigem Wert', () => {
    const onLevelChange = jest.fn();
    render(<LevelSelector currentLevel={1} onLevelChange={onLevelChange} />);
    const input = screen.getByDisplayValue('1');
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.blur(input);
    expect(onLevelChange).toHaveBeenCalledWith(7);
  });

  test('ungültiger Wert (0) → revert auf currentLevel', () => {
    const onLevelChange = jest.fn();
    render(<LevelSelector currentLevel={1} onLevelChange={onLevelChange} />);
    const input = screen.getByDisplayValue('1') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.blur(input);
    expect(onLevelChange).not.toHaveBeenCalled();
    expect(input.value).toBe('1');
  });

  test('ungültiger Wert (NaN) → revert', () => {
    const onLevelChange = jest.fn();
    render(<LevelSelector currentLevel={1} onLevelChange={onLevelChange} />);
    const input = screen.getByDisplayValue('1') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);
    expect(onLevelChange).not.toHaveBeenCalled();
    expect(input.value).toBe('1');
  });

  test('currentLevel ändert sich → Input wird synchronisiert', () => {
    const { rerender } = render(<LevelSelector currentLevel={1} onLevelChange={jest.fn()} />);
    rerender(<LevelSelector currentLevel={42} onLevelChange={jest.fn()} />);
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
  });

  test('rendert Schwierigkeits-Badge passend zur Level-Nummer', () => {
    const { container } = render(<LevelSelector currentLevel={1} onLevelChange={jest.fn()} />);
    expect(container.textContent).toContain('Einfach');
  });
});

describe('LevelSelector (fullWidth Grid)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('rendert 100 Level-Buttons (fullWidth)', () => {
    render(<LevelSelector currentLevel={1} onLevelChange={jest.fn()} fullWidth />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(100);
  });

  test('Klick auf Level-Button ruft onLevelChange', () => {
    const onLevelChange = jest.fn();
    render(<LevelSelector currentLevel={1} onLevelChange={onLevelChange} fullWidth />);
    fireEvent.click(screen.getByRole('button', { name: /(?:^|\s)42(?:\s|$)/ }));
    expect(onLevelChange).toHaveBeenCalledWith(42);
  });

  test('zeigt Footer-Text mit TOTAL_LEVELS', () => {
    render(<LevelSelector currentLevel={1} onLevelChange={jest.fn()} fullWidth />);
    expect(screen.getByText(/Insgesamt 100 Level/)).toBeInTheDocument();
  });

  test('solvedLevels: zeigt Check-Icon für jedes gelöste Level', () => {
    window.localStorage.setItem('killersudoku_solved_levels', JSON.stringify([5, 10]));
    render(<LevelSelector currentLevel={1} onLevelChange={jest.fn()} fullWidth />);
    expect(screen.getAllByLabelText('Gelöst').length).toBeGreaterThanOrEqual(1);
  });

  test('startedLevels ohne solvedLevels: zeigt „Angefangen" Marker', () => {
    window.localStorage.setItem('killersudoku_started_levels', JSON.stringify([3]));
    window.localStorage.setItem('killersudoku_solved_levels', JSON.stringify([]));
    render(<LevelSelector currentLevel={1} onLevelChange={jest.fn()} fullWidth />);
    expect(screen.getByLabelText('Angefangen')).toBeInTheDocument();
  });

  test('solvedLevels verdecken startedLevels-Marker (solved > started)', () => {
    window.localStorage.setItem('killersudoku_solved_levels', JSON.stringify([5]));
    window.localStorage.setItem('killersudoku_started_levels', JSON.stringify([5]));
    render(<LevelSelector currentLevel={1} onLevelChange={jest.fn()} fullWidth />);
    expect(screen.getByLabelText('Gelöst')).toBeInTheDocument();
    expect(screen.queryByLabelText('Angefangen')).not.toBeInTheDocument();
  });

  test('rendert keine Marker-Sets wenn localStorage leer', () => {
    render(<LevelSelector currentLevel={1} onLevelChange={jest.fn()} fullWidth />);
    expect(screen.queryByLabelText('Gelöst')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Angefangen')).not.toBeInTheDocument();
  });
});
