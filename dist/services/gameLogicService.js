"use strict";
// Game Logic Service für Killersudoku
// Stellt Funktionen für die Spielregeln, Validierung und Gewinnbedingungen bereit
Object.defineProperty(exports, "__esModule", { value: true });
exports.areCellsInSameCage = exports.getPossibleValues = exports.isBoardComplete = exports.getCageForCell = exports.isCellValid = exports.isCageComplete = exports.isCageFilled = exports.calculateCageSum = exports.hasDuplicatesInCage = exports.isCellValidForSudokuRules = void 0;
// Standard-Sudoku-Regeln: Keine Duplikate in Zeilen, Spalten, Blöcken
const isCellValidForSudokuRules = (cellValues, row, col, value, size = 9) => {
    if (!value)
        return true; // Leere Zellen sind immer gültig
    // Zeile überprüfen
    for (let c = 0; c < size; c++) {
        if (c !== col && cellValues[row][c] === value)
            return false;
    }
    // Spalte überprüfen
    for (let r = 0; r < size; r++) {
        if (r !== row && cellValues[r][col] === value)
            return false;
    }
    // Block (3x3) überprüfen
    const blockSize = Math.sqrt(size);
    const blockRow = Math.floor(row / blockSize) * blockSize;
    const blockCol = Math.floor(col / blockSize) * blockSize;
    for (let r = blockRow; r < blockRow + blockSize; r++) {
        for (let c = blockCol; c < blockCol + blockSize; c++) {
            if ((r !== row || c !== col) && cellValues[r][c] === value)
                return false;
        }
    }
    return true;
};
exports.isCellValidForSudokuRules = isCellValidForSudokuRules;
// Überprüft ob keine doppelten Ziffern im Käfig vorkommen
const hasDuplicatesInCage = (cellValues, cage) => {
    const values = cage.cells
        .map(cell => cellValues[cell.row][cell.col])
        .filter(value => value !== 0); // Ignoriere leere Zellen
    return new Set(values).size !== values.length;
};
exports.hasDuplicatesInCage = hasDuplicatesInCage;
// Berechnet die Summe eines Käfigs
const calculateCageSum = (cellValues, cage) => {
    return cage.cells.reduce((sum, cell) => sum + (cellValues[cell.row][cell.col] || 0), 0);
};
exports.calculateCageSum = calculateCageSum;
// Prüft, ob alle Zellen im Käfig gefüllt sind
const isCageFilled = (cellValues, cage) => {
    return cage.cells.every(cell => cellValues[cell.row][cell.col] !== 0);
};
exports.isCageFilled = isCageFilled;
// Überprüft, ob ein Käfig vollständig und korrekt ist
const isCageComplete = (cellValues, cage) => {
    // Käfig muss vollständig gefüllt sein
    if (!(0, exports.isCageFilled)(cellValues, cage))
        return false;
    // Summenregel: Alle Zellen im Käfig müssen die Zielssumme ergeben
    const currentSum = (0, exports.calculateCageSum)(cellValues, cage);
    if (currentSum !== cage.sum)
        return false;
    // Keine Duplikate im Käfig erlaubt
    if ((0, exports.hasDuplicatesInCage)(cellValues, cage))
        return false;
    return true;
};
exports.isCageComplete = isCageComplete;
// Überprüft, ob eine Zelle gültig ist (Sudoku-Regeln und Käfig-Regeln)
const isCellValid = (cellValues, row, col, value, cages, size = 9) => {
    // Zuerst Sudoku-Regeln prüfen
    if (!(0, exports.isCellValidForSudokuRules)(cellValues, row, col, value, size)) {
        return false;
    }
    // Dann Käfig-Regeln prüfen
    const cage = (0, exports.getCageForCell)(cages, row, col);
    if (!cage)
        return true; // Wenn Zelle in keinem Käfig ist
    // Temp-Board mit dem neuen Wert erstellen, um Validierung zu prüfen
    const tempValues = cellValues.map(row => [...row]);
    tempValues[row][col] = value;
    // Keine doppelten Zahlen im Käfig erlaubt
    if ((0, exports.hasDuplicatesInCage)(tempValues, cage))
        return false;
    // Wenn alle Zellen im Käfig gefüllt sind, prüfe ob Summe stimmt
    if ((0, exports.isCageFilled)(tempValues, cage)) {
        const sum = (0, exports.calculateCageSum)(tempValues, cage);
        if (sum !== cage.sum)
            return false;
    }
    return true;
};
exports.isCellValid = isCellValid;
// Hilfsfunktion zum Finden des Käfigs für eine Zelle
const getCageForCell = (cages, row, col) => {
    return cages.find(cage => cage.cells.some(cell => cell.row === row && cell.col === col));
};
exports.getCageForCell = getCageForCell;
// Überprüft, ob das gesamte Board gültig und vollständig ist
const isBoardComplete = (cellValues, cages, size = 9) => {
    // 1. Alle Zellen müssen gefüllt sein
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (cellValues[row][col] === 0)
                return false;
        }
    }
    // 2. Alle Zellen müssen die Sudoku-Regeln einhalten
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const value = cellValues[row][col];
            if (!(0, exports.isCellValidForSudokuRules)(cellValues, row, col, value, size)) {
                return false;
            }
        }
    }
    // 3. Alle Käfige müssen die Summenregel einhalten
    for (const cage of cages) {
        if (!(0, exports.isCageComplete)(cellValues, cage)) {
            return false;
        }
    }
    return true;
};
exports.isBoardComplete = isBoardComplete;
// Gibt eine Liste potentieller Werte für eine Zelle zurück
const getPossibleValues = (cellValues, row, col, cages, size = 9) => {
    const possibleValues = [];
    for (let value = 1; value <= size; value++) {
        if ((0, exports.isCellValid)(cellValues, row, col, value, cages, size)) {
            possibleValues.push(value);
        }
    }
    return possibleValues;
};
exports.getPossibleValues = getPossibleValues;
// Prüft, ob zwei Zellen zum gleichen Käfig gehören
const areCellsInSameCage = (cages, row1, col1, row2, col2) => {
    const cage = (0, exports.getCageForCell)(cages, row1, col1);
    if (!cage)
        return false;
    return cage.cells.some(cell => cell.row === row2 && cell.col === col2);
};
exports.areCellsInSameCage = areCellsInSameCage;
