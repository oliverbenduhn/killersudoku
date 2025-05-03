import React, { useState, useEffect } from 'react';
import { Box, keyframes } from '@chakra-ui/react';

// Touch Ripple Animation
const touchRippleEffect = keyframes`
  0% {
    transform: scale(0);
    opacity: 0.5;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
`;

export type TouchPosition = {
  x: number;
  y: number;
  id: number;
};

interface TouchRippleProps {
  color?: string;
  duration?: number;
}

export const TouchRipple: React.FC<TouchRippleProps> = ({
  color = 'rgba(255, 255, 255, 0.4)',
  duration = 850
}) => {
  const [ripples, setRipples] = useState<TouchPosition[]>([]);
  const [nextId, setNextId] = useState(0);

  useEffect(() => {
    // Touch-Event-Listener hinzufügen
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const newRipple = {
        x: touch.clientX,
        y: touch.clientY,
        id: nextId
      };
      
      setRipples([...ripples, newRipple]);
      setNextId(nextId + 1);
    };

    // Auf dem ganzen Dokument registrieren
    document.addEventListener('touchstart', handleTouchStart);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [ripples, nextId]);

  // Ripples entfernen, nachdem die Animation abgeschlossen ist
  useEffect(() => {
    if (ripples.length > 0) {
      const timer = setTimeout(() => {
        setRipples(ripples.slice(1));
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [ripples, duration]);

  return (
    <>
      {ripples.map((ripple) => (
        <Box
          key={ripple.id}
          position="fixed"
          top={0}
          left={0}
          width="100vw"
          height="100vh"
          pointerEvents="none"
          zIndex={9999}
        >
          <Box
            position="absolute"
            top={`${ripple.y}px`}
            left={`${ripple.x}px`}
            width="25px"
            height="25px"
            borderRadius="50%"
            bg={color}
            transform="translate(-50%, -50%)"
            animation={`${touchRippleEffect} ${duration}ms ease-out`}
            sx={{ animationFillMode: "forwards" }}
          />
        </Box>
      ))}
    </>
  );
};

export default TouchRipple;