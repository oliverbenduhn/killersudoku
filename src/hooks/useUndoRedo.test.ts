// useUndoRedo-Hook: zwei Stacks für Undo/Redo, Cap bei 50, Reset invalidiert Redo.
// ADR-0003: commit speichert (before, after) als Paar, damit redo den
// ursprünglichen Nachher-Zustand zuverlässig reproduziert.

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
    act(() => result.current.commit({ before: 1, after: 2 }));
    act(() => result.current.commit({ before: 2, after: 3 }));
    expect(result.current.pastDepth).toBe(2);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  test('undo gibt vorher-State, redo gibt nachher-State (ADR-0003)', () => {
    const { result } = renderHook(() => useUndoRedo<number>());
    act(() => result.current.commit({ before: 1, after: 2 }));

    let undone: number | null = null;
    act(() => { undone = result.current.undo(); });
    expect(undone).toBe(1); // before
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
    expect(result.current.pastDepth).toBe(0);
    expect(result.current.futureDepth).toBe(1);

    let redone: number | null = null;
    act(() => { redone = result.current.redo(); });
    expect(redone).toBe(2); // after — exakt der Nachher-Zustand
    expect(result.current.futureDepth).toBe(0);
    expect(result.current.canRedo).toBe(false);
  });

  test('Aktion → Undo → Redo → identischer Nachher-Zustand (Regression ADR-0003)', () => {
    const { result } = renderHook(() => useUndoRedo<number>());
    act(() => result.current.commit({ before: 0, after: 7 }));

    let undone: number | null = null;
    act(() => { undone = result.current.undo(); });
    expect(undone).toBe(0);

    let redone: number | null = null;
    act(() => { redone = result.current.redo(); });
    expect(redone).toBe(7); // keine Vorher-/Nachher-Vertauschung
  });

  test('Notiz-Aktion → Undo → Redo stellt den Notiz-Nachher-Zustand wieder her', () => {
    type State = { cellValues: number[][]; notes: number[][][] };
    const before: State = { cellValues: [[0]], notes: [[[]]] };
    const after: State = { cellValues: [[0]], notes: [[[4]]] };
    const { result } = renderHook(() => useUndoRedo<State>());
    act(() => result.current.commit({ before, after }));

    let state: State | null = null;
    act(() => { state = result.current.undo(); });
    expect(state).toBe(before);
    act(() => { state = result.current.redo(); });
    expect(state).toBe(after);
    expect(state!.notes[0][0]).toEqual([4]);
  });

  test('Werteingabe → Undo → Redo stellt Wert und automatisch geleerte Notizen atomar wieder her', () => {
    type State = { cellValues: number[][]; notes: number[][][] };
    const before: State = { cellValues: [[0]], notes: [[[2, 4]]] };
    const after: State = { cellValues: [[4]], notes: [[[]]] };
    const { result } = renderHook(() => useUndoRedo<State>());
    act(() => result.current.commit({ before, after }));

    let state: State | null = null;
    act(() => { state = result.current.undo(); });
    expect(state).toBe(before);
    act(() => { state = result.current.redo(); });
    expect(state).toBe(after);
    expect(state).toEqual({ cellValues: [[4]], notes: [[[]]] });
  });

  test('mehrere Moves: each undo→before, each redo→after', () => {
    const { result } = renderHook(() => useUndoRedo<number>());
    act(() => result.current.commit({ before: 1, after: 2 }));
    act(() => result.current.commit({ before: 2, after: 3 }));
    act(() => result.current.commit({ before: 3, after: 4 }));

    let state = 4;
    act(() => { state = result.current.undo()!; }); expect(state).toBe(3);
    act(() => { state = result.current.undo()!; }); expect(state).toBe(2);
    act(() => { state = result.current.undo()!; }); expect(state).toBe(1);

    act(() => { state = result.current.redo()!; }); expect(state).toBe(2);
    act(() => { state = result.current.redo()!; }); expect(state).toBe(3);
    act(() => { state = result.current.redo()!; }); expect(state).toBe(4);
  });

  test('redo gefolgt von undo stellt wieder den Vorher-Zustand her', () => {
    const { result } = renderHook(() => useUndoRedo<number>());
    act(() => result.current.commit({ before: 1, after: 2 }));
    act(() => result.current.undo());
    act(() => result.current.redo());

    let undone: number | null = null;
    act(() => { undone = result.current.undo(); });
    expect(undone).toBe(1);
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
    act(() => result.current.commit({ before: 1, after: 2 }));
    act(() => result.current.commit({ before: 2, after: 3 }));
    act(() => result.current.commit({ before: 3, after: 4 }));
    act(() => result.current.undo()); // (3,4) raus, future=[4]
    expect(result.current.futureDepth).toBe(1);

    act(() => result.current.commit({ before: 4, after: 5 })); // Neuer Ast: redo weg
    expect(result.current.futureDepth).toBe(0);
  });

  test('identische States (gleiches before+after) werden nicht doppelt gepusht', () => {
    const { result } = renderHook(() => useUndoRedo<number>());
    act(() => result.current.commit({ before: 1, after: 2 }));
    act(() => result.current.commit({ before: 1, after: 2 }));
    act(() => result.current.commit({ before: 1, after: 2 }));
    expect(result.current.pastDepth).toBe(1);
  });

  test('Cap auf 50 Einträge — ältere werden verworfen', () => {
    const { result } = renderHook(() => useUndoRedo<number>());
    for (let i = 1; i <= 60; i++) {
      act(() => result.current.commit({ before: i, after: i + 1 }));
    }
    expect(result.current.pastDepth).toBe(50);
  });

  test('reset leert beide Stacks', () => {
    const { result } = renderHook(() => useUndoRedo<number>());
    act(() => result.current.commit({ before: 1, after: 2 }));
    act(() => result.current.commit({ before: 2, after: 3 }));
    act(() => result.current.undo());
    act(() => result.current.reset());
    expect(result.current.pastDepth).toBe(0);
    expect(result.current.futureDepth).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
