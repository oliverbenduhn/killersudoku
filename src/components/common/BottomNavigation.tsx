import React from 'react';
import { Box, Flex, Text, useBreakpointValue, Icon } from '@chakra-ui/react';
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
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ 
  activeTab,
  onTabChange
}) => {
  // Responsive Design für die Navigation
  const iconSize = useBreakpointValue({ base: 5, md: 6 }) || 5;
  const fontSize = useBreakpointValue({ base: "xs", md: "sm" }) || "xs";
  
  // Navigation Items definieren
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

  return (
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
              {/* Pill hinter Icon + Label für aktiven Tab. Modernes iOS/Material-3-Pattern. */}
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
};

export default BottomNavigation;
