// Typen für das Killersudoku-Spiel

export interface CellPosition {
  row: number;
  col: number;
}

export interface Cage {
  id: string;
  cells: CellPosition[];
  sum: number;
  color: string;
}

export interface GameState {
  id: string;
  cellValues: number[][];
  startTime?: number;
  endTime?: number;
  difficulty?: string;
  solved?: boolean;
  gameOver?: boolean;
  history?: GameState[];
  currentHistoryIndex?: number;
  levelId?: string; // ID des aktuellen Levels
  hintsUsed?: number;
  mistakesUsed?: number;
  elapsedTime?: number;
}

export interface GameLevel {
  id: string;
  levelNumber: number;
  difficulty?: string;
  difficultyRating?: number; // 1-10 Schwierigkeitswert anstelle der Kategorien
  name?: string;
  cages: Cage[];
  initialValues: number[][]; // Array mit vorgegebenen Zahlenwerten
  solution?: number[][];
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
}
