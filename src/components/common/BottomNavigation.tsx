import React from 'react';
import { Box, Flex, Text, useBreakpointValue, Icon } from '@chakra-ui/react';
import { 
  ViewIcon, 
  SettingsIcon, 
  InfoIcon, 
  HamburgerIcon, 
  StarIcon 
} from '@chakra-ui/icons';
import RippleButton from '../common/RippleButton';

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
  const navHeight = useBreakpointValue({ base: "64px", md: "72px" }) || "64px";
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
      height={navHeight}
      bg="white"
      boxShadow="0 -1px 6px rgba(0,0,0,0.15)"
      zIndex={1000}
      pb="env(safe-area-inset-bottom, 0px)" // Für Geräte mit abgerundeten Ecken oder Notch
      borderTop="1px solid rgba(0,0,0,0.08)"
    >
      <Flex
        height="100%"
        width="100%"
        maxWidth="container.xl"
        mx="auto"
        justifyContent="space-around"
        alignItems="center"
      >
        {navItems.map((item) => (
          <Flex
            key={item.id}
            as={RippleButton}
            direction="column"
            alignItems="center"
            justifyContent="center"
            gap={1}
            flex={1}
            h="100%"
            px={0}
            py={0}
            minH={0}
            onClick={item.action}
            bg="transparent"
            _hover={{ bg: "rgba(0,0,0,0.03)" }}
            _active={{ bg: "rgba(0,0,0,0.05)" }}
            borderRadius={0}
            color={activeTab === item.id ? "#2196F3" : "gray.500"}
            rippleColor="rgba(33, 150, 243, 0.1)"
            duration={800}
            position="relative"
            overflow="hidden"
            variant="unstyled"
          >
            <Box>
              {item.icon}
            </Box>
            <Text 
              fontSize={fontSize} 
              fontWeight={activeTab === item.id ? "500" : "normal"}
              lineHeight="1.2"
            >
              {item.label}
            </Text>
            {activeTab === item.id && (
              <Box
                position="absolute"
                bottom={0}
                left="15%"
                right="15%"
                height="3px"
                width="70%"
                bg="#2196F3"
                borderRadius="3px 3px 0 0"
              />
            )}
          </Flex>
        ))}
      </Flex>
    </Box>
  );
};

export default BottomNavigation;
