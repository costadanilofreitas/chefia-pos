/**
 * Type definitions for the Mobile Waiter application
 */

import { StackScreenProps } from '@react-navigation/stack';

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Table: { tableId: string; tableNumber: string };
  Order: { orderId?: string; tableId: string; tableNumber: string };
  Payment: { orderId: string; total: number };
};

export type LoginScreenProps = StackScreenProps<RootStackParamList, 'Login'>;
export type HomeScreenProps = StackScreenProps<RootStackParamList, 'Home'>;
export type TableScreenProps = StackScreenProps<RootStackParamList, 'Table'>;
export type OrderScreenProps = StackScreenProps<RootStackParamList, 'Order'>;
export type PaymentScreenProps = StackScreenProps<RootStackParamList, 'Payment'>;

// User related types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'waiter' | 'manager' | 'admin';
}

// Authentication types
export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

// Table related types
export interface Table {
  id: string;
  number: string;
  capacity: number;
  status: TableStatus;
  currentOrderId?: string;
}

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'dirty';

// Order related types
export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  status: OrderStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  total: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
}

export type OrderStatus = 'draft' | 'placed' | 'preparing' | 'ready' | 'delivered' | 'paid' | 'cancelled';

// Product related types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  available: boolean;
  imageUrl?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

// Payment related types
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
}

export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'pix';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
