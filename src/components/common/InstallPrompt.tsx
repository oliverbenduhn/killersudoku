import React, { useState, useEffect } from 'react';
import { Box, Flex, Text, Button, Icon, useDisclosure, Slide } from '@chakra-ui/react';
import { DownloadIcon, CloseIcon } from '@chakra-ui/icons';

interface InstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

const InstallPrompt: React.FC<InstallPromptProps> = ({ onInstall, onDismiss }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    // Speichere das PWA-Installationsereignis für später
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      onOpen(); // Zeige die Installationsaufforderung an
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Prüfe, ob die App bereits installiert ist
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    
    if (isAppInstalled) {
      // App ist bereits installiert, kein Prompt anzeigen
      onClose();
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [onOpen, onClose]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Zeige den nativen Installationsdialog
    deferredPrompt.prompt();
    
    // Warte auf die Antwort des Benutzers
    const choiceResult = await deferredPrompt.userChoice;
    
    // Cleanup
    setDeferredPrompt(null);
    onClose();
    
    if (choiceResult.outcome === 'accepted') {
      console.log('Benutzer hat die App installiert');
      if (onInstall) onInstall();
    } else {
      console.log('Benutzer hat die Installation abgelehnt');
    }
  };

  const handleDismiss = () => {
    onClose();
    if (onDismiss) onDismiss();
    
    // Speichere in localStorage, dass der Benutzer abgelehnt hat (für 1 Woche)
    localStorage.setItem('installPromptDismissed', (Date.now() + 7*24*60*60*1000).toString());
  };

  // Wenn wir keinen deferredPrompt haben oder die Aufforderung geschlossen ist, nichts anzeigen
  if (!deferredPrompt || !isOpen) return null;

  return (
    <Slide direction="bottom" in={isOpen} style={{ zIndex: 10 }}>
      <Box 
        position="fixed" 
        bottom="70px" // Platz für die Bottom Navigation lassen
        left="0"
        right="0"
        bg="android.primary"
        boxShadow="0px -2px 10px rgba(0,0,0,0.2)"
        p={3}
        color="white"
      >
        <Flex justify="space-between" align="center">
          <Box flex="1">
            <Text fontWeight="500">Zum Startbildschirm hinzufügen</Text>
            <Text fontSize="sm" mt={1} opacity={0.9}>
              Installiere Killer Sudoku für schnelleren Zugriff
            </Text>
          </Box>
          
          <Flex gap={2}>
            <Button 
              variant="ghost" 
              colorScheme="whiteAlpha" 
              onClick={handleDismiss}
              size="sm"
              p={1}
            >
              <Icon as={CloseIcon} boxSize={5} />
            </Button>
            
            <Button 
              colorScheme="whiteAlpha" 
              onClick={handleInstallClick}
              leftIcon={<Icon as={DownloadIcon} />}
              variant="outline"
              size="sm"
            >
              Installieren
            </Button>
          </Flex>
        </Flex>
      </Box>
    </Slide>
  );
};

export default InstallPrompt;