import { useState, useEffect, useRef, useCallback } from 'react';

interface UseVirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  getScrollElement?: () => HTMLElement | null;
}

export function useVirtualization<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
  getScrollElement
}: UseVirtualizationOptions & { items: T[] }) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLElement | null>(null);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  // Handle scroll
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Setup scroll listener
  useEffect(() => {
    const scrollElement = getScrollElement?.() || scrollElementRef.current;
    if (!scrollElement) return;

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [getScrollElement, handleScroll]);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    scrollElementRef
  };
}