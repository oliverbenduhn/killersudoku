// App.tsx — Layout & State. Tab-Inhalte sind in components/Tabs.tsx.
import { useState, useEffect } from 'react';
import {
  ChakraProvider,
  Box,
  Container,
  Heading,
  Flex,
  useBreakpointValue,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';

import InstallPrompt from './components/common/InstallPrompt';
import { HomeActions } from './components/common/HomeActions';

import { HomeTab, LevelsTab } from './components/Tabs';
import { TutorialOverlay } from './components/common/TutorialOverlay';
import { useTutorial } from './hooks/useTutorial';
import { theme } from './theme';
import { loadLevelByNumber } from './services/levelService';
import { generateLevel } from './services/puzzleGeneratorService';
import { Difficulty, GameLevel } from './types/gameTypes';

type TabName = 'home' | 'levels';

function App() {
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [levelData, setLevelData] = useState<GameLevel | null>(null);
  // Generiertes Zufallslevel; hat Vorrang vor dem geladenen Standard-Level.
  const [generatedLevel, setGeneratedLevel] = useState<GameLevel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>('home');
  const [tabTransition, setTabTransition] = useState<'left' | 'right' | null>(null);
  const [blackAndWhiteMode, setBlackAndWhiteMode] = useState<boolean>(false);
  const toast = useToast();
  const tutorial = useTutorial();

  const headerHeight = useBreakpointValue({ base: '52px', md: '60px' });
  // Device-Layout:
  //   mobile  (base/md)  — Kopfzeile mit Titel + HomeActions, kein Sidebar.
  //   desktop (lg+ bzw. Tablet-Quer ab md) — Sidebar-Layout, keine Kopfzeile.
  const isSidebarLayout = useBreakpointValue({ base: false, md: true }) || false;
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

  const handleTabChange = (tabName: TabName) => {
    if (tabName === activeTab) return;
    setTabTransition(tabName === 'levels' ? 'left' : 'right');
    setActiveTab(tabName);
  };

  const handleSelectLevel = (level: number) => {
    setGeneratedLevel(null);
    setCurrentLevel(level);
  };

  const handleGenerateLevel = (difficulty: Exclude<Difficulty, 'unknown'>) => {
    handleTabChange('home');
    setIsLoading(true);
    // setTimeout, damit der Lade-Spinner rendert, bevor die (synchrone)
    // Generierung den Main-Thread beansprucht (Expert: einige Sekunden).
    setTimeout(() => {
      try {
        setGeneratedLevel(generateLevel({ difficulty }));
      } catch (err) {
        console.error('Fehler beim Generieren des Levels:', err);
        toast({ title: 'Fehler', description: 'Zufallslevel konnte nicht erzeugt werden.', status: 'error', duration: 3000, isClosable: true });
      } finally {
        setIsLoading(false);
      }
    }, 50);
  };

  return (
    <ChakraProvider theme={theme}>
      <InstallPrompt />

      <Box
        as="header"
        bg={headerBg}
        position="sticky"
        top={0}
        zIndex={999}
        boxShadow="sm"
        display={(isSidebarLayout || activeTab !== 'home') ? 'none' : 'block'}
      >
        <Container maxW={containerMaxWidth} h={headerHeight} px={4}>
          <Flex direction="row" align="center" justify="space-between" h="100%" gap={3}>
            <Heading as="h1" color={headerTextColor} fontSize={{ base: '18px', md: '20px' }} fontWeight="700" letterSpacing="-0.02em">
              Killer Sudoku
            </Heading>
            <Flex align="center" gap={1}>
              <HomeActions
                onOpenLevels={() => handleTabChange('levels')}
                blackAndWhiteMode={blackAndWhiteMode}
                onToggleBlackAndWhite={() => setBlackAndWhiteMode((v) => !v)}
              />
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Box minH="calc(100vh - 56px)" bg="surface.canvas">
        <Container maxW={containerMaxWidth} px={3} py={4} pb="64px" mx="auto" w="100%">
          {activeTab === 'home' && (
            <HomeTab
              currentLevel={currentLevel}
              levelData={generatedLevel ?? levelData}
              puzzleId={generatedLevel ? `generated-${generatedLevel.id}` : undefined}
              isLoading={isLoading}
              error={error}
              blackAndWhiteMode={blackAndWhiteMode}
              transitionDirection={tabTransition}
              onOpenLevels={() => handleTabChange('levels')}
              onToggleBlackAndWhite={() => setBlackAndWhiteMode((v) => !v)}
            />
          )}
          {activeTab === 'levels' && (
            <LevelsTab
              currentLevel={currentLevel}
              onLevelChange={(l) => { handleSelectLevel(l); handleTabChange('home'); }}
              onGenerateLevel={handleGenerateLevel}
              onBack={() => handleTabChange('home')}
              transitionDirection={tabTransition}
            />
          )}
        </Container>
      </Box>

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
