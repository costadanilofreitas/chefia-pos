import { memo, useRef, useState, useCallback } from 'react';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
  haptic?: boolean;
}

/**
 * Swipeable card component for touch gestures
 */
export const SwipeableCard = memo<SwipeableCardProps>(({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className = '',
  haptic = true
}) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [swiping, setSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  
  const hapticFeedback = useHapticFeedback();
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    if (touch) {
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY
      });
      setSwiping(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart || !swiping) return;

    const touch = e.targetTouches[0];
    if (!touch) return;

    const currentTouch = {
      x: touch.clientX,
      y: touch.clientY
    };

    setTouchEnd(currentTouch);

    // Calculate swipe distance
    const deltaX = currentTouch.x - touchStart.x;
    const deltaY = currentTouch.y - touchStart.y;

    // Determine swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    } else {
      setSwipeDirection(deltaY > 0 ? 'down' : 'up');
    }

    // Apply visual feedback
    if (cardRef.current) {
      const translateX = deltaX * 0.3;
      const translateY = deltaY * 0.3;
      const rotation = deltaX * 0.1;
      
      cardRef.current.style.transform = `
        translateX(${translateX}px) 
        translateY(${translateY}px) 
        rotate(${rotation}deg)
      `;
      cardRef.current.style.opacity = `${1 - Math.abs(deltaX) / 500}`;
    }
  }, [touchStart, swiping]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) {
      setSwiping(false);
      return;
    }

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;

    // Check if swipe exceeds threshold
    if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > threshold && onSwipeRight) {
          if (haptic) hapticFeedback.success();
          onSwipeRight();
        } else if (deltaX < -threshold && onSwipeLeft) {
          if (haptic) hapticFeedback.success();
          onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > threshold && onSwipeDown) {
          if (haptic) hapticFeedback.success();
          onSwipeDown();
        } else if (deltaY < -threshold && onSwipeUp) {
          if (haptic) hapticFeedback.success();
          onSwipeUp();
        }
      }
    }

    // Reset card position
    if (cardRef.current) {
      cardRef.current.style.transform = '';
      cardRef.current.style.opacity = '';
      cardRef.current.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      
      setTimeout(() => {
        if (cardRef.current) {
          cardRef.current.style.transition = '';
        }
      }, 300);
    }

    // Reset state
    setTouchStart(null);
    setTouchEnd(null);
    setSwiping(false);
    setSwipeDirection(null);
  }, [touchStart, touchEnd, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, haptic, hapticFeedback]);

  return (
    <div
      ref={cardRef}
      className={`
        touch-none select-none
        transition-shadow duration-200
        ${swiping ? 'cursor-grabbing' : 'cursor-grab'}
        ${className}
      `}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
      
      {/* Swipe indicator */}
      {swiping && swipeDirection && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className={`
            px-4 py-2 rounded-full text-white font-semibold text-sm
            ${swipeDirection === 'left' ? 'bg-red-500' : ''}
            ${swipeDirection === 'right' ? 'bg-green-500' : ''}
            ${swipeDirection === 'up' ? 'bg-blue-500' : ''}
            ${swipeDirection === 'down' ? 'bg-yellow-500' : ''}
          `}>
            {swipeDirection === 'left' && 'Remover'}
            {swipeDirection === 'right' && 'Adicionar'}
            {swipeDirection === 'up' && 'Detalhes'}
            {swipeDirection === 'down' && 'Fechar'}
          </div>
        </div>
      )}
    </div>
  );
});