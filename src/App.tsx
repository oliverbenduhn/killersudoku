// App.tsx — Layout & State. Tab-Inhalte sind in components/Tabs.tsx.
import { useState, useEffect } from 'react';
import {
  ChakraProvider,
  Box,
  Container,
  Heading,
  Flex,
  Text,
  useBreakpointValue,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';

import InstallPrompt from './components/common/InstallPrompt';
import { HomeActions } from './components/common/HomeActions';
import { APP_VERSION } from './version';

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
  // Fullscreen-Status wird mit document.fullscreenElement synchron gehalten,
  // damit der Toggle-Button auch reagiert, wenn der User per Browser-UI
  // (z. B. ESC) das Vollbild verlässt.
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() =>
    typeof document !== 'undefined' && !!document.fullscreenElement
  );
  // BW-Toggle in localStorage wie dark-Mode persistieren, damit der User
  // nicht bei jedem Reload neu ein-/ausschalten muss.
  const [blackAndWhiteMode, setBlackAndWhiteMode] = useState<boolean>(() => {
    try { return localStorage.getItem('killersudoku_bw') === '1'; } catch { return false; }
  });
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

  // Fullscreen-Toggle: requestFullscreen() / exitFullscreen() der Browser
  // API. Browser verlangt einen User-Gesture — der Button-Click ist einer.
  const handleToggleFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => {
        // Browser kann Vollbild verweigern (z. B. bei <iframe> oder ohne
        // User-Gesture); still ignorieren.
      });
    } else {
      void document.exitFullscreen();
    }
  };
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const handleTabChange = (tabName: TabName) => {
    if (tabName === activeTab) return;
    setTabTransition(tabName === 'levels' ? 'left' : 'right');
    setActiveTab(tabName);
  };

  const handleSelectLevel = (level: number) => {
    setGeneratedLevel(null);
    setCurrentLevel(level);
  };

  const handleGenerateLevel = async (difficulty: Exclude<Difficulty, 'unknown'>) => {
    handleTabChange('home');
    setIsLoading(true);
    // Generator läuft async und yielded zwischen Versuchen, damit der
    // Lade-Spinner auch auf Mobile-CPUs weiter rendert.
    try {
      const level = await generateLevel({ difficulty });
      setGeneratedLevel(level);
    } catch (err) {
      console.error('Fehler beim Generieren des Levels:', err);
      toast({ title: 'Fehler', description: 'Zufallslevel konnte nicht erzeugt werden.', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setIsLoading(false);
    }
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
        // Header bleibt sichtbar auf dem Start-Tab — auch im Sidebar-Layout,
        // weil HomeActions (BW/Dark/Level-Toggles) hier wohnen und es keinen
        // anderen Weg dorthin gibt (keine Bottom-Nav auf Mobile).
        display={activeTab !== 'home' ? 'none' : 'block'}
      >
        <Container
          maxW={containerMaxWidth}
          h={headerHeight}
          px={4}
          // Phone-Landscape (md..xl, height < 500): Header rotiert 90° nach
          // links und dockt links an. So bleibt der gesamte vertikale Raum
          // fürs Brett verfügbar, und Titel + Aktionen liegen am linken
          // Rand als schmale Spalte. Desktop/Portrait sind unberührt.
          sx={{
            '@media (orientation: landscape) and (max-height: 499px) and (min-width: 768px)': {
              position: 'fixed',
              top: '50%',
              left: 0,
              transform: 'translateY(-50%) rotate(-90deg)',
              transformOrigin: 'center',
              height: '52px',
              width: '240px',
              whiteSpace: 'nowrap',
              paddingLeft: '12px',
              paddingRight: '12px',
              borderRadius: '0 8px 8px 0',
              boxShadow: 'sm',
              background: 'var(--chakra-colors-surface-raised)',
              zIndex: 999,
            },
          }}
        >
          <Flex direction="row" align="center" justify="space-between" h="100%" gap={3}>
            <Flex align="baseline" gap={2}>
              <Heading as="h1" color={headerTextColor} fontSize={{ base: '18px', md: '20px' }} fontWeight="700" letterSpacing="-0.02em">
                Killer Sudoku
              </Heading>
              <Text color={headerTextColor} opacity={0.5} fontSize="xs" fontFamily="mono">
                v{APP_VERSION}
              </Text>
            </Flex>
            <Flex align="center" gap={1}>
              <HomeActions
                onOpenLevels={() => handleTabChange('levels')}
                blackAndWhiteMode={blackAndWhiteMode}
                currentLevel={currentLevel}
                isFullscreen={isFullscreen}
                onToggleFullscreen={handleToggleFullscreen}
                onToggleBlackAndWhite={() => setBlackAndWhiteMode((v) => {
                  const next = !v;
                  try { localStorage.setItem('killersudoku_bw', next ? '1' : '0'); } catch {}
                  return next;
                })}
              />
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Box minH="calc(100vh - 56px)" bg="surface.canvas">
        <Container maxW={containerMaxWidth} px={3} pt={2} pb="env(safe-area-inset-bottom, 0px)" mx="auto" w="100%">
          {activeTab === 'home' && (
            <HomeTab
              currentLevel={currentLevel}
              levelData={generatedLevel ?? levelData}
              puzzleId={generatedLevel ? `generated-${generatedLevel.id}` : undefined}
              isLoading={isLoading}
              error={error}
              blackAndWhiteMode={blackAndWhiteMode}
              transitionDirection={tabTransition}
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
