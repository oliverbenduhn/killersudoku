import React, { useState, useEffect, useRef } from 'react';
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
  /**
   * Klick-Handler. Bewusst OHNE preventDefault/stopPropagation —
   * das Event bubbelt normal nach oben (Chakra-Button-Default).
   * Doppel-Klick löst erwartungsgemäß zwei onClick-Calls aus; falls
   * ein Caller das verhindern will, gehört das in seinen onClick,
   * nicht hier (Ponytail: API-Doku statt API-Lock).
   */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  rippleColor = 'rgba(255, 255, 255, 0.3)',
  duration = 600,
  ...props
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [nextRippleId, setNextRippleId] = useState(0);
  // Audit 🔴 #3-Fix: jeder Ripple hat seinen eigenen Timer, der genau diesen
  // Ripple nach `duration` entfernt. Vorher entfernte der Effect immer nur
  // die Liste-Kopfposition (`slice(1)`), was bei drei schnellen Klicks zwei
  // Ripples stehen ließ. Map nur für Unmount-Cleanup.
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // Ripple-Animation auslösen
  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const buttonRect = e.currentTarget.getBoundingClientRect();

    // Position des Klicks relativ zum Button
    const x = e.clientX - buttonRect.left;
    const y = e.clientY - buttonRect.top;

    setRipples(prev => [...prev, { id: nextRippleId, x, y }]);
    setNextRippleId(nextRippleId + 1);
  };

  // Audit 🔴 #3-Fix: pro Ripple EIN Timer, der NUR diesen Ripple entfernt.
  // Ponytail: Map nur für Unmount — bei Remount des Parents wären sonst
  // verwaiste Timer aktiv und könnten State-Updates auf eine unmontierte
  // Komponente feuern.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  // Cleanup-Hook für jeden einzelnen Ripple-Timer (siehe unten)
  useEffect(() => {
    // Wenn der `ripples`-State wächst, registriere pro neuem Ripple einen
    // Timer, der exakt diesen wieder rausnimmt.
    const timers = timersRef.current;
    const currentIds = new Set(ripples.map(r => r.id));
    // Nur Timer für Ripples registrieren, die noch nicht erfasst sind.
    currentIds.forEach(id => {
      if (timers.has(id)) return;
      const t = setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
        timers.delete(id);
      }, duration);
      timers.set(id, t);
    });
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