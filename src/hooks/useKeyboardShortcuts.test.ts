import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { useKeyboardShortcuts, matchesKey } from './useKeyboardShortcuts';

const makeHandlers = () => ({
  onTogglePencil: jest.fn(),
  onToggleHints: jest.fn(),
  onHint: jest.fn(),
  onRevealHint: jest.fn(),
  onUndo: jest.fn(),
  onRedo: jest.fn(),
  onClearSelection: jest.fn(),
  onOpenHelp: jest.fn(),
});

describe('useKeyboardShortcuts', () => {
  test('P (ohne Modifier) ruft onTogglePencil', () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));
    fireEvent.keyDown(window, { key: 'p' });
    expect(handlers.onTogglePencil).toHaveBeenCalledTimes(1);
    expect(handlers.onToggleHints).not.toHaveBeenCalled();
  });

  test('Groß-P ruft ebenfalls onTogglePencil', () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));
    fireEvent.keyDown(window, { key: 'P' });
    expect(handlers.onTogglePencil).toHaveBeenCalledTimes(1);
  });

  test('Ctrl+P ruft KEIN onTogglePencil auf', () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));
    fireEvent.keyDown(window, { key: 'p', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'p', metaKey: true });
    fireEvent.keyDown(window, { key: 'p', altKey: true });
    expect(handlers.onTogglePencil).not.toHaveBeenCalled();
  });

  test('event.repeat unterdrückt Handler-Aufruf', () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));
    fireEvent.keyDown(window, { key: 'p', repeat: true });
    expect(handlers.onTogglePencil).not.toHaveBeenCalled();
  });

  test('F5 ruft onToggleHints und verhindert Reload', () => {
    const handlers = makeHandlers();
    const prevented = jest.fn();
    renderHook(() => useKeyboardShortcuts(handlers));
    const evt = new KeyboardEvent('keydown', { key: 'F5', cancelable: true });
    evt.preventDefault = prevented;
    window.dispatchEvent(evt);
    expect(handlers.onToggleHints).toHaveBeenCalledTimes(1);
    expect(prevented).toHaveBeenCalled();
  });

  test('H ruft onHint', () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));
    fireEvent.keyDown(window, { key: 'h' });
    expect(handlers.onHint).toHaveBeenCalledTimes(1);
  });

  test('R ruft onRevealHint', () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));
    fireEvent.keyDown(window, { key: 'r' });
    expect(handlers.onRevealHint).toHaveBeenCalledTimes(1);
  });

  test('Esc ruft onClearSelection', () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handlers.onClearSelection).toHaveBeenCalledTimes(1);
  });

  test('Mod+Z ruft onUndo, Mod+Shift+Z ruft onRedo', () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(handlers.onUndo).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(handlers.onRedo).toHaveBeenCalledTimes(1);
  });

  test('Mod+Y ruft ebenfalls onRedo', () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));
    fireEvent.keyDown(window, { key: 'y', metaKey: true });
    expect(handlers.onRedo).toHaveBeenCalledTimes(1);
  });

  test('"?" ruft onOpenHelp', () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));
    fireEvent.keyDown(window, { key: '?' });
    expect(handlers.onOpenHelp).toHaveBeenCalledTimes(1);
  });

  test('Kürzel greifen NICHT, wenn ein Input-Feld fokussiert ist', () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(window, { key: 'p' });
    expect(handlers.onTogglePencil).not.toHaveBeenCalled();
    input.blur();
    document.body.removeChild(input);
  });
});

describe('matchesKey', () => {
  test('einfacher Buchstabe matched case-insensitiv', () => {
    expect(matchesKey({ key: 'p' } as KeyboardEvent, 'P', false)).toBe(true);
    expect(matchesKey({ key: 'P' } as KeyboardEvent, 'p', false)).toBe(true);
  });

  test('Mod-Spec fordert Ctrl oder Meta', () => {
    expect(matchesKey({ key: 'z', ctrlKey: true } as KeyboardEvent, 'Mod+Z', true)).toBe(true);
    expect(matchesKey({ key: 'z', metaKey: true } as KeyboardEvent, 'Mod+Z', true)).toBe(true);
    expect(matchesKey({ key: 'z' } as KeyboardEvent, 'Mod+Z', false)).toBe(false);
  });

  test('Esc matched "Escape" und "Esc"', () => {
    expect(matchesKey({ key: 'Escape' } as KeyboardEvent, 'Esc', false)).toBe(true);
  });
});
