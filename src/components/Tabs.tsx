// Tab-Inhalte. Aus App.tsx ausgelagert, damit App.tsx das Layout hält
// und jede Tab-Seite eigenständig testbar/lesbar bleibt.

import { Box, Heading, Text, Link, Flex, IconButton, SimpleGrid } from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';

import { Board } from './Board/Board';
import FadeInView from './common/FadeInView';
import RippleButton from './common/RippleButton';
import { TOTAL_LEVELS } from '../services/levelService';
import { getSolvedLevels, getStartedLevels } from '../services/progressService';
import { GameLevel } from '../types/gameTypes';
import { APP_VERSION } from '../version';

interface TabPanelProps {
  transitionDirection: 'left' | 'right' | null;
}

// ---------- Home ----------

interface HomeTabProps {
  currentLevel: number;
  levelData: GameLevel | null;
  isLoading: boolean;
  error: string | null;
  blackAndWhiteMode: boolean;
  transitionDirection: 'left' | 'right' | null;
  /** Überschreibt die Storage-Id (z. B. für generierte Zufallslevel). */
  puzzleId?: string;
  /** Öffnet den Tastenkombinationen-Hilfe-Dialog. Reicht vom App-State
   *  durch bis in Board, wo der ?-Shortcut ebenfalls triggert. */
  onOpenHelp: () => void;
  shortcutsEnabled?: boolean;
}

export function HomeTab({
  currentLevel,
  levelData,
  isLoading,
  error,
  blackAndWhiteMode,
  transitionDirection,
  puzzleId,
  onOpenHelp,
  shortcutsEnabled = true,
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
          levelData={levelData?.levelNumber === currentLevel || puzzleId ? levelData : null}
          isLoading={isLoading}
          error={error}
          blackAndWhiteMode={blackAndWhiteMode}
          onOpenHelp={onOpenHelp}
          shortcutsEnabled={shortcutsEnabled}
        />
      </Box>
    </FadeInView>
  );
}

// ---------- Levels ----------

const CHAPTER_SIZE = 20;
const CHAPTERS = Array.from({ length: Math.ceil(TOTAL_LEVELS / CHAPTER_SIZE) }, (_, i) => {
  const start = i * CHAPTER_SIZE + 1;
  const end = Math.min((i + 1) * CHAPTER_SIZE, TOTAL_LEVELS);
  const names = ['Einstieg', 'Leicht', 'Mittel', 'Schwer', 'Experte'];
  return { start, end, name: names[i] ?? `Kapitel ${i + 1}` };
});

interface LevelsTabProps extends TabPanelProps {
  currentLevel: number;
  onLevelChange: (level: number) => void;
  onBack: () => void;
}

export function LevelsTab({ currentLevel, onLevelChange, onBack, transitionDirection }: LevelsTabProps) {
  const solvedLevels = getSolvedLevels();
  const startedLevels = getStartedLevels();
  const solvedCount = solvedLevels.size;
  const progress = Math.round((solvedCount / TOTAL_LEVELS) * 100);

  return (
    <FadeInView
      direction={transitionDirection === 'left' ? 'left' : 'right'}
      duration={300}
      key="levels-tab"
      // The document owns scrolling, including wheel events over the level grid.
      minH="calc(100dvh - 100px)"
      pb="env(safe-area-inset-bottom, 0px)"
      px={1}
    >
      {/* Zurück-Header (sticky, damit "Zurück" immer erreichbar bleibt) */}
      <Flex
        align="center"
        gap={2}
        mb={4}
        position="sticky"
        top={0}
        bg="surface.canvas"
        zIndex={1}
        pt={2}
        pb={2}
        mx={-1}
        px={1}
      >
        <IconButton
          aria-label="Zurück"
          icon={<ArrowBackIcon />}
          variant="ghost"
          onClick={onBack}
        />
        <Heading as="h2" size="md" color="text.primary" fontFamily="heading" letterSpacing="-0.02em">
          Level
        </Heading>
      </Flex>

      {/* Fortschritts-Card — ersetzt die nackte Überschrift. */}
      <Box
        bg="surface.raised"
        p={5}
        borderRadius="xl"
        boxShadow="sm"
        mb={6}
        border="1px solid"
        borderColor="surface.sunken"
      >
        <Flex justify="space-between" align="baseline" mb={2}>
          <Text fontSize="sm" color="text.secondary" fontWeight="500">
            Dein Fortschritt
          </Text>
          <Text fontSize="sm" color="text.muted" fontFamily="mono" fontWeight="400">
            {solvedCount} / {TOTAL_LEVELS}
          </Text>
        </Flex>
        <Box role="progressbar" aria-label="Gelöste Level" aria-valuenow={solvedCount} aria-valuemin={0} aria-valuemax={TOTAL_LEVELS} h="6px" bg="surface.sunken" borderRadius="full" overflow="hidden">
          <Box
            h="100%"
            w={`${progress}%`}
            bg="brand.primary"
            borderRadius="full"
            transition="width 300ms cubic-bezier(0.16, 1, 0.3, 1)"
          />
        </Box>
      </Box>

      {/* Kapitel-Liste */}
      {CHAPTERS.map((chapter) => {
        const chapterLevels = Array.from(
          { length: chapter.end - chapter.start + 1 },
          (_, i) => chapter.start + i
        );
        const chapterSolved = chapterLevels.filter((l) => solvedLevels.has(l)).length;
        const isCurrentChapter = currentLevel >= chapter.start && currentLevel <= chapter.end;

        return (
          <Box key={chapter.name} mb={6}>
            <Flex align="baseline" justify="space-between" mb={3} px={1}>
              <Heading
                as="h3"
                size="sm"
                color={isCurrentChapter ? 'brand.primary' : 'text.primary'}
                fontFamily="heading"
                fontWeight="700"
                letterSpacing="-0.01em"
              >
                {chapter.name}
              </Heading>
              <Text fontSize="xs" color="text.muted" fontFamily="mono">
                {chapterSolved}/{CHAPTER_SIZE}
              </Text>
            </Flex>
            <SimpleGrid columns={[4, 5, 5, 5]} spacing={3}>
              {chapterLevels.map((level) => (
                <RippleButton
                  key={level}
                  onClick={() => onLevelChange(level)}
                  aria-label={`Level ${level}${solvedLevels.has(level) ? ', gelöst' : startedLevels.has(level) ? ', angefangen' : ''}`}
                  aria-current={level === currentLevel ? 'page' : undefined}
                  bg={level === currentLevel ? 'brand.primary' : 'surface.raised'}
                  color={level === currentLevel ? 'brand.onPrimary' : 'text.primary'}
                  size="md"
                  height="52px"
                  borderRadius="lg"
                  boxShadow="sm"
                  border="1px solid"
                  borderColor={level === currentLevel ? 'brand.primary' : 'surface.sunken'}
                  _hover={{
                    bg: level === currentLevel ? 'brand.primary.hover' : 'surface.sunken',
                    transform: 'translateY(-2px)',
                    boxShadow: 'md',
                  }}
                  transition="all 200ms cubic-bezier(0.16, 1, 0.3, 1)"
                  position="relative"
                  p={0}
                >
                  <Flex direction="column" justify="center" align="center" w="100%" h="100%">
                    <Text
                      fontWeight={level === currentLevel ? '700' : '500'}
                      fontSize="md"
                      fontFamily={solvedLevels.has(level) ? 'mono' : 'body'}
                    >
                      {level}{solvedLevels.has(level) ? ' ✓' : ''}
                    </Text>
                    {!solvedLevels.has(level) && startedLevels.has(level) && (
                      <Box
                        position="absolute"
                        top="4px"
                        right="4px"
                        w="6px"
                        h="6px"
                        borderRadius="full"
                        bg="status.warning"
                        aria-label="Angefangen"
                      />
                    )}
                  </Flex>
                </RippleButton>
              ))}
            </SimpleGrid>
          </Box>
        );
      })}

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
        <Text as="span" ml={2} fontSize="2xs" fontFamily="mono" opacity={0.7}>
          v{APP_VERSION}
        </Text>
      </Box>
    </FadeInView>
  );
}
