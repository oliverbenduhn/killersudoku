import React from 'react';
import { render } from '../../test-utils';
import FadeInView from './FadeInView';

describe('FadeInView', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('rendert children', () => {
    const { container } = render(<FadeInView>hello</FadeInView>);
    expect(container.textContent).toContain('hello');
  });

  test('direction="up": initial transform ist translateY positive', () => {
    const { container } = render(<FadeInView direction="up" distance={20}>x</FadeInView>);
    const div = container.querySelector('div') as HTMLElement;
    expect(div.style.transform).toBe('translateY(20px)');
    expect(div.style.opacity).toBe('0');
  });

  test('direction="down": initial transform ist translateY negative', () => {
    const { container } = render(<FadeInView direction="down" distance={15}>x</FadeInView>);
    const div = container.querySelector('div') as HTMLElement;
    expect(div.style.transform).toBe('translateY(-15px)');
  });

  test('direction="left": initial transform ist translateX positive', () => {
    const { container } = render(<FadeInView direction="left" distance={10}>x</FadeInView>);
    const div = container.querySelector('div') as HTMLElement;
    expect(div.style.transform).toBe('translateX(10px)');
  });

  test('direction="right": initial transform ist translateX negative', () => {
    const { container } = render(<FadeInView direction="right" distance={10}>x</FadeInView>);
    const div = container.querySelector('div') as HTMLElement;
    expect(div.style.transform).toBe('translateX(-10px)');
  });

  test('direction="scale": initial transform ist scale(0.9)', () => {
    const { container } = render(<FadeInView direction="scale">x</FadeInView>);
    const div = container.querySelector('div') as HTMLElement;
    expect(div.style.transform).toBe('scale(0.9)');
  });

  test('nach delay wird opacity 1, transform identity', () => {
    const { container } = render(<FadeInView direction="up" delay={100}>x</FadeInView>);
    jest.advanceTimersByTime(100);
    const div = container.querySelector('div') as HTMLElement;
    expect(div.style.opacity).toBe('1');
    expect(div.style.transform).toBe('translate(0) scale(1)');
  });

  test('transition-CSS berücksichtigt duration', () => {
    const { container } = render(<FadeInView duration={300}>x</FadeInView>);
    const div = container.querySelector('div') as HTMLElement;
    expect(div.style.transition).toContain('300ms');
  });

  test('unmount cleart Timer (kein act-Warning)', () => {
    const { unmount } = render(<FadeInView delay={100}>x</FadeInView>);
    unmount();
    jest.advanceTimersByTime(200);
  });
});
