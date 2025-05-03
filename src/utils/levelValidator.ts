import { GameLevel, Cage, CellPosition } from '../types/gameTypes';
import * as fs from 'fs';
import * as path from 'path';

const VALID_COLORS = [
  'pink.100',
  'blue.100',
  'green.100',
  'yellow.100',
  'orange.100',
  'purple.100',
  'teal.100',
  'cyan.100',
  'gray.100'
];

// Beschränkung auf 4 Farben (gemäß Vier-Farben-Theorem für planare Graphen)
const OPTIMAL_COLORS = [
  'blue.100',
  'yellow.100',
  'green.100',
  'pink.100'
];

interface ValidationError {
  levelId: string;
  errorType: string;
  message: string;
  details?: any;
}

interface ValidationResult {
  levelId: string;
  valid: boolean;
  errors: ValidationError[];
  fixedLevel?: GameLevel; // Das Level mit korrigierten Farben
}

// Prüft, ob zwei Käfige benachbart sind
const areCagesAdjacent = (cage1: Cage, cage2: Cage): boolean => {
  for (const cell1 of cage1.cells) {
    for (const cell2 of cage2.cells) {
      if (areAdjacentCells(cell1, cell2)) {
        return true;
      }
    }
  }
  return false;
};

// Prüft, ob zwei Zellen benachbart sind (nur orthogonal)
const areAdjacentCells = (cell1: CellPosition, cell2: CellPosition): boolean => {
  const rowDiff = Math.abs(cell1.row - cell2.row);
  const colDiff = Math.abs(cell1.col - cell2.col);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
};

// Berechnet mögliche Summen für eine gegebene Käfiggröße
const getPossibleSums = (size: number): number[] => {
  if (size === 1) return [1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  const sums = new Set<number>();
  const generateCombinations = (nums: number[], targetSize: number, sum: number, start: number) => {
    if (targetSize === 0) {
      sums.add(sum);
      return;
    }
    for (let i = start; i < nums.length; i++) {
      generateCombinations(nums, targetSize - 1, sum + nums[i], i + 1);
    }
  };
  
  generateCombinations([1, 2, 3, 4, 5, 6, 7, 8, 9], size, 0, 0);
  return Array.from(sums);
};

// Validiert die mathematische Korrektheit eines Käfigs
const validateCageMath = (cage: Cage): boolean => {
  const possibleSums = getPossibleSums(cage.cells.length);
  return possibleSums.includes(cage.sum);
};

// Prüft, ob sich Käfige überlappen
const validateNoOverlappingCages = (cages: Cage[]): boolean => {
  const cellMap = new Map<string, string>();
  
  for (const cage of cages) {
    for (const cell of cage.cells) {
      const key = `${cell.row},${cell.col}`;
      if (cellMap.has(key)) {
        return false;
      }
      cellMap.set(key, cage.id);
    }
  }
  
  return true;
};

// Findet überlappende Käfige und gibt ihre IDs und überlappende Koordinaten zurück
const findOverlappingCages = (cages: Cage[]): { 
  overlappingIds: string[],
  overlappingCoordinates: { row: number, col: number, cageIds: string[] }[]
} => {
  const cellMap = new Map<string, string>();
  const overlappingIds = new Set<string>();
  const overlappingCoordinates: { row: number, col: number, cageIds: string[] }[] = [];
  
  for (const cage of cages) {
    for (const cell of cage.cells) {
      const key = `${cell.row},${cell.col}`;
      if (cellMap.has(key)) {
        // Käfig-IDs speichern
        overlappingIds.add(cage.id);
        const existingCageId = cellMap.get(key)!;
        overlappingIds.add(existingCageId);
        
        // Überlappende Koordinaten speichern
        overlappingCoordinates.push({
          row: cell.row,
          col: cell.col,
          cageIds: [existingCageId, cage.id]
        });
      }
      cellMap.set(key, cage.id);
    }
  }
  
  return {
    overlappingIds: Array.from(overlappingIds),
    overlappingCoordinates
  };
};

// Prüft, ob alle Zellen einem Käfig zugeordnet sind
const validateAllCellsCovered = (cages: Cage[]): boolean => {
  const cellMap = new Map<string, boolean>();
  
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      cellMap.set(`${i},${j}`, false);
    }
  }
  
  for (const cage of cages) {
    for (const cell of cage.cells) {
      cellMap.set(`${cell.row},${cell.col}`, true);
    }
  }
  
  return Array.from(cellMap.values()).every(covered => covered);
};

// Prüft, ob die Lösung ein gültiges Sudoku ist
const validateSudokuSolution = (solution: number[][]): boolean => {
  // Zeilen prüfen
  for (const row of solution) {
    if (!isValidSet(row)) return false;
  }
  
  // Spalten prüfen
  for (let col = 0; col < 9; col++) {
    const column = solution.map(row => row[col]);
    if (!isValidSet(column)) return false;
  }
  
  // 3x3 Blöcke prüfen
  for (let blockRow = 0; blockRow < 9; blockRow += 3) {
    for (let blockCol = 0; blockCol < 9; blockCol += 3) {
      const block = [];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          block.push(solution[blockRow + i][blockCol + j]);
        }
      }
      if (!isValidSet(block)) return false;
    }
  }
  
  return true;
};

// Hilfsfunktion zur Prüfung eines Sets von Zahlen (1-9)
const isValidSet = (numbers: number[]): boolean => {
  const set = new Set(numbers);
  return set.size === 9 && !Array.from(set).some(n => n < 1 || n > 9);
};

// Prüft, ob benachbarte Käfige unterschiedliche Farben haben
const validateCageColors = (cages: Cage[]): boolean => {
  for (let i = 0; i < cages.length; i++) {
    for (let j = i + 1; j < cages.length; j++) {
      if (areCagesAdjacent(cages[i], cages[j]) && cages[i].color === cages[j].color) {
        return false;
      }
    }
  }
  return true;
};

// Findet Paare benachbarter Käfige mit der gleichen Farbe
const findAdjacentSameColorCages = (cages: Cage[]): { cage1: string, cage2: string, color: string }[] => {
  const conflicts: { cage1: string, cage2: string, color: string }[] = [];
  
  for (let i = 0; i < cages.length; i++) {
    for (let j = i + 1; j < cages.length; j++) {
      if (areCagesAdjacent(cages[i], cages[j]) && cages[i].color === cages[j].color) {
        conflicts.push({
          cage1: cages[i].id,
          cage2: cages[j].id,
          color: cages[i].color
        });
      }
    }
  }
  
  return conflicts;
};

// Prüft, ob die initialValues mit der solution übereinstimmen
const validateInitialValues = (initialValues: number[][], solution: number[][]): boolean => {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (initialValues[i][j] !== 0 && initialValues[i][j] !== solution[i][j]) {
        return false;
      }
    }
  }
  return true;
};

// Hauptvalidierungsfunktion für ein einzelnes Level
export const validateLevel = (level: GameLevel): ValidationResult => {
  const errors: ValidationError[] = [];
  
  // 1. Prüfen der Käfig-Mathematik
  for (const cage of level.cages) {
    if (!validateCageMath(cage)) {
      errors.push({
        levelId: level.id,
        errorType: 'INVALID_CAGE_SUM',
        message: `Käfig ${cage.id} hat eine ungültige Summe von ${cage.sum} für ${cage.cells.length} Zellen`,
        details: cage
      });
    }
  }
  
  // 2. Prüfen auf überlappende Käfige
  if (!validateNoOverlappingCages(level.cages)) {
    const { overlappingIds, overlappingCoordinates } = findOverlappingCages(level.cages);
    errors.push({
      levelId: level.id,
      errorType: 'OVERLAPPING_CAGES',
      message: 'Es wurden überlappende Käfige gefunden',
      details: { overlappingIds, overlappingCoordinates }
    });
  }
  
  // 3. Prüfen, ob alle Zellen abgedeckt sind
  if (!validateAllCellsCovered(level.cages)) {
    errors.push({
      levelId: level.id,
      errorType: 'UNCOVERED_CELLS',
      message: 'Nicht alle Zellen sind einem Käfig zugeordnet'
    });
  }
  
  // 4. Prüfen der Sudoku-Lösung
  if (!level.solution) {
    errors.push({
      levelId: level.id,
      errorType: 'MISSING_SOLUTION',
      message: 'Keine Lösung für das Level gefunden'
    });
  } else if (!validateSudokuSolution(level.solution)) {
    errors.push({
      levelId: level.id,
      errorType: 'INVALID_SOLUTION',
      message: 'Die Lösung ist kein gültiges Sudoku'
    });
  }
  
  // 5. Prüfen der initialValues
  if (!level.initialValues) {
    errors.push({
      levelId: level.id,
      errorType: 'MISSING_INITIAL_VALUES',
      message: 'Keine Anfangswerte für das Level gefunden'
    });
  } else if (level.solution && !validateInitialValues(level.initialValues, level.solution)) {
    errors.push({
      levelId: level.id,
      errorType: 'INITIAL_VALUES_MISMATCH',
      message: 'Die Anfangswerte stimmen nicht mit der Lösung überein'
    });
  }
  
  // 6. Prüfen der Käfigfarben
  if (!validateCageColors(level.cages)) {
    const conflicts = findAdjacentSameColorCages(level.cages);
    errors.push({
      levelId: level.id,
      errorType: 'ADJACENT_SAME_COLOR',
      message: 'Es wurden benachbarte Käfige mit gleicher Farbe gefunden',
      details: { conflicts: conflicts.slice(0, 5) } // Zeige nur die ersten 5 Konflikte
    });
  }
  
  // 7. Prüfen der verwendeten Farben
  for (const cage of level.cages) {
    if (!VALID_COLORS.includes(cage.color)) {
      errors.push({
        levelId: level.id,
        errorType: 'INVALID_COLOR',
        message: `Käfig ${cage.id} verwendet eine ungültige Farbe: ${cage.color}`,
        details: cage
      });
    }
  }
  
  return {
    levelId: level.id,
    valid: errors.length === 0,
    errors
  };
};

// Funktion zum Validieren aller Level
export const validateAllLevels = () => {
  const levelsDir = path.join(__dirname, '../../public/assets/levels');
  const results: ValidationResult[] = [];
  let totalErrors = 0;
  
  // Alle Level-Dateien lesen und validieren
  const files = fs.readdirSync(levelsDir)
    .filter(file => file.startsWith('level_') && file.endsWith('.json'));
  
  for (const file of files) {
    const levelPath = path.join(levelsDir, file);
    const levelContent = fs.readFileSync(levelPath, 'utf-8');
    const level: GameLevel = JSON.parse(levelContent);
    
    const result = validateLevel(level);
    results.push(result);
    totalErrors += result.errors.length;
  }
  
  // Ergebnisse in eine Datei schreiben
  const reportPath = path.join(__dirname, '../../logs/validation-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    totalLevels: files.length,
    totalErrors,
    results
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return report;
};

// CLI-Ausführung
if (require.main === module) {
  console.log('Starte Level-Validierung...');
  const report = validateAllLevels();
  console.log(`\nValidierung abgeschlossen.`);
  console.log(`Geprüfte Level: ${report.totalLevels}`);
  console.log(`Gefundene Fehler: ${report.totalErrors}`);
  console.log(`\nDetaillierter Bericht wurde gespeichert in: logs/validation-report.json`);
  
  if (report.totalErrors > 0) {
    process.exit(1);
  }
}