// Interaktives Killer-Sudoku-Tutorial.
// Bottom-Sheet statt Modal: das echte Spielbrett bleibt oben sichtbar,
// das Tutorial sitzt unten als kompakte Card. „Überspringen" jederzeit.

import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Button,
  Heading,
  Text,
  Box,
  Grid,
  HStack,
  IconButton,
  Tooltip,
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
  onJump: (index: number) => void;
  onSkip: () => void;
}

const CAGE_BASE = {
  'blue.100':   { bg: 'cage.blue.100',  border: 'cage.blue.border'  },
  'green.100':  { bg: 'cage.green.100', border: 'cage.green.border' },
  'pink.100':   { bg: 'cage.pink.100',  border: 'cage.pink.border'  },
  'yellow.100': { bg: 'cage.yellow.100',border: 'cage.yellow.border'},
} as const;

// Mini-Board nur zur Veranschaulichung der Regel — eine kleine
// Insellösung im Sheet, nicht das echte Brett.
function DemoBoard({
  highlightedCells,
  cages,
}: {
  highlightedCells: ReadonlyArray<{ row: number; col: number; value: number }>;
  cages: TutorialOverlayProps['demoLevelCages'];
}) {
  const grid: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  for (const { row, col, value } of highlightedCells) {
    grid[row][col] = value;
  }

  const cellToCage = new Map<string, typeof cages[number]>();
  for (const cage of cages) {
    for (const cell of cage.cells) {
      cellToCage.set(`${cell.row},${cell.col}`, cage);
    }
  }

  return (
    <Box
      mx="auto"
      maxW="240px"
      p={1.5}
      bg="surface.raised"
      borderRadius="lg"
      border="1px solid"
      borderColor="surface.sunken"
      boxShadow="sm"
    >
      <Grid templateColumns="repeat(9, 1fr)" gap="1px">
        {grid.flatMap((row, r) =>
          row.map((value, c) => {
            const cage = cellToCage.get(`${r},${c}`);
            const tokens = cage ? CAGE_BASE[cage.color] : null;
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
                bg={tokens ? tokens.bg : 'surface.canvas'}
                border={cage ? '1px dashed' : '1px solid'}
                borderColor={tokens ? tokens.border : 'surface.sunken'}
                borderRightWidth={c % 3 === 2 ? '2px' : undefined}
                borderBottomWidth={r % 3 === 2 ? '2px' : undefined}
                borderRightColor={c % 3 === 2 ? (tokens ? tokens.border : 'surface.sunken') : undefined}
                borderBottomColor={r % 3 === 2 ? (tokens ? tokens.border : 'surface.sunken') : undefined}
                aspectRatio="1"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize={{ base: '2xs', sm: 'xs' }}
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

// Punkt-Indikator für die Schritt-Navigation. Klick auf einen Punkt
// springt zum entsprechenden Schritt — komfortabler als Zurück/Weiter.
function StepDots({
  current,
  total,
  onJump,
}: {
  current: number;
  total: number;
  onJump: (i: number) => void;
}) {
  return (
    <HStack spacing={2} justify="center" minH="24px">
      {Array.from({ length: total }, (_, i) => (
        <Box
          key={i}
          as="button"
          aria-label={`Zu Schritt ${i + 1} springen`}
          aria-current={i === current ? 'step' : undefined}
          onClick={() => onJump(i)}
          width={i === current ? '24px' : '8px'}
          height="8px"
          borderRadius="full"
          bg={i === current ? 'brand.primary' : 'surface.sunken'}
          transition="width 0.2s, background-color 0.2s"
          cursor="pointer"
          border="none"
          p={0}
          _hover={{ bg: i === current ? 'brand.primary.hover' : 'text.muted' }}
        />
      ))}
    </HStack>
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
  onJump,
  onSkip,
}: TutorialOverlayProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onSkip}
      placement="bottom"
      // Bottom-Sheet: maximal halbe Höhe, Scrollen wenn nötig.
      size="md"
    >
      <DrawerOverlay />
      <DrawerContent
        borderTopRadius="2xl"
        maxH="60vh"
        // Safe-Area für iPhone-Home-Indicator
        pb="env(safe-area-inset-bottom, 16px)"
      >
        {/* Schließen-Button oben rechts. */}
        <Box position="absolute" top={3} right={3} zIndex={2}>
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

        <DrawerBody pt={5} pb={4}>
          <StepDots current={stepIndex} total={totalSteps} onJump={onJump} />

          <Heading as="h2" size="md" mt={3} mb={2} color="text.primary">
            {step.title}
          </Heading>
          <Text color="text.secondary" mb={4} lineHeight="1.5" maxW="40rem" mx="auto">
            {step.body}
          </Text>
          <DemoBoard highlightedCells={highlightedCells} cages={demoLevelCages} />
        </DrawerBody>

        <HStack spacing={2} px={4} pb={4} justify="space-between" maxW="40rem" mx="auto" w="100%">
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
      </DrawerContent>
    </Drawer>
  );
}
