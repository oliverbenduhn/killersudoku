// LevelsTab: Zufallslevel-Generierung pro Schwierigkeitsgrad.

import { render, screen, fireEvent } from '../test-utils';
import { LevelsTab } from './Tabs';

describe('LevelsTab — Zufallslevel', () => {
  const noop = () => {};

  test('bietet vier Schwierigkeits-Buttons und meldet die Auswahl', () => {
    const onGenerate = jest.fn();
    render(
      <LevelsTab
        currentLevel={1}
        onLevelChange={noop}
        onGenerateLevel={onGenerate}
        onBack={noop}
        transitionDirection={null}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Neues Zufallslevel erstellen: Experte' }));
    expect(onGenerate).toHaveBeenCalledWith('expert');

    fireEvent.click(screen.getByRole('button', { name: 'Neues Zufallslevel erstellen: Einfach' }));
    expect(onGenerate).toHaveBeenCalledWith('easy');

    expect(screen.getByRole('button', { name: 'Neues Zufallslevel erstellen: Mittel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Neues Zufallslevel erstellen: Schwer' })).toBeInTheDocument();
  });
});
