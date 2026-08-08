import { Button, IconButton, Tooltip, useColorMode } from '@chakra-ui/react';
import { CopyIcon, MoonIcon, SunIcon, ViewIcon, ViewOffIcon } from '@chakra-ui/icons';

export interface HomeActionsProps {
  onOpenLevels: () => void;
  blackAndWhiteMode: boolean;
  onToggleBlackAndWhite: () => void;
  /** Aktuelle Levelnummer — wird neben dem Level-Button als Badge
   *  angezeigt, damit der Spieler ohne Levels-Tab weiß, wo er ist. */
  currentLevel?: number;
  /** Fullscreen-Status + Toggle. Wird vom Parent verwaltet, damit
   *  der Button-State mit document.fullscreenElement synchron bleibt. */
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  /** Optional: öffnet den Tastenkombinationen-Hilfe-Dialog. Wird nicht
   *  übergeben, wenn der Parent den Dialog-State nicht verwaltet. */
  onOpenHelp?: () => void;
}

// Layoutlose Aktions-Gruppe für den Start-Screen: Level-Button, Dark-Mode-
// und Schwarzweiß-Toggle. Wird sowohl in der mobilen Kopfzeile (App.tsx)
// als auch in Board.tsx's Sidebar (Desktop) gerendert — der jeweilige
// Aufrufer bestimmt die Anordnung (horizontal/vertikal).
export function HomeActions({ onOpenLevels, blackAndWhiteMode, onToggleBlackAndWhite, currentLevel, isFullscreen, onToggleFullscreen, onOpenHelp }: HomeActionsProps) {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        leftIcon={<CopyIcon />}
        onClick={onOpenLevels}
        aria-label="Level"
      >
        {currentLevel !== undefined ? `Level ${currentLevel}` : 'Level'}
      </Button>
      <IconButton
        size="sm"
        variant="ghost"
        aria-label={colorMode === 'dark' ? 'Zu Hellmodus wechseln' : 'Zu Dunkelmodus wechseln'}
        icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
        onClick={toggleColorMode}
      />
      <IconButton
        size="sm"
        variant="ghost"
        aria-label={isFullscreen ? 'Vollbild verlassen' : 'Vollbild aktivieren'}
        icon={
          // Inline-SVG: zwei Pfeile in die Ecken — Standard-Vollbild-Glyph.
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            {isFullscreen ? (
              <>
                <path d="M5 1v4H1M11 1v4h4M5 15v-4H1M11 15v-4h4" />
              </>
            ) : (
              <>
                <path d="M1 5h4V1M15 5h-4V1M1 11h4v4M15 11h-4v4" />
              </>
            )}
          </svg>
        }
        onClick={onToggleFullscreen}
      />
      <IconButton
        size="sm"
        variant="ghost"
        aria-label={blackAndWhiteMode ? 'Farbmodus aktivieren' : 'Schwarzweiß-Modus aktivieren'}
        icon={blackAndWhiteMode ? <ViewIcon /> : <ViewOffIcon />}
        onClick={onToggleBlackAndWhite}
      />
      {onOpenHelp && (
        <Tooltip label="Tastenkombinationen (Drücke ?)" openDelay={200}>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Tastenkombinationen anzeigen"
            // Inline-SVG: stilisiertes "?" — konsistent mit dem Fullscreen-Toggle,
            // der auch ein Inline-SVG statt eines Chakra-Icons verwendet.
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.2 6.2c0-1 .8-1.9 1.8-1.9s1.8.9 1.8 1.9c0 .8-.5 1.3-1.1 1.7-.7.4-1.2.9-1.2 1.7V10" />
                <circle cx="7.5" cy="12.2" r="0.7" fill="currentColor" stroke="none" />
              </svg>
            }
            onClick={onOpenHelp}
          />
        </Tooltip>
      )}
    </>
  );
}

export default HomeActions;
