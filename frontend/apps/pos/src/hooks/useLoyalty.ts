import { useState, useCallback } from 'react';
import { useToast } from '../components/Toast';
import logger, { LogSource } from '../services/LocalLoggerService';

export interface LoyaltyTransaction {
  customer_id: string;
  type: 'add' | 'redeem';
  points: number;
  description: string;
  order_id?: string;
  reward_id?: string;
}

export const useLoyalty = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  const addPoints = useCallback(async (
    customerId: string, 
    points: number, 
    description: string,
    orderId?: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:8001/api/v1/loyalty/add-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          customer_id: customerId,
          points,
          description,
          order_id: orderId
        })
      });
      
      if (!response.ok) throw new Error('Failed to add points');
      
      success(`${points} pontos adicionados com sucesso!`);
      return await response.json();
    } catch (err) {
      showError('Erro ao adicionar pontos');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError, setError, setLoading]);

  const redeemPoints = useCallback(async (
    customerId: string,
    points: number,
    rewardId: string,
    description: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:8001/api/v1/loyalty/redeem-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          customer_id: customerId,
          points,
          reward_id: rewardId,
          description
        })
      });
      
      if (!response.ok) throw new Error('Failed to redeem points');
      
      success(`${points} pontos resgatados com sucesso!`);
      return await response.json();
    } catch (err) {
      showError('Erro ao resgatar pontos');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError, setError, setLoading]);

  const transferPoints = useCallback(async (
    fromCustomerId: string,
    toCustomerId: string,
    points: number,
    reason: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:8001/api/v1/loyalty/transfer-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          from_customer_id: fromCustomerId,
          to_customer_id: toCustomerId,
          points,
          reason
        })
      });
      
      if (!response.ok) throw new Error('Failed to transfer points');
      
      success(`${points} pontos transferidos com sucesso!`);
      return await response.json();
    } catch (err) {
      showError('Erro ao transferir pontos');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError, setError, setLoading]);

  const checkBalance = useCallback(async (customerId: string) => {
    try {
      const response = await fetch(`http://localhost:8001/api/v1/loyalty/balance/${customerId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to check balance');
      return await response.json();
    } catch (err) {
      showError('Erro ao verificar saldo');
      throw err;
    }
  }, [showError]);

  const getTransactionHistory = useCallback(async (customerId: string) => {
    try {
      const response = await fetch(`http://localhost:8001/api/v1/loyalty/transactions/${customerId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to get transactions');
      return await response.json();
    } catch (error) {
      await logger.error('Erro ao buscar transações de fidelidade', { customerId, error }, 'useLoyalty', LogSource.CUSTOMER);
      return [];
    }
  }, []);

  const loadRewards = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:8001/api/v1/loyalty/rewards`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load rewards');
      return await response.json();
    } catch (error) {
      await logger.error('Erro ao carregar recompensas', { error }, 'useLoyalty', LogSource.CUSTOMER);
      return [];
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:8001/api/v1/loyalty/transactions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load transactions');
      return await response.json();
    } catch (error) {
      await logger.error('Erro ao carregar transações', { error }, 'useLoyalty', LogSource.CUSTOMER);
      return [];
    }
  }, []);

  const loyaltyProgram = {
    name: 'Programa de Fidelidade',
    pointsPerCurrency: 10,
    tiers: {
      bronze: { min: 0, multiplier: 1, benefits: ['Acumule pontos'] },
      silver: { min: 500, multiplier: 1.2, benefits: ['20% mais pontos'] },
      gold: { min: 1500, multiplier: 1.5, benefits: ['50% mais pontos'] },
      platinum: { min: 5000, multiplier: 2, benefits: ['Pontos em dobro'] }
    },
    birthdayBonus: 500,
    welcomeBonus: 100,
    referralBonus: 250
  };

  return {
    loading,
    error,
    addPoints,
    redeemPoints,
    transferPoints,
    checkBalance,
    getTransactionHistory,
    loadRewards,
    loadTransactions,
    loyaltyProgram
  };
};