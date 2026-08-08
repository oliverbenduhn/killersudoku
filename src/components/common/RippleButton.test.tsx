import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react';
import { render } from '../../test-utils';
import RippleButton from './RippleButton';

describe('RippleButton', () => {
  test('rendert children', () => {
    render(<RippleButton>Klick mich</RippleButton>);
    expect(screen.getByRole('button', { name: 'Klick mich' })).toBeInTheDocument();
  });

  test('onClick wird durchgereicht', () => {
    const onClick = jest.fn();
    render(<RippleButton onClick={onClick}>Click</RippleButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Click' }));
    expect(onClick).toHaveBeenCalled();
  });

  test('Klick rendert Ripple-Element (Anzahl der Ripple-Container steigt)', () => {
    const { container } = render(<RippleButton>Click</RippleButton>);
    const button = screen.getByRole('button', { name: 'Click' });
    const before = container.querySelectorAll('button > div').length;
    fireEvent.click(button);
    const after = container.querySelectorAll('button > div').length;
    expect(after).toBeGreaterThan(before);
  });

  test('Ripple-Element hat pointerEvents:none (kein Click-Intercept)', () => {
    const { container } = render(<RippleButton>Click</RippleButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Click' }));
    const wrapper = container.querySelector('button > div') as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(window.getComputedStyle(wrapper).pointerEvents).toBe('none');
  });

  test('mehrere Klicks erzeugen mehrere Ripple-Wrapper', () => {
    const { container } = render(<RippleButton>Click</RippleButton>);
    const button = screen.getByRole('button', { name: 'Click' });
    fireEvent.click(button, { clientX: 10, clientY: 10 });
    fireEvent.click(button, { clientX: 20, clientY: 20 });
    expect(container.querySelectorAll('button > div').length).toBe(2);
  });

  test('Ripple-Position propagiert click-Koordinaten (Vertrag)', () => {
    // Wir prüfen NICHT die exakte Position (Animation-Stylesheet ist im
    // jsdom nicht evaluierbar), sondern dass die click-Koordinaten
    // an createRipple durchgereicht werden. Vertrag: ein Klick mit
    // (x,y) erzeugt mindestens einen Ripple-Wrapper.
    const { container } = render(<RippleButton>Click</RippleButton>);
    const button = screen.getByRole('button', { name: 'Click' });
    fireEvent.click(button, { clientX: 999, clientY: 999 });
    expect(container.querySelectorAll('button > div').length).toBeGreaterThan(0);
  });

  // Audit 🔴 #3: vorher entfernte der Effect bei jedem Fires nur die
  // erste Ripple (`setRipples(ripples.slice(1))`). Bei 3 schnellen Klicks
  // blieben Ripples 2 + 3 sichtbar. Repro: 3 Klicks, warten bis alle
  // Timers gefeuert haben, dann müssen 0 Wrapper im DOM sein.
  test('nach duration ms sind alle Ripples entfernt (Audit 🔴 #3 — mehrere Klicks)', () => {
    jest.useFakeTimers();
    try {
      const { container } = render(<RippleButton duration={300}>Click</RippleButton>);
      const button = screen.getByRole('button', { name: 'Click' });

      fireEvent.click(button, { clientX: 10, clientY: 10 });
      fireEvent.click(button, { clientX: 20, clientY: 20 });
      fireEvent.click(button, { clientX: 30, clientY: 30 });

      // Drei Ripple-Wrapper direkt nach den Klicks.
      expect(container.querySelectorAll('button > div').length).toBe(3);

      // Nach duration ms alle Timer-Queues leerlaufen lassen.
      act(() => {
        jest.advanceTimersByTime(400);
      });

      // Alle drei müssen weg sein — vor dem Fix blieb Ripple 2 + 3 sichtbar.
      expect(container.querySelectorAll('button > div').length).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
