import { useState } from 'react';

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  customizations: any[];
}

export interface Order {
  id?: string;
  items: OrderItem[];
  total?: number;
  status?: string;
  customer_id?: string;
  table_id?: string;
  created_at?: string;
}

export const useOrder = () => {
  const [currentOrder, setCurrentOrder] = useState<Order>({ items: [] });
  const [loading, setLoading] = useState(false);

  const addItemToOrder = (item: OrderItem) => {
    setCurrentOrder(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));
  };

  const removeItemFromOrder = (itemId: string) => {
    setCurrentOrder(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const createOrder = async (order: Order) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newOrder = { ...order, id: `order-${Date.now()}` };
      return newOrder;
    } finally {
      setLoading(false);
    }
  };

  const getOrderById = async (orderId: string) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        id: orderId,
        total: 100.0,
        items: [
          { id: 'item-1', product_name: 'Product 1', quantity: 1, total_price: 100.0 }
        ]
      };
    } finally {
      setLoading(false);
    }
  };

  const updateOrder = async (orderId: string, updates: Partial<Order>) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return { id: orderId, ...updates };
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (orderId: string, paymentData: any) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true, transaction_id: `txn-${Date.now()}` };
    } finally {
      setLoading(false);
    }
  };

  return {
    currentOrder,
    loading,
    addItemToOrder,
    removeItemFromOrder,
    createOrder,
    getOrderById,
    updateOrder,
    processPayment
  };
};

