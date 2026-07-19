// useUndoRedo-Hook: zwei Stacks für Undo/Redo, Cap bei 50, Reset invalidiert Redo.

import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from './useUndoRedo';

describe('useUndoRedo', () => {
  test('initialer Zustand: nichts rückgängig machbar', () => {
    const { result } = renderHook(() => useUndoRedo<number>());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.pastDepth).toBe(0);
    expect(result.current.futureDepth).toBe(0);
  });

  test('commit füllt den Past-Stack', () => {
    const { result } = renderHook(() => useUndoRedo<number>());
    act(() => result.current.commit(1));
    act(() => result.current.commit(2));
    expect(result.current.pastDepth).toBe(2);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  test('undo gibt vorigen State zurück, redo stellt wieder her', () => {
    const { result } = renderHook(() => useUndoRedo<number>());
    act(() => result.current.commit(1));
    act(() => result.current.commit(2));

    let undone: number | null = null;
    act(() => { undone = result.current.undo(); });
    expect(undone).toBe(2);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);
    expect(result.current.pastDepth).toBe(1);
    expect(result.current.futureDepth).toBe(1);

    let redone: number | null = null;
    act(() => { redone = result.current.redo(); });
    expect(redone).toBe(2);
    expect(result.current.futureDepth).toBe(0);
    expect(result.current.canRedo).toBe(false);
  });

  test('undo auf leerem Stack → null', () => {
    const { result } = renderHook(() => useUndoRedo<number>());
    let undone: number | null = -1;
    act(() => { undone = result.current.undo(); });
    expect(undone).toBeNull();
  });

  test('redo auf leerem Stack → null', () => {
    const { result } = renderHook(() => useUndoRedo<number>());
    let redone: number | null = -1;
    act(() => { redone = result.current.redo(); });
    expect(redone).toBeNull();
  });

  test('commit nach undo löscht Redo-Stack (klassische Semantik)', () => {
    const { result } = renderHook(() => useUndoRedo<number>());
    act(() => result.current.commit(1));
    act(() => result.current.commit(2));
    act(() => result.current.commit(3));
    act(() => result.current.undo()); // 3 raus, redo=[3]
    expect(result.current.futureDepth).toBe(1);

    act(() => result.current.commit(4)); // Neuer Ast: redo weg
    expect(result.current.futureDepth).toBe(0);
  });

  test('identische States hintereinander werden nicht doppelt gepusht', () => {
    const { result } = renderHook(() => useUndoRedo<number>());
    act(() => result.current.commit(1));
    act(() => result.current.commit(1));
    act(() => result.current.commit(1));
    expect(result.current.pastDepth).toBe(1);
  });

  test('Cap auf 50 Einträge — ältere werden verworfen', () => {
    const { result } = renderHook(() => useUndoRedo<number>());
    for (let i = 1; i <= 60; i++) {
      act(() => result.current.commit(i));
    }
    expect(result.current.pastDepth).toBe(50);
  });

  test('reset leert beide Stacks', () => {
    const { result } = renderHook(() => useUndoRedo<number>());
    act(() => result.current.commit(1));
    act(() => result.current.commit(2));
    act(() => result.current.undo());
    act(() => result.current.reset());
    expect(result.current.pastDepth).toBe(0);
    expect(result.current.futureDepth).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
