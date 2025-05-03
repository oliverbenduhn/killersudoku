import React, { useRef, useEffect } from 'react';
import { Box, BoxProps } from '@chakra-ui/react';

interface FadeInViewProps extends BoxProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale';
  duration?: number;
  delay?: number;
  distance?: number;
}

export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  direction = 'up',
  duration = 500,
  delay = 0,
  distance = 20,
  ...props
}) => {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;

    // Initial-Zustand setzen
    let transform = '';
    switch (direction) {
      case 'up':
        transform = `translateY(${distance}px)`;
        break;
      case 'down':
        transform = `translateY(-${distance}px)`;
        break;
      case 'left':
        transform = `translateX(${distance}px)`;
        break;
      case 'right':
        transform = `translateX(-${distance}px)`;
        break;
      case 'scale':
        transform = `scale(0.9)`;
        break;
    }
    
    element.style.opacity = '0';
    element.style.transform = transform;
    element.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`;
    
    // Animation starten nach Verzögerung
    const timer = setTimeout(() => {
      element.style.opacity = '1';
      element.style.transform = 'translate(0) scale(1)';
    }, delay);
    
    return () => clearTimeout(timer);
  }, [direction, duration, delay, distance]);

  return (
    <Box ref={boxRef} willChange="opacity, transform" {...props}>
      {children}
    </Box>
  );
};

export default FadeInView;