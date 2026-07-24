import { Button, IconButton, useColorMode } from '@chakra-ui/react';
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
}

// Layoutlose Aktions-Gruppe für den Start-Screen: Level-Button, Dark-Mode-
// und Schwarzweiß-Toggle. Wird sowohl in der mobilen Kopfzeile (App.tsx)
// als auch in Board.tsx's Sidebar (Desktop) gerendert — der jeweilige
// Aufrufer bestimmt die Anordnung (horizontal/vertikal).
export function HomeActions({ onOpenLevels, blackAndWhiteMode, onToggleBlackAndWhite, currentLevel, isFullscreen, onToggleFullscreen }: HomeActionsProps) {
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
    </>
  );
}

export default HomeActions;
