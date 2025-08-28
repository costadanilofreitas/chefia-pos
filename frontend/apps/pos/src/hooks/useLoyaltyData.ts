/**
 * Hook centralizado para dados de fidelidade
 * Garante que os dados sejam carregados apenas uma vez
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCustomer } from './useCustomer';
import { useLoyalty } from './useLoyalty';
import { requestCache } from '../services/RequestCache';

// Singleton para garantir carregamento único
let globalLoadPromise: Promise<void> | null = null;
let globalHasLoaded = false;

export const useLoyaltyData = () => {
  const { 
    customers, 
    loadCustomers,
    createCustomer,
    loading: customersLoading 
  } = useCustomer();
  
  const { 
    loadRewards, 
    loadTransactions,
    addPoints,
    redeemPoints,
    loyaltyProgram,
    loading: loyaltyLoading 
  } = useLoyalty();

  const [rewards, setRewards] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const isLoadingRef = useRef(false);

  // Função para carregar todos os dados com singleton
  const loadAllData = useCallback(async () => {
    // Prevenir múltiplas chamadas simultâneas
    if (isLoadingRef.current) {
      return;
    }

    // Se já carregou globalmente, apenas retornar os dados do cache
    if (globalHasLoaded) {
      try {
        const [cachedRewards, cachedTransactions] = await Promise.all([
          requestCache.execute('loyalty-rewards', loadRewards, { ttl: 5 * 60 * 1000 }),
          requestCache.execute('loyalty-transactions', loadTransactions, { ttl: 2 * 60 * 1000 })
        ]);
        
        setRewards(cachedRewards || []);
        setTransactions(cachedTransactions || []);
        setDataLoaded(true);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados do cache:', error);
        setLoading(false);
      }
      return;
    }

    // Se já existe uma promise global de carregamento, aguardar ela
    if (globalLoadPromise) {
      setLoading(true);
      try {
        await globalLoadPromise;
        
        // Após a promise global, pegar os dados do cache
        const [cachedRewards, cachedTransactions] = await Promise.all([
          requestCache.execute('loyalty-rewards', loadRewards, { ttl: 5 * 60 * 1000 }),
          requestCache.execute('loyalty-transactions', loadTransactions, { ttl: 2 * 60 * 1000 })
        ]);
        
        setRewards(cachedRewards || []);
        setTransactions(cachedTransactions || []);
        setDataLoaded(true);
      } catch (error) {
        console.error('Erro ao carregar dados após promise global:', error);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Primeira vez carregando - criar promise global
    isLoadingRef.current = true;
    setLoading(true);

    globalLoadPromise = (async () => {
      try {
        const [customersData, rewardsData, transactionsData] = await Promise.all([
          requestCache.execute('loyalty-customers', loadCustomers, { ttl: 2 * 60 * 1000 }),
          requestCache.execute('loyalty-rewards', loadRewards, { ttl: 5 * 60 * 1000 }),
          requestCache.execute('loyalty-transactions', loadTransactions, { ttl: 2 * 60 * 1000 })
        ]);

        setRewards(rewardsData || []);
        setTransactions(transactionsData || []);
        globalHasLoaded = true;
      } catch (error) {
        console.error('Erro ao carregar dados de fidelidade:', error);
        // Em caso de erro, resetar para permitir retry
        globalLoadPromise = null;
        globalHasLoaded = false;
      }
    })();

    try {
      await globalLoadPromise;
      setDataLoaded(true);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [loadCustomers, loadRewards, loadTransactions]);

  // Carregar dados apenas uma vez
  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      if (!isCancelled) {
        await loadAllData();
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, []); // Empty dependency array - load only once

  // Função para recarregar forçadamente (invalida cache)
  const forceReload = useCallback(async () => {
    requestCache.invalidatePattern('loyalty-');
    globalHasLoaded = false;
    globalLoadPromise = null;
    await loadAllData();
  }, [loadAllData]);

  return {
    // Dados
    customers,
    rewards,
    transactions,
    loyaltyProgram,
    
    // Estados
    loading: loading || customersLoading || loyaltyLoading,
    dataLoaded,
    
    // Ações
    createCustomer,
    addPoints,
    redeemPoints,
    forceReload,
    
    // Função para carregar dados manualmente se necessário
    loadAllData
  };
};