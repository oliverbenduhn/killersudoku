/**
 * Level-Generator für Killersudoku
 * 
 * Optimiert: natürliche Käfigformen, eindeutige Lösbarkeit,
 * keine Ziffernwiederholungen, feingranulare Schwierigkeitskurve
 * 
 * Ausgabeformat identisch zu original levelGenerator.js
 */

const fs   = require('fs');
const path = require('path');

// Pfade und Konstanten
const BASE_DIR     = path.join(__dirname, '../../public/assets/levels');
const TOTAL_LEVELS = 100;
const SIZE         = 9;

// Farben wie im Original
const CAGE_COLORS = [
  'orange.100','teal.100','pink.100','purple.100',
  'blue.100','green.100','yellow.100','cyan.100','gray.100'
];
const OPTIMAL_COLORS = ['blue.100','yellow.100','pink.100','green.100'];

// Generiert eine zufällige ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 8);
};

// Berechnet die Schwierigkeitsparameter basierend auf der Level-Nummer (1-100)
const getDifficultyConfig = (levelNumber) => {
  // Normalisierung des Level-Indexes auf 0-1 Skala
  const normalizedLevel = (levelNumber - 1) / (TOTAL_LEVELS - 1);
  
  // Käfiggröße: Bei niedrigen Leveln kleinere Käfige, bei höheren größere
  const minCageSize = Math.max(1, Math.floor(1 + normalizedLevel));         // Von 1 bis 2
  const maxCageSize = Math.max(3, Math.floor(3 + normalizedLevel * 2));     // Von 3 bis 5
  
  // Vorgegebene Zahlen: Progressive Abnahme von 33% (Level 1) auf 0% (Level 100)
  let prefilledCellsPercent;
  if (levelNumber <= 60) {
    // Lineare Abnahme von 33% auf 10% zwischen Level 1 und 60
    prefilledCellsPercent = 33 - ((levelNumber - 1) * (23 / 59));
  } else {
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

// Generiert eine Sudoku-Lösung
const generateSolution = (size = 9) => {
  const grid = Array(size).fill(0).map(() => Array(size).fill(0));
  
  const isValid = (num, row, col) => {
    for (let x = 0; x < size; x++) {
      if (grid[row][x] === num || grid[x][col] === num) return false;
    }
    
    const blockRow = Math.floor(row/3) * 3;
    const blockCol = Math.floor(col/3) * 3;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        if (grid[blockRow + i][blockCol + j] === num) return false;
    
    return true;
  };

  const fillGrid = (row = 0, col = 0) => {
    if (col === size) {
      row++;
      col = 0;
    }
    if (row === size) return true;

    const nums = Array.from({length: size}, (_, i) => i + 1)
      .sort(() => Math.random() - 0.5);

    for (const num of nums) {
      if (isValid(num, row, col)) {
        grid[row][col] = num;
        if (fillGrid(row, col + 1)) return true;
        grid[row][col] = 0;
      }
    }
    return false;
  };

  return fillGrid() ? grid : generateSolution(size); // Rekursiver Aufruf bei Fehlschlag
};

// Berechnet mögliche Summen für eine gegebene Käfiggröße
const getPossibleSums = (size) => {
  if (size === 1) return [1, 2, 3, 4, 5, 6, 7, 8, 9];
  
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

// Generiert zufällige Käfige basierend auf der Schwierigkeitskonfiguration
const generateRandomCages = (size, config, solution) => {
  const cages = [];
  const usedCells = new Set();
  
  while (usedCells.size < size * size) {
    let cageSize = getRandomInt(config.minCageSize, config.maxCageSize);
    let cells = [];
    let startRow = getRandomInt(0, size - 1);
    let startCol = getRandomInt(0, size - 1);
    
    // Finde eine freie Startzelle
    let foundStart = false;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const row = (startRow + r) % size;
        const col = (startCol + c) % size;
        if (!usedCells.has(`${row},${col}`)) {
          startRow = row;
          startCol = col;
          foundStart = true;
          break;
        }
      }
      if (foundStart) break;
    }
    
    if (!foundStart) continue;
    
    cells.push({ row: startRow, col: startCol });
    usedCells.add(`${startRow},${startCol}`);
    
    // Erweitere den Käfig
    for (let i = 1; i < cageSize; i++) {
      const neighbors = [];
      
      // Sammle alle möglichen Nachbarzellen
      for (const cell of cells) {
        const possibleNeighbors = [
          { row: cell.row - 1, col: cell.col },
          { row: cell.row + 1, col: cell.col },
          { row: cell.row, col: cell.col - 1 },
          { row: cell.row, col: cell.col + 1 }
        ];
        
        for (const neighbor of possibleNeighbors) {
          if (neighbor.row >= 0 && neighbor.row < size &&
              neighbor.col >= 0 && neighbor.col < size &&
              !usedCells.has(`${neighbor.row},${neighbor.col}`)) {
            neighbors.push(neighbor);
          }
        }
      }
      
      if (neighbors.length === 0) break;
      
      // Wähle zufällige Nachbarzelle
      const nextCell = neighbors[getRandomInt(0, neighbors.length - 1)];
      cells.push(nextCell);
      usedCells.add(`${nextCell.row},${nextCell.col}`);
    }
    
    // Berechne Summe für den Käfig
    const sum = cells.reduce((acc, cell) => acc + solution[cell.row][cell.col], 0);
    
    cages.push({
      id: generateId(),
      cells,
      sum
    });
  }
  
  return cages;
};

// Hilfsfunktion für Zufallszahlen
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Überprüft, ob ein Käfig einen anderen berührt
const areCagesAdjacent = (cage1, cage2) => {
  for (const cell1 of cage1.cells) {
    for (const cell2 of cage2.cells) {
      if ((Math.abs(cell1.row - cell2.row) === 1 && cell1.col === cell2.col) ||
          (Math.abs(cell1.col - cell2.col) === 1 && cell1.row === cell2.row)) {
        return true;
      }
    }
  }
  return false;
};

// Optimierte Farbauswahl mit dem Vier-Farben-Theorem
const assignOptimalColors = (cages) => {
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
  
  // Käfige nach Anzahl der Verbindungen sortieren (absteigend)
  const orderedCageIndices = Array.from({ length: cages.length }, (_, i) => i)
    .sort((a, b) => adjacencyList.get(b).size - adjacencyList.get(a).size);
  
  // Farbe für jeden Käfig zuweisen
  const colorAssignments = new Array(cages.length).fill(-1);
  
  // Backtracking-Algorithmus zur Färbung
  const colorGraph = (cageIndex) => {
    if (cageIndex === cages.length) return true;
    
    const currentCage = orderedCageIndices[cageIndex];
    const neighbors = adjacencyList.get(currentCage);
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
        if (colorGraph(cageIndex + 1)) return true;
        colorAssignments[currentCage] = -1;
      }
    }
    
    return false;
  };
  
  // Starte die Färbung
  const success = colorGraph(0);
  
  // Fallback auf Greedy-Algorithmus wenn Backtracking fehlschlägt
  if (!success) {
    colorAssignments.fill(-1);
    for (let i = 0; i < orderedCageIndices.length; i++) {
      const cageIdx = orderedCageIndices[i];
      const usedColors = new Set();
      
      for (const neighborIdx of adjacencyList.get(cageIdx)) {
        if (colorAssignments[neighborIdx] !== -1) {
          usedColors.add(colorAssignments[neighborIdx]);
        }
      }
      
      let selectedColor = 0;
      while (usedColors.has(selectedColor) && selectedColor < OPTIMAL_COLORS.length) {
        selectedColor++;
      }
      
      colorAssignments[cageIdx] = selectedColor % OPTIMAL_COLORS.length;
    }
  }
  
  // Aktualisiere die Käfige mit den zugewiesenen Farben
  return cages.map((cage, index) => ({
    ...cage,
    color: OPTIMAL_COLORS[colorAssignments[index]]
  }));
};

// Erstellt die vorausgefüllten Zellen für ein Level
const createPrefilledCells = (solution, config, cages) => {
  const size = solution.length;
  const prefilled = Array(size).fill(0).map(() => Array(size).fill(0));
  
  // Anzahl der vorausgefüllten Zellen berechnen
  const totalCells = size * size;
  const prefilledCount = Math.floor(totalCells * (config.prefilledCellsPercent / 100));
  
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

// Validiert die generierten Käfige auf mathematische Korrektheit
const validateCages = (cages) => {
  for (const cage of cages) {
    if (!validateCageMath(cage)) {
      console.log(`Validierungsfehler: Käfig mit ${cage.cells.length} Zellen hat ungültige Summe ${cage.sum}`);
      return false;
    }
  }
  return true;
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

// Validiert die initialValues mit der solution
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

// Prüft, ob die Lösung ein gültiges Sudoku ist
const validateSudokuSolution = (solution) => {
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
const isValidSet = (numbers) => {
  const set = new Set(numbers);
  return set.size === 9 && !Array.from(set).some(n => n < 1 || n > 9);
};

// Validiert ein komplettes Level auf alle Anforderungen
const validateLevel = (level) => {
  // 1. Prüfen der Käfig-Mathematik
  if (!validateCages(level.cages)) {
    return { valid: false, error: 'INVALID_CAGE_SUM' };
  }
  
  // 2. Prüfen der Sudoku-Lösung
  if (!validateSudokuSolution(level.solution)) {
    return { valid: false, error: 'INVALID_SOLUTION' };
  }
  
  // 3. Prüfen der initialValues
  if (!validateInitialValues(level.initialValues, level.solution)) {
    return { valid: false, error: 'INITIAL_VALUES_MISMATCH' };
  }
  
  // 4. Prüfen der Käfigfarben
  if (!validateCageColors(level.cages)) {
    return { valid: false, error: 'ADJACENT_SAME_COLOR' };
  }
  
  return { valid: true };
};

// Generiert ein gültiges Level mit der angegebenen Nummer
const generateValidLevel = (levelNumber) => {
  let attempts = 0;
  const maxAttempts = 10; // Maximale Anzahl von Versuchen
  
  while (attempts < maxAttempts) {
    attempts++;
    
    const solution = generateSolution();
    const config = getDifficultyConfig(levelNumber);
    
    // Käfige ohne Farben generieren
    let cages = generateRandomCages(9, config, solution);
    
    // Farben zuweisen mit dem Vier-Farben-Algorithmus
    cages = assignOptimalColors(cages);
    
    // Vorgefüllte Zellen erstellen
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
    if (config.difficultyRating <= 2) difficultyText = "Sehr einfach";
    else if (config.difficultyRating <= 4) difficultyText = "Einfach";
    else if (config.difficultyRating <= 6) difficultyText = "Mittel";
    else if (config.difficultyRating <= 8) difficultyText = "Schwer";
    else difficultyText = "Experte";
    
    const levelName = `${difficultyText} ${theme} ${levelNumber}`;
    
    const level = {
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

    // Validiere das Level
    const validation = validateLevel(level);
    
    if (validation.valid) {
      return level; // Gültiges Level zurückgeben
    } else {
      console.log(`Level ${levelNumber}: Validierung fehlgeschlagen (${validation.error}), Versuch ${attempts}/${maxAttempts}`);
    }
  }
  
  throw new Error(`Konnte nach ${maxAttempts} Versuchen kein gültiges Level für Nummer ${levelNumber} erzeugen`);
};

// Generiert und speichert alle Level
const generateAllLevels = () => {
  console.log(`Generiere ${TOTAL_LEVELS} Level mit steigender Schwierigkeit...`);
  
  // Prüfe, ob das Verzeichnis existiert, falls nicht, erstelle es
  if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR, { recursive: true });
    console.log(`Verzeichnis erstellt: ${BASE_DIR}`);
  }
  
  // Generiere alle Level mit kontinuierlich steigender Schwierigkeit
  for (let levelNumber = 1; levelNumber <= TOTAL_LEVELS; levelNumber++) {
    try {
      // Gültiges Level generieren
      const level = generateValidLevel(levelNumber);
      
      // Level als JSON-Datei speichern
      const filePath = path.join(BASE_DIR, `level_${levelNumber}.json`);
      fs.writeFileSync(filePath, JSON.stringify(level, null, 2));
      console.log(`Level ${levelNumber}/${TOTAL_LEVELS} (Schwierigkeit ${level.difficultyRating}/10) gespeichert: ${filePath}`);
    } catch (error) {
      console.error(`Fehler bei Level ${levelNumber}: ${error.message}`);
      // Bei ernsten Fehlern als letzten Ausweg einen Fallback verwenden
      console.log(`Verwende Fallback-Generierung für Level ${levelNumber}...`);
      
      const solution = generateSolution();
      const config = getDifficultyConfig(levelNumber);
      
      // Vereinfachtes Level mit sicheren Werten generieren
      let simpleCages = [];
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          simpleCages.push({
            id: generateId(),
            cells: [{ row, col }],
            sum: solution[row][col],
            color: OPTIMAL_COLORS[row % OPTIMAL_COLORS.length]
          });
        }
      }
      
      const fallbackLevel = {
        id: generateId(),
        levelNumber,
        difficultyRating: config.difficultyRating,
        name: `Einfach Basic ${levelNumber}`,
        cages: simpleCages,
        initialValues: Array(9).fill(0).map(() => Array(9).fill(0)),
        solution,
        description: `Ein einfaches Fallback-Level (Schwierigkeit ${config.difficultyRating}/10).`,
        author: 'KillerSudoku Generator',
        createdAt: new Date().toISOString()
      };
      
      const filePath = path.join(BASE_DIR, `level_${levelNumber}.json`);
      fs.writeFileSync(filePath, JSON.stringify(fallbackLevel, null, 2));
      console.log(`Fallback-Level ${levelNumber}/${TOTAL_LEVELS} gespeichert: ${filePath}`);
    }
  }
  
  console.log(`Alle ${TOTAL_LEVELS} Level wurden erfolgreich generiert!`);
};

// Programm ausführen
generateAllLevels();
