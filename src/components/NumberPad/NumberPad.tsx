import React from 'react';
import { Grid, useBreakpointValue } from '@chakra-ui/react';
import RippleButton from '../common/RippleButton';

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
  // Material Design inspirierte Farben
  const buttonBg = '#2196F3';         // Material Blue 500
  const buttonHoverBg = '#1976D2';    // Material Blue 700
  const deleteButtonBg = '#F44336';   // Material Red 500
  const deleteButtonHoverBg = '#D32F2F'; // Material Red 700

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
        <RippleButton
          key={number}
          onClick={() => onNumberSelect(number)}
          bg={buttonBg}
          color="white"
          size="lg"
          height={buttonSize}
          fontSize={fontSize}
          fontWeight="bold"
          _hover={{ bg: buttonHoverBg }}
          _active={{ bg: buttonHoverBg }}
          disabled={disabledNumbers.includes(number)}
          borderRadius="md"
          boxShadow="0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)"
          rippleColor="rgba(255, 255, 255, 0.4)"
        >
          {number}
        </RippleButton>
      ))}
      <RippleButton
        gridColumn="1 / span 3"
        onClick={onClear}
        bg={deleteButtonBg}
        color="white"
        size="lg"
        height={useBreakpointValue({ base: "40px", md: "45px", lg: "50px" })}
        fontSize={useBreakpointValue({ base: "md", md: "lg" })}
        fontWeight="bold"
        _hover={{ bg: deleteButtonHoverBg }}
        _active={{ bg: deleteButtonHoverBg }}
        borderRadius="md"
        boxShadow="0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)"
        rippleColor="rgba(255, 255, 255, 0.4)"
      >
        Löschen
      </RippleButton>
    </Grid>
  );
};

export default NumberPad;