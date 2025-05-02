import { ChakraProvider, Box, Container, Heading, Text, extendTheme } from '@chakra-ui/react';
import './App.css';
import Board from './components/Board/Board';

const theme = extendTheme({
  styles: {
    global: {
      body: {
        fontSize: '1rem',
        lineHeight: 1.6,
      },
      p: {
        maxWidth: '38rem',
        marginLeft: 'auto',
        marginRight: 'auto',
      }
    }
  },
  fonts: {
    body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    heading: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif"
  },
  fontSizes: {
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem"
  },
  lineHeights: {
    normal: "1.6"
  }
});

function App() {
  return (
    <ChakraProvider theme={theme}>
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