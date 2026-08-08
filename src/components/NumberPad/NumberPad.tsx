import React from 'react';
import { Grid, useBreakpointValue, Box, Text, Flex } from '@chakra-ui/react';
import RippleButton from '../common/RippleButton';

interface NumberPadProps {
  onNumberSelect: (number: number) => void;
  onClear: () => void;
  disabledNumbers?: number[];
  remainingDigits?: { [key: number]: number };
  /** Verbrauchte Fehlversuche. Wenn gesetzt, erscheint rechts
   *  neben dem Löschen-Button eine kompakte 3-Punkte-Anzeige. */
  mistakesUsed?: number;
  maxMistakes?: number;
}

// Mindest-Touch-Target 44px (WCAG 2.5.5 / Apple HIG). NumberPad ist die
// primäre Eingabe auf Mobile — Buttons müssen sicher tippen lassen.
const MIN_TOUCH = '44px';

export const NumberPad: React.FC<NumberPadProps> = ({
  onNumberSelect,
  onClear,
  disabledNumbers = [],
  remainingDigits = {},
  mistakesUsed,
  maxMistakes
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

  // Löschen-Button: niedriger als die Ziffern-Buttons (User-Wunsch),
  // aber ≥ 36 px damit der Touch-Tap nicht zu klein wird.
  const clearButtonHeight = useBreakpointValue({
    base: MIN_TOUCH,
    md: '36px',
    lg: '40px'
  }) ?? '36px';
  const clearButtonFontSize = useBreakpointValue({
    base: 'md',
    md: 'sm',
    lg: 'md'
  }) ?? 'sm';
  const showMistakesInline = mistakesUsed !== undefined && maxMistakes !== undefined;

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
            fontWeight="700"
            fontFamily="mono"
            _hover={{ bg: 'brand.primary.hover', _disabled: { bg: 'surface.sunken' } }}
            _active={{ bg: 'brand.primary.hover' }}
            isDisabled={disabledNumbers.includes(number)}
            borderRadius="lg"
            boxShadow="sm"
            border="1px solid"
            borderColor="blackAlpha.100"
            rippleColor="whiteAlpha.400"
            width="100%"
            aria-label={`Zahl ${number}`}
          >
            {number}
          </RippleButton>
          {remainingDigits[number] !== undefined && (
            <Text
              position="absolute"
              top="50%"
              left="calc(100% - 14px)"
              transform="translateY(-50%)"
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
      <Flex
        gridColumn="1 / span 3"
        gap={2}
        align="center"
        width="100%"
        flexWrap="wrap"
      >
        <RippleButton
          onClick={onClear}
          bg="status.error"
          color="white"
          size="md"
          height={clearButtonHeight}
          fontSize={clearButtonFontSize}
          fontWeight="bold"
          _hover={{ bg: 'red.600' }}
          _active={{ bg: 'red.600' }}
          borderRadius="lg"
          boxShadow="sm"
          rippleColor="whiteAlpha.400"
          aria-label="Auswahl löschen"
          flex={showMistakesInline ? '1 1 60%' : '1 1 100%'}
          minW="120px"
        >
          Löschen
        </RippleButton>
        {showMistakesInline && (
          <Flex
            align="center"
            gap={1}
            aria-label={`${mistakesUsed} von ${maxMistakes} Fehlversuchen verbraucht`}
            role="status"
            flex="0 0 auto"
          >
            {Array.from({ length: maxMistakes ?? 0 }, (_, i) => {
              const used = i < (mistakesUsed ?? 0);
              return (
                <Box
                  key={i}
                  as="svg"
                  width="14px"
                  height="14px"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <circle
                    cx="10"
                    cy="10"
                    r="7"
                    fill={used ? 'var(--chakra-colors-status-error)' : 'none'}
                    stroke={used ? 'var(--chakra-colors-status-error)' : 'var(--chakra-colors-text-muted)'}
                    strokeWidth="2"
                  />
                </Box>
              );
            })}
          </Flex>
        )}
      </Flex>
    </Grid>
  );
};

export default NumberPad;
