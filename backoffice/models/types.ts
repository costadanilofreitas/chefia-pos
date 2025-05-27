/**
 * Type definitions for the Backoffice application
 */

// User related types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
}

// Restaurant related types
export interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
}

// Navigation and UI types
export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export type ViewType = 'dashboard' | 'menu' | 'orders' | 'reports' | 'config';

// Dashboard related types
export interface DashboardStats {
  dailySales: number;
  monthlySales: number;
  averageTicket: number;
  pendingOrders: number;
  topProducts: ProductSales[];
}

export interface ProductSales {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

// Product related types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  image?: string;
}

// Order related types
export interface Order {
  id: string;
  tableNumber: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  items: OrderItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
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

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
