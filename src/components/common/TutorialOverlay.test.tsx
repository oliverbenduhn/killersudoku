import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test-utils';
import { TutorialOverlay } from './TutorialOverlay';
import { TUTORIAL_STEPS } from '../../hooks/useTutorial';

const makeOverlay = (overrides: Partial<React.ComponentProps<typeof TutorialOverlay>> = {}) => {
  const props = {
    isOpen: true,
    step: TUTORIAL_STEPS[0],
    stepIndex: 0,
    totalSteps: TUTORIAL_STEPS.length,
    isFirstStep: true,
    isLastStep: false,
    highlightedCells: TUTORIAL_STEPS[0].highlightedCells as any,
    demoLevelCages: [],
    onNext: jest.fn(),
    onPrev: jest.fn(),
    onJump: jest.fn(),
    onSkip: jest.fn(),
    ...overrides,
  };
  const utils = render(<TutorialOverlay {...props} />);
  return { props, ...utils };
};

describe('TutorialOverlay', () => {
  test('rendert Step-Titel + Body', () => {
    makeOverlay({ step: TUTORIAL_STEPS[1], stepIndex: 1 });
    expect(screen.getByText(TUTORIAL_STEPS[1].title)).toBeInTheDocument();
    expect(screen.getByText(TUTORIAL_STEPS[1].body)).toBeInTheDocument();
  });

  test('rendert insgesamt totalSteps Step-Dots', () => {
    makeOverlay({ totalSteps: 5 });
    const dots = screen.getAllByLabelText(/Zu Schritt \d+ springen/);
    expect(dots).toHaveLength(5);
  });

  test('erster Schritt: kein Zurück-Button', () => {
    makeOverlay({ isFirstStep: true });
    expect(screen.queryByRole('button', { name: 'Zurück' })).not.toBeInTheDocument();
  });

  test('nicht-erster Schritt: Zurück-Button sichtbar', () => {
    makeOverlay({ isFirstStep: false, stepIndex: 1 });
    expect(screen.getByRole('button', { name: 'Zurück' })).toBeInTheDocument();
  });

  test('letzter Schritt: Button-Label ist „Loslegen"', () => {
    makeOverlay({ isLastStep: true, stepIndex: TUTORIAL_STEPS.length - 1 });
    expect(screen.getByRole('button', { name: 'Loslegen' })).toBeInTheDocument();
  });

  test('nicht-letzter Schritt: Button-Label ist „Weiter"', () => {
    makeOverlay({ isLastStep: false, stepIndex: 0 });
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeInTheDocument();
  });

  test('Klick auf Weiter ruft onNext', () => {
    const { props } = makeOverlay();
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(props.onNext).toHaveBeenCalled();
  });

  test('Klick auf Zurück ruft onPrev', () => {
    const { props } = makeOverlay({ isFirstStep: false, stepIndex: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));
    expect(props.onPrev).toHaveBeenCalled();
  });

  test('Klick auf Überspringen ruft onSkip', () => {
    const { props } = makeOverlay();
    fireEvent.click(screen.getByRole('button', { name: 'Überspringen' }));
    expect(props.onSkip).toHaveBeenCalled();
  });

  test('Klick auf Schließen-Icon ruft onSkip', () => {
    const { props } = makeOverlay();
    fireEvent.click(screen.getByRole('button', { name: 'Tutorial überspringen' }));
    expect(props.onSkip).toHaveBeenCalled();
  });

  test('Klick auf Step-Dot ruft onJump mit Index', () => {
    const { props } = makeOverlay({ totalSteps: 5 });
    fireEvent.click(screen.getByLabelText('Zu Schritt 3 springen'));
    expect(props.onJump).toHaveBeenCalledWith(2);
  });

  test('DemoBoard: Top-Left-Summe erscheint im Body', () => {
    // Drawer rendert in einem Portal; wir prüfen gegen document.body.
    const cages = [{
      id: 'c1',
      cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
      sum: 3,
      color: 'blue.100' as const,
    }];
    makeOverlay({ highlightedCells: [], demoLevelCages: cages });
    expect(document.body.textContent).toContain('3');
  });

  test('DemoBoard: highlightete Zelle zeigt value', () => {
    const highlighted = [{ row: 4, col: 4, value: 7 }];
    makeOverlay({ highlightedCells: highlighted });
    expect(document.body.textContent).toContain('7');
  });
});
