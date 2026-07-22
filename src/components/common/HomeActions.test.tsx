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
        onToggleBlackAndWhite={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Farbmodus aktivieren' })).toBeInTheDocument();
  });

  test('rendert einen Dark-Mode-Toggle-Button', () => {
    render(
      <HomeActions
        onOpenLevels={jest.fn()}
        blackAndWhiteMode={false}
        onToggleBlackAndWhite={jest.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /Hellmodus wechseln|Dunkelmodus wechseln/ })
    ).toBeInTheDocument();
  });
});
