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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Board = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_2 = require("@chakra-ui/react");
const icons_1 = require("@chakra-ui/icons");
const useGameState_1 = __importDefault(require("../../hooks/useGameState"));
const NumberPad_1 = __importDefault(require("../NumberPad/NumberPad"));
const GameLogic = __importStar(require("../../services/gameLogicService"));
const puzzleGeneratorService_1 = require("../../services/puzzleGeneratorService");
// Hilfsfunktion zum Abrufen des Käfigs für eine bestimmte Zelle
function getCageForCell(cages, row, col) {
    return GameLogic.getCageForCell(cages, row, col);
}
// Hilfsfunktion zum Prüfen, ob zwei Zellen im gleichen Käfig sind
function areCellsInSameCage(cages, row1, col1, row2, col2) {
    return GameLogic.areCellsInSameCage(cages, row1, col1, row2, col2);
}
// Hilfsfunktion, um das obere linke Feld eines Käfigs zu bestimmen
function findTopLeftCellInCage(cage) {
    if (!cage || !cage.cells || cage.cells.length === 0)
        return null;
    // Sortieren nach Zeile (primär) und Spalte (sekundär)
    const sortedCells = [...cage.cells].sort((a, b) => {
        if (a.row !== b.row) {
            return a.row - b.row;
        }
        return a.col - b.col;
    });
    return sortedCells[0];
}
const Board = ({ size = 9, puzzleId = 'default', levelData = null, isLoading: externalLoading = false, error: externalError = null }) => {
    const { gameState, isLoading: stateLoading, updateGameState } = (0, useGameState_1.default)(puzzleId);
    const [selectedCell, setSelectedCell] = (0, react_1.useState)(null);
    const [dragStart, setDragStart] = (0, react_1.useState)(null);
    const [selectedCells, setSelectedCells] = (0, react_1.useState)([]);
    const [isDragging, setIsDragging] = (0, react_1.useState)(false);
    const boardRef = (0, react_1.useRef)(null);
    const boardFocusRef = (0, react_1.useRef)(null);
    const [cellSize, setCellSize] = (0, react_1.useState)(50);
    const [cages, setCages] = (0, react_1.useState)([]);
    const [hasError, setHasError] = (0, react_1.useState)(false);
    // Responsive Design: Zellengrößen anpassen je nach Bildschirmgröße
    const cellSizeByBreakpoint = (0, react_2.useBreakpointValue)({
        base: 36,
        sm: 42,
        md: 48,
        lg: 66,
        xl: 72 // Großer Bildschirm (erhöht von 66)
    }) || 48;
    // Schriftgrößen für Zahlen und Summenwerte je nach Bildschirmgröße
    const valueFontSize = (0, react_2.useBreakpointValue)({
        base: "md",
        sm: "lg",
        md: "xl",
        lg: "xl"
    }) || "lg";
    const sumFontSize = (0, react_2.useBreakpointValue)({
        base: "2xs",
        sm: "xs",
        md: "xs",
        lg: "xs"
    }) || "xs";
    // Flex-Richtung für das Layout der Spielbrett- und Nummernpad-Container
    const flexDirection = (0, react_2.useBreakpointValue)({
        base: "column",
        lg: "row" // Nebeneinander ab großen Bildschirmen
    });
    // Lade Level-Daten in den State, wenn sie verfügbar sind
    (0, react_1.useEffect)(() => {
        if (levelData && levelData.cages) {
            console.log('Board: Level geladen:', levelData);
            setCages(levelData.cages);
            // Initialisiere sofort mit den initialValues, wenn Level-Daten vorliegen
            if (levelData.initialValues && gameState) {
                console.log('Board: initialValues verfügbar, setze direkt:', levelData.initialValues);
                // Direkte Aktualisierung, wenn sich levelId geändert hat oder wenn gameState.cellValues nur Nullen enthält
                const isEmptyBoard = gameState.cellValues.every(row => row.every(cell => cell === 0));
                const isDifferentLevel = gameState.levelId !== puzzleId;
                if (isDifferentLevel || isEmptyBoard) {
                    console.log('Board: Aktualisiere cellValues mit initialValues');
                    // Tiefe Kopie der initialValues erstellen und als cellValues setzen
                    const initialValuesCopy = JSON.parse(JSON.stringify(levelData.initialValues));
                    updateGameState({
                        cellValues: initialValuesCopy,
                        levelId: puzzleId
                    });
                }
            }
        }
        else if (!levelData && !externalLoading) {
            setHasError(true);
        }
        else {
            setHasError(false);
        }
    }, [levelData, puzzleId, externalLoading, gameState, updateGameState]);
    // Größe des Spielbretts dynamisch anpassen beim Mounten und bei Größenänderungen
    (0, react_1.useEffect)(() => {
        // Variablen zum Verfolgen der Stabilisierung der Größe
        let resizeAttempts = 0;
        const maxResizeAttempts = 3;
        let lastCellSize = cellSize;
        let stabilizationTimer;
        const handleResize = () => {
            if (boardRef.current) {
                // Verfügbaren Platz ermitteln - Berücksichtige den Container-Padding
                const boardBox = boardRef.current.getBoundingClientRect();
                const parentWidth = boardBox.width - 16; // Berücksichtige Innenpolsterung
                const parentHeight = boardBox.height - 16;
                // Berechne die maximal mögliche Zellengröße basierend auf der Breite und Höhe
                const maxByWidth = Math.floor(parentWidth / size);
                const maxByHeight = Math.floor(parentHeight / size);
                // Wähle den kleineren Wert, um sicherzustellen, dass das Brett ohne Scrollbars passt
                const maxCellSize = Math.min(maxByWidth, maxByHeight);
                // Begrenzen der Zellgröße auf ein sinnvolles Maximum/Minimum
                // Für mobile Geräte (schmale Bildschirme) verwenden wir eine kleinere Mindestgröße
                const isMobile = window.innerWidth < 768;
                const minSize = isMobile ? 24 : 28;
                // Berechnete optimale Größe, nicht größer als vom Breakpoint vorgegeben
                const optimalSize = Math.min(maxCellSize, cellSizeByBreakpoint);
                // Neue Zellgröße, mindestens minSize
                const newCellSize = Math.max(minSize, optimalSize);
                // Wenn wir einen stabilen Zustand erreicht haben oder die maximale Anzahl von Versuchen überschritten haben
                if (Math.abs(newCellSize - lastCellSize) < 2 || resizeAttempts >= maxResizeAttempts) {
                    // Nur aktualisieren, wenn eine wesentliche Änderung vorliegt
                    if (Math.abs(newCellSize - cellSize) >= 2) {
                        setCellSize(newCellSize);
                    }
                    // Tracking zurücksetzen für das nächste Resize-Event
                    resizeAttempts = 0;
                    clearTimeout(stabilizationTimer);
                    return;
                }
                // Verfolge die aktuelle Größe für den nächsten Vergleich
                lastCellSize = newCellSize;
                // Inkrementiere die Anzahl der Resize-Versuche
                resizeAttempts++;
                // Setze die aktuelle Größe
                setCellSize(newCellSize);
                // Nach einer kurzen Verzögerung erneut prüfen, ob die Größe stabil ist
                clearTimeout(stabilizationTimer);
                stabilizationTimer = setTimeout(handleResize, 50);
            }
        };
        // Initial-Verzögerung für das erste Rendering
        const initialDelayTimer = setTimeout(() => {
            handleResize();
            // Event-Listener für weitere Größenänderungen
            window.addEventListener('resize', () => {
                // Zurücksetzen des Stabilisierungs-Trackings bei einem neuen Resize-Event
                resizeAttempts = 0;
                clearTimeout(stabilizationTimer);
                handleResize();
            });
        }, 300); // Längere anfängliche Verzögerung, um sicherzustellen, dass das Layout fertig ist
        return () => {
            clearTimeout(initialDelayTimer);
            clearTimeout(stabilizationTimer);
            window.removeEventListener('resize', handleResize);
        };
    }, [size, cellSizeByBreakpoint]);
    const handleDragStart = (row, col) => {
        const cellPosition = { row, col };
        setSelectedCell(cellPosition);
        setDragStart(cellPosition);
        setSelectedCells([cellPosition]);
        setIsDragging(true);
    };
    const handleDragEnter = (row, col) => {
        if (!isDragging || !dragStart)
            return;
        const minRow = Math.min(dragStart.row, row);
        const maxRow = Math.max(dragStart.row, row);
        const minCol = Math.min(dragStart.col, col);
        const maxCol = Math.max(dragStart.col, col);
        const newSelectedCells = [];
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                newSelectedCells.push({ row: r, col: c });
            }
        }
        setSelectedCells(newSelectedCells);
    };
    const handleDragEnd = () => {
        setIsDragging(false);
        setDragStart(null);
    };
    const handleNumberSelect = (number) => {
        if (!gameState || !levelData)
            return;
        const newValues = gameState.cellValues.map((row) => [...row]);
        selectedCells.forEach(({ row, col }) => {
            // Überprüfen, ob die Zelle vorausgefüllt ist
            if (levelData.initialValues[row][col] === 0) {
                newValues[row][col] = number;
            }
        });
        updateGameState({
            cellValues: newValues
        });
    };
    const handleClear = () => {
        if (!gameState || !levelData)
            return;
        const newValues = gameState.cellValues.map((row) => [...row]);
        selectedCells.forEach(({ row, col }) => {
            // Überprüfen, ob die Zelle vorausgefüllt ist
            if (levelData.initialValues[row][col] === 0) {
                newValues[row][col] = 0;
            }
        });
        updateGameState({
            cellValues: newValues
        });
    };
    const isSameBlock = (row1, col1, row2, col2) => {
        return (Math.floor(row1 / 3) === Math.floor(row2 / 3) &&
            Math.floor(col1 / 3) === Math.floor(col2 / 3));
    };
    // Überprüft, ob eine Zelle gültig ist
    const isCellValid = (row, col, value) => {
        if (!gameState)
            return true;
        return GameLogic.isCellValid(gameState.cellValues, row, col, value, cages, size);
    };
    // Überprüft, ob ein Käfig vollständig und korrekt ist
    const isCageComplete = (cage) => {
        if (!gameState)
            return false;
        return GameLogic.isCageComplete(gameState.cellValues, cage);
    };
    // Überprüft, ob das gesamte Board vollständig und korrekt ist
    const isBoardComplete = () => {
        if (!gameState)
            return false;
        return GameLogic.isBoardComplete(gameState.cellValues, cages, size);
    };
    // Neuer Keyboard-Handler für die Tastatureingabe
    const handleKeyDown = (e) => {
        // Wenn keine Zelle ausgewählt ist, standardmäßig die erste Zelle auswählen
        if (!selectedCell && boardRef.current) {
            const newSelected = { row: 0, col: 0 };
            setSelectedCell(newSelected);
            setSelectedCells([newSelected]);
            return;
        }
        if (!selectedCell)
            return;
        // Navigation mit Pfeiltasten
        const { row, col } = selectedCell;
        const newSelectedCell = { ...selectedCell };
        if (e.key === 'ArrowUp' && row > 0) {
            newSelectedCell.row = row - 1;
        }
        else if (e.key === 'ArrowDown' && row < size - 1) {
            newSelectedCell.row = row + 1;
        }
        else if (e.key === 'ArrowLeft' && col > 0) {
            newSelectedCell.col = col - 1;
        }
        else if (e.key === 'ArrowRight' && col < size - 1) {
            newSelectedCell.col = col + 1;
        }
        // Tab-Navigation durch die Zellen (vorwärts und rückwärts)
        else if (e.key === 'Tab') {
            e.preventDefault(); // Verhindert den Standard-Tab-Fokus
            if (e.shiftKey) {
                // Rückwärts navigieren
                if (col > 0) {
                    newSelectedCell.col = col - 1;
                }
                else if (row > 0) {
                    newSelectedCell.row = row - 1;
                    newSelectedCell.col = size - 1;
                }
                else {
                    // Von der ersten Zelle zur letzten Zelle gehen
                    newSelectedCell.row = size - 1;
                    newSelectedCell.col = size - 1;
                }
            }
            else {
                // Vorwärts navigieren
                if (col < size - 1) {
                    newSelectedCell.col = col + 1;
                }
                else if (row < size - 1) {
                    newSelectedCell.row = row + 1;
                    newSelectedCell.col = 0;
                }
                else {
                    // Von der letzten Zelle zur ersten Zelle gehen
                    newSelectedCell.row = 0;
                    newSelectedCell.col = 0;
                }
            }
        }
        // Zahlen 1-9 für die Eingabe
        else if (/^[1-9]$/.test(e.key) && gameState && levelData) {
            const num = parseInt(e.key, 10);
            const newValues = gameState.cellValues.map((row) => [...row]);
            // Nur die aktuell ausgewählten Zellen aktualisieren, wenn sie nicht vorausgefüllt sind
            selectedCells.forEach(cell => {
                if (levelData.initialValues[cell.row][cell.col] === 0) {
                    newValues[cell.row][cell.col] = num;
                }
            });
            updateGameState({
                cellValues: newValues
            });
            return;
        }
        // Entfernen/Löschen mit Backspace, Delete oder 0
        else if (['Backspace', 'Delete', '0'].includes(e.key) && gameState && levelData) {
            const newValues = gameState.cellValues.map((row) => [...row]);
            // Nur die aktuell ausgewählten Zellen löschen, wenn sie nicht vorausgefüllt sind
            selectedCells.forEach(cell => {
                if (levelData.initialValues[cell.row][cell.col] === 0) {
                    newValues[cell.row][cell.col] = 0;
                }
            });
            updateGameState({
                cellValues: newValues
            });
            return;
        }
        // Mehrere Zellen mit Shift + Pfeiltasten auswählen
        else if (e.shiftKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            if (!dragStart) {
                setDragStart(selectedCell);
            }
            // Bestimmung des Bereichs basierend auf Startpunkt und aktuellem Punkt
            const startRow = dragStart ? dragStart.row : selectedCell.row;
            const startCol = dragStart ? dragStart.col : selectedCell.col;
            const endRow = newSelectedCell.row;
            const endCol = newSelectedCell.col;
            const minRow = Math.min(startRow, endRow);
            const maxRow = Math.max(startRow, endRow);
            const minCol = Math.min(startCol, endCol);
            const maxCol = Math.max(startCol, endCol);
            // Alle Zellen im Bereich auswählen
            const newSelectedCells = [];
            for (let r = minRow; r <= maxRow; r++) {
                for (let c = minCol; c <= maxCol; c++) {
                    newSelectedCells.push({ row: r, col: c });
                }
            }
            setSelectedCells(newSelectedCells);
        }
        // Aktualisieren der ausgewählten Zelle, wenn sie sich geändert hat
        if (newSelectedCell.row !== row || newSelectedCell.col !== col) {
            setSelectedCell(newSelectedCell);
            // Wenn keine Mehrfachauswahl aktiv ist (kein Shift gedrückt)
            if (!e.shiftKey) {
                setSelectedCells([newSelectedCell]);
                setDragStart(null);
            }
        }
    };
    // Focus-Management für Tastatureingabe
    (0, react_1.useEffect)(() => {
        // Keyboard-Fokus bekommen, wenn eine Zelle ausgewählt ist
        if (selectedCell && boardFocusRef.current) {
            boardFocusRef.current.focus();
        }
    }, [selectedCell]);
    // Handler für Reset-Button
    const handleReset = () => {
        if (!gameState)
            return;
        // Alle Zellen auf 0 setzen, konsistent createEmptyBoard verwenden
        const emptyValues = (0, puzzleGeneratorService_1.createEmptyBoard)(size);
        updateGameState({
            cellValues: emptyValues
        });
        // Auswahl zurücksetzen
        setSelectedCell(null);
        setSelectedCells([]);
    };
    const renderCell = (row, col) => {
        if (!gameState || !levelData)
            return null;
        const isSelected = selectedCells.some((cell) => cell.row === row && cell.col === col);
        const isSameRow = selectedCell && selectedCell.row === row;
        const isSameCol = selectedCell && selectedCell.col === col;
        const isSameBlk = selectedCell && isSameBlock(selectedCell.row, selectedCell.col, row, col);
        const cage = getCageForCell(cages, row, col);
        // Korrekte Bestimmung des Startzellen-Käfigs (oberste, linkeste Zelle)
        const topLeftCell = cage ? findTopLeftCellInCage(cage) : null;
        const isCageStart = topLeftCell && topLeftCell.row === row && topLeftCell.col === col;
        const value = gameState.cellValues[row][col];
        const valid = isCellValid(row, col, value);
        const isInitialValue = levelData.initialValues[row][col] !== 0;
        // Käfig-Status für verbesserte visuelle Rückmeldung
        const cageComplete = cage ? isCageComplete(cage) : false;
        // Überprüfen, ob benachbarte Zellen zum selben Käfig gehören
        const hasTopSameCage = row > 0 && areCellsInSameCage(cages, row, col, row - 1, col);
        const hasLeftSameCage = col > 0 && areCellsInSameCage(cages, row, col, row, col - 1);
        const hasRightSameCage = col < size - 1 && areCellsInSameCage(cages, row, col, row, col + 1);
        const hasBottomSameCage = row < size - 1 && areCellsInSameCage(cages, row, col, row + 1, col);
        // Dynamische Hintergrundfarbe basierend auf verschiedenen Zuständen
        let bgColor = "white";
        if (isSelected && !isInitialValue) {
            bgColor = "blue.100";
        }
        else if (value && !valid) {
            bgColor = "red.100";
        }
        else if (cage) {
            bgColor = cage.color; // Immer die normale Käfigfarbe verwenden
        }
        else if ((isSameRow || isSameCol || isSameBlk) && !isInitialValue) {
            bgColor = "blue.50";
        }
        // Wertfarbe basierend auf verschiedenen Zuständen
        // Vorausgefüllte Zahlen immer in Schwarz anzeigen, aber Hintergrundfarbe beibehalten
        let valueColor = isInitialValue ? "black" : "blue.700";
        if (!valid && value !== 0 && !isInitialValue) {
            valueColor = "red.600";
        }
        else if (cageComplete && cage) {
            valueColor = "green.700";
        }
        return ((0, jsx_runtime_1.jsxs)(react_2.Box, { position: "relative", w: `${cellSize}px`, h: `${cellSize}px`, border: "1px solid rgba(0,0,0,0.2)", borderRight: col % 3 === 2 ? "2px solid rgba(0,0,0,0.4)" : "1px solid rgba(0,0,0,0.2)", borderBottom: row % 3 === 2 ? "2px solid rgba(0,0,0,0.4)" : "1px solid rgba(0,0,0,0.2)", bg: bgColor, onMouseDown: () => !isInitialValue && handleDragStart(row, col), onMouseEnter: () => handleDragEnter(row, col), onMouseUp: handleDragEnd, onTouchStart: () => !isInitialValue && handleDragStart(row, col), onTouchMove: (e) => {
                if (!isInitialValue && boardRef.current && e.touches.length > 0) {
                    const touch = e.touches[0];
                    const boardRect = boardRef.current.getBoundingClientRect();
                    const touchX = touch.clientX - boardRect.left;
                    const touchY = touch.clientY - boardRect.top;
                    const touchCol = Math.floor(touchX / cellSize);
                    const touchRow = Math.floor(touchY / cellSize);
                    if (touchRow >= 0 && touchRow < size && touchCol >= 0 && touchCol < size &&
                        (selectedCell?.row !== touchRow || selectedCell?.col !== touchCol)) {
                        handleDragEnter(touchRow, touchCol);
                    }
                }
            }, onTouchEnd: handleDragEnd, cursor: isInitialValue ? "default" : "pointer", _hover: isInitialValue ? undefined : { bg: "blue.50" }, children: [cage && ((0, jsx_runtime_1.jsx)(react_2.Box, { position: "absolute", top: "3px", left: "3px", right: "3px", bottom: "3px", border: "1px dashed rgba(0,0,0,0.7)", borderTop: hasTopSameCage ? "none" : undefined, borderLeft: hasLeftSameCage ? "none" : undefined, borderRight: hasRightSameCage ? "none" : undefined, borderBottom: hasBottomSameCage ? "none" : undefined, pointerEvents: "none", bg: undefined, transition: "background-color 0.3s" })), isCageStart && cage && ((0, jsx_runtime_1.jsx)(react_2.Text, { position: "absolute", top: "3px", left: "3px", fontSize: sumFontSize, fontWeight: "bold", color: cageComplete ? "green.600" : "gray.700", zIndex: "1", children: cage.sum })), (0, jsx_runtime_1.jsx)(react_2.Text, { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: valueFontSize, fontWeight: isInitialValue ? "bold" : "medium", color: cageComplete ? "green.600" : (isInitialValue ? "black" : "blue.700"), userSelect: "none", transition: "color 0.3s", children: value || '' })] }, `${row}-${col}`));
    };
    const renderGrid = () => {
        if (!gameState)
            return null;
        const grid = [];
        for (let i = 0; i < size; i++) {
            const row = [];
            for (let j = 0; j < size; j++) {
                row.push(renderCell(i, j));
            }
            grid.push((0, jsx_runtime_1.jsx)(react_2.Grid, { templateColumns: `repeat(${size}, 1fr)`, children: row }, i));
        }
        return grid;
    };
    // Kombinierte Ladeanzeige für den internen und externen Ladezustand
    const isLoadingCombined = stateLoading || externalLoading;
    // Fehleranzeige wenn kein Level geladen werden konnte
    if (externalError || hasError) {
        return ((0, jsx_runtime_1.jsxs)(react_2.Alert, { status: "error", borderRadius: "md", children: [(0, jsx_runtime_1.jsx)(react_2.AlertIcon, {}), (0, jsx_runtime_1.jsxs)(react_2.Box, { children: [(0, jsx_runtime_1.jsx)(react_2.AlertTitle, { children: "Fehler beim Laden des Levels" }), (0, jsx_runtime_1.jsx)(react_2.AlertDescription, { children: externalError || "Das Level konnte nicht geladen werden. Bitte versuchen Sie ein anderes Level." })] })] }));
    }
    if (isLoadingCombined) {
        return ((0, jsx_runtime_1.jsx)(react_2.Box, { display: "flex", justifyContent: "center", alignItems: "center", h: "200px", children: (0, jsx_runtime_1.jsx)(react_2.Spinner, { size: "xl", color: "teal.500" }) }));
    }
    // Prüfen, ob ein Level geladen ist
    if (!cages || cages.length === 0) {
        return ((0, jsx_runtime_1.jsxs)(react_2.Alert, { status: "info", borderRadius: "md", children: [(0, jsx_runtime_1.jsx)(react_2.AlertIcon, {}), (0, jsx_runtime_1.jsxs)(react_2.Box, { children: [(0, jsx_runtime_1.jsx)(react_2.AlertTitle, { children: "Kein Level geladen" }), (0, jsx_runtime_1.jsx)(react_2.AlertDescription, { children: "Bitte w\u00E4hlen Sie ein Level aus dem Level-Selektor." })] })] }));
    }
    return ((0, jsx_runtime_1.jsxs)(react_2.Flex, { direction: flexDirection, gap: 4, justify: "center", align: flexDirection === "column" ? "center" : "start", flexWrap: "wrap", w: "100%", minH: "70vh", children: [(0, jsx_runtime_1.jsxs)(react_2.Box, { ref: (el) => {
                    boardRef.current = el;
                    boardFocusRef.current = el;
                }, p: [1, 2, 4], display: "flex", justifyContent: "center", alignItems: "center", boxShadow: "lg", borderRadius: "lg", bg: "white", position: "relative", flexGrow: 1, maxW: flexDirection === "column" ? "95%" : "70%", h: ["auto", "auto", "65vh"], overflowX: "hidden", overflowY: "hidden", tabIndex: 0, onKeyDown: handleKeyDown, _focus: {
                    outline: "3px dashed teal.500",
                    outlineOffset: "4px"
                }, children: [(0, jsx_runtime_1.jsx)(react_2.Box, { children: renderGrid() }), gameState && isBoardComplete() && ((0, jsx_runtime_1.jsx)(react_2.Box, { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", bg: "green.100", border: "2px solid green.500", borderRadius: "md", p: 4, textAlign: "center", boxShadow: "xl", zIndex: 10, children: (0, jsx_runtime_1.jsx)(react_2.Text, { fontSize: "xl", fontWeight: "bold", color: "green.600", children: "Gratulation! Das R\u00E4tsel ist gel\u00F6st!" }) }))] }), (0, jsx_runtime_1.jsxs)(react_2.Box, { p: 2, alignSelf: flexDirection === "column" ? "center" : "start", mt: flexDirection === "column" ? 4 : 0, pt: flexDirection === "row" ? "16px" : 2, width: flexDirection === "column" ? "100%" : "auto", display: "flex", flexDirection: "column", alignItems: flexDirection === "column" ? "center" : "start", children: [(0, jsx_runtime_1.jsx)(NumberPad_1.default, { onNumberSelect: handleNumberSelect, onClear: handleClear, disabledNumbers: [] }), (0, jsx_runtime_1.jsx)(react_2.Stack, { direction: "row", gap: 4, mt: 4, justify: flexDirection === "column" ? "center" : "start", width: "100%", children: (0, jsx_runtime_1.jsxs)(react_2.Button, { colorScheme: "teal", onClick: handleReset, children: [(0, jsx_runtime_1.jsx)(icons_1.RepeatIcon, { mr: 2 }), " Reset"] }) })] })] }));
};
exports.Board = Board;
exports.default = exports.Board;
