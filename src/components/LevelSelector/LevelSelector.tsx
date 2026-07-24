import React, { useState, useEffect } from 'react';
import {
  HStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Badge,
  Text,
  useBreakpointValue,
  SimpleGrid,
  Box,
  Flex
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';
import { TOTAL_LEVELS } from '../../services/levelService';
import { getSolvedLevels, getStartedLevels } from '../../services/progressService';
import RippleButton from '../common/RippleButton';

interface LevelSelectorProps {
  currentLevel: number;
  onLevelChange: (level: number) => void;
  fullWidth?: boolean;
}

const LevelSelector: React.FC<LevelSelectorProps> = ({ 
  currentLevel, 
  onLevelChange,
  fullWidth = false
}) => {
  const [inputValue, setInputValue] = useState<string>(currentLevel.toString());
  // Gelöste/angefangene Level werden synchron aus localStorage gelesen
  // (progressService) — die Levelübersicht wird bei jedem Tab-Wechsel neu
  // gemountet, daher reicht ein Lazy-Init ohne zusätzlichen Effekt.
  const [solvedLevels] = useState<Set<number>>(() => (fullWidth ? getSolvedLevels() : new Set()));
  const [startedLevels] = useState<Set<number>>(() => (fullWidth ? getStartedLevels() : new Set()));

  // Responsive Anpassungen
  const showLevelText = useBreakpointValue({ base: true, md: true });
  const inputWidth = useBreakpointValue({ base: "60px", md: "70px" });
  const fontSize = useBreakpointValue({ base: "sm", md: "md" });

  useEffect(() => {
    setInputValue(currentLevel.toString());
  }, [currentLevel]);

  const handleInputChange = (valueAsString: string) => {
    setInputValue(valueAsString);
  };

  const handleInputSubmit = () => {
    const level = parseInt(inputValue, 10);
    if (!isNaN(level) && level >= 1 && level <= TOTAL_LEVELS) {
      onLevelChange(level);
    } else {
      setInputValue(currentLevel.toString());
    }
  };

  const handleInputBlur = () => {
    handleInputSubmit();
  };

  // Berechnet die ungefähre Schwierigkeit basierend auf der Level-Nummer
  const getDifficultyBadge = (level: number) => {
    const difficultyIndex = Math.ceil((level / TOTAL_LEVELS) * 5);
    const difficulties = [
      { color: "green", text: "Einfach" },
      { color: "teal", text: "Leicht" },
      { color: "blue", text: "Mittel" },
      { color: "orange", text: "Schwer" },
      { color: "red", text: "Experte" }
    ];
    
    const difficulty = difficulties[difficultyIndex - 1] || { color: "gray", text: "Unbekannt" };

    return (
      <Badge
        colorScheme={difficulty.color}
        fontSize={fullWidth ? "xs" : "2xs"}
        px={1.5}
        py={0.5}
        borderRadius="full"
        bg={fullWidth ? `${difficulty.color}.500` : "brand.primary.subtle"}
        color={fullWidth ? 'white' : 'brand.primary'}
      >
        {difficulty.text}
      </Badge>
    );
  };

  // Grid-Ansicht für Levels wenn fullWidth aktiviert ist
  if (fullWidth) {
    return (
      <Box w="100%">
        <SimpleGrid columns={[3, 4, 5, 6]} spacing={3} mb={4}>
          {Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1).map((level) => (
            <RippleButton
              key={level}
              onClick={() => onLevelChange(level)}
              bg={level === currentLevel ? 'brand.primary' : 'surface.raised'}
              color={level === currentLevel ? 'brand.onPrimary' : 'text.primary'}
              size="md"
              height="48px"
              borderRadius="md"
              boxShadow="0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)"
              _hover={{ 
                bg: level === currentLevel ? 'brand.primary.hover' : 'surface.sunken',
                transform: "translateY(-2px)",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.12)"
              }}
              transition="all 0.2s ease"
              position="relative"
              p={0}
            >
              <Flex direction="column" justify="center" align="center" w="100%" h="100%">
                <Text fontWeight={level === currentLevel ? "bold" : "normal"}>
                  {level}
                </Text>
                <Box position="absolute" bottom="2px" right="2px">
                  {getDifficultyBadge(level)}
                </Box>
                {solvedLevels.has(level) && (
                  <Box
                    position="absolute"
                    top="-5px"
                    left="-5px"
                    w="18px"
                    h="18px"
                    borderRadius="full"
                    bg="green.500"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    boxShadow="0 1px 3px rgba(0,0,0,0.35)"
                    aria-label="Gelöst"
                  >
                    <CheckIcon boxSize="9px" color="white" />
                  </Box>
                )}
                {!solvedLevels.has(level) && startedLevels.has(level) && (
                  <Box
                    position="absolute"
                    top="3px"
                    left="3px"
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg="orange.400"
                    boxShadow="0 0 0 1.5px var(--chakra-colors-surface-raised)"
                    aria-label="Angefangen"
                  />
                )}
              </Flex>
            </RippleButton>
          ))}
        </SimpleGrid>
        
        <Text fontSize="sm" color="gray.500" textAlign="center">
          Insgesamt {TOTAL_LEVELS} Level verfügbar
        </Text>
      </Box>
    );
  }

  // Standard-Ansicht für Header
  return (
    <HStack spacing={2} align="center" justify="flex-end" h="100%">
      {showLevelText && (
        <Text 
          color="whiteAlpha.900" 
          fontSize={fontSize} 
          fontWeight="400"
          letterSpacing="0.15px"
        >
          Level
        </Text>
      )}
      
      <NumberInput
        min={1}
        max={TOTAL_LEVELS}
        value={inputValue}
        onChange={handleInputChange}
        width={inputWidth}
        size="sm"
        onBlur={handleInputBlur}
        onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') handleInputSubmit(); }}
      >
        <NumberInputField
          textAlign="center"
          color="white"
          border="none"
          bg="whiteAlpha.200"
          borderRadius="4px"
          _hover={{ bg: "whiteAlpha.300" }}
          _focus={{ bg: "whiteAlpha.400", boxShadow: "none" }}
          fontSize={fontSize}
          fontWeight="500"
          px={2}
          h="32px"
        />
        <NumberInputStepper border="none" mx={1}>
          <NumberIncrementStepper 
            color="whiteAlpha.900"
            _hover={{ bg: "whiteAlpha.300" }}
            border="none"
            children="+"
          />
          <NumberDecrementStepper 
            color="whiteAlpha.900"
            _hover={{ bg: "whiteAlpha.300" }}
            border="none"
            children="-"
          />
        </NumberInputStepper>
      </NumberInput>
      
      {getDifficultyBadge(currentLevel)}
    </HStack>
  );
};

export default LevelSelector;