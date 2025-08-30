import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions<T = unknown> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useApi<T = unknown>(
  endpoint: string,
  options: UseApiOptions<T> = {}
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const { immediate = true, onSuccess, onError } = options;

  const execute = useCallback(async (params?: Record<string, unknown>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await ApiService.get<T>(endpoint, { params });
      setState({ data: response, loading: false, error: null });
      
      if (onSuccess) {
        onSuccess(response);
      }
      
      return response;
    } catch (error) {
      const err = error as Error & { response?: { data?: { message?: string } } };
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      
      if (onError) {
        onError(err);
      }
      
      throw error;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const mutate = useCallback(async (method: 'post' | 'put' | 'patch' | 'delete', data?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      let response: T;
      
      switch (method) {
        case 'post':
          response = await ApiService.post<T>(endpoint, data);
          break;
        case 'put':
          response = await ApiService.put<T>(endpoint, data);
          break;
        case 'patch':
          response = await ApiService.patch<T>(endpoint, data);
          break;
        case 'delete':
          response = await ApiService.delete<T>(endpoint);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
      
      setState({ data: response, loading: false, error: null });
      
      if (onSuccess) {
        onSuccess(response);
      }
      
      return response;
    } catch (error) {
      const err = error as Error & { response?: { data?: { message?: string } } };
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      
      if (onError) {
        onError(err);
      }
      
      throw error;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const refresh = useCallback(() => {
    return execute();
  }, [execute]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate]);

  return {
    ...state,
    execute,
    mutate,
    refresh,
    post: (data?: unknown) => mutate('post', data),
    put: (data?: unknown) => mutate('put', data),
    patch: (data?: unknown) => mutate('patch', data),
    delete: () => mutate('delete'),
  };
}