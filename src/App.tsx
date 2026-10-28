// App.tsx — Layout & State. Tab-Inhalte sind in components/Tabs.tsx.
import { useState, useEffect } from 'react';
import {
  ChakraProvider,
  Box,
  Container,
  Heading,
  Flex,
  IconButton,
  useBreakpointValue,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';

import InstallPrompt from './components/common/InstallPrompt';
import { HomeActions } from './components/common/HomeActions';

import { HomeTab, LevelsTab } from './components/Tabs';
import { TutorialOverlay } from './components/common/TutorialOverlay';
import HelpDialog from './components/common/HelpDialog';
import { useTutorial } from './hooks/useTutorial';
import { theme } from './theme';
import { ColorSchemeProvider } from './contexts/ColorSchemeContext';
import { loadLevelByNumber, TOTAL_LEVELS } from './services/levelService';
import { GameLevel } from './types/gameTypes';

type TabName = 'home' | 'levels';

function App() {
  const toast = useToast();
  // Zuletzt gespieltes Level in localStorage persistieren, damit ein Reload
  // (z. B. versehentliches Aktualisieren im Browser) nicht auf Level 1
  // zurückspringt, sondern dort weitermacht, wo man war.
  const [currentLevel, setCurrentLevel] = useState<number>(() => {
    try {
      const stored = Number(localStorage.getItem('killersudoku_current_level'));
      return Number.isInteger(stored) && stored > 0 && stored <= TOTAL_LEVELS ? stored : 1;
    } catch {
      return 1;
    }
  });
  const [levelData, setLevelData] = useState<GameLevel | null>(null);
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
  const tutorial = useTutorial();
  // Help-Dialog-State: in App, weil sowohl HomeActions-Button als auch
  // der ?-Shortcut (über useKeyboardShortcuts in Board) ihn öffnen.
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  const supportsFullscreen = typeof document !== 'undefined' && Boolean(document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === 'function' && typeof document.exitFullscreen === 'function');
  // The header wraps into two rows on narrow screens.
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
    try { localStorage.setItem('killersudoku_current_level', String(currentLevel)); } catch {}
  }, [currentLevel]);

  // Fullscreen-Toggle: requestFullscreen() / exitFullscreen() der Browser
  // API. Browser verlangt einen User-Gesture — der Button-Click ist einer.
  const handleToggleFullscreen = async () => {
    if (!supportsFullscreen) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      console.error('Vollbild nicht verfügbar:', error);
      toast({ title: 'Vollbild nicht verfügbar', description: 'Du kannst ohne Vollbild weiterspielen.', status: 'info', isClosable: true });
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
    setCurrentLevel(level);
  };

  return (
    <ChakraProvider theme={theme}>
    <ColorSchemeProvider>
      <InstallPrompt />

      {!isFullscreen && (
        <Box
          as="header"
          bg={headerBg}
          position="sticky"
          top={0}
          zIndex={999}
          boxShadow="sm"
        // Header auf beiden Tabs sichtbar: HomeActions (BW/Dark/Level/
        // Fullscreen/Help) brauchen einen UI-Weg in beiden Tabs — auf
        // Mobile gibt es keine Bottom-Nav, und der ?-Shortcut allein
        // deckt nur den Help-Dialog ab (#24).
        >
        <Container
          maxW={containerMaxWidth}
          minH="52px"
          py={1}
          px={4}

        >
          <Flex direction={{ base: "column", sm: "row" }} align="center" justify="space-between" gap={{ base: 0, sm: 3 }}>
            <Flex align="baseline" gap={2}>
              <Heading
                as="h1"
                color={headerTextColor}
                fontSize={{ base: '19px', md: '22px' }}
                fontWeight="700"
                letterSpacing="-0.025em"
                fontFamily="heading"
              >
                Killer Sudoku
              </Heading>
            </Flex>
            <Flex align="center" justify="space-between" w={{ base: "100%", sm: "auto" }} gap={1}>
              <HomeActions
                onOpenLevels={() => handleTabChange(activeTab === 'levels' ? 'home' : 'levels')}
                blackAndWhiteMode={blackAndWhiteMode}
                currentLevel={currentLevel}
                isFullscreen={isFullscreen}
                supportsFullscreen={supportsFullscreen}
                onToggleFullscreen={handleToggleFullscreen}
                onToggleBlackAndWhite={() => setBlackAndWhiteMode((v) => {
                  const next = !v;
                  try { localStorage.setItem('killersudoku_bw', next ? '1' : '0'); } catch {}
                  return next;
                })}
                onOpenHelp={() => setIsHelpOpen(true)}
              />
            </Flex>
          </Flex>
        </Container>
        </Box>
      )}

      {isFullscreen && (
        <IconButton
          position="fixed"
          top="max(env(safe-area-inset-top), 12px)"
          right="max(env(safe-area-inset-right), 12px)"
          zIndex={1000}
          size="sm"
          variant="solid"
          aria-label="Vollbild verlassen"
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M5 1v4H1M11 1v4h4M5 15v-4H1M11 15v-4h4" />
            </svg>
          }
          onClick={handleToggleFullscreen}
        />
      )}

      <Box minH="calc(100vh - 56px)" bg="surface.canvas"
        // iOS-Pull-to-Refresh am Brett-Rand unterdrücken. Ohne das
        // triggert ein Drag vom Brett nach unten einen Reload der PWA.
        // ponytail: overscroll-behavior am Body/Outer-Container, nicht an
        // der Cell — die Scroll-Chain kommt vom Viewport, nicht vom Brett.
        sx={{ overscrollBehaviorY: 'contain' }}
      >
        <Container maxW={containerMaxWidth} px={3} pt={2} pb="env(safe-area-inset-bottom, 0px)" mx="auto" w="100%">
          {activeTab === 'home' && (
            <HomeTab
              currentLevel={currentLevel}
              levelData={levelData}
              isLoading={isLoading}
              error={error}
              blackAndWhiteMode={blackAndWhiteMode}
              transitionDirection={tabTransition}
              onOpenHelp={() => setIsHelpOpen(true)}
              shortcutsEnabled={!isHelpOpen && !tutorial.active}
            />
          )}
          {activeTab === 'levels' && (
            <LevelsTab
              currentLevel={currentLevel}
              onLevelChange={(l) => { handleSelectLevel(l); handleTabChange('home'); }}
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

      <HelpDialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </ColorSchemeProvider>
    </ChakraProvider>
  );
}

export default App;
