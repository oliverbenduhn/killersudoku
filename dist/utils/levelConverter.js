"use strict";
// Ein Hilfsskript, um die Level-Dateien aus den verschiedenen Schwierigkeitsgraden
// in eine einzige, fortlaufende Struktur mit steigender Schwierigkeit umzuwandeln
// (von 1 bis 100).
const fs = require('fs');
const path = require('path');
// Pfade konfigurieren - korrigiert für die tatsächliche Projektstruktur
const projectRootPath = path.join(__dirname, '../../');
const sourcePath = path.join(projectRootPath, 'public/assets/levels');
const targetPath = path.join(projectRootPath, 'public/assets/levels');
const tempFolderPath = path.join(targetPath, 'temp');
// Stelle sicher, dass der Zielordner existiert
if (!fs.existsSync(tempFolderPath)) {
    fs.mkdirSync(tempFolderPath, { recursive: true });
    console.log(`Temporärer Ordner erstellt: ${tempFolderPath}`);
}
// Array der Schwierigkeitsgrade in aufsteigender Reihenfolge
const difficulties = ['easy', 'medium', 'hard', 'expert'];
const levelsPerDifficulty = 25; // 25 Level pro Schwierigkeitsgrad
// Funktion, um ein Level zu lesen, zu modifizieren und in das neue Format zu speichern
async function processLevel(difficulty, levelNumber, targetLevelNumber) {
    const sourceFilePath = path.join(sourcePath, difficulty, `level_${levelNumber}.json`);
    const targetFilePath = path.join(tempFolderPath, `level_${targetLevelNumber}.json`);
    try {
        // Lese die Originaldatei
        const data = fs.readFileSync(sourceFilePath, 'utf8');
        const levelData = JSON.parse(data);
        // Aktualisiere die Level-Informationen
        levelData.levelNumber = targetLevelNumber;
        // Füge eine numerische Schwierigkeitsbewertung hinzu (1-10)
        // Basis: Position im gesamten Level-Set
        const difficultyRating = Math.ceil((targetLevelNumber / 100) * 10);
        levelData.difficultyRating = difficultyRating;
        // Entferne die alte Schwierigkeitsangabe, falls vorhanden
        delete levelData.difficulty;
        delete levelData.absoluteLevelNumber;
        // Speichere die bearbeitete Datei im Zielordner
        fs.writeFileSync(targetFilePath, JSON.stringify(levelData, null, 2), 'utf8');
        return true;
    }
    catch (error) {
        console.error(`Fehler bei der Verarbeitung von ${sourceFilePath}:`, error.message);
        return false;
    }
}
// Hauptfunktion zum Ausführen der Konvertierung
async function convertLevels() {
    console.log('Starte Konvertierung der Levels...');
    let targetLevelNumber = 1;
    let successCount = 0;
    let errorCount = 0;
    // Verarbeite jeden Schwierigkeitsgrad
    for (const difficulty of difficulties) {
        console.log(`\nVerarbeite Schwierigkeitsgrad: ${difficulty}`);
        // Verarbeite jedes Level im aktuellen Schwierigkeitsgrad
        for (let levelNumber = 1; levelNumber <= levelsPerDifficulty; levelNumber++) {
            process.stdout.write(`Konvertiere Level ${levelNumber}/${levelsPerDifficulty} (${difficulty}) zu Level ${targetLevelNumber}/100... `);
            const success = await processLevel(difficulty, levelNumber, targetLevelNumber);
            if (success) {
                console.log('Erfolgreich');
                successCount++;
            }
            else {
                console.log('Fehlgeschlagen');
                errorCount++;
            }
            targetLevelNumber++;
        }
    }
    console.log(`\nKonvertierung abgeschlossen: ${successCount} Level erfolgreich, ${errorCount} fehlgeschlagen.`);
    // Wenn alle Level erfolgreich konvertiert wurden, ersetze die alten Ordner
    if (errorCount === 0) {
        // Backup der alten Schwierigkeitsgrade-Ordner erstellen
        console.log("\nErstelle Backup der alten Ordnerstruktur...");
        for (const difficulty of difficulties) {
            const difficultyPath = path.join(sourcePath, difficulty);
            const backupPath = path.join(sourcePath, `${difficulty}_backup`);
            if (fs.existsSync(difficultyPath)) {
                fs.renameSync(difficultyPath, backupPath);
                console.log(`Backup erstellt: ${backupPath}`);
            }
        }
        // Verschiebe die neuen Level-Dateien in das Hauptverzeichnis
        console.log("\nVerschiebe neue Level-Dateien...");
        const files = fs.readdirSync(tempFolderPath);
        for (const file of files) {
            const sourceFile = path.join(tempFolderPath, file);
            const targetFile = path.join(targetPath, file);
            fs.renameSync(sourceFile, targetFile);
        }
        // Entferne den temporären Ordner
        fs.rmdirSync(tempFolderPath);
        console.log("\nErfolgreich abgeschlossen! Die Level wurden im Ordner umstrukturiert.");
        console.log("Die alten Ordner wurden als *_backup gesichert.");
    }
    else {
        console.log("\nWARNUNG: Es gab Fehler während der Konvertierung.");
        console.log("Die temporären Dateien wurden im Ordner 'temp' belassen, damit Sie sie überprüfen können.");
    }
}
// Führe die Konvertierung aus
convertLevels().catch(error => {
    console.error('Fehler bei der Konvertierung:', error);
});
