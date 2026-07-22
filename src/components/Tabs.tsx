// Tab-Inhalte. Aus App.tsx ausgelagert, damit App.tsx das Layout hält
// und jede Tab-Seite eigenständig testbar/lesbar bleibt.

import { Box, Heading, Text, Link, Button, SimpleGrid, Flex, IconButton } from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { Difficulty } from '../types/gameTypes';
import LevelSelector from './LevelSelector/LevelSelector';

import { Board } from './Board/Board';
import FadeInView from './common/FadeInView';
import { HomeActions } from './common/HomeActions';

interface TabPanelProps {
  transitionDirection: 'left' | 'right' | null;
}

// ---------- Home ----------

interface HomeTabProps {
  currentLevel: number;
  levelData: any;
  isLoading: boolean;
  error: string | null;
  blackAndWhiteMode: boolean;
  transitionDirection: 'left' | 'right' | null;
  /** Überschreibt die Storage-Id (z. B. für generierte Zufallslevel). */
  puzzleId?: string;
  onOpenLevels: () => void;
  onToggleBlackAndWhite: () => void;
}

export function HomeTab({
  currentLevel,
  levelData,
  isLoading,
  error,
  blackAndWhiteMode,
  transitionDirection,
  puzzleId,
  onOpenLevels,
  onToggleBlackAndWhite,
}: HomeTabProps) {
  return (
    <FadeInView
      direction={transitionDirection === 'left' ? 'left' : 'right'}
      duration={300}
      mb={4}
      key="home-tab"
    >
      <Box
        bg="surface.raised"
        borderRadius="xl"
        overflow="hidden"
        boxShadow="sm"
      >
        <Board
          puzzleId={puzzleId ?? `level-${currentLevel}`}
          levelData={levelData}
          isLoading={isLoading}
          error={error}
          blackAndWhiteMode={blackAndWhiteMode}
          sidebarFooter={
            <HomeActions
              onOpenLevels={onOpenLevels}
              blackAndWhiteMode={blackAndWhiteMode}
              onToggleBlackAndWhite={onToggleBlackAndWhite}
            />
          }
        />
      </Box>
    </FadeInView>
  );
}

// ---------- Levels ----------

interface LevelsTabProps extends TabPanelProps {
  currentLevel: number;
  onLevelChange: (level: number) => void;
  onGenerateLevel: (difficulty: Exclude<Difficulty, 'unknown'>) => void;
  onBack: () => void;
}

const GENERATOR_DIFFICULTIES: Array<{ key: Exclude<Difficulty, 'unknown'>; label: string; color: string }> = [
  { key: 'easy', label: 'Einfach', color: 'green' },
  { key: 'medium', label: 'Mittel', color: 'blue' },
  { key: 'hard', label: 'Schwer', color: 'orange' },
  { key: 'expert', label: 'Experte', color: 'red' },
];

export function LevelsTab({ currentLevel, onLevelChange, onGenerateLevel, onBack, transitionDirection }: LevelsTabProps) {
  return (
    <FadeInView direction={transitionDirection === 'left' ? 'left' : 'right'} duration={300} key="levels-tab">
      <Flex align="center" gap={2} mb={4}>
        <IconButton
          aria-label="Zurück"
          icon={<ArrowBackIcon />}
          variant="ghost"
          onClick={onBack}
        />
        <Heading as="h2" size="md" color="text.primary">
          Level
        </Heading>
      </Flex>

      <Box bg="surface.raised" p={5} borderRadius="xl" boxShadow="sm" mb={4}>
        <Heading as="h2" size="lg" mb={2} color="text.primary">
          Zufallslevel erstellen
        </Heading>
        <Text fontSize="sm" color="text.secondary" mb={3}>
          Erzeugt ein frisches Rätsel mit garantiert eindeutiger Lösung.
        </Text>
        <SimpleGrid columns={[2, 4]} spacing={3}>
          {GENERATOR_DIFFICULTIES.map(({ key, label, color }) => (
            <Button
              key={key}
              aria-label={`Neues Zufallslevel erstellen: ${label}`}
              colorScheme={color}
              variant="outline"
              onClick={() => onGenerateLevel(key)}
            >
              Zufall · {label}
            </Button>
          ))}
        </SimpleGrid>
      </Box>
      <Box bg="surface.raised" p={5} borderRadius="xl" boxShadow="sm">
        <Heading as="h2" size="lg" mb={4} color="text.primary">
          Level-Auswahl
        </Heading>
        <LevelSelector
          currentLevel={currentLevel}
          onLevelChange={onLevelChange}
          fullWidth={true}
        />
      </Box>

      <Box
        as="footer"
        textAlign="center"
        pt={6}
        pb={2}
        fontSize="sm"
        color="text.muted"
        borderTop="1px solid"
        borderColor="surface.sunken"
        mt={6}
      >
        <Link href="https://legal.benduhn.de/impressum/" target="_blank" rel="noopener" color="text.muted">
          Impressum
        </Link>
        {' · '}
        <Link href="https://legal.benduhn.de/datenschutz/" target="_blank" rel="noopener" color="text.muted">
          Datenschutz
        </Link>
      </Box>
    </FadeInView>
  );
}
