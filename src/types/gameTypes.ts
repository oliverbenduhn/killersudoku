// Killer Sudoku — kanonische Typen
// Quelle der Wahrheit für Level-JSONs und In-Memory-Daten.

export interface CellPosition {
  row: number; // 0..8
  col: number; // 0..8
}

export interface Cage {
  /** Stabile, eindeutige ID (base36-Kurzstring, vom Generator vergeben). */
  id: string;
  /** Käfigzellen, mindestens 1, höchstens 9. */
  cells: CellPosition[];
  /** Pflichtsumme. Kleinster Wert = 1, größter = 45 (Käfig = ganzes Brett). */
  sum: number;
  /** Chakra-Token wie "blue.100". Siehe CageColor unten. */
  color: CageColor;
}

/**
 * Vier-Farben-Palette (Vier-Farben-Theorem für planare Käfig-Graphen).
 * Wird vom Renderer auf konkrete Hex-Werte gemappt; hier nur Token.
 */
export type CageColor =
  | 'blue.100'
  | 'green.100'
  | 'pink.100'
  | 'yellow.100';

export const CAGE_COLORS: readonly CageColor[] = [
  'blue.100',
  'green.100',
  'pink.100',
  'yellow.100',
] as const;

export interface GameState {
  id: string;
  cellValues: number[][];
  startTime?: number;
  endTime?: number;
  difficulty?: Difficulty;
  solved?: boolean;
  gameOver?: boolean;
  history?: GameState[];
  currentHistoryIndex?: number;
  levelId?: string;
  hintsUsed?: number;
  mistakesUsed?: number;
  elapsedTime?: number;
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'unknown';

/**
 * Level-Datei-Schema (public/assets/levels/level_<n>.json).
 *
 * Pflichtfelder: id, cages, initialValues, solution, levelNumber.
 * Optional: name, description, author, createdAt, updatedAt, difficultyRating.
 *
 * HINWEIS: Das Feld "difficulty" ist im aktuellen Datensatz NICHT gesetzt
 * (alle public-Level sind ungelabelt). Die App leitet die Schwierigkeit
 * aus der Levelnummer ab (LevelSelector-Heuristik). Diese Heuristik ist
 * Phase-1-Kandidat für Ersetzung durch echte Pro-Brett-Berechnung.
 */
export interface GameLevel {
  id: string;
  levelNumber: number; // 1..100
  difficulty?: Difficulty;
  difficultyRating?: number; // 1..10
  name?: string;
  cages: Cage[];
  /** 9x9 Matrix, 0 = leere Zelle, 1..9 = vorgegebener Wert. */
  initialValues: number[][];
  /** 9x9 Matrix, 1..9, vollständige gültige Sudoku-Lösung. */
  solution: number[][];
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
}

export const BOARD_SIZE = 9;
