import { Button, IconButton, useColorMode } from '@chakra-ui/react';
import { CopyIcon, MoonIcon, SunIcon, ViewIcon, ViewOffIcon } from '@chakra-ui/icons';

export interface HomeActionsProps {
  onOpenLevels: () => void;
  blackAndWhiteMode: boolean;
  onToggleBlackAndWhite: () => void;
  /** Aktuelle Levelnummer — wird neben dem Level-Button als Badge
   *  angezeigt, damit der Spieler ohne Levels-Tab weiß, wo er ist. */
  currentLevel?: number;
}

// Layoutlose Aktions-Gruppe für den Start-Screen: Level-Button, Dark-Mode-
// und Schwarzweiß-Toggle. Wird sowohl in der mobilen Kopfzeile (App.tsx)
// als auch in Board.tsx's Sidebar (Desktop) gerendert — der jeweilige
// Aufrufer bestimmt die Anordnung (horizontal/vertikal).
export function HomeActions({ onOpenLevels, blackAndWhiteMode, onToggleBlackAndWhite, currentLevel }: HomeActionsProps) {
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
        aria-label={blackAndWhiteMode ? 'Farbmodus aktivieren' : 'Schwarzweiß-Modus aktivieren'}
        icon={blackAndWhiteMode ? <ViewIcon /> : <ViewOffIcon />}
        onClick={onToggleBlackAndWhite}
      />
    </>
  );
}

export default HomeActions;
