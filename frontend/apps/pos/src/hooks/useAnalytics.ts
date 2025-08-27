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
  
  // Utilitários
  formatCurrency: (value: number) => string;
  formatPercentage: (__value: number) => string;
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
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para carregar resumo completo
  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const metrics = await analyticsService.getDashboardMetrics();
      // Convert DashboardMetrics to AnalyticsSummary format
      const newSummary: AnalyticsSummary = {
        revenue: {
          total: metrics.totalRevenue,
          today: metrics.totalRevenue,
          yesterday: 0,
          thisWeek: 0,
          thisMonth: 0,
          growth: {
            daily: 0,
            weekly: 0,
            monthly: 0
          }
        },
        orders: {
          total: metrics.todayOrders,
          today: metrics.todayOrders,
          yesterday: 0,
          thisWeek: 0,
          thisMonth: 0,
          averagePerDay: metrics.todayOrders,
          growth: {
            daily: 0,
            weekly: 0,
            monthly: 0
          }
        },
        cashiers: {
          openCashiers: metrics.openCashiers,
          totalCashiers: 0,
          cashierDetails: []
        },
        lastUpdated: new Date().toISOString()
      };
      setSummary(newSummary);
      setLastUpdated(new Date());
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar resumo';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);



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

    // Utilitários
    formatCurrency,
    formatPercentage
  };
};

export default useAnalytics;

