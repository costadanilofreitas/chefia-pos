import { useState, useEffect, useCallback } from 'react';
import { businessDayService, BusinessDay, BusinessDayCreate, BusinessDayClose, BusinessDaySummary } from '../services/BusinessDayService';
import { getApiErrorMessage } from '../types/error';
import { requestCache } from '../services/RequestCache';

// Singleton para garantir que dia operacional seja carregado apenas uma vez
let globalLoadPromise: Promise<BusinessDay | null> | null = null;
let globalHasLoaded = false;

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
  loadSummary: (_businessDayId: string) => Promise<void>;
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
  const [, setHasInitialized] = useState(false);

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
   * Carregar dia operacional atual com cache
   */
  const refreshCurrentBusinessDay = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Usar cache para evitar requisições duplicadas
      const businessDay = await requestCache.execute(
        'business-day-current',
        () => businessDayService.getCurrentBusinessDay(),
        { ttl: 30 * 1000 } // Cache de 30 segundos
      );
      setCurrentBusinessDay(businessDay);
      setHasInitialized(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setHasInitialized(true); // Marcar como inicializado mesmo com erro
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
      return businessDay;
    } catch (err) {
      setError(getApiErrorMessage(err));
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
      return businessDay;
    } catch (err) {
      setError(getApiErrorMessage(err));
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
    } catch (err) {
      setError(getApiErrorMessage(err));
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
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar dia operacional atual com singleton
  useEffect(() => {
    let isCancelled = false;
    
    const loadInitial = async () => {
      // Se já carregou globalmente, apenas retornar
      if (globalHasLoaded) {
        try {
          const cachedDay = await requestCache.execute(
            'business-day-current',
            () => businessDayService.getCurrentBusinessDay(),
            { ttl: 30 * 1000 }
          );
          if (!isCancelled) {
            setCurrentBusinessDay(cachedDay);
            setHasInitialized(true);
          }
        } catch (err) {
          if (!isCancelled) {
            setError(getApiErrorMessage(err));
            setHasInitialized(true);
          }
        }
        return;
      }
      
      // Se já existe uma promise global de carregamento, aguardar ela
      if (globalLoadPromise) {
        setLoading(true);
        try {
          const businessDay = await globalLoadPromise;
          if (!isCancelled) {
            setCurrentBusinessDay(businessDay);
            setHasInitialized(true);
          }
        } catch (err) {
          if (!isCancelled) {
            setError(getApiErrorMessage(err));
            setHasInitialized(true);
          }
        } finally {
          if (!isCancelled) {
            setLoading(false);
          }
        }
        return;
      }
      
      // Primeira vez carregando - criar promise global
      setLoading(true);
      setError(null);
      
      globalLoadPromise = requestCache.execute(
        'business-day-current',
        () => businessDayService.getCurrentBusinessDay(),
        { ttl: 30 * 1000 }
      ).then(businessDay => {
        globalHasLoaded = true;
        return businessDay;
      }).catch(err => {
        // Em caso de erro, resetar para permitir retry
        globalLoadPromise = null;
        globalHasLoaded = false;
        throw err;
      });
      
      try {
        const businessDay = await globalLoadPromise;
        if (!isCancelled) {
          setCurrentBusinessDay(businessDay);
          setHasInitialized(true);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(getApiErrorMessage(err));
          setHasInitialized(true);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    
    loadInitial();
    
    return () => {
      isCancelled = true;
    };
  }, []); // Executar apenas uma vez na montagem

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

