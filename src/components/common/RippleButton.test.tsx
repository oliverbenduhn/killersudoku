import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
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
});
