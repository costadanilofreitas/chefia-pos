/**
 * Centralized API Configuration
 * All API endpoints and WebSocket URLs should be defined here
 */

import { getApiUrl, getWsUrl } from '../utils/env';

export const API_CONFIG = {
  // Base API URL
  BASE_URL: getApiUrl(),
  
  // WebSocket URL
  WS_URL: getWsUrl() + '/ws',
  
  // API Version
  API_VERSION: '/api/v1',
  
  // Endpoints
  ENDPOINTS: {
    // KDS endpoints
    KDS: {
      ORDERS: '/kds/orders',
      STATIONS: '/kds/stations',
      METRICS: '/kds/metrics',
      ORDER_STATUS: (orderId: string | number) => `/kds/orders/${orderId}/status`,
      ITEM_STATUS: (orderId: string | number, itemId: string | number) => `/kds/orders/${orderId}/items/${itemId}/status`,
      ORDER_COMPLETE: (orderId: string | number) => `/kds/orders/${orderId}/complete`,
      ORDERS_BY_STATION: (stationId: string) => `/kds/stations/${stationId}/orders`
    },
    
    // Other endpoints can be added here as needed
    QUEUE: {
      BASE: '/tables/queue',
      STATISTICS: '/tables/queue/statistics'
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