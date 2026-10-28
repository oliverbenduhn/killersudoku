import React, { useState, useEffect } from 'react';
import { Box, Flex, Text, Button, Icon, useDisclosure, Slide } from '@chakra-ui/react';
import { DownloadIcon, CloseIcon } from '@chakra-ui/icons';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

const InstallPrompt: React.FC<InstallPromptProps> = ({ onInstall, onDismiss }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<InstallEvent | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Bereits abgelehnt? Dann nicht mehr nerven.
      let dismissed: string | null = null;
      try { dismissed = localStorage.getItem('installPromptDismissed'); } catch {
        // The dismissal preference is optional; installation remains available for this session.
      }
      if (dismissed && parseInt(dismissed, 10) > Date.now()) return;
      if (!('prompt' in e) || typeof e.prompt !== 'function' || !('userChoice' in e)) return;
      setDeferredPrompt(e as InstallEvent);
      onOpen();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [onOpen, onClose]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') onInstall?.();
    } catch (error) {
      console.error('Installation fehlgeschlagen:', error);
      setInstallError('Die Installation konnte nicht gestartet werden. Bitte nutze das Installationsmenü deines Browsers.');
    } finally {
      setDeferredPrompt(null);
      onClose();
    }
  };

  const handleDismiss = () => {
    onClose();
    if (onDismiss) onDismiss();

    // Speichere in localStorage, dass der Benutzer abgelehnt hat (für 1 Woche)
    try { localStorage.setItem('installPromptDismissed', (Date.now() + 7*24*60*60*1000).toString()); } catch {
      // Dismissal already applies to this session; unavailable storage cannot preserve the preference.
    }
  };

  // Bereits installiert (PWA standalone) → nichts rendern, egal
  // welcher State. Steht im render-Pfad, nicht im Effect, damit der
  // Check bei jedem Re-Render gilt und nicht nur zum Mount-Zeitpunkt.
  const isAppInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  // Wenn wir keinen deferredPrompt haben, die Aufforderung geschlossen
  // ist, oder die App bereits installiert ist, nichts anzeigen.
  if (installError) return <Box role="alert" p={3} bg="surface.raised">
    <Text>{installError}</Text><Button onClick={() => setInstallError(null)}>Schließen</Button>
  </Box>;
  if (!deferredPrompt || !isOpen || isAppInstalled) return null;

  return (
    <Slide direction="bottom" in={isOpen} style={{ zIndex: 10 }}>
      <Box
        position="fixed"
        bottom="70px" // Platz für die Bottom Navigation lassen
        left="0"
        right="0"
        bg="brand.primary"
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
