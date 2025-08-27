/**
 * Hook para otimização de performance
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import performanceService from '../services/PerformanceService';
import eventBus from '../utils/EventBus';

interface UsePerformanceReturn {
  // Cache
  cachedFetch: <T>(_key: string, fetcher: () => Promise<T>, ttl?: number) => Promise<T>;
  clearCache: () => void;
  
  // Lazy loading
  lazyLoad: (_componentPath: string) => Promise<unknown>;
  observeElement: (element: HTMLElement | null) => void;
  
  // Otimização
  debounce: <T extends (...args: Array<unknown>) => unknown>(func: T, _wait: number) => (...args: Parameters<T>) => void;
  throttle: <T extends (...args: Array<unknown>) => unknown>(func: T, _limit: number) => (...args: Parameters<T>) => void;
  optimizeImage: (_url: string, options?: unknown) => string;
  
  // Métricas
  metrics: {
    cacheHitRate: number;
    avgLoadTime: number;
    memoryUsage: number;
    lazyLoadedComponents: number;
  };
}

export const usePerformance = (): UsePerformanceReturn => {
  const [metrics, setMetrics] = useState(performanceService.getMetrics());
  // eventBus is already imported as singleton

  // Atualiza métricas
  useEffect(() => {
    const handleMetricsUpdate = (newMetrics) => {
      setMetrics(newMetrics);
    };

    eventBus.on('performance:metrics', handleMetricsUpdate);
    
    return () => {
      eventBus.off('performance:metrics', handleMetricsUpdate);
    };
  }, []);

  // Cached fetch
  const cachedFetch = useCallback(async <T,>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> => {
    return performanceService.cachedFetch(key, fetcher, { ttl });
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    performanceService.clearCache();
  }, []);

  // Lazy load
  const lazyLoad = useCallback((componentPath: string) => {
    return performanceService.lazyLoad(componentPath);
  }, []);

  // Observe element for lazy loading
  const observeElement = useCallback((element: HTMLElement | null) => {
    if (element) {
      performanceService.observe(element);
    }
  }, []);

  // Debounce
  const debounce = useCallback(<T extends (...args: Array<unknown>) => unknown>(
    func: T,
    wait: number
  ) => {
    return performanceService.debounce(func, wait);
  }, []);

  // Throttle
  const throttle = useCallback(<T extends (...args: Array<unknown>) => unknown>(
    func: T,
    limit: number
  ) => {
    return performanceService.throttle(func, limit);
  }, []);

  // Optimize image
  const optimizeImage = useCallback((url: string, options?: unknown) => {
    return performanceService.optimizeImage(url, options);
  }, []);

  return {
    cachedFetch,
    clearCache,
    lazyLoad,
    observeElement,
    debounce,
    throttle,
    optimizeImage,
    metrics
  };
};

// Hook para lazy loading de componentes
export const useLazyComponent = (componentPath: string, fallback?: React.ComponentType) => {
  const [Component, setComponent] = useState<React.ComponentType | null>(fallback || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    performanceService.lazyLoad(componentPath)
      .then(module => {
        if (mounted) {
          const loadedModule = module as { default?: React.ComponentType } | React.ComponentType;
          const actualComponent = (loadedModule as { default?: React.ComponentType }).default || (loadedModule as React.ComponentType);
          setComponent(actualComponent);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [componentPath]);

  return { Component, loading, error };
};

// Hook para virtual scrolling
export const useVirtualScroll = <T,>(
  items: T[],
  options: {
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
  }
) => {
  const { itemHeight, containerHeight, overscan = 3 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight);
  
  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(items.length - 1, visibleEnd + overscan);
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex
  };
};

// Hook para memoização com cache
export const useMemoizedValue = <T,>(
  factory: () => T,
  deps: React.DependencyList,
  options: {
    key?: string;
    ttl?: number;
  } = {}
): T => {
  const { key, ttl = 5 * 60 * 1000 } = options;
  const [value, setValue] = useState<T>(() => factory());
  const { cachedFetch } = usePerformance();

  useEffect(() => {
    if (key) {
      // Usa cache se key fornecida
      cachedFetch(
        `memo:${key}`,
        async () => factory(),
        ttl
      ).then(setValue);
    } else {
      // Sem cache, apenas recalcula
      setValue(factory());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
};

// Hook para debounced input
export const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const { debounce } = usePerformance();

  useEffect(() => {
    const updateValue = debounce(() => {
      setDebouncedValue(value);
    }, delay);

    updateValue();
  }, [value, delay, debounce]);

  return debouncedValue;
};

// Hook para throttled callback
export const useThrottledCallback = <T extends (...args: Array<unknown>) => unknown>(
  callback: T,
  delay: number
): T => {
  const { throttle } = usePerformance();
  const throttledCallback = useRef<T>();

  useEffect(() => {
    throttledCallback.current = throttle(callback, delay) as T;
  }, [callback, delay, throttle]);

  return throttledCallback.current || callback;
};

export default usePerformance;