import { useState, useEffect, useRef } from 'react';
import { saveGameState, loadGameState } from '../services/storageService';
import { GameState as GlobalGameState, GameLevel } from '../types/gameTypes';
import { loadLevelByNumber } from '../services/levelService';

// Lokale Erweiterung des GameState-Interfaces mit zusätzlichen Eigenschaften für den Hook
interface GameState extends GlobalGameState {
  startTime: number;
  elapsedTime: number;
  hintsUsed: number;
}

export const useGameState = (puzzleId: string) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Ref zum Verfolgen der letzten Speicheroperation
  const saveOperationRef = useRef<Promise<void>>(Promise.resolve());
  // Ref zum Verfolgen der aktuellen puzzleId
  const currentPuzzleIdRef = useRef<string>(puzzleId);
  const gameStateRef = useRef<GameState | null>(null);
  const lastAutoSaveRef = useRef<number>(0);

  useEffect(() => {
    // Aktualisiere die aktuelle puzzleId Referenz
    currentPuzzleIdRef.current = puzzleId;
    console.log('useGameState: Lade Spielstand für puzzleId:', puzzleId);
    
    const loadState = async () => {
      try {
        setIsLoading(true);
        
        // Warte auf die Fertigstellung der letzten Speicheroperation, bevor ein neuer Zustand geladen wird
        await saveOperationRef.current;
        
        const savedState = await loadGameState(puzzleId);
        console.log('useGameState: Geladener Spielstand:', savedState);
        
        if (savedState) {
          // Nur setzen, wenn die puzzleId noch aktuell ist (um Race-Conditions zu vermeiden)
          if (currentPuzzleIdRef.current === puzzleId) {
            console.log('useGameState: Setze vorhandenen Spielstand');
            setGameState(savedState as GameState);
          }
        } else {
          // Initialisiere einen neuen Spielstand, versuche Level-Daten zu laden
          if (currentPuzzleIdRef.current === puzzleId) {
            // Versuche die Level-Nummer aus der puzzleId zu extrahieren (Format: "level-X")
            const levelMatch = puzzleId.match(/level-(\d+)/);
            console.log('useGameState: Level-Match:', levelMatch);
            
            if (levelMatch && levelMatch[1]) {
              try {
                const levelNumber = parseInt(levelMatch[1], 10);
                console.log('useGameState: Lade Level:', levelNumber);
                const levelData = await loadLevelByNumber(levelNumber);
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
                } else {
                  console.log('useGameState: Keine initialValues gefunden, erstelle leeren Spielstand');
                  createEmptyGameState();
                }
              } catch (error) {
                console.error('Fehler beim Laden der Level-Daten:', error);
                createEmptyGameState();
              }
            } else {
              console.log('useGameState: Kein Level-Match, erstelle leeren Spielstand');
              createEmptyGameState();
            }
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden des Spielstands:', error);
        if (currentPuzzleIdRef.current === puzzleId) {
          createEmptyGameState();
        }
      } finally {
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

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (!gameState || gameState.solved) return;

    const tick = () => {
      const currentState = gameStateRef.current;
      if (!currentState) return;

      const now = Date.now();
      const startTime = currentState.startTime || now;
      const elapsedTime = Math.max(0, now - startTime);

      if (elapsedTime === currentState.elapsedTime) return;

      const updatedState = {
        ...currentState,
        elapsedTime
      };

      setGameState(updatedState);
      gameStateRef.current = updatedState;

      if (now - lastAutoSaveRef.current >= 15000) {
        lastAutoSaveRef.current = now;
        const targetPuzzleId = currentPuzzleIdRef.current;

        const saveOperation = (async () => {
          try {
            await saveOperationRef.current;
            if (targetPuzzleId === currentPuzzleIdRef.current) {
              await saveGameState(targetPuzzleId, updatedState);
            }
          } catch (error) {
            console.error('Fehler beim automatischen Speichern:', error);
          }
        })();

        saveOperationRef.current = saveOperation;
      }
    };

    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [gameState]);

  const updateGameState = async (newState: Partial<GameState>) => {
    if (!gameState) return;

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
          await saveGameState(targetPuzzleId, updatedState);
        }
      } catch (error) {
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

export default useGameState;
