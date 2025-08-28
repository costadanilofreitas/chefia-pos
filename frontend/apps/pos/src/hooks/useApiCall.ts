/**
 * Reusable API call hook to reduce repetitive code
 * Simplifies error handling and loading states
 */

import { useState, useCallback } from 'react';
import { useToast } from '../components/Toast';
import { requestCache } from '../services/RequestCache';
import eventBus from '../utils/EventBus';

interface ApiCallOptions {
  successMessage?: string;
  errorMessage?: string;
  invalidateCache?: string | string[];
  emitEvent?: { name: string; data?: any };
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export const useApiCall = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { success: showSuccess, error: showError } = useToast();

  const execute = useCallback(async <T = any>(
    apiCall: () => Promise<T>,
    options: ApiCallOptions = {}
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      
      // Show success message if provided
      if (options.successMessage) {
        showSuccess(options.successMessage);
      }
      
      // Invalidate cache patterns
      if (options.invalidateCache) {
        const patterns = Array.isArray(options.invalidateCache) 
          ? options.invalidateCache 
          : [options.invalidateCache];
        
        patterns.forEach(pattern => {
          requestCache.invalidatePattern(pattern);
        });
      }
      
      // Emit event if specified
      if (options.emitEvent) {
        eventBus.emit(options.emitEvent.name, options.emitEvent.data || result);
      }
      
      // Call success callback
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (err: any) {
      setError(err);
      
      // Show error message
      const message = options.errorMessage || err.message || 'An error occurred';
      showError(message);
      
      // Call error callback
      if (options.onError) {
        options.onError(err);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    execute,
    loading,
    error,
    reset
  };
};