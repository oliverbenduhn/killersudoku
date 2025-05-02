import React from 'react';
import { Grid, Button, useBreakpointValue } from '@chakra-ui/react';

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

  // Responsive Größe für die Buttons und den Nummernblock
  const buttonSize = useBreakpointValue({
    base: "40px", // Mobil
    sm: "45px",   // Tablet klein
    md: "55px",   // Tablet
    lg: "60px"    // Desktop
  }) || "50px";

  const fontSize = useBreakpointValue({
    base: "lg",   // Mobil
    sm: "xl",     // Tablet klein
    md: "xl",     // Tablet
    lg: "2xl"     // Desktop
  }) || "xl";

  const padWidth = useBreakpointValue({
    base: "180px", // Mobil
    sm: "200px",   // Tablet klein
    md: "220px",   // Tablet
    lg: "240px"    // Desktop
  }) || "220px";

  const gap = useBreakpointValue({
    base: 2,       // Mobil
    sm: 2,         // Tablet klein
    md: 2,         // Tablet
    lg: 3          // Desktop
  }) || 2;

  return (
    <Grid templateColumns="repeat(3, 1fr)" gap={gap} width={padWidth}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
        <Button
          key={number}
          onClick={() => onNumberSelect(number)}
          bg={buttonBg}
          color="white"
          size="lg"
          height={buttonSize}
          fontSize={fontSize}
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
        height={useBreakpointValue({ base: "40px", md: "45px", lg: "50px" })}
        fontSize={useBreakpointValue({ base: "md", md: "lg" })}
        fontWeight="bold"
      >
        Löschen
      </Button>
    </Grid>
  );
};

export default NumberPad;