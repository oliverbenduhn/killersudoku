import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test-utils';
import { HelpDialog } from './HelpDialog';

describe('HelpDialog', () => {
  test('rendert nichts, wenn isOpen=false', () => {
    render(<HelpDialog isOpen={false} onClose={jest.fn()} />);
    expect(screen.queryByText('Tastenkombinationen')).not.toBeInTheDocument();
  });

  test('zeigt beim Öffnen alle Shortcut-Tasten und Labels', () => {
    render(<HelpDialog isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('Tastenkombinationen')).toBeInTheDocument();
    // Anzeige-Beispiele aus keyboardShortcuts.ts:
    expect(screen.getByText('Notizmodus an/aus')).toBeInTheDocument();
    expect(screen.getByText('Rückgängig')).toBeInTheDocument();
    expect(screen.getByText('Strategischer Tipp (zeigt Toast)')).toBeInTheDocument();
    expect(screen.getByText('Diese Hilfe anzeigen')).toBeInTheDocument();
  });

  test('zeigt "Mod"-Platzhalter als ⌘ oder Strg je nach Plattform', () => {
    render(<HelpDialog isOpen={true} onClose={jest.fn()} />);
    // Mindestens ein <kbd>-Element enthält einen Mod-Key:
    const kbds = screen.getAllByText(/⌘|Strg/);
    expect(kbds.length).toBeGreaterThan(0);
  });

  test('Schließen-Button ruft onClose', () => {
    const onClose = jest.fn();
    render(<HelpDialog isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
