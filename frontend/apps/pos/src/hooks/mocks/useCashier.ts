// src/hooks/mocks/useCashier.ts
import { useState, useEffect } from 'react';
import { useTerminalConfig } from '../useTerminalConfig';
import { createApiClient } from '../../services/ApiClient';

export interface Cashier {
  id: string;
  operator_id: string;
  business_day_id: string;
  terminal_id: string;
  initial_amount: number;
  current_amount: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
  // Propriedades adicionais para compatibilidade
  opening_balance?: number;
  expected_balance?: number;
  cash_sales?: number;
  card_sales?: number;
  pix_sales?: number;
  other_sales?: number;
  cash_in?: number;
  cash_out?: number;
}

export const useCashier = () => {
  const { config } = useTerminalConfig();
  const [currentCashier, setCurrentCashier] = useState<Cashier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiClient = config ? createApiClient(config) : null;

  const openCashier = async (data: any, businessDayId?: string) => {
    if (!apiClient || !config) {
      throw new Error('API client not initialized');
    }

    try {
      setLoading(true);
      setError(null);
      
      // Suportar tanto formato antigo quanto novo
      let initialAmount: number;
      let dayId: string;
      
      if (typeof data === 'number') {
        // Formato novo: openCashier(amount, businessDayId)
        initialAmount = data;
        dayId = businessDayId || 'default-day';
      } else {
        // Formato antigo: openCashier({ opening_balance, terminal_id })
        initialAmount = data.opening_balance || data.initial_amount || 0;
        dayId = data.business_day_id || 'default-day';
      }
      
      const cashierData = {
        initial_amount: initialAmount,
        business_day_id: dayId,
        terminal_id: config.terminal_id
      };
      
      const cashier = await apiClient.cashier.open(cashierData);
      setCurrentCashier(cashier);
      
      return cashier;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open cashier';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const closeCashier = async (data: any, notes?: string) => {
    if (!apiClient || !currentCashier) {
      throw new Error('No active cashier to close');
    }

    try {
      setLoading(true);
      setError(null);
      
      // Suportar tanto formato antigo quanto novo
      let finalAmount: number;
      let closeNotes: string | undefined;
      
      if (typeof data === 'number') {
        // Formato novo: closeCashier(amount, notes)
        finalAmount = data;
        closeNotes = notes;
      } else {
        // Formato antigo: closeCashier({ closing_balance, notes })
        finalAmount = data.closing_balance || data.final_amount || 0;
        closeNotes = data.notes;
      }
      
      const closeData = { final_amount: finalAmount, notes: closeNotes };
      const closedCashier = await apiClient.cashier.close(currentCashier.id, closeData);
      setCurrentCashier(closedCashier);
      
      return closedCashier;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close cashier';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const withdraw = async (amount: number, reason: string, authorizedBy?: string) => {
    if (!apiClient || !currentCashier) {
      throw new Error('No active cashier for withdrawal');
    }

    try {
      setLoading(true);
      setError(null);
      
      const withdrawalData = { amount, reason, authorized_by: authorizedBy };
      const operation = await apiClient.cashier.withdraw(currentCashier.id, withdrawalData);
      
      // Atualizar valor atual do caixa
      setCurrentCashier(prev => prev ? {
        ...prev,
        current_amount: prev.current_amount - amount
      } : null);
      
      return operation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw from cashier';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getStatus = async () => {
    if (!apiClient || !currentCashier) {
      return null;
    }

    try {
      const status = await apiClient.cashier.getStatus(currentCashier.id);
      return status;
    } catch (err) {
      console.error('Failed to get cashier status:', err);
      return null;
    }
  };

  const getOpenCashiers = async () => {
    // Mock implementation - retorna array vazio por enquanto
    return [];
  };

  const registerCashOut = async (data: any, reason?: string) => {
    // Suportar tanto formato antigo quanto novo
    let amount: number;
    let withdrawReason: string;
    
    if (typeof data === 'number') {
      // Formato novo: registerCashOut(amount, reason)
      amount = data;
      withdrawReason = reason || 'Sangria';
    } else {
      // Formato antigo: registerCashOut({ amount, reason })
      amount = data.amount || 0;
      withdrawReason = data.reason || 'Sangria';
    }
    
    return await withdraw(amount, withdrawReason);
  };

  const getCurrentCashier = async () => {
    return await getStatus();
  };

  return {
    currentCashier,
    cashierStatus: currentCashier, // Alias para compatibilidade
    loading,
    isLoading: loading, // Alias para compatibilidade
    error,
    openCashier,
    closeCashier,
    withdraw,
    registerCashOut, // Alias para withdraw
    getStatus,
    getCurrentCashier, // Alias para getStatus
    getOpenCashiers,
    isOpen: currentCashier?.status === 'open'
  };
};

