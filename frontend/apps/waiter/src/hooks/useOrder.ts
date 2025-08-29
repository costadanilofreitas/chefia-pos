/**
 * Mock useOrder hook for Waiter app
 * This is a simplified version for testing purposes
 */

import { useState, useCallback } from 'react';

export interface OrderItem {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Order {
  id: string;
  table_id: string;
  items: OrderItem[];
  status: string;
  total: number;
  created_at: string;
}

export interface UseOrderReturn {
  createOrder: (tableId: string, items: OrderItem[]) => Promise<Order>;
  getOrdersByTable: (tableId: string) => Promise<Order[]>;
}

export function useOrder(): UseOrderReturn {
  const createOrder = useCallback(async (tableId: string, items: OrderItem[]) => {
    // Mock order creation
    const order: Order = {
      id: `order-${Date.now()}`,
      table_id: tableId,
      items,
      status: 'pending',
      total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      created_at: new Date().toISOString()
    };
    return order;
  }, []);

  const getOrdersByTable = useCallback(async (tableId: string) => {
    // Mock getting orders
    return [] as Order[];
  }, []);

  return {
    createOrder,
    getOrdersByTable
  };
}