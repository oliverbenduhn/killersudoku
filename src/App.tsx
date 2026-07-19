// App.tsx — Layout & State. Tab-Inhalte sind in components/Tabs.tsx.
import { useState, useEffect, useRef } from 'react';
import {
  ChakraProvider,
  Box,
  Container,
  Heading,
  Flex,
  useBreakpointValue,
  useColorModeValue,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
} from '@chakra-ui/react';

import Board from './components/Board/Board';
import LevelSelector from './components/LevelSelector/LevelSelector';
import BottomNavigation from './components/common/BottomNavigation';
import FadeInView from './components/common/FadeInView';
import SwipeableBox from './components/common/SwipeableBox';
import InstallPrompt from './components/common/InstallPrompt';

import { HomeTab, InfoTab, LevelsTab, StatsTab, SettingsTab } from './components/Tabs';
import { TutorialOverlay } from './components/common/TutorialOverlay';
import { useTutorial } from './hooks/useTutorial';
import { theme } from './theme';
import { loadLevelByNumber } from './services/levelService';
import { clearAllGameStates } from './services/storageService';
import { GameStatistics, loadStatistics } from './services/statisticsService';
import { GameLevel } from './types/gameTypes';

const TAB_ORDER = ['home', 'levels', 'stats', 'info', 'settings'] as const;
type TabName = typeof TAB_ORDER[number];

function calcTransition(newTab: TabName, currentTab: TabName): 'left' | 'right' {
  return TAB_ORDER.indexOf(newTab) > TAB_ORDER.indexOf(currentTab) ? 'left' : 'right';
}

function App() {
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [levelData, setLevelData] = useState<GameLevel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>('home');
  const [tabTransition, setTabTransition] = useState<'left' | 'right' | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState<boolean>(false);
  const [blackAndWhiteMode, setBlackAndWhiteMode] = useState<boolean>(false);
  const [stats, setStats] = useState<GameStatistics | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const toast = useToast();
  const tutorial = useTutorial();

  const headerHeight = useBreakpointValue({ base: '52px', md: '60px' });
  const containerMaxWidth = useBreakpointValue({ base: '100%', xl: 'container.xl' });
  const headerBg = useColorModeValue('surface.header', 'surface.header');
  const headerTextColor = useColorModeValue('surface.header.text', 'surface.header.text');

  useEffect(() => {
    let cancelled = false;
    const fetchLevel = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const level = await loadLevelByNumber(currentLevel);
        if (!cancelled) setLevelData(level);
      } catch (err) {
        if (!cancelled) {
          console.error('Fehler beim Laden des Levels:', err);
          setError(`Level ${currentLevel} konnte nicht geladen werden.`);
          setLevelData(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchLevel();
    return () => { cancelled = true; };
  }, [currentLevel]);

  useEffect(() => {
    if (activeTab !== 'stats') return;
    let isMounted = true;
    loadStatistics().then((s) => { if (isMounted) setStats(s); });
    return () => { isMounted = false; };
  }, [activeTab]);

  const handleTabChange = (tabName: string) => {
    if (tabName === activeTab) return;
    setTabTransition(calcTransition(tabName as TabName, activeTab));
    setActiveTab(tabName as TabName);
  };

  const handleSwipe = (dir: 'left' | 'right') => {
    const i = TAB_ORDER.indexOf(activeTab);
    const next = dir === 'left' ? TAB_ORDER[i + 1] : TAB_ORDER[i - 1];
    if (next) handleTabChange(next);
  };

  const handleResetAllLevels = async () => {
    try {
      await clearAllGameStates();
      toast({ title: 'Erfolgreich zurückgesetzt', status: 'success', duration: 3000, isClosable: true });
      setIsResetDialogOpen(false);
    } catch (error) {
      toast({ title: 'Fehler', description: 'Zurücksetzen fehlgeschlagen.', status: 'error', duration: 3000, isClosable: true });
    }
  };

  return (
    <ChakraProvider theme={theme}>
      <InstallPrompt />

      <Box as="header" bg={headerBg} position="sticky" top={0} zIndex={999} boxShadow="sm">
        <Container maxW={containerMaxWidth} h={headerHeight} px={4}>
          <Flex direction="row" align="center" justify="space-between" h="100%" gap={3}>
            <Heading as="h1" color={headerTextColor} fontSize={{ base: '18px', md: '20px' }} fontWeight="700" letterSpacing="-0.02em">
              Killer Sudoku
            </Heading>
            {activeTab === 'home' && (
              <Flex align="center" gap={2}>
                <LevelSelector currentLevel={currentLevel} onLevelChange={setCurrentLevel} />
              </Flex>
            )}
          </Flex>
        </Container>
      </Box>

      <SwipeableBox
        onSwipeLeft={() => handleSwipe('left')}
        onSwipeRight={() => handleSwipe('right')}
        animateSwipe={true}
        swipeThreshold={70}
        minH="calc(100vh - 56px)"
        bg="surface.canvas"
      >
        <Container maxW={containerMaxWidth} px={3} py={4} mx="auto" w="100%">
          {activeTab === 'home' && (
            <HomeTab
              currentLevel={currentLevel}
              levelData={levelData}
              isLoading={isLoading}
              error={error}
              blackAndWhiteMode={blackAndWhiteMode}
              transitionDirection={tabTransition}
            />
          )}
          {activeTab === 'levels' && (
            <LevelsTab
              currentLevel={currentLevel}
              onLevelChange={(l) => { setCurrentLevel(l); handleTabChange('home'); }}
              transitionDirection={tabTransition}
            />
          )}
          {activeTab === 'stats' && <StatsTab stats={stats} transitionDirection={tabTransition} />}
          {activeTab === 'info' && <InfoTab transitionDirection={tabTransition} />}
          {activeTab === 'settings' && (
            <SettingsTab
              blackAndWhiteMode={blackAndWhiteMode}
              onToggleBlackAndWhite={() => setBlackAndWhiteMode((v) => !v)}
              onOpenResetDialog={() => setIsResetDialogOpen(true)}
              onRestartTutorial={tutorial.restart}
              transitionDirection={tabTransition}
            />
          )}
        </Container>
      </SwipeableBox>

      <AlertDialog isOpen={isResetDialogOpen} leastDestructiveRef={cancelRef} onClose={() => setIsResetDialogOpen(false)}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">Alle Level zurücksetzen</AlertDialogHeader>
            <AlertDialogBody>
              Bist du sicher? Diese Aktion wird den Fortschritt aller Level zurücksetzen und kann nicht rückgängig gemacht werden.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setIsResetDialogOpen(false)}>Abbrechen</Button>
              <Button colorScheme="red" onClick={handleResetAllLevels} ml={3}>Zurücksetzen</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      <TutorialOverlay
        isOpen={tutorial.active}
        step={tutorial.step}
        stepIndex={tutorial.stepIndex}
        totalSteps={tutorial.totalSteps}
        isFirstStep={tutorial.isFirstStep}
        isLastStep={tutorial.isLastStep}
        highlightedCells={tutorial.step.highlightedCells}
        demoLevelCages={tutorial.demoLevel.cages}
        onNext={tutorial.next}
        onPrev={tutorial.prev}
        onJump={tutorial.jumpTo}
        onSkip={tutorial.skip}
      />
    </ChakraProvider>
  );
}

export default App;
