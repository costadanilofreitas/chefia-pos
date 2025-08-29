/**
 * Common type definitions for KDS application
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

// WebSocket specific types
export interface OrderUpdateData {
  id: string | number;
  status?: string;
  items?: Array<{
    id: string | number;
    name: string;
    quantity: number;
    status?: string;
    notes?: string;
  }>;
  created_at?: string;
  updated_at?: string;
  table_number?: number;
  customer_name?: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface ReconnectInfo {
  attempt: number;
  maxAttempts: number;
  delay: number;
}

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

// Event types
export type EventHandler<T = unknown> = (data?: T) => void;
export type EventHandlerMap = Map<string, EventHandler[]>;

// Station update data
export interface StationUpdateData {
  station: string;
  type?: 'urgent' | 'normal';
  orderId?: string;
  [key: string]: unknown;
}

// Audio Context for browser compatibility
export interface BrowserWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

// Log entry for offline storage
export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: unknown;
  context?: string;
}

// Database record types
export interface DBRecord {
  id: string | number;
  timestamp?: number;
  synced?: boolean;
  [key: string]: unknown;
}

// Import actual types from kdsService for DB records
import type { Order, Station } from '../services/kdsService';

// Order specific DB record - extends the actual Order type
export type OrderDBRecord = Order & {
  timestamp?: number;
  synced?: boolean;
};

// Station DB record - extends the actual Station type  
export type StationDBRecord = Station & {
  timestamp?: number;
  synced?: boolean;
}

// Settings DB record
export interface SettingsDBRecord extends DBRecord {
  key: string;
  value: unknown;
}