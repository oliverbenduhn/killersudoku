import React from 'react';
import { Box, Flex, Text, useBreakpointValue, Icon, IconButton } from '@chakra-ui/react';
import {
  ViewIcon,
  SettingsIcon,
  InfoIcon,
  HamburgerIcon,
  StarIcon
} from '@chakra-ui/icons';

interface NavItem {
  icon: React.ReactElement;
  label: string;
  action: () => void;
}

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tabName: string) => void;
  hidden?: boolean;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  hidden = false,
}) => {
  // Responsive Design für die Navigation
  const iconSize = useBreakpointValue({ base: 5, md: 6 }) || 5;
  const fontSize = useBreakpointValue({ base: "xs", md: "sm" }) || "xs";

  const navItems: Array<NavItem & { id: string }> = [
    {
      id: "home",
      icon: <Icon as={ViewIcon} boxSize={iconSize} />,
      label: "Start",
      action: () => onTabChange("home")
    },
    {
      id: "levels",
      icon: <Icon as={HamburgerIcon} boxSize={iconSize} />,
      label: "Level",
      action: () => onTabChange("levels")
    },
    {
      id: "stats",
      icon: <Icon as={StarIcon} boxSize={iconSize} />,
      label: "Statistik",
      action: () => onTabChange("stats")
    },
    {
      id: "info",
      icon: <Icon as={InfoIcon} boxSize={iconSize} />,
      label: "Info",
      action: () => onTabChange("info")
    },
    {
      id: "settings",
      icon: <Icon as={SettingsIcon} boxSize={iconSize} />,
      label: "Einstellungen",
      action: () => onTabChange("settings")
    }
  ];

  // Vollständiges Layout
  const renderFullNav = () => (
    <Box
      as="nav"
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      bg="surface.raised"
      boxShadow="glow"
      zIndex={1000}
      pb="env(safe-area-inset-bottom, 0px)"
      borderTop="1px solid"
      borderColor="surface.sunken"
    >
      <Flex
        height="100%"
        width="100%"
        maxWidth="container.xl"
        mx="auto"
        justifyContent="space-around"
        alignItems="center"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <Flex
              key={item.id}
              as="button"
              type="button"
              direction="column"
              alignItems="center"
              justifyContent="center"
              gap={1}
              flex={1}
              h="100%"
              minH="56px"
              onClick={item.action}
              bg="transparent"
              _hover={{ bg: 'surface.sunken' }}
              _active={{ bg: 'surface.sunken' }}
              borderRadius={0}
              color={isActive ? 'nav.active.text' : 'nav.inactive.text'}
              border="none"
              cursor="pointer"
              position="relative"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              transition="color 0.15s"
            >
              {isActive && (
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  width="64px"
                  height="40px"
                  bg="nav.active.bg"
                  borderRadius="full"
                  zIndex={-1}
                />
              )}
              <Box position="relative">{item.icon}</Box>
              <Text
                position="relative"
                fontSize={fontSize}
                fontWeight={isActive ? '600' : '500'}
                lineHeight="1.2"
              >
                {item.label}
              </Text>
            </Flex>
          );
        })}
      </Flex>
    </Box>
  );

  // Im versteckten Modus eine kleine FAB anbieten — öffnet die volle
  // Navigation als temporären Schwebebereich, damit der User Tab-Wechsel
  // nicht verliert. Ponytail: vereitelt eine Sackgasse bei hidden=true.
  const [open, setOpen] = React.useState(false);

  if (hidden) {
    return (
      <>
        <IconButton
          aria-label="Menü öffnen"
          icon={<HamburgerIcon />}
          position="fixed"
          bottom="env(safe-area-inset-bottom, 0px)"
          right={4}
          zIndex={1000}
          colorScheme="blue"
          borderRadius="full"
          size="lg"
          boxShadow="lg"
          onClick={() => setOpen((v) => !v)}
        />
        {open && (
          <Box
            position="fixed"
            bottom="calc(env(safe-area-inset-bottom, 0px) + 60px)"
            right={4}
            zIndex={1000}
            bg="surface.raised"
            borderRadius="lg"
            boxShadow="lg"
            p={2}
            minW="180px"
          >
            <Flex direction="column" gap={1}>
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <Flex
                    key={item.id}
                    as="button"
                    type="button"
                    alignItems="center"
                    gap={3}
                    px={3}
                    py={2}
                    borderRadius="md"
                    bg={isActive ? 'nav.active.bg' : 'transparent'}
                    color={isActive ? 'nav.active.text' : 'text.primary'}
                    _hover={{ bg: 'surface.sunken' }}
                    border="none"
                    cursor="pointer"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => { item.action(); setOpen(false); }}
                  >
                    {item.icon}
                    <Text fontSize="sm" fontWeight={isActive ? '600' : '500'}>{item.label}</Text>
                  </Flex>
                );
              })}
            </Flex>
          </Box>
        )}
      </>
    );
  }

  return renderFullNav();
};

export default BottomNavigation;
