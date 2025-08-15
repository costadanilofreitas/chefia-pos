/**
 * Hook para gerenciar pedidos offline com sincronização automática
 * Otimizado para performance em operação local
 */

import { useState, useEffect, useCallback } from 'react';
import { Order, OrderCreate, OrderStatus, APIResponse } from '../types';
import { offlineStorage } from '../utils/offline-storage';

interface UseOfflineOrdersReturn {
  orders: Order[];
  loading: boolean;
  error: string | null;
  createOrder: (orderData: OrderCreate) => Promise<string>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  getOrder: (orderId: string) => Promise<Order | null>;
  syncPendingOrders: () => Promise<number>;
  isConnected: boolean;
  pendingSync: number;
}

export function useOfflineOrders(): UseOfflineOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar pedidos do cache local
  const loadCachedOrders = useCallback(async () => {
    try {
      setLoading(true);
      const cachedOrders = await offlineStorage.getCache<Order[]>('orders:all');
      if (cachedOrders) {
        setOrders(cachedOrders);
      }
    } catch (err) {
      setError(`Erro ao carregar pedidos: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Criar novo pedido (com suporte offline)
  const createOrder = useCallback(async (orderData: OrderCreate): Promise<string> => {
    const newOrder: Order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...orderData,
      status: OrderStatus.PENDING,
      payment_status: 'pending' as any,
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0
    };

    // Calcular total
    if (orderData.items) {
      newOrder.subtotal = orderData.items.reduce((sum, item) => sum + (item.unit_price || 0) * (item.quantity || 1), 0);
      newOrder.total = newOrder.subtotal + (orderData.delivery_fee || 0);
    }

    try {
      // Salvar localmente primeiro
      const updatedOrders = [...orders, newOrder];
      setOrders(updatedOrders);
      await offlineStorage.setCache('orders:all', updatedOrders, 'orders', 86400000); // 24h TTL
      await offlineStorage.setCache(`order:${newOrder.id}`, newOrder, 'orders', 86400000);

      // Adicionar à fila de sincronização
      await offlineStorage.addToSyncQueue('CREATE', '/api/orders', newOrder);

      return newOrder.id;
    } catch (err) {
      setError(`Erro ao criar pedido: ${err}`);
      throw err;
    }
  }, [orders]);

  // Atualizar status do pedido
  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus): Promise<void> => {
    try {
      const updatedOrders = orders.map(order => 
        order.id === orderId 
          ? { ...order, status, updated_at: new Date().toISOString() }
          : order
      );
      
      setOrders(updatedOrders);
      await offlineStorage.setCache('orders:all', updatedOrders, 'orders');
      
      const updatedOrder = updatedOrders.find(o => o.id === orderId);
      if (updatedOrder) {
        await offlineStorage.setCache(`order:${orderId}`, updatedOrder, 'orders');
        
        // Adicionar à fila de sincronização
        await offlineStorage.addToSyncQueue('UPDATE', `/api/orders/${orderId}`, { status });
      }
    } catch (err) {
      setError(`Erro ao atualizar pedido: ${err}`);
      throw err;
    }
  }, [orders]);

  // Buscar pedido específico
  const getOrder = useCallback(async (orderId: string): Promise<Order | null> => {
    try {
      // Tentar cache primeiro
      const cachedOrder = await offlineStorage.getCache<Order>(`order:${orderId}`);
      if (cachedOrder) {
        return cachedOrder;
      }

      // Se online, tentar buscar do servidor
      if (offlineStorage.isConnected) {
        const response = await fetch(`/api/orders/${orderId}`);
        if (response.ok) {
          const apiResponse: APIResponse<Order> = await response.json();
          if (apiResponse.success && apiResponse.data) {
            await offlineStorage.setCache(`order:${orderId}`, apiResponse.data, 'orders');
            return apiResponse.data;
          }
        }
      }

      return null;
    } catch (err) {
      setError(`Erro ao buscar pedido: ${err}`);
      return null;
    }
  }, []);

  // Sincronizar pedidos pendentes
  const syncPendingOrders = useCallback(async (): Promise<number> => {
    if (!offlineStorage.isConnected) {
      return 0;
    }

    try {
      // A sincronização é feita automaticamente pelo OfflineStorage
      // Aqui apenas retornamos o número de itens na fila
      return offlineStorage.queueSize;
    } catch (err) {
      setError(`Erro na sincronização: ${err}`);
      return 0;
    }
  }, []);

  // Carregar dados na inicialização
  useEffect(() => {
    loadCachedOrders();
  }, [loadCachedOrders]);

  // Listener para mudanças de conectividade
  useEffect(() => {
    const handleOnline = () => {
      setError(null);
      syncPendingOrders();
    };

    const handleOffline = () => {
      // Não é erro, apenas mudança de estado
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingOrders]);

  return {
    orders,
    loading,
    error,
    createOrder,
    updateOrderStatus,
    getOrder,
    syncPendingOrders,
    isConnected: offlineStorage.isConnected,
    pendingSync: offlineStorage.queueSize
  };
}