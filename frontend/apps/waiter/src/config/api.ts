/**
 * Centralized API Configuration
 * All API endpoints and WebSocket URLs should be defined here
 */

import { getApiUrl, getWsUrl } from '@/utils/env';

export const API_CONFIG = {
  // Base API URL
  BASE_URL: getApiUrl(),
  
  // WebSocket URL
  WS_URL: getWsUrl() + '/ws',
  
  // API Version
  API_VERSION: '/api/v1',
  
  // Endpoints
  ENDPOINTS: {
    // Waiter endpoints
    WAITER: {
      TABLES: '/waiter/tables',
      ORDERS: '/waiter/orders',
      TABLE_ORDERS: (tableId: number) => `/waiter/tables/${tableId}/orders`,
      CREATE_ORDER: (tableId: number) => `/waiter/tables/${tableId}/orders`,
      UPDATE_TABLE_STATUS: (tableId: number) => `/waiter/tables/${tableId}/status`,
      DELIVER_ITEMS: (orderId: number) => `/waiter/orders/${orderId}/deliver`,
      MENU: '/waiter/menu'
    },
    
    // Auth endpoints
    AUTH: {
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      ME: '/auth/me'
    }
  },
  
  // Request timeout
  TIMEOUT: 30000, // 30 seconds
  
  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 1000, // 1 second
    BACKOFF_MULTIPLIER: 2
  }
};

/**
 * Helper function to build full API URL
 */
export const buildApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${cleanEndpoint}`;
};

/**
 * Helper function to get WebSocket URL
 */
export const getWebSocketUrl = (): string => {
  return API_CONFIG.WS_URL;
};