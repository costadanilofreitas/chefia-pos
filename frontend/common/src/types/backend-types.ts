/**
 * Tipos TypeScript gerados automaticamente a partir dos modelos Pydantic do backend.
 * NÃO EDITE ESTE ARQUIVO MANUALMENTE - ele é gerado automaticamente.
 * 
 * Para regenerar: python scripts/generate-types.py
 */

// ==================== ENUMS ====================

export enum OrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready',
  DELIVERING = 'delivering',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PIX = 'pix',
  VOUCHER = 'voucher',
  IFOOD = 'ifood',
}

export enum OrderType {
  DINE_IN = 'dine_in',
  TAKEAWAY = 'takeaway',
  DELIVERY = 'delivery',
}

export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum CouponScope {
  ORDER = 'order',
  PRODUCT = 'product',
}

export enum RemoteOrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  PREPARING = 'preparing',
  READY = 'ready',
  DELIVERING = 'delivering',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  ERROR = 'error',
}

export enum RemotePlatform {
  IFOOD = 'ifood',
  UBER_EATS = 'ubereats',
  RAPPI = 'rappi',
}

// ==================== INTERFACES ====================

export interface OrderItem {
  id: string;
  created_at: string;
  updated_at: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  customizations?: Record<string, any>[];
  order_id?: string;
  product_type?: string;
  sections?: Record<string, any>;
}

export interface Order {
  id: string;
  created_at: string;
  updated_at: string;
  customer_id?: string;
  customer_name?: string;
  items?: OrderItem[];
  status: OrderStatus;
  total_amount?: number;
  payment_method?: string;
  payment_status: PaymentStatus;
  table_number?: number;
  waiter_id?: string;
  is_delivery?: boolean;
  delivery_address?: Record<string, any>;
  delivery_fee?: number;
  notes?: string;
  source?: string;
  order_type: OrderType;
  cashier_id?: string;
  order_number?: string;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
  applied_coupon_code?: string;
  coupon_discount?: number;
  points_redeemed?: number;
  points_discount?: number;
}

export interface OrderCreate {
  customer_id?: string;
  customer_name?: string;
  items?: OrderItemCreate[];
  table_number?: number;
  waiter_id?: string;
  is_delivery?: boolean;
  delivery_address?: Record<string, any>;
  delivery_fee?: number;
  notes?: string;
  source?: string;
  order_type: OrderType;
  cashier_id?: string;
  external_reference?: string;
}

export interface OrderItemCreate {
  product_id: string;
  product_name: string;
  quantity?: number;
  unit_price?: number;
  notes?: string;
  customizations?: Record<string, any>[];
  sections?: Record<string, any>;
  price_adjustment?: number;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string;
  address?: Record<string, any>;
  loyalty_points?: number;
  created_at: string;
  updated_at: string;
}

// ==================== API RESPONSES ====================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: Record<string, any>;
}

export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface APIError {
  message: string;
  code: string;
  details?: ValidationError[];
}

// ==================== UTILITY TYPES ====================

export type ID = string;
export type Timestamp = string;
export type Currency = number;

// ==================== REQUEST TYPES ====================

export interface ApplyCouponRequest {
  coupon_code: string;
}

export interface ApplyPointsRequest {
  points_amount: number;
  customer_id: string;
  points_to_redeem: number;
}

export interface PaymentRequest {
  order_id: string;
  payment_method: PaymentMethod;
  amount: number;
  details?: Record<string, any>;
}

// ==================== EXPORT ALL ====================

export type {
  OrderItem,
  Order,
  OrderCreate,
  OrderItemCreate,
  Customer,
};

export {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  OrderType,
};
