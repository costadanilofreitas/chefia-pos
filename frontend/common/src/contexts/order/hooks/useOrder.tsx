import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useApi } from '../../core/hooks/useApi';

// Interfaces
interface OrderItem {
  id: string;
  quantity: number;
  customizations: Customization[];
  product_name: string;
  product_id: string;
  total_price: number;
  notes?: string;
  unit_price: number;
}

interface Customization {
  id: string;
  name: string;
  type: string;
  action: 'keep' | 'remove' | 'extra';
  price: number;
}

interface Order {
  id: string;
  customer_name?: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  source?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  payment_method?: string;
  payment_status?: 'paid' | 'unpaid';
  terminal_id?: string;
  operator_id?: string;
  cashier_id?: string;
}

interface PaymentData {
  payment_method: string;
  amount_paid: number;
}

interface ProcessPaymentData {
  order_id: string;
  payment_method: string;
  amount: number;
  details?: Record<string, any>;
}

interface OrderContextValue {
  pendingOrders: Order[];
  currentOrder: Order | null;
  orderHistory: Order[];
  loading: boolean;
  error: string | null;
  getPendingOrders: () => Promise<Order[]>;
  createOrder: (orderData: Partial<Order>) => Promise<Order>;
  updateOrder: (orderId: string, orderData: Partial<Order>) => Promise<Order>;
  completeOrder: (orderId: string, paymentData: PaymentData) => Promise<Order>;
  cancelOrder: (orderId: string, reason: string) => Promise<Order>;
  getOrderHistory: (filters?: Record<string, any>) => Promise<Order[]>;
  setCurrentOrder: (order: Order | null) => void;
  addItemToOrder: (item: OrderItem) => void;
  removeItemFromOrder: (itemId: string) => void;
  processPayment: (paymentData: ProcessPaymentData) => Promise<void>;
  getOrderById: (orderId: string) => Promise<Order>;
}

// Contexto
const OrderContext = createContext<OrderContextValue | null>(null);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderHistory] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const api = useApi();

  const getPendingOrders = useCallback(async (): Promise<Order[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Order[]>('/orders/pending');
      setPendingOrders(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao obter pedidos pendentes:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  const createOrder = useCallback(async (orderData: Partial<Order>): Promise<Order> => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<Order>('/orders', orderData);
      setCurrentOrder(data);
      setPendingOrders((prev) => [...prev, data]);
      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao criar pedido:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  const updateOrder = useCallback(async (orderId: string, orderData: Partial<Order>): Promise<Order> => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.put<Order>(`/orders/${orderId}`, orderData);
      setPendingOrders((prev) =>
        prev.map((order) => (order.id === orderId ? data : order))
      );
      if (currentOrder && currentOrder.id === orderId) {
        setCurrentOrder(data);
      }
      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao atualizar pedido:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api, currentOrder]);

  const addItemToOrder = useCallback((item: OrderItem) => {
    if (!currentOrder) return;
    const updatedItems = [...currentOrder.items, item];
    const updatedTotal = updatedItems.reduce((sum, i) => sum + i.total_price, 0);
    setCurrentOrder({ ...currentOrder, items: updatedItems, total: updatedTotal });
  }, [currentOrder]);

  const removeItemFromOrder = useCallback((itemId: string) => {
    if (!currentOrder) return;
    const updatedItems = currentOrder.items.filter((item) => item.id !== itemId);
    const updatedTotal = updatedItems.reduce((sum, i) => sum + i.total_price, 0);
    setCurrentOrder({ ...currentOrder, items: updatedItems, total: updatedTotal });
  }, [currentOrder]);

  const value: OrderContextValue = {
    pendingOrders,
    currentOrder,
    orderHistory,
    loading,
    error,
    getPendingOrders,
    createOrder,
    updateOrder,
    completeOrder: async () => {
      throw new Error('Not implemented');
    },
    cancelOrder: async () => {
      throw new Error('Not implemented');
    },
    getOrderHistory: async () => {
      throw new Error('Not implemented');
    },
    setCurrentOrder,
    addItemToOrder,
    removeItemFromOrder,
    processPayment: async () => {
      throw new Error('Not implemented');
    },
    getOrderById: async () => {
      throw new Error('Not implemented');
    },
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrder = (): OrderContextValue => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder deve ser usado dentro de um OrderProvider');
  }
  return context;
};
