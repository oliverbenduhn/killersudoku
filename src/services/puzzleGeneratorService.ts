// filepath: /home/oliverbenduhn/Dokumente/projekte/killersudoku/src/services/puzzleGeneratorService.ts
// Einfache Hilfsfunktionen für das Killer-Sudoku-Spiel
// Da alle Level vordefiniert sind, enthält dieser Service nur Hilfsfunktionen

/**
 * Erstellt ein leeres Spielfeld mit der angegebenen Größe.
 * Diese Funktion wird nur noch für das Zurücksetzen eines Levels oder für
 * die Initialisierung eines neuen Spielstands verwendet.
 */
export const createEmptyBoard = (size: number = 9): number[][] => {
  return Array(size).fill(0).map(() => Array(size).fill(0));
};