import React, { useState, useEffect } from 'react';
import {
  HStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useToast,
  Badge,
  Text,
  useBreakpointValue,
  SimpleGrid,
  Box,
  Flex
} from '@chakra-ui/react';
import { TOTAL_LEVELS } from '../../services/levelService';
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
  const toast = useToast();
  
  // Responsive Anpassungen
  const showLevelText = useBreakpointValue({ base: true, md: true });
  const inputWidth = useBreakpointValue({ base: "60px", md: "70px" });
  const fontSize = useBreakpointValue({ base: "sm", md: "md" });

  useEffect(() => {
    setInputValue(currentLevel.toString());
  }, [currentLevel]);

  const handleInputChange = (valueAsString: string) => {
    setInputValue(valueAsString);
    const level = parseInt(valueAsString, 10);
    if (!isNaN(level) && level >= 1 && level <= TOTAL_LEVELS) {
      onLevelChange(level);
    }
  };

  const handleInputBlur = () => {
    const level = parseInt(inputValue, 10);
    if (isNaN(level) || level < 1 || level > TOTAL_LEVELS) {
      toast({
        title: 'Ungültige Eingabe',
        description: `Bitte geben Sie eine Zahl zwischen 1 und ${TOTAL_LEVELS} ein.`,
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: "bottom",
        variant: "subtle",
        containerStyle: {
          marginBottom: '60px',
          maxWidth: '90%',
          bg: 'rgba(0,0,0,0.9)',
          color: 'white',
          borderRadius: '4px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
        }
      });
      setInputValue(currentLevel.toString());
    }
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
        bg={fullWidth ? `${difficulty.color}.500` : "whiteAlpha.200"}
        color="white"
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
              bg={level === currentLevel ? "#2196F3" : "white"}
              color={level === currentLevel ? "white" : "gray.700"}
              size="md"
              height="48px"
              borderRadius="md"
              boxShadow="0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)"
              _hover={{ 
                bg: level === currentLevel ? "#1976D2" : "gray.100",
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