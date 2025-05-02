import { ChakraProvider, Box, Container, Heading } from '@chakra-ui/react';
import './App.css';
import Board from './components/Board/Board';

function App() {
  return (
    <ChakraProvider>
      <Box as="header" bg="teal.500" py={4} mb={8}>
        <Heading as="h1" textAlign="center" color="white">
          Killer Sudoku
        </Heading>
      </Box>
      
      <Container maxW="container.lg">
        <Box>
          <Board />
        </Box>
      </Container>
    </ChakraProvider>
  );
}

export default App;
