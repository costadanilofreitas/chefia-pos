import { useState, useCallback } from 'react';

export interface CashierSession {
  id: string;
  terminal_id: string;
  operator_id: string;
  operator_name: string;
  opened_at: string;
  closed_at?: string;
  initial_amount: number;
  final_amount?: number;
  current_amount: number;
  status: 'open' | 'closed';
  notes?: string;
}

export interface CashOperation {
  id: string;
  cashier_id: string;
  type: 'sale' | 'withdrawal' | 'deposit' | 'opening' | 'closing';
  amount: number;
  description: string;
  created_at: string;
  operator_id: string;
  authorized_by?: string;
}

export const useCashier = () => {
  const [currentCashier, setCurrentCashier] = useState<CashierSession | null>(null);
  const [operations, setOperations] = useState<CashOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(async (terminalId: string, operatorId: string, operatorName: string, initialAmount: number, notes?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const newCashier: CashierSession = {
        id: `cashier_${Date.now()}`,
        terminal_id: terminalId,
        operator_id: operatorId,
        operator_name: operatorName,
        opened_at: new Date().toISOString(),
        initial_amount: initialAmount,
        current_amount: initialAmount,
        status: 'open',
        notes
      };
      
      setCurrentCashier(newCashier);
      return newCashier;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open cashier';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const close = useCallback(async (finalAmount: number, closeNotes?: string) => {
    if (!currentCashier) {
      throw new Error('No active cashier to close');
    }

    try {
      setLoading(true);
      setError(null);
      
      const closedCashier: CashierSession = {
        ...currentCashier,
        closed_at: new Date().toISOString(),
        final_amount: finalAmount,
        status: 'closed',
        notes: closeNotes || currentCashier.notes
      };
      
      setCurrentCashier(closedCashier);
      return closedCashier;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close cashier';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentCashier]);

  const withdraw = useCallback(async (amount: number, reason: string, authorizedBy?: string) => {
    if (!currentCashier) {
      throw new Error('No active cashier for withdrawal');
    }

    try {
      setLoading(true);
      setError(null);
      
      const withdrawalOperation: CashOperation = {
        id: `op_${Date.now()}`,
        cashier_id: currentCashier.id,
        type: 'withdrawal',
        amount: amount,
        description: reason,
        created_at: new Date().toISOString(),
        operator_id: currentCashier.operator_id,
        authorized_by: authorizedBy
      };
      
      const updatedCashier = {
        ...currentCashier,
        current_amount: currentCashier.current_amount - amount
      };
      
      setCurrentCashier(updatedCashier);
      setOperations(prev => [...prev, withdrawalOperation]);
      
      return withdrawalOperation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process withdrawal';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentCashier]);

  const deposit = useCallback(async (amount: number, reason: string) => {
    if (!currentCashier) {
      throw new Error('No active cashier for deposit');
    }

    try {
      setLoading(true);
      setError(null);
      
      const depositOperation: CashOperation = {
        id: `op_${Date.now()}`,
        cashier_id: currentCashier.id,
        type: 'deposit',
        amount: amount,
        description: reason,
        created_at: new Date().toISOString(),
        operator_id: currentCashier.operator_id
      };
      
      const updatedCashier = {
        ...currentCashier,
        current_amount: currentCashier.current_amount + amount
      };
      
      setCurrentCashier(updatedCashier);
      setOperations(prev => [...prev, depositOperation]);
      
      return depositOperation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process deposit';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentCashier]);

  const getOperations = useCallback(async (cashierId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const filteredOperations = cashierId 
        ? operations.filter(op => op.cashier_id === cashierId)
        : operations;
      
      return filteredOperations;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get operations';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [operations]);

  const getSummary = useCallback(async (cashierId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const targetCashier = cashierId ? currentCashier : currentCashier;
      if (!targetCashier) {
        throw new Error('No cashier session found');
      }
      
      const cashierOperations = operations.filter(op => op.cashier_id === targetCashier.id);
      
      const summary = {
        cashier: targetCashier,
        operations: cashierOperations,
        totals: {
          sales: cashierOperations.filter(op => op.type === 'sale').reduce((sum, op) => sum + op.amount, 0),
          withdrawals: cashierOperations.filter(op => op.type === 'withdrawal').reduce((sum, op) => sum + op.amount, 0),
          deposits: cashierOperations.filter(op => op.type === 'deposit').reduce((sum, op) => sum + op.amount, 0),
          opening: targetCashier.initial_amount,
          expected: targetCashier.current_amount,
          actual: targetCashier.final_amount || targetCashier.current_amount
        }
      };
      
      return summary;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get summary';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentCashier, operations]);

  return {
    currentCashier,
    operations,
    loading,
    error,
    open,
    close,
    withdraw,
    deposit,
    getOperations,
    getSummary
  };
};

