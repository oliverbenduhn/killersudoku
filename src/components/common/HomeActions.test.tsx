import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { render } from '../../test-utils';
import { HomeActions } from './HomeActions';

describe('HomeActions', () => {
  test('ruft onOpenLevels beim Klick auf den Level-Button auf', () => {
    const onOpenLevels = jest.fn();
    render(
      <HomeActions
        onOpenLevels={onOpenLevels}
        blackAndWhiteMode={false}
        isFullscreen={false}
        onToggleFullscreen={jest.fn()}
        onToggleBlackAndWhite={jest.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Level' }));
    expect(onOpenLevels).toHaveBeenCalledTimes(1);
  });

  test('ruft onToggleBlackAndWhite beim Klick auf den Schwarzweiß-Toggle auf', () => {
    const onToggleBlackAndWhite = jest.fn();
    render(
      <HomeActions
        onOpenLevels={jest.fn()}
        blackAndWhiteMode={false}
        isFullscreen={false}
        onToggleFullscreen={jest.fn()}
        onToggleBlackAndWhite={onToggleBlackAndWhite}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Schwarzweiß-Modus aktivieren' }));
    expect(onToggleBlackAndWhite).toHaveBeenCalledTimes(1);
  });

  test('zeigt "Farbmodus aktivieren" wenn Schwarzweiß-Modus bereits an ist', () => {
    render(
      <HomeActions
        onOpenLevels={jest.fn()}
        blackAndWhiteMode={true}
        isFullscreen={false}
        onToggleFullscreen={jest.fn()}
        onToggleBlackAndWhite={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Farbmodus aktivieren' })).toBeInTheDocument();
  });

  test('rendert einen Farbschema-Menü-Button', () => {
    render(
      <HomeActions
        onOpenLevels={jest.fn()}
        blackAndWhiteMode={false}
        isFullscreen={false}
        onToggleFullscreen={jest.fn()}
        onToggleBlackAndWhite={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Farbschema wählen' })).toBeInTheDocument();
  });

  test('wechselt das Farbschema beim Klick auf einen Menüeintrag', async () => {
    render(
      <HomeActions
        onOpenLevels={jest.fn()}
        blackAndWhiteMode={false}
        isFullscreen={false}
        onToggleFullscreen={jest.fn()}
        onToggleBlackAndWhite={jest.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Farbschema wählen' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Ocean/ }));
    expect(document.documentElement.getAttribute('data-scheme')).toBe('ocean');
  });
});
