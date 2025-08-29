import { useState, useCallback, useMemo, useRef } from 'react';
import { kdsService, Order } from '../services/kdsService';
import { offlineStorage } from '../services/offlineStorage';
import { logger } from '../services/logger';

interface UseKDSOrdersOptions {
  selectedStation: string;
  onNewOrder?: (order: Order) => void;
}

export function useKDSOrders({ selectedStation, onNewOrder }: UseKDSOrdersOptions) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousOrdersRef = useRef<Order[]>([]);

  // Load orders with offline support
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let data: Order[];
      
      if (navigator.onLine) {
        // Online: fetch from API
        data = selectedStation === 'all' 
          ? await kdsService.getOrders()
          : await kdsService.getOrdersByStation(selectedStation);
        
        // Cache for offline use
        const cachePromises = data.map(order => offlineStorage.saveOrder(order));
        await Promise.all(cachePromises);
      } else {
        // Offline: load from cache
        data = await offlineStorage.getAllOrders();
        if (selectedStation !== 'all') {
          data = data.filter((order: Order) => 
            order.items.some(item => item.station === selectedStation)
          );
        }
      }
      
      // Check for new orders
      if (previousOrdersRef.current.length > 0 && onNewOrder) {
        const newOrders = data.filter((order: Order) => 
          !previousOrdersRef.current.find(o => o.id === order.id)
        );
        
        newOrders.forEach(order => onNewOrder(order));
      }
      
      previousOrdersRef.current = data;
      setOrders(data);
    } catch (err) {
      setError('Não foi possível carregar os pedidos');
      logger.error('Error loading orders', err, 'useKDSOrders');
      
      // Try to load from cache as fallback
      const cachedOrders = await offlineStorage.getAllOrders();
      if (cachedOrders.length > 0) {
        setOrders(cachedOrders);
        setError('Usando dados em cache (modo offline)');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedStation, onNewOrder]);

  // Update order status
  const updateOrderStatus = useCallback(async (orderId: string | number, newStatus: string) => {
    // Update local state immediately for responsiveness
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus }
          : order
      )
    );
    
    try {
      if (navigator.onLine) {
        await kdsService.updateOrderStatus(orderId, newStatus);
      } else {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          await offlineStorage.saveOrder({ ...order, status: newStatus, synced: false });
        }
      }
    } catch (err) {
      logger.error('Error updating order status', err, 'useKDSOrders');
      throw err;
    }
  }, [orders]);

  // Update item status
  const updateItemStatus = useCallback(async (
    orderId: string | number, 
    itemId: string | number, 
    newStatus: string
  ) => {
    // Update local state immediately
    setOrders(prevOrders => 
      prevOrders.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            items: order.items.map(item => 
              item.item_id === itemId 
                ? { ...item, status: newStatus }
                : item
            )
          };
        }
        return order;
      })
    );
    
    try {
      if (navigator.onLine) {
        await kdsService.updateItemStatus(orderId, itemId, newStatus);
      } else {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          const updatedOrder = {
            ...order,
            items: order.items.map(item => 
              item.item_id === itemId ? { ...item, status: newStatus } : item
            ),
            synced: false
          };
          await offlineStorage.saveOrder(updatedOrder);
        }
      }
    } catch (err) {
      logger.error('Error updating item status', err, 'useKDSOrders');
      throw err;
    }
  }, [orders]);

  // Computed statistics
  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
  }), [orders]);

  return {
    orders,
    loading,
    error,
    stats,
    loadOrders,
    updateOrderStatus,
    updateItemStatus,
    setError
  };
}