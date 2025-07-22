// src/hooks/mocks/useBusinessDay.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTerminalConfig } from '../useTerminalConfig';
import { createApiClient } from '../../services/ApiClient';

export interface BusinessDay {
  id: string;
  store_id: string;
  date: string;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
  opened_by: string;
  closed_by?: string;
  total_sales?: number;
  total_orders?: number;
}

export const useBusinessDay = () => {
  const { config } = useTerminalConfig();
  const [currentDay, setCurrentDay] = useState<BusinessDay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoizar apiClient para evitar recriação desnecessária
  const apiClient = useMemo(() => {
    return config ? createApiClient(config) : null;
  }, [config]);

  const openDay = useCallback(async (data?: { store_id?: string; notes?: string }) => {
    if (!apiClient || !config) {
      throw new Error('API client not initialized');
    }

    try {
      setLoading(true);
      setError(null);
      
      const dayData = {
        store_id: data?.store_id || config.store_id,
        date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
      };
      
      const day = await apiClient.businessDay.open(dayData);
      setCurrentDay(day);
      
      return day;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open business day';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiClient, config]);

  const closeDay = useCallback(async (data?: { notes?: string }) => {
    if (!apiClient || !currentDay) {
      throw new Error('No active business day to close');
    }

    try {
      setLoading(true);
      setError(null);
      
      const closedDay = await apiClient.businessDay.close(currentDay.id);
      setCurrentDay(closedDay);
      
      return closedDay;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close business day';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiClient, currentDay]);

  const getCurrentDay = useCallback(async () => {
    if (!apiClient) {
      return null;
    }

    try {
      const day = await apiClient.businessDay.getCurrent();
      setCurrentDay(day);
      return day;
    } catch (err) {
      console.error('Failed to get current business day:', err);
      return null;
    }
  }, [apiClient]);

  // Carregar dia atual na inicialização - apenas uma vez quando apiClient estiver disponível
  useEffect(() => {
    if (apiClient && !currentDay) {
      getCurrentDay();
    }
  }, [apiClient, getCurrentDay, currentDay]);

  return {
    currentDay,
    currentBusinessDay: currentDay, // Alias para compatibilidade
    loading,
    error,
    openDay,
    closeDay,
    getCurrentDay,
    isOpen: currentDay?.status === 'open'
  };
};

