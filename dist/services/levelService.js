"use strict";
// filepath: /home/oliverbenduhn/Dokumente/projekte/killersudoku/src/services/levelService.ts
// Level Service für Killersudoku
// Lädt und verwaltet die vordefinierten Level
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPreviousLevel = exports.loadNextLevel = exports.loadLevelByNumber = exports.TOTAL_LEVELS = void 0;
// Gesamtzahl der Level
exports.TOTAL_LEVELS = 100;
// Funktion zum Generieren des Dateipfads für ein Level
const getLevelFilePath = (levelNumber) => {
    return `${process.env.PUBLIC_URL}/assets/levels/level_${levelNumber}.json`;
};
// Lädt ein Level direkt mit der Level-Nummer (1-100)
const loadLevelByNumber = async (levelNumber) => {
    try {
        // Stelle sicher, dass die Levelnummer im gültigen Bereich liegt
        if (levelNumber < 1 || levelNumber > exports.TOTAL_LEVELS) {
            throw new Error(`Ungültige Levelnummer: ${levelNumber}. Muss zwischen 1 und ${exports.TOTAL_LEVELS} sein.`);
        }
        const filePath = getLevelFilePath(levelNumber);
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Level konnte nicht geladen werden: ${filePath}`);
        }
        const levelData = await response.json();
        // Stellen Sie sicher, dass die Level-Nummer im levelData gesetzt ist
        levelData.levelNumber = levelNumber;
        return levelData;
    }
    catch (error) {
        console.error(`Fehler beim Laden des Levels ${levelNumber}:`, error);
        throw error;
    }
};
exports.loadLevelByNumber = loadLevelByNumber;
// Lädt das nächste Level
const loadNextLevel = async (currentLevel) => {
    const nextLevel = currentLevel < exports.TOTAL_LEVELS ? currentLevel + 1 : 1;
    return await (0, exports.loadLevelByNumber)(nextLevel);
};
exports.loadNextLevel = loadNextLevel;
// Lädt das vorherige Level
const loadPreviousLevel = async (currentLevel) => {
    const prevLevel = currentLevel > 1 ? currentLevel - 1 : exports.TOTAL_LEVELS;
    return await (0, exports.loadLevelByNumber)(prevLevel);
};
exports.loadPreviousLevel = loadPreviousLevel;
