"use strict";
/**
 * Level-Generator für Killersudoku
 *
 * Dieses Skript generiert 100 vordefinierte Level mit kontinuierlich steigender Schwierigkeit
 * und speichert sie als JSON-Dateien im assets/levels/ Verzeichnis.
 */
const fs = require('fs');
const path = require('path');
// Pfade zu den Level-Verzeichnissen
const BASE_DIR = path.join(__dirname, '../../public/assets/levels');
const TOTAL_LEVELS = 100;
// Liste von genau 9 Farben für Käfige
const CAGE_COLORS = [
    'orange.100',
    'teal.100',
    'pink.100',
    'purple.100',
    'blue.100',
    'green.100',
    'yellow.100',
    'cyan.100',
    'gray.100' // 9. Helles Grau
];
// WICHTIG: Vier-Farben-Theorem besagt, dass 4 Farben für planare Graphen ausreichen
const OPTIMAL_COLORS = [
    'blue.100',
    'yellow.100',
    'pink.100',
    'green.100' // 4. Helles Grün
];
// Hilfsfunktion zur Generierung einer zufälligen Zahl in einem Bereich
const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
// Generiert eine zufällige ID
const generateId = () => {
    return Math.random().toString(36).substring(2, 8);
};
// Berechnet die Schwierigkeitsparameter basierend auf der Level-Nummer (1-100)
const getDifficultyConfig = (levelNumber) => {
    // Normalisierung des Level-Indexes auf 0-1 Skala
    const normalizedLevel = (levelNumber - 1) / (TOTAL_LEVELS - 1);
    // Käfiggröße: Bei niedrigen Leveln kleinere Käfige, bei höheren größere
    const minCageSize = Math.max(1, Math.floor(1 + normalizedLevel)); // Von 1 bis 2
    const maxCageSize = Math.max(3, Math.floor(3 + normalizedLevel * 2)); // Von 3 bis 5
    // Vorgegebene Zahlen: Progressive Abnahme von 33% (Level 1) auf 0% (Level 100)
    let prefilledCellsPercent;
    if (levelNumber <= 60) {
        // Lineare Abnahme von 33% auf 10% zwischen Level 1 und 60
        prefilledCellsPercent = 33 - ((levelNumber - 1) * (23 / 59));
    }
    else {
        // Lineare Abnahme von 10% auf 0% zwischen Level 60 und 100
        prefilledCellsPercent = 10 - ((levelNumber - 60) * (10 / 40));
    }
    // Runde auf eine Nachkommastelle
    prefilledCellsPercent = Math.max(0, Math.round(prefilledCellsPercent * 10) / 10);
    // Difficultyrating von 1-10 für die Anzeige
    const difficultyRating = Math.ceil(1 + normalizedLevel * 9);
    return {
        minCageSize,
        maxCageSize,
        prefilledCellsPercent,
        difficultyRating
    };
};
// Überprüft, ob ein Käfig einen anderen berührt
const areCagesAdjacent = (cage1, cage2) => {
    for (const cell1 of cage1.cells) {
        for (const cell2 of cage2.cells) {
            // Prüfe horizontale und vertikale Nachbarn
            if ((Math.abs(cell1.row - cell2.row) === 1 && cell1.col === cell2.col) ||
                (Math.abs(cell1.col - cell2.col) === 1 && cell1.row === cell2.row)) {
                return true;
            }
        }
    }
    return false;
};
// Überprüft, ob ein Käfig gültig ist (keine Überlappungen mit anderen Käfigen)
const isCageValid = (cage, usedCells) => {
    // Prüfe alle Zellen des Käfigs
    for (const cell of cage.cells) {
        const cellKey = `${cell.row},${cell.col}`;
        // Falls eine Zelle bereits verwendet wird, ist der Käfig ungültig
        if (usedCells.has(cellKey)) {
            return false;
        }
    }
    return true;
};
// Optimierte Farbauswahl mit dem Vier-Farben-Theorem
const assignOptimalColors = (cages) => {
    // Graph-Färbungsalgorithmus (Greedy mit Backtracking)
    const adjacencyList = new Map();
    // Erstelle Adjazenzliste
    cages.forEach((cage1, i) => {
        adjacencyList.set(i, new Set());
        cages.forEach((cage2, j) => {
            if (i !== j && areCagesAdjacent(cage1, cage2)) {
                adjacencyList.get(i).add(j);
            }
        });
    });
    // Farbe für jeden Käfig zuweisen
    const colorAssignments = new Array(cages.length).fill(-1);
    // Käfige nach Anzahl der Verbindungen sortieren (absteigend)
    const orderedCageIndices = Array.from({ length: cages.length }, (_, i) => i)
        .sort((a, b) => {
        return adjacencyList.get(b).size - adjacencyList.get(a).size;
    });
    // Backtracking-Algorithmus zur Färbung
    const colorGraph = (cageIndex) => {
        if (cageIndex === cages.length) {
            return true; // Alle Käfige wurden gefärbt
        }
        const currentCage = orderedCageIndices[cageIndex];
        const neighbors = adjacencyList.get(currentCage);
        // Verfügbare Farben bestimmen
        const usedColors = new Set();
        for (const neighbor of neighbors) {
            if (colorAssignments[neighbor] !== -1) {
                usedColors.add(colorAssignments[neighbor]);
            }
        }
        // Versuche alle möglichen Farben
        for (let color = 0; color < OPTIMAL_COLORS.length; color++) {
            if (!usedColors.has(color)) {
                colorAssignments[currentCage] = color;
                if (colorGraph(cageIndex + 1)) {
                    return true;
                }
                colorAssignments[currentCage] = -1; // Backtrack
            }
        }
        return false;
    };
    // Starte die Färbung
    const success = colorGraph(0);
    // Wenn die Färbung fehlschlägt, verwende einen Greedy-Ansatz als Fallback
    if (!success) {
        console.warn("Warnung: Backtracking-Färbung fehlgeschlagen, verwende Greedy-Färbung");
        colorAssignments.fill(-1);
        for (let i = 0; i < orderedCageIndices.length; i++) {
            const cageIdx = orderedCageIndices[i];
            const usedColors = new Set();
            // Finde bereits verwendete Farben bei Nachbarn
            for (const neighborIdx of adjacencyList.get(cageIdx)) {
                if (colorAssignments[neighborIdx] !== -1) {
                    usedColors.add(colorAssignments[neighborIdx]);
                }
            }
            // Wähle die erste verfügbare Farbe
            let selectedColor = 0;
            while (usedColors.has(selectedColor) && selectedColor < OPTIMAL_COLORS.length) {
                selectedColor++;
            }
            // Im schlimmsten Fall, wenn keine Farbe verfügbar ist, wähle irgendeine
            if (selectedColor >= OPTIMAL_COLORS.length) {
                selectedColor = i % OPTIMAL_COLORS.length;
            }
            colorAssignments[cageIdx] = selectedColor;
        }
    }
    // Aktualisiere die Käfige mit den zugewiesenen Farben
    return cages.map((cage, index) => ({
        ...cage,
        color: OPTIMAL_COLORS[colorAssignments[index]]
    }));
};
// Erstellt ein Killersudoku-Level basierend auf der bereitgestellten vorgefertigten Definition
const createLevelFromTemplate = (template, levelNumber, solution) => {
    // Berechnet die tatsächliche Summe jedes Käfigs basierend auf den Lösungswerten
    const cagesWithSums = template.cages.map(cageTemplate => {
        // Summe berechnen
        let sum = 0;
        for (const cell of cageTemplate.cells) {
            sum += solution[cell.row][cell.col];
        }
        return {
            id: generateId(),
            cells: cageTemplate.cells,
            sum
        };
    });
    // Optimierte Farbzuweisung durchführen
    const cages = assignOptimalColors(cagesWithSums);
    // Themenliste und Stichworte für Levelnamen
    const themes = [
        'Cascade', 'Pyramid', 'Spiral', 'Fortress', 'Labyrinth', 'Diamond',
        'Flower', 'Waterfall', 'Puzzle', 'Challenge', 'Riddle', 'Mystery',
        'Adventure', 'Journey', 'Quest', 'Enigma', 'Maze', 'Path', 'Crown'
    ];
    // Zufälligen Namen generieren
    const theme = themes[getRandomInt(0, themes.length - 1)];
    // Konfiguration basierend auf der Levelnummer
    const config = getDifficultyConfig(levelNumber);
    // Schwierigkeitstext basierend auf difficultyRating
    let difficultyText;
    if (config.difficultyRating <= 2)
        difficultyText = "Sehr einfach";
    else if (config.difficultyRating <= 4)
        difficultyText = "Einfach";
    else if (config.difficultyRating <= 6)
        difficultyText = "Mittel";
    else if (config.difficultyRating <= 8)
        difficultyText = "Schwer";
    else
        difficultyText = "Experte";
    const levelName = `${difficultyText} ${theme} ${levelNumber}`;
    // Create initialValues with the requested percentage of prefilled cells
    const initialValues = createPrefilledCells(solution, config, cages);
    return {
        id: generateId(),
        levelNumber,
        difficultyRating: config.difficultyRating,
        name: levelName,
        cages,
        initialValues,
        solution,
        description: `Ein Level (Schwierigkeit ${config.difficultyRating}/10) mit ${cages.length} Käfigen.`,
        author: 'KillerSudoku Generator',
        createdAt: new Date().toISOString()
    };
};
// Template für Level 1 (wie im Bild gezeigt)
const level1Template = {
    cages: [
        { cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
        { cells: [{ row: 0, col: 3 }] },
        { cells: [{ row: 0, col: 4 }, { row: 0, col: 5 }] },
        { cells: [{ row: 0, col: 6 }] },
        { cells: [{ row: 0, col: 7 }] },
        { cells: [{ row: 0, col: 8 }] },
        { cells: [{ row: 1, col: 0 }, { row: 1, col: 1 }] },
        { cells: [{ row: 1, col: 2 }] },
        { cells: [{ row: 1, col: 3 }] },
        { cells: [{ row: 1, col: 4 }, { row: 1, col: 5 }] },
        { cells: [{ row: 1, col: 6 }] },
        { cells: [{ row: 1, col: 7 }, { row: 0, col: 7 }] },
        { cells: [{ row: 1, col: 8 }] },
        { cells: [{ row: 2, col: 0 }] },
        { cells: [{ row: 2, col: 1 }] },
        { cells: [{ row: 2, col: 2 }] },
        { cells: [{ row: 2, col: 3 }, { row: 3, col: 3 }] },
        { cells: [{ row: 2, col: 4 }, { row: 3, col: 4 }] },
        { cells: [{ row: 2, col: 5 }] },
        { cells: [{ row: 2, col: 6 }] },
        { cells: [{ row: 2, col: 7 }] },
        { cells: [{ row: 2, col: 8 }, { row: 3, col: 8 }] },
        { cells: [{ row: 3, col: 0 }] },
        { cells: [{ row: 3, col: 1 }] },
        { cells: [{ row: 3, col: 2 }] },
        { cells: [{ row: 3, col: 5 }] },
        { cells: [{ row: 3, col: 6 }] },
        { cells: [{ row: 3, col: 7 }] },
        { cells: [{ row: 4, col: 0 }] },
        { cells: [{ row: 4, col: 1 }, { row: 4, col: 2 }, { row: 4, col: 3 }] },
        { cells: [{ row: 4, col: 4 }, { row: 5, col: 4 }] },
        { cells: [{ row: 4, col: 5 }] },
        { cells: [{ row: 4, col: 6 }] },
        { cells: [{ row: 4, col: 7 }] },
        { cells: [{ row: 4, col: 8 }] },
        { cells: [{ row: 5, col: 0 }] },
        { cells: [{ row: 5, col: 1 }] },
        { cells: [{ row: 5, col: 2 }] },
        { cells: [{ row: 5, col: 3 }] },
        { cells: [{ row: 5, col: 5 }, { row: 5, col: 6 }, { row: 6, col: 5 }] },
        { cells: [{ row: 5, col: 7 }, { row: 6, col: 7 }, { row: 6, col: 8 }] },
        { cells: [{ row: 5, col: 8 }] },
        { cells: [{ row: 6, col: 0 }, { row: 6, col: 1 }] },
        { cells: [{ row: 6, col: 2 }, { row: 6, col: 3 }] },
        { cells: [{ row: 6, col: 4 }, { row: 7, col: 4 }, { row: 7, col: 5 }] },
        { cells: [{ row: 6, col: 6 }] },
        { cells: [{ row: 7, col: 0 }, { row: 7, col: 1 }] },
        { cells: [{ row: 7, col: 2 }, { row: 7, col: 3 }] },
        { cells: [{ row: 7, col: 6 }] },
        { cells: [{ row: 7, col: 7 }, { row: 8, col: 7 }, { row: 8, col: 8 }] },
        { cells: [{ row: 7, col: 8 }] },
        { cells: [{ row: 8, col: 0 }] },
        { cells: [{ row: 8, col: 1 }, { row: 8, col: 2 }] },
        { cells: [{ row: 8, col: 3 }, { row: 8, col: 4 }] },
        { cells: [{ row: 8, col: 5 }] },
        { cells: [{ row: 8, col: 6 }] } // Summe 6
    ]
};
// Erstellt eine Teilmenge der Lösung als vorgefüllte Zellen
const createPrefilledCells = (solution, config, cages) => {
    const size = solution.length;
    // Kopie der Lösung erstellen
    const prefilled = Array(size).fill(0).map(() => Array(size).fill(0));
    // Anzahl der vorausgefüllten Zellen berechnen
    const totalCells = size * size;
    const prefilledCount = Math.floor(totalCells * (config.prefilledCellsPercent / 100));
    // Für Level 1 verwenden wir die vordefinierten Zahlen aus dem Bild
    if (config.difficultyRating === 1) {
        // Das gezeigte Muster aus dem Bild nachbilden
        return [
            [1, 0, 0, 0, 0, 0, 7, 0, 9],
            [4, 5, 6, 7, 8, 9, 1, 0, 3],
            [7, 0, 9, 1, 2, 3, 4, 5, 6],
            [2, 3, 4, 5, 0, 7, 0, 9, 1],
            [5, 0, 0, 0, 9, 1, 0, 0, 4],
            [0, 9, 0, 2, 3, 0, 0, 6, 7],
            [3, 4, 0, 6, 0, 0, 9, 0, 0],
            [6, 7, 0, 9, 1, 0, 3, 4, 5],
            [0, 1, 0, 3, 0, 5, 6, 0, 0]
        ];
    }
    // Für andere Level zufällig ausgewählte Zellen vorfüllen
    // Tracking der Käfige mit vorausgefüllten Zellen
    const cagesWithPrefilled = new Set();
    // Wenn nur ein Käfig vollständig vorausgefüllt sein soll
    const fullPrefilledCageIdx = getRandomInt(0, cages.length - 1);
    const fullPrefilledCage = cages[fullPrefilledCageIdx];
    // Nur bei niedrigen Leveln einen Käfig komplett ausfüllen
    let cellsFilled = 0;
    if (config.difficultyRating <= 3) {
        // Den ausgewählten Käfig vollständig befüllen
        for (const cell of fullPrefilledCage.cells) {
            prefilled[cell.row][cell.col] = solution[cell.row][cell.col];
            cellsFilled++;
        }
        cagesWithPrefilled.add(fullPrefilledCageIdx);
    }
    // Restliche Zellen strategisch verteilen
    let attemptsLeft = 100; // Vermeidet Endlosschleifen
    while (cellsFilled < prefilledCount && attemptsLeft > 0) {
        // Zufälligen Käfig auswählen
        const cageIdx = getRandomInt(0, cages.length - 1);
        const cage = cages[cageIdx];
        // Käfige mit nur einer Zelle überspringen (oft schwieriger zu lösen, wenn vorausgefüllt)
        if (cage.cells.length === 1) {
            attemptsLeft--;
            continue;
        }
        // Niemals alle Zellen eines Käfigs ausfüllen (außer für den einen vollständigen Käfig)
        if (cageIdx === fullPrefilledCageIdx) {
            attemptsLeft--;
            continue;
        }
        // Zufällige Zelle aus dem Käfig auswählen
        const cellIdx = getRandomInt(0, cage.cells.length - 1);
        const cell = cage.cells[cellIdx];
        // Wenn die Zelle noch nicht ausgefüllt ist
        if (prefilled[cell.row][cell.col] === 0) {
            prefilled[cell.row][cell.col] = solution[cell.row][cell.col];
            cellsFilled++;
            cagesWithPrefilled.add(cageIdx);
        }
        attemptsLeft--;
    }
    return prefilled;
};
// Erzeugt eine Lösung für das Sudoku
const generateSolution = (size = 9) => {
    const solution = Array(size).fill(0).map(() => Array(size).fill(0));
    // Einfache Sudoku-Lösung generieren (wie im Bild gezeigt für Level 1)
    const basePattern = [
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        [4, 5, 6, 7, 8, 9, 1, 2, 3],
        [7, 8, 9, 1, 2, 3, 4, 5, 6],
        [2, 3, 4, 5, 6, 7, 8, 9, 1],
        [5, 6, 7, 8, 9, 1, 2, 3, 4],
        [8, 9, 1, 2, 3, 4, 5, 6, 7],
        [3, 4, 5, 6, 7, 8, 9, 1, 2],
        [6, 7, 8, 9, 1, 2, 3, 4, 5],
        [9, 1, 2, 3, 4, 5, 6, 7, 8]
    ];
    // Basispattern direkt übernehmen
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            solution[i][j] = basePattern[i][j];
        }
    }
    return solution;
};
// Template für Level 2 (etwas komplexer)
const level2Template = {
    cages: [
    // Mehr organisierte Käfige für Level 2
    // (Details hier einfügen)
    ]
};
// Templates für alle Level definieren
const createTemplatedLevel = (levelNumber) => {
    const solution = generateSolution();
    // Je nach Level-Nummer verschiedene Templates verwenden
    if (levelNumber === 1) {
        return createLevelFromTemplate(level1Template, levelNumber, solution);
    }
    // Für andere Level den ursprünglichen Generator verwenden
    else {
        const config = getDifficultyConfig(levelNumber);
        // Erst Käfige ohne Farben generieren
        let cages = generateRandomCages(9, config, solution);
        // Dann Farben zuweisen mit dem Vier-Farben-Algorithmus
        cages = assignOptimalColors(cages);
        const initialValues = createPrefilledCells(solution, config, cages);
        // Themenliste und Stichworte für Levelnamen
        const themes = [
            'Cascade', 'Pyramid', 'Spiral', 'Fortress', 'Labyrinth', 'Diamond',
            'Flower', 'Waterfall', 'Puzzle', 'Challenge', 'Riddle', 'Mystery',
            'Adventure', 'Journey', 'Quest', 'Enigma', 'Maze', 'Path', 'Crown'
        ];
        // Zufälligen Namen generieren
        const theme = themes[getRandomInt(0, themes.length - 1)];
        // Schwierigkeitstext basierend auf difficultyRating
        let difficultyText;
        if (config.difficultyRating <= 2)
            difficultyText = "Sehr einfach";
        else if (config.difficultyRating <= 4)
            difficultyText = "Einfach";
        else if (config.difficultyRating <= 6)
            difficultyText = "Mittel";
        else if (config.difficultyRating <= 8)
            difficultyText = "Schwer";
        else
            difficultyText = "Experte";
        const levelName = `${difficultyText} ${theme} ${levelNumber}`;
        return {
            id: generateId(),
            levelNumber,
            difficultyRating: config.difficultyRating,
            name: levelName,
            cages,
            initialValues,
            solution,
            description: `Ein Level (Schwierigkeit ${config.difficultyRating}/10) mit ${cages.length} Käfigen.`,
            author: 'KillerSudoku Generator',
            createdAt: new Date().toISOString()
        };
    }
};
// Generiert zufällige Käfige für die meisten Level
const generateRandomCages = (size, config, solution) => {
    const cages = [];
    const usedCells = new Set();
    // Verbesserter Algorithmus zur sicheren Käfiggenerierung
    while (usedCells.size < size * size) {
        let cage = null;
        let maxAttempts = 10; // Reduziert von 25 auf 10
        while (maxAttempts > 0 && !cage) {
            // Neuen Käfig generieren
            const tempCage = generateRandomCage(size, usedCells, config, solution);
            // Käfig nur akzeptieren, wenn er gültig ist
            if (tempCage && tempCage.cells.length > 0) {
                // Prüfen, ob der Käfig mit bestehenden Käfigen überlappt
                let isValid = true;
                for (const cell of tempCage.cells) {
                    const cellKey = `${cell.row},${cell.col}`;
                    if (usedCells.has(cellKey)) {
                        // Überlappung gefunden - Käfig ist ungültig
                        isValid = false;
                        break;
                    }
                }
                if (isValid) {
                    cage = tempCage;
                    // Alle Zellen als verwendet markieren
                    for (const cell of cage.cells) {
                        usedCells.add(`${cell.row},${cell.col}`);
                    }
                    cages.push(cage);
                }
            }
            maxAttempts--;
        }
        // Falls nach mehreren Versuchen kein gültiger Käfig generiert werden konnte,
        // erstelle einen einfachen 1-Zellen-Käfig an einer noch nicht verwendeten Stelle
        if (!cage) {
            // Finde eine noch nicht verwendete Zelle
            let availableCell = null;
            for (let row = 0; row < size; row++) {
                for (let col = 0; col < size; col++) {
                    const cellKey = `${row},${col}`;
                    if (!usedCells.has(cellKey)) {
                        availableCell = { row, col };
                        break;
                    }
                }
                if (availableCell)
                    break;
            }
            if (availableCell) {
                // Erstelle einen 1-Zellen-Käfig
                const cell = availableCell;
                usedCells.add(`${cell.row},${cell.col}`);
                // Summe für den Käfig berechnen
                const sum = solution[cell.row][cell.col];
                // Käfig hinzufügen
                cages.push({
                    id: generateId(),
                    cells: [cell],
                    sum,
                    color: null // Farbe wird später durch den Backtracking-Algorithmus zugewiesen
                });
            }
        }
    }
    return cages;
};
// Generiert einen zufälligen Käfig aus benachbarten Zellen
const generateRandomCage = (size, usedCells, config, solution) => {
    // Kleinere Käfige bevorzugen, um die Generierung zu beschleunigen
    const maxCageSize = Math.min(config.maxCageSize, 3); // Auf maximal 3 Zellen begrenzen
    const cageSize = getRandomInt(config.minCageSize, maxCageSize);
    let cells = [];
    let attempts = 0;
    const maxAttempts = 20; // Reduziert von 100 auf 20
    // Einige Versuche unternehmen, einen gültigen Käfig zu finden
    while (attempts < maxAttempts) {
        cells = []; // Käfig zurücksetzen
        attempts++;
        // Startposition für den Käfig finden
        let startRow, startCol;
        let startAttempts = 0;
        const maxStartAttempts = 10; // Begrenzt die Versuche, eine Startzelle zu finden
        do {
            startRow = getRandomInt(0, size - 1);
            startCol = getRandomInt(0, size - 1);
            startAttempts++;
            if (startAttempts >= maxStartAttempts) {
                // Falls keine freie Startzelle gefunden wird, suche systematisch
                for (let row = 0; row < size; row++) {
                    for (let col = 0; col < size; col++) {
                        if (!usedCells.has(`${row},${col}`)) {
                            startRow = row;
                            startCol = col;
                            break;
                        }
                    }
                    if (!usedCells.has(`${startRow},${startCol}`))
                        break;
                }
                break;
            }
        } while (usedCells.has(`${startRow},${startCol}`));
        // Falls alle Zellen bereits verwendet sind
        if (usedCells.has(`${startRow},${startCol}`)) {
            return null;
        }
        cells.push({ row: startRow, col: startCol });
        // Bei 1-Zellen-Käfigen direkt fertig
        if (cageSize === 1)
            break;
        // Bei größeren Käfigen: Käfig mit benachbarten Zellen erweitern
        for (let i = 1; i < cageSize; i++) {
            // Alle möglichen Nachbarzellen der aktuellen Käfigzellen
            const candidates = [];
            for (const cell of cells) {
                // Oben
                if (cell.row > 0 && !usedCells.has(`${cell.row - 1},${cell.col}`) &&
                    !cells.some(c => c.row === cell.row - 1 && c.col === cell.col)) {
                    candidates.push({ row: cell.row - 1, col: cell.col });
                }
                // Unten
                if (cell.row < size - 1 && !usedCells.has(`${cell.row + 1},${cell.col}`) &&
                    !cells.some(c => c.row === cell.row + 1 && c.col === cell.col)) {
                    candidates.push({ row: cell.row + 1, col: cell.col });
                }
                // Links
                if (cell.col > 0 && !usedCells.has(`${cell.row},${cell.col - 1}`) &&
                    !cells.some(c => c.row === cell.row && c.col === cell.col - 1)) {
                    candidates.push({ row: cell.row, col: cell.col - 1 });
                }
                // Rechts
                if (cell.col < size - 1 && !usedCells.has(`${cell.row},${cell.col + 1}`) &&
                    !cells.some(c => c.row === cell.row && c.col === cell.col + 1)) {
                    candidates.push({ row: cell.row, col: cell.col + 1 });
                }
            }
            // Wenn keine passenden Nachbarn mehr gefunden wurden, Käfig frühzeitig beenden
            if (candidates.length === 0)
                break;
            // Zufällige Nachbarzelle auswählen
            const nextCell = candidates[getRandomInt(0, candidates.length - 1)];
            cells.push(nextCell);
        }
        // Wenn ein gültiger Käfig gefunden wurde
        if (cells.length > 0) {
            break;
        }
    }
    // Wenn nach mehreren Versuchen kein gültiger Käfig gefunden wurde oder
    // Käfig zu klein ist, erstelle einen einfachen 1-Zellen-Käfig
    if (cells.length === 0) {
        let foundEmptyCell = false;
        // Systematisch nach einer freien Zelle suchen
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (!usedCells.has(`${row},${col}`)) {
                    cells.push({ row, col });
                    foundEmptyCell = true;
                    break;
                }
            }
            if (foundEmptyCell)
                break;
        }
        // Falls keine freie Zelle gefunden wurde
        if (!foundEmptyCell) {
            return null;
        }
    }
    // Summe für den Käfig berechnen basierend auf der tatsächlichen Lösung
    let sum = 0;
    cells.forEach(cell => {
        sum += solution[cell.row][cell.col];
    });
    return {
        id: generateId(),
        cells,
        sum,
        color: null // Farbe wird später durch den Backtracking-Algorithmus zugewiesen
    };
};
// Generiert und speichert alle Level
const generateAllLevels = () => {
    console.log(`Generiere ${TOTAL_LEVELS} vordefinierte Level mit steigender Schwierigkeit...`);
    // Prüfe, ob das Verzeichnis existiert, falls nicht, erstelle es
    if (!fs.existsSync(BASE_DIR)) {
        fs.mkdirSync(BASE_DIR, { recursive: true });
        console.log(`Verzeichnis erstellt: ${BASE_DIR}`);
    }
    // Generiere die Level mit kontinuierlich steigender Schwierigkeit
    for (let levelNumber = 1; levelNumber <= TOTAL_LEVELS; levelNumber++) {
        const level = createTemplatedLevel(levelNumber);
        const filePath = path.join(BASE_DIR, `level_${levelNumber}.json`);
        // Level als JSON-Datei speichern
        fs.writeFileSync(filePath, JSON.stringify(level, null, 2));
        console.log(`Level ${levelNumber}/100 (Schwierigkeit ${level.difficultyRating}/10) gespeichert: ${filePath}`);
    }
    console.log(`Alle ${TOTAL_LEVELS} Level wurden erfolgreich generiert!`);
};
// Programm ausführen
generateAllLevels();
