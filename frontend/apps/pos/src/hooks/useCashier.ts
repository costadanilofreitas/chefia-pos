import { useState, useCallback, useEffect } from 'react';
import { cashierService, Cashier, CashierCreate, CashierClose, CashierWithdrawal, TerminalStatus } from '../services/CashierService';
import { CashierOperation, CashierSummary } from '../types/cashier';
import logger, { LogSource } from '../services/LocalLoggerService';
import { requestCache } from '../services/RequestCache';
import eventBus from '../utils/EventBus';

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
  registerWithdrawal: (cashierId: string, withdrawal: CashierWithdrawal) => Promise<CashierOperation>;
  refreshCashier: (cashierId: string) => Promise<void>;
  clearError: () => void;
  operations: CashierOperation[];
  getSummary: () => Promise<CashierSummary>;
}

export const useCashier = (): UseCashierReturn => {
  const [currentCashier, setCurrentCashier] = useState<Cashier | null>(null);
  const [terminalStatus, setTerminalStatus] = useState<TerminalStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operations, setOperations] = useState<CashierOperation[]>([]);

  /**
   * Verifica o status do terminal com cache
   */
  const checkTerminalStatus = useCallback(async (terminalId: string): Promise<TerminalStatus> => {
    try {
      setLoading(true);
      setError(null);
      
      // Usar cache para evitar requisições duplicadas
      const status = await requestCache.execute(
        `terminal-status-${terminalId}`,
        () => cashierService.getTerminalStatus(terminalId),
        { ttl: 10 * 1000 } // Cache de 10 segundos
      );
      setTerminalStatus(status);
      
      // Se há um caixa aberto, buscar os dados completos com cache
      if (status.has_open_cashier && status.cashier_id) {
        const cashier = await requestCache.execute(
          `cashier-${status.cashier_id}`,
          () => cashierService.getCashier(status.cashier_id),
          { ttl: 30 * 1000 } // Cache de 30 segundos
        );
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
   * Atualiza os dados do caixa atual (invalida cache)
   */
  const refreshCashier = useCallback(async (cashierId: string): Promise<void> => {
    try {
      // Invalidar cache antes de buscar novos dados
      requestCache.invalidate(`cashier-${cashierId}`);
      
      const updatedCashier = await cashierService.getCashier(cashierId);
      setCurrentCashier(updatedCashier);
      
      // Invalidar e atualizar status do terminal
      requestCache.invalidate(`terminal-status-${updatedCashier.terminal_id}`);
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
  const registerWithdrawal = useCallback(async (cashierId: string, withdrawal: CashierWithdrawal): Promise<CashierOperation> => {
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
  const getSummary = useCallback(async (): Promise<CashierSummary> => {
    try {
      if (!currentCashier?.id) {
        throw new Error('Nenhum caixa ativo');
      }
      
      const operations = await cashierService.getCashierOperations(currentCashier.id);
      setOperations(operations);
      
      // Calcular resumo das operações
      const totals = operations.reduce((acc, operation) => {
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
          case 'ADJUSTMENT':
            acc.adjustments += operation.amount;
            break;
          case 'REFUND':
            acc.refunds += operation.amount;
            break;
        }
        return acc;
      }, { sales: 0, withdrawals: 0, deposits: 0, adjustments: 0, refunds: 0 });
      
      const summary: CashierSummary = {
        currentCashier: {
          id: currentCashier?.id || '',
          status: currentCashier?.status || 'OPEN',
          opening_cash_amount: currentCashier?.initial_balance || 0,
          current_cash_amount: currentCashier?.current_balance || 0,
          total_sales: currentCashier?.total_sales || totals.sales,
          total_withdrawals: currentCashier?.total_withdrawals || totals.withdrawals,
          total_deposits: currentCashier?.total_deposits || totals.deposits,
          total_cash: currentCashier?.total_cash || 0,
          total_credit: currentCashier?.total_credit || 0,
          total_debit: currentCashier?.total_debit || 0,
          total_pix: currentCashier?.total_pix || 0,
          total_other: 0,
          current_operator_id: currentCashier?.current_operator_id || '',
          current_operator_name: currentCashier?.current_operator_name || '',
          opened_by_id: currentCashier?.operator_id || '',
          opened_by_name: currentCashier?.operator_name || '',
          opened_at: currentCashier?.opened_at || '',
          terminal_id: currentCashier?.terminal_id,
          business_day_id: currentCashier?.business_day_id
        },
        operations,
        totals
      };
      
      return summary;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao buscar resumo do caixa';
      setError(errorMessage);
      throw err;
    }
  }, [currentCashier?.id]);

  // Listen for cashier sync events from other terminals
  useEffect(() => {
    const handleCashierOpened = (data: Cashier) => {
      // Se é o mesmo terminal, atualizar estado
      if (data.terminal_id === terminalStatus?.terminal_id) {
        setCurrentCashier(data);
        setTerminalStatus(prev => prev ? { ...prev, has_open_cashier: true, cashier_id: data.id } : prev);
      }
      // Invalidar cache para forçar refresh
      requestCache.invalidatePattern('cashier');
      requestCache.invalidatePattern('terminal-status');
    };
    
    const handleCashierClosed = (data: Cashier) => {
      // Se é o mesmo terminal, limpar estado
      if (data.terminal_id === terminalStatus?.terminal_id) {
        setCurrentCashier(null);
        setTerminalStatus(prev => prev ? { ...prev, has_open_cashier: false, cashier_id: null } : prev);
      }
      // Invalidar cache
      requestCache.invalidatePattern('cashier');
      requestCache.invalidatePattern('terminal-status');
    };
    
    const handleCashierOperation = (data: { cashierId: string; operation: CashierOperation }) => {
      if (currentCashier?.id === data.cashierId) {
        setOperations(prev => [...prev, data.operation]);
      }
    };
    
    const handleCashierWithdrawal = (data: { cashierId: string; withdrawal: CashierOperation }) => {
      if (currentCashier?.id === data.cashierId) {
        setOperations(prev => [...prev, data.withdrawal]);
        // Atualizar saldo do caixa
        refreshCashier(data.cashierId);
      }
    };
    
    // Subscribe to sync events
    eventBus.on('sync:cashier:create', handleCashierOpened);
    eventBus.on('sync:cashier:update', handleCashierClosed);
    eventBus.on('sync:cashier:operation', handleCashierOperation);
    eventBus.on('sync:cashier:withdrawal', handleCashierWithdrawal);
    
    // Cleanup listeners on unmount
    return () => {
      eventBus.off('sync:cashier:create', handleCashierOpened);
      eventBus.off('sync:cashier:update', handleCashierClosed);
      eventBus.off('sync:cashier:operation', handleCashierOperation);
      eventBus.off('sync:cashier:withdrawal', handleCashierWithdrawal);
    };
  }, [terminalStatus?.terminal_id, currentCashier?.id, refreshCashier]);

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

