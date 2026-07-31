// marker
import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react';
import { render } from '../../test-utils';
import InstallPrompt from './InstallPrompt';

describe('InstallPrompt', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useFakeTimers();
    // Default: kein standalone-MatchMedia-Override leakt zwischen Tests.
    (window as any).matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('rendert keine Install-UI ohne beforeinstallprompt-Event', () => {
    const { container } = render(<InstallPrompt />);
    expect(screen.queryByText('Zum Startbildschirm hinzufügen')).not.toBeInTheDocument();
    expect(container.querySelector('button')).toBeNull();
  });

  test('rendert Slide nach beforeinstallprompt-Event', () => {
    render(<InstallPrompt />);
    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });
    expect(screen.getByText('Zum Startbildschirm hinzufügen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Installieren' })).toBeInTheDocument();
  });

  test('Klick auf Installieren ruft deferredPrompt.prompt', async () => {
    const promptMock = jest.fn().mockResolvedValue({ outcome: 'accepted' });
    const userChoiceMock = Promise.resolve({ outcome: 'accepted' });
    const evt = new Event('beforeinstallprompt') as any;
    evt.prompt = promptMock;
    evt.userChoice = userChoiceMock;
    render(<InstallPrompt />);
    await act(async () => {
      window.dispatchEvent(evt);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Installieren' }));
    });
    expect(promptMock).toHaveBeenCalled();
  });

  test('Klick auf Schließen-Icon speichert 1-Wochen-Ablauf in localStorage', () => {
    render(<InstallPrompt />);
    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });
    const installBtn = screen.getByRole('button', { name: 'Installieren' });
    const allButtons = screen.getAllByRole('button');
    const installIdx = allButtons.indexOf(installBtn);
    expect(installIdx).toBeGreaterThan(0);
    fireEvent.click(allButtons[installIdx - 1]);
    const stored = window.localStorage.getItem('installPromptDismissed');
    expect(stored).toBeDefined();
    const parsed = parseInt(stored!, 10);
    expect(parsed).toBeGreaterThan(Date.now());
  });

  test('Dismissal mit gesetztem Ablauf in der Zukunft: zeigt nicht erneut', () => {
    const future = Date.now() + 7 * 24 * 60 * 60 * 1000;
    window.localStorage.setItem('installPromptDismissed', future.toString());
    render(<InstallPrompt />);
    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });
    expect(screen.queryByText('Zum Startbildschirm hinzufügen')).not.toBeInTheDocument();
  });

  test('Display-Mode standalone: zeigt auch nach beforeinstallprompt-Event nicht (Bugfix)', () => {
    // Bugfix: der standalone-Check wurde vorher NUR in useEffect
    // beim Mount gemacht. Wenn die App zur Laufzeit standalone wurde
    // (z. B. nach Installation), zeigte der Prompt weiter. Jetzt
    // wird der Check im Render-Pfad erneut ausgewertet.
    const matchMediaMock = jest.fn().mockImplementation(query => ({
      matches: query.includes('standalone'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    (window as any).matchMedia = matchMediaMock;

    render(<InstallPrompt />);
    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });
    expect(screen.queryByText('Zum Startbildschirm hinzufügen')).not.toBeInTheDocument();
  });

  test('onDismiss Callback wird aufgerufen', () => {
    const onDismiss = jest.fn();
    render(<InstallPrompt onDismiss={onDismiss} />);
    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });
    const installBtn = screen.getByRole('button', { name: 'Installieren' });
    const allButtons = screen.getAllByRole('button');
    const installIdx = allButtons.indexOf(installBtn);
    expect(installIdx).toBeGreaterThan(0);
    fireEvent.click(allButtons[installIdx - 1]);
    expect(onDismiss).toHaveBeenCalled();
  });

  test('unmount entfernt Event-Listener (kein Leak)', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = render(<InstallPrompt />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
  });
});
