// Interaktives Killer-Sudoku-Tutorial.
// Modal-Layer mit echtem Demo-Board: zeigt die Käfig-Regel live an einer
// Mini-Auswahl gefüllter Zellen. „Überspringen" jederzeit möglich.

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter,
  Button,
  Heading,
  Text,
  Box,
  Grid,
  HStack,
  IconButton,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';
import type { TutorialStep } from '../../hooks/useTutorial';

interface TutorialOverlayProps {
  isOpen: boolean;
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  highlightedCells: ReadonlyArray<{ row: number; col: number; value: number }>;
  demoLevelCages: ReadonlyArray<{
    id: string;
    cells: ReadonlyArray<{ row: number; col: number }>;
    sum: number;
    color: 'blue.100' | 'green.100' | 'pink.100' | 'yellow.100';
  }>;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

const CAGE_BASE = {
  'blue.100':  { bg: 'cage.blue.100',  border: 'cage.blue.border'  },
  'green.100': { bg: 'cage.green.100', border: 'cage.green.border' },
  'pink.100':  { bg: 'cage.pink.100',  border: 'cage.pink.border'  },
  'yellow.100':{ bg: 'cage.yellow.100',border: 'cage.yellow.border'},
} as const;

// Reduziertes Demo-Board-Rendering. Bewusst ohne die volle Board-Logik
// (Drag, Selection, Number-Pad). Nur die Tutorial-Zellen sind klickbar;
// die zeigen aber keinen Effekt, das ist by design — der User soll nur
// sehen, was wo leuchtet.
function DemoBoard({
  highlightedCells,
  cages,
}: {
  highlightedCells: ReadonlyArray<{ row: number; col: number; value: number }>;
  cages: TutorialOverlayProps['demoLevelCages'];
}) {
  const cellBg = useColorModeValue('white', 'gray.800');
  const cellBorder = useColorModeValue('gray.300', 'gray.600');
  const grid: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  for (const { row, col, value } of highlightedCells) {
    grid[row][col] = value;
  }

  // Cage-Background pro Zelle: erste Käfig-Zelle gewinnt (einfaches
  // Overlay statt komplexem Border-Puzzle wie im echten Board).
  const cellToCage = new Map<string, typeof cages[number]>();
  for (const cage of cages) {
    for (const cell of cage.cells) {
      cellToCage.set(`${cell.row},${cell.col}`, cage);
    }
  }

  return (
    <Box
      mx="auto"
      maxW="280px"
      p={2}
      bg={cellBg}
      borderRadius="md"
      border="1px solid"
      borderColor={cellBorder}
    >
      <Grid templateColumns="repeat(9, 1fr)" gap="1px">
        {grid.flatMap((row, r) =>
          row.map((value, c) => {
            const cage = cellToCage.get(`${r},${c}`);
            const tokens = cage ? CAGE_BASE[cage.color] : null;
            // Summe nur in Top-Left der Käfig-Zellen anzeigen (Demo, nicht perfekt).
            const topLeft = cage
              ? cage.cells.reduce(
                  (acc, cell) => (cell.row < acc.row || (cell.row === acc.row && cell.col < acc.col) ? cell : acc),
                  cage.cells[0]
                )
              : null;
            const showSum = topLeft && topLeft.row === r && topLeft.col === c;
            return (
              <Box
                key={`${r}-${c}`}
                position="relative"
                bg={tokens ? tokens.bg : cellBg}
                border={cage ? '1px dashed' : '1px solid'}
                borderColor={tokens ? tokens.border : cellBorder}
                borderRightWidth={c % 3 === 2 ? '2px' : undefined}
                borderBottomWidth={r % 3 === 2 ? '2px' : undefined}
                borderRightColor={c % 3 === 2 ? (tokens ? tokens.border : cellBorder) : undefined}
                borderBottomColor={r % 3 === 2 ? (tokens ? tokens.border : cellBorder) : undefined}
                aspectRatio="1"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize={{ base: 'xs', sm: 'sm' }}
                fontWeight="600"
                color={value ? 'cell.user.text' : 'transparent'}
              >
                {showSum && cage && (
                  <Text
                    position="absolute"
                    top="1px"
                    left="2px"
                    fontSize="2xs"
                    fontWeight="bold"
                    color="text.primary"
                    lineHeight="1"
                  >
                    {cage.sum}
                  </Text>
                )}
                {value || ''}
              </Box>
            );
          })
        )}
      </Grid>
    </Box>
  );
}

export function TutorialOverlay({
  isOpen,
  step,
  stepIndex,
  totalSteps,
  isFirstStep,
  isLastStep,
  highlightedCells,
  demoLevelCages,
  onNext,
  onPrev,
  onSkip,
}: TutorialOverlayProps) {
  return (
    <Modal isOpen={isOpen} onClose={onSkip} size="md" isCentered>
      <ModalOverlay />
      <ModalContent mx={3}>
        <Box position="absolute" top={2} right={2} zIndex={2}>
          <Tooltip label="Überspringen" placement="left">
            <IconButton
              aria-label="Tutorial überspringen"
              icon={<CloseIcon boxSize={2.5} />}
              size="sm"
              variant="ghost"
              onClick={onSkip}
            />
          </Tooltip>
        </Box>

        <ModalBody pt={6} pb={4}>
          <Text fontSize="xs" color="text.muted" mb={1} letterSpacing="0.05em" textTransform="uppercase">
            Schritt {stepIndex + 1} / {totalSteps}
          </Text>
          <Heading as="h2" size="md" mb={3} color="text.primary">
            {step.title}
          </Heading>
          <Text color="text.secondary" mb={5} lineHeight="1.6">
            {step.body}
          </Text>
          <DemoBoard highlightedCells={highlightedCells} cages={demoLevelCages} />
        </ModalBody>

        <ModalFooter pt={2}>
          <HStack spacing={2} w="100%" justify="space-between">
            <Button variant="ghost" onClick={onSkip} size="sm">
              Überspringen
            </Button>
            <HStack spacing={2}>
              {!isFirstStep && (
                <Button variant="outline" onClick={onPrev} size="sm">
                  Zurück
                </Button>
              )}
              <Button colorScheme="blue" onClick={onNext} size="sm">
                {isLastStep ? 'Loslegen' : 'Weiter'}
              </Button>
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
