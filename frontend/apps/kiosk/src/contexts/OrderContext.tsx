import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { CartItem } from './CartContext';
import { offlineStorage } from '../services/offlineStorage';

// Types
export type OrderStatus = 
  | 'draft'
  | 'pending_payment'
  | 'paid'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 
  | 'credit_card'
  | 'debit_card'
  | 'pix'
  | 'cash'
  | 'voucher';

export type OrderType = 
  | 'dine_in'
  | 'takeout'
  | 'delivery';

export interface Order {
  id: string;
  orderNumber?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  type: OrderType;
  paymentMethod?: PaymentMethod;
  paymentStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedTime?: number; // in minutes
}

interface OrderContextType {
  currentOrder: Order | null;
  orderHistory: Order[];
  createOrder: (items: CartItem[], subtotal: number, tax: number, total: number) => Order;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  setOrderType: (type: OrderType) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setCustomerInfo: (name: string, phone?: string) => void;
  confirmOrder: () => Promise<void>;
  cancelOrder: (orderId: string) => void;
  getOrderById: (orderId: string) => Order | undefined;
  clearCurrentOrder: () => void;
}

interface OrderProviderProps {
  children: ReactNode;
}

// Create context
const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Provider component
export const OrderProvider: React.FC<OrderProviderProps> = ({ children }) => {
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderHistory, setOrderHistory] = useState<Order[]>(() => {
    // Load order history from session storage
    try {
      const saved = sessionStorage.getItem('kiosk-order-history');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.map((order: any) => ({
          ...order,
          createdAt: new Date(order.createdAt),
          updatedAt: new Date(order.updatedAt)
        })) : [];
      }
    } catch (error) {
      offlineStorage.log('Failed to load order history', error);
    }
    return [];
  });

  // Save order history to session storage
  const saveOrderHistory = useCallback((orders: Order[]) => {
    try {
      sessionStorage.setItem('kiosk-order-history', JSON.stringify(orders));
    } catch (error) {
      offlineStorage.log('Failed to save order history', error);
    }
  }, []);

  const createOrder = useCallback((
    items: CartItem[], 
    subtotal: number, 
    tax: number, 
    total: number
  ): Order => {
    const now = new Date();
    const newOrder: Order = {
      id: `order-${Date.now()}`,
      items,
      subtotal,
      tax,
      total,
      status: 'draft',
      type: 'dine_in', // Default
      createdAt: now,
      updatedAt: now
    };

    setCurrentOrder(newOrder);
    return newOrder;
  }, []);

  const updateOrder = useCallback((orderId: string, updates: Partial<Order>) => {
    if (currentOrder && currentOrder.id === orderId) {
      setCurrentOrder(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ...updates,
          updatedAt: new Date()
        };
      });
    }

    // Also update in history if exists
    setOrderHistory(prev => {
      const updated = prev.map(order => 
        order.id === orderId 
          ? { ...order, ...updates, updatedAt: new Date() }
          : order
      );
      saveOrderHistory(updated);
      return updated;
    });
  }, [currentOrder, saveOrderHistory]);

  const setOrderType = useCallback((type: OrderType) => {
    if (currentOrder) {
      updateOrder(currentOrder.id, { type });
    }
  }, [currentOrder, updateOrder]);

  const setPaymentMethod = useCallback((method: PaymentMethod) => {
    if (currentOrder) {
      updateOrder(currentOrder.id, { 
        paymentMethod: method,
        status: 'pending_payment'
      });
    }
  }, [currentOrder, updateOrder]);

  const setCustomerInfo = useCallback((name: string, phone?: string) => {
    if (currentOrder) {
      updateOrder(currentOrder.id, { 
        customerName: name,
        ...(phone && { customerPhone: phone })
      });
    }
  }, [currentOrder, updateOrder]);

  const confirmOrder = useCallback(async () => {
    if (!currentOrder) {
      throw new Error('No current order to confirm');
    }

    if (!currentOrder.paymentMethod) {
      throw new Error('Payment method is required');
    }

    // Update order status
    updateOrder(currentOrder.id, {
      status: 'pending_payment',
      paymentStatus: 'processing'
    });

    try {
      // In a real app, this would call the API to process payment and create order
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate order number
      const orderNumber = `K${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

      // Update order with success
      const confirmedOrder: Order = {
        ...currentOrder,
        orderNumber,
        status: 'confirmed',
        paymentStatus: 'completed',
        estimatedTime: 15, // 15 minutes default
        updatedAt: new Date()
      };

      // Add to history
      setOrderHistory(prev => {
        const updated = [confirmedOrder, ...prev];
        saveOrderHistory(updated);
        return updated;
      });

      // Update current order
      setCurrentOrder(confirmedOrder);

    } catch (error) {
      // Update order with failure
      updateOrder(currentOrder.id, {
        status: 'draft',
        paymentStatus: 'failed'
      });
      throw error;
    }
  }, [currentOrder, updateOrder, saveOrderHistory]);

  const cancelOrder = useCallback((orderId: string) => {
    if (currentOrder && currentOrder.id === orderId) {
      updateOrder(orderId, { status: 'cancelled' });
      
      // Add to history before clearing
      if (currentOrder.status !== 'draft') {
        setOrderHistory(prev => {
          const updated = [{ ...currentOrder, status: 'cancelled' as OrderStatus }, ...prev];
          saveOrderHistory(updated);
          return updated;
        });
      }
      
      setCurrentOrder(null);
    }
  }, [currentOrder, updateOrder, saveOrderHistory]);

  const getOrderById = useCallback((orderId: string): Order | undefined => {
    if (currentOrder && currentOrder.id === orderId) {
      return currentOrder;
    }
    return orderHistory.find(order => order.id === orderId);
  }, [currentOrder, orderHistory]);

  const clearCurrentOrder = useCallback(() => {
    setCurrentOrder(null);
  }, []);

  const value: OrderContextType = {
    currentOrder,
    orderHistory,
    createOrder,
    updateOrder,
    setOrderType,
    setPaymentMethod,
    setCustomerInfo,
    confirmOrder,
    cancelOrder,
    getOrderById,
    clearCurrentOrder
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};

// Custom hook to use order context
export const useOrder = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};

// Export context for testing purposes
export { OrderContext };