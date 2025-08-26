import {
  Order,
  OrderCreate,
  OrderUpdate,
  OrderItemCreate,
  OrderFilters,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus
} from '../../types/order';
import { UseOrderReturn } from '../useOrder';

export const useOrder = (): UseOrderReturn => ({
  // Estado dos pedidos
  orders: [],
  currentOrder: {
    id: 'test-order-1',
    table_id: 'table-1',
    terminal_id: 'terminal-1',
    seat_number: 1,
    customer_name: 'Test Customer',
    items: [],
    total: 0,
    total_amount: 0,
    order_type: OrderType.DINE_IN,
    status: OrderStatus.PENDING,
    payment_method: null,
    payment_status: PaymentStatus.PENDING,
    source: 'pos',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    waiter_name: null,
  },
  
  // Estado do carrinho local
  cart: [],
  cartTotal: 0,
  
  // Estados de loading
  loading: false,
  creating: false,
  updating: false,
  
  // Estado de erro
  error: null,

  // Operações de pedidos
  getOrders: async (_filters?: OrderFilters): Promise<void> => {
    return Promise.resolve();
  },
  createOrder: async (orderData: OrderCreate): Promise<Order | null> => {
    return {
      id: 'test-order-1',
      table_id: orderData.table_id,
      terminal_id: orderData.terminal_id,
      seat_number: orderData.seat_number,
      customer_name: orderData.customer_name,
      items: orderData.items.map((item, index) => ({
        id: `item-${index}`,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        notes: item.notes,
        customizations: item.customizations || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      total: orderData.total_amount,
      total_amount: orderData.total_amount,
      order_type: orderData.order_type,
      status: orderData.status,
      payment_method: null,
      payment_status: PaymentStatus.PENDING,
      source: orderData.source,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      waiter_name: null,
    };
  },
  updateOrder: async (__orderId: string, _updateData: OrderUpdate): Promise<Order | null> => {
    return null;
  },
  cancelOrder: async (__orderId: string, _reason: string): Promise<Order | null> => {
    return null;
  },
  completeOrder: async (_orderId: string): Promise<Order | null> => {
    return null;
  },
  
  // Operações de carrinho local
  addToCart: (_item: OrderItemCreate): void => {
    // Mock implementation
  },
  removeFromCart: (_index: number): void => {
    // Mock implementation
  },
  updateCartItem: (_index: number, _updates: Partial<OrderItemCreate>): void => {
    // Mock implementation
  },
  clearCart: (): void => {
    // Mock implementation
  },
  
  // Finalização
  finalizeOrder: async (__orderId: string, _paymentMethod: PaymentMethod): Promise<Order | null> => {
    return null;
  },
  
  // Utilitários
  setCurrentOrder: (_order: Order | null): void => {
    // Mock implementation
  },
  clearError: (): void => {
    // Mock implementation
  },
});

export default useOrder;