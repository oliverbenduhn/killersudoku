// filepath: /home/oliverbenduhn/Dokumente/projekte/killersudoku/src/services/levelService.ts
// Level Service für Killersudoku
// Lädt und verwaltet die vordefinierten Level

import { Cage, GameLevel } from '../types/gameTypes';

// Gesamtzahl der Level
export const TOTAL_LEVELS = 100;

// Funktion zum Generieren des Dateipfads für ein Level
const getLevelFilePath = (levelNumber: number): string => {
  return `${process.env.PUBLIC_URL}/assets/levels/level_${levelNumber}.json`;
};

// Lädt ein Level direkt mit der Level-Nummer (1-100)
export const loadLevelByNumber = async (levelNumber: number): Promise<GameLevel> => {
  try {
    // Stelle sicher, dass die Levelnummer im gültigen Bereich liegt
    if (levelNumber < 1 || levelNumber > TOTAL_LEVELS) {
      throw new Error(`Ungültige Levelnummer: ${levelNumber}. Muss zwischen 1 und ${TOTAL_LEVELS} sein.`);
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
  } catch (error) {
    console.error(`Fehler beim Laden des Levels ${levelNumber}:`, error);
    throw error;
  }
};

// Lädt das nächste Level
export const loadNextLevel = async (currentLevel: number): Promise<GameLevel> => {
  const nextLevel = currentLevel < TOTAL_LEVELS ? currentLevel + 1 : 1;
  return await loadLevelByNumber(nextLevel);
};

// Lädt das vorherige Level
export const loadPreviousLevel = async (currentLevel: number): Promise<GameLevel> => {
  const prevLevel = currentLevel > 1 ? currentLevel - 1 : TOTAL_LEVELS;
  return await loadLevelByNumber(prevLevel);
};
