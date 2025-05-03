"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAllLevels = exports.validateLevel = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
// Prüft, ob zwei Käfige benachbart sind
const areCagesAdjacent = (cage1, cage2) => {
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
const areAdjacentCells = (cell1, cell2) => {
    const rowDiff = Math.abs(cell1.row - cell2.row);
    const colDiff = Math.abs(cell1.col - cell2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
};
// Berechnet mögliche Summen für eine gegebene Käfiggröße
const getPossibleSums = (size) => {
    if (size === 1)
        return [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const sums = new Set();
    const generateCombinations = (nums, targetSize, sum, start) => {
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
const validateCageMath = (cage) => {
    const possibleSums = getPossibleSums(cage.cells.length);
    return possibleSums.includes(cage.sum);
};
// Prüft, ob sich Käfige überlappen
const validateNoOverlappingCages = (cages) => {
    const cellMap = new Map();
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
const findOverlappingCages = (cages) => {
    const cellMap = new Map();
    const overlappingIds = new Set();
    const overlappingCoordinates = [];
    for (const cage of cages) {
        for (const cell of cage.cells) {
            const key = `${cell.row},${cell.col}`;
            if (cellMap.has(key)) {
                // Käfig-IDs speichern
                overlappingIds.add(cage.id);
                const existingCageId = cellMap.get(key);
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
const validateAllCellsCovered = (cages) => {
    const cellMap = new Map();
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
const validateSudokuSolution = (solution) => {
    // Zeilen prüfen
    for (const row of solution) {
        if (!isValidSet(row))
            return false;
    }
    // Spalten prüfen
    for (let col = 0; col < 9; col++) {
        const column = solution.map(row => row[col]);
        if (!isValidSet(column))
            return false;
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
            if (!isValidSet(block))
                return false;
        }
    }
    return true;
};
// Hilfsfunktion zur Prüfung eines Sets von Zahlen (1-9)
const isValidSet = (numbers) => {
    const set = new Set(numbers);
    return set.size === 9 && !Array.from(set).some(n => n < 1 || n > 9);
};
// Prüft, ob benachbarte Käfige unterschiedliche Farben haben
const validateCageColors = (cages) => {
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
const findAdjacentSameColorCages = (cages) => {
    const conflicts = [];
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
const validateInitialValues = (initialValues, solution) => {
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
const validateLevel = (level) => {
    const errors = [];
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
    }
    else if (!validateSudokuSolution(level.solution)) {
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
    }
    else if (level.solution && !validateInitialValues(level.initialValues, level.solution)) {
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
exports.validateLevel = validateLevel;
// Funktion zum Validieren aller Level
const validateAllLevels = () => {
    const levelsDir = path.join(__dirname, '../../public/assets/levels');
    const results = [];
    let totalErrors = 0;
    // Alle Level-Dateien lesen und validieren
    const files = fs.readdirSync(levelsDir)
        .filter(file => file.startsWith('level_') && file.endsWith('.json'));
    for (const file of files) {
        const levelPath = path.join(levelsDir, file);
        const levelContent = fs.readFileSync(levelPath, 'utf-8');
        const level = JSON.parse(levelContent);
        const result = (0, exports.validateLevel)(level);
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
exports.validateAllLevels = validateAllLevels;
// CLI-Ausführung
if (require.main === module) {
    console.log('Starte Level-Validierung...');
    const report = (0, exports.validateAllLevels)();
    console.log(`\nValidierung abgeschlossen.`);
    console.log(`Geprüfte Level: ${report.totalLevels}`);
    console.log(`Gefundene Fehler: ${report.totalErrors}`);
    console.log(`\nDetaillierter Bericht wurde gespeichert in: logs/validation-report.json`);
    if (report.totalErrors > 0) {
        process.exit(1);
    }
}
