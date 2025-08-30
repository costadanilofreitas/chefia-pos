/**
 * Generic Data Manager Hook
 * Simplifies common data loading patterns with offline support
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '../services/logger';

interface UseDataManagerOptions<T> {
  storageKey: string;
  fetchOnline: () => Promise<T[]>;
  fetchOffline: () => Promise<T[]>;
  saveOffline?: (item: T) => Promise<void>;
  onNewItems?: (items: T[]) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
  compareId?: (a: T, b: T) => boolean;
}

interface DataManagerState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  isOnline: boolean;
}

interface DataManagerActions<T> {
  refresh: () => Promise<void>;
  updateItem: (id: any, updates: Partial<T>) => void;
  setData: React.Dispatch<React.SetStateAction<T[]>>;
  clearError: () => void;
}

export function useDataManager<T extends { id: string | number }>({
  storageKey,
  fetchOnline,
  fetchOffline,
  saveOffline,
  onNewItems,
  autoRefresh = false,
  refreshInterval = 30000,
  compareId = (a, b) => a.id === b.id,
}: UseDataManagerOptions<T>): DataManagerState<T> & DataManagerActions<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const previousDataRef = useRef<T[]>([]);

  // Load data with offline fallback
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let fetchedData: T[];

      if (isOnline) {
        try {
          // Try online first
          fetchedData = await fetchOnline();
          
          // Cache for offline use if saveOffline is provided
          if (saveOffline) {
            await Promise.all(fetchedData.map(item => saveOffline(item)));
          }
        } catch (onlineError) {
          logger.error(`Failed to fetch ${storageKey} online`, onlineError, 'useDataManager');
          // Fall back to offline
          fetchedData = await fetchOffline();
          setError('Usando dados em cache (modo offline)');
        }
      } else {
        // Offline mode
        fetchedData = await fetchOffline();
      }

      // Check for new items
      if (onNewItems && previousDataRef.current.length > 0) {
        const newItems = fetchedData.filter(
          item => !previousDataRef.current.some(prev => compareId(prev, item))
        );
        if (newItems.length > 0) {
          onNewItems(newItems);
        }
      }

      previousDataRef.current = fetchedData;
      setData(fetchedData);
    } catch (err) {
      const errorMessage = `Não foi possível carregar ${storageKey}`;
      setError(errorMessage);
      logger.error(errorMessage, err, 'useDataManager');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, storageKey]);

  // Update single item optimistically
  const updateItem = useCallback((id: string | number, updates: Partial<T>) => {
    setData(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      logger.info('Connection restored', 'useDataManager');
      loadData(); // Reload when online
    };

    const handleOffline = () => {
      setIsOnline(false);
      logger.info('Connection lost', 'useDataManager');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadData, refreshInterval);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshInterval]);

  return {
    data,
    loading,
    error,
    isOnline,
    refresh: loadData,
    updateItem,
    setData,
    clearError,
  };
}