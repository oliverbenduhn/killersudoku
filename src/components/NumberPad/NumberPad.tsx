import React from 'react';
import { Grid, Button } from '@chakra-ui/react';

interface NumberPadProps {
  onNumberSelect: (number: number) => void;
  onClear: () => void;
  disabledNumbers?: number[];
}

export const NumberPad: React.FC<NumberPadProps> = ({ 
  onNumberSelect, 
  onClear,
  disabledNumbers = [] 
}) => {
  // Dunklere Farben für die Buttons
  const buttonBg = 'gray.600';
  const buttonHoverBg = 'gray.700';

  return (
    <Grid templateColumns="repeat(3, 1fr)" gap={3} width="240px">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
        <Button
          key={number}
          onClick={() => onNumberSelect(number)}
          bg={buttonBg}
          color="white"
          size="lg"
          height="60px"
          fontSize="2xl"
          fontWeight="bold"
          _hover={{ bg: buttonHoverBg }}
          _active={{ bg: 'gray.800' }}
          disabled={disabledNumbers.includes(number)}
        >
          {number}
        </Button>
      ))}
      <Button
        gridColumn="1 / span 3"
        onClick={onClear}
        colorScheme="red"
        variant="solid"
        size="lg"
        height="50px"
        fontSize="lg"
        fontWeight="bold"
      >
        Löschen
      </Button>
    </Grid>
  );
};

export default NumberPad;