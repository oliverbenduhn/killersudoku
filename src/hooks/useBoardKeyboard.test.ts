import { useState } from 'react';
import { CellPosition } from '../types/gameTypes';
import { renderHook, act } from '@testing-library/react';
import { useBoardKeyboard } from './useBoardKeyboard';

const makeParams = () => {
  const setSelectedCell = jest.fn();
  const setSelectedCells = jest.fn();
  const setDragStart = jest.fn();
  const onNumber = jest.fn();
  const onClear = jest.fn();
  const { result } = renderHook(() =>
    useBoardKeyboard({
      selectedCell: { row: 4, col: 4 },
      selectedCells: [{ row: 4, col: 4 }],
      setSelectedCell,
      setSelectedCells,
      setDragStart,
      onNumber,
      onClear,
      size: 9,
    })
  );
  return { ...result, setSelectedCell, setSelectedCells, setDragStart, onNumber, onClear };
};

const keyEvent = (key: string, shift: boolean = false): React.KeyboardEvent => ({
  key,
  shiftKey: shift,
  preventDefault: jest.fn(),
} as unknown as React.KeyboardEvent);

describe('useBoardKeyboard', () => {
  test('returnt handleKeyDown', () => {
    const { current } = makeParams();
    expect(typeof current.handleKeyDown).toBe('function');
  });

  test('Pfeil-links bewegt eine Spalte nach links', () => {
    const { current, setSelectedCell, setSelectedCells } = makeParams();
    act(() => { current.handleKeyDown(keyEvent('ArrowLeft')); });
    expect(setSelectedCell).toHaveBeenCalledWith({ row: 4, col: 3 });
    expect(setSelectedCells).toHaveBeenCalledWith([{ row: 4, col: 3 }]);
  });

  test('Pfeil-rechts bewegt eine Spalte nach rechts', () => {
    const { current, setSelectedCell } = makeParams();
    act(() => { current.handleKeyDown(keyEvent('ArrowRight')); });
    expect(setSelectedCell).toHaveBeenCalledWith({ row: 4, col: 5 });
  });

  test('Pfeil-hoch/runter bewegt Zeile', () => {
    const { current, setSelectedCell } = makeParams();
    act(() => { current.handleKeyDown(keyEvent('ArrowUp')); });
    expect(setSelectedCell).toHaveBeenCalledWith({ row: 3, col: 4 });
    act(() => { current.handleKeyDown(keyEvent('ArrowDown')); });
    expect(setSelectedCell).toHaveBeenCalledWith({ row: 5, col: 4 });
  });

  test('WASD mappt auf Pfeile (W=Up, S=Down, A=Left, D=Right)', () => {
    const { current, setSelectedCell } = makeParams();
    act(() => { current.handleKeyDown(keyEvent('w')); });
    expect(setSelectedCell).toHaveBeenCalledWith({ row: 3, col: 4 });
    act(() => { current.handleKeyDown(keyEvent('s')); });
    expect(setSelectedCell).toHaveBeenCalledWith({ row: 5, col: 4 });
    act(() => { current.handleKeyDown(keyEvent('a')); });
    expect(setSelectedCell).toHaveBeenCalledWith({ row: 4, col: 3 });
    act(() => { current.handleKeyDown(keyEvent('d')); });
    expect(setSelectedCell).toHaveBeenCalledWith({ row: 4, col: 5 });
  });

  test('Pfeil-am-Rand: stoppt, kein Wrap', () => {
    const setSelectedCell = jest.fn();
    const setSelectedCells = jest.fn();
    const setDragStart = jest.fn();
    const { result } = renderHook(() =>
      useBoardKeyboard({
        selectedCell: { row: 0, col: 0 },
        selectedCells: [{ row: 0, col: 0 }],
        setSelectedCell,
        setSelectedCells,
        setDragStart,
        onNumber: jest.fn(),
        onClear: jest.fn(),
        size: 9,
      })
    );
    act(() => { result.current.handleKeyDown(keyEvent('ArrowUp')); });
    expect(setSelectedCell).not.toHaveBeenCalled();
    act(() => { result.current.handleKeyDown(keyEvent('ArrowLeft')); });
    expect(setSelectedCell).not.toHaveBeenCalled();
  });

  test.each([false, true])('Tab leaves the board (shift=%s)', shift => {
    const { current, setSelectedCell, setSelectedCells } = makeParams();
    const event = keyEvent('Tab', shift);
    act(() => { current.handleKeyDown(event); });
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(setSelectedCell).not.toHaveBeenCalled();
    expect(setSelectedCells).not.toHaveBeenCalled();
  });

  test('Zahl 1-9 ruft onNumber auf, kein setSelectedCell', () => {
    const { current, setSelectedCell, onNumber } = makeParams();
    act(() => { current.handleKeyDown(keyEvent('5')); });
    expect(onNumber).toHaveBeenCalledWith(5);
    expect(setSelectedCell).not.toHaveBeenCalled();
  });

  test('Backspace ruft onClear auf', () => {
    const { current, onClear, setSelectedCell } = makeParams();
    act(() => { current.handleKeyDown(keyEvent('Backspace')); });
    expect(onClear).toHaveBeenCalled();
    expect(setSelectedCell).not.toHaveBeenCalled();
  });

  test('Delete ruft onClear auf', () => {
    const { current, onClear } = makeParams();
    act(() => { current.handleKeyDown(keyEvent('Delete')); });
    expect(onClear).toHaveBeenCalled();
  });

  test('"0" ruft onClear auf', () => {
    const { current, onClear } = makeParams();
    act(() => { current.handleKeyDown(keyEvent('0')); });
    expect(onClear).toHaveBeenCalled();
  });

  test('Shift+Pfeil: Anker bleibt, Cursor bewegt sich, Rechteck wächst', () => {
    // Aus selectedCell {row:4, col:4} + Shift+ArrowRight:
    //   - Anker wird auf {4,4} gesetzt (closure: shiftAnchorRef initial null).
    //   - selectedCells = [{4,4}, {4,5}] (Rechteck Anker→Endpunkt)
    //   - dragStart = {4,4}
    //   - Cursor selectedCell bewegt sich auf {4,5}.
    const { current, setSelectedCell, setSelectedCells, setDragStart } = makeParams();
    act(() => { current.handleKeyDown(keyEvent('ArrowRight', true)); });
    expect(setSelectedCell).toHaveBeenCalledWith({ row: 4, col: 5 });
    expect(setSelectedCells).toHaveBeenCalledWith([
      { row: 4, col: 4 }, { row: 4, col: 5 },
    ]);
    expect(setDragStart).toHaveBeenCalledWith({ row: 4, col: 4 });
  });

  test('Shift+Pfeil setzt Anker + expandiertes Rechteck (Excel-Style)', () => {
    // Aus selectedCell {row:4, col:4} + Shift+ArrowRight:
    //   - Anker wird beim ersten Shift+Pfeil auf {4,4} gesetzt.
    //   - Cursor (selectedCell) bewegt sich auf {4,5}.
    //   - Rechteck enthält Anker + Endpunkt.
    // Die Persistenz des Ankers über mehrere Calls hinweg ist in
    // `shiftAnchorRef` als useRef verankert — getestet durch die
    // Render-Test-Stories in Board.test.tsx.
    const { current, setSelectedCell, setSelectedCells, setDragStart } = makeParams();
    act(() => { current.handleKeyDown(keyEvent('ArrowRight', true)); });
    expect(setSelectedCell).toHaveBeenCalledWith({ row: 4, col: 5 });
    expect(setSelectedCells).toHaveBeenCalledWith([
      { row: 4, col: 4 }, { row: 4, col: 5 },
    ]);
    expect(setDragStart).toHaveBeenCalledWith({ row: 4, col: 4 });
  });

  test('Shift+Pfeil rückwärts (Up/Left): Rechteck expandiert vom Anker aus', () => {
    // Anker {4,4}, Shift+ArrowUp → Cursor {3,4}, rect [3,4]..[4,4].
    const { current, setSelectedCells } = makeParams();
    act(() => { current.handleKeyDown(keyEvent('ArrowUp', true)); });
    expect(setSelectedCells).toHaveBeenCalledWith([
      { row: 3, col: 4 }, { row: 4, col: 4 },
    ]);
  });

  test('ohne selectedCell: erste Zelle wird gesetzt', () => {
    const setSelectedCell = jest.fn();
    const setSelectedCells = jest.fn();
    const setDragStart = jest.fn();
    const { result } = renderHook(() =>
      useBoardKeyboard({
        selectedCell: null,
        selectedCells: [],
        setSelectedCell,
        setSelectedCells,
        setDragStart,
        onNumber: jest.fn(),
        onClear: jest.fn(),
        size: 9,
      })
    );
    act(() => { result.current.handleKeyDown(keyEvent('ArrowLeft')); });
    expect(setSelectedCell).toHaveBeenCalledWith({ row: 0, col: 0 });
    expect(setSelectedCells).toHaveBeenCalledWith([{ row: 0, col: 0 }]);
  });

  test('does not query or focus unrelated DOM boards', () => {
    const div = document.createElement('div');
    div.setAttribute('data-board-root', 'true');
    div.tabIndex = 0;
    document.body.appendChild(div);
    const focusSpy = jest.spyOn(div, 'focus');
    makeParams(); // Mounted mit selectedCell={row:4, col:4}
    expect(focusSpy).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });

  test('setzt keinen board-Fokus, wenn selectedCell null', () => {
    const div = document.createElement('div');
    div.setAttribute('data-board-root', 'true');
    div.tabIndex = 0;
    document.body.appendChild(div);
    const focusSpy = jest.spyOn(div, 'focus');
    renderHook(() =>
      useBoardKeyboard({
        selectedCell: null,
        selectedCells: [],
        setSelectedCell: jest.fn(),
        setSelectedCells: jest.fn(),
        setDragStart: jest.fn(),
        onNumber: jest.fn(),
        onClear: jest.fn(),
        size: 9,
      })
    );
    expect(focusSpy).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });

  test('leaves focus ownership to the caller during drag', () => {
    const div = document.createElement('div');
    div.setAttribute('data-board-root', 'true');
    div.tabIndex = 0;
    document.body.appendChild(div);
    const focusSpy = jest.spyOn(div, 'focus');
    renderHook(() =>
      useBoardKeyboard({
        selectedCell: null,
        selectedCells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
        setSelectedCell: jest.fn(),
        setSelectedCells: jest.fn(),
        setDragStart: jest.fn(),
        onNumber: jest.fn(),
        onClear: jest.fn(),
        size: 9,
      })
    );
    expect(focusSpy).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });
});


test('pointer or hint selection discards the previous shift-selection anchor', () => {
  const { result } = renderHook(() => {
    const [cell, setCell] = useState<CellPosition | null>({ row: 4, col: 4 });
    const [cells, setCells] = useState<CellPosition[]>([{ row: 4, col: 4 }]);
    const keyboard = useBoardKeyboard({ selectedCell: cell, selectedCells: cells,
      setSelectedCell: setCell, setSelectedCells: setCells, setDragStart: () => undefined,
      onNumber: () => undefined, onClear: () => undefined, size: 9 });
    return { ...keyboard, cells, select: (next: CellPosition) => { setCell(next); setCells([next]); } };
  });
  act(() => result.current.handleKeyDown(keyEvent('ArrowRight', true)));
  act(() => result.current.select({ row: 0, col: 0 }));
  act(() => result.current.handleKeyDown(keyEvent('ArrowRight', true)));
  expect(result.current.cells).toEqual([{ row: 0, col: 0 }, { row: 0, col: 1 }]);
});
