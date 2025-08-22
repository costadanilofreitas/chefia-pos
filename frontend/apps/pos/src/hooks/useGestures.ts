import { useEffect, useRef, useCallback } from 'react';

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export interface PinchHandlers {
  onPinchIn?: (scale: number) => void;
  onPinchOut?: (scale: number) => void;
}

export interface LongPressHandlers {
  onLongPress?: () => void;
  delay?: number;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

const SWIPE_THRESHOLD = 50; // Minimum distance for swipe
const SWIPE_VELOCITY_THRESHOLD = 0.5; // Minimum velocity (px/ms)
const PINCH_THRESHOLD = 0.1; // Minimum scale change

/**
 * Hook for detecting swipe gestures
 */
export const useSwipe = (
  elementRef: React.RefObject<HTMLElement>,
  handlers: SwipeHandlers,
  options = { threshold: SWIPE_THRESHOLD, preventDefault: true }
) => {
  const touchStart = useRef<TouchPoint | null>(null);
  const touchEnd = useRef<TouchPoint | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (options.preventDefault) e.preventDefault();
      
      const touch = e.touches[0];
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now()
      };
      touchEnd.current = null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStart.current) return;
      
      const touch = e.touches[0];
      touchEnd.current = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now()
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current || !touchEnd.current) return;

      const deltaX = touchEnd.current.x - touchStart.current.x;
      const deltaY = touchEnd.current.y - touchStart.current.y;
      const deltaTime = touchEnd.current.timestamp - touchStart.current.timestamp;
      
      const velocityX = Math.abs(deltaX / deltaTime);
      const velocityY = Math.abs(deltaY / deltaTime);

      // Determine if it's a horizontal or vertical swipe
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
      
      if (isHorizontal && Math.abs(deltaX) > options.threshold && velocityX > SWIPE_VELOCITY_THRESHOLD) {
        if (deltaX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      } else if (!isHorizontal && Math.abs(deltaY) > options.threshold && velocityY > SWIPE_VELOCITY_THRESHOLD) {
        if (deltaY > 0) {
          handlers.onSwipeDown?.();
        } else {
          handlers.onSwipeUp?.();
        }
      }

      touchStart.current = null;
      touchEnd.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: !options.preventDefault });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, handlers, options]);
};

/**
 * Hook for detecting pinch gestures
 */
export const usePinch = (
  elementRef: React.RefObject<HTMLElement>,
  handlers: PinchHandlers,
  options = { preventDefault: true }
) => {
  const initialDistance = useRef<number | null>(null);
  const currentScale = useRef<number>(1);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const getDistance = (touches: TouchList): number => {
      const [touch1, touch2] = Array.from(touches);
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        if (options.preventDefault) e.preventDefault();
        initialDistance.current = getDistance(e.touches);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance.current) {
        if (options.preventDefault) e.preventDefault();
        
        const currentDistance = getDistance(e.touches);
        const scale = currentDistance / initialDistance.current;
        
        if (Math.abs(scale - currentScale.current) > PINCH_THRESHOLD) {
          if (scale > currentScale.current) {
            handlers.onPinchOut?.(scale);
          } else {
            handlers.onPinchIn?.(scale);
          }
          currentScale.current = scale;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialDistance.current = null;
        currentScale.current = 1;
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: !options.preventDefault });
    element.addEventListener('touchmove', handleTouchMove, { passive: !options.preventDefault });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, handlers, options]);
};

/**
 * Hook for detecting long press
 */
export const useLongPress = (
  callback: () => void,
  options: { delay?: number; preventDefault?: boolean } = {}
) => {
  const { delay = 500, preventDefault = true } = options;
  const timeout = useRef<NodeJS.Timeout>();
  const target = useRef<EventTarget>();

  const start = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      if (preventDefault && event.type === 'touchstart') {
        event.preventDefault();
      }
      
      target.current = event.currentTarget;
      timeout.current = setTimeout(() => {
        callback();
      }, delay);
    },
    [callback, delay, preventDefault]
  );

  const clear = useCallback(() => {
    timeout.current && clearTimeout(timeout.current);
    target.current = undefined;
  }, []);

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchEnd: clear,
    onTouchMove: clear
  };
};

/**
 * Hook for double tap detection
 */
export const useDoubleTap = (
  callback: () => void,
  delay = 300
) => {
  const lastTap = useRef<number>(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < delay) {
      callback();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }, [callback, delay]);

  return {
    onClick: handleTap,
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      handleTap();
    }
  };
};

/**
 * Combined gesture hook for all touch interactions
 */
export const useGestures = (
  elementRef: React.RefObject<HTMLElement>,
  options?: {
    swipe?: SwipeHandlers;
    pinch?: PinchHandlers;
    longPress?: LongPressHandlers;
    doubleTap?: () => void;
  }
) => {
  const { swipe, pinch, longPress, doubleTap } = options || {};

  // Use individual hooks
  if (swipe) {
    useSwipe(elementRef, swipe);
  }

  if (pinch) {
    usePinch(elementRef, pinch);
  }

  const longPressHandlers = longPress ? useLongPress(longPress.onLongPress || (() => {}), { delay: longPress.delay }) : {};
  const doubleTapHandlers = doubleTap ? useDoubleTap(doubleTap) : {};

  return {
    ...longPressHandlers,
    ...doubleTapHandlers
  };
};