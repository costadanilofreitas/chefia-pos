/**
 * Waiter Module Constants
 * Centralized configuration for the waiter terminal
 */

// Time intervals (milliseconds)
export const TIME = {
  AUTO_REFRESH: 30000,      // 30 seconds
  NOTIFICATION: 3000,        // 3 seconds default
  NOTIFICATION_LONG: 5000,   // 5 seconds for important
  DEBOUNCE: 300,            // 300ms for input
} as const;

// Table status
export const TABLE_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  RESERVED: 'reserved',
} as const;

// Order status
export const ORDER_STATUS = {
  NEW: 'new',
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERED: 'delivered',
  PAID: 'paid',
  CANCELLED: 'cancelled',
} as const;

// Item status
export const ITEM_STATUS = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERED: 'delivered',
} as const;

// Tabs
export const TABS = {
  TABLES: 'tables',
  ORDERS: 'orders',
  MENU: 'menu',
} as const;

// Keyboard shortcuts
export const SHORTCUTS = {
  HELP: 'F1',
  REFRESH: 'F5',
  FULLSCREEN: 'F11',
  NEW_ORDER: 'ctrl+n',
  REQUEST_HELP: 'ctrl+h',
  TAB_1: '1',
  TAB_2: '2',
  TAB_3: '3',
} as const;

// Storage keys
export const STORAGE = {
  THEME: 'waiter-theme',
  LAST_TAB: 'waiter-last-tab',
  PREFERENCES: 'waiter-preferences',
} as const;

// WebSocket events
export const WS_EVENTS = {
  TABLE_UPDATE: 'table:update',
  ORDER_UPDATE: 'order:update',
  KITCHEN_UPDATE: 'kitchen:update',
  ASSISTANCE_REQUEST: 'assistance:request',
} as const;

// Notification types
export const NOTIFICATION_TYPE = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
} as const;