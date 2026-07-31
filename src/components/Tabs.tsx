// Tab-Inhalte. Aus App.tsx ausgelagert, damit App.tsx das Layout hält
// und jede Tab-Seite eigenständig testbar/lesbar bleibt.

import { Box, Heading, Text, Link, Flex, IconButton } from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import LevelSelector from './LevelSelector/LevelSelector';

import { Board } from './Board/Board';
import FadeInView from './common/FadeInView';

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
}

export function HomeTab({
  currentLevel,
  levelData,
  isLoading,
  error,
  blackAndWhiteMode,
  transitionDirection,
  puzzleId,
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
        />
      </Box>
    </FadeInView>
  );
}

// ---------- Levels ----------

interface LevelsTabProps extends TabPanelProps {
  currentLevel: number;
  onLevelChange: (level: number) => void;
  onBack: () => void;
}

export function LevelsTab({ currentLevel, onLevelChange, onBack, transitionDirection }: LevelsTabProps) {
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
