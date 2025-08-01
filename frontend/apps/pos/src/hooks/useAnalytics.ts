/**
 * Hook para gerenciar dados de analytics e métricas do dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import analyticsService, { DashboardMetrics, AnalyticsSummary } from '../services/AnalyticsService';

interface UseAnalyticsReturn {
  // Estados
  metrics: DashboardMetrics | null;
  summary: AnalyticsSummary | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Ações
  refreshMetrics: () => Promise<void>;
  loadSummary: () => Promise<void>;
  simulateSale: (amount: number) => Promise<void>;
  
  // Utilitários
  formatCurrency: (value: number) => string;
  formatPercentage: (value: number) => string;
}

export const useAnalytics = (autoRefresh: boolean = true, refreshInterval: number = 30000): UseAnalyticsReturn => {
  // Estados
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Função para carregar métricas básicas
  const refreshMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const newMetrics = await analyticsService.getDashboardMetrics();
      setMetrics(newMetrics);
      setLastUpdated(new Date());
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar métricas';
      setError(errorMessage);
      console.error('Erro ao carregar métricas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para carregar resumo completo
  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const newSummary = await analyticsService.getAnalyticsSummary();
      setSummary(newSummary);
      setLastUpdated(new Date());
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar resumo';
      setError(errorMessage);
      console.error('Erro ao carregar resumo:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para simular venda
  const simulateSale = useCallback(async (amount: number) => {
    try {
      setLoading(true);
      setError(null);
      
      await analyticsService.simulateSale(amount);
      
      // Atualiza métricas após simular venda
      await refreshMetrics();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao simular venda';
      setError(errorMessage);
      console.error('Erro ao simular venda:', err);
    } finally {
      setLoading(false);
    }
  }, [refreshMetrics]);

  // Função para formatar moeda
  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }, []);

  // Função para formatar porcentagem
  const formatPercentage = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  }, []);

  // Carregamento inicial
  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshMetrics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshMetrics]);

  return {
    // Estados
    metrics,
    summary,
    loading,
    error,
    lastUpdated,

    // Ações
    refreshMetrics,
    loadSummary,
    simulateSale,

    // Utilitários
    formatCurrency,
    formatPercentage
  };
};

export default useAnalytics;

