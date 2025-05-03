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
  useBreakpointValue
} from '@chakra-ui/react';
import { TOTAL_LEVELS } from '../../services/levelService';

interface LevelSelectorProps {
  currentLevel: number;
  onLevelChange: (level: number) => void;
}

const LevelSelector: React.FC<LevelSelectorProps> = ({ currentLevel, onLevelChange }) => {
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
  const getDifficultyBadge = () => {
    const difficultyIndex = Math.ceil((currentLevel / TOTAL_LEVELS) * 5);
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
        fontSize="2xs" 
        px={1.5} 
        py={0.5} 
        borderRadius="full"
        bg="whiteAlpha.200"
        color="white"
      >
        {difficulty.text}
      </Badge>
    );
  };

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
      
      {getDifficultyBadge()}
    </HStack>
  );
};

export default LevelSelector;