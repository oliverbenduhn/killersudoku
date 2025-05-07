import { useState, useEffect } from 'react';
import { ChakraProvider, Box, Container, Heading, Text, extendTheme, VStack, Flex, useBreakpointValue, useColorModeValue, Button, useToast, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay } from '@chakra-ui/react';
import './App.css';
import Board from './components/Board/Board';
import LevelSelector from './components/LevelSelector/LevelSelector';
import { loadLevelByNumber, TOTAL_LEVELS } from './services/levelService';
import { GameLevel } from './types/gameTypes';
import BottomNavigation from './components/common/BottomNavigation';
import TouchRipple from './components/common/TouchRipple';
import FadeInView from './components/common/FadeInView';
import SwipeableBox from './components/common/SwipeableBox';
import InstallPrompt from './components/common/InstallPrompt';
import { requestNotificationPermission } from './serviceWorkerRegistration';
import { clearAllGameStates } from './services/storageService';
import React from 'react';
import { FocusableElement } from '@chakra-ui/utils';

// Erweiterte Android-Material Design Farbpalette
const theme = extendTheme({
  styles: {
    global: {
      body: {
        fontSize: '1rem',
        lineHeight: 1.6,
        bg: '#f5f5f5', // Material Design Grey 100
        color: '#212121', // Material Design Grey 900
        transition: 'background-color 0.2s, color 0.2s',
      },
      p: {
        maxWidth: '38rem',
        marginLeft: 'auto',
        marginRight: 'auto',
      }
    }
  },
  fonts: {
    body: "Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    heading: "Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  colors: {
    android: {
      primary: "#2196F3",       // Material Design Blue 500
      primaryDark: "#1976D2",   // Material Design Blue 700
      primaryLight: "#BBDEFB",  // Material Design Blue 100
      accent: "#FF4081",        // Material Design Pink A200
      accentDark: "#F50057",    // Material Design Pink A400
      accentLight: "#FF80AB",   // Material Design Pink A100
      background: "#F5F5F5",    // Material Design Grey 100
      surface: "#FFFFFF",
      text: "#212121",          // Material Design Grey 900
      secondaryText: "#757575", // Material Design Grey 600
      divider: "#BDBDBD",       // Material Design Grey 400
      success: "#4CAF50",       // Material Design Green 500
      warning: "#FFC107",       // Material Design Amber 500
      error: "#F44336",         // Material Design Red 500
      info: "#2196F3"           // Material Design Blue 500
    }
  }
});

function App() {
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [levelData, setLevelData] = useState<GameLevel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("home");
  const [lastActiveTab, setLastActiveTab] = useState<string>("home");
  const [tabTransition, setTabTransition] = useState<'left' | 'right' | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState<boolean>(false);
  const cancelRef = React.useRef<any>(null);
  const toast = useToast();

  // Responsive Layout-Einstellungen
  const headerHeight = useBreakpointValue({ base: "56px", md: "64px" });
  const navBarHeight = useBreakpointValue({ base: "56px", md: "64px" });
  const containerMaxWidth = useBreakpointValue({ base: "100%", xl: "container.xl" });
  const showInstructions = useBreakpointValue({ base: true, lg: false });
  const statusBarBg = useColorModeValue("android.primaryDark", "gray.900");
  const headerBg = useColorModeValue("android.primary", "gray.800");

  // Beim App-Start Benachrichtigungsberechtigungen beantragen (für PWA-Updates)
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Lädt das aktuelle Level basierend auf der Level-Nummer
  useEffect(() => {
    const fetchLevel = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const level = await loadLevelByNumber(currentLevel);
        setLevelData(level);
      } catch (err) {
        console.error('Fehler beim Laden des Levels:', err);
        setError(`Level ${currentLevel} konnte nicht geladen werden. Bitte versuchen Sie es mit einem anderen Level.`);
        setLevelData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLevel();
  }, [currentLevel]);

  const handleLevelChange = (level: number) => {
    setCurrentLevel(level);
  };

  // Berechnet die Richtung für die Tab-Übergangsanimation
  const calculateTransitionDirection = (newTab: string, currentTab: string) => {
    const tabOrder = ["home", "levels", "stats", "info", "settings"];
    const currentIndex = tabOrder.indexOf(currentTab);
    const newIndex = tabOrder.indexOf(newTab);
    
    if (newIndex > currentIndex) {
      return 'left';
    } else {
      return 'right';
    }
  };

  const handleTabChange = (tabName: string) => {
    if (tabName === activeTab) return;
    
    setLastActiveTab(activeTab);
    setTabTransition(calculateTransitionDirection(tabName, activeTab));
    setActiveTab(tabName);
    
    // Wechsle automatisch zur Level-Auswahl im "levels" Tab
    if (tabName === "levels") {
      // Hier könnten wir eine Level-Auswahl anzeigen
    }
  };

  // Swipe-Handler für Tab-Wechsel
  const handleSwipeLeft = () => {
    const tabOrder = ["home", "levels", "stats", "info", "settings"];
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      handleTabChange(tabOrder[currentIndex + 1]);
    }
  };

  const handleSwipeRight = () => {
    const tabOrder = ["home", "levels", "stats", "info", "settings"];
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      handleTabChange(tabOrder[currentIndex - 1]);
    }
  };

  // Funktion zum Zurücksetzen aller Level
  const handleResetAllLevels = async () => {
    try {
      await clearAllGameStates();
      toast({
        title: "Erfolgreich zurückgesetzt",
        description: "Alle Spielstände wurden zurückgesetzt.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setIsResetDialogOpen(false);
    } catch (error) {
      console.error("Fehler beim Zurücksetzen der Spielstände:", error);
      toast({
        title: "Fehler",
        description: "Beim Zurücksetzen der Spielstände ist ein Fehler aufgetreten.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Content basierend auf dem aktiven Tab anzeigen
  const renderContent = (): React.ReactElement => {
    switch(activeTab) {
      case "home":
        return (
          <FadeInView
            direction={tabTransition === 'left' ? 'left' : 'right'}
            duration={300}
            mb={4}
            key="home-tab"
          >
            <Box 
              className="game-container" 
              bg="android.surface"
              borderRadius="md"
              overflow="hidden"
              boxShadow="0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)"
            >
              <Board 
                puzzleId={`level-${currentLevel}`}
                levelData={levelData}
                isLoading={isLoading}
                error={error}
              />
            </Box>
          </FadeInView>
        );
      case "info":
        return (
          <FadeInView
            direction={tabTransition === 'left' ? 'left' : 'right'}
            duration={300}
            key="info-tab"
          >
            <Box 
              className="content-container" 
              mt={4}
              bg="android.surface"
              p={4}
              borderRadius="md"
              boxShadow="0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)"
            >
              <Heading as="h2" size="lg" mb={4} color="android.text">
                Spielanleitung
              </Heading>
              <Text className="readable-text" mb={4} color="android.secondaryText">
                Killer Sudoku kombiniert klassisches Sudoku mit mathematischen Herausforderungen. 
                Zusätzlich zu den bekannten Sudoku-Regeln müssen auch die vorgegebenen Summen in 
                jedem "Käfig" erreicht werden.
              </Text>
              <Text className="readable-text" color="android.secondaryText">
                Wie bei normalem Sudoku müssen Sie jede Zahl von 1-9 in jeder Zeile, Spalte und 
                3x3-Region genau einmal platzieren. Darüber hinaus müssen die Zahlen in jedem farbigen 
                Käfig (durch gestrichelte Linien angezeigt) die angegebene Summe ergeben. 
                Innerhalb eines Käfigs darf keine Zahl wiederholt werden.
              </Text>
            </Box>
          </FadeInView>
        );
      case "levels":
        return (
          <FadeInView
            direction={tabTransition === 'left' ? 'left' : 'right'}
            duration={300}
            key="levels-tab"
          >
            <Box 
              className="content-container" 
              mt={4}
              bg="android.surface"
              p={4}
              borderRadius="md"
              boxShadow="0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)"
            >
              <Heading as="h2" size="lg" mb={4} color="android.text">
                Level-Auswahl
              </Heading>
              <LevelSelector 
                currentLevel={currentLevel} 
                onLevelChange={(level) => {
                  handleLevelChange(level);
                  setActiveTab("home"); // Wechsle zurück zum Spiel nach Level-Auswahl
                }}
                fullWidth={true}
              />
            </Box>
          </FadeInView>
        );
      case "stats":
        return (
          <FadeInView
            direction={tabTransition === 'left' ? 'left' : 'right'}
            duration={300}
            key="stats-tab"
          >
            <Box 
              className="content-container" 
              mt={4}
              bg="android.surface"
              p={4}
              borderRadius="md"
              boxShadow="0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)"
            >
              <Heading as="h2" size="lg" mb={4} color="android.text">
                Statistiken
              </Heading>
              <Text className="readable-text" color="android.secondaryText">
                Hier werden in Zukunft deine Spielstatistiken angezeigt.
              </Text>
            </Box>
          </FadeInView>
        );
      case "settings":
        return (
          <FadeInView
            direction={tabTransition === 'left' ? 'left' : 'right'}
            duration={300}
            key="settings-tab"
          >
            <Box 
              className="content-container" 
              mt={4}
              bg="android.surface"
              p={4}
              borderRadius="md"
              boxShadow="0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)"
            >
              <Heading as="h2" size="lg" mb={4} color="android.text">
                Einstellungen
              </Heading>
              
              <VStack spacing={4} align="stretch">
                <Box>
                  <Button 
                    colorScheme="red" 
                    variant="outline"
                    onClick={() => setIsResetDialogOpen(true)}
                    w="100%"
                  >
                    Alle Level zurücksetzen
                  </Button>
                  <Text mt={2} fontSize="sm" color="android.secondaryText">
                    Setzt den Fortschritt aller Level zurück. Diese Aktion kann nicht rückgängig gemacht werden.
                  </Text>
                </Box>
              </VStack>
            </Box>
          </FadeInView>
        );
      default:
        return renderContent();
    }
  };

  return (
    <ChakraProvider theme={theme}>
      {/* TouchRipple für globales Touch-Feedback */}
      <TouchRipple color="rgba(33, 150, 243, 0.15)" duration={900} />
      
      {/* PWA Installations-Aufforderung */}
      <InstallPrompt 
        onInstall={() => console.log("App erfolgreich installiert!")}
        onDismiss={() => console.log("Installation abgelehnt")}
      />
      
      {/* Android Status Bar */}
      <Box 
        bg={statusBarBg} 
        h="24px" 
        position="fixed" 
        top={0} 
        left={0} 
        right={0} 
        zIndex={1000}
      />
      
      {/* Android App Bar */}
      <Box 
        as="header" 
        bg={headerBg}
        py={0}
        position="fixed"
        top="24px"
        left={0}
        right={0}
        height={headerHeight}
        boxShadow="0 2px 4px rgba(0,0,0,0.2)"
        zIndex={999}
      >
        <Container maxW={containerMaxWidth} h="100%" px={2}>
          <Flex 
            direction="row"
            align="center"
            justify="space-between"
            h="100%"
            gap={2}
          >
            <Heading 
              as="h1" 
              color="white" 
              fontSize={{ base: "20px", md: "22px" }}
              fontWeight="500"
            >
              Killer Sudoku
            </Heading>
            
            <Box display={activeTab === "home" ? "block" : "none"}>
              <LevelSelector 
                currentLevel={currentLevel} 
                onLevelChange={handleLevelChange}
              />
            </Box>
          </Flex>
        </Container>
      </Box>
      
      {/* Main Content mit Padding für Header und Bottom Navigation */}
      <SwipeableBox
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        animateSwipe={true}
        swipeThreshold={70}
        pt={{ base: "80px", md: "88px" }} // Status Bar + Header Height
        pb={{ base: "80px", md: "88px" }} // Erhöhung des Padding-Bottom für die größere Navigationsleiste
        minH="100vh"
        bg="android.background"
      >
        <Container 
          maxW={containerMaxWidth} 
          px={2}
          mx="auto"
          w="100%"
        >
          {renderContent()}
          
          {showInstructions && activeTab === "home" && (
            <FadeInView
              direction="up"
              duration={500}
              delay={300}
            >
              <Box 
                className="content-container" 
                mt={4}
                bg="android.surface"
                p={4}
                borderRadius="md"
                boxShadow="0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)"
              >
                <Heading as="h2" size="lg" mb={4} color="android.text">
                  Spielanleitung
                </Heading>
                <Text className="readable-text" mb={4} color="android.secondaryText">
                  Killer Sudoku kombiniert klassisches Sudoku mit mathematischen Herausforderungen. 
                  Zusätzlich zu den bekannten Sudoku-Regeln müssen auch die vorgegebenen Summen in 
                  jedem "Käfig" erreicht werden.
                </Text>
                <Text className="readable-text" color="android.secondaryText">
                  Wie bei normalem Sudoku müssen Sie jede Zahl von 1-9 in jeder Zeile, Spalte und 
                  3x3-Region genau einmal platzieren. Darüber hinaus müssen die Zahlen in jedem farbigen 
                  Käfig (durch gestrichelte Linien angezeigt) die angegebene Summe ergeben. 
                  Innerhalb eines Käfigs darf keine Zahl wiederholt werden.
                </Text>
              </Box>
            </FadeInView>
          )}
        </Container>
      </SwipeableBox>
      
      {/* Reset-Bestätigungsdialog */}
      <AlertDialog
        isOpen={isResetDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsResetDialogOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Alle Level zurücksetzen
            </AlertDialogHeader>

            <AlertDialogBody>
              Bist du sicher? Diese Aktion wird den Fortschritt aller Level zurücksetzen und kann nicht rückgängig gemacht werden.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setIsResetDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button colorScheme="red" onClick={handleResetAllLevels} ml={3}>
                Zurücksetzen
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      
      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </ChakraProvider>
  );
}

export default App;
