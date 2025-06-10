/**
 * Common types for the POS Modern system
 */

// API Response type
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Event Message type for event bus
export interface EventMessage {
  id: string;
  type: string;
  timestamp: string;
  payload: any;
  source: string;
}

// User type
export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

// Business Day type
export interface BusinessDay {
  id: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  closingBalance?: number;
  status: 'open' | 'closed';
  cashierId: string;
  notes?: string;
}

// Product type
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  available: boolean;
  stockQuantity?: number;
  tags?: string[];
}

// Order type
export interface Order {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  items: OrderItem[];
  total: number;
  customerId?: string;
  tableId?: string;
  notes?: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod?: string;
}

// Order Item type
export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
  modifiers?: OrderItemModifier[];
}

// Order Item Modifier type
export interface OrderItemModifier {
  id: string;
  name: string;
  price: number;
}

// Payment type
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: 'cash' | 'credit' | 'debit' | 'pix' | 'other';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

// Stock Item type
export interface StockItem {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  expiryDate?: string;
  location?: string;
  updatedAt: string;
}

// Stock Transaction type
export interface StockTransaction {
  id: string;
  productId: string;
  quantity: number;
  type: 'in' | 'out' | 'adjustment';
  reason: string;
  createdAt: string;
  createdBy: string;
}

// Table type
export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
  currentOrderId?: string;
}

// Customer type
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyaltyPoints?: number;
  createdAt: string;
  updatedAt: string;
}

// Supplier type
export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

// Event type for MessageQueueTestInterface
export interface EventType {
  name: string;
  description: string;
}

// Sequence event for MessageQueueTestInterface
export interface SequenceEvent {
  event_type: string;
  data: any;
  metadata: any;
}

// Sequence for MessageQueueTestInterface
export interface Sequence {
  id: string;
  name: string;
  events: SequenceEvent[];
  interval_ms: number;
  status: 'pending' | 'running' | 'completed' | 'error' | 'cancelled';
  progress?: number;
  current_event?: number;
  total_events?: number;
}
