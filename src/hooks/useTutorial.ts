// Tutorial — First-Launch-Gating.
//
// Zeigt das interaktive Killer-Sudoku-Tutorial genau einmal pro Device
// (localStorage-Flag). User kann jederzeit überspringen — das markiert
// das Tutorial dann als gesehen und fragt nicht mehr.

import { useState, useCallback } from 'react';
import { GameLevel } from '../types/gameTypes';

const STORAGE_KEY = 'killersudoku_tutorial_seen';

// Minimales Demo-Level: 9x9 mit drei Käfigen, die jeweils eine Zelle
// erzwingen ("Naked Single"). Summe 3 / 7 / 9 → einzelne Zahl 1 / 7 / 9.
// Wird im Tutorial benutzt, um die Käfig-Summen-Regel live zu zeigen.
const DEMO_LEVEL: GameLevel = {
  id: 'tutorial-demo',
  levelNumber: 0,
  difficulty: 'easy',
  cages: [
    { id: 't-cage-1', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], sum: 3,  color: 'blue.100' },
    { id: 't-cage-2', cells: [{ row: 4, col: 4 }, { row: 5, col: 4 }, { row: 5, col: 5 }], sum: 17, color: 'green.100' },
    { id: 't-cage-3', cells: [{ row: 8, col: 8 }], sum: 9, color: 'pink.100' },
  ],
  // 0 = leere Zelle. Die Tutorial-UI füllt sie live, damit der User
  // die Käfig-Logik sieht.
  initialValues: [
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
  ],
  solution: [
    [1,2,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,7,0,0,0,0],
    [0,0,0,0,1,9,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,9],
  ],
};

export type TutorialStepId =
  | 'welcome'
  | 'cells-and-rules'
  | 'cages-and-sums'
  | 'naked-single'
  | 'ready';

export interface TutorialStep {
  id: TutorialStepId;
  title: string;
  body: string;
  // Welche Demo-Zellen sollen auf diesem Schritt sichtbar gefüllt sein?
  // 0 = leer.
  highlightedCells: ReadonlyArray<{ row: number; col: number; value: number }>;
}

export const TUTORIAL_STEPS: ReadonlyArray<TutorialStep> = [
  {
    id: 'welcome',
    title: 'Willkommen bei Killer Sudoku',
    body: 'Klassisches Sudoku plus Käfig-Summen. 9×9 Felder, jede Zahl 1–9 genau einmal pro Zeile, Spalte und 3×3-Block. Klingt bekannt — der Käfig-Twist kommt gleich.',
    highlightedCells: [],
  },
  {
    id: 'cells-and-rules',
    title: 'Die normalen Regeln',
    body: 'In jeder Zeile, jeder Spalte und jedem 3×3-Block darf jede Zahl 1–9 nur genau einmal vorkommen. Wie beim klassischen Sudoku.',
    highlightedCells: [
      { row: 0, col: 0, value: 1 },
      { row: 0, col: 1, value: 2 },
    ],
  },
  {
    id: 'cages-and-sums',
    title: 'Käfige mit Summen',
    body: 'Zusätzlich sind Zellen in Käfigen (gestrichelte Umrandung) gruppiert. Die Summe der Zahlen in einem Käfig muss die angezeigte Summe ergeben — und keine Zahl darf im Käfig doppelt vorkommen.',
    highlightedCells: [
      { row: 0, col: 0, value: 1 },
      { row: 0, col: 1, value: 2 },
    ],
  },
  {
    id: 'naked-single',
    title: 'Naked Single: Käfig mit einer Zelle',
    body: 'Steht nur eine Zelle im Käfig, MUSS die Zahl = Summe sein. Hier: Käfig unten rechts, Summe 9 → die Zelle ist 9. Fertig, ein Feld gelöst.',
    highlightedCells: [
      { row: 0, col: 0, value: 1 },
      { row: 0, col: 1, value: 2 },
      { row: 8, col: 8, value: 9 },
    ],
  },
  {
    id: 'ready',
    title: 'Du bist startklar',
    body: 'Tippe eine Zelle, dann eine Zahl. Versuch’s mit Level 1 — Easy. Tippfehler kosten dich bis zu 3 Leben; Hinweise sind begrenzt.',
    highlightedCells: [
      { row: 0, col: 0, value: 1 },
      { row: 0, col: 1, value: 2 },
      { row: 8, col: 8, value: 9 },
    ],
  },
];

export function useTutorial() {
  const [active, setActive] = useState<boolean>(!hasSeen());
  const [stepIndex, setStepIndex] = useState<number>(0);

  const next = useCallback(() => {
    setStepIndex((i) => {
      const nextIdx = i + 1;
      if (nextIdx >= TUTORIAL_STEPS.length) {
        markSeen();
        setActive(false);
        return i;
      }
      return nextIdx;
    });
  }, []);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const skip = useCallback(() => {
    markSeen();
    setActive(false);
  }, []);

  const restart = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  return {
    active,
    step: TUTORIAL_STEPS[Math.min(stepIndex, TUTORIAL_STEPS.length - 1)],
    stepIndex,
    totalSteps: TUTORIAL_STEPS.length,
    isFirstStep: stepIndex === 0,
    isLastStep: stepIndex === TUTORIAL_STEPS.length - 1,
    next,
    prev,
    skip,
    restart,
    demoLevel: DEMO_LEVEL,
  };
}

function hasSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // Private Browsing oder Storage blockiert: lieber nerven als verstecken.
    return false;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Ignoriere — Worst Case: User sieht das Tutorial beim nächsten Start erneut.
  }
}
