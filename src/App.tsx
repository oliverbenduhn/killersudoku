import { ChakraProvider, Box, Container, Heading, Text, createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';
import './App.css';
import Board from './components/Board/Board';

// Erstellen eines erweiterten Themes für Chakra UI mit typografischen Anpassungen
const config = defineConfig({
  // Globale CSS-Stile werden jetzt mit globalCss definiert
  globalCss: {
    body: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    p: {
      maxWidth: '38rem',
      marginLeft: 'auto',
      marginRight: 'auto',
    }
  },
  // Typographie-Token für das Theme definieren
  theme: {
    tokens: {
      fonts: {
        body: { value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" },
        heading: { value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" }
      },
      fontSizes: {
        base: { value: "1rem" },
        lg: { value: "1.125rem" },
        xl: { value: "1.25rem" }
      },
      lineHeights: {
        normal: { value: "1.6" }
      }
    }
  }
});

// System mit Standard- und eigener Konfiguration erstellen
const system = createSystem(defaultConfig, config);

function App() {
  return (
    <ChakraProvider value={system}>
      <Box as="header" bg="teal.500" py={4} mb={8}>
        <Heading as="h1" textAlign="center" color="white">
          Killer Sudoku
        </Heading>
      </Box>
      
      <Container maxW="container.lg">
        <Box className="game-container">
          <Board />
        </Box>
        
        {/* Beispieltext mit optimaler Zeilenlänge */}
        <Box className="content-container" mt={8}>
          <Heading as="h2" size="lg" mb={4}>Spielanleitung</Heading>
          <Text className="readable-text" mb={4}>
            Killer Sudoku kombiniert klassisches Sudoku mit mathematischen Herausforderungen. 
            Zusätzlich zu den bekannten Sudoku-Regeln müssen auch die vorgegebenen Summen in 
            jedem "Käfig" erreicht werden.
          </Text>
          <Text className="readable-text">
            Wie bei normalem Sudoku müssen Sie jede Zahl von 1-9 in jeder Zeile, Spalte und 
            3x3-Region genau einmal platzieren. Darüber hinaus müssen die Zahlen in jedem farbigen 
            Käfig (durch gestrichelte Linien angezeigt) die angegebene Summe ergeben. 
            Innerhalb eines Käfigs darf keine Zahl wiederholt werden.
          </Text>
        </Box>
      </Container>
    </ChakraProvider>
  );
}

export default App;