import { useEffect, useRef, useState, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  enabled?: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  enabled = true
}: UsePullToRefreshOptions) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    // Check isRefreshing using ref to avoid stale closure
    setIsRefreshing(prev => {
      if (prev) return prev;
      
      // Only trigger if scrolled to top
      if (window.scrollY !== 0) return prev;
      
      if (e.touches[0]) {
        startY.current = e.touches[0].clientY;
      }
      setIsPulling(true);
      return prev;
    });
  }, [enabled]); // Removed isRefreshing dependency
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    // Use functional update to check current state
    setIsPulling(pulling => {
      if (!pulling) return pulling;
      
      setIsRefreshing(refreshing => {
        if (refreshing) return refreshing;
        
        if (e.touches[0]) {
          currentY.current = e.touches[0].clientY;
        }
        const distance = currentY.current - (startY.current || 0);
        
        if (distance > 0) {
          // Prevent default scrolling when pulling down
          e.preventDefault();
          
          // Apply resistance formula for natural feel
          const resistance = Math.min(distance / 2, threshold * 1.5);
          setPullDistance(resistance);
        }
        return refreshing;
      });
      return pulling;
    });
  }, [enabled, threshold]); // Removed state dependencies
  
  const handleTouchEnd = useCallback(async () => {
    if (!enabled) return;
    
    // Use functional updates to get current state
    setIsPulling(pulling => {
      if (!pulling) return false;
      
      setPullDistance(distance => {
        if (distance >= threshold) {
          setIsRefreshing(true);
          
          // Run refresh asynchronously
          (async () => {
            try {
              await onRefresh();
            } finally {
              setIsRefreshing(false);
            }
          })();
        }
        return 0;
      });
      
      return false;
    });
  }, [enabled, threshold, onRefresh]); // Removed state dependencies
  
  useEffect(() => {
    if (!enabled) return;
    
    const options = { passive: false };
    
    document.addEventListener('touchstart', handleTouchStart, options);
    document.addEventListener('touchmove', handleTouchMove, options);
    document.addEventListener('touchend', handleTouchEnd, options);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]); // Handlers are stable now, no need as dependencies
  
  return {
    isPulling,
    pullDistance,
    isRefreshing,
    pullProgress: Math.min((pullDistance / threshold) * 100, 100)
  };
};

export default usePullToRefresh;