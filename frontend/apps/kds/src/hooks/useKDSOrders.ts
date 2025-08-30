/**
 * Simplified KDS Orders Hook
 * Manages order data with reduced complexity
 */

import { useCallback, useMemo } from 'react';
import { kdsService } from '../services/kdsService';
import { offlineStorage } from '../services/offlineStorage';
import { logger } from '../services/logger';
import { useDataManager } from './useDataManager';
import { ORDER_STATUS } from '../config/constants';
import { countByStatus, updateItemInArray } from '../utils/dataHelpers';
import type { Order } from '../services/kdsService';

interface UseKDSOrdersOptions {
  selectedStation: string;
  onNewOrder?: (order: Order) => void;
}

interface OrderStats {
  total: number;
  pending: number;
  preparing: number;
  ready: number;
}

export function useKDSOrders({ 
  selectedStation, 
  onNewOrder 
}: UseKDSOrdersOptions) {
  
  // Data manager for orders
  const {
    data: orders,
    loading,
    error,
    isOnline,
    refresh: loadOrders,
    updateItem,
    setData: setOrders,
    clearError
  } = useDataManager<Order>({
    storageKey: 'kds-orders',
    fetchOnline: async () => {
      if (selectedStation === 'all') {
        return await kdsService.getOrders();
      }
      return await kdsService.getOrdersByStation(selectedStation);
    },
    fetchOffline: async () => {
      const allOrders = await offlineStorage.getAllOrders();
      if (selectedStation === 'all') {
        return allOrders;
      }
      return allOrders.filter((order: Order) => 
        order.items.some(item => item.station === selectedStation)
      );
    },
    saveOffline: (order) => offlineStorage.saveOrder(order),
    ...(onNewOrder && {
      onNewItems: (newOrders) => {
        newOrders.forEach(order => onNewOrder(order));
      }
    }),
    autoRefresh: true,
    refreshInterval: 30000
  });
  
  // Update order status
  const updateOrderStatus = useCallback(async (
    orderId: string | number, 
    newStatus: string
  ) => {
    // Optimistic update
    updateItem(orderId, { status: newStatus });
    
    try {
      if (isOnline) {
        await kdsService.updateOrderStatus(orderId, newStatus);
      } else {
        // Save for offline sync
        const order = orders.find(o => o.id === orderId);
        if (order) {
          await offlineStorage.saveOrder({ 
            ...order, 
            status: newStatus, 
            synced: false 
          });
        }
      }
      logger.info(`Order ${orderId} status updated to ${newStatus}`, 'useKDSOrders');
    } catch (err) {
      // Rollback on error
      const originalOrder = orders.find(o => o.id === orderId);
      if (originalOrder) {
        updateItem(orderId, { status: originalOrder.status });
      }
      logger.error('Failed to update order status', err, 'useKDSOrders');
      throw err;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, updateItem]);
  
  // Update item status
  const updateItemStatus = useCallback(async (
    orderId: string | number,
    itemId: string | number,
    newStatus: string
  ) => {
    // Use functional update to avoid dependency on orders
    setOrders(prev => {
      const order = prev.find(o => o.id === orderId);
      if (!order) return prev;
      
      const updatedItems = order.items.map(item => 
        item.item_id === itemId ? { ...item, status: newStatus } : item
      );
      
      // Save for offline sync if needed
      if (!isOnline) {
        offlineStorage.saveOrder({
          ...order,
          items: updatedItems,
          synced: false
        }).catch(err => {
          logger.error('Failed to save offline', err, 'useKDSOrders');
        });
      }
      
      return updateItemInArray(prev, orderId, { items: updatedItems });
    });
    
    try {
      if (isOnline) {
        await kdsService.updateItemStatus(orderId, itemId, newStatus);
      }
      logger.info(`Item ${itemId} in order ${orderId} updated to ${newStatus}`, 'useKDSOrders');
    } catch (err) {
      // Rollback on error using functional update
      setOrders(prev => {
        const order = prev.find(o => o.id === orderId);
        if (order) {
          const originalItems = orders.find(o => o.id === orderId)?.items;
          if (originalItems) {
            return updateItemInArray(prev, orderId, { items: originalItems });
          }
        }
        return prev;
      });
      logger.error('Failed to update item status', err, 'useKDSOrders');
      throw err;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, setOrders]);
  
  // Calculate statistics
  const stats: OrderStats = useMemo(() => ({
    total: orders.length,
    pending: countByStatus(orders, ORDER_STATUS.PENDING),
    preparing: countByStatus(orders, ORDER_STATUS.PREPARING),
    ready: countByStatus(orders, ORDER_STATUS.READY),
  }), [orders]);
  
  // Helper to check if order should be started
  const canStartOrder = useCallback((orderId: string | number): boolean => {
    const order = orders.find(o => o.id === orderId);
    return order?.status === ORDER_STATUS.PENDING;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);
  
  // Helper to check if order can be completed
  const canCompleteOrder = useCallback((orderId: string | number): boolean => {
    const order = orders.find(o => o.id === orderId);
    return order?.status === ORDER_STATUS.PREPARING;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);
  
  // Quick actions
  const startOrder = useCallback(async (orderId: string | number) => {
    if (canStartOrder(orderId)) {
      await updateOrderStatus(orderId, ORDER_STATUS.PREPARING);
    }
  }, [canStartOrder, updateOrderStatus]);
  
  const completeOrder = useCallback(async (orderId: string | number) => {
    if (canCompleteOrder(orderId)) {
      await updateOrderStatus(orderId, ORDER_STATUS.READY);
    }
  }, [canCompleteOrder, updateOrderStatus]);
  
  return {
    // Data
    orders,
    stats,
    
    // State
    loading,
    error,
    isOnline,
    
    // Actions
    loadOrders,
    updateOrderStatus,
    updateItemStatus,
    startOrder,
    completeOrder,
    
    // Helpers
    canStartOrder,
    canCompleteOrder,
    
    // Error handling
    setError: (msg: string | null) => {
      if (msg) {
        logger.error(msg, null, 'useKDSOrders');
      }
      msg ? setOrders([]) : clearError();
    }
  };
}