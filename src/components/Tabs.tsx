// Tab-Inhalte. Aus App.tsx ausgelagert, damit App.tsx das Layout hält
// und jede Tab-Seite eigenständig testbar/lesbar bleibt.

import { Box, Heading, Text, VStack, Link, Button, useColorMode, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, HStack, Switch, FormLabel } from '@chakra-ui/react';
import { GameStatistics } from '../services/statisticsService';
import { formatDuration } from '../utils/formatDuration';
import LevelSelector from './LevelSelector/LevelSelector';

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
}

import { Board } from './Board/Board';
import FadeInView from './common/FadeInView';

export function HomeTab({ currentLevel, levelData, isLoading, error, blackAndWhiteMode, transitionDirection }: HomeTabProps) {
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
          puzzleId={`level-${currentLevel}`}
          levelData={levelData}
          isLoading={isLoading}
          error={error}
          blackAndWhiteMode={blackAndWhiteMode}
        />
      </Box>
    </FadeInView>
  );
}

// ---------- Info ----------

export function InfoTab({ transitionDirection }: TabPanelProps) {
  return (
    <FadeInView direction={transitionDirection === 'left' ? 'left' : 'right'} duration={300} key="info-tab">
      <Box bg="surface.raised" p={5} borderRadius="xl" boxShadow="sm">
        <Heading as="h2" size="lg" mb={4} color="text.primary">
          Spielanleitung
        </Heading>
        <Text mb={4} color="text.secondary" maxW="38rem">
          Killer Sudoku kombiniert klassisches Sudoku mit mathematischen Herausforderungen.
          Zusätzlich zu den bekannten Sudoku-Regeln müssen auch die vorgegebenen Summen in
          jedem „Käfig" erreicht werden.
        </Text>
        <Text color="text.secondary" maxW="38rem">
          Wie bei normalem Sudoku müssen Sie jede Zahl von 1–9 in jeder Zeile, Spalte und
          3×3-Region genau einmal platzieren. Darüber hinaus müssen die Zahlen in jedem
          farbigen Käfig (durch gestrichelte Linien angezeigt) die angegebene Summe ergeben.
          Innerhalb eines Käfigs darf keine Zahl wiederholt werden.
        </Text>
      </Box>
    </FadeInView>
  );
}

// ---------- Levels ----------

interface LevelsTabProps extends TabPanelProps {
  currentLevel: number;
  onLevelChange: (level: number) => void;
}

export function LevelsTab({ currentLevel, onLevelChange, transitionDirection }: LevelsTabProps) {
  return (
    <FadeInView direction={transitionDirection === 'left' ? 'left' : 'right'} duration={300} key="levels-tab">
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
    </FadeInView>
  );
}

// ---------- Stats ----------

interface StatsTabProps extends TabPanelProps {
  stats: GameStatistics | null;
}

export function StatsTab({ stats, transitionDirection }: StatsTabProps) {
  return (
    <FadeInView direction={transitionDirection === 'left' ? 'left' : 'right'} duration={300} key="stats-tab">
      <Box bg="surface.raised" p={5} borderRadius="xl" boxShadow="sm">
        <Heading as="h2" size="lg" mb={4} color="text.primary">
          Statistiken
        </Heading>
        {!stats || stats.totalSolved === 0 ? (
          <Text color="text.secondary">
            Noch keine gelösten Rätsel. Sobald du eines abschließt, erscheinen hier deine Stats.
          </Text>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Stat>
              <StatLabel color="text.secondary">Gelöste Rätsel</StatLabel>
              <StatNumber color="text.primary">{stats.totalSolved}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel color="text.secondary">Gesamtspielzeit</StatLabel>
              <StatNumber color="text.primary">{formatDuration(stats.totalTimeMs)}</StatNumber>
            </Stat>
            {Object.entries(stats.solvedByDifficulty).length > 0 && (
              <Stat>
                <StatLabel color="text.secondary">Nach Schwierigkeit</StatLabel>
                <StatHelpText color="text.secondary" m={0}>
                  {Object.entries(stats.solvedByDifficulty).map(([d, n]) => (
                    <Text key={d}>{d}: {n}</Text>
                  ))}
                </StatHelpText>
              </Stat>
            )}
            {Object.entries(stats.bestTimeMsByDifficulty).length > 0 && (
              <Stat>
                <StatLabel color="text.secondary">Beste Zeiten</StatLabel>
                <StatHelpText color="text.secondary" m={0}>
                  {Object.entries(stats.bestTimeMsByDifficulty).map(([d, t]) => (
                    <Text key={d}>{d}: {formatDuration(t)}</Text>
                  ))}
                </StatHelpText>
              </Stat>
            )}
            {stats.lastSolvedAt && (
              <Stat>
                <StatLabel color="text.secondary">Zuletzt gelöst</StatLabel>
                <StatNumber color="text.primary" fontSize="lg">
                  {new Date(stats.lastSolvedAt).toLocaleString()}
                </StatNumber>
              </Stat>
            )}
          </SimpleGrid>
        )}
      </Box>
    </FadeInView>
  );
}

// ---------- Settings ----------

interface SettingsTabProps extends TabPanelProps {
  blackAndWhiteMode: boolean;
  onToggleBlackAndWhite: () => void;
  onOpenResetDialog: () => void;
}

export function SettingsTab({
  blackAndWhiteMode,
  onToggleBlackAndWhite,
  onOpenResetDialog,
  transitionDirection,
}: SettingsTabProps) {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <FadeInView direction={transitionDirection === 'left' ? 'left' : 'right'} duration={300} key="settings-tab">
      <Box bg="surface.raised" p={5} borderRadius="xl" boxShadow="sm">
        <Heading as="h2" size="lg" mb={4} color="text.primary">
          Einstellungen
        </Heading>

        <VStack spacing={5} align="stretch">
          <HStack justify="space-between">
            <FormLabel htmlFor="color-mode" mb={0} color="text.primary">
              Dark Mode
            </FormLabel>
            <Switch
              id="color-mode"
              isChecked={colorMode === 'dark'}
              onChange={toggleColorMode}
              colorScheme="blue"
            />
          </HStack>

          <HStack justify="space-between">
            <FormLabel htmlFor="bw-mode" mb={0} color="text.primary">
              Schwarzweiß-Modus
            </FormLabel>
            <Switch
              id="bw-mode"
              isChecked={blackAndWhiteMode}
              onChange={onToggleBlackAndWhite}
              colorScheme="gray"
            />
          </HStack>

          <Box>
            <Button
              variant="outline"
              colorScheme="red"
              onClick={onOpenResetDialog}
              w="100%"
            >
              Alle Level zurücksetzen
            </Button>
            <Text mt={2} fontSize="sm" color="text.secondary">
              Setzt den Fortschritt aller Level zurück. Statistiken bleiben erhalten.
            </Text>
          </Box>
        </VStack>

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
      </Box>
    </FadeInView>
  );
}
