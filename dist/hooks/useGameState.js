"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGameState = void 0;
const react_1 = require("react");
const storageService_1 = require("../services/storageService");
const levelService_1 = require("../services/levelService");
const useGameState = (puzzleId) => {
    const [gameState, setGameState] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    // Ref zum Verfolgen der letzten Speicheroperation
    const saveOperationRef = (0, react_1.useRef)(Promise.resolve());
    // Ref zum Verfolgen der aktuellen puzzleId
    const currentPuzzleIdRef = (0, react_1.useRef)(puzzleId);
    (0, react_1.useEffect)(() => {
        // Aktualisiere die aktuelle puzzleId Referenz
        currentPuzzleIdRef.current = puzzleId;
        console.log('useGameState: Lade Spielstand für puzzleId:', puzzleId);
        const loadState = async () => {
            try {
                setIsLoading(true);
                // Warte auf die Fertigstellung der letzten Speicheroperation, bevor ein neuer Zustand geladen wird
                await saveOperationRef.current;
                const savedState = await (0, storageService_1.loadGameState)(puzzleId);
                console.log('useGameState: Geladener Spielstand:', savedState);
                if (savedState) {
                    // Nur setzen, wenn die puzzleId noch aktuell ist (um Race-Conditions zu vermeiden)
                    if (currentPuzzleIdRef.current === puzzleId) {
                        console.log('useGameState: Setze vorhandenen Spielstand');
                        setGameState(savedState);
                    }
                }
                else {
                    // Initialisiere einen neuen Spielstand, versuche Level-Daten zu laden
                    if (currentPuzzleIdRef.current === puzzleId) {
                        // Versuche die Level-Nummer aus der puzzleId zu extrahieren (Format: "level-X")
                        const levelMatch = puzzleId.match(/level-(\d+)/);
                        console.log('useGameState: Level-Match:', levelMatch);
                        if (levelMatch && levelMatch[1]) {
                            try {
                                const levelNumber = parseInt(levelMatch[1], 10);
                                console.log('useGameState: Lade Level:', levelNumber);
                                const levelData = await (0, levelService_1.loadLevelByNumber)(levelNumber);
                                console.log('useGameState: Geladene Level-Daten:', levelData);
                                if (levelData && levelData.initialValues) {
                                    console.log('useGameState: Gefundene initialValues:', levelData.initialValues);
                                    // Wenn Level-Daten gefunden wurden, verwende die initialValues
                                    const newGameState = {
                                        id: `game_${puzzleId}_${Date.now()}`,
                                        cellValues: JSON.parse(JSON.stringify(levelData.initialValues)),
                                        startTime: Date.now(),
                                        elapsedTime: 0,
                                        difficulty: 'normal',
                                        hintsUsed: 0,
                                        levelId: puzzleId
                                    };
                                    console.log('useGameState: Neuer Spielstand mit initialValues:', newGameState);
                                    setGameState(newGameState);
                                }
                                else {
                                    console.log('useGameState: Keine initialValues gefunden, erstelle leeren Spielstand');
                                    createEmptyGameState();
                                }
                            }
                            catch (error) {
                                console.error('Fehler beim Laden der Level-Daten:', error);
                                createEmptyGameState();
                            }
                        }
                        else {
                            console.log('useGameState: Kein Level-Match, erstelle leeren Spielstand');
                            createEmptyGameState();
                        }
                    }
                }
            }
            catch (error) {
                console.error('Fehler beim Laden des Spielstands:', error);
                if (currentPuzzleIdRef.current === puzzleId) {
                    createEmptyGameState();
                }
            }
            finally {
                if (currentPuzzleIdRef.current === puzzleId) {
                    setIsLoading(false);
                }
            }
        };
        // Hilfsfunktion zum Erstellen eines leeren Spielstands
        const createEmptyGameState = () => {
            const emptyState = {
                id: `game_${puzzleId}_${Date.now()}`,
                cellValues: Array(9).fill(null).map(() => Array(9).fill(0)),
                startTime: Date.now(),
                elapsedTime: 0,
                difficulty: 'normal',
                hintsUsed: 0,
                levelId: puzzleId
            };
            console.log('useGameState: Erstelle leeren Spielstand:', emptyState);
            setGameState(emptyState);
        };
        loadState();
    }, [puzzleId]);
    const updateGameState = async (newState) => {
        if (!gameState)
            return;
        const updatedState = {
            ...gameState,
            ...newState
        };
        console.log('useGameState: Aktualisiere Spielstand:', updatedState);
        setGameState(updatedState);
        // Erstelle ein neues Speicherversprechen und speichere es in der Ref
        const saveOperation = (async () => {
            try {
                // Speichere die aktuelle puzzleId für die Validierung vor dem Speichern
                const targetPuzzleId = currentPuzzleIdRef.current;
                // Warte auf die Fertigstellung des vorherigen Speichervorgangs
                await saveOperationRef.current;
                // Vermeide das Speichern, wenn wir bereits zu einem anderen Level gewechselt haben
                if (targetPuzzleId === currentPuzzleIdRef.current) {
                    console.log('useGameState: Speichere Spielstand für:', targetPuzzleId);
                    await (0, storageService_1.saveGameState)(targetPuzzleId, updatedState);
                }
            }
            catch (error) {
                console.error('Fehler beim Speichern des Spielstands:', error);
            }
        })();
        // Aktualisiere die Ref mit dem neuen Speicherversprechen
        saveOperationRef.current = saveOperation;
        return saveOperation;
    };
    return {
        gameState,
        isLoading,
        updateGameState
    };
};
exports.useGameState = useGameState;
exports.default = exports.useGameState;
