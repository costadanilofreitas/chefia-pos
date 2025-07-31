/**
 * Tipos centralizados para Order no POS
 * Consolidação de todas as definições de Order para evitar duplicação
 */

// Enums
export enum OrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing', 
  READY = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export enum OrderType {
  DINE_IN = 'dine_in',
  TAKEAWAY = 'takeaway',
  DELIVERY = 'delivery'
}

export enum PaymentMethod {
  CASH = 'cash',
  CREDIT = 'credit',
  DEBIT = 'debit',
  PIX = 'pix',
  OTHER = 'other'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded'
}

// Interfaces básicas
export interface OrderItemCustomization {
  id: string;
  name: string;
  type: string;
  action: 'keep' | 'remove' | 'extra';
  price: number;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  customizations?: OrderItemCustomization[];
}

export interface OrderItemCreate {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  customizations?: OrderItemCustomization[];
}

export interface OrderItemUpdate {
  quantity?: number;
  notes?: string;
  customizations?: OrderItemCustomization[];
}

// Interface principal do Order
export interface Order {
  id: string;
  customer_name?: string;
  customer_id?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  order_type: OrderType;
  source: string;
  table_number?: number;
  waiter_id?: string;
  terminal_id?: string;
  cashier_id?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  discount_amount?: number;
  tax_amount?: number;
  loyalty_points_used?: number;
  loyalty_points_earned?: number;
  coupon_code?: string;
}

// Interfaces para criação e atualização
export interface OrderCreate {
  customer_name?: string;
  customer_id?: string;
  items: OrderItemCreate[];
  table_number?: number;
  waiter_id?: string;
  order_type: OrderType;
  source: string;
  notes?: string;
  coupon_code?: string;
  loyalty_points_to_use?: number;
}

export interface OrderUpdate {
  customer_name?: string;
  status?: OrderStatus;
  notes?: string;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
}

// Interfaces para filtros e busca
export interface OrderFilters {
  status?: OrderStatus;
  order_type?: OrderType;
  customer_id?: string;
  table_number?: number;
  waiter_id?: string;
  date_from?: string;
  date_to?: string;
  payment_status?: PaymentStatus;
}

// Interface para pagamento
export interface PaymentData {
  payment_method: PaymentMethod;
  amount_paid: number;
  details?: Record<string, any>;
}

export interface ProcessPaymentData {
  order_id: string;
  payment_method: PaymentMethod;
  amount: number;
  details?: Record<string, any>;
}

// Interface para resposta da API
export interface OrderResponse {
  success: boolean;
  data: Order;
  message?: string;
  error?: string;
}

export interface OrderListResponse {
  success: boolean;
  data: Order[];
  total: number;
  page: number;
  limit: number;
  message?: string;
  error?: string;
}

// Interface para estatísticas
export interface OrderStats {
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  orders_by_status: Record<OrderStatus, number>;
  orders_by_type: Record<OrderType, number>;
  orders_by_payment_method: Record<PaymentMethod, number>;
}

