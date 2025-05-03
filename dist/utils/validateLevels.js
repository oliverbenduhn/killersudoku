#!/usr/bin/env node
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
const levelValidator_1 = require("./levelValidator");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
console.log('\n🔍 Killer Sudoku Level-Validator');
console.log('===============================\n');
const report = (0, levelValidator_1.validateAllLevels)();
// Farb-Definitionen für die Konsolenausgabe
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    white: '\x1b[37m',
    bold: '\x1b[1m'
};
// Extrahiere Levelnummer aus dem Dateinamen
const getLevelNumber = (levelId) => {
    const levelsDir = path.join(__dirname, '../../public/assets/levels');
    const files = fs.readdirSync(levelsDir)
        .filter(file => file.startsWith('level_') && file.endsWith('.json'));
    for (const file of files) {
        const levelPath = path.join(levelsDir, file);
        const levelContent = fs.readFileSync(levelPath, 'utf-8');
        const level = JSON.parse(levelContent);
        if (level.id === levelId) {
            // Extract level number from filename (e.g., "level_42.json" -> 42)
            const match = file.match(/level_(\d+)\.json/);
            if (match && match[1]) {
                return parseInt(match[1], 10);
            }
        }
    }
    return null;
};
// Detaillierte Fehlerausgabe
if (report.totalErrors > 0) {
    console.log(`${colors.red}${colors.bold}❌ Fehler gefunden!${colors.reset}\n`);
    // Gruppiere Fehler nach Typ
    const errorsByType = new Map();
    report.results
        .filter(result => !result.valid)
        .forEach(result => {
        result.errors.forEach(error => {
            errorsByType.set(error.errorType, (errorsByType.get(error.errorType) || 0) + 1);
        });
    });
    console.log('Fehlerübersicht:');
    console.log('---------------');
    errorsByType.forEach((count, type) => {
        console.log(`${colors.yellow}${type}:${colors.reset} ${count}x`);
    });
    console.log('\nDetails zu den Fehlern:');
    console.log('-----------------------------');
    for (const result of report.results) {
        if (!result.valid) {
            for (const error of result.errors) {
                const levelNumber = getLevelNumber(result.levelId);
                console.log(`\n${colors.blue}Level ${levelNumber !== null ? levelNumber : result.levelId}:${colors.reset}`);
                console.log(`Typ: ${colors.yellow}${error.errorType}${colors.reset}`);
                console.log(`Nachricht: ${error.message}`);
                if (error.errorType === 'OVERLAPPING_CAGES' && error.details && error.details.overlappingCoordinates) {
                    console.log('Überlappende Zellen:');
                    error.details.overlappingCoordinates.forEach((coord) => {
                        console.log(`  Zeile ${coord.row + 1}, Spalte ${coord.col + 1} - Käfig-IDs: ${coord.cageIds.join(', ')}`);
                    });
                }
                else if (error.details) {
                    console.log('Details:', JSON.stringify(error.details, null, 2));
                }
            }
        }
    }
    console.log(`\n${colors.red}${colors.bold}Validierung fehlgeschlagen!${colors.reset}`);
    console.log(`Gefundene Fehler: ${report.totalErrors}`);
    process.exit(1);
}
else {
    console.log(`${colors.green}${colors.bold}✓ Alle Level sind gültig!${colors.reset}`);
    console.log(`\nGeprüfte Level: ${report.totalLevels}`);
}
console.log(`\nEin detaillierter Bericht wurde in logs/validation-report.json gespeichert.`);
