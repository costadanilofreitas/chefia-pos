import { useState, useEffect, useCallback } from 'react';
import { businessDayService, BusinessDay, BusinessDayCreate, BusinessDayClose, BusinessDaySummary } from '../services/BusinessDayService';

interface UseBusinessDayReturn {
  // Estado
  currentBusinessDay: BusinessDay | null;
  businessDays: BusinessDay[];
  summary: BusinessDaySummary | null;
  
  // Status
  loading: boolean;
  opening: boolean;
  closing: boolean;
  error: string | null;
  
  // Computed
  isOpen: boolean;
  isClosed: boolean;
  hasOpenDay: boolean;
  
  // Ações
  openBusinessDay: (data: BusinessDayCreate) => Promise<BusinessDay | null>;
  closeBusinessDay: (data: BusinessDayClose) => Promise<BusinessDay | null>;
  refreshCurrentBusinessDay: () => Promise<void>;
  loadBusinessDays: (startDate?: string, endDate?: string) => Promise<void>;
  loadSummary: (businessDayId: string) => Promise<void>;
  clearError: () => void;
}

export const useBusinessDay = (): UseBusinessDayReturn => {
  // Estados
  const [currentBusinessDay, setCurrentBusinessDay] = useState<BusinessDay | null>(null);
  const [businessDays, setBusinessDays] = useState<BusinessDay[]>([]);
  const [summary, setSummary] = useState<BusinessDaySummary | null>(null);
  
  // Status de loading
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed values
  const isOpen = currentBusinessDay?.status === 'OPEN';
  const isClosed = currentBusinessDay?.status === 'CLOSED';
  const hasOpenDay = currentBusinessDay !== null && isOpen;

  /**
   * Limpar erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Carregar dia operacional atual
   */
  const refreshCurrentBusinessDay = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const businessDay = await businessDayService.getCurrentBusinessDay();
      setCurrentBusinessDay(businessDay);
    } catch (err: any) {
      console.error('Erro ao carregar dia operacional atual:', err);
      setError(err.response?.data?.detail || 'Erro ao carregar dia operacional');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Abrir dia operacional
   */
  const openBusinessDay = useCallback(async (data: BusinessDayCreate): Promise<BusinessDay | null> => {
    try {
      setOpening(true);
      setError(null);
      
      const businessDay = await businessDayService.openBusinessDay(data);
      setCurrentBusinessDay(businessDay);
      
      console.log('✅ Dia operacional aberto com sucesso:', businessDay);
      return businessDay;
    } catch (err: any) {
      console.error('❌ Erro ao abrir dia operacional:', err);
      setError(err.response?.data?.detail || 'Erro ao abrir dia operacional');
      return null;
    } finally {
      setOpening(false);
    }
  }, []);

  /**
   * Fechar dia operacional
   */
  const closeBusinessDay = useCallback(async (data: BusinessDayClose): Promise<BusinessDay | null> => {
    if (!currentBusinessDay) {
      setError('Nenhum dia operacional aberto para fechar');
      return null;
    }

    try {
      setClosing(true);
      setError(null);
      
      const businessDay = await businessDayService.closeBusinessDay(currentBusinessDay.id, data);
      setCurrentBusinessDay(businessDay);
      
      console.log('✅ Dia operacional fechado com sucesso:', businessDay);
      return businessDay;
    } catch (err: any) {
      console.error('❌ Erro ao fechar dia operacional:', err);
      setError(err.response?.data?.detail || 'Erro ao fechar dia operacional');
      return null;
    } finally {
      setClosing(false);
    }
  }, [currentBusinessDay]);

  /**
   * Carregar lista de dias operacionais
   */
  const loadBusinessDays = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const days = await businessDayService.listBusinessDays(startDate, endDate);
      setBusinessDays(days);
    } catch (err: any) {
      console.error('Erro ao carregar dias operacionais:', err);
      setError(err.response?.data?.detail || 'Erro ao carregar dias operacionais');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Carregar resumo do dia operacional
   */
  const loadSummary = useCallback(async (businessDayId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const summaryData = await businessDayService.getBusinessDaySummary(businessDayId);
      setSummary(summaryData);
    } catch (err: any) {
      console.error('Erro ao carregar resumo do dia operacional:', err);
      setError(err.response?.data?.detail || 'Erro ao carregar resumo');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar dia operacional atual na inicialização
  useEffect(() => {
    refreshCurrentBusinessDay();
  }, [refreshCurrentBusinessDay]);

  return {
    // Estado
    currentBusinessDay,
    businessDays,
    summary,
    
    // Status
    loading,
    opening,
    closing,
    error,
    
    // Computed
    isOpen,
    isClosed,
    hasOpenDay,
    
    // Ações
    openBusinessDay,
    closeBusinessDay,
    refreshCurrentBusinessDay,
    loadBusinessDays,
    loadSummary,
    clearError,
  };
};

export default useBusinessDay;

