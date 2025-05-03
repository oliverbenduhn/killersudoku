import React, { useState, useEffect } from 'react';
import { Button, Box, ButtonProps, keyframes } from '@chakra-ui/react';

// Ripple Animation definieren
const rippleAnimation = keyframes`
  0% {
    transform: scale(0);
    opacity: 0.7;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
`;

interface RippleButtonProps extends ButtonProps {
  rippleColor?: string;
  duration?: number;
}

export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  rippleColor = 'rgba(255, 255, 255, 0.3)',
  duration = 600,
  ...props
}) => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [nextRippleId, setNextRippleId] = useState(0);

  // Ripple-Animation auslösen
  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const buttonRect = e.currentTarget.getBoundingClientRect();
    
    // Position des Klicks relativ zum Button
    const x = e.clientX - buttonRect.left;
    const y = e.clientY - buttonRect.top;
    
    // Neuer Ripple hinzufügen
    setRipples([...ripples, { id: nextRippleId, x, y }]);
    setNextRippleId(nextRippleId + 1);
  };

  // Ripples nach der Animation entfernen
  useEffect(() => {
    if (ripples.length > 0) {
      const timer = setTimeout(() => {
        setRipples(ripples.slice(1));
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [ripples, duration]);

  return (
    <Button
      {...props}
      position="relative"
      overflow="hidden"
      onClick={(e) => {
        createRipple(e);
        if (props.onClick) props.onClick(e);
      }}
    >
      {children}
      
      {/* Ripple-Elemente rendern */}
      {ripples.map(ripple => (
        <Box
          key={ripple.id}
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
          pointerEvents="none"
          zIndex={0}
        >
          <Box
            position="absolute"
            top={`${ripple.y}px`}
            left={`${ripple.x}px`}
            width="20px"
            height="20px"
            borderRadius="50%"
            bg={rippleColor}
            transform="translate(-50%, -50%)"
            animation={`${rippleAnimation} ${duration}ms ease-out`}
            sx={{
              animationFillMode: "forwards",
            }}
          />
        </Box>
      ))}
    </Button>
  );
};

export default RippleButton;