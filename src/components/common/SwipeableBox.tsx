import React, { useState, useRef, useEffect } from 'react';
import { Box, BoxProps } from '@chakra-ui/react';

interface SwipeableBoxProps extends BoxProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  swipeThreshold?: number;
  animateSwipe?: boolean;
  children: React.ReactNode;
}

const SwipeableBox: React.FC<SwipeableBoxProps> = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  swipeThreshold = 50,
  animateSwipe = true,
  children,
  ...props
}) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [currentTranslate, setCurrentTranslate] = useState({ x: 0, y: 0 });
  const [swiping, setSwiping] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Touch-Handler
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null || touchStartY === null || !swiping) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX;
    const diffY = currentY - touchStartY;

    // Nur animieren, wenn gewünscht und nicht zu weit gezogen wird
    if (animateSwipe) {
      // Begrenzen der Bewegung (Widerstand bei größerer Entfernung)
      const resistanceFactorX = Math.min(1, Math.abs(diffX) / 200);
      const resistanceFactorY = Math.min(1, Math.abs(diffY) / 200);
      
      setCurrentTranslate({
        x: diffX * resistanceFactorX * 0.5,
        y: diffY * resistanceFactorY * 0.5
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null || touchStartY === null || !swiping) return;

    const currentX = e.changedTouches[0].clientX;
    const currentY = e.changedTouches[0].clientY;
    const diffX = currentX - touchStartX;
    const diffY = currentY - touchStartY;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    // Swipe-Richtung bestimmen
    if (absX > absY && absX > swipeThreshold) {
      if (diffX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (diffX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    } else if (absY > absX && absY > swipeThreshold) {
      if (diffY > 0 && onSwipeDown) {
        onSwipeDown();
      } else if (diffY < 0 && onSwipeUp) {
        onSwipeUp();
      }
    }

    // Zurücksetzen der Animation
    setCurrentTranslate({ x: 0, y: 0 });
    setTouchStartX(null);
    setTouchStartY(null);
    setSwiping(false);
  };

  return (
    <Box
      ref={boxRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translate(${currentTranslate.x}px, ${currentTranslate.y}px)`,
        transition: swiping ? 'none' : 'transform 0.3s ease-out'
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

export default SwipeableBox;