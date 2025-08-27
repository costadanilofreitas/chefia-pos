/**
 * Common type definitions to replace 'unknown' types
 */

// Generic response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

// NOTE: ApiError moved to types/error.ts for consolidation
// Import from there: import { ApiError } from './error';

// Table reservation type
export interface TableReservation {
  customer_name: string;
  customer_phone?: string;
  reservation_time: string;
  party_size: number;
  notes?: string;
}

// Platform configuration type
export interface PlatformConfig {
  api_key?: string;
  merchant_id?: string;
  store_id?: string;
  webhook_url?: string;
  enabled: boolean;
  [key: string]: unknown;
}

// Generic event handler types
export interface EventHandler<T = Event> {
  (event: T): void;
}

// Performance metric type
export interface PerformanceMetric {
  name: string;
  value: number;
  unit?: string;
  timestamp?: number;
}

// Generic form data
export interface FormData {
  [key: string]: string | number | boolean | File | null;
}

// NOTE: CashierWithdrawal moved to types/cashier.ts for consolidation
// Import from there: import { CashierWithdrawal } from './cashier';

// Generic callback type
export type AsyncCallback<T = void> = () => Promise<T>;
export type SyncCallback<T = void> = () => T;

// Generic status type
export type Status = "idle" | "loading" | "success" | "error";

// Pagination type
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Sort options
export interface SortOptions {
  field: string;
  order: "asc" | "desc";
}

// Filter options
export interface FilterOptions {
  [key: string]: string | number | boolean | Date | null;
}
