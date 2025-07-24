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
  const { get, post } = useApi('http://localhost:8001/api/v1');
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
      () => get<CashierStatus>('/cashier/current').then((res) => res.data),
      (data) => setCashierStatus(data)
    );
  }, [get, post, handleApiCall]);

  const openCashier = useCallback(async (cashierData: OpenCashierData): Promise<CashierStatus> => {
    return handleApiCall(
      () => post<CashierStatus>('/cashier', cashierData).then((res) => res.data),
      (data) => setCashierStatus(data)
    );
  }, [get, post, handleApiCall]);

  const closeCashier = useCallback(async (closingData: CloseCashierData): Promise<CashierStatus> => {
    return handleApiCall(
      () => post<CashierStatus>('/cashier/close', closingData).then((res) => res.data),
      () => setCashierStatus(null)
    );
  }, [get, post, handleApiCall]);

  const registerSale = useCallback(async (saleData: SaleData): Promise<CashierStatus> => {
    return handleApiCall(
      () => post<CashierStatus>('/cashier/sales', saleData).then((res) => res.data),
      (data) => setCashierStatus(data)
    );
  }, [get, post, handleApiCall]);

  const registerCashOut = useCallback(async (cashOutData: CashMovementData): Promise<CashierStatus> => {
    return handleApiCall(
      () => post<CashierStatus>('/cashier/cash-out', cashOutData).then((res) => res.data),
      (data) => setCashierStatus(data)
    );
  }, [get, post, handleApiCall]);

  const registerCashIn = useCallback(async (cashInData: CashMovementData): Promise<CashierStatus> => {
    return handleApiCall(
      () => post<CashierStatus>('/cashiers/cash-in', cashInData).then((res) => res.data),
      (data) => setCashierStatus(data)
    );
  }, [get, post, handleApiCall]);

  const getCashierHistory = useCallback(async (): Promise<CashierStatus[]> => {
    return handleApiCall(
      () => get<CashierStatus[]>('/cashiers/history').then((res) => res.data),
      (data) => setCashierHistory(data)
    );
  }, [get, post, handleApiCall]);

  const getOpenCashiers = useCallback(async (): Promise<CashierStatus[]> => {
    return handleApiCall(
      () => get<CashierStatus[]>('/cashiers?status=open').then((res) => res.data),
      () => {}
    );
  }, [get, post, handleApiCall]);

  // Removido useEffect automático que causava loops
  // getCurrentCashier() deve ser chamado manualmente quando necessário

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
