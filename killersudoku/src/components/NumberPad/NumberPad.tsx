import React from 'react';
import { Grid, Button, useColorModeValue } from '@chakra-ui/react';

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
  const buttonBg = useColorModeValue('gray.100', 'gray.700');
  const buttonHoverBg = useColorModeValue('gray.200', 'gray.600');

  return (
    <Grid templateColumns="repeat(3, 1fr)" gap={2} width="200px">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
        <Button
          key={number}
          onClick={() => onNumberSelect(number)}
          bg={buttonBg}
          _hover={{ bg: buttonHoverBg }}
          isDisabled={disabledNumbers.includes(number)}
        >
          {number}
        </Button>
      ))}
      <Button
        gridColumn="1 / span 3"
        onClick={onClear}
        colorScheme="red"
        variant="outline"
      >
        Löschen
      </Button>
    </Grid>
  );
};

export default NumberPad;