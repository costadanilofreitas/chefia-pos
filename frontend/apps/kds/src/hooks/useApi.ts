import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export function useApi<T = any>(
  endpoint: string,
  options: UseApiOptions = {}
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const { immediate = true, onSuccess, onError } = options;

  const execute = useCallback(async (params?: any) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await ApiService.get<T>(endpoint, { params });
      setState({ data: response, loading: false, error: null });
      
      if (onSuccess) {
        onSuccess(response);
      }
      
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      
      if (onError) {
        onError(error);
      }
      
      throw error;
    }
  }, [endpoint, onSuccess, onError]);

  const mutate = useCallback(async (method: 'post' | 'put' | 'patch' | 'delete', data?: any) => {
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
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      
      if (onError) {
        onError(error);
      }
      
      throw error;
    }
  }, [endpoint, onSuccess, onError]);

  const refresh = useCallback(() => {
    return execute();
  }, [execute]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    execute,
    mutate,
    refresh,
    post: (data?: any) => mutate('post', data),
    put: (data?: any) => mutate('put', data),
    patch: (data?: any) => mutate('patch', data),
    delete: () => mutate('delete'),
  };
}