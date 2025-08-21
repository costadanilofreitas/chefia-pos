import { useState, useCallback } from 'react';
import { useToast } from '../components/Toast';

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
    setLoading(true);
    setError(null);
    try {
      // API call would go here
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
    } catch (err: any) {
      console.error('Error adding points:', err);
      showError('Erro ao adicionar pontos');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success]);

  const redeemPoints = useCallback(async (
    customerId: string,
    points: number,
    rewardId: string,
    description: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      // API call would go here
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
    } catch (err: any) {
      console.error('Error redeeming points:', err);
      showError('Erro ao resgatar pontos');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const transferPoints = useCallback(async (
    fromCustomerId: string,
    toCustomerId: string,
    points: number,
    reason: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      // API call would go here
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
    } catch (err: any) {
      console.error('Error transferring points:', err);
      showError('Erro ao transferir pontos');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success]);

  const checkBalance = useCallback(async (customerId: string) => {
    try {
      const response = await fetch(`http://localhost:8001/api/v1/loyalty/balance/${customerId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to check balance');
      return await response.json();
    } catch (err: any) {
      console.error('Error checking balance:', err);
      return {
        customer_id: customerId,
        points_balance: 0,
        tier: 'bronze',
        next_tier_points: 0,
        points_expiring_soon: 0,
        expiry_date: null
      };
    }
  }, []);

  const getTransactionHistory = useCallback(async (customerId: string, limit: number = 10) => {
    try {
      const response = await fetch(
        `http://localhost:8001/api/v1/loyalty/transactions/${customerId}?limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return await response.json();
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      return [];
    }
  }, []);

  const loadRewards = useCallback(async () => {
    // Function to load rewards from API
    return [];
  }, []);

  const loadTransactions = useCallback(async () => {
    // Function to load transactions from API
    return [];
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