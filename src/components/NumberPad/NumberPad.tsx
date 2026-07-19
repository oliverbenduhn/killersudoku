import React from 'react';
import { Grid, useBreakpointValue, Box, Text } from '@chakra-ui/react';
import RippleButton from '../common/RippleButton';

interface NumberPadProps {
  onNumberSelect: (number: number) => void;
  onClear: () => void;
  disabledNumbers?: number[];
  remainingDigits?: { [key: number]: number };
}

// Mindest-Touch-Target 44px (WCAG 2.5.5 / Apple HIG). NumberPad ist die
// primäre Eingabe auf Mobile — Buttons müssen sicher tippen lassen.
const MIN_TOUCH = '44px';

export const NumberPad: React.FC<NumberPadProps> = ({
  onNumberSelect,
  onClear,
  disabledNumbers = [],
  remainingDigits = {}
}) => {
  // Buttons wachsen mit dem Viewport, gehen aber nie unter das Touch-Minimum.
  const buttonSize = useBreakpointValue({
    base: MIN_TOUCH,
    sm: '52px',
    md: '60px',
    lg: '64px'
  }) ?? MIN_TOUCH;

  const fontSize = useBreakpointValue({
    base: 'lg',
    sm: 'xl',
    md: 'xl',
    lg: '2xl'
  }) ?? 'xl';

  const padWidth = useBreakpointValue({
    base: '100%',
    sm: '220px',
    md: '240px',
    lg: '260px'
  }) ?? '100%';

  const gap = useBreakpointValue({ base: 2, lg: 3 }) ?? 2;

  const remainingDigitsFontSize = useBreakpointValue({
    base: '2xs',
    md: 'xs'
  }) ?? '2xs';

  return (
    <Grid templateColumns="repeat(3, 1fr)" gap={gap} width={padWidth}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
        <Box key={number} position="relative">
          <RippleButton
            onClick={() => onNumberSelect(number)}
            bg="brand.primary"
            color="brand.onPrimary"
            size="lg"
            height={buttonSize}
            fontSize={fontSize}
            fontWeight="bold"
            _hover={{ bg: 'brand.primary.hover', _disabled: { bg: 'surface.sunken' } }}
            _active={{ bg: 'brand.primary.hover' }}
            disabled={disabledNumbers.includes(number)}
            borderRadius="lg"
            boxShadow="sm"
            rippleColor="whiteAlpha.400"
            width="100%"
            aria-label={`Zahl ${number}`}
          >
            {number}
          </RippleButton>
          {remainingDigits[number] !== undefined && (
            <Text
              position="absolute"
              top="3px"
              left="4px"
              fontSize={remainingDigitsFontSize}
              fontWeight="bold"
              color="brand.onPrimary"
              lineHeight="1"
              pointerEvents="none"
            >
              {remainingDigits[number]}
            </Text>
          )}
        </Box>
      ))}
      <RippleButton
        gridColumn="1 / span 3"
        onClick={onClear}
        bg="status.error"
        color="white"
        size="lg"
        height={useBreakpointValue({ base: MIN_TOUCH, md: '52px', lg: '56px' }) ?? MIN_TOUCH}
        fontSize={useBreakpointValue({ base: 'md', md: 'lg' }) ?? 'md'}
        fontWeight="bold"
        _hover={{ bg: 'red.600' }}
        _active={{ bg: 'red.600' }}
        borderRadius="lg"
        boxShadow="sm"
        rippleColor="whiteAlpha.400"
        aria-label="Auswahl löschen"
      >
        Löschen
      </RippleButton>
    </Grid>
  );
};

export default NumberPad;
