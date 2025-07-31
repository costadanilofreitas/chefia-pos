import { useState, useCallback, useEffect } from 'react';
import { cashierService, Cashier, CashierCreate, CashierClose, CashierWithdrawal, TerminalStatus } from '../services/CashierService';

export interface UseCashierReturn {
  // Estado
  currentCashier: Cashier | null;
  terminalStatus: TerminalStatus | null;
  loading: boolean;
  error: string | null;

  // Ações
  checkTerminalStatus: (terminalId: string) => Promise<TerminalStatus>;
  openCashier: (cashierData: CashierCreate) => Promise<Cashier>;
  closeCashier: (cashierId: string, closeData: CashierClose) => Promise<Cashier>;
  registerWithdrawal: (cashierId: string, withdrawal: CashierWithdrawal) => Promise<any>;
  refreshCashier: (cashierId: string) => Promise<void>;
  clearError: () => void;
}

export const useCashier = (): UseCashierReturn => {
  const [currentCashier, setCurrentCashier] = useState<Cashier | null>(null);
  const [terminalStatus, setTerminalStatus] = useState<TerminalStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Verifica o status do terminal
   */
  const checkTerminalStatus = useCallback(async (terminalId: string): Promise<TerminalStatus> => {
    try {
      setLoading(true);
      setError(null);
      
      const status = await cashierService.getTerminalStatus(terminalId);
      setTerminalStatus(status);
      
      // Se há um caixa aberto, buscar os dados completos
      if (status.has_open_cashier && status.cashier_id) {
        const cashier = await cashierService.getCashier(status.cashier_id);
        setCurrentCashier(cashier);
      } else {
        setCurrentCashier(null);
      }
      
      return status;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao verificar status do terminal';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Abre um novo caixa
   */
  const openCashier = useCallback(async (cashierData: CashierCreate): Promise<Cashier> => {
    try {
      setLoading(true);
      setError(null);
      
      const newCashier = await cashierService.openCashier(cashierData);
      setCurrentCashier(newCashier);
      
      // Atualizar status do terminal
      const status = await cashierService.getTerminalStatus(cashierData.terminal_id);
      setTerminalStatus(status);
      
      return newCashier;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao abrir caixa';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fecha um caixa
   */
  const closeCashier = useCallback(async (cashierId: string, closeData: CashierClose): Promise<Cashier> => {
    try {
      setLoading(true);
      setError(null);
      
      const closedCashier = await cashierService.closeCashier(cashierId, closeData);
      setCurrentCashier(closedCashier);
      
      // Atualizar status do terminal se disponível
      if (closedCashier.terminal_id) {
        const status = await cashierService.getTerminalStatus(closedCashier.terminal_id);
        setTerminalStatus(status);
      }
      
      return closedCashier;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao fechar caixa';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Registra uma retirada (ruptura) no caixa
   */
  const registerWithdrawal = useCallback(async (cashierId: string, withdrawal: CashierWithdrawal): Promise<any> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await cashierService.registerWithdrawal(cashierId, withdrawal);
      
      // Atualizar dados do caixa após a retirada
      await refreshCashier(cashierId);
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao registrar retirada';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Atualiza os dados do caixa atual
   */
  const refreshCashier = useCallback(async (cashierId: string): Promise<void> => {
    try {
      const updatedCashier = await cashierService.getCashier(cashierId);
      setCurrentCashier(updatedCashier);
      
      // Atualizar status do terminal
      const status = await cashierService.getTerminalStatus(updatedCashier.terminal_id);
      setTerminalStatus(status);
    } catch (err: any) {
      console.error('Erro ao atualizar caixa:', err);
      // Não definir erro aqui pois é uma operação em background
    }
  }, []);

  /**
   * Limpa o erro atual
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Estado
    currentCashier,
    terminalStatus,
    loading,
    error,

    // Ações
    checkTerminalStatus,
    openCashier,
    closeCashier,
    registerWithdrawal,
    refreshCashier,
    clearError
  };
};

export default useCashier;

