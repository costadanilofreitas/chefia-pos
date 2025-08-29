/**
 * Application Constants
 * Centralized configuration for time intervals, thresholds, and other constants
 */

// Time intervals (in milliseconds)
export const TIME_INTERVALS = {
  AUTO_REFRESH: 30000,        // 30 seconds
  DELAYED_CHECK: 60000,       // 1 minute
  ALERT_AUTO_REMOVE: 5000,    // 5 seconds
  DEBOUNCE_DELAY: 300,        // 300ms for input debouncing
} as const;

// Thresholds
export const THRESHOLDS = {
  DELAYED_ORDER_MINUTES: 15,
  MAX_VISIBLE_ORDERS: 50,
  BATCH_SIZE: 10,
} as const;

// Status configurations
export const ORDER_STATUS = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export const ITEM_STATUS = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERED: 'delivered',
} as const;

// Priority levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

// Order types
export const ORDER_TYPES = {
  TABLE: 'table',
  DELIVERY: 'delivery',
  TAKEOUT: 'takeout',
} as const;

// Station special values
export const STATION_ALL = 'all';

// Status colors/variants mapping
export const STATUS_VARIANTS = {
  [ORDER_STATUS.PENDING]: 'warning',
  [ORDER_STATUS.PREPARING]: 'info',
  [ORDER_STATUS.READY]: 'success',
  [ORDER_STATUS.DELIVERED]: 'default',
  [ORDER_STATUS.CANCELLED]: 'danger',
} as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  REFRESH: 'r',
  FULLSCREEN: 'f',
  SOUND_TOGGLE: 'm',
  HELP: 'h',
  THEME: 't',
  ESCAPE: 'Escape',
  ENTER: 'Enter',
  SPACE: ' ',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'kds-theme',
  SOUND_ENABLED: 'kds-sound-enabled',
  SELECTED_STATION: 'kds-selected-station',
  USER_PREFERENCES: 'kds-preferences',
} as const;