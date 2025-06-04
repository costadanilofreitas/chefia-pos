import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CashierStatus, CashMovementData, OpenCashierData, CloseCashierData, SaleData } from '../types/cashier';
import { useApi } from '../../core/hooks/useApi';

interface CashierContextType {
  cashierStatus: CashierStatus | null;
  cashierHistory: CashierStatus[];
  isLoading: boolean;
  error: string | null;
  getCurrentCashier: () => Promise<CashierStatus | null>;
  openCashier: (cashierData: OpenCashierData) => Promise<CashierStatus>;
  closeCashier: (closingData: CloseCashierData) => Promise<CashierStatus>;
  registerSale: (saleData: SaleData) => Promise<CashierStatus>;
  registerCashOut: (cashOutData: CashMovementData) => Promise<CashierStatus>;
  registerCashIn: (cashInData: CashMovementData) => Promise<CashierStatus>;
  getCashierHistory: () => Promise<CashierStatus[]>;
  getOpenCashiers: () => Promise<CashierStatus[]>;
}

const CashierContext = createContext<CashierContextType | undefined>(undefined);

export const CashierProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const api = useApi();
  const [cashierStatus, setCashierStatus] = useState<CashierStatus | null>(null);
  const [cashierHistory, setCashierHistory] = useState<CashierStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApiCall = useCallback(async <T,>(
    apiCall: () => Promise<T>,
    onSuccess: (data: T) => void
  ): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiCall();
      onSuccess(data);
      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro desconhecido';
      setError(errorMessage);
      console.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCurrentCashier = useCallback(async (): Promise<CashierStatus | null> => {
    return handleApiCall(
      () => api.get<CashierStatus>('/cashiers/current').then((res) => res.data),
      (data) => setCashierStatus(data)
    );
  }, [api, handleApiCall]);

  const openCashier = useCallback(async (cashierData: OpenCashierData): Promise<CashierStatus> => {
    return handleApiCall(
      () => api.post<CashierStatus>('/cashiers/open', cashierData).then((res) => res.data),
      (data) => setCashierStatus(data)
    );
  }, [api, handleApiCall]);

  const closeCashier = useCallback(async (closingData: CloseCashierData): Promise<CashierStatus> => {
    return handleApiCall(
      () => api.post<CashierStatus>('/cashiers/close', closingData).then((res) => res.data),
      () => setCashierStatus(null)
    );
  }, [api, handleApiCall]);

  const registerSale = useCallback(async (saleData: SaleData): Promise<CashierStatus> => {
    return handleApiCall(
      () => api.post<CashierStatus>('/cashiers/sales', saleData).then((res) => res.data),
      (data) => setCashierStatus(data)
    );
  }, [api, handleApiCall]);

  const registerCashOut = useCallback(async (cashOutData: CashMovementData): Promise<CashierStatus> => {
    return handleApiCall(
      () => api.post<CashierStatus>('/cashiers/cash-out', cashOutData).then((res) => res.data),
      (data) => setCashierStatus(data)
    );
  }, [api, handleApiCall]);

  const registerCashIn = useCallback(async (cashInData: CashMovementData): Promise<CashierStatus> => {
    return handleApiCall(
      () => api.post<CashierStatus>('/cashiers/cash-in', cashInData).then((res) => res.data),
      (data) => setCashierStatus(data)
    );
  }, [api, handleApiCall]);

  const getCashierHistory = useCallback(async (): Promise<CashierStatus[]> => {
    return handleApiCall(
      () => api.get<CashierStatus[]>('/cashiers/history').then((res) => res.data),
      (data) => setCashierHistory(data)
    );
  }, [api, handleApiCall]);

  const getOpenCashiers = useCallback(async (): Promise<CashierStatus[]> => {
    return handleApiCall(
      () => api.get<CashierStatus[]>('/cashiers?status=open').then((res) => res.data),
      () => {}
    );
  }, [api, handleApiCall]);

  useEffect(() => {
    getCurrentCashier();
  }, [getCurrentCashier]);

  return (
    <CashierContext.Provider
      value={{
        cashierStatus,
        cashierHistory,
        isLoading,
        error,
        getCurrentCashier,
        openCashier,
        closeCashier,
        registerSale,
        registerCashOut,
        registerCashIn,
        getCashierHistory,
        getOpenCashiers,
      }}
    >
      {children}
    </CashierContext.Provider>
  );
};

export const useCashier = (): CashierContextType => {
  const context = useContext(CashierContext);
  if (context === undefined) {
    throw new Error('useCashier deve ser usado dentro de um CashierProvider');
  }
  return context;
};
