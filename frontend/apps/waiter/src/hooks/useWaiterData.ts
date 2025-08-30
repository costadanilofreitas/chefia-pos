/**
 * Simplified Waiter Data Hook
 * Manages all waiter terminal data with reduced complexity
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { waiterService } from '../services/waiterService';
import { offlineStorage } from '../services/offlineStorage';
import { logger } from '../services/logger';
import { TABLE_STATUS, ORDER_STATUS, ITEM_STATUS, TIME } from '../config/constants';
import { 
  filterBy, countBy, updateItemById, 
  getItemsWithStatus, createOptimisticUpdate 
} from '../utils/dataHelpers';
import type { Table, Order, MenuItem } from '../types';

interface UseWaiterDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface WaiterStats {
  totalTables: number;
  availableTables: number;
  occupiedTables: number;
  reservedTables: number;
  totalOrders: number;
  activeOrders: number;
  readyOrders: number;
  readyItems: number;
}

// Generic data loader with offline fallback
async function loadDataWithFallback<T>(
  onlineLoader: () => Promise<T[]>,
  offlineLoader: () => Promise<T[]>,
  offlineSaver?: (item: T) => Promise<void>,
  isOnline: boolean = navigator.onLine
): Promise<T[]> {
  try {
    if (isOnline) {
      const data = await onlineLoader();
      if (offlineSaver) {
        await Promise.all(data.map(item => offlineSaver(item)));
      }
      return data;
    }
    return await offlineLoader();
  } catch (error) {
    logger.error('Failed to load data', error, 'loadDataWithFallback');
    // Try offline as fallback
    return await offlineLoader();
  }
}

export function useWaiterData({
  autoRefresh = true,
  refreshInterval = TIME.AUTO_REFRESH
}: UseWaiterDataOptions = {}) {
  // State
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Load tables
  const loadTables = useCallback(async () => {
    return loadDataWithFallback(
      () => waiterService.getTables(),
      () => offlineStorage.getTables(),
      (table) => offlineStorage.saveTable(table),
      isOnline
    );
  }, [isOnline]);
  
  // Load orders
  const loadOrders = useCallback(async () => {
    return loadDataWithFallback(
      () => waiterService.getOrders(),
      () => offlineStorage.getOrders(),
      (order) => offlineStorage.saveOrder(order),
      isOnline
    );
  }, [isOnline]);
  
  // Load menu
  const loadMenu = useCallback(async () => {
    return loadDataWithFallback(
      async () => {
        const menuData = await waiterService.getMenu();
        return menuData.items;
      },
      () => offlineStorage.getMenu(),
      (item) => offlineStorage.saveMenuItem(item),
      isOnline
    );
  }, [isOnline]);
  
  // Load all data - stable reference
  const loadAllData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      // Direct calls to avoid dependencies
      const [tablesData, ordersData, menuData] = await Promise.all([
        loadDataWithFallback(
          () => waiterService.getTables(),
          () => offlineStorage.getTables(),
          (table) => offlineStorage.saveTable(table),
          navigator.onLine
        ),
        loadDataWithFallback(
          () => waiterService.getOrders(),
          () => offlineStorage.getOrders(),
          (order) => offlineStorage.saveOrder(order),
          navigator.onLine
        ),
        loadDataWithFallback(
          async () => {
            const menuData = await waiterService.getMenu();
            return menuData.items;
          },
          () => offlineStorage.getMenu(),
          (item) => offlineStorage.saveMenuItem(item),
          navigator.onLine
        )
      ]);
      
      setTables(tablesData);
      setOrders(ordersData);
      setMenu(menuData);
      setLastSync(new Date());
      
      logger.info('All data loaded successfully', 'useWaiterData');
    } catch (err) {
      const errorMessage = 'Falha ao carregar dados';
      setError(errorMessage);
      logger.error(errorMessage, err, 'useWaiterData');
    } finally {
      if (showLoading) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty to ensure stable reference
  
  // Update table status
  const updateTableStatus = useCallback(async (
    tableId: number, 
    status: Table['status']
  ) => {
    const optimistic = createOptimisticUpdate(
      setTables,
      prev => updateItemById(prev, tableId, { status }),
      prev => prev // Use original state for rollback
    );
    
    optimistic.apply();
    
    try {
      if (isOnline) {
        await waiterService.updateTableStatus(tableId, status);
      } else {
        await offlineStorage.addPendingAction({
          type: 'updateTableStatus',
          endpoint: `/waiter/tables/${tableId}/status`,
          method: 'PUT',
          data: { status }
        });
      }
      
      // Update offline storage using functional update
      setTables(prev => {
        const table = prev.find(t => t.id === tableId);
        if (table) {
          offlineStorage.saveTable({ ...table, status });
        }
        return prev;
      });
      
      logger.logTableEvent('status_updated', tableId, { status });
    } catch (err) {
      optimistic.rollback();
      logger.error(`Failed to update table ${tableId} status`, err, 'useWaiterData');
      throw err;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]); // tables removed to avoid stale closure
  
  // Create order (simplified)
  const createOrder = useCallback(async (
    tableId: number, 
    items: any[] = []
  ): Promise<Order> => {
    try {
      let newOrder: Order;
      
      if (isOnline) {
        newOrder = await waiterService.createOrder(tableId, items);
      } else {
        // Create local order
        newOrder = {
          id: Date.now(),
          table_id: tableId,
          status: ORDER_STATUS.NEW,
          items: items.map((item, index) => ({
            id: index,
            name: item.name,
            quantity: item.quantity || 1,
            price: item.price,
            status: ITEM_STATUS.PREPARING
          })),
          created_at: new Date().toISOString()
        };
        
        await offlineStorage.addPendingAction({
          type: 'createOrder',
          endpoint: `/waiter/tables/${tableId}/orders`,
          method: 'POST',
          data: { items }
        });
      }
      
      await offlineStorage.saveOrder(newOrder);
      setOrders(prev => [...prev, newOrder]);
      
      logger.logOrderEvent('created', newOrder.id, { tableId });
      return newOrder;
    } catch (err) {
      logger.error('Failed to create order', err, 'useWaiterData');
      throw err;
    }
  }, [isOnline]);
  
  // Deliver order items
  const deliverOrderItems = useCallback(async (
    orderId: number, 
    itemIds: number[]
  ) => {
    const optimistic = createOptimisticUpdate(
      setOrders,
      prev => prev.map(order => 
        order.id === orderId 
          ? {
              ...order,
              items: order.items.map(item => 
                itemIds.includes(item.id) 
                  ? { ...item, status: ITEM_STATUS.DELIVERED }
                  : item
              )
            }
          : order
      )
    );
    
    optimistic.apply();
    
    try {
      if (isOnline) {
        await waiterService.deliverOrderItems(orderId, itemIds);
      } else {
        await offlineStorage.addPendingAction({
          type: 'deliverOrderItems',
          endpoint: `/waiter/orders/${orderId}/deliver`,
          method: 'PUT',
          data: { item_ids: itemIds }
        });
      }
      
      logger.logOrderEvent('items_delivered', orderId, { itemIds });
    } catch (err) {
      optimistic.rollback();
      logger.error(`Failed to deliver items for order ${orderId}`, err, 'useWaiterData');
      throw err;
    }
  }, [isOnline]);
  
  // Calculate statistics
  const stats: WaiterStats = useMemo(() => ({
    totalTables: tables.length,
    availableTables: countBy(tables, 'status', TABLE_STATUS.AVAILABLE),
    occupiedTables: countBy(tables, 'status', TABLE_STATUS.OCCUPIED),
    reservedTables: countBy(tables, 'status', TABLE_STATUS.RESERVED),
    totalOrders: orders.length,
    activeOrders: orders.filter(o => 
      o.status !== ORDER_STATUS.PAID && o.status !== ORDER_STATUS.CANCELLED
    ).length,
    readyOrders: countBy(orders, 'status', ORDER_STATUS.READY),
    readyItems: orders.reduce((acc, order) => 
      acc + getItemsWithStatus(order.items, ITEM_STATUS.READY).length, 0
    )
  }), [tables, orders]);
  
  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      logger.info('Connection restored', 'useWaiterData');
      // Call loadAllData directly to avoid dependency
      loadTables().then(setTables);
      loadOrders().then(setOrders);
      loadMenu().then(setMenu);
      setLastSync(new Date());
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      logger.info('Connection lost', 'useWaiterData');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // No dependencies to prevent re-registering
  
  // Initial load
  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally run only once on mount
  
  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !isOnline) return;
    
    const interval = setInterval(() => {
      loadAllData(false);
    }, refreshInterval);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshInterval, isOnline]); // loadAllData excluded to prevent re-render loops
  
  return {
    // Data
    tables,
    orders,
    menu,
    stats,
    
    // State
    loading,
    error,
    lastSync,
    isOnline,
    
    // Actions
    loadAllData,
    updateTableStatus,
    createOrder,
    deliverOrderItems,
    
    // Setters for real-time updates
    setTables,
    setOrders,
    
    // Helpers
    getOrdersByTable: useCallback((tableId: number) => 
      filterBy(orders, 'table_id', tableId), [orders]
    ),
    clearError: useCallback(() => setError(null), [])
  };
}