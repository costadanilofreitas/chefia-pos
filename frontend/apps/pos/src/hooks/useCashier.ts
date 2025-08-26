import { useState, useCallback } from 'react';
import { cashierService, Cashier, CashierCreate, CashierClose, CashierWithdrawal, TerminalStatus } from '../services/CashierService';
import logger, { LogSource } from '../services/LocalLoggerService';

export interface UseCashierReturn {
  // Estado
  currentCashier: Cashier | null;
  terminalStatus: TerminalStatus | null;
  loading: boolean;
  error: string | null;

  // Ações
  checkTerminalStatus: (terminalId: string) => Promise<TerminalStatus>;
  openCashier: (cashierData: CashierCreate) => Promise<Cashier>;
  closeCashier: (physicalCashAmount: number, notes?: string) => Promise<Cashier>;
  registerWithdrawal: (cashierId: string, withdrawal: CashierWithdrawal) => Promise<unknown>;
  refreshCashier: (cashierId: string) => Promise<void>;
  clearError: () => void;
  operations: unknown[];
  getSummary: () => Promise<unknown>;
}

export const useCashier = (): UseCashierReturn => {
  const [currentCashier, setCurrentCashier] = useState<Cashier | null>(null);
  const [terminalStatus, setTerminalStatus] = useState<TerminalStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operations, setOperations] = useState<unknown[]>([]);

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
    } catch (err) {
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
    } catch (err) {
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
  const closeCashier = useCallback(async (physicalCashAmount: number, notes?: string): Promise<Cashier> => {
    try {
      if (!currentCashier?.id) {
        throw new Error('Nenhum caixa ativo para fechar');
      }
      
      setLoading(true);
      setError(null);
      
      const closeData: CashierClose = {
        operator_id: currentCashier.current_operator_id,
        physical_cash_amount: physicalCashAmount,
        notes
      };
      
      const closedCashier = await cashierService.closeCashier(currentCashier.id, closeData);
      setCurrentCashier(closedCashier);
      
      // Atualizar status do terminal se disponível
      if (closedCashier.terminal_id) {
        const status = await cashierService.getTerminalStatus(closedCashier.terminal_id);
        setTerminalStatus(status);
      }
      
      return closedCashier;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao fechar caixa';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentCashier]);

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
    } catch (error) {
      await logger.error('Erro ao atualizar caixa', { cashierId, error }, 'useCashier', LogSource.POS);
      // Não definir erro aqui pois é uma operação em background
    }
  }, []);

  /**
   * Registra uma retirada (ruptura) no caixa
   */
  const registerWithdrawal = useCallback(async (cashierId: string, withdrawal: CashierWithdrawal): Promise<unknown> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await cashierService.registerWithdrawal(cashierId, withdrawal);
      
      // Atualizar dados do caixa após a retirada
      await refreshCashier(cashierId);
      
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao registrar retirada';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshCashier]);

  /**
   * Limpa o erro atual
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Busca resumo das operações do caixa
   */
  const getSummary = useCallback(async (): Promise<unknown> => {
    try {
      if (!currentCashier?.id) {
        throw new Error('Nenhum caixa ativo');
      }
      
      const operations = await cashierService.getCashierOperations(currentCashier.id);
      setOperations(operations);
      
      // Calcular resumo das operações
      const summary = operations.reduce((acc: any, operation: any) => {
        switch (operation.operation_type) {
          case 'SALE':
            acc.sales += operation.amount;
            break;
          case 'WITHDRAWAL':
            acc.withdrawals += operation.amount;
            break;
          case 'DEPOSIT':
            acc.deposits += operation.amount;
            break;
        }
        return acc;
      }, { sales: 0, withdrawals: 0, deposits: 0 });
      
      return summary;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao buscar resumo do caixa';
      setError(errorMessage);
      throw err;
    }
  }, [currentCashier?.id]);

  return {
    // Estado
    currentCashier,
    terminalStatus,
    loading,
    error,
    operations,

    // Ações
    checkTerminalStatus,
    openCashier,
    closeCashier,
    registerWithdrawal,
    refreshCashier,
    clearError,
    getSummary
  };
};

export default useCashier;

