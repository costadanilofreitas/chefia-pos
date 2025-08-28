/**
 * Auto-refresh hook to simplify interval management
 */

import { useEffect, useRef } from 'react';

interface UseAutoRefreshOptions {
  callback: () => void | Promise<void>;
  interval: number;
  enabled?: boolean;
  immediate?: boolean;
}

export const useAutoRefresh = ({
  callback,
  interval,
  enabled = true,
  immediate = true
}: UseAutoRefreshOptions) => {
  const savedCallback = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    // Execute immediately if requested
    if (immediate) {
      savedCallback.current();
    }

    // Setup interval
    const intervalId = setInterval(() => {
      savedCallback.current();
    }, interval);

    // Cleanup
    return () => clearInterval(intervalId);
  }, [enabled, interval, immediate]);
};