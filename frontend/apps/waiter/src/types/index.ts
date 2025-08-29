/**
 * Common type definitions for Waiter application
 */

// API Response types
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  message?: string;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

// WebSocket message types
export interface WebSocketMessageData {
  [key: string]: unknown;
}

export interface WebSocketMessage {
  type: string;
  data?: WebSocketMessageData | null;
  timestamp: number;
}

// Table types
export interface Table {
  id: number;
  number: number;
  status: 'available' | 'occupied' | 'reserved';
  seats: number;
  shape: 'square' | 'round' | 'rectangle';
  x: number;
  y: number;
  section?: string;
  waiter_id?: number;
}

// Order types
export interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  status: 'preparing' | 'ready' | 'delivered' | 'cancelled';
  notes?: string;
  modifiers?: ItemModifier[];
}

export interface ItemModifier {
  id: number;
  name: string;
  price: number;
  type: 'add' | 'remove' | 'substitute';
}

export interface Order {
  id: number;
  table_id: number;
  status: 'new' | 'in_progress' | 'ready' | 'delivered' | 'paid' | 'cancelled';
  items: OrderItem[];
  created_at: string;
  updated_at?: string;
  total?: number;
  waiter_id?: number;
  customer_name?: string;
  payment_method?: string;
}

// Menu types
export interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  category_id: number;
  available: boolean;
  image_url?: string;
  preparation_time?: number;
  modifiers?: MenuModifier[];
}

export interface MenuModifier {
  id: number;
  name: string;
  price: number;
  required: boolean;
  max_selections?: number;
  options?: ModifierOption[];
}

export interface ModifierOption {
  id: number;
  name: string;
  price: number;
  available: boolean;
}

export interface MenuCategory {
  id: number;
  name: string;
  description?: string;
  display_order: number;
  active: boolean;
  icon?: string;
}

// User/Auth types
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'waiter' | 'cashier';
  avatar?: string;
  permissions?: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

// Notification types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
}

// Table Layout types
export interface TableLayout {
  id: string;
  name: string;
  sections: TableSection[];
  created_at: string;
  updated_at: string;
}

export interface TableSection {
  id: string;
  name: string;
  tables: Table[];
  color?: string;
}

// Statistics types
export interface WaiterStats {
  tables_served: number;
  orders_taken: number;
  items_delivered: number;
  total_sales: number;
  average_service_time: number;
  customer_rating?: number;
}

// Filter and Sort types
export type OrderFilter = 'all' | 'new' | 'in_progress' | 'ready' | 'delivered';
export type TableFilter = 'all' | 'available' | 'occupied' | 'reserved' | 'my_tables';
export type SortOrder = 'asc' | 'desc';

export interface FilterOptions {
  status?: string;
  date_from?: string;
  date_to?: string;
  waiter_id?: number;
  table_id?: number;
}

// Event types
export type EventHandler<T = unknown> = (data?: T) => void;
export type EventHandlerMap = Map<string, EventHandler[]>;

// Storage types
export interface StorageItem {
  id: string;
  data: unknown;
  timestamp: number;
  ttl?: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}