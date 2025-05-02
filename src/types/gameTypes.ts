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
  history?: GameState[];
  currentHistoryIndex?: number;
}