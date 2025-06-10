import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useApi } from './useApi';

type BusinessDay = {
  id: string;
  opened_at: string;
  closed_at: string | null;
  status: 'open' | 'closed';
  opening_notes?: string;
  closing_notes?: string;
  terminal_id?: string;
  store_id?: string;
  total_orders?: number;
  total_sales?: number;
};

type OpenBusinessDayData = {
  notes?: string;
  terminal_id?: string;
  store_id?: string;
};

type CloseBusinessDayData = {
  notes?: string;
};

type BusinessDayContextType = {
  currentBusinessDay: BusinessDay | null;
  loading: boolean;
  error: string | null;
  openBusinessDay: (data: OpenBusinessDayData) => Promise<BusinessDay>;
  closeBusinessDay: (data: CloseBusinessDayData) => Promise<BusinessDay>;
  getCurrentBusinessDay: () => Promise<BusinessDay | null>;
  resetBusinessDay: () => void;
};

const BusinessDayContext = createContext<BusinessDayContextType | null>(null);

type BusinessDayProviderProps = {
  children: ReactNode;
};

export const BusinessDayProvider = ({ children }: BusinessDayProviderProps) => {
  const { get, post } = useApi();
  const [currentBusinessDay, setCurrentBusinessDay] = useState<BusinessDay | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentBusinessDay = useCallback(async (): Promise<BusinessDay | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await get<BusinessDay | null>('/api/business-day/current');
      setCurrentBusinessDay(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('Erro ao obter dia de operação:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [get]);

  const openBusinessDay = useCallback(async (data: OpenBusinessDayData): Promise<BusinessDay> => {
    setLoading(true);
    setError(null);
    try {
      const { data: businessDay } = await post<BusinessDay>('/api/business-day/open', data);
      setCurrentBusinessDay(businessDay);
      return businessDay;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('Erro ao abrir dia de operação:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [post]);

  const closeBusinessDay = useCallback(async (data: CloseBusinessDayData): Promise<BusinessDay> => {
    if (!currentBusinessDay) {
      throw new Error('Não há dia de operação aberto para fechar');
    }

    setLoading(true);
    setError(null);
    try {
      const payload = { ...data, id: currentBusinessDay.id };
      const { data: closedDay } = await post<BusinessDay>('/api/business-day/close', payload);
      setCurrentBusinessDay(closedDay);
      return closedDay;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('Erro ao fechar dia de operação:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentBusinessDay, post]);

  const resetBusinessDay = useCallback(() => {
    setCurrentBusinessDay(null);
    setError(null);
  }, []);

  useEffect(() => {
    getCurrentBusinessDay();
  }, [getCurrentBusinessDay]);

  const value: BusinessDayContextType = {
    currentBusinessDay,
    loading,
    error,
    openBusinessDay,
    closeBusinessDay,
    getCurrentBusinessDay,
    resetBusinessDay,
  };

  return <BusinessDayContext.Provider value={value}>{children}</BusinessDayContext.Provider>;
};

export const useBusinessDay = (): BusinessDayContextType => {
  const context = useContext(BusinessDayContext);
  if (!context) {
    throw new Error('useBusinessDay deve ser usado dentro de um BusinessDayProvider');
  }
  return context;
};

export default useBusinessDay;
