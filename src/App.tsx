import { useState, useEffect } from 'react';
import { ChakraProvider, Box, Container, Heading, Text, extendTheme, VStack, Flex, useBreakpointValue, useColorModeValue } from '@chakra-ui/react';
import './App.css';
import Board from './components/Board/Board';
import LevelSelector from './components/LevelSelector/LevelSelector';
import { loadLevelByNumber, TOTAL_LEVELS } from './services/levelService';
import { GameLevel } from './types/gameTypes';

// Android-inspiriertes Theme
const theme = extendTheme({
  styles: {
    global: {
      body: {
        fontSize: '1rem',
        lineHeight: 1.6,
        bg: '#f5f5f5', // Typischer Android-Hintergrund
      },
      p: {
        maxWidth: '38rem',
        marginLeft: 'auto',
        marginRight: 'auto',
      }
    }
  },
  fonts: {
    body: "Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    heading: "Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  colors: {
    android: {
      primary: "#1976D2",    // Material Design Blue
      primaryDark: "#1565C0",
      accent: "#FF4081",     // Material Design Pink
      background: "#f5f5f5", // Material Design Grey 100
      surface: "#ffffff",
      text: "#212121",       // Material Design Grey 900
      secondaryText: "#757575" // Material Design Grey 600
    }
  }
});

function App() {
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [levelData, setLevelData] = useState<GameLevel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Responsive Layout-Einstellungen
  const headerHeight = useBreakpointValue({ base: "56px", md: "64px" });
  const containerMaxWidth = useBreakpointValue({ base: "100%", xl: "container.xl" });
  const showInstructions = useBreakpointValue({ base: true, lg: false });
  const statusBarBg = useColorModeValue("android.primaryDark", "gray.900");
  const headerBg = useColorModeValue("android.primary", "gray.800");

  // Lädt das aktuelle Level basierend auf der Level-Nummer
  useEffect(() => {
    const fetchLevel = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const level = await loadLevelByNumber(currentLevel);
        setLevelData(level);
      } catch (err) {
        console.error('Fehler beim Laden des Levels:', err);
        setError(`Level ${currentLevel} konnte nicht geladen werden. Bitte versuchen Sie es mit einem anderen Level.`);
        setLevelData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLevel();
  }, [currentLevel]);

  const handleLevelChange = (level: number) => {
    setCurrentLevel(level);
  };

  return (
    <ChakraProvider theme={theme}>
      {/* Android Status Bar */}
      <Box 
        bg={statusBarBg} 
        h="24px" 
        position="fixed" 
        top={0} 
        left={0} 
        right={0} 
        zIndex={1000}
      />
      
      {/* Android App Bar */}
      <Box 
        as="header" 
        bg={headerBg}
        py={0}
        position="fixed"
        top="24px"
        left={0}
        right={0}
        height={headerHeight}
        boxShadow="0 2px 4px rgba(0,0,0,0.2)"
        zIndex={999}
      >
        <Container maxW={containerMaxWidth} h="100%" px={2}>
          <Flex 
            direction="row"
            align="center"
            justify="space-between"
            h="100%"
            gap={2}
          >
            <Heading 
              as="h1" 
              color="white" 
              fontSize={{ base: "20px", md: "22px" }}
              fontWeight="500"
            >
              Killer Sudoku
            </Heading>
            
            <Box>
              <LevelSelector 
                currentLevel={currentLevel} 
                onLevelChange={handleLevelChange}
              />
            </Box>
          </Flex>
        </Container>
      </Box>
      
      {/* Main Content mit Padding für Header */}
      <Box 
        pt={{ base: "80px", md: "88px" }} // Status Bar + Header Height
        pb={4}
        minH="100vh"
        bg="android.background"
      >
        <Container 
          maxW={containerMaxWidth} 
          px={2}
          mx="auto"
          w="100%"
        >
          <Box 
            className="game-container" 
            mb={4}
            bg="android.surface"
            borderRadius="md"
            overflow="hidden"
          >
            <Board 
              puzzleId={`level-${currentLevel}`}
              levelData={levelData}
              isLoading={isLoading}
              error={error}
            />
          </Box>
          
          {showInstructions && (
            <Box 
              className="content-container" 
              mt={4}
              bg="android.surface"
              p={4}
              borderRadius="md"
            >
              <Heading as="h2" size="lg" mb={4} color="android.text">
                Spielanleitung
              </Heading>
              <Text className="readable-text" mb={4} color="android.secondaryText">
                Killer Sudoku kombiniert klassisches Sudoku mit mathematischen Herausforderungen. 
                Zusätzlich zu den bekannten Sudoku-Regeln müssen auch die vorgegebenen Summen in 
                jedem "Käfig" erreicht werden.
              </Text>
              <Text className="readable-text" color="android.secondaryText">
                Wie bei normalem Sudoku müssen Sie jede Zahl von 1-9 in jeder Zeile, Spalte und 
                3x3-Region genau einmal platzieren. Darüber hinaus müssen die Zahlen in jedem farbigen 
                Käfig (durch gestrichelte Linien angezeigt) die angegebene Summe ergeben. 
                Innerhalb eines Käfigs darf keine Zahl wiederholt werden.
              </Text>
            </Box>
          )}
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default App;