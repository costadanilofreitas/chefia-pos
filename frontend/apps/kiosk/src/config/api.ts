/**
 * API Configuration
 * Centralized configuration for all API endpoints and settings
 */

// Environment variables with fallbacks
const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:8001';
const API_VERSION = import.meta.env['VITE_API_VERSION'] || 'v1';
const API_TIMEOUT = import.meta.env['VITE_API_TIMEOUT'] || 30000;

// API Configuration object
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  VERSION: API_VERSION,
  TIMEOUT: Number(API_TIMEOUT),
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // milliseconds
  
  // API Endpoints
  ENDPOINTS: {
    // Auth
    AUTH: {
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      VALIDATE: '/auth/validate'
    },
    
    // Products
    PRODUCTS: {
      LIST: '/products',
      DETAIL: (id: string) => `/products/${id}`,
      CATEGORIES: '/products/categories',
      SEARCH: '/products/search'
    },
    
    // Orders
    ORDERS: {
      CREATE: '/orders',
      LIST: '/orders',
      DETAIL: (id: string) => `/orders/${id}`,
      UPDATE: (id: string) => `/orders/${id}`,
      CANCEL: (id: string) => `/orders/${id}/cancel`,
      STATUS: (id: string) => `/orders/${id}/status`
    },
    
    // Self-service specific
    SELFSERVICE: {
      START_SESSION: '/selfservice/session/start',
      END_SESSION: '/selfservice/session/end',
      VALIDATE_CODE: '/selfservice/validate',
      ORDER: '/selfservice/orders'
    },
    
    // Payments
    PAYMENTS: {
      PROCESS: '/payments/process',
      VALIDATE: '/payments/validate',
      METHODS: '/payments/methods',
      STATUS: (id: string) => `/payments/${id}/status`
    },
    
    // Customer
    CUSTOMERS: {
      IDENTIFY: '/customers/identify',
      REGISTER: '/customers/register',
      LOYALTY: '/customers/loyalty'
    },
    
    // Promotions
    PROMOTIONS: {
      ACTIVE: '/promotions/active',
      VALIDATE: '/promotions/validate',
      APPLY: '/promotions/apply'
    }
  },
  
  // Headers configuration
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Terminal-ID': 'KIOSK-001', // Kiosk terminal identifier
    'X-App-Version': '1.0.0'
  }
} as const;

// Helper function to build full URL
export const buildUrl = (endpoint: string): string => {
  // If endpoint starts with /, it's a path
  if (endpoint.startsWith('/')) {
    return `${API_CONFIG.BASE_URL}/api/${API_CONFIG.VERSION}${endpoint}`;
  }
  // Otherwise, it's a full URL
  return endpoint;
};

// Helper function to add query parameters
export const buildUrlWithParams = (endpoint: string, params: Record<string, any>): string => {
  const url = buildUrl(endpoint);
  const queryString = new URLSearchParams(params).toString();
  return queryString ? `${url}?${queryString}` : url;
};

// Export types for TypeScript
export type ApiEndpoints = typeof API_CONFIG.ENDPOINTS;
export type ApiHeaders = typeof API_CONFIG.HEADERS;